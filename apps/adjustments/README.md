# Balance Adjustments

Customer balance adjustments with maker-checker approval, built on the kit (`packages/kit`). An operator requests a credit or debit on a customer account; a different approver (an Admin above $10,000.00) approves it, and only then does the balance change in the customer database.

```bash
npm run dev:adjustments:demo   # from the repo root: DEMO_MODE=true, in-memory database, http://localhost:3001
```

## Database

Customer accounts live in an external PostgreSQL database reached through the kit SQL connector (`@kit/sql`). When `DATABASE_URL` is set, the kit's `audit_log` and approval requests are stored in the same database, so an approval, the balance update, the journal row and their audit entries commit in one transaction.

```bash
cp apps/adjustments/.env.example apps/adjustments/.env.local   # DATABASE_URL, Entra values, AUTH_SECRET
npm run db:migrate                                             # kit + app schema; add -- --seed for sample customers (refused in production)
npm run dev:adjustments
```

Without `DATABASE_URL` the app only starts in `DEMO_MODE`, where it uses an in-memory Postgres (`pg-mem`) seeded with sample customers. `GET /api/health` (unauthenticated) pings the database and returns 503 if it is unreachable.

Tables: `customer_accounts` (integer cents, `status` active/frozen/closed) and `balance_adjustments` (append-only journal, one row per approval, `UNIQUE (approval_id)`), plus the kit's `kit_audit_log`, `kit_approval_requests` and `kit_schema_migrations`.

## Controls

| Control | Where |
|---|---|
| `requireRole` on every mutation | `src/app/(app)/actions.ts` (Operator to submit/cancel, Approver to decide), re-checked in the kit approval service |
| `withAudit` around changes | `src/lib/adjustments/service.ts`: request creation and the balance posting; approve/reject/cancel are audited by the kit approval service |
| Maker-checker | Kit approvals (`kind: "balance_adjustment"`): requester can't approve their own request; amounts over $10,000.00 need `Ledger.Admin`; the posting runs in `onApproved`, inside the approval's transaction |
| Typed adapter + mock | `CustomerAccounts` (`src/lib/adjustments/accounts.ts`) over `SqlClient`; the same adapter runs on live Postgres and on the `pg-mem` mock |
| Money safety | Integer cents, $250,000.00 cap, reason codes restricted to credit or debit, memo required; the posting is a conditional `UPDATE … WHERE status = 'active' AND balance_minor + $2 >= 0` so concurrent approvals can't overdraw; replays of the same approval return the original posting |

Tests: `npm test -w apps/adjustments` (policy and the full submit/approve flow against the mock database). Set `TEST_DATABASE_URL` to also run the kit SQL contract tests against a real Postgres (`npm test -w packages/kit`).

Screenshots of the demo flow are in [`docs/screenshots/`](docs/screenshots/).
