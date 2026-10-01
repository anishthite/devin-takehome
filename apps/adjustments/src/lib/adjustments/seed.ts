import type { SqlClient } from "../../../../../packages/kit/sql/client.ts";
import { DEMO_PERSONAS } from "../../../../../packages/kit/demo/personas.ts";
import type { Actor } from "../../../../../packages/kit/services/actor.ts";
import type { AdjustmentService } from "./service.ts";

const CUSTOMERS = [
  ["c0000000-0000-4000-a000-000000000001", "ACC-100245", "Northwind Traders", "ap@northwind.example", "active", 48_215_37],
  ["c0000000-0000-4000-a000-000000000002", "ACC-100318", "Contoso Pharmacy", "billing@contoso.example", "active", 1_204_90],
  ["c0000000-0000-4000-a000-000000000003", "ACC-100402", "Fabrikam Studio", "finance@fabrikam.example", "active", 312_00],
  ["c0000000-0000-4000-a000-000000000004", "ACC-100577", "Adventure Works Cycles", "ar@adventure.example", "active", 126_480_12],
  ["c0000000-0000-4000-a000-000000000005", "ACC-100613", "Tailspin Toys", "accounts@tailspin.example", "frozen", 9_870_55],
  ["c0000000-0000-4000-a000-000000000006", "ACC-100729", "Wingtip Coffee", "owner@wingtip.example", "active", 0],
  ["c0000000-0000-4000-a000-000000000007", "ACC-100804", "Litware Dental", "office@litware.example", "closed", 0],
  ["c0000000-0000-4000-a000-000000000008", "ACC-100951", "Proseware Labs", "ops@proseware.example", "active", 22_340_08],
] as const;

export const DEMO_ACCOUNT_IDS = CUSTOMERS.map(([id]) => id);

/** Customer accounts for demo mode and `db:migrate --seed`; skips rows that already exist. */
export async function seedDemoAccounts(sql: SqlClient) {
  for (const [id, number, name, email, status, balance] of CUSTOMERS) {
    const { rowCount } = await sql.query(`SELECT 1 FROM customer_accounts WHERE id = $1`, [id]);
    if (rowCount > 0) continue;
    await sql.query(
      `INSERT INTO customer_accounts (id, account_number, name, email, currency, status, balance_minor)
       VALUES ($1, $2, $3, $4, 'USD', $5, $6)`,
      [id, number, name, email, status, balance],
    );
  }
}

const actor = (index: number): Actor => {
  const p = DEMO_PERSONAS[index];
  return { id: p.id, name: p.name, roles: [p.role] };
};

/** A posted, a pending and a pending-needs-Admin adjustment so every screen has something on it. */
export async function seedDemoRequests(service: AdjustmentService) {
  const [, approver, operator] = [0, 1, 2].map(actor);
  const [northwind, contoso, , adventure] = DEMO_ACCOUNT_IDS;

  const posted = await service.submit(operator, {
    accountId: contoso,
    direction: "credit",
    amount: "35.00",
    reasonCode: "fee_reversal",
    memo: "Late fee charged in error; customer paid on the due date.",
  });
  await service.decide(approver, posted.id, "approved", "Confirmed against the payment receipt.");

  await service.submit(operator, {
    accountId: northwind,
    direction: "debit",
    amount: "1,250.00",
    reasonCode: "chargeback",
    memo: "Card dispute #CB-88213 lost; reversing the provisional credit.",
  });
  await service.submit(operator, {
    accountId: adventure,
    direction: "credit",
    amount: "18,400.00",
    reasonCode: "posting_error",
    memo: "Wire batch 2026-09-28 posted to the wrong account; moving it to the correct customer.",
  });
}
