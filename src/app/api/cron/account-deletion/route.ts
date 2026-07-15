import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hardDeleteUser } from "@/lib/account/deletion";

// Per user: LoRA-cancel + storage-deletes + DB-cascade + Brevo. Ruimer
// dan de default zodat één trage bucket-call de batch niet nekt.
export const maxDuration = 120;

/**
 * Dagelijkse cron: voer verwijderverzoeken uit waarvan de 30 dagen
 * bedenktijd voorbij is. De aanvraag zelf (deletionRequestedAt) wordt
 * gezet door requestAccountDeletionAction; herstel via /verwijdering
 * zet 'm terug op null en haalt de user hier dus weer uit.
 *
 * Beveiliging: Vercel cron stuurt een `Authorization: Bearer
 * <CRON_SECRET>`-header. Routes die per ongeluk publiek bereikbaar zijn
 * moeten weigeren.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - 30 * 86_400_000);

  const candidates = await prisma.user.findMany({
    where: {
      deletionRequestedAt: { lte: cutoff },
      // Extra vangnet — admins kunnen sowieso geen verzoek indienen.
      role: "user",
    },
    select: { id: true, email: true },
    take: 50,
  });

  let deleted = 0;
  let failed = 0;
  for (const user of candidates) {
    try {
      await hardDeleteUser(user.id);
      console.log(
        `[cron] account-deletion: user ${user.id} definitief verwijderd`,
      );
      deleted++;
    } catch (err) {
      console.error(
        `[cron] account-deletion for user ${user.id} failed`,
        err instanceof Error ? err.message : err,
      );
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    deleted,
    failed,
    trigger: "account-deletion",
  });
}
