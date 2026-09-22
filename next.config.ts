import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: 'http://188.245.212.240/api/:path*/', // Proxy to Hetzner Backend
      },
      {
        source: '/api/:path*',
        destination: 'http://188.245.212.240/api/:path*/', // Fallback Proxy to Hetzner Backend
      },
      {
        source: '/media/:path*',
        destination: 'http://188.245.212.240/media/:path*', // Proxy for media files
      },
    ];
  },
};

export default nextConfig;
