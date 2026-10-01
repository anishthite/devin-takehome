import type { Refund, RefundReason } from "./types.ts";

export interface RefundSummary {
  issuedMinor: number;
  issuedCount: number;
  pendingCount: number;
  pendingMinor: number;
  awaitingIssueCount: number;
  awaitingIssueMinor: number;
  /** Approved share of decided refunds in the window, 0–1; null when nothing was decided. */
  approvalRate: number | null;
  /** Mean hours from request to decision in the window; null when nothing was decided. */
  avgHoursToDecision: number | null;
  daily: Array<{ date: string; requestedMinor: number; issuedMinor: number }>;
  byReason: Array<{ reason: RefundReason; count: number; amountMinor: number }>;
}

const DAY = 86_400_000;
const dayKey = (iso: string) => iso.slice(0, 10);

export function summarize(refunds: readonly Refund[], now: Date, days: number): RefundSummary {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (days - 1) * DAY);
  const inWindow = (iso: string | null): iso is string => iso !== null && new Date(iso) >= start && new Date(iso) <= now;

  const daily = Array.from({ length: days }, (_, i) => ({
    date: new Date(start.getTime() + i * DAY).toISOString().slice(0, 10),
    requestedMinor: 0,
    issuedMinor: 0,
  }));
  const byDay = new Map(daily.map((d) => [d.date, d]));
  const reasons = new Map<RefundReason, { reason: RefundReason; count: number; amountMinor: number }>();

  const summary: RefundSummary = {
    issuedMinor: 0,
    issuedCount: 0,
    pendingCount: 0,
    pendingMinor: 0,
    awaitingIssueCount: 0,
    awaitingIssueMinor: 0,
    approvalRate: null,
    avgHoursToDecision: null,
    daily,
    byReason: [],
  };

  let decided = 0;
  let approved = 0;
  let decisionHours = 0;

  for (const r of refunds) {
    if (r.status === "pending_approval") {
      summary.pendingCount++;
      summary.pendingMinor += r.amountMinor;
    }
    if (r.status === "approved") {
      summary.awaitingIssueCount++;
      summary.awaitingIssueMinor += r.amountMinor;
    }
    if (inWindow(r.requestedAt)) {
      const day = byDay.get(dayKey(r.requestedAt));
      if (day) day.requestedMinor += r.amountMinor;
      const entry = reasons.get(r.reason) ?? { reason: r.reason, count: 0, amountMinor: 0 };
      entry.count++;
      entry.amountMinor += r.amountMinor;
      reasons.set(r.reason, entry);
    }
    if (r.status === "issued" && inWindow(r.issuedAt)) {
      summary.issuedCount++;
      summary.issuedMinor += r.amountMinor;
      const day = byDay.get(dayKey(r.issuedAt));
      if (day) day.issuedMinor += r.amountMinor;
    }
    if ((r.status === "approved" || r.status === "issued" || r.status === "rejected") && inWindow(r.decidedAt)) {
      decided++;
      if (r.status !== "rejected") approved++;
      decisionHours += (new Date(r.decidedAt).getTime() - new Date(r.requestedAt).getTime()) / 3_600_000;
    }
  }

  if (decided > 0) {
    summary.approvalRate = approved / decided;
    summary.avgHoursToDecision = decisionHours / decided;
  }
  summary.byReason = [...reasons.values()].sort((a, b) => b.amountMinor - a.amountMinor);
  return summary;
}
