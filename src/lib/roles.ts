export const ROLES = [
  "Ledger.Viewer",
  "Ledger.Operator",
  "Ledger.Approver",
  "Ledger.Admin",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  "Ledger.Viewer": "Viewer",
  "Ledger.Operator": "Operator",
  "Ledger.Approver": "Approver",
  "Ledger.Admin": "Admin",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function parseRoles(claim: unknown): Role[] {
  if (!Array.isArray(claim)) return [];
  return ROLES.filter((role) => claim.includes(role));
}

export function highestRole(roles: readonly Role[]): Role | null {
  for (let i = ROLES.length - 1; i >= 0; i--) {
    if (roles.includes(ROLES[i])) return ROLES[i];
  }
  return null;
}

/** Roles are hierarchical: holding a higher role grants every lower one. */
export function hasRole(roles: readonly Role[], required: Role): boolean {
  const top = highestRole(roles);
  return top !== null && ROLES.indexOf(top) >= ROLES.indexOf(required);
}
