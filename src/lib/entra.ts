const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTenantId(value: string): boolean {
  return GUID.test(value);
}

export function entraIssuer(tenantId: string): string {
  if (!isTenantId(tenantId)) {
    throw new Error("ENTRA_TENANT_ID must be a directory (tenant) GUID");
  }
  return `https://login.microsoftonline.com/${tenantId}/v2.0`;
}

export function isFromTenant(tid: unknown, tenantId: string): boolean {
  return typeof tid === "string" && tid.toLowerCase() === tenantId.toLowerCase();
}
