import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleRefunds } from "../src/lib/refunds/sample-data.ts";
import { summarize } from "../src/lib/refunds/summary.ts";
import type { Refund } from "../src/lib/refunds/types.ts";

const now = new Date("2026-10-01T12:00:00Z");

function refund(id: string, status: Refund["status"], amountMinor: number, at: Partial<Refund> = {}): Refund {
  return {
    id,
    orderId: `ORD-${id}`,
    customerName: "X",
    customerEmail: "x@example.com",
    paymentMethod: "Visa",
    reason: "damaged",
    note: null,
    amountMinor,
    currency: "USD",
    status,
    requestedById: "o",
    requestedByName: "O",
    requestedAt: "2026-09-30T10:00:00Z",
    decidedByName: null,
    decidedAt: null,
    decisionComment: null,
    issuedByName: null,
    issuedAt: null,
    providerRef: null,
    approvalId: null,
    sample: false,
    ...at,
  };
}

test("summarize splits refunds by lifecycle stage", () => {
  const s = summarize(
    [
      refund("a", "pending_approval", 1_000),
      refund("b", "approved", 2_000, { decidedAt: "2026-09-30T12:00:00Z" }),
      refund("c", "issued", 3_000, { decidedAt: "2026-09-30T14:00:00Z", issuedAt: "2026-10-01T09:00:00Z" }),
      refund("d", "rejected", 4_000, { reason: "goodwill", decidedAt: "2026-09-30T16:00:00Z" }),
      refund("e", "issued", 9_999, { requestedAt: "2026-08-01T10:00:00Z", decidedAt: "2026-08-01T11:00:00Z", issuedAt: "2026-08-02T10:00:00Z" }),
    ],
    now,
    7,
  );
  assert.equal(s.pendingCount, 1);
  assert.equal(s.pendingMinor, 1_000);
  assert.equal(s.awaitingIssueCount, 1);
  assert.equal(s.awaitingIssueMinor, 2_000);
  assert.equal(s.issuedCount, 1);
  assert.equal(s.issuedMinor, 3_000);
  assert.equal(s.approvalRate, 2 / 3);
  assert.equal(s.avgHoursToDecision, 4);
  assert.equal(s.daily.length, 7);
  assert.equal(s.daily.at(-1)?.date, "2026-10-01");
  assert.equal(s.daily.at(-1)?.issuedMinor, 3_000);
  assert.equal(s.daily.at(-2)?.requestedMinor, 10_000);
  assert.deepEqual(s.byReason[0], { reason: "damaged", count: 3, amountMinor: 6_000 });
});

test("summarize reports no rate when nothing was decided", () => {
  const s = summarize([refund("a", "pending_approval", 1_000)], now, 7);
  assert.equal(s.approvalRate, null);
  assert.equal(s.avgHoursToDecision, null);
});

test("sample history is deterministic, read-only and inside the window", () => {
  const a = sampleRefunds(now);
  assert.deepEqual(a, sampleRefunds(now));
  assert.ok(a.length > 20);
  assert.ok(a.every((r) => r.sample && r.approvalId === null && (r.status === "issued" || r.status === "rejected")));
  assert.ok(a.every((r) => new Date(r.requestedAt) <= now));
  assert.ok(summarize(a, now, 30).issuedMinor > 0);
});
