import {
  DataverseError,
  assertCaller,
  assertIdentifier,
  assertWritable,
  functionPath,
  isGuid,
  type DataverseClient,
} from "../../dataverse/client.ts";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_OPERATION,
  FORMATTED_VALUE,
  type AttributeAuditDetail,
  type DataverseAudit,
  type DataverseRole,
  type DataverseSystemUser,
  type Guid,
  type PagingInfo,
  type RetrieveRecordChangeHistoryResponse,
} from "../../dataverse/types.ts";
import { MOCK_APPLICATION_USER, MOCK_DATAVERSE_URL, MOCK_SYSTEM_USERS, MOCK_TEAMS, MOCK_USER_ROLES } from "./org.ts";

/**
 * In-memory stand-in for a Dataverse organization. It answers the same Web API calls the
 * real adapters make (OData reads, `RetrieveAadUserRoles`, `RetrieveRecordChangeHistory`,
 * impersonated writes) with Microsoft-shaped payloads, and writes `audit` rows that
 * attribute each change to the `CallerObjectId` user, as Dataverse auditing does.
 *
 * Query support is deliberately small: `$filter` with `eq` joined by `and`, a single
 * `$orderby`, and `$top`. `$select` and `$expand` are ignored.
 */

type Row = Record<string, unknown>;

export interface MockRequest {
  method: "GET" | "POST" | "PATCH";
  path: string;
  callerObjectId: Guid | null;
}

export interface MockDataverse {
  client: DataverseClient;
  /** Tables keyed by entity set name. */
  tables: Map<string, Map<Guid, Row>>;
  /** Every call received, in Web API terms. */
  requests: MockRequest[];
}

export interface MockDataverseOptions {
  now?: () => Date;
  /** Extra rows by entity set name; primary keys must be set. */
  seed?: Record<string, readonly object[]>;
}

const API = `${MOCK_DATAVERSE_URL}/api/data/v9.2`;

function logicalName(entitySet: string): string {
  return entitySet.endsWith("s") ? entitySet.slice(0, -1) : entitySet;
}

function primaryKey(entitySet: string): string {
  return `${logicalName(entitySet)}id`;
}

function notFound(message: string): DataverseError {
  return new DataverseError(404, message, "0x80040217");
}

function parseLiteral(raw: string): unknown {
  const value = raw.trim();
  if (value === "null") return null;
  if (value === "true" || value === "false") return value === "true";
  if (/^'.*'$/.test(value)) return value.slice(1, -1).replaceAll("''", "'");
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

function applyQuery(rows: Row[], query: string | undefined): Row[] {
  const options = new Map<string, string>();
  for (const part of (query ?? "").split("&")) {
    const eq = part.indexOf("=");
    if (eq > 0) options.set(part.slice(0, eq), decodeURIComponent(part.slice(eq + 1)));
  }

  let result = rows;
  const filter = options.get("$filter");
  if (filter) {
    const clauses = filter.split(/\s+and\s+/i).map((clause) => {
      const match = /^(\w+)\s+eq\s+(.+)$/.exec(clause.trim());
      if (!match) throw new DataverseError(400, `Mock Dataverse can't evaluate filter: ${clause}`);
      return { attribute: match[1], value: parseLiteral(match[2]) };
    });
    result = result.filter((row) => clauses.every((c) => sameValue(row[c.attribute] ?? null, c.value)));
  }

  const orderBy = options.get("$orderby");
  if (orderBy) {
    const [attribute, direction] = orderBy.split(",")[0].trim().split(/\s+/);
    const sign = direction?.toLowerCase() === "desc" ? -1 : 1;
    result = [...result].sort((a, b) => sign * String(a[attribute] ?? "").localeCompare(String(b[attribute] ?? "")));
  }

  const top = Number(options.get("$top"));
  if (Number.isInteger(top) && top > 0) result = result.slice(0, top);
  return result;
}

export function createMockDataverse(options: MockDataverseOptions = {}): MockDataverse {
  const now = options.now ?? (() => new Date());
  const tables = new Map<string, Map<Guid, Row>>();
  const requests: MockRequest[] = [];
  const auditDetails = new Map<Guid, AttributeAuditDetail>();
  let sequence = 0;

  const table = (entitySet: string) => {
    let rows = tables.get(entitySet);
    if (!rows) tables.set(entitySet, (rows = new Map()));
    return rows;
  };
  const insert = (entitySet: string, seedRow: object) => {
    const row: Row = { ...seedRow };
    const id = row[primaryKey(entitySet)];
    if (!isGuid(id)) throw new Error(`Seed row for ${entitySet} needs a GUID ${primaryKey(entitySet)}`);
    table(entitySet).set(id.toLowerCase(), row);
  };

  for (const user of MOCK_SYSTEM_USERS) insert("systemusers", { ...user });
  for (const [entitySet, rows] of Object.entries(options.seed ?? {})) for (const row of rows) insert(entitySet, row);

  const userByObjectId = (oid: Guid): DataverseSystemUser | undefined =>
    MOCK_SYSTEM_USERS.find((u) => u.azureactivedirectoryobjectid?.toLowerCase() === oid.toLowerCase());

  const timestamp = () => {
    const time = now().toISOString();
    return { time, seq: ++sequence };
  };

  function writeAudit(entitySet: string, id: Guid, user: DataverseSystemUser, operation: number, oldValue: Row, newValue: Row, time: string) {
    const auditid = crypto.randomUUID();
    const type = `#Microsoft.Dynamics.CRM.${logicalName(entitySet)}`;
    const record = {
      auditid,
      createdon: time,
      action: operation,
      [`action${FORMATTED_VALUE}`]: AUDIT_ACTION_LABELS[operation],
      operation,
      objecttypecode: logicalName(entitySet),
      _objectid_value: id,
      _userid_value: user.systemuserid,
      [`_userid_value${FORMATTED_VALUE}`]: user.fullname,
      _callinguserid_value: MOCK_APPLICATION_USER.systemuserid,
      [`_callinguserid_value${FORMATTED_VALUE}`]: MOCK_APPLICATION_USER.fullname,
    } satisfies DataverseAudit;
    table("audits").set(auditid, { ...record, __seq: sequence });
    auditDetails.set(auditid, {
      "@odata.type": "#Microsoft.Dynamics.CRM.AttributeAuditDetail",
      AuditRecord: record,
      InvalidNewValueAttributes: [],
      LocLabelLanguageCode: 0,
      DeletedAttributes: { Count: 0, Keys: [], Values: [] },
      OldValue: { "@odata.type": type, ...oldValue },
      NewValue: { "@odata.type": type, ...newValue },
    });
  }

  function impersonate(entitySet: string, callerObjectId: Guid): DataverseSystemUser {
    assertIdentifier(entitySet);
    assertWritable(entitySet);
    const user = userByObjectId(callerObjectId);
    if (!user) throw notFound(`systemuser with azureactivedirectoryobjectid ${callerObjectId} does not exist`);
    return user;
  }

  function stripInternal(row: Row): Row {
    const copy = { ...row };
    delete copy.__seq;
    return copy;
  }

  function retrieveAadUserRoles(params: Record<string, string>) {
    const user = userByObjectId(params.DirectoryObjectId ?? "");
    const roles = new Map<Guid, DataverseRole>();
    if (user) {
      for (const role of MOCK_USER_ROLES[user.systemuserid] ?? []) roles.set(role.roleid, role);
      for (const team of MOCK_TEAMS) {
        if (team.members.includes(user.systemuserid)) for (const role of team.roles) roles.set(role.roleid, role);
      }
    }
    return { "@odata.context": `${API}/$metadata#roles`, value: [...roles.values()].map((r) => ({ ...r })) };
  }

  function retrieveRecordChangeHistory(params: Record<string, string>): RetrieveRecordChangeHistoryResponse {
    const target = JSON.parse(params.Target ?? "{}") as { "@odata.id"?: string };
    const match = /^(\w+)\(([0-9a-f-]{36})\)$/i.exec(target["@odata.id"] ?? "");
    if (!match) throw new DataverseError(400, "Target must be an entity reference");
    const paging: PagingInfo = params.PagingInfo
      ? (JSON.parse(params.PagingInfo) as PagingInfo)
      : { PageNumber: 1, Count: 5000 };

    const audits = [...table("audits").values()]
      .filter((a) => sameValue(a._objectid_value, match[2]))
      .sort((a, b) => Number(b.__seq) - Number(a.__seq));
    const start = (paging.PageNumber - 1) * paging.Count;
    const page = audits.slice(start, start + paging.Count);
    const more = start + paging.Count < audits.length;

    return {
      "@odata.context": `${API}/$metadata#Microsoft.Dynamics.CRM.RetrieveRecordChangeHistoryResponse`,
      AuditDetailCollection: {
        AuditDetails: page.map((a) => structuredClone(auditDetails.get(String(a.auditid))!)),
        MoreRecords: more,
        PagingCookie: more ? `<cookie page="${paging.PageNumber}" />` : null,
        TotalRecordCount: paging.ReturnTotalRecordCount ? audits.length : -1,
      },
    };
  }

  const client: DataverseClient = {
    async retrieveMultiple<T>(entitySet: string, query?: string) {
      assertIdentifier(entitySet);
      requests.push({ method: "GET", path: `${entitySet}${query ? `?${query}` : ""}`, callerObjectId: null });
      const rows = [...table(entitySet).values()].sort((a, b) => Number(a.__seq ?? 0) - Number(b.__seq ?? 0));
      return {
        "@odata.context": `${API}/$metadata#${entitySet}`,
        value: applyQuery(rows, query).map(stripInternal) as T[],
      };
    },

    async retrieve<T>(entitySet: string, id: Guid, query?: string) {
      assertIdentifier(entitySet);
      requests.push({ method: "GET", path: `${entitySet}(${id})${query ? `?${query}` : ""}`, callerObjectId: null });
      const row = table(entitySet).get(id.toLowerCase());
      if (!row) throw notFound(`${logicalName(entitySet)} With Id = ${id} Does Not Exist`);
      return stripInternal(row) as T;
    },

    async callFunction<T>(name: string, params: Record<string, string>, query?: string) {
      requests.push({ method: "GET", path: functionPath(name, params, query), callerObjectId: null });
      if (name === "RetrieveAadUserRoles") return retrieveAadUserRoles(params) as T;
      if (name === "RetrieveRecordChangeHistory") return retrieveRecordChangeHistory(params) as T;
      throw new DataverseError(404, `Resource not found for the segment '${name}'.`, "0x8006088a");
    },

    async create(entitySet, data, options) {
      const caller = assertCaller(options);
      const user = impersonate(entitySet, caller);
      requests.push({ method: "POST", path: entitySet, callerObjectId: caller });
      const id = crypto.randomUUID();
      const { time } = timestamp();
      table(entitySet).set(id, {
        ...data,
        [primaryKey(entitySet)]: id,
        createdon: time,
        modifiedon: time,
        _createdby_value: user.systemuserid,
        _createdonbehalfby_value: MOCK_APPLICATION_USER.systemuserid,
        __seq: sequence,
      });
      writeAudit(entitySet, id, user, AUDIT_OPERATION.Create, {}, data, time);
      return id;
    },

    async update(entitySet, id, data, options) {
      const caller = assertCaller(options);
      const user = impersonate(entitySet, caller);
      requests.push({ method: "PATCH", path: `${entitySet}(${id})`, callerObjectId: caller });
      const row = table(entitySet).get(id.toLowerCase());
      if (!row) throw notFound(`${logicalName(entitySet)} With Id = ${id} Does Not Exist`);
      const oldValue = Object.fromEntries(Object.keys(data).map((key) => [key, row[key] ?? null]));
      const { time } = timestamp();
      Object.assign(row, data, { modifiedon: time, _modifiedby_value: user.systemuserid });
      writeAudit(entitySet, id.toLowerCase(), user, AUDIT_OPERATION.Update, oldValue, data, time);
    },
  };

  return { client, tables, requests };
}
