import crypto from "node:crypto";

/**
 * Handtekening voor de bevestigingslink uit de registratiemail. Geen
 * databasetabel nodig: het token bindt gebruiker en e-mailadres aan een
 * vervaldatum met AUTH_SECRET. Het token alleen is niet genoeg om te
 * bevestigen: de route eist daarnaast dat dezelfde gebruiker is ingelogd.
 */
const LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET must be set for verify-email-token signing");
  }
  return value;
}

function sign(userId: string, email: string, expiresAt: number): string {
  return crypto
    .createHmac("sha256", secret())
    .update(["verify-email", userId, email.toLowerCase(), expiresAt].join("\n"))
    .digest("base64url");
}

export function createVerifyEmailToken(userId: string, email: string): string {
  const expiresAt = Date.now() + LIFETIME_MS;
  return `${expiresAt}.${sign(userId, email, expiresAt)}`;
}

export function verifyVerifyEmailToken(
  token: string | null | undefined,
  userId: string,
  email: string,
): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(token.slice(0, dot));
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(userId, email, expiresAt));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
