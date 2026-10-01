export const DEMO_PROVIDER_ID = "demo-entra";
export const DEMO_CLIENT_ID = "ledger-demo-client";
/** Public by design: the mock IdP only runs in demo mode. */
export const DEMO_CLIENT_SECRET = "ledger-demo-client-secret";
export const DEMO_CALLBACK_PATH = `/api/auth/callback/${DEMO_PROVIDER_ID}`;

function origin(value: string | undefined): string | undefined {
  return value?.replace(/\/+$/, "");
}

/** Issuer the app server reaches the mock IdP on (discovery, token, userinfo, JWKS). */
export function demoIssuer(): string {
  const base = origin(process.env.DEMO_IDP_URL) ?? `http://localhost:${process.env.PORT ?? 3000}`;
  return `${base}/demo-idp`;
}

/** Base the browser is sent to for /authorize; differs from the issuer behind a proxy. */
export function demoBrowserBase(): string {
  const base = origin(process.env.DEMO_PUBLIC_URL);
  return base ? `${base}/demo-idp` : demoIssuer();
}
