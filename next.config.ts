import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Lento Room's entry and pages never send a referrer (so a pass or
  // room URL can't leak to another site) and are never cached.
  async headers() {
    const privateHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/enter", headers: privateHeaders },
      { source: "/lento-room", headers: privateHeaders },
      { source: "/lento-room/:path*", headers: privateHeaders },
      { source: "/api/lento-room/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
