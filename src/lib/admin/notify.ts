/**
 * Wie krijgt admin-notificaties? Default: admin@ + info@. Te overrulen
 * via env-var `ADMIN_NOTIFY_EMAILS` (comma-separated) zonder dat we
 * een code-deploy nodig hebben.
 *
 * Het doel: één bouncing mailbox mag nooit een gemiste registratie of
 * andere admin-actie betekenen. Daarom wordt de notificatie naar elke
 * adres apart verstuurd — een failure van de ene blokkeert de andere
 * niet.
 */

const DEFAULT_ADMIN_NOTIFY_EMAILS = [
  "admin@onsverhaaltje.nl",
  "info@onsverhaaltje.nl",
];

export function getAdminNotifyEmails(): string[] {
  const raw = process.env.ADMIN_NOTIFY_EMAILS ?? process.env.ADMIN_EMAIL;
  if (!raw) return DEFAULT_ADMIN_NOTIFY_EMAILS;
  const emails = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.includes("@"));
  return emails.length > 0 ? emails : DEFAULT_ADMIN_NOTIFY_EMAILS;
}
