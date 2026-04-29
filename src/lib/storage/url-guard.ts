/**
 * URL guard for server-side fetches that pass a user-controlled URL into
 * `fetch()`. Without this, a forged URL could let our backend reach
 * internal services (cloud-metadata endpoints, private-network IPs,
 * loopback) — classic SSRF.
 *
 * Policy:
 *  - Scheme must be http or https
 *  - Host must match an explicit allowlist of trusted upstream domains
 *  - Hostnames that resolve to IP literals are rejected up-front;
 *    IP-form hosts (e.g. "127.0.0.1", "10.x.x.x") never get through
 *  - Localhost / private-RFC1918 / link-local labels also rejected,
 *    even when the literal hostname is e.g. "localhost"
 *
 * The DNS layer can still be tricked via DNS rebinding for fully
 * generic fetches, but every domain on the allowlist below uses
 * Cloudflare/managed CDN hosts where this isn't a realistic concern.
 */

const ALLOWED_HOST_SUFFIXES = [
  // fal.ai image-generation outputs (multiple subdomains in use)
  "fal.media",
  "fal.ai",
  "fal.run",
  // Our own Scaleway-hosted assets (e.g. profile photos used as LoRA
  // training input). Bucket URLs look like:
  //   https://<bucket>.s3.<region>.scw.cloud/...
  "scw.cloud",
] as const;

const BLOCKED_LITERAL_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "::1",
  "ip6-localhost",
  "ip6-loopback",
]);

const IP_REGEX_V4 = /^\d{1,3}(\.\d{1,3}){3}$/;
// Crude IPv6 detector — matches anything with multiple colons that
// isn't a proper hostname.
const IP_REGEX_V6 = /:.+:/;

export class UnsafeFetchUrlError extends Error {
  constructor(reason: string, public readonly url: string) {
    super(`unsafe fetch URL rejected (${reason}): ${url}`);
    this.name = "UnsafeFetchUrlError";
  }
}

/**
 * Validate that `rawUrl` is safe for the server to fetch. Throws
 * `UnsafeFetchUrlError` when the URL is not on the allowlist, scheme
 * is wrong, or the host looks like an internal target.
 */
export function assertSafeFetchUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeFetchUrlError("malformed URL", rawUrl);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new UnsafeFetchUrlError(`scheme ${parsed.protocol}`, rawUrl);
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_LITERAL_HOSTS.has(host)) {
    throw new UnsafeFetchUrlError("blocked host", rawUrl);
  }

  if (IP_REGEX_V4.test(host) || IP_REGEX_V6.test(host)) {
    throw new UnsafeFetchUrlError("IP-literal host", rawUrl);
  }

  const matches = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
  if (!matches) {
    throw new UnsafeFetchUrlError("host not on allowlist", rawUrl);
  }

  return parsed;
}
