# Internal apps on the kit

Internal business apps that share one foundation, the **app kit**. The kit
covers Microsoft Entra ID sign-in, hierarchical roles, maker-checker
approvals, the audit log, a zero-config demo mode and optional Dataverse.
Apps can also store their data in an external PostgreSQL database through
the kit's SQL connector. Everything is built on Next.js 16 and Auth.js v5.

The repo is an npm workspaces monorepo:

| Path | What |
|---|---|
| [`apps/ledger/`](apps/ledger/README.md) | Ledger (port 3000): payment ledger with maker-checker payment approvals. |
| [`apps/refunds/`](apps/refunds/README.md) | Refunds (port 3001): request → maker-checker approval → issue customer refunds, with RBAC and an audit log. |
| [`apps/adjustments/`](apps/adjustments/README.md) | Adjustments (port 3002): customer balance adjustments through maker-checker, stored in an external PostgreSQL database. |
| [`packages/kit/`](packages/kit/README.md) | The app kit (`@kit/*`): auth, roles, services, Dataverse adapters, SQL connector, demo mode and the UI library. Shared by every app. |
| [`.agents/skills/`](.agents/skills) | Agent skills for working in this repo (see [Skills](#skills)). |

## Docs

| Doc | What |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the apps and the kit fit together, the sign-in flow, run modes |
| [DEPLOYMENT.md](DEPLOYMENT.md) | How each app is hosted, per-app config, current limits |
| [Ledger README](apps/ledger/README.md) | Ledger pages, Entra app registration, env vars |
| [Refunds README](apps/refunds/README.md) | Refunds pages and roles, refund rules, Entra setup |
| [Adjustments README](apps/adjustments/README.md) | Adjustment rules, PostgreSQL setup and migrations, health check |
| [Kit README](packages/kit/README.md) | Kit folders, wiring an app, app branding, demo mode, Dataverse, SQL connector |
| [Design system](packages/kit/ui/DESIGN.md) | UI tokens, principles and components |
| [Ledger screenshots](apps/ledger/screenshots/README.md) | Ledger in demo mode |
| [Refunds screenshots](apps/refunds/docs/screenshots/README.md) | Refunds walked through by all four demo personas |
| [Adjustments screenshots](apps/adjustments/docs/screenshots/README.md) | Adjustments in demo mode and against a live PostgreSQL database |

## Quick start

Requires Node 24+. Run everything from the repo root; the root scripts
delegate to the workspaces.

```bash
npm install
npm run dev:demo             # Ledger, http://localhost:3000: mock sign-in + sample data
npm run dev:refunds:demo     # Refunds, http://localhost:3001
npm run dev:adjustments:demo # Adjustments, http://localhost:3002: in-memory Postgres (pg-mem)
```

Demo mode needs no Entra tenant. Pick one of the four personas (Admin,
Approver, Operator, Viewer) on the sign-in page.

To use a real Entra tenant, set up the app registration described in the
[Ledger README](apps/ledger/README.md#entra-app-registration) (use port 3001
in the redirect URI for Refunds, 3002 for Adjustments), then:

```bash
cp apps/ledger/.env.example apps/ledger/.env.local   # fill in Entra values + AUTH_SECRET
npm run dev                                          # http://localhost:3000
```

| Script | What |
|---|---|
| `npm run dev` | Ledger against real Entra |
| `npm run dev:demo` | Ledger in demo mode (mock Entra) |
| `npm run dev:demo:dataverse` | Ledger in demo mode with the in-memory mock Dataverse |
| `npm run dev:refunds` / `dev:refunds:demo` / `dev:refunds:demo:dataverse` | The same three modes for Refunds |
| `npm run dev:adjustments` / `dev:adjustments:demo` | Adjustments against real Entra + `DATABASE_URL`, or in demo mode |
| `npm run db:migrate [-- --seed]` | Apply the Adjustments and kit SQL schema to `DATABASE_URL` |
| `npm run build` | Production build of every app |
| `npm start` | Production server for Ledger (`npm run start -w apps/refunds` for Refunds) |
| `npm run lint` / `npm run typecheck` / `npm test` | Checks across all workspaces (all run in CI) |

## Adding an app

Create `apps/<name>/`, depend on `"kit"`, and add the small set of files the
kit needs (proxy, auth route, sign-in page, layout). The full list is in
[Wiring an app](packages/kit/README.md#wiring-an-app). The
[`new-kit-app`](.agents/skills/new-kit-app/SKILL.md) skill walks through every
step, using `apps/refunds` as the template.

## Skills

Agent skills live in [`.agents/skills/`](.agents/skills). Each one is a
`SKILL.md` that coding agents (Devin and others) pick up when they work in
this repo.

| Skill | Use it to |
|---|---|
| [`new-kit-app`](.agents/skills/new-kit-app/SKILL.md) | Scaffold a new app on the kit and wire it into the monorepo: domain service, approvals, audit, pages, tests, scripts, docs |
| [`kit-app-demo-testing`](.agents/skills/kit-app-demo-testing/SKILL.md) | Run any app in demo mode, test every persona in the browser, and save screenshot evidence |
