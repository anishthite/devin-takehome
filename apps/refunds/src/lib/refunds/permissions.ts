import { hasRole, type Role } from "../../../../../packages/kit/auth/roles.ts";
import { formatMoney } from "./format.ts";
import { ADMIN_APPROVAL_THRESHOLD_MINOR } from "./service.ts";

/** What each app role can do here, for the "Your access" card. */
export function permissionsFor(roles: readonly Role[]): Array<{ label: string; allowed: boolean }> {
  const threshold = formatMoney(ADMIN_APPROVAL_THRESHOLD_MINOR);
  return [
    { label: "View refunds and dashboards", allowed: hasRole(roles, "Ledger.Viewer") },
    { label: "Request and issue refunds", allowed: hasRole(roles, "Ledger.Operator") },
    { label: `Approve refunds up to ${threshold}`, allowed: hasRole(roles, "Ledger.Approver") },
    { label: "View the audit log", allowed: hasRole(roles, "Ledger.Approver") },
    { label: `Approve refunds over ${threshold}`, allowed: hasRole(roles, "Ledger.Admin") },
    { label: "Export the audit log", allowed: hasRole(roles, "Ledger.Admin") },
  ];
}
