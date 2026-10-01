import type { OIDCConfig } from "next-auth/providers";
import type { Profile } from "next-auth";
import { DEMO_CLIENT_ID, DEMO_CLIENT_SECRET, DEMO_PROVIDER_ID, demoIssuer } from "./idp/config";

/** Standard OIDC client pointed at the in-app mock IdP (`/demo-idp`), configured via discovery. */
export function DemoEntraProvider(): OIDCConfig<Profile> {
  return {
    id: DEMO_PROVIDER_ID,
    name: "Demo Entra ID",
    type: "oidc",
    issuer: demoIssuer(),
    clientId: DEMO_CLIENT_ID,
    clientSecret: DEMO_CLIENT_SECRET,
    checks: ["pkce", "state", "nonce"],
    authorization: { params: { scope: "openid profile email" } },
  };
}
