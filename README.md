# Payment Ledger

Payment ledger web app with Microsoft Entra ID sign-in (Next.js 16 + Auth.js v5).

## How auth works

- Single-tenant OIDC authorization-code flow against `https://login.microsoftonline.com/<ENTRA_TENANT_ID>/v2.0`, run server-side (BFF). Tokens never reach the browser; the session is an encrypted http-only cookie.
- `src/proxy.ts` protects every route except `/signin` and `/api/auth/*`.
- Sign-in is rejected unless the token's `tid` matches `ENTRA_TENANT_ID` **and** the user holds at least one Ledger app role.
- The session exposes `user.id` (Entra `oid`), `user.tenantId` and `user.roles`.

App roles (hierarchical, highest wins): `Ledger.Viewer` < `Ledger.Operator` < `Ledger.Approver` < `Ledger.Admin`.

## Entra app registration

| Setting | Value |
|---|---|
| Supported account types | Single tenant |
| Platform | Web |
| Redirect URI | `http://localhost:3000/api/auth/callback/microsoft-entra-id` |
| App roles | `Ledger.Viewer`, `Ledger.Operator`, `Ledger.Approver`, `Ledger.Admin` |
| Enterprise app → Assignment required | Yes |

Assign users/groups to roles under **Enterprise applications → (app) → Users and groups**.

## Local development

```bash
cp .env.example .env.local   # fill in Entra values + AUTH_SECRET
npm install
npm run dev                  # http://localhost:3000
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

Everything reusable lives in the app kit, [`kit/`](kit/README.md) (imported as `@kit/*`): auth, roles, kit services, Dataverse adapters, demo mode and the UI library. `src/` holds only the Ledger app itself.

UI is built from the shadcn-based component library in `kit/ui/` (design notes in `kit/ui/DESIGN.md`). Import from `@kit/ui/<name>`; add more primitives with `npx shadcn@latest add <name>`.

The dashboard currently renders deterministic sample data (`src/lib/ledger/sample-data.ts`) until the real ledger backend is connected.

## Demo mode (no Entra)

```bash
npm install
npm run dev:demo             # DEMO_MODE=true, no env vars needed
```

Everything demo-specific lives in `kit/demo/`. With `DEMO_MODE=true` the Entra provider is swapped for a standard Auth.js OIDC provider pointed at a mock Entra IdP served by the app itself under `/demo-idp` (discovery, `authorize`, `token`, `userinfo`, `jwks`). Sign-in is a real authorization-code + PKCE (S256) flow with `state` and `nonce`; the IdP issues RS256 ID tokens with Entra-shaped claims (`oid`, `tid`, `roles`, `preferred_username`, `ver: "2.0"`) for one of four personas (one per Ledger role), so the same tenant, role, proxy and session checks run as in production. Picking a persona on `/signin` sends it as `login_hint`; without one the IdP shows its own account picker. The `/demo-idp` routes 404 when demo mode is off, demo sessions carry the demo tenant ID and are rejected outside demo mode, and demo mode falls back to a fixed `AUTH_SECRET` only if none is set — never enable it in production.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEMO_IDP_URL` | `http://localhost:$PORT` | Origin the server uses to reach the mock IdP (discovery/token). |
| `DEMO_PUBLIC_URL` | `DEMO_IDP_URL` | Origin the browser uses for `authorize`, if different (e.g. behind a proxy). |

## Dataverse (optional)

Off by default; set `DATAVERSE_ENABLED=true` to switch the kit services in `kit/services/services.ts` to the Dataverse adapters in `kit/dataverse/`. With `DEMO_MODE=true` as well (`npm run dev:demo:dataverse`) they run against an in-memory mock org (`kit/demo/dataverse/`) that answers the same Web API calls with Microsoft-shaped payloads, so no Entra or Dataverse credentials are needed.

| Kit interface | Default | Dataverse adapter |
|---|---|---|
| `RoleProvider` / `requireRole()` | Entra app-role claims | `RetrieveAadUserRoles(DirectoryObjectId=<oid>)`, mapped by role template id then role name, cached per session |
| `DataverseClient` | — | Web API v9.2, OAuth client credentials (`<DATAVERSE_URL>/.default`) as an application user; every write sends `CallerObjectId: <oid>` |
| `AuditReader` | kit `audit_log` only | `RetrieveRecordChangeHistory(Target, PagingInfo)` merged with `audit_log` on `/audit`, labeled by source |
| Approvals | kit maker-checker (source of truth) | Status mirrored to the app-owned table `<DATAVERSE_MIRROR_PREFIX>ledgerapproval`; `msdyn_flow_approval` / `msdyn_flow_approvalresponse` are read for display only and the client refuses writes to them |

Dataverse setup for `live` mode:

1. Create an application user for the app registration and give it a security role that can read `role`/`audit`/`msdyn_flow_approval*`, write the mirror table, and has the **Act on Behalf of Another User** privilege (needed for `CallerObjectId`).
2. Turn on auditing for the environment and the mirror table.
3. Create the mirror table with text columns `<prefix>name`, `<prefix>kitrequestid`, `<prefix>counterparty`, `<prefix>status`, `<prefix>comment` and a decimal `<prefix>amount`.
4. Give users Dataverse security roles named `Ledger Viewer` / `Ledger Operator` / `Ledger Approver` / `Ledger Admin` (directly or via teams), or map your own with `DATAVERSE_ROLE_TEMPLATE_IDS` / `DATAVERSE_ROLE_NAMES`.

With Dataverse enabled, sign-in no longer requires an Entra app role; users without a mapped Dataverse role get a 403. The kit `audit_log` and approval store are in memory until the kit has a database.

