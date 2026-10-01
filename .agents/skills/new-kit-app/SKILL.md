---
name: new-kit-app
description: Scaffold a new Next.js app under apps/<name> on the shared kit (Entra auth, RBAC, maker-checker approvals, audit log, demo mode) and wire it into the monorepo.
---

# New app on the kit

Use this skill to add a business app (for example `apps/refunds`) that reuses `packages/kit`. `apps/refunds` is the reference: it's the most complete example of a domain service built on kit approvals and the audit log. `apps/ledger` is the original, simpler app.

Run everything with Node 24: `source ~/.nvm/nvm.sh && nvm use 24`. One-shot shells don't have `npm` on PATH until you do this.

## 1. Pick a name and a port

- `<name>` is a lowercase folder and workspace name (for example `invoices`).
- Ports: Ledger uses 3000 and Refunds 3001. Take the next free port.
- Apps live in `apps/<name>/`, never in a root `app/` folder.

## 2. Copy the wiring from Refunds

These files point Next.js at the kit: proxy, auth route, sign-in and 403 pages, mock IdP routes, theme CSS and configs. They have no Refunds domain logic in them.

```bash
N=<name>
mkdir -p apps/$N
cd apps/refunds && cp -r --parents \
  .env.example AGENTS.md CLAUDE.md eslint.config.mjs postcss.config.mjs \
  tsconfig.json next.config.ts package.json \
  src/proxy.ts src/app/api src/app/signin src/app/forbidden.tsx \
  src/app/demo-idp src/app/globals.css src/app/layout.tsx src/app/favicon.ico \
  ../$N/ && cd ../..
```

Then edit the copies:

| File | Change |
|---|---|
| `package.json` | Set `name` to `<name>` and put the new port in every `PORT=...` (`dev`, `dev:demo`, `dev:demo:dataverse`, `start`). |
| `next.config.ts` | Set `KIT_APP_NAME`, `KIT_APP_HEADLINE` and `KIT_APP_TAGLINE`. The kit's logo, sign-in page, 403 page and demo IdP picker read them through `@kit/app`. |
| `src/app/layout.tsx` | Update `metadata.title` and `description`. |
| `.env.example` | Change the port in the redirect URI comment. |

Run `npm install` at the root so the workspace gets linked and `package-lock.json` is updated. Commit the lockfile.

## 3. Domain logic: `src/lib/<domain>/`

Follow `apps/refunds/src/lib/refunds/`:

- `types.ts`: status/enum unions, the entity, its input and a `Store` interface.
- `store.ts`: an in-memory store. There's no database; the kit's approvals and audit log are in memory too.
- `service.ts`: `create<Domain>Service({ store, approvals, auditLog })`. For anything that needs a second person's sign-off, call `approvals.submit` and keep the returned `approvalId` on the entity. Then `approvals.decide` / `approvals.cancel` enforce maker-checker for you (no self-approval, only the requester can cancel). Write an `auditLog.append` for each domain action that the kit doesn't already log.
- `server.ts`: a `globalThis` singleton that builds the service from `getKitServices()`. In demo mode it also seeds actionable records as the demo personas (see `DEMO_PERSONAS`).
- `sample-data.ts`: deterministic history with a fixed seed, so the dashboard has data and screenshots don't change between runs.

Rules:

- **Imports.** Files under `src/lib/` that tests touch must import the kit through relative `.ts` paths (`../../../../../packages/kit/...`) so `node --test` can run them without a bundler. Pages and `server.ts` use `@kit/*`.
- **Statuses.** Map kit approval statuses to your own union explicitly (`status: decision`, `status = "cancelled"`). Assigning `approval.status` directly fails typecheck because the kit has `"pending"`.
- **Audit order.** To build a per-record trail, filter `auditLog.list()` by your target and the approval target (`APPROVAL_TARGET_TYPE`). Don't concatenate and re-sort by timestamp: entries written in the same millisecond come out in the wrong order.
- **Shared stores.** The kit's approval store and audit log are shared with whatever else the kit seeds (for example Ledger's demo approvals). Filter activity views down to your own approvals.
- **Roles.** Roles are the kit's `Ledger.Viewer < Operator < Approver < Admin`, checked with `hasRole` from `@kit/auth/roles`. Put permission helpers (`canApprove`, ...) in the service, and use the same helper on the server and in the UI. If approve and reject need different roles, write a separate helper for each.

## 4. Pages: `src/app/(app)/`

- `layout.tsx`: `<AppShell nav={...}>` with `NavLink`s. Hide links with `hasRole(actor.roles, ...)`.
- Each page calls `requireRole("Ledger.<min>")` from `@kit/services/authz`. The proxy only checks that the user is signed in.
- Server actions start with `"use server"`, call `currentActor()` or `requireRole()` again, catch domain errors and `redirect` back with `?error=` or `?notice=`. Never rely on a hidden button for authorization.
- Use components from `@kit/ui` and `@kit/components`, following `packages/kit/ui/DESIGN.md`.
- CSV exports are route handlers. Escape cells (see `apps/refunds/src/lib/refunds/csv.ts`) and record the export in the audit log.

## 5. Tests: `apps/<name>/tests/*.test.ts`

Build the service with the kit's `memoryApprovalStore`, `memoryAuditLog` and `createApprovalService` (see `apps/refunds/tests/service.test.ts`). Cover RBAC denials, self-approval, the happy path through each status, validation and audit entries.

## 6. Wire it into the monorepo

- Root `package.json`: add `dev:<name>`, `dev:<name>:demo` and `dev:<name>:demo:dataverse` (`npm run <script> -w apps/<name>`), and append `&& npm run build -w apps/<name>` to `build`. Lint, typecheck and test already run in every workspace, and CI (`.github/workflows/ci.yml`) runs the root scripts.
- `apps/<name>/README.md`: port, scripts, routes and minimum roles, business rules, limits.
- Root `README.md`: add a row to the workspace table, the scripts table and the docs table.
- `ARCHITECTURE.md` and `DEPLOYMENT.md`: add the app wherever they list apps.
- Real Entra: register the redirect URI `http://localhost:<port>/api/auth/callback/microsoft-entra-id`. A separate app registration per app is cleaner (see `DEPLOYMENT.md`).

## 7. Verify

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run test:smoke
npm run dev:<name>:demo        # http://localhost:<port>
```

CI runs the same commands. Two root suites find the new app on their own:

- `tests/conformance.test.ts` (in `npm test`) fails with a pointer to the fix if a step above was skipped: a missing kit file or script, a port or `KIT_APP_NAME` that another app already uses, a missing root script or doc mention, a mock IdP route without `demoOnly()`, or a page, route handler or exported server action without `requireRole()` / `currentActor()`.
- `tests/smoke.test.ts` (`npm run test:smoke`) boots the production build, signs in as each persona and expects 200 or 403 on every static page from the role in its `requireRole()` call. Dynamic routes (`[id]`) aren't fetched, so cover them in unit tests. A 500 on any page fails the run. With `TEST_DATABASE_URL` set it also runs apps that have a `db:migrate` script on PostgreSQL. Only extra public API routes (proxy matcher exclusions under `api/`) are fetched signed out, and they must answer 200.

`typecheck` runs `next typegen` first, which generates the `PageProps` and `LayoutProps` globals. Then test in the browser with the `kit-app-demo-testing` skill, and save screenshots in `apps/<name>/docs/screenshots/` with a README index.

## Known kit limitations

- Role names are `Ledger.*` and the demo persona blurbs describe payments (`packages/kit/demo/personas.ts`).
- Cookies aren't scoped by port. Two apps running on localhost share the session cookie name, so signing into one can affect the other. Test one app at a time, or use separate browser profiles.
- All state is in memory and resets when the server restarts.
