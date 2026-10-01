import type { EntryStatus, LedgerEntry, PaymentMethod } from "./types";

export const MOCK_OPENING_BALANCE_MINOR = 248_310_00;

const COUNTERPARTIES: Array<{ name: string; description: string; inflow: boolean; method: PaymentMethod; base: number }> = [
  { name: "Northwind Traders", description: "Invoice #4821", inflow: true, method: "ACH", base: 18_400_00 },
  { name: "Contoso Ltd", description: "Quarterly retainer", inflow: true, method: "Wire", base: 42_000_00 },
  { name: "Fabrikam Inc", description: "Invoice #1193", inflow: true, method: "RTP", base: 9_750_00 },
  { name: "Adatum Payroll", description: "Payroll run", inflow: false, method: "ACH", base: 31_200_00 },
  { name: "Azure", description: "Cloud services", inflow: false, method: "Card", base: 4_812_00 },
  { name: "Litware Leasing", description: "Office lease", inflow: false, method: "Wire", base: 12_500_00 },
  { name: "Tailspin Toys", description: "Refund", inflow: false, method: "Card", base: 640_00 },
  { name: "Woodgrove Bank", description: "Loan repayment", inflow: false, method: "ACH", base: 7_300_00 },
  { name: "Proseware", description: "Vendor payout", inflow: false, method: "RTP", base: 2_150_00 },
  { name: "Wide World Importers", description: "Invoice #7730", inflow: true, method: "ACH", base: 14_980_00 },
];

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

/** Deterministic sample ledger used until the real ledger backend is connected. */
export function mockLedger(now: Date, days = 30): LedgerEntry[] {
  const rand = seeded(42);
  const entries: LedgerEntry[] = [];
  for (let day = days - 1; day >= 0; day--) {
    const perDay = 1 + Math.floor(rand() * 3);
    for (let n = 0; n < perDay; n++) {
      const cp = COUNTERPARTIES[Math.floor(rand() * COUNTERPARTIES.length)];
      const amount = Math.round(cp.base * (0.6 + rand() * 0.8));
      const occurredAt = new Date(now.getTime() - day * 86_400_000 - Math.floor(rand() * 36_000_000));
      let status: EntryStatus = "posted";
      if (day <= 1 && rand() < 0.7) status = "pending";
      else if (rand() < 0.04) status = "failed";
      entries.push({
        id: `pay_${(entries.length + 1).toString().padStart(4, "0")}`,
        occurredAt: occurredAt.toISOString(),
        counterparty: cp.name,
        description: cp.description,
        amountMinor: cp.inflow ? amount : -amount,
        currency: "USD",
        method: cp.method,
        status,
      });
    }
  }
  return entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
