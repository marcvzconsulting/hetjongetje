import { NextRequest, NextResponse } from "next/server";

/**
 * Per-request Content-Security-Policy met een nonce voor `script-src`.
 *
 * Een statische config-header kan geen per-request nonce zetten, vandaar
 * middleware. We zetten de CSP op de request-header (zodat Next zijn eigen
 * framework-scripts automatisch de nonce meegeeft) EN op de response. Onze
 * eigen inline <script> (JSON-LD) leest de nonce via
 * `headers().get("x-nonce")`.
 *
 * `style-src` houdt `'unsafe-inline'` (inline <style> voor responsive
 * overrides; lager risico). `'unsafe-eval'` blijft dev-only voor de
 * HMR-runtime. De overige security-headers staan in next.config.ts.
 */
const isDev = process.env.NODE_ENV !== "production";

const PROD_CONNECT = [
  "'self'",
  "https://api.brevo.com",
  "https://*.sentry.io",
  "https://*.ingest.sentry.io",
  "https://vitals.vercel-insights.com",
  "https://va.vercel-scripts.com",
];
const DEV_EXTRA_CONNECT = ["ws:", "wss:"];

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https://*.sentry.io https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.scw.cloud https://*.fal.media https://*.fal.run https://*.fal.ai",
    "media-src 'self' https://*.scw.cloud",
    "font-src 'self' data:",
    `connect-src ${[...PROD_CONNECT, ...(isDev ? DEV_EXTRA_CONNECT : [])].join(" ")}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // CSP hoort alleen op HTML-responses. API-routes, Next-static-assets en
  // image-optimizer vallen buiten; prefetch-requests ook (die hebben geen
  // nonce nodig). De overige security-headers dekken die via next.config.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
