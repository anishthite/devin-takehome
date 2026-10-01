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

UI is built from the shadcn-based component library in `src/ui-components/` (design notes in `src/ui-components/DESIGN.md`). Import from `@/ui-components/<name>`; add more primitives with `npx shadcn@latest add <name>`.

The dashboard currently renders deterministic sample data (`src/demo/ledger.ts`) until the real ledger backend is connected.

## Demo mode (no Entra)

```bash
npm install
npm run dev:demo             # DEMO_MODE=true, no env vars needed
```

Everything demo-specific lives in `src/demo/`. With `DEMO_MODE=true` the Entra provider is swapped for a standard Auth.js OIDC provider pointed at a mock Entra IdP served by the app itself under `/demo-idp` (discovery, `authorize`, `token`, `userinfo`, `jwks`). Sign-in is a real authorization-code + PKCE (S256) flow with `state` and `nonce`; the IdP issues RS256 ID tokens with Entra-shaped claims (`oid`, `tid`, `roles`, `preferred_username`, `ver: "2.0"`) for one of four personas (one per Ledger role), so the same tenant, role, proxy and session checks run as in production. Picking a persona on `/signin` sends it as `login_hint`; without one the IdP shows its own account picker. The `/demo-idp` routes 404 when demo mode is off, demo sessions carry the demo tenant ID and are rejected outside demo mode, and demo mode falls back to a fixed `AUTH_SECRET` only if none is set — never enable it in production.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEMO_IDP_URL` | `http://localhost:$PORT` | Origin the server uses to reach the mock IdP (discovery/token). |
| `DEMO_PUBLIC_URL` | `DEMO_IDP_URL` | Origin the browser uses for `authorize`, if different (e.g. behind a proxy). |
