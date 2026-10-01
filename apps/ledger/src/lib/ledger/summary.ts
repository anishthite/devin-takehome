import type { DailyFlow, LedgerEntry, LedgerSummary } from "./types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function summarize(
  entries: readonly LedgerEntry[],
  openingBalanceMinor: number,
  now: Date,
  days: number,
): LedgerSummary {
  const since = now.getTime() - days * DAY_MS;
  const daily = new Map<string, DailyFlow>();
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(new Date(now.getTime() - i * DAY_MS));
    daily.set(date, { date, inflowMinor: 0, outflowMinor: 0 });
  }

  let balanceMinor = openingBalanceMinor;
  let inflowMinor = 0;
  let outflowMinor = 0;
  let pendingCount = 0;
  let pendingMinor = 0;

  for (const entry of entries) {
    if (entry.status === "pending") {
      pendingCount++;
      pendingMinor += entry.amountMinor;
      continue;
    }
    if (entry.status !== "posted") continue;

    balanceMinor += entry.amountMinor;
    if (new Date(entry.occurredAt).getTime() < since) continue;

    const bucket = daily.get(dayKey(new Date(entry.occurredAt)));
    if (entry.amountMinor >= 0) {
      inflowMinor += entry.amountMinor;
      if (bucket) bucket.inflowMinor += entry.amountMinor;
    } else {
      outflowMinor += -entry.amountMinor;
      if (bucket) bucket.outflowMinor += -entry.amountMinor;
    }
  }

  return {
    balanceMinor,
    inflowMinor,
    outflowMinor,
    pendingCount,
    pendingMinor,
    daily: [...daily.values()],
  };
}
