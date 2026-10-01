export type EntryStatus = "posted" | "pending" | "failed";
export type PaymentMethod = "ACH" | "Wire" | "Card" | "RTP";

export interface LedgerEntry {
  id: string;
  occurredAt: string;
  counterparty: string;
  description: string;
  /** Signed amount in minor units (cents): positive = inflow, negative = outflow. */
  amountMinor: number;
  currency: "USD";
  method: PaymentMethod;
  status: EntryStatus;
}

export interface DailyFlow {
  date: string;
  inflowMinor: number;
  outflowMinor: number;
}

export interface LedgerSummary {
  balanceMinor: number;
  inflowMinor: number;
  outflowMinor: number;
  pendingCount: number;
  pendingMinor: number;
  daily: DailyFlow[];
}
