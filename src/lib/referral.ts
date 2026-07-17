import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const REFERRAL_COOKIE = "ov_ref";
export const REFERRAL_COOKIE_MAX_AGE_DAYS = 30;

/** +1 storyCredit voor zowel invitee als (op eerste betaling) inviter. */
export const REFERRAL_BONUS_CREDITS = 1;

/** Zonder ambigue chars (0/O, 1/I/L) — leesbaar wanneer iemand 'm intypt. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Geeft de bestaande referral-code van een user, of maakt er één aan.
 * Retry-loop dekt het zeldzame geval dat een random code al bestaat.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (user?.referralCode) return user.referralCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      if (updated.referralCode) return updated.referralCode;
    } catch (err) {
      // Unique-violation op code — probeer opnieuw met andere random.
      const isUnique =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "P2002";
      if (!isUnique) throw err;
    }
  }
  throw new Error("Kon geen unieke referral-code genereren na 5 pogingen");
}

/**
 * Resolve een ingestuurde code naar de user-id van de uitnodiger.
 * Returnt null bij onbekende of ongeldige code.
 */
export async function resolveReferralCode(
  rawCode: string | null | undefined,
): Promise<string | null> {
  if (!rawCode) return null;
  const normalised = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(normalised)) return null;
  const inviter = await prisma.user.findUnique({
    where: { referralCode: normalised },
    select: { id: true },
  });
  return inviter?.id ?? null;
}

/**
 * Geeft +1 storyCredit aan de inviter wanneer de invitee net z'n eerste
 * betaling heeft gedaan. Idempotent via `referralBonusGrantedAt` — een
 * tweede aanroep doet niets. Aanroepen direct na `applyCreditsPaid` of
 * `applySubscriptionFirstPaid`.
 */
export async function maybeGrantReferralBonus(inviteeUserId: string): Promise<void> {
  const invitee = await prisma.user.findUnique({
    where: { id: inviteeUserId },
    select: {
      referredByUserId: true,
      referralBonusGrantedAt: true,
    },
  });
  if (!invitee) return;
  if (!invitee.referredByUserId) return;
  if (invitee.referralBonusGrantedAt) return;

  // Claim the bonus atomically before granting anything. The payment flow
  // can call this from the webhook and the redirect page at nearly the
  // same time (both on the invitee's first paid order); the conditional
  // updateMany lets exactly one of them win (count === 1) so the inviter
  // is never credited twice.
  const claim = await prisma.user.updateMany({
    where: { id: inviteeUserId, referralBonusGrantedAt: null },
    data: { referralBonusGrantedAt: new Date() },
  });
  if (claim.count !== 1) return;

  // Inviter kan inmiddels verwijderd zijn — de bonus is dan al als
  // "verwerkt" gemarkeerd (claim hierboven), dus gewoon stoppen.
  const inviter = await prisma.user.findUnique({
    where: { id: invitee.referredByUserId },
    select: { id: true },
  });
  if (!inviter) return;

  await prisma.user.update({
    where: { id: inviter.id },
    data: { storyCredits: { increment: REFERRAL_BONUS_CREDITS } },
  });
}
