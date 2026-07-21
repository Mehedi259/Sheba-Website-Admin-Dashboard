import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://188.245.212.240/api/:path*', // Proxy to Hetzner Backend
      },
    ];
  },
};

export default nextConfig;
