# Refunds

Demo refunds dashboard built on the kit (`packages/kit`): Entra sign-in, hierarchical app roles, maker-checker approvals and the kit `audit_log`. Runs on port 3001 so it can sit next to Ledger.

```bash
npm install
npm run dev:refunds:demo              # http://localhost:3001, mock Entra IdP + demo personas
npm run dev:refunds:demo:dataverse    # same, with the mock Dataverse org (roles, audit history, approval mirror)
npm run dev:refunds                   # real Entra; cp apps/refunds/.env.example apps/refunds/.env.local first
```

For real Entra, register the redirect URI `http://localhost:3001/api/auth/callback/microsoft-entra-id` on the app registration and assign the same `Ledger.*` app roles.

## Pages

| Route | Min role | What |
|---|---|---|
| `/` | Viewer | Issued / pending / awaiting-payout totals, approval rate, 14-day volume, top reasons, your queue and your permissions |
| `/refunds` | Viewer | All refunds, filter by status, search by order / customer / email |
| `/refunds/new` | Operator | Request a refund; it goes to an approver before any money moves |
| `/refunds/[id]` | Viewer | Details, approve / reject / withdraw / issue (role-gated), audit trail (Approver+) |
| `/audit` | Approver | Every refund request, decision, payout and export from `audit_log` |
| `/audit/export` | Admin | CSV download of the audit log (the export itself is audited) |

## Rules

- Operators request and issue refunds; Approvers approve or reject; refunds over $2,500 need an Admin to approve (Approvers can still reject). Roles are hierarchical.
- Every refund opens a kit approval request, so the kit's maker-checker applies: the requester can't decide their own refund, and only the requester can withdraw it while pending.
- Max $50,000 per refund; one open (pending or approved) refund per order.
- Request, decision, withdrawal, payout and export each write `audit_log` entries. With Dataverse on, the refund page merges in the mirrored approval's `RetrieveRecordChangeHistory`.
- History older than the session is deterministic sample data (`src/lib/refunds/sample-data.ts`) and is read-only; refunds live in memory (`src/lib/refunds/store.ts`) until a backend is connected.

Screenshots of the app running in demo mode are in [`docs/screenshots/`](docs/screenshots/).
