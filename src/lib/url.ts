import { headers } from "next/headers";

/**
 * Resolve the absolute base URL of the current deployment. Works both during
 * a request (via forwarded host/proto headers) and outside one (via env),
 * so it's safe to call from e-mail template builders that run in server
 * actions, API routes, or background jobs.
 */
export async function getAppBaseUrl(): Promise<string> {
  let base =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ??
        (host.startsWith("localhost") ? "http" : "https");
      base = `${proto}://${host}`;
    }
  } catch {
    // headers() is only available in a request scope.
  }

  return base.replace(/\/$/, "");
}

export async function buildAppUrl(path: string): Promise<string> {
  const base = await getAppBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/**
 * Base URL from ENV ONLY — never from request headers. Use this for
 * security-sensitive links in outgoing e-mail (password reset, magic
 * link): resolving the host from a request header lets an attacker who
 * spoofs `X-Forwarded-Host` make us send a victim a genuine reset mail
 * whose link points at attacker.com — classic reset poisoning / account
 * takeover. Pinning to a trusted env value removes that entirely.
 */
export function getTrustedBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";
  return base.replace(/\/$/, "");
}

export function buildTrustedUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getTrustedBaseUrl()}${normalized}`;
}

/**
 * Build a URL voor publieke webhooks (Mollie e.d.). In productie identiek
 * aan `buildAppUrl`; in dev kun je `MOLLIE_WEBHOOK_BASE_URL` zetten op een
 * tunnel-host (bv. cloudflared/ngrok) zodat Mollie de webhook kan bereiken
 * terwijl je browser zelf via localhost blijft werken.
 */
export async function buildWebhookUrl(path: string): Promise<string> {
  const override = process.env.MOLLIE_WEBHOOK_BASE_URL;
  if (override) {
    const base = override.replace(/\/$/, "");
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
  }
  return buildAppUrl(path);
}
