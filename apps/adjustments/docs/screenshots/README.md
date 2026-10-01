# Screenshots

Captured from a production build (`next build && next start`) in `DEMO_MODE` (mock Entra sign-in) with Playwright.

**In-memory database** (no `DATABASE_URL`, `pg-mem`):

| | |
|---|---|
| `01-sign-in.png` | Demo sign-in |
| `02-customers-operator.png` | Customer balances, as Sam Operator |
| `03-customer-request-form.png` | Customer detail with the request form |
| `04-adjustment-submitted.png` | $35.00 fee reversal submitted; balance unchanged, shown as pending |
| `05-overdraft-refused.png` | $500.00 debit on a $312.00 balance refused |
| `06-reason-direction-refused.png` | Debit with a credit-only reason refused |
| `07-maker-cannot-approve-own.png` | Maker sees only Cancel on their own requests |
| `08-checker-queue.png` | Jordan Approver's queue; the $18,400 request needs an Admin |
| `09-approved-and-posted.png` | Approved and posted |
| `10-customer-after-posting.png` | Balance updated, journal row, account audit trail |
| `11-audit-log.png` | Audit page |
| `12-viewer-read-only.png` | Viewer: no request form |
| `13-viewer-audit-forbidden.png` | Viewer: `/audit` is 403 |

**Live PostgreSQL 16** (`DATABASE_URL` set, schema from `npm run db:migrate -- --seed`): the `live-*.png` files repeat the submit → approve flow, and [`live-postgres-rows.txt`](live-postgres-rows.txt) shows the resulting rows in `customer_accounts`, `balance_adjustments`, `kit_approval_requests` and `kit_audit_log`.
