import type { AuditLogEntry } from "../../../../../packages/kit/services/audit-log.ts";

const HEADER = ["occurred_at", "action", "actor_id", "actor_name", "target_type", "target_id", "changes"];

function cell(value: string): string {
  // Leading =, +, -, @ would be evaluated as formulas by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** RFC 4180 CSV of audit entries, one row per entry. */
export function auditCsv(entries: readonly AuditLogEntry[]): string {
  const rows = entries.map((e) => [
    e.occurredAt,
    e.action,
    e.actorId,
    e.actorName,
    e.target.type,
    e.target.id,
    e.changes.map((c) => `${c.attribute}: ${JSON.stringify(c.oldValue)} -> ${JSON.stringify(c.newValue)}`).join("; "),
  ]);
  return [HEADER, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
