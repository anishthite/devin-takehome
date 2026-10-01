# Architecture

This repo holds internal business apps that share one foundation, the **app
kit**. Today there is one app, **Ledger**: a payment ledger with
maker-checker approvals. Users sign in with their company's Microsoft Entra
ID account, and what they can do depends on their role. Apps can optionally
connect to Microsoft Dataverse for roles, auditing and approvals.

```
apps/
  ledger/         The Ledger app: pages and ledger-specific logic
packages/
  kit/            Shared foundation: auth, roles, services, Dataverse, demo mode, UI
```

The [README](README.md) covers setup, and each workspace has its own README:
[Ledger](apps/ledger/README.md), [kit](packages/kit/README.md).

## Apps vs. the kit

The kit holds everything that isn't specific to one app; each app only adds
its own pages and domain logic.

| | Kit (`packages/kit`) | App (`apps/ledger`) |
|---|---|---|
| Sign-in | Auth.js + Entra config, sign-in and 403 pages | Small files that point Next.js at the kit |
| Roles and access | Role hierarchy, `requireRole()` | Decides which pages need which role |
| Business services | Approvals, audit log, Dataverse adapters | Uses them in its pages |
| UI | Design system and the app shell (sidebar, header, user menu) | Its own navigation and pages |
| Demo mode | Mock Entra, mock Dataverse, demo users | Nothing extra |
| Domain logic | None | Ledger types, summary math, sample data |

Apps import the kit as `@kit/*`, and Next.js compiles it from source, so
there is no separate build step for the kit. Next.js only finds routes and
middleware inside the app, which is why the app keeps those small pass-through
files.

## Kit services

The kit's core is a set of services, each defined as an interface:

- **Roles**: who the user is and which roles they have.
- **Approvals**: maker-checker. An Operator submits a payment, a *different*
  Approver decides, and the requester can cancel. The kit's own store is the
  source of truth.
- **Audit**: every approval action goes to the kit's audit log. With
  Dataverse on, the audit view also shows Dataverse change history.

`getKitServices()` picks the implementation behind each service from env
vars, so pages never need to know whether Dataverse or demo mode is on.

## How sign-in works

1. A signed-out user is redirected to `/signin` and clicks "Sign in with
   Microsoft".
2. The server runs a standard OpenID Connect login with the company's Entra
   tenant.
3. The login is accepted only if the user belongs to that tenant and, unless
   Dataverse is enabled, has at least one role.
4. The user's ID, tenant and roles are stored in an encrypted cookie. Tokens
   never reach the browser.

Roles are hierarchical: `Viewer` < `Operator` < `Approver` < `Admin`.

## Run modes

Two env vars choose what the app talks to:

| | `DATAVERSE_ENABLED` off | `DATAVERSE_ENABLED=true` |
|---|---|---|
| **Normal** | Real Entra; roles from Entra app roles | Real Entra + real Dataverse; roles from Dataverse security roles |
| **`DEMO_MODE=true`** | Mock Entra | Mock Entra + in-memory mock Dataverse |

Demo mode mocks only the Microsoft services. Sign-in, sessions, tenant and
role checks, route protection, the kit services and the Dataverse adapters
all run the same code in every mode.

## Data and storage

There is no database or ledger backend yet. In every mode, the dashboard
shows generated sample payments, and the approval store and audit log are
kept in memory, so they reset on restart.

## Quality checks

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` run
across both workspaces in CI. Kit tests cover auth, roles, the services, the
Dataverse adapters (against the mock organization) and the full demo sign-in
flow. Ledger tests cover the ledger math.
