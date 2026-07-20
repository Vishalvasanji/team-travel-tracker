import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The roster/hotels page was folded into the per-trip game hubs.
      { source: "/hotels", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
