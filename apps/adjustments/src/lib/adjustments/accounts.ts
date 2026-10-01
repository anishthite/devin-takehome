import { toIsoString, toSafeInteger, type SqlClient } from "../../../../../packages/kit/sql/client.ts";
import { AdjustmentError, assertPostable } from "./policy.ts";
import type { AccountStatus, CustomerAccount, Direction, PostedAdjustment } from "./types.ts";

export interface PostAdjustment {
  accountId: string;
  /** Idempotency key: one posting per approved request. */
  approvalId: string;
  direction: Direction;
  signedAmountMinor: number;
  reasonCode: string;
  memo: string;
  requestedBy: { id: string; name: string };
  approvedBy: { id: string; name: string };
}

/** Typed adapter over the external customer database. */
export interface CustomerAccounts {
  list(search?: string): Promise<CustomerAccount[]>;
  get(id: string): Promise<CustomerAccount | null>;
  adjustments(accountId: string): Promise<PostedAdjustment[]>;
  /** Applies the adjustment atomically; re-posting the same `approvalId` returns the existing row. */
  post(input: PostAdjustment): Promise<{ adjustment: PostedAdjustment; replayed: boolean }>;
}

interface AccountRow {
  id: string;
  account_number: string;
  name: string;
  email: string;
  currency: string;
  status: string;
  balance_minor: unknown;
  updated_at: unknown;
}

interface AdjustmentRow {
  id: string;
  account_id: string;
  approval_id: string;
  direction: string;
  amount_minor: unknown;
  balance_before_minor: unknown;
  balance_after_minor: unknown;
  reason_code: string;
  memo: string;
  requested_by_id: string;
  requested_by_name: string;
  approved_by_id: string;
  approved_by_name: string;
  posted_at: unknown;
}

const ACCOUNT_COLUMNS = "id, account_number, name, email, currency, status, balance_minor, updated_at";

function toAccount(r: AccountRow): CustomerAccount {
  if (r.currency !== "USD") throw new Error(`Unsupported currency ${r.currency} on account ${r.account_number}`);
  return {
    id: r.id,
    accountNumber: r.account_number,
    name: r.name,
    email: r.email,
    currency: "USD",
    status: r.status as AccountStatus,
    balanceMinor: toSafeInteger(r.balance_minor, "balance_minor"),
    updatedAt: toIsoString(r.updated_at),
  };
}

const toAdjustment = (r: AdjustmentRow): PostedAdjustment => ({
  id: r.id,
  accountId: r.account_id,
  approvalId: r.approval_id,
  direction: r.direction as Direction,
  amountMinor: toSafeInteger(r.amount_minor, "amount_minor"),
  balanceBeforeMinor: toSafeInteger(r.balance_before_minor, "balance_before_minor"),
  balanceAfterMinor: toSafeInteger(r.balance_after_minor, "balance_after_minor"),
  reasonCode: r.reason_code,
  memo: r.memo,
  requestedById: r.requested_by_id,
  requestedByName: r.requested_by_name,
  approvedById: r.approved_by_id,
  approvedByName: r.approved_by_name,
  postedAt: toIsoString(r.posted_at),
});

export function sqlCustomerAccounts(sql: SqlClient, now: () => Date = () => new Date()): CustomerAccounts {
  async function get(id: string) {
    const { rows } = await sql.query<AccountRow>(`SELECT ${ACCOUNT_COLUMNS} FROM customer_accounts WHERE id = $1`, [id]);
    return rows[0] ? toAccount(rows[0]) : null;
  }

  return {
    async list(search) {
      const term = search?.trim().toLowerCase();
      const { rows } = term
        ? await sql.query<AccountRow>(
            `SELECT ${ACCOUNT_COLUMNS} FROM customer_accounts
             WHERE lower(name) LIKE $1 OR lower(account_number) LIKE $1 OR lower(email) LIKE $1
             ORDER BY name LIMIT 200`,
            [`%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`],
          )
        : await sql.query<AccountRow>(`SELECT ${ACCOUNT_COLUMNS} FROM customer_accounts ORDER BY name LIMIT 200`);
      return rows.map(toAccount);
    },

    get,

    async adjustments(accountId) {
      const { rows } = await sql.query<AdjustmentRow>(
        `SELECT * FROM balance_adjustments WHERE account_id = $1 ORDER BY posted_at DESC`,
        [accountId],
      );
      return rows.map(toAdjustment);
    },

    post(input) {
      if (!Number.isSafeInteger(input.signedAmountMinor) || input.signedAmountMinor === 0) {
        throw new AdjustmentError("Adjustment amount must be a non-zero number of cents");
      }
      return sql.transaction(async () => {
        const existing = await sql.query<AdjustmentRow>(`SELECT * FROM balance_adjustments WHERE approval_id = $1`, [
          input.approvalId,
        ]);
        if (existing.rows[0]) return { adjustment: toAdjustment(existing.rows[0]), replayed: true };

        const postedAt = now().toISOString();
        // Single conditional UPDATE: the status and no-overdraft checks hold even under concurrent postings.
        const updated = await sql.query<{ balance_minor: unknown }>(
          `UPDATE customer_accounts
           SET balance_minor = balance_minor + $2, version = version + 1, updated_at = $3
           WHERE id = $1 AND status = 'active' AND balance_minor + $2 >= 0
           RETURNING balance_minor`,
          [input.accountId, input.signedAmountMinor, postedAt],
        );
        if (updated.rowCount === 0) {
          const account = await get(input.accountId);
          if (!account) throw new AdjustmentError("Customer account not found");
          assertPostable(account, input.signedAmountMinor);
          throw new AdjustmentError("Account changed while posting; try again");
        }

        const after = toSafeInteger(updated.rows[0].balance_minor, "balance_minor");
        const adjustment: PostedAdjustment = {
          id: crypto.randomUUID(),
          accountId: input.accountId,
          approvalId: input.approvalId,
          direction: input.direction,
          amountMinor: input.signedAmountMinor,
          balanceBeforeMinor: after - input.signedAmountMinor,
          balanceAfterMinor: after,
          reasonCode: input.reasonCode,
          memo: input.memo,
          requestedById: input.requestedBy.id,
          requestedByName: input.requestedBy.name,
          approvedById: input.approvedBy.id,
          approvedByName: input.approvedBy.name,
          postedAt,
        };
        await sql.query(
          `INSERT INTO balance_adjustments (id, account_id, approval_id, direction, amount_minor, balance_before_minor,
             balance_after_minor, reason_code, memo, requested_by_id, requested_by_name, approved_by_id, approved_by_name, posted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            adjustment.id,
            adjustment.accountId,
            adjustment.approvalId,
            adjustment.direction,
            adjustment.amountMinor,
            adjustment.balanceBeforeMinor,
            adjustment.balanceAfterMinor,
            adjustment.reasonCode,
            adjustment.memo,
            adjustment.requestedById,
            adjustment.requestedByName,
            adjustment.approvedById,
            adjustment.approvedByName,
            adjustment.postedAt,
          ],
        );
        return { adjustment, replayed: false };
      });
    },
  };
}
