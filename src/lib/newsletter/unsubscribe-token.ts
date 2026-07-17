import crypto from "node:crypto";

/**
 * Stateless HMAC-signed unsubscribe tokens. Generated when we send a
 * confirmation mail; verified when the recipient clicks the unsubscribe
 * link. No DB row needed — knowing AUTH_SECRET + email is the proof.
 */

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET must be set for unsubscribe-token signing/verification"
    );
  }
  return secret;
}

export function signUnsubscribeToken(email: string): string {
  return signWithPurpose("unsubscribe", email);
}

export function verifyUnsubscribeToken(
  email: string,
  token: string
): boolean {
  return verifyWithPurpose("unsubscribe", email, token);
}

/**
 * One-click herinschrijven vanuit de "Schrijf me weer in"-knop in de
 * bevestigingsmail. Aparte purpose-string zorgt dat een unsubscribe-
 * token niet hergebruikt kan worden voor het terugzetten van de opt-in.
 */
export function signResubscribeToken(email: string): string {
  return signWithPurpose("resubscribe", email);
}

export function verifyResubscribeToken(email: string, token: string): boolean {
  return verifyWithPurpose("resubscribe", email, token);
}

/**
 * Retention-reminder opt-out, keyed on the user id. Without a signature
 * anyone who knows a user's UUID could opt them out; the HMAC ties the
 * link to AUTH_SECRET so only links WE generated are honoured.
 */
export function signReminderOptOutToken(userId: string): string {
  return signWithPurpose("reminder-optout", userId);
}

export function verifyReminderOptOutToken(
  userId: string,
  token: string,
): boolean {
  return verifyWithPurpose("reminder-optout", userId, token);
}

function signWithPurpose(purpose: string, email: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${purpose}:${email.toLowerCase()}`)
    .digest("base64url");
}

function verifyWithPurpose(
  purpose: string,
  email: string,
  token: string,
): boolean {
  if (!email || !token) return false;
  const expected = signWithPurpose(purpose, email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
