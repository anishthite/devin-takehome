# Refunds screenshots

Captured from `npm run dev:refunds:demo` (mock Entra personas, in-memory data) while walking the full refund lifecycle across all four roles.

| File | Persona | Shows |
|---|---|---|
| 01-signin.png | — | Refunds-branded sign-in with demo personas |
| 02-dashboard-operator.png | Sam Operator | KPIs, 14-day volume, top reasons, queue, access card |
| 03-new-refund-form.png | Sam Operator | New refund form |
| 04-pending-maker-checker.png | Sam Operator | Own request awaiting approval, no decision controls |
| 05-high-value-pending.png | Sam Operator | $3,200 request flagged "Admin approval" |
| 06-approved-by-jordan.png | Jordan Approver | Approved with comment |
| 07-high-value-approver-locked.png | Jordan Approver | High-value refund: Reject only, approve needs Admin |
| 08-audit-log-approver.png | Jordan Approver | Audit log, no export for Approvers |
| 09-issued-processor-reference.png | Sam Operator | Issued refund with processor reference |
| 10-high-value-approved-admin.png | Avery Admin | Admin approves the high-value refund |
| 11-audit-export-downloaded.png | Avery Admin | CSV export and its "Audit log exported" entry |
| 12-dashboard-viewer.png | Riley Viewer | Dashboard without New refund / Audit nav |
| 13-viewer-no-actions.png | Riley Viewer | Refund detail with no actions |
| 14-viewer-new-refund-forbidden.png | Riley Viewer | `/refunds/new` denied |
| 15-viewer-audit-forbidden.png | Riley Viewer | `/audit` denied |
| 16-refunds-search.png | — | Search on the refunds list |
| 17-refunds-approved-filter.png | — | Approved status tab |
| 18-refunds-issued-filter.png | — | Issued status tab |
| 19-refunds-filter-empty-state.png | — | Empty filter state |
| 20-viewer-pending-no-actions.png | Riley Viewer | Pending refund, read-only |
| 21-sample-history.png | Riley Viewer | Read-only sample history |
| 22-high-value-rejected-by-approver.png | Jordan Approver | High-value refund rejected by an Approver |
