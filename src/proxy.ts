import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy = Next 16's hernoemde middleware. Twee taken:
 *
 *   1. Auth-gate: stuur niet-ingelogde bezoekers van de app-routes door
 *      naar /login. De pagina's checken zelf ook server-side; dit is puur
 *      een UX-vangnet, geen beveiligingsgrens.
 *   2. Content-Security-Policy met een per-request nonce voor `script-src`,
 *      op elke HTML-response. Next geeft zijn eigen framework-scripts dan
 *      automatisch de nonce; onze inline JSON-LD leest 'm via
 *      `headers().get("x-nonce")`. `style-src` houdt `'unsafe-inline'`
 *      (inline <style> voor responsive overrides; lager risico).
 *      `'unsafe-eval'` blijft dev-only voor de HMR-runtime.
 */
const isDev = process.env.NODE_ENV !== "production";

// Routes die alleen voor ingelogde gebruikers zijn (pad + subpaden).
const PROTECTED = ["/dashboard", "/profile", "/generate", "/story", "/book"];

const PROD_CONNECT = [
  "'self'",
  "https://api.brevo.com",
  "https://*.sentry.io",
  "https://*.ingest.sentry.io",
  "https://vitals.vercel-insights.com",
  "https://va.vercel-scripts.com",
];
const DEV_EXTRA_CONNECT = ["ws:", "wss:"];

export function proxy(request: NextRequest) {
  // 1. Auth-gate voor de beschermde app-routes.
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected) {
    const token =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 2. CSP met nonce op elke (HTML-)response.
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
  // CSP hoort op alle HTML-routes, dus breder dan alleen de app-routes.
  // Uitgezonderd: API, Next-static-assets, image-optimizer, bestanden met
  // extensie, en prefetch-requests (die hebben geen nonce nodig). De
  // auth-redirect hierboven blijft beperkt tot PROTECTED.
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
