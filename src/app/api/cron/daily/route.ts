import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { finalizeStaleLoraTrainings } from "@/lib/ai/lora-training";

// Housekeeping can touch many rows / poll fal — give it headroom.
export const maxDuration = 120;

/**
 * Daily maintenance dispatcher. Bundles the "keep the house clean" tasks
 * that don't each warrant their own cron slot:
 *   1. Enforce the LoRA-photo retention promise (finalize stuck trainings
 *      and wipe their photos even if the parent never re-opened the page).
 *   2. Prune e-mail logs older than 12 months (retention / minimisation).
 *   3. Prune stale rate-limit rows (>30 days) so the table can't grow
 *      unbounded.
 *
 * Every task is isolated in its own try/catch so one failure never blocks
 * the others. Guarded by CRON_SECRET, fail-closed when the env is unset.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Record<string, unknown> = {};

  // 1. LoRA training input retention.
  try {
    results.lora = await finalizeStaleLoraTrainings();
  } catch (err) {
    results.loraError = err instanceof Error ? err.message : String(err);
  }

  // 2. Prune old e-mail logs (12 months).
  try {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const del = await prisma.emailLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    results.emailLogsPruned = del.count;
  } catch (err) {
    results.emailLogsError = err instanceof Error ? err.message : String(err);
  }

  // 3. Prune stale rate-limit rows (>30 days). Raw table, raw delete.
  try {
    const n = await prisma.$executeRaw`
      DELETE FROM rate_limits
      WHERE window_start < NOW() - INTERVAL '30 days'
    `;
    results.rateLimitsPruned = n;
  } catch (err) {
    results.rateLimitsError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({ ok: true, ...results });
}
