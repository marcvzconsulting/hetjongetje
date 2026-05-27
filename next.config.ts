import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Security headers applied to every response. Together they harden the
 * app against XSS amplification, clickjacking, MIME-sniffing, downgrade
 * attacks, popup-based tab-jacking, cross-origin asset leeching, and
 * unnecessary feature exposure.
 *
 * The CSP keeps `'unsafe-inline'` on `style-src` because every page
 * currently composes inline `<style>` blocks (responsive overrides
 * etc.). Switching to nonce-based CSP requires per-request nonces from
 * middleware and component-side <style nonce={...}> wiring — a known
 * follow-up that's been parked. `'unsafe-eval'` is also still on
 * `script-src` in both dev and prod because Next.js's Server Components
 * runtime and the Sentry browser SDK both use new Function() in places.
 *
 * Dev only: `ws:`/`wss:` permitted on connect-src for HMR over
 * WebSocket. Production responses don't include them.
 */
const PROD_CONNECT = [
  "'self'",
  "https://api.brevo.com",
  "https://*.sentry.io",
  "https://*.ingest.sentry.io",
  "https://vitals.vercel-insights.com",
  "https://va.vercel-scripts.com",
];
const DEV_EXTRA_CONNECT = ["ws:", "wss:"];

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // `same-origin-allow-popups` rather than `same-origin` because we use
  // a Google OAuth flow that may open accounts.google.com in a popup —
  // strict same-origin would sever the opener relationship and break
  // sign-in. Still upgrades us from the browser default which leaves
  // window.opener exposed across tabs.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Block other origins from embedding our resources (images, JSON,
  // fonts) in their pages. We don't need to be hot-linked.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Old Adobe Flash policy file lookup; explicitly tell crossdomain.xml
  // consumers there's nothing here.
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // Deny every browser feature we never use. The empty allowlist `=()`
  // means no origin (not even our own) can request the feature. Add an
  // origin like `=("self")` if we ever opt-in to one of these.
  {
    key: "Permissions-Policy",
    value: [
      // Hardware-sensoren en device-APIs — we hebben er geen
      // gebruik voor. Allowlist `=()` betekent: geen enkele
      // origin (ook niet self) mag dit aanvragen.
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "bluetooth=()",
      "serial=()",
      "hid=()",
      "gamepad=()",
      "accelerometer=()",
      "gyroscope=()",
      "magnetometer=()",
      "ambient-light-sensor=()",
      "xr-spatial-tracking=()",
      // Media + display
      "autoplay=()",
      "fullscreen=(self)",
      "picture-in-picture=()",
      "midi=()",
      "encrypted-media=()",
      "display-capture=()",
      "screen-wake-lock=()",
      // Misc browser features
      "idle-detection=()",
      "window-management=()",
      "local-fonts=()",
      "sync-xhr=()",
      "interest-cohort=()",
      // Wel toestaan voor onze eigen origin:
      // - web-share: referral- en story-deel-knoppen
      // - clipboard-write: copy-link-knoppen
      // clipboard-read blijft uit (we hoeven nooit te peeken).
      "web-share=(self)",
      "clipboard-read=()",
      "clipboard-write=(self)",
    ].join(", "),
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.scw.cloud https://*.fal.media https://*.fal.run https://*.fal.ai",
      "font-src 'self' data:",
      `connect-src ${[...PROD_CONNECT, ...(isDev ? DEV_EXTRA_CONNECT : [])].join(" ")}`,
      // Lock down the niche directives explicitly so a browser default
      // can't widen them silently in a future spec change.
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
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
  /**
   * Apex → www redirect. Done in Next.js (not at the Vercel domain
   * level) so the 308 response carries our SECURITY_HEADERS — Vercel's
   * edge redirect would emit a bare response. The `host` matcher fires
   * on the apex hostname and any other variants we own, so visitors
   * land on the canonical URL with HSTS + COOP + CSP intact.
   *
   * Requires the apex domain in Vercel to be an *alias* of the project,
   * not a redirect — otherwise Vercel's edge redirect wins before this
   * config runs.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "onsverhaaltje.nl" }],
        destination: "https://www.onsverhaaltje.nl/:path*",
        permanent: true,
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
