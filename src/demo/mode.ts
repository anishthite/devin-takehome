/** Demo mode swaps Entra sign-in for mock personas. Opt-in only via DEMO_MODE=true. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export const DEMO_TENANT_ID = "demo-tenant";

/** Fixed key so demo mode runs with zero config; never used outside demo mode. */
export const DEMO_AUTH_SECRET = "demo-mode-insecure-auth-secret-do-not-use-in-prod";
