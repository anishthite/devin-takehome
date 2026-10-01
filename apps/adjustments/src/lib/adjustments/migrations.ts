import type { SqlMigration } from "../../../../../packages/kit/sql/client.ts";

/** Expected schema of the external customer database (and the adjustment journal this app writes). */
export const ADJUSTMENT_MIGRATIONS: readonly SqlMigration[] = [
  {
    id: "adjustments_001_customer_accounts",
    sql: `
      CREATE TABLE IF NOT EXISTS customer_accounts (
        id text PRIMARY KEY,
        account_number text NOT NULL UNIQUE,
        name text NOT NULL,
        email text NOT NULL,
        currency text NOT NULL DEFAULT 'USD',
        status text NOT NULL CHECK (status IN ('active', 'frozen', 'closed')),
        balance_minor bigint NOT NULL CHECK (balance_minor >= 0),
        version integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `,
  },
  {
    id: "adjustments_002_balance_adjustments",
    sql: `
      CREATE TABLE balance_adjustments (
        id text PRIMARY KEY,
        account_id text NOT NULL REFERENCES customer_accounts (id),
        approval_id text NOT NULL UNIQUE,
        direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
        amount_minor bigint NOT NULL CHECK (amount_minor <> 0),
        balance_before_minor bigint NOT NULL,
        balance_after_minor bigint NOT NULL,
        reason_code text NOT NULL,
        memo text NOT NULL,
        requested_by_id text NOT NULL,
        requested_by_name text NOT NULL,
        approved_by_id text NOT NULL,
        approved_by_name text NOT NULL,
        posted_at timestamptz NOT NULL
      );
      CREATE INDEX balance_adjustments_account ON balance_adjustments (account_id, posted_at);
    `,
  },
];
