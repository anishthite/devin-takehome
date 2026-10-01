import type { ApprovalStatus } from "../../../../../packages/kit/services/approvals.ts";

export type AccountStatus = "active" | "frozen" | "closed";
export type Direction = "credit" | "debit";

/** A customer account in the external database. Balances are integer minor units (cents). */
export interface CustomerAccount {
  id: string;
  accountNumber: string;
  name: string;
  email: string;
  currency: "USD";
  status: AccountStatus;
  balanceMinor: number;
  updatedAt: string;
}

/** A posted balance adjustment (journal row); `amountMinor` is signed. */
export interface PostedAdjustment {
  id: string;
  accountId: string;
  approvalId: string;
  direction: Direction;
  amountMinor: number;
  balanceBeforeMinor: number;
  balanceAfterMinor: number;
  reasonCode: string;
  memo: string;
  requestedById: string;
  requestedByName: string;
  approvedById: string;
  approvedByName: string;
  postedAt: string;
}

/** A balance adjustment awaiting (or past) maker-checker review: a kit approval request of kind `balance_adjustment`. */
export interface AdjustmentRequest {
  id: string;
  status: ApprovalStatus;
  accountId: string;
  accountNumber: string;
  customerName: string;
  direction: Direction;
  /** Always positive; `direction` gives the sign. */
  amountMinor: number;
  signedAmountMinor: number;
  reasonCode: string;
  memo: string;
  balanceAtRequestMinor: number;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  comment: string | null;
}
