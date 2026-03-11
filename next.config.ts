import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // vm2 uses dynamic file loading (bridge.js) that breaks when bundled — exclude from bundle
  // mongodb, pg, sharp have optional native deps that break webpack resolution
  serverExternalPackages: ['vm2', 'mongodb', 'pg', 'sharp'],
  outputFileTracingRoot: join(process.cwd()),
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-*',
      'node_modules/webpack',
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    // Stub optional deps of mongodb/pg/sharp so build doesn't fail on missing native modules
    if (isServer) {
      const optionalStubs: Record<string, boolean> = {
        kerberos: false,
        '@mongodb-js/zstd': false,
        '@aws-sdk/credential-providers': false,
        'gcp-metadata': false,
        snappy: false,
        socks: false,
        aws4: false,
        'mongodb-client-encryption': false,
        'pg-native': false,
        '@img/sharp-libvips-dev/include': false,
        '@img/sharp-libvips-dev/cplusplus': false,
        '@img/sharp-wasm32/versions': false,
      };
      config.resolve.fallback = { ...config.resolve.fallback, ...optionalStubs };
    }

    // Handle Node.js modules that should only be available on the server (and stub optional deps in client bundle)
    if (!isServer) {
      const clientStubs: Record<string, boolean> = {
        kerberos: false,
        '@mongodb-js/zstd': false,
        '@aws-sdk/credential-providers': false,
        'gcp-metadata': false,
        snappy: false,
        socks: false,
        aws4: false,
        'mongodb-client-encryption': false,
        'pg-native': false,
        '@img/sharp-libvips-dev/include': false,
        '@img/sharp-libvips-dev/cplusplus': false,
        '@img/sharp-wasm32/versions': false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ...clientStubs,
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
