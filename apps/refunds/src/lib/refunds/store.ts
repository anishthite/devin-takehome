import type { Refund, RefundStore } from "./types.ts";

/** In-memory refund store; the kit has no database yet. */
export function memoryRefundStore(seed: readonly Refund[] = []): RefundStore {
  const rows = new Map(seed.map((r) => [r.id, structuredClone(r)]));
  return {
    async list() {
      return [...rows.values()].map((r) => structuredClone(r));
    },
    async get(id) {
      const row = rows.get(id);
      return row ? structuredClone(row) : null;
    },
    async save(refund) {
      rows.set(refund.id, structuredClone(refund));
    },
  };
}
