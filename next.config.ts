import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Only wrap with Sentry when a DSN is configured. Keeps local dev painless
// for contributors who haven't set up Sentry credentials yet.
const config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Sentry webpack plugin options
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Silence noisy build output unless actively debugging Sentry itself
      silent: !process.env.CI,

      // Upload source maps so stack traces in Sentry show your real code.
      // Runs in CI/production builds; skipped locally without auth token.
      widenClientFileUpload: true,

      // Delete source maps after upload so they're not exposed publicly
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },

      // Don't inject Sentry tunnel route — we don't need ad-blocker bypass
      // since all our users are EU-based and we're not running ads ourselves.
      tunnelRoute: undefined,
    })
  : nextConfig;

export default config;
