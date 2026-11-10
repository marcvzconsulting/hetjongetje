import crypto from "node:crypto";

/**
 * Handtekening voor een gegenereerd karakterportret. De preview-route geeft
 * de tijdelijke fal-URL terug aan de browser; bij goedkeuren stuurt de
 * browser die URL weer in. Zonder controle kon een client daar elke URL op
 * een toegestane host invullen (bijvoorbeeld een foto van een ander kind in
 * een eigen bucket), die dan als referentie voor alle illustraties werd
 * opgeslagen. Het token bindt de URL aan de gebruiker, het kind en een
 * korte geldigheid; alleen een portret dat wij zelf hebben gegenereerd
 * komt er dus door. Geen databasekolom nodig.
 */
const LIFETIME_MS = 60 * 60 * 1000; // fal-URL's zijn zelf ook tijdelijk

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET must be set for preview-token signing");
  }
  return value;
}

function sign(
  userId: string,
  childId: string,
  imageUrl: string,
  expiresAt: number,
): string {
  return crypto
    .createHmac("sha256", secret())
    .update(["portrait-preview", userId, childId, imageUrl, expiresAt].join("\n"))
    .digest("base64url");
}

export function createPreviewToken(
  userId: string,
  childId: string,
  imageUrl: string,
): string {
  const expiresAt = Date.now() + LIFETIME_MS;
  return `${expiresAt}.${sign(userId, childId, imageUrl, expiresAt)}`;
}

export function verifyPreviewToken(
  token: string | null | undefined,
  userId: string,
  childId: string,
  imageUrl: string,
): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = Number(token.slice(0, dot));
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now()) return false;
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(userId, childId, imageUrl, expiresAt));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
