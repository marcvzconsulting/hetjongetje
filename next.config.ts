import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Security headers applied to every response. Together they harden the
 * app against clickjacking, MIME-sniffing, downgrade attacks,
 * popup-based tab-jacking, cross-origin asset leeching, and unnecessary
 * feature exposure.
 *
 * De Content-Security-Policy staat in `src/middleware.ts`, niet hier:
 * die heeft een per-request nonce voor `script-src` nodig, wat een
 * statische config-header niet kan leveren. `style-src` houdt daar
 * `'unsafe-inline'` (inline <style> voor responsive overrides).
 */
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
];

const nextConfig: NextConfig = {
  /**
   * Externe image-domeinen waarvan Next/Image mag optimaliseren. Door
   * deze toe te voegen worden story-illustraties via /_next/image
   * geproxied, geresized naar de daadwerkelijke render-grootte, en
   * geserveerd als AVIF/WebP met PNG-fallback. Cruciaal voor het
   * dashboard waar tientallen 1024×1024-illustraties anders full-size
   * worden geladen.
   *
   * Domeinen moeten overeenkomen met de CSP `img-src` directive
   * hierboven.
   */
  images: {
    remotePatterns: [
      // Exacte productie-bucket i.p.v. een `**.scw.cloud`-wildcard: zo kan
      // de image-optimizer (/_next/image) niet als open proxy voor
      // willekeurige Scaleway-buckets van andere tenants misbruikt worden.
      {
        protocol: "https",
        hostname: "ons-verhaaltje-prod.s3.nl-ams.scw.cloud",
      },
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.fal.run" },
      { protocol: "https", hostname: "**.fal.ai" },
    ],
  },
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
