import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/security/secure-compare";

/**
 * Verifieer de `Authorization: Bearer <CRON_SECRET>`-header van een
 * cron-request. Geeft een 403-Response terug wanneer de auth faalt, of
 * `null` wanneer de request door mag. Fail-closed als CRON_SECRET ontbreekt.
 *
 * Gebruik in een cron-route:
 *   const unauthorized = verifyCronAuth(request);
 *   if (unauthorized) return unauthorized;
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!expected || !provided || !safeEqual(provided, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
