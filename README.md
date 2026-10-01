# Payment Ledger

Internal payment ledger with Microsoft Entra ID sign-in and maker-checker
approvals, built on Next.js 16 and Auth.js v5.

The repo is an npm workspaces monorepo:

| Path | What |
|---|---|
| [`apps/ledger/`](apps/ledger/README.md) | The Ledger app: pages, ledger logic, Next.js config and `.env`. |
| [`packages/kit/`](packages/kit/README.md) | The app kit (`@kit/*`): auth, roles, services, Dataverse adapters, demo mode and the UI library. Shared by every app. |
| [`apps/refunds/`](apps/refunds/README.md) | Refunds dashboard on port 3001: request → maker-checker approval → payout, with RBAC and an audit log. |

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together and
[DEPLOYMENT.md](DEPLOYMENT.md) for how each app is hosted.

## Quick start

Requires Node 24+. Run everything from the repo root; the root scripts
delegate to the workspaces.

```bash
npm install
npm run dev:demo             # no Entra needed: mock sign-in + sample data
```

To use a real Entra tenant, set up the app registration described in the
[Ledger README](apps/ledger/README.md#entra-app-registration), then:

```bash
cp apps/ledger/.env.example apps/ledger/.env.local   # fill in Entra values + AUTH_SECRET
npm run dev                                          # http://localhost:3000
```

| Script | What |
|---|---|
| `npm run dev` | Ledger against real Entra |
| `npm run dev:demo` | Ledger in demo mode (mock Entra) |
| `npm run dev:demo:dataverse` | Demo mode with the in-memory mock Dataverse |
| `npm run dev:refunds` / `dev:refunds:demo` / `dev:refunds:demo:dataverse` | The same three modes for Refunds, on http://localhost:3001 |
| `npm run build` | Production build of both apps |
| `npm start` | Production server for Ledger |
| `npm run lint` / `npm run typecheck` / `npm test` | Checks across all workspaces (all run in CI) |

## Adding an app

Create `apps/<name>/`, depend on `"kit"`, and add the small set of files the
kit needs (proxy, auth route, sign-in page, layout). The full list is in
[Wiring an app](packages/kit/README.md#wiring-an-app).
