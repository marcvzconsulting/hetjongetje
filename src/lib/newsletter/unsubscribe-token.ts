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
  return crypto
    .createHmac("sha256", getSecret())
    .update(`unsubscribe:${email.toLowerCase()}`)
    .digest("base64url");
}

export function verifyUnsubscribeToken(
  email: string,
  token: string
): boolean {
  if (!email || !token) return false;
  const expected = signUnsubscribeToken(email);
  // Constant-time compare to prevent timing attacks.
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
