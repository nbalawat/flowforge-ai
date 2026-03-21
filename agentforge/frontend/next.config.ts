import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Inside Docker, the backend is reachable at http://backend:8000
    // Outside Docker (local dev), it's at http://localhost:8001
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8010";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
