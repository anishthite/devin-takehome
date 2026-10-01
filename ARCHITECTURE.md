# Architecture

Ledger is a Next.js 16 app for viewing payment activity and running
maker-checker payment approvals. Users sign in with their company's Microsoft
Entra ID account, and what they can do depends on their Ledger role. It can
optionally connect to Microsoft Dataverse for roles, auditing and approvals.
See the [README](README.md) for setup.

## Main pieces

```
src/
  app/            Pages and routes
  auth.ts         Sign-in configuration
  proxy.ts        Route protection
  lib/kit/        App services: roles, approvals, audit (pluggable)
  lib/dataverse/  Optional Dataverse adapters for those services
  lib/            Other business logic (roles, tenant checks, ledger math)
  ui-components/  Design system
  components/     App-specific UI built from the design system
  demo/           Mocks: Entra, Dataverse, sample data, in-memory stores
tests/            Unit tests
```

- **Pages (`src/app`)**: sign-in, plus an authenticated app shell with three
  pages: Dashboard, Approvals and Audit (Audit is for Approvers and above).
  Users without a role get a 403 page.
- **Authentication (`auth.ts`, `proxy.ts`)**: Auth.js handles the Entra
  sign-in on the server. Every page except sign-in requires a session.
- **App services (`src/lib/kit`)**: the core of the app. Each service is an
  interface: who the user is and which roles they have (`requireRole`), the
  approval workflow, and the audit log. `services.ts` chooses the
  implementation behind each one at startup.
- **Dataverse adapters (`src/lib/dataverse`)**: optional implementations of
  those services backed by the Dataverse Web API.
- **Business logic (`src/lib`)**: plain TypeScript with no UI code, so it's
  easy to test. Covers the role hierarchy, tenant validation and ledger
  calculations.
- **Design system (`src/ui-components`)**: shadcn-based components themed for
  Ledger, plus finance-specific pieces (amounts, stat cards, charts,
  transaction lists). Details are in
  [`DESIGN.md`](src/ui-components/DESIGN.md).
- **Demo mode (`src/demo`)**: lets the app run without real Microsoft
  services (see below).

## How sign-in works

1. A signed-out user is redirected to `/signin` and clicks "Sign in with
   Microsoft".
2. The server runs a standard OpenID Connect login with the company's Entra
   tenant.
3. The login is accepted only if the user belongs to that tenant and, unless
   Dataverse is enabled, has at least one Ledger role.
4. The user's ID, tenant and roles are stored in an encrypted cookie. Tokens
   never reach the browser.

Roles are hierarchical: `Viewer` < `Operator` < `Approver` < `Admin`.

## Approvals and audit

- **Approvals**: maker-checker. An Operator submits a payment; a *different*
  Approver approves or rejects it; the requester can cancel. The app's own
  approval store is the source of truth.
- **Audit**: every approval action is written to the app's audit log. The
  Audit page shows it, merged with Dataverse change history when Dataverse is
  on.

## Dataverse (optional)

Off by default; turn it on with `DATAVERSE_ENABLED=true`. When it's on:

- **Roles** come from the user's Dataverse security roles instead of Entra
  app roles. They are looked up once per session.
- **Writes** go through an application user that acts on behalf of the
  signed-in user, so Dataverse records who made each change.
- **Approval status** is copied to an app-owned Dataverse table.
- **Existing Power Automate approvals** are shown on the Approvals page,
  read-only.

`services.ts` runs in one of three modes: `off`, `live` (a real Dataverse
environment) or `mock` (an in-memory Dataverse when demo mode is also on).

## Demo mode

Setting `DEMO_MODE=true` replaces the Microsoft services with in-app mocks:

- **Entra**: a small mock Entra server and four demo users, one per role.
- **Dataverse** (only with `DATAVERSE_ENABLED=true`): an in-memory Dataverse
  organization that answers the same Web API calls.

Everything else (Auth.js, sessions, tenant and role checks, route protection,
the approval and audit services, and the Dataverse adapters) runs the same
code as in production. Demo mode also seeds a couple of sample approvals.

## Data and storage

There is no database or ledger backend yet. In **both** demo and real mode:

- the dashboard shows generated sample payments (`src/demo/ledger.ts`)
- the approval store and audit log are kept in memory and reset on restart
  (`src/demo/approvals.ts`, `src/demo/audit-log.ts`)

## Quality checks

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build`, all run in
CI. Tests cover the business logic, the app services, the Dataverse adapters
(against the mock organization) and the full demo sign-in flow.
