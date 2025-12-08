import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: join(process.cwd()),
};

export default nextConfig;
