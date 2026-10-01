import type { ApprovalRequest, ApprovalStore } from "../services/approvals.ts";
import type { SqlClient } from "./client.ts";

/** `kit_approval_requests`: the full request as JSON, with kind/status/requested_at columns for filtering. */
export function sqlApprovalStore(sql: SqlClient): ApprovalStore {
  const parse = (record: unknown): ApprovalRequest =>
    (typeof record === "string" ? JSON.parse(record) : structuredClone(record)) as ApprovalRequest;

  return {
    async list(filter) {
      const { rows } = filter?.kind
        ? await sql.query<{ record: unknown }>(
            `SELECT record FROM kit_approval_requests WHERE kind = $1 ORDER BY requested_at DESC`,
            [filter.kind],
          )
        : await sql.query<{ record: unknown }>(`SELECT record FROM kit_approval_requests ORDER BY requested_at DESC`);
      return rows.map((r) => parse(r.record));
    },
    async get(id) {
      const { rows } = await sql.query<{ record: unknown }>(`SELECT record FROM kit_approval_requests WHERE id = $1`, [id]);
      return rows[0] ? parse(rows[0].record) : null;
    },
    async save(request) {
      const record = JSON.stringify(request);
      const updated = await sql.query(`UPDATE kit_approval_requests SET status = $2, record = $3 WHERE id = $1`, [
        request.id,
        request.status,
        record,
      ]);
      if (updated.rowCount > 0) return;
      await sql.query(
        `INSERT INTO kit_approval_requests (id, kind, status, requested_at, record) VALUES ($1, $2, $3, $4, $5)`,
        [request.id, request.kind, request.status, request.requestedAt, record],
      );
    },
  };
}
