# App kit

Reusable foundation for internal Next.js 16 apps: Microsoft Entra ID sign-in, hierarchical app roles, kit services (roles, maker-checker approvals, audit), optional Dataverse adapters, a zero-config demo mode and the shadcn-based UI library. The Ledger app in `apps/ledger/` is built on it.

It's the `kit` npm workspace. Apps depend on `"kit"` and import it through the `@kit/*` path alias (`"@kit/*": ["../../packages/kit/*"]` in the app's `tsconfig.json`), so Next.js compiles the kit's TypeScript as source. Inside the kit the same alias maps to `./*`. Files covered by `node --test` use relative `.ts` imports so they run without a bundler.

| Folder | What |
|---|---|
| `auth/` | Auth.js config (`@kit/auth`: `auth`, `signIn`, `signOut`, `handlers`), Entra tenant checks, roles, sign-in and 403 pages |
| `services/` | `currentActor()` / `requireRole()`, `RoleProvider`, approvals, `AuditLog` / `AuditReader`, and `getKitServices()` which picks implementations from env |
| `dataverse/` | Dataverse Web API client and adapters for the kit services |
| `demo/` | `DEMO_MODE`: mock Entra IdP, personas, in-memory mock Dataverse org, in-memory stores, demo sign-in UI |
| `ui/` | Design system components, `theme.css` tokens and [`DESIGN.md`](ui/DESIGN.md) |
| `components/` | App chrome built from `ui/`: `AppShell`, `NavLink`, `UserMenu`, avatars |
| `lib/` | `cn()` and other shared helpers |
| `tests/` | Unit tests for the kit (`npm test`) |

## Wiring an app

Next.js only discovers routes, the proxy and global CSS inside the app, so the app keeps thin files that point at the kit (paths relative to `apps/<app>/`):

| App file | Contents |
|---|---|
| `src/proxy.ts` | `export { auth as proxy } from "@kit/auth"` plus the route `matcher` |
| `src/app/api/auth/[...nextauth]/route.ts` | `export const { GET, POST } = handlers` |
| `src/app/signin/page.tsx`, `src/app/forbidden.tsx` | Re-export `@kit/auth/sign-in-page` / `@kit/auth/forbidden-page` |
| `src/app/demo-idp/**` | Route handlers from `@kit/demo/idp/handlers` and the `@kit/demo/idp/login-page` account picker |
| `src/app/globals.css` | Imports `tailwindcss`, `tw-animate-css` and `packages/kit/ui/theme.css`, with `@source` pointing at `packages/kit` |
| `src/app/(app)/layout.tsx` | `<AppShell nav={…}>` with the app's own navigation |

Pages then use `requireRole()` / `currentActor()` from `@kit/services/authz`, `getKitServices()` for approvals and audit, and components from `@kit/ui`.

Still Ledger-specific: role names (`Ledger.*`), the `Logo` wordmark and the sign-in page copy.

## Roles

Roles are hierarchical: `Ledger.Viewer` < `Ledger.Operator` <
`Ledger.Approver` < `Ledger.Admin`; holding a role grants every lower one.
By default they come from the Entra app-role claims in the ID token, and
sign-in is rejected for users outside the tenant or without a role. With
Dataverse enabled they come from Dataverse security roles instead (see below).

## Demo mode

`DEMO_MODE=true` (`npm run dev:demo`) runs an app with no Entra tenant and no
env vars. Only Microsoft's services are mocked; everything else runs the
production code.

- **Mock Entra**: the app serves its own OpenID Connect provider under
  `/demo-idp` (discovery, `authorize`, `token`, `userinfo`, `jwks`). Sign-in
  is a real authorization-code + PKCE (S256) flow with `state` and `nonce`,
  and the provider issues RS256 ID tokens with Entra-shaped claims (`oid`,
  `tid`, `roles`, `preferred_username`, `ver: "2.0"`).
- **Personas**: four demo users, one per role. Picking one on `/signin` sends
  it as `login_hint`; without one the provider shows its own account picker.
- **Mock Dataverse** (only with `DATAVERSE_ENABLED=true`): see below.
- **Safety**: the `/demo-idp` routes return 404 when demo mode is off, demo
  sessions carry a demo tenant ID and are rejected outside demo mode, and a
  fixed `AUTH_SECRET` is used only if none is set. Never enable demo mode in
  production.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEMO_IDP_URL` | `http://localhost:$PORT` | Origin the server uses to reach the mock provider (discovery/token). |
| `DEMO_PUBLIC_URL` | `DEMO_IDP_URL` | Origin the browser uses for `authorize`, if different (e.g. behind a proxy). |

## Dataverse (optional)

Off by default. `DATAVERSE_ENABLED=true` makes `getKitServices()` use the
adapters in `dataverse/`. With `DEMO_MODE=true` as well
(`npm run dev:demo:dataverse`) they run against an in-memory mock
organization (`demo/dataverse/`) that answers the same Web API calls with
Microsoft-shaped payloads, so no credentials are needed.

| Kit interface | Default | Dataverse adapter |
|---|---|---|
| `RoleProvider` / `requireRole()` | Entra app-role claims | `RetrieveAadUserRoles(DirectoryObjectId=<oid>)`, mapped by role template ID then role name, cached per session |
| `DataverseClient` | none | Web API v9.2 with OAuth client credentials (`<DATAVERSE_URL>/.default`) as an application user; every write sends `CallerObjectId: <oid>` |
| `AuditReader` | kit `audit_log` only | `RetrieveRecordChangeHistory(Target, PagingInfo)` merged with `audit_log` on `/audit`, labeled by source |
| Approvals | kit maker-checker (source of truth) | Status mirrored to the app-owned table `<DATAVERSE_MIRROR_PREFIX>ledgerapproval`; `msdyn_flow_approval` / `msdyn_flow_approvalresponse` are read for display only, and the client refuses writes to them |

Setup for a real environment:

1. Create an application user for the app registration. Give it a security
   role that can read `role`, `audit` and `msdyn_flow_approval*`, write the
   mirror table, and has the **Act on Behalf of Another User** privilege
   (needed for `CallerObjectId`).
2. Turn on auditing for the environment and the mirror table.
3. Create the mirror table with text columns `<prefix>name`,
   `<prefix>kitrequestid`, `<prefix>counterparty`, `<prefix>status`,
   `<prefix>comment` and a decimal `<prefix>amount`.
4. Give users Dataverse security roles named `Ledger Viewer` /
   `Ledger Operator` / `Ledger Approver` / `Ledger Admin` (directly or via
   teams), or map your own with `DATAVERSE_ROLE_TEMPLATE_IDS` /
   `DATAVERSE_ROLE_NAMES`.

Connection settings are `DATAVERSE_URL` plus `DATAVERSE_TENANT_ID` /
`DATAVERSE_CLIENT_ID` / `DATAVERSE_CLIENT_SECRET` (these default to the
`ENTRA_*` values). See the app's `.env.example` for all variables.

With Dataverse enabled, sign-in no longer requires an Entra app role; users
without a mapped Dataverse role get a 403.

## Storage

There is no database yet. The approval store and `audit_log`
(`demo/approvals.ts`, `demo/audit-log.ts`) are in memory in every mode, so
they reset when the server restarts. See
[DEPLOYMENT.md](../../DEPLOYMENT.md#in-memory-state) for what that means for
hosting.
