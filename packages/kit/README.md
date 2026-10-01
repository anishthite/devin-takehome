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
