import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  serverExternalPackages: ["pg", "pg-mem"],
};

export default nextConfig;
