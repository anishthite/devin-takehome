/**
 * Per-app identity used by kit chrome (logo, sign-in, 403, demo IdP). Apps set these in their
 * `next.config.ts` `env`, which Next.js inlines at build time; unset values fall back to Ledger.
 */
export const APP_NAME = process.env.KIT_APP_NAME ?? "Ledger";
export const APP_HEADLINE = process.env.KIT_APP_HEADLINE ?? "Every payment, accounted for.";
export const APP_TAGLINE = process.env.KIT_APP_TAGLINE ?? "Track inflows, outflows and approvals across your organization";
