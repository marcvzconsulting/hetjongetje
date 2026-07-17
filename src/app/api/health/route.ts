import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Public health-check endpoint voor uptime-monitoring (BetterStack /
 * UptimeRobot / pingdom). Licht, geen auth, geen externe API-calls.
 *
 * BELANGRIJK — Neon free tier: een DB-hit bij ELKE minuut-ping houdt de
 * database permanent wakker en verbrandt zo het gratis compute-quotum.
 * Daarom is de DB-check nu OPT-IN via `?deep=1`. Configureer je monitor
 * zo dat de meeste pings de lichte variant raken (proces-up, geen DB) en
 * een aparte, minder frequente check `?deep=1` gebruikt voor DB-status.
 *
 * Wat we NIET checken: Mollie / Anthropic / fal.ai (eigen statuspagina's),
 * authenticatie (monitors hebben geen credentials).
 *
 * Response codes:
 *   200 → ok
 *   503 → alleen bij `deep=1` wanneer de DB onbereikbaar is
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const deep = new URL(request.url).searchParams.get("deep") === "1";

  let dbOk: boolean | null = null;
  let dbLatencyMs: number | null = null;
  let dbError: string | undefined;

  if (deep) {
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
      dbOk = true;
    } catch (err) {
      dbOk = false;
      dbError = err instanceof Error ? err.message : "unknown";
    }
  }

  const healthy = dbOk !== false; // null (shallow) or true → healthy
  const body = {
    status: healthy ? "ok" : "degraded",
    ts: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    db: deep
      ? {
          checked: true,
          ok: dbOk,
          latencyMs: dbLatencyMs,
          ...(dbError ? { error: dbError.slice(0, 200) } : {}),
        }
      : { checked: false },
    // Vercel injecteert deze automatisch in productie. Lokaal undefined.
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    region: process.env.VERCEL_REGION,
    totalLatencyMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
