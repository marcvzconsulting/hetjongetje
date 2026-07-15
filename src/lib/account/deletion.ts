import { prisma } from "@/lib/db";
import { deleteUserStorage } from "@/lib/storage/user-cleanup";
import { cancelInProgressLoraJobs } from "@/lib/ai/lora-training";
import { deleteContact } from "@/lib/email/brevo-contacts";

export type HardDeleteResult = {
  /** Aantal storage-objecten waarvoor verwijdering is aangevraagd. */
  storageRequested: number;
  /** Aantal storage-keys dat niet verwijderd kon worden. */
  storageFailed: number;
};

/**
 * Definitieve AVG-verwijdering van een gebruiker. Gedeeld door de
 * account-deletion-cron (na 30 dagen bedenktijd) en de admin-knop op
 * /admin/users/[id].
 *
 * Volgorde:
 *   1. cancel in-flight LoRA training (zodat we niet betalen voor een
 *      job die naar een niet-bestaand profiel gaat wijzen)
 *   2. delete bucket assets (foto's, illustraties, boek-PDF's, previews)
 *   3. cascade-delete de DB-rij (children, stories, books, etc. —
 *      Orders blijven staan met userId=null: fiscale bewaarplicht)
 *   4. wipe Brevo-contact (nieuwsbrief / transactioneel)
 *   5. AVG-restanten op e-mailadres: contactberichten, losse
 *      nieuwsbrief-aanmeldingen, afmeld-redenen en e-maillogs
 *
 * Alle cleanup-stappen zijn best-effort en gooien nooit — alleen de
 * `prisma.user.delete` zelf mag falen (dan is er echt niets verwijderd
 * en kan de caller het later opnieuw proberen).
 *
 * Note on fal.ai: getrainde LoRA-modelbestanden kunnen niet via de
 * publieke API verwijderd worden. De URL verdwijnt uit onze DB tijdens
 * de cascade zodat het bestand nergens meer gerefereerd wordt; fal.ai
 * garbage-collect het uiteindelijk zelf.
 */
export async function hardDeleteUser(userId: string): Promise<HardDeleteResult> {
  // E-mailadres vóór de delete vastpakken — nodig voor stap 4 en 5.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  await cancelInProgressLoraJobs(userId);

  const cleanup = await deleteUserStorage(userId);
  if (cleanup.error) {
    console.error(
      `[account-delete] storage cleanup error for user ${userId}: ${cleanup.error}`
    );
  } else if (cleanup.failed.length > 0) {
    console.error(
      `[account-delete] ${cleanup.failed.length}/${cleanup.requested} storage keys failed to delete for user ${userId}:`,
      cleanup.failed
    );
  } else {
    console.log(
      `[account-delete] removed ${cleanup.requested} storage objects for user ${userId}`
    );
  }

  // Prisma cascade deletes children, stories, pages, books, rate limits.
  // Orders houden via onDelete: SetNull hun rij (fiscale bewaarplicht).
  await prisma.user.delete({ where: { id: userId } });

  if (user?.email) {
    const email = user.email;

    // AVG: ook het contact in Brevo wissen. Best-effort.
    try {
      await deleteContact(email);
    } catch (err) {
      console.error("[account-delete] Brevo contact deletion failed", err);
    }

    // AVG-restanten die niet aan de user-rij hangen maar wel diens
    // e-mailadres bevatten. Elk apart best-effort: één mislukte stap
    // mag de rest niet blokkeren.
    try {
      await prisma.contactMessage.deleteMany({ where: { email } });
    } catch (err) {
      console.error("[account-delete] contact messages cleanup failed", err);
    }
    try {
      await prisma.newsletterSignup.deleteMany({ where: { email } });
    } catch (err) {
      console.error("[account-delete] newsletter signup cleanup failed", err);
    }
    try {
      await prisma.newsletterUnsubscribeReason.deleteMany({ where: { email } });
    } catch (err) {
      console.error(
        "[account-delete] newsletter unsubscribe reasons cleanup failed",
        err
      );
    }
    try {
      await prisma.emailLog.deleteMany({ where: { toEmail: email } });
    } catch (err) {
      console.error("[account-delete] email log cleanup failed", err);
    }
  }

  return {
    storageRequested: cleanup.requested,
    storageFailed: cleanup.failed.length,
  };
}
