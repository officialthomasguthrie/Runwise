import type { NextConfig } from "next";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: join(__dirname),
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/landing/radison-landing.html',
      },
    ];
  },
};

export default nextConfig;
