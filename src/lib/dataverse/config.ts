import { ROLES, isRole, type Role } from "../roles.ts";
import { isGuid } from "./client.ts";
import { DEFAULT_ROLE_NAMES, type RoleMapping } from "./role-provider.ts";

type Env = Record<string, string | undefined>;

export function isDataverseEnabled(env: Env = process.env): boolean {
  return env.DATAVERSE_ENABLED === "true";
}

/** Parses `Ledger.Admin=value,Ledger.Viewer=value`. */
function parseRolePairs(raw: string | undefined, name: string): Partial<Record<Role, string>> {
  const result: Partial<Record<Role, string>> = {};
  if (!raw) return result;
  for (const pair of raw.split(",")) {
    if (!pair.trim()) continue;
    const [role, ...rest] = pair.split("=");
    const value = rest.join("=").trim();
    if (!isRole(role.trim()) || !value) throw new Error(`${name}: invalid entry "${pair.trim()}"`);
    result[role.trim() as Role] = value;
  }
  return result;
}

export function readRoleMapping(env: Env = process.env): RoleMapping {
  const templateIds = parseRolePairs(env.DATAVERSE_ROLE_TEMPLATE_IDS, "DATAVERSE_ROLE_TEMPLATE_IDS");
  for (const id of Object.values(templateIds)) {
    if (!isGuid(id)) throw new Error("DATAVERSE_ROLE_TEMPLATE_IDS values must be role template GUIDs");
  }
  const names = { ...DEFAULT_ROLE_NAMES, ...parseRolePairs(env.DATAVERSE_ROLE_NAMES, "DATAVERSE_ROLE_NAMES") };
  return { templateIds, names: Object.fromEntries(ROLES.map((r) => [r, names[r]])) as Record<Role, string> };
}

export interface DataverseConnection {
  /** Environment URL, e.g. `https://contoso.crm.dynamics.com`. */
  url: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

function required(env: Env, name: string, fallback?: string): string {
  const value = env[name] ?? (fallback ? env[fallback] : undefined);
  if (!value) throw new Error(`Missing required environment variable ${name}${fallback ? ` (or ${fallback})` : ""}`);
  return value;
}

export function readConnection(env: Env = process.env): DataverseConnection {
  const url = new URL(required(env, "DATAVERSE_URL"));
  if (url.protocol !== "https:") throw new Error("DATAVERSE_URL must use https");
  return {
    url: url.origin,
    tenantId: required(env, "DATAVERSE_TENANT_ID", "ENTRA_TENANT_ID"),
    clientId: required(env, "DATAVERSE_CLIENT_ID", "ENTRA_CLIENT_ID"),
    clientSecret: required(env, "DATAVERSE_CLIENT_SECRET", "ENTRA_CLIENT_SECRET"),
  };
}

/** Publisher prefix of the optional approval-status mirror table, e.g. `cr7f3_`. */
export function readMirrorPrefix(env: Env = process.env): string | null {
  const prefix = env.DATAVERSE_MIRROR_PREFIX;
  if (!prefix) return null;
  if (!/^[a-z][a-z0-9]{1,7}_$/.test(prefix)) throw new Error("DATAVERSE_MIRROR_PREFIX must look like `cr7f3_`");
  return prefix;
}
