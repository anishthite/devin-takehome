import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    KIT_APP_NAME: "Refunds",
    KIT_APP_HEADLINE: "Every refund, approved and accounted for.",
    KIT_APP_TAGLINE: "Request, approve and issue customer refunds with maker-checker controls and a full audit trail",
  },
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
