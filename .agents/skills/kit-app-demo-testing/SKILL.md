---
name: kit-app-demo-testing
description: Run any kit-based app (Ledger, Refunds, new apps) in demo mode with mock Entra personas and test it end to end in the browser with screenshot evidence.
---

# Testing a kit app in demo mode

## Start the app

Use Node 24: `source ~/.nvm/nvm.sh && nvm use 24`. From the repo root:

| App | Command | URL |
|---|---|---|
| Ledger | `npm run dev:demo` | http://localhost:3000 |
| Refunds | `npm run dev:refunds:demo` | http://localhost:3001 |
| New app | `npm run dev:<name>:demo` | its port in `apps/<name>/package.json` |

The `:demo:dataverse` variants also start the in-memory mock Dataverse. Only claim Dataverse coverage if you ran one of them. You don't need any secrets. Demo mode doesn't test real Entra, real Dataverse or real payouts.

## Personas and state

- On `/signin`, pick Avery Admin, Jordan Approver, Sam Operator or Riley Viewer. To switch personas, use Sign out in the top-right profile menu: opening `/signin` while signed in sends you back into the app.
- Everything is in memory. Keep the same server process running while you switch personas, because a restart wipes state and the IDs of records you created.
- Write down the real detail URLs as you go; IDs are random. Deterministic sample history is read-only.
- Test one app at a time. Cookies aren't scoped by port, so two apps on localhost can clobber each other's sessions.

## What to cover

1. **Maker-checker.** The Operator creates a request. Self-approval is locked for them. A different Approver decides. Only the requester can cancel.
2. **Role thresholds.** If the app has any (for example, Refunds over $2,500 need an Admin to approve), check both the action that's allowed and the one that's withheld for each role.
3. **Viewer.** Check both that the nav links are hidden and that opening the routes directly shows the 403 page. Check that pending records are read-only.
4. **Audit.** Every action shows up in the record's trail and on `/audit` (Approver and up). For Admin CSV exports, open the downloaded file and check its rows, then refresh `/audit` to see the export entry.
5. **Lists.** Search, status filters and empty states.

## Evidence

Save numbered, descriptive PNGs (`01-signin.png`, `02-dashboard-operator.png`, ...) to `apps/<name>/docs/screenshots/`, and add a README there that indexes them by persona. Example: `apps/refunds/docs/screenshots/`.
