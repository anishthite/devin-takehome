# Architecture

Ledger is a Next.js 16 (App Router) app. Auth.js v5 runs the Microsoft Entra ID
sign-in server-side, and the UI is built from a shadcn-based component library.
This document maps each folder to its responsibility; see the
[README](README.md) for setup and the Entra app registration.

```
src/
  auth.ts           Auth.js config: provider choice, tenant/role checks, session shape
  proxy.ts          Route protection (Next.js 16 "proxy", formerly middleware)
  app/              Routes (pages, layouts, route handlers)
  components/       App-specific components (not part of the UI kit)
  ui-components/    Design system: themed shadcn primitives + ledger components
  lib/              Framework-free domain logic (roles, Entra, ledger math)
  demo/             Everything demo mode needs: mock Entra IdP, personas, sample data
tests/              node:test unit tests
```

## Request flow

1. `src/proxy.ts` runs `auth` from `src/auth.ts` on every route except
   `/signin`, `/api/auth/*`, `/demo-idp/*` and static assets. Unauthenticated
   requests are redirected to `/signin?callbackUrl=…`.
2. `/signin` starts the OIDC authorization-code flow with
   `signIn("microsoft-entra-id")` (or the demo provider in demo mode).
3. Entra redirects back to `/api/auth/callback/<provider>`, handled by
   `src/app/api/auth/[...nextauth]/route.ts`.
4. The `signIn` callback in `src/auth.ts` rejects the login unless the
   token's `tid` matches the configured tenant and it carries at least one
   `Ledger.*` app role.
5. The `jwt`/`session` callbacks store `oid`, `tid` and `roles` in an encrypted
   http-only cookie (JWT strategy, 8 h). Tokens never reach the browser.
6. Pages call `auth()` server-side to read `session.user` (`id`, `tenantId`,
   `roles`).

## `src/app/` — routes

| Path | Purpose |
|---|---|
| `layout.tsx`, `globals.css` | Root HTML shell, Geist fonts, design tokens (Tailwind v4 `@theme`). |
| `(app)/layout.tsx` | Authenticated shell: sidebar nav, header with `UserMenu`, demo banner. Redirects to `/signin` if there is no session. |
| `(app)/page.tsx` | Dashboard: balance, inflow/outflow, pending, 14-day flow chart, recent payments. |
| `signin/page.tsx` | Sign-in screen: "Sign in with Microsoft" (or demo personas), error and signed-out messages, open-redirect-safe `callbackUrl`. |
| `api/auth/[...nextauth]/route.ts` | Auth.js handlers (sign-in, callback, sign-out, session). |
| `demo-idp/*` | Thin route wrappers around the mock Entra IdP in `src/demo/idp/`. Return 404 unless demo mode is on. |

`(app)` is a route group: it shares the authenticated layout without adding a
URL segment.

## `src/components/` — app components

Composed from `ui-components` and tied to this app's data/auth.

- `user-menu.tsx` — server component; derives the role label and provides the
  `signOut` server action. `user-menu-dropdown.tsx` is its client-side menu.
- `nav-link.tsx` — sidebar link with active state (client).
- `avatar.tsx` — initials avatar.
- `microsoft-mark.tsx` — Microsoft logo SVG for the sign-in button.

## `src/ui-components/` — design system

Generic, data-agnostic UI. `components.json` points shadcn's `ui` alias here,
so `npx shadcn@latest add <name>` drops new primitives into this folder.
Import as `@/ui-components/<name>`.

- **Themed shadcn primitives**: button, card, table, dialog, dropdown-menu,
  alert, badge, inputs, tabs, tooltip, etc.
- **Ledger components**: `Amount`, `StatCard`, `StatusBadge`, `FlowChart`,
  `BalanceCard`, `TransactionList`, `PaymentCard`, `CurrencyInput`,
  `PageHeader`, `Banner`, `Logo`, and more.

Display components render as React Server Components; only interactive or
chart components are `"use client"`. Tokens, principles and the full component
list are in [`src/ui-components/DESIGN.md`](src/ui-components/DESIGN.md).

## `src/lib/` — domain logic

Plain TypeScript with no React/Next imports, so it is unit-tested directly.

| File | Purpose |
|---|---|
| `entra.ts` | `entraIssuer(tenantId)` builds the tenant-locked v2.0 issuer (rejects non-GUID aliases like `common`/`organizations`); `isFromTenant` checks the `tid` claim. |
| `roles.ts` | `Ledger.Viewer` < `Operator` < `Approver` < `Admin`. `parseRoles` (claim → known roles), `highestRole`, hierarchical `hasRole`, display labels. |
| `ledger/types.ts` | `LedgerEntry` (signed amount in minor units/cents, method, status) and summary types. |
| `ledger/summary.ts` | `summarize()` — balance, inflow/outflow and pending totals, daily buckets. Only `posted` entries affect the balance. |
| `ledger/format.ts` | `Intl` money and date formatting. |
| `utils.ts` | `cn()` class merging for shadcn. |

## `src/demo/` — demo mode

Enabled only with `DEMO_MODE=true` (`npm run dev:demo`). The goal is to mock
only Microsoft Entra; Auth.js, the OIDC client, session handling, tenant and
role checks, and the proxy run exactly as in production.

| File | Purpose |
|---|---|
| `mode.ts` | `isDemoMode()`, the fixed demo tenant ID, and a fallback `AUTH_SECRET` used only in demo mode. |
| `provider.ts` | Standard Auth.js OIDC provider pointed at the in-app mock IdP (configured via discovery). Swapped in by `src/auth.ts`. |
| `idp/handlers.ts` | Mock Entra OpenID provider: discovery, `authorize`, `token`, `userinfo`, `jwks`. Auth code + mandatory PKCE (S256), RS256 ID tokens with Entra-shaped claims (`oid`, `tid`, `roles`, `ver: "2.0"`). Stateless: codes are short-lived signed JWTs. `demoOnly()` makes routes 404 outside demo mode. |
| `idp/keys.ts` | Ephemeral per-process RSA signing key, cached on `globalThis` so dev hot reload keeps it stable. |
| `idp/config.ts` | Demo client ID/secret, callback path, and the issuer/browser URLs (`DEMO_IDP_URL`, `DEMO_PUBLIC_URL` for proxies). |
| `personas.ts` | Four demo users, one per Ledger role. |
| `sign-in-options.tsx`, `persona-button.tsx` | Persona buttons on `/signin`; each starts the OIDC flow with the persona's email as `login_hint`. |
| `banner.tsx` | "Demo mode" banner shown in the app shell. |
| `ledger.ts` | `mockLedger()` — deterministic 30-day sample ledger and opening balance. |

`src/auth.ts` refuses demo sessions outside demo mode and real sessions inside
it (via the demo tenant ID), so the two modes can't leak into each other.

> **Note:** `mockLedger()` is not demo-only. There is no ledger backend yet, so
> the dashboard renders this sample data in both modes.

## `tests/`

Run with `npm test` (`node --test` with native TypeScript stripping, Node ≥ 24).
They cover `lib/` (`entra`, `roles`, `summary`) and demo mode (`demo`:
mode flag and personas; `demo-idp`: a full authorization-code + PKCE flow
against the mock IdP plus its rejection paths).

## Tooling

- `npm run lint` (ESLint 9, `eslint-config-next`), `npm run typecheck`
  (`next typegen` + `tsc`), `npm test`, `npm run build`. CI
  (`.github/workflows/ci.yml`) runs all four on Node 24.
- `.env.example` lists `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`,
  `ENTRA_CLIENT_SECRET`, `AUTH_SECRET`.
- `AGENTS.md` / `CLAUDE.md`: agent notes. Next.js 16 differs from older
  versions; read `node_modules/next/dist/docs/`.
