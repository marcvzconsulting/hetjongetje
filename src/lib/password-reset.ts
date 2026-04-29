import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { buildAppUrl } from "@/lib/url";
import {
  validatePassword,
  type PasswordPolicyReason,
} from "@/lib/auth/password-policy";

const TOKEN_BYTES = 32;
const USER_LIFETIME_MS = 60 * 60 * 1000; // 1 hour
const ADMIN_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create a password reset token for a user. Returns the raw token that goes
 * into the reset link — the database only stores a SHA-256 hash of it.
 *
 * All previous unused tokens for this user are invalidated.
 */
export async function createPasswordResetToken(opts: {
  userId: string;
  createdByAdminId?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const lifetime = opts.createdByAdminId ? ADMIN_LIFETIME_MS : USER_LIFETIME_MS;
  const expiresAt = new Date(Date.now() + lifetime);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: opts.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: opts.userId,
        tokenHash,
        expiresAt,
        createdByAdminId: opts.createdByAdminId ?? null,
      },
    }),
  ]);

  return { token, expiresAt };
}

/**
 * Validate a raw token. Returns the associated userId if the token exists,
 * is not expired, and has not been used. Returns null otherwise.
 */
export async function validateResetToken(
  token: string
): Promise<{ userId: string; tokenId: string } | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  return { userId: record.userId, tokenId: record.id };
}

/**
 * Consume a reset token and set a new password for the user. Invalidates
 * the token and any other outstanding tokens for the same user.
 */
export async function consumeTokenAndSetPassword(
  token: string,
  newPassword: string
): Promise<
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid_or_expired" | PasswordPolicyReason }
> {
  const validated = await validateResetToken(token);
  if (!validated) {
    return { ok: false, reason: "invalid_or_expired" };
  }
  const policy = validatePassword(newPassword);
  if (!policy.ok) {
    return { ok: false, reason: policy.reason };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: validated.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: validated.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, userId: validated.userId };
}

export async function buildResetUrl(token: string): Promise<string> {
  return buildAppUrl(`/reset-password?token=${encodeURIComponent(token)}`);
}
