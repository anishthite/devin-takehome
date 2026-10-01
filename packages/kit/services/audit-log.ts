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

export interface AuditedChange<T> {
  action: string;
  target: AuditTarget | ((result: T) => AuditTarget);
  /** Attribute-level diff, usually derived from the result (e.g. old → new balance). */
  changes?: (result: T) => AuditChange[];
}

/**
 * Runs `change`, then appends one audit_log entry attributed to `actor`. Nothing is logged if the change throws.
 * Pass the SQL client's `transaction` so the audit row commits atomically with the change.
 */
export async function withAudit<T>(
  auditLog: AuditLog,
  actor: { id: string; name: string },
  audit: AuditedChange<T>,
  change: () => Promise<T>,
  transaction: <R>(fn: () => Promise<R>) => Promise<R> = (fn) => fn(),
): Promise<T> {
  return transaction(async () => {
    const result = await change();
    await auditLog.append({
      actorId: actor.id,
      actorName: actor.name,
      action: audit.action,
      target: typeof audit.target === "function" ? audit.target(result) : audit.target,
      changes: audit.changes?.(result) ?? [],
    });
    return result;
  });
}
