import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { buildAppUrl } from "@/lib/url";

const TOKEN_BYTES = 32;
const LIFETIME_MS = 15 * 60 * 1000; // 15 minutes — email is the second factor

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create a one-shot login token. Returns the raw token to put in the
 * email link; only its SHA-256 hash is persisted. All previous unused
 * tokens for the same user are invalidated so an attacker can't sit on
 * an old leaked email forever.
 */
export async function createMagicLinkToken(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + LIFETIME_MS);

  await prisma.$transaction([
    prisma.magicLinkToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.magicLinkToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

/**
 * Validate and consume a magic-link token. Returns the userId on success
 * or null if the token is unknown, used, or expired. Marks the token
 * used in the same transaction so it can never be replayed.
 */
export async function consumeMagicLinkToken(
  token: string,
): Promise<string | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);

  // Atomic claim: marks usedAt only if still null AND not expired.
  const result = await prisma.magicLinkToken.updateMany({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  });
  if (result.count === 0) return null;

  const record = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });
  return record?.userId ?? null;
}

export async function buildMagicLinkUrl(token: string): Promise<string> {
  return buildAppUrl(`/auth/magic?token=${encodeURIComponent(token)}`);
}
