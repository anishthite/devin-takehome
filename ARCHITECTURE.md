# Architecture

Ledger is a Next.js 16 app for viewing payment activity. Users sign in with
their company's Microsoft Entra ID account, and what they can do is
determined by Entra app roles. See the [README](README.md) for setup.

## Main pieces

```
src/
  app/            Pages and routes
  auth.ts         Sign-in configuration
  proxy.ts        Route protection
  lib/            Business logic (roles, tenant checks, ledger math)
  ui-components/  Design system
  components/     App-specific UI built from the design system
  demo/           Demo mode: a stand-in for Microsoft Entra
tests/            Unit tests
```

- **Pages (`src/app`)**: the sign-in page and an authenticated app shell
  (sidebar, header, user menu) that currently contains the dashboard.
- **Authentication (`auth.ts`, `proxy.ts`)**: Auth.js handles the Entra
  sign-in on the server. Every page except sign-in requires a session.
- **Business logic (`src/lib`)**: plain TypeScript with no UI code, so it's
  easy to test. Covers the role hierarchy, tenant validation and ledger
  calculations.
- **Design system (`src/ui-components`)**: shadcn-based components themed for
  Ledger, plus finance-specific pieces (amounts, stat cards, charts,
  transaction lists). Details are in
  [`DESIGN.md`](src/ui-components/DESIGN.md).
- **Demo mode (`src/demo`)**: lets the app run without a real Entra tenant
  (see below).

## How sign-in works

1. A signed-out user is redirected to `/signin` and clicks "Sign in with
   Microsoft".
2. The server runs a standard OpenID Connect login with the company's Entra
   tenant.
3. The login is accepted only if the user belongs to that tenant and has at
   least one Ledger role (`Viewer` < `Operator` < `Approver` < `Admin`).
4. The user's ID, tenant and roles are stored in an encrypted cookie. Tokens
   never reach the browser.

## Demo mode

Setting `DEMO_MODE=true` replaces Microsoft Entra with a small mock Entra
server built into the app, plus four demo users (one per role). Only the
Entra part is mocked: sign-in, sessions, tenant and role checks, and route
protection all run the same code as in production. The mock routes are
disabled when demo mode is off.

## Data

There is no ledger backend yet. The dashboard shows generated sample data
(`src/demo/ledger.ts`) in **both** demo and real mode, until a real data
source is connected.

## Quality checks

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build`, all run in
CI. Tests cover the business logic and the full demo sign-in flow.
