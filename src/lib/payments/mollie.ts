import { createMollieClient, type MollieClient } from "@mollie/api-client";

/**
 * Lazy-initialised Mollie client.
 *
 * The SDK reads the API key on construction, so we pull it from the env at
 * first use rather than at module-load time. That keeps build-time imports
 * happy in environments where MOLLIE_API_KEY isn't set (CI, local without
 * .env.local, etc.).
 */
let _client: MollieClient | null = null;

export function getMollieClient(): MollieClient {
  if (_client) return _client;
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "MOLLIE_API_KEY is not configured. Add it to .env.local for dev or to Vercel env vars for production.",
    );
  }
  _client = createMollieClient({ apiKey });
  return _client;
}

/**
 * Are we hitting Mollie's test environment? Useful for showing test-mode
 * banners in the UI and disabling certain destructive actions in dev.
 */
export function isMollieTestMode(): boolean {
  return (process.env.MOLLIE_API_KEY ?? "").startsWith("test_");
}

/**
 * Format a euro-cents amount as the string Mollie expects in `amount.value`
 * — always two decimals, dot separator, e.g. 1295 → "12.95".
 */
export function centsToMollieAmount(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`Invalid cents amount: ${cents}`);
  }
  const euros = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${euros}.${remainder.toString().padStart(2, "0")}`;
}
