/**
 * Centralised password policy.
 *
 * Modern NIST guidance (SP 800-63B) prefers length + banlist over
 * composition rules — they hurt UX without meaningfully blocking real
 * attacks. We aim for "long enough that brute-force is hopeless, plus
 * not blatantly the top of every leaked-password list".
 */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128; // bcrypt truncates after 72 bytes anyway

/**
 * Tiny banlist — the top of every credential-stuffing list. Not meant
 * to be exhaustive (a serious banlist would be several MB). Just enough
 * to reject the most thoughtless choices.
 */
const BANLIST = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "qwerty1234",
  "letmein123",
  "iloveyou1",
  "welcome123",
  "admin1234",
  "abc123456",
  "passw0rd",
  "p@ssword1",
  "onsverhaaltje",
  "hetjongetje",
]);

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; reason: PasswordPolicyReason };

export type PasswordPolicyReason =
  | "too_short"
  | "too_long"
  | "banned"
  | "all_same";

/**
 * Validate a candidate password against our policy.
 *
 * The function is intentionally side-effect-free and synchronous so it
 * can be reused from both server actions and API routes without an
 * async boundary.
 */
export function validatePassword(password: string): PasswordPolicyResult {
  if (password.length < MIN_PASSWORD_LENGTH) return { ok: false, reason: "too_short" };
  if (password.length > MAX_PASSWORD_LENGTH) return { ok: false, reason: "too_long" };

  // All-same-character passwords ("aaaaaaaaaa") technically pass length
  // but offer no entropy. Cheap to reject explicitly.
  if (new Set(password).size <= 2) return { ok: false, reason: "all_same" };

  if (BANLIST.has(password.toLowerCase())) return { ok: false, reason: "banned" };

  return { ok: true };
}

/** Human-readable Dutch error message for a policy reason. */
export function passwordPolicyMessage(reason: PasswordPolicyReason): string {
  switch (reason) {
    case "too_short":
      return `Wachtwoord moet minimaal ${MIN_PASSWORD_LENGTH} tekens zijn`;
    case "too_long":
      return `Wachtwoord mag maximaal ${MAX_PASSWORD_LENGTH} tekens zijn`;
    case "banned":
      return "Dit wachtwoord komt veel voor en is niet veilig genoeg. Kies iets unieks.";
    case "all_same":
      return "Wachtwoord is te eenvoudig. Gebruik meer verschillende tekens.";
  }
}
