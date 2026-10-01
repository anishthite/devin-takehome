import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    KIT_APP_NAME: "Adjustments",
    KIT_APP_HEADLINE: "Every balance change, checked twice.",
    KIT_APP_TAGLINE:
      "Request customer balance adjustments, approve them with a second pair of eyes, and keep a full audit trail",
  },
  experimental: {
    authInterrupts: true,
  },
  serverExternalPackages: ["pg", "pg-mem"],
};

export default nextConfig;
