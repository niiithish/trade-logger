import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Entry + exit charts as data URLs can exceed 10MB together.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
