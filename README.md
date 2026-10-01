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

The dashboard currently renders deterministic sample data (`src/demo/ledger.ts`) until the real ledger backend is connected.

## Demo mode (no Entra)

```bash
npm install
npm run dev:demo             # DEMO_MODE=true, no env vars needed
```

Everything demo-specific lives in `src/demo/`. With `DEMO_MODE=true` the Entra provider is replaced by an Auth.js credentials provider that signs you in as one of four mock personas (one per Ledger role), so the full proxy/session/role pipeline still runs. A banner marks every page as demo. Demo sessions carry `tenantId: "demo-tenant"` and are rejected when demo mode is off, and demo mode falls back to a fixed `AUTH_SECRET` only if none is set — never enable it in production.

## Dataverse (optional)

Off by default; set `DATAVERSE_ENABLED=true` to switch the kit services in `src/lib/kit/services.ts` to the Dataverse adapters in `src/lib/dataverse/`. With `DEMO_MODE=true` as well (`npm run dev:demo:dataverse`) they run against an in-memory mock org (`src/demo/dataverse/`) that answers the same Web API calls with Microsoft-shaped payloads, so no Entra or Dataverse credentials are needed.

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

