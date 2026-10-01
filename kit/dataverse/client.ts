import type { Guid, ODataCollection } from "./types.ts";

export interface WriteOptions {
  /** Entra object id (`oid`) of the signed-in user, sent as the `CallerObjectId` impersonation header. */
  callerObjectId: Guid;
}

/**
 * Minimal Dataverse Web API surface the kit needs. Entity sets and query strings use the
 * Web API's own names (`accounts`, `$select=...`), and parameter values for functions are
 * OData literals (see `guidLiteral`, `jsonLiteral`, `entityReferenceLiteral`).
 *
 * Every write takes the user's Entra object id so Dataverse attributes the change to them.
 */
export interface DataverseClient {
  retrieveMultiple<T>(entitySet: string, query?: string): Promise<ODataCollection<T>>;
  retrieve<T>(entitySet: string, id: Guid, query?: string): Promise<T>;
  /** Unbound function, e.g. `RetrieveAadUserRoles(DirectoryObjectId=@p0)?@p0=<guid>`. */
  callFunction<T>(name: string, params: Record<string, string>, query?: string): Promise<T>;
  create(entitySet: string, data: Record<string, unknown>, options: WriteOptions): Promise<Guid>;
  update(entitySet: string, id: Guid, data: Record<string, unknown>, options: WriteOptions): Promise<void>;
}

export class DataverseError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "DataverseError";
    this.status = status;
    this.code = code;
  }
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isGuid(value: unknown): value is Guid {
  return typeof value === "string" && GUID.test(value);
}

/** Validates a GUID and returns it as an `Edm.Guid` literal. */
export function guidLiteral(value: unknown): string {
  if (!isGuid(value)) throw new DataverseError(400, "Expected a GUID");
  return value.toLowerCase();
}

export function jsonLiteral(value: unknown): string {
  return JSON.stringify(value);
}

/** `{"@odata.id":"accounts(<id>)"}` — how a `crmbaseentity` parameter (e.g. `Target`) is passed. */
export function entityReferenceLiteral(entitySet: string, id: Guid): string {
  return jsonLiteral({ "@odata.id": `${assertIdentifier(entitySet)}(${guidLiteral(id)})` });
}

export function assertIdentifier(name: string): string {
  if (!IDENTIFIER.test(name)) throw new DataverseError(400, `Invalid Dataverse identifier: ${name}`);
  return name;
}

/** Builds `Name(P1=@p0,P2=@p1)?@p0=...&@p1=...` with URL-encoded alias values. */
export function functionPath(name: string, params: Record<string, string>, query?: string): string {
  const entries = Object.entries(params);
  const args = entries.map(([key], i) => `${assertIdentifier(key)}=@p${i}`).join(",");
  const aliases = entries.map(([, value], i) => `@p${i}=${encodeURIComponent(value)}`);
  const search = [...aliases, ...(query ? [query] : [])].join("&");
  return `${assertIdentifier(name)}(${args})${search ? `?${search}` : ""}`;
}

/** Power Automate approval tables are owned by the Approvals connector; the kit never writes to them. */
export const READ_ONLY_ENTITY_SETS: readonly string[] = [
  "msdyn_flow_approvals",
  "msdyn_flow_approvalresponses",
  "msdyn_flow_approvalrequests",
];

export function assertWritable(entitySet: string): void {
  if (READ_ONLY_ENTITY_SETS.includes(entitySet.toLowerCase())) {
    throw new DataverseError(403, `${entitySet} is read-only for this app`);
  }
}

export function assertCaller(options: WriteOptions | undefined): Guid {
  if (!options || !isGuid(options.callerObjectId)) {
    throw new DataverseError(400, "Dataverse writes require the signed-in user's Entra object id (CallerObjectId)");
  }
  return options.callerObjectId.toLowerCase();
}
