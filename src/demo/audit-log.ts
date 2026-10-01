import type { AuditLog, AuditLogEntry } from "../lib/kit/audit-log.ts";

/** In-memory `audit_log`; the kit has no database yet. */
export function memoryAuditLog(now: () => Date = () => new Date()): AuditLog {
  const entries: AuditLogEntry[] = [];
  return {
    async append(entry) {
      const saved: AuditLogEntry = { ...entry, id: crypto.randomUUID(), occurredAt: now().toISOString() };
      entries.push(saved);
      return structuredClone(saved);
    },
    async list(target) {
      return entries
        .filter((e) => !target || (e.target.type === target.type && e.target.id === target.id))
        .reverse()
        .map((e) => structuredClone(e));
    },
  };
}
