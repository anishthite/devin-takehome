export const REFUND_REASONS = [
  "damaged",
  "not_received",
  "wrong_item",
  "duplicate_charge",
  "service_issue",
  "goodwill",
] as const;

export type RefundReason = (typeof REFUND_REASONS)[number];

export const REASON_LABELS: Record<RefundReason, string> = {
  damaged: "Damaged item",
  not_received: "Not received",
  wrong_item: "Wrong item",
  duplicate_charge: "Duplicate charge",
  service_issue: "Service issue",
  goodwill: "Goodwill",
};

export const PAYMENT_METHODS = ["Visa", "Mastercard", "Amex", "ACH", "PayPal", "Apple Pay"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** `pending_approval` → `approved` → `issued`, or `rejected` / `cancelled` while pending. */
export type RefundStatus = "pending_approval" | "approved" | "rejected" | "cancelled" | "issued";

export const REFUND_STATUSES: readonly RefundStatus[] = ["pending_approval", "approved", "issued", "rejected", "cancelled"];

export const STATUS_LABELS: Record<RefundStatus, string> = {
  pending_approval: "Awaiting approval",
  approved: "Approved",
  issued: "Issued",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export interface Refund {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: PaymentMethod;
  reason: RefundReason;
  note: string | null;
  amountMinor: number;
  currency: "USD";
  status: RefundStatus;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionComment: string | null;
  issuedByName: string | null;
  issuedAt: string | null;
  /** Payment processor refund reference, once issued. */
  providerRef: string | null;
  /** Kit maker-checker approval request; null for imported sample history. */
  approvalId: string | null;
  sample: boolean;
}

export interface NewRefund {
  orderId: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: PaymentMethod;
  reason: RefundReason;
  note: string;
  amountMinor: number;
}

export interface RefundStore {
  list(): Promise<Refund[]>;
  get(id: string): Promise<Refund | null>;
  save(refund: Refund): Promise<void>;
}
