import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize } from "../src/lib/ledger/summary.ts";
import type { LedgerEntry } from "../src/lib/ledger/types.ts";

const now = new Date("2026-10-01T12:00:00Z");

function entry(id: string, occurredAt: string, amountMinor: number, status: LedgerEntry["status"]): LedgerEntry {
  return { id, occurredAt, amountMinor, status, counterparty: "X", description: "", currency: "USD", method: "ACH" };
}

test("summarize computes balance, flows and pending from posted entries only", () => {
  const s = summarize(
    [
      entry("a", "2026-10-01T09:00:00Z", 10_000, "posted"),
      entry("b", "2026-09-30T09:00:00Z", -2_500, "posted"),
      entry("c", "2026-10-01T10:00:00Z", 7_000, "pending"),
      entry("d", "2026-09-29T10:00:00Z", -9_999, "failed"),
      entry("e", "2026-08-01T10:00:00Z", 1_000, "posted"),
    ],
    50_000,
    now,
    7,
  );
  assert.equal(s.balanceMinor, 58_500);
  assert.equal(s.inflowMinor, 10_000);
  assert.equal(s.outflowMinor, 2_500);
  assert.equal(s.pendingCount, 1);
  assert.equal(s.pendingMinor, 7_000);
  assert.equal(s.daily.length, 7);
  assert.deepEqual(s.daily.at(-1), { date: "2026-10-01", inflowMinor: 10_000, outflowMinor: 0 });
  assert.deepEqual(s.daily.at(-2), { date: "2026-09-30", inflowMinor: 0, outflowMinor: 2_500 });
});
