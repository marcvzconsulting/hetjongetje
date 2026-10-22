import { timingSafeEqual } from "crypto";

/**
 * Constant-time string-vergelijking voor secrets (webhook-/cron-tokens).
 * Voorkomt dat een aanvaller een secret byte-voor-byte uit response-timing
 * afleidt. Een lengteverschil lekt nog (onvermijdelijk), de inhoud niet.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
