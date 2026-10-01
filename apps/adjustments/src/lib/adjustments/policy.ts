import { hasRole, type Role } from "../../../../../packages/kit/auth/roles.ts";
import type { CustomerAccount, Direction } from "./types.ts";

export const ADJUSTMENT_KIND = "balance_adjustment";
export const ACCOUNT_TARGET_TYPE = "customer_account";

export class AdjustmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdjustmentError";
  }
}

export const REASONS = {
  fee_reversal: { label: "Fee reversal", directions: ["credit"] },
  goodwill_credit: { label: "Goodwill credit", directions: ["credit"] },
  interest_correction: { label: "Interest correction", directions: ["credit", "debit"] },
  posting_error: { label: "Posting error correction", directions: ["credit", "debit"] },
  chargeback: { label: "Chargeback", directions: ["debit"] },
  fee_assessment: { label: "Manual fee", directions: ["debit"] },
} as const satisfies Record<string, { label: string; directions: readonly Direction[] }>;

export type ReasonCode = keyof typeof REASONS;

export const isReasonCode = (value: string): value is ReasonCode => Object.hasOwn(REASONS, value);

export const reasonLabel = (code: string) => (isReasonCode(code) ? REASONS[code].label : code);

/** Hard cap per adjustment; larger corrections go through finance ops, not this tool. */
export const MAX_ADJUSTMENT_MINOR = 250_000_00;
/** Above this, the checker must be an Admin. */
export const ADMIN_APPROVAL_THRESHOLD_MINOR = 10_000_00;
export const MEMO_MIN = 10;
export const MEMO_MAX = 500;

export function parseAmountMinor(value: string): number {
  const match = /^\s*\$?\s*(\d{1,9})(?:\.(\d{1,2}))?\s*$/.exec(value.replaceAll(",", ""));
  if (!match) throw new AdjustmentError("Enter an amount like 125.00");
  const minor = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (minor <= 0) throw new AdjustmentError("Amount must be greater than zero");
  if (minor > MAX_ADJUSTMENT_MINOR) throw new AdjustmentError("Amount exceeds the $250,000.00 per-adjustment limit");
  return minor;
}

export const signed = (direction: Direction, amountMinor: number) => (direction === "credit" ? amountMinor : -amountMinor);

export function requiredApproverRole(amountMinor: number): Role {
  return amountMinor > ADMIN_APPROVAL_THRESHOLD_MINOR ? "Ledger.Admin" : "Ledger.Approver";
}

export function canApprove(roles: readonly Role[], amountMinor: number): boolean {
  return hasRole(roles, requiredApproverRole(amountMinor));
}

export interface AdjustmentInput {
  accountId: string;
  direction: string;
  amount: string;
  reasonCode: string;
  memo: string;
}

export interface ValidAdjustment {
  accountId: string;
  direction: Direction;
  amountMinor: number;
  reasonCode: ReasonCode;
  memo: string;
}

export function validateAdjustment(input: AdjustmentInput): ValidAdjustment {
  const accountId = input.accountId.trim();
  if (!accountId) throw new AdjustmentError("Choose a customer account");
  if (input.direction !== "credit" && input.direction !== "debit") throw new AdjustmentError("Choose credit or debit");
  const direction: Direction = input.direction;
  if (!isReasonCode(input.reasonCode)) throw new AdjustmentError("Choose a reason");
  const reason = REASONS[input.reasonCode];
  if (!(reason.directions as readonly Direction[]).includes(direction)) {
    throw new AdjustmentError(`${reason.label} can only be a ${reason.directions.join(" or ")}`);
  }
  const memo = input.memo.trim().replace(/\s+/g, " ");
  if (memo.length < MEMO_MIN) throw new AdjustmentError(`Memo must be at least ${MEMO_MIN} characters`);
  if (memo.length > MEMO_MAX) throw new AdjustmentError(`Memo must be at most ${MEMO_MAX} characters`);
  return { accountId, direction, amountMinor: parseAmountMinor(input.amount), reasonCode: input.reasonCode, memo };
}

/** Checks that apply both when the maker submits and when the posting happens. */
export function assertPostable(account: CustomerAccount, signedAmountMinor: number) {
  if (account.status !== "active") throw new AdjustmentError(`Account ${account.accountNumber} is ${account.status}`);
  if (account.balanceMinor + signedAmountMinor < 0) {
    throw new AdjustmentError("Debit would take the balance below zero");
  }
}
