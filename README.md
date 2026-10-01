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

UI is built from the shadcn-based component library in `src/ui-components/` (design notes in `src/ui-components/DESIGN.md`); every component is rendered at `/ui-kit`.

The dashboard currently renders deterministic sample data (`src/demo/ledger.ts`) until the real ledger backend is connected.

## Demo mode (no Entra)

```bash
npm install
npm run dev:demo             # DEMO_MODE=true, no env vars needed
```

Everything demo-specific lives in `src/demo/`. With `DEMO_MODE=true` the Entra provider is replaced by an Auth.js credentials provider that signs you in as one of four mock personas (one per Ledger role), so the full proxy/session/role pipeline still runs. A banner marks every page as demo. Demo sessions carry `tenantId: "demo-tenant"` and are rejected when demo mode is off, and demo mode falls back to a fixed `AUTH_SECRET` only if none is set — never enable it in production.
