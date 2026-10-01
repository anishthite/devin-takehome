# Ledger screenshots

Captured on 2026-10-01 from a production build (`npm run build`, then `next start` with `DEMO_MODE=true DATAVERSE_ENABLED=true AUTH_TRUST_HOST=true`) at 1440×900, after `npm run lint`, `npm run typecheck` and `npm test` passed. Sign-in goes through the demo OIDC flow (mock Entra IdP + in-memory mock Dataverse org).

| File | What it shows |
|---|---|
| `01-signin.png` | `/signin` in demo mode with the four personas |
| `02-dashboard-admin.png` | Dashboard as Avery Admin (Ledger.Admin) |
| `03-approvals-admin.png` | `/approvals`: maker-checker requests mirrored to Dataverse, plus read-only Power Automate approvals |
| `04-audit-admin.png` | `/audit`: kit `audit_log` merged with Dataverse change history |
| `05-dashboard-viewer.png` | Dashboard as Riley Viewer (Ledger.Viewer); Audit is hidden from the nav |
| `06-audit-viewer.png` | `/audit` as Viewer: 403 "You don't have access to this page" |
| `07-demo-idp-login.png` | Mock Entra IdP account picker at `/demo-idp/login` |
