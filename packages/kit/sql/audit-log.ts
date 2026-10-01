import type { AuditLog, AuditLogEntry } from "../services/audit-log.ts";
import { toIsoString, type SqlClient } from "./client.ts";

interface Row {
  id: string;
  occurred_at: Date | string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  changes: AuditLogEntry["changes"] | string;
}

const fromRow = (r: Row): AuditLogEntry => ({
  id: r.id,
  occurredAt: toIsoString(r.occurred_at),
  actorId: r.actor_id,
  actorName: r.actor_name,
  action: r.action,
  target: { type: r.target_type, id: r.target_id },
  changes: typeof r.changes === "string" ? JSON.parse(r.changes) : r.changes,
});

/** Append-only `kit_audit_log`. Appends join the caller's transaction, so audit rows commit with the change. */
export function sqlAuditLog(sql: SqlClient, now: () => Date = () => new Date()): AuditLog {
  return {
    async append(entry) {
      const saved: AuditLogEntry = { ...entry, id: crypto.randomUUID(), occurredAt: now().toISOString() };
      await sql.query(
        `INSERT INTO kit_audit_log (id, occurred_at, actor_id, actor_name, action, target_type, target_id, changes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          saved.id,
          saved.occurredAt,
          saved.actorId,
          saved.actorName,
          saved.action,
          saved.target.type,
          saved.target.id,
          JSON.stringify(saved.changes),
        ],
      );
      return saved;
    },
    async list(target) {
      const { rows } = target
        ? await sql.query<Row>(
            `SELECT * FROM kit_audit_log WHERE target_type = $1 AND target_id = $2 ORDER BY seq DESC`,
            [target.type, target.id],
          )
        : await sql.query<Row>(`SELECT * FROM kit_audit_log ORDER BY seq DESC LIMIT 500`);
      return rows.map(fromRow);
    },
  };
}
