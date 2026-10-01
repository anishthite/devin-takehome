import type { AuditChange } from "../services/audit-log.ts";
import type { AuditReader, AuditViewerEntry, DataverseRecordRef } from "../services/audit-reader.ts";
import { entityReferenceLiteral, jsonLiteral, type DataverseClient } from "./client.ts";
import {
  AUDIT_ACTION_LABELS,
  FORMATTED_VALUE,
  isAttributeAuditDetail,
  type AuditDetail,
  type AuditEntityValues,
  type PagingInfo,
  type RetrieveRecordChangeHistoryResponse,
} from "./types.ts";

const isDataAttribute = (key: string) => !key.startsWith("@") && !key.includes("@");

function attributeChanges(oldValue: AuditEntityValues, newValue: AuditEntityValues): AuditChange[] {
  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)].filter(isDataAttribute));
  return [...keys].sort().map((attribute) => ({
    attribute,
    oldValue: oldValue[`${attribute}${FORMATTED_VALUE}`] ?? oldValue[attribute] ?? null,
    newValue: newValue[`${attribute}${FORMATTED_VALUE}`] ?? newValue[attribute] ?? null,
  }));
}

export function auditDetailToEntry(detail: AuditDetail, record: DataverseRecordRef): AuditViewerEntry {
  const audit = detail.AuditRecord;
  const userName = audit[`_userid_value${FORMATTED_VALUE}`] ?? audit._userid_value;
  const callingUser = audit._callinguserid_value;
  return {
    id: audit.auditid,
    source: "dataverse",
    occurredAt: audit.createdon,
    action: audit[`action${FORMATTED_VALUE}`] ?? AUDIT_ACTION_LABELS[audit.action] ?? `Action ${audit.action}`,
    actorName: userName,
    callingUserName:
      callingUser && callingUser !== audit._userid_value
        ? (audit[`_callinguserid_value${FORMATTED_VALUE}`] ?? callingUser)
        : null,
    target: { type: audit.objecttypecode, id: record.id },
    changes: isAttributeAuditDetail(detail) ? attributeChanges(detail.OldValue, detail.NewValue) : [],
  };
}

/** Reads record history with the `RetrieveRecordChangeHistory` function, following `PagingCookie`. */
export function dataverseAuditReader(client: DataverseClient, pageSize = 100, maxPages = 10): AuditReader {
  return {
    async recordChangeHistory(record) {
      const entries: AuditViewerEntry[] = [];
      let paging: PagingInfo = { PageNumber: 1, Count: pageSize, ReturnTotalRecordCount: false, PagingCookie: null };

      for (let page = 0; page < maxPages; page++) {
        const { AuditDetailCollection: result } = await client.callFunction<RetrieveRecordChangeHistoryResponse>(
          "RetrieveRecordChangeHistory",
          { Target: entityReferenceLiteral(record.entitySet, record.id), PagingInfo: jsonLiteral(paging) },
        );
        entries.push(...result.AuditDetails.map((detail) => auditDetailToEntry(detail, record)));
        if (!result.MoreRecords) break;
        paging = { ...paging, PageNumber: paging.PageNumber + 1, PagingCookie: result.PagingCookie };
      }
      return entries;
    },
  };
}
