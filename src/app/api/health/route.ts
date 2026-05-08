import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Public health-check endpoint voor uptime-monitoring (BetterStack /
 * UptimeRobot / pingdom). Ontworpen om elke minuut gepingd te worden:
 * licht, geen auth, geen externe API-calls.
 *
 * Wat we WEL checken:
 *   - DB-connectiviteit (één SELECT 1)
 *   - Process is up genoeg om JSON terug te geven
 *
 * Wat we NIET checken:
 *   - Mollie / Anthropic / fal.ai — die hebben eigen status-pagina's,
 *     en als één van hen even traag is willen we niet dat onze
 *     uptime-monitor false-positives geeft
 *   - Authenticatie — uptime-services moeten dit zonder credentials
 *     kunnen bereiken
 *
 * Response codes:
 *   200 → alles ok
 *   503 → DB onbereikbaar (uptime-monitor moet alarmeren)
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  let dbError: string | undefined;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "unknown";
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    ts: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    db: {
      ok: dbOk,
      latencyMs: dbLatencyMs,
      ...(dbError ? { error: dbError.slice(0, 200) } : {}),
    },
    // Vercel injecteert deze automatisch in productie. Lokaal undefined.
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    region: process.env.VERCEL_REGION,
    totalLatencyMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
