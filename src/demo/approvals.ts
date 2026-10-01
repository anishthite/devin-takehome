import type { ApprovalRequest, ApprovalStore } from "../lib/kit/approvals.ts";

/** In-memory approval store; the kit has no database yet. */
export function memoryApprovalStore(): ApprovalStore {
  const rows = new Map<string, ApprovalRequest>();
  return {
    async list() {
      return [...rows.values()].map((r) => structuredClone(r));
    },
    async get(id) {
      const row = rows.get(id);
      return row ? structuredClone(row) : null;
    },
    async save(request) {
      rows.set(request.id, structuredClone(request));
    },
  };
}
