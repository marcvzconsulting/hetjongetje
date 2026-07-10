/**
 * Admins zijn standaard geblokkeerd voor wachtwoord-login (2FA-style
 * defence in `src/lib/auth.ts`): een gelekt admin-wachtwoord alleen mag
 * geen account-overname betekenen. Toekomstige admins houden die
 * bescherming.
 *
 * Uitzondering: e-mailadressen in `ADMIN_PASSWORD_LOGIN_ALLOWLIST`
 * (comma-separated env-var) mogen wél met e-mail + wachtwoord inloggen.
 * Bedoeld voor de eigenaar die niet elke keer op een trage magic-mail
 * wil wachten. Bewust via env — zo is de allowlist per omgeving te
 * regelen zonder code-deploy, en staat er niets hardcoded in de repo.
 */

export function getAdminPasswordLoginAllowlist(): string[] {
  const raw = process.env.ADMIN_PASSWORD_LOGIN_ALLOWLIST;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.includes("@"));
}

/** Mag deze admin met wachtwoord inloggen? Verwacht een genormaliseerd
 *  (lowercase, getrimd) e-mailadres. */
export function isAdminPasswordLoginAllowed(email: string): boolean {
  return getAdminPasswordLoginAllowlist().includes(email);
}
