import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Use alternate build dir for local dev to prevent Windows file-lock crashes
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // Prevents Windows heap crash during build trace collection on large projects
  outputFileTracingExcludes: {
    '*': ['node_modules/@swc/**'],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "pacy-labs",

  project: "tcg",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  webpack: {
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
