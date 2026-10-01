import type { PaymentMethod, Refund, RefundReason } from "./types.ts";

const CUSTOMERS = [
  "Ava Thompson",
  "Noah Patel",
  "Mia Chen",
  "Liam Garcia",
  "Emma Rossi",
  "Lucas Müller",
  "Sofia Alvarez",
  "Ethan Brooks",
  "Zoe Nakamura",
  "Owen Kelly",
  "Isla Novak",
  "Leo Okafor",
];

const AGENTS = ["Casey Support", "Morgan Support", "Taylor Support"];
const APPROVERS = ["Jordan Approver", "Avery Admin"];
const METHODS: readonly PaymentMethod[] = ["Visa", "Visa", "Mastercard", "Amex", "PayPal", "Apple Pay", "ACH"];

const REASONS: ReadonlyArray<{ reason: RefundReason; weight: number; base: number }> = [
  { reason: "damaged", weight: 5, base: 84_00 },
  { reason: "not_received", weight: 4, base: 126_00 },
  { reason: "wrong_item", weight: 3, base: 62_00 },
  { reason: "duplicate_charge", weight: 2, base: 210_00 },
  { reason: "service_issue", weight: 2, base: 340_00 },
  { reason: "goodwill", weight: 2, base: 25_00 },
];

const TOTAL_WEIGHT = REASONS.reduce((sum, r) => sum + r.weight, 0);

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function pickReason(rand: () => number) {
  let roll = rand() * TOTAL_WEIGHT;
  for (const r of REASONS) {
    roll -= r.weight;
    if (roll < 0) return r;
  }
  return REASONS[0];
}

const HOUR = 3_600_000;

/** Deterministic, already-closed refund history used until a real refunds backend is connected. */
export function sampleRefunds(now: Date, days = 30): Refund[] {
  const rand = seeded(7);
  const refunds: Refund[] = [];
  for (let day = days - 1; day >= 1; day--) {
    const perDay = 1 + Math.floor(rand() * 3);
    for (let n = 0; n < perDay; n++) {
      const { reason, base } = pickReason(rand);
      const customerName = pick(rand, CUSTOMERS);
      const requestedAt = new Date(now.getTime() - day * 24 * HOUR - Math.floor(rand() * 10 * HOUR));
      const decidedAt = new Date(requestedAt.getTime() + Math.floor((0.25 + rand() * 7) * HOUR));
      const rejected = rand() < 0.12;
      const index = refunds.length + 1;
      refunds.push({
        id: `rf_s${index.toString().padStart(4, "0")}`,
        orderId: `ORD-${(48_210 + index * 7).toString()}`,
        customerName,
        customerEmail: `${customerName.split(" ")[0].toLowerCase()}@example.com`,
        paymentMethod: pick(rand, METHODS),
        reason,
        note: null,
        amountMinor: Math.round(base * (0.5 + rand() * 1.2)),
        currency: "USD",
        status: rejected ? "rejected" : "issued",
        requestedById: "sample",
        requestedByName: pick(rand, AGENTS),
        requestedAt: requestedAt.toISOString(),
        decidedByName: pick(rand, APPROVERS),
        decidedAt: decidedAt.toISOString(),
        decisionComment: rejected ? "Outside the return window." : null,
        issuedByName: rejected ? null : pick(rand, AGENTS),
        issuedAt: rejected ? null : new Date(decidedAt.getTime() + Math.floor(rand() * 2 * HOUR)).toISOString(),
        providerRef: rejected ? null : `re_sample${index.toString().padStart(8, "0")}`,
        approvalId: null,
        sample: true,
      });
    }
  }
  return refunds;
}
