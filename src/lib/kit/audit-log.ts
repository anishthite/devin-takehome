/** The kit's own append-only audit trail (`audit_log`). */

export interface AuditTarget {
  /** Kit record type, e.g. `approval_request`. */
  type: string;
  id: string;
}

export interface AuditChange {
  attribute: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  /** Entra object id of the user who acted. */
  actorId: string;
  actorName: string;
  action: string;
  target: AuditTarget;
  changes: AuditChange[];
}

export type NewAuditLogEntry = Omit<AuditLogEntry, "id" | "occurredAt">;

export interface AuditLog {
  append(entry: NewAuditLogEntry): Promise<AuditLogEntry>;
  /** Newest first; all entries when no target is given. */
  list(target?: AuditTarget): Promise<AuditLogEntry[]>;
}
