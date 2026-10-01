import { ROLES, type Role } from "../roles.ts";
import type { RoleProvider } from "../kit/role-provider.ts";
import { guidLiteral, type DataverseClient } from "./client.ts";
import type { DataverseRole, Guid, ODataCollection } from "./types.ts";

export interface RoleMapping {
  /** Dataverse role template ids (`_roletemplateid_value`); matched first when a role has one. */
  templateIds: Partial<Record<Role, Guid>>;
  /** Security role names, matched case-insensitively when no template id matches. */
  names: Record<Role, string>;
}

export const DEFAULT_ROLE_NAMES: Record<Role, string> = {
  "Ledger.Viewer": "Ledger Viewer",
  "Ledger.Operator": "Ledger Operator",
  "Ledger.Approver": "Ledger Approver",
  "Ledger.Admin": "Ledger Admin",
};

export function mapDataverseRoles(roles: readonly DataverseRole[], mapping: RoleMapping): Role[] {
  const byTemplate = new Map<string, Role>();
  for (const role of ROLES) {
    const id = mapping.templateIds[role];
    if (id) byTemplate.set(id.toLowerCase(), role);
  }
  const byName = new Map<string, Role>(ROLES.map((role) => [mapping.names[role].toLowerCase(), role]));

  const found = new Set<Role>();
  for (const role of roles) {
    const template = role._roletemplateid_value?.toLowerCase();
    const match = (template ? byTemplate.get(template) : undefined) ?? byName.get(role.name.toLowerCase());
    if (match) found.add(match);
  }
  return ROLES.filter((role) => found.has(role));
}

/** Roles the user holds in Dataverse, directly or through team membership, via `RetrieveAadUserRoles`. */
export function dataverseRoleProvider(client: DataverseClient, mapping: RoleMapping): RoleProvider {
  return {
    async getRoles(user) {
      const result = await client.callFunction<ODataCollection<DataverseRole>>(
        "RetrieveAadUserRoles",
        { DirectoryObjectId: guidLiteral(user.id) },
        "$select=roleid,name,_roletemplateid_value",
      );
      return mapDataverseRoles(result.value, mapping);
    },
  };
}
