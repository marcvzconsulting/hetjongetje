import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Security headers applied to every response. Together they harden the
 * app against XSS amplification, clickjacking, MIME-sniffing, downgrade
 * attacks, and unnecessary feature exposure.
 *
 * The CSP is intentionally permissive on `script-src` (`unsafe-inline`
 * + `unsafe-eval`) because Next.js inline runtime + Turbopack require
 * it in dev and production. Tightening to a nonce-based CSP is a known
 * future-iteration project — done here would just break the build.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.scw.cloud https://*.fal.media https://*.fal.run https://*.fal.ai",
      "font-src 'self' data:",
      // ws:/wss: are needed for Next.js dev hot-reload over WebSocket;
      // harmless in production where no WS upgrade happens on these origins.
      "connect-src 'self' ws: wss: https://api.brevo.com https://*.sentry.io https://*.ingest.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route, including API routes.
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
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
