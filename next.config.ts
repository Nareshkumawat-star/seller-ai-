import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Long-running local inference must not be cut off by a short server action limit.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
