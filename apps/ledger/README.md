# Ledger app

The payment ledger web app. It's a Next.js 16 app built on the
[app kit](../../packages/kit/README.md): the kit provides sign-in, roles,
approvals, audit, demo mode and the UI components, and this app adds the
pages and the ledger-specific logic.

## Pages

| Route | Who | What |
|---|---|---|
| `/` | Viewer+ | Dashboard: balance, inflow/outflow, pending payments, 14-day flow chart, recent payments |
| `/approvals` | Viewer+ (Operator to submit, Approver to decide) | Maker-checker payment approvals, plus Power Automate approvals when Dataverse is on |
| `/audit` | Approver+ | Audit trail for approval requests (kit log, plus Dataverse history when it's on) |
| `/signin`, 403 page | Everyone | From the kit |

Roles are hierarchical: `Ledger.Viewer` < `Ledger.Operator` <
`Ledger.Approver` < `Ledger.Admin`.

## Layout

```
src/
  app/(app)/      Authenticated pages (dashboard, approvals + its server actions, audit)
                  and the sidebar nav, wrapped in the kit's AppShell
  app/signin/, app/forbidden.tsx, app/api/auth/, app/demo-idp/
                  Small files that re-export kit pages and route handlers
  app/globals.css Tailwind setup that imports the kit theme
  lib/ledger/     Ledger types, summary math, formatting and sample data
  proxy.ts        Requires sign-in on every route except sign-in, auth and demo-idp
tests/            Unit tests for lib/ledger
screenshots/      UI screenshots from a demo-mode production build
AGENTS.md         Next.js agent notes (CLAUDE.md points here)
```

The dashboard uses generated sample data (`src/lib/ledger/sample-data.ts`)
because there is no ledger backend yet.

## Entra app registration

| Setting | Value |
|---|---|
| Supported account types | Single tenant |
| Platform | Web |
| Redirect URI | `http://localhost:3000/api/auth/callback/microsoft-entra-id` (add `https://<host>/api/auth/callback/microsoft-entra-id` for each deployment) |
| App roles | `Ledger.Viewer`, `Ledger.Operator`, `Ledger.Approver`, `Ledger.Admin` |
| Enterprise app → Assignment required | Yes |

Assign users or groups to roles under **Enterprise applications → (app) →
Users and groups**.

## Configuration

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
|---|---|
| `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` | The app registration above |
| `AUTH_SECRET` | Session encryption key (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | `true` in production unless on Vercel or `AUTH_URL` is set (not needed for `npm run dev`) |
| `DEMO_MODE` | `true` for mock Entra (never in production) |
| `DATAVERSE_*` | Optional Dataverse integration, see the [kit README](../../packages/kit/README.md#dataverse-optional) |

## Scripts

Run from the repo root (`npm run dev`, `npm run dev:demo`, ...) or from this
folder. `npm test` runs `node --test` on `tests/`.

## Deployment

See [DEPLOYMENT.md](../../DEPLOYMENT.md). In short: one Next.js server per
app, a single instance for now, because approvals and the audit log are
kept in memory.
