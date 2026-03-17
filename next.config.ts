import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: join(process.cwd()),
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-*',
      'node_modules/webpack',
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    // Handle Node.js modules that should only be available on the server
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        child_process: false,
        dns: false,
        'timers/promises': false,
        buffer: false,
        events: false,
        util: false,
      };
      
      // Handle node: prefixed imports by aliasing them to false (not available in browser)
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:assert': false,
        'node:buffer': false,
        'node:child_process': false,
        'node:crypto': false,
        'node:events': false,
        'node:fs': false,
        'node:http': false,
        'node:https': false,
        'node:net': false,
        'node:os': false,
        'node:path': false,
        'node:stream': false,
        'node:tls': false,
        'node:url': false,
        'node:util': false,
        'node:zlib': false,
        'node:dns': false,
        'node:timers/promises': false,
      };
      
      // Add plugin to ignore any remaining node: imports
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:/,
          (resource: any) => {
            // Replace node: imports with empty module for client bundle
            resource.request = resource.request.replace(/^node:/, '');
          }
        )
      );
    }
    return config;
  },
};

export default nextConfig;
