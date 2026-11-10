import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/**
 * Registreren met een wachtwoord bewijst niet dat het e-mailadres van de
 * aanmelder is. Zonder deze stap kan iemand het adres van een ouder vooraf
 * registreren met een eigen wachtwoord; logt die ouder later in met Google
 * of een magic link, dan komt die in hetzelfde account terecht en kan de
 * eerste persoon met het wachtwoord meelezen met de kindgegevens.
 *
 * Daarom: de eerste keer dat iemand aantoonbaar bij de mailbox kan (Google
 * of magic link) terwijl het account nog niet geverifieerd is, vervangen we
 * het wachtwoord door een willekeurige waarde en maken we alle bestaande
 * sessies ongeldig. De echte eigenaar merkt daar niets van, behalve dat een
 * eerder gekozen wachtwoord opnieuw moet worden ingesteld via "wachtwoord
 * vergeten".
 *
 * Accounts van vóór deze kolom hebben `emailVerifiedAt = null` en krijgen
 * dezelfde behandeling bij hun eerstvolgende Google- of magic-link-login.
 * Een eerder aangevraagde magic link of resetlink telt bewust niet als
 * bewijs: aanvragen kan iedereen, en een nieuwe aanvraag markeert de vorige
 * token ook als gebruikt.
 */
export async function markEmailVerified(user: {
  id: string;
  emailVerifiedAt: Date | null;
  sessionVersion: number;
}): Promise<{ sessionVersion: number; passwordReplaced: boolean }> {
  if (user.emailVerifiedAt) {
    return { sessionVersion: user.sessionVersion, passwordReplaced: false };
  }

  const placeholderHash = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    12,
  );
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      passwordHash: placeholderHash,
      sessionVersion: { increment: 1 },
    },
    select: { sessionVersion: true },
  });
  await releasePendingStarterCredits(user.id);
  console.warn(
    `[auth] eerste verificatie van account ${user.id}: wachtwoord vervangen en sessies ingetrokken`,
  );
  return { sessionVersion: updated.sessionVersion, passwordReplaced: true };
}

/**
 * Schuif klaarstaande startcredits door naar het tegoed. Atomair en
 * idempotent: de voorwaarde op het gelezen aantal zorgt dat twee
 * gelijktijdige bevestigingen het tegoed maar één keer bijschrijven.
 */
export async function releasePendingStarterCredits(
  userId: string,
): Promise<number> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { pendingStarterCredits: true },
  });
  const pending = row?.pendingStarterCredits ?? 0;
  if (pending <= 0) return 0;
  const res = await prisma.user.updateMany({
    where: { id: userId, pendingStarterCredits: pending },
    data: {
      storyCredits: { increment: pending },
      pendingStarterCredits: 0,
    },
  });
  return res.count === 1 ? pending : 0;
}

/**
 * Bevestiging via de link uit de bevestigingsmail, aangeklikt terwijl de
 * gebruiker zelf is ingelogd (zie app/auth/verify/route.ts). Dat bewijst
 * zowel kennis van het wachtwoord als toegang tot de mailbox, dus het
 * wachtwoord blijft staan.
 */
export async function confirmEmailForSession(userId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });
  await releasePendingStarterCredits(userId);
}
