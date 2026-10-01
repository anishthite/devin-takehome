import type { Guid } from "../dataverse/types.ts";
import type { AuditChange, AuditLogEntry, AuditTarget } from "./audit-log.ts";

export type AuditSource = "kit" | "dataverse";

/** One row in the audit viewer, from either the kit's audit_log or Dataverse auditing. */
export interface AuditViewerEntry {
  id: string;
  source: AuditSource;
  occurredAt: string;
  action: string;
  /** The user the change is attributed to. */
  actorName: string;
  /** Dataverse only: the application user that made the call on the actor's behalf. */
  callingUserName: string | null;
  target: AuditTarget;
  changes: AuditChange[];
}

export interface DataverseRecordRef {
  entitySet: string;
  id: Guid;
}

/** Reads Dataverse change history for one record. */
export interface AuditReader {
  recordChangeHistory(record: DataverseRecordRef): Promise<AuditViewerEntry[]>;
}

export function fromAuditLog(entry: AuditLogEntry): AuditViewerEntry {
  return {
    id: entry.id,
    source: "kit",
    occurredAt: entry.occurredAt,
    action: entry.action,
    actorName: entry.actorName,
    callingUserName: null,
    target: entry.target,
    changes: entry.changes,
  };
}

/** Newest first; on equal timestamps the kit entry (which records intent) sorts after the Dataverse write it caused. */
export function mergeAuditTrail(kit: readonly AuditLogEntry[], dataverse: readonly AuditViewerEntry[]): AuditViewerEntry[] {
  const rank = (e: AuditViewerEntry) => (e.source === "dataverse" ? 0 : 1);
  return [...kit.map(fromAuditLog), ...dataverse].sort(
    (a, b) => b.occurredAt.localeCompare(a.occurredAt) || rank(a) - rank(b),
  );
}
