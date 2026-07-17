/**
 * Admin-melding over het ElevenLabs-tekens-quotum (voorlezen). Twee
 * smaken, naar het model van admin-fal-balance:
 *  - "low": de dagelijkse cron ziet dat het restant onder de drempel zit
 *  - "exhausted": een voorlees-generatie faalde live op een quota-fout
 * Niet editable via /admin/email-templates — interne ops-mail.
 */
import type { ElevenLabsUsage } from "@/lib/ai/elevenlabs-quota";

type Opts = {
  kind: "low" | "exhausted";
  usage: ElevenLabsUsage | null;
  /** Drempel in tekens (alleen relevant voor kind="low"). */
  threshold?: number;
  /** Waar het misging (alleen relevant voor kind="exhausted"). */
  context?: string;
};

const SUBSCRIPTION_URL = "https://elevenlabs.io/app/subscription";

function fmt(n: number): string {
  return n.toLocaleString("nl-NL");
}

export function buildAdminElevenLabsQuotaMail(opts: Opts): {
  subject: string;
  html: string;
  text: string;
} {
  const usageStr = opts.usage
    ? `${fmt(opts.usage.remaining)} van ${fmt(opts.usage.limit)} tekens over`
    : "verbruik onbekend";
  const resetStr = opts.usage?.resetAt
    ? opts.usage.resetAt.toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
      })
    : null;

  const subject =
    opts.kind === "exhausted"
      ? "[Ops] ElevenLabs-quotum is OP — voorlezen faalt nu"
      : `[Ops] ElevenLabs-quotum bijna op (${usageStr})`;

  const impact =
    opts.kind === "exhausted"
      ? `Een voorlees-generatie (${opts.context ?? "onbekend"}) is zojuist mislukt op een quota- of abonnementsfout van ElevenLabs. Klanten kunnen geen nieuwe voorlees-stemmen genereren; bestaande audio blijft gewoon afspeelbaar.`
      : `Het tekens-quotum zit onder de drempel van ${fmt(opts.threshold ?? 5000)} tekens. Eén verhaal kost grofweg 1.000-1.500 tekens per stem.`;

  const resetLine = resetStr
    ? `<tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Reset</td><td>${resetStr}</td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="nl">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f1e3a;">
  <h1 style="font-size: 18px; margin: 0 0 12px;">${
    opts.kind === "exhausted"
      ? "ElevenLabs-quotum is op"
      : "ElevenLabs-quotum bijna op"
  }</h1>
  <p style="font-size: 14px; line-height: 1.55; margin: 0 0 16px;">${impact}</p>
  <table style="font-size: 13px; border-collapse: collapse; margin: 0 0 20px;">
    <tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Stand</td><td><strong>${usageStr}</strong></td></tr>
    ${resetLine}
  </table>
  <p style="font-size: 14px;">
    <a href="${SUBSCRIPTION_URL}" style="color: #8a7340;">Abonnement bekijken/upgraden bij ElevenLabs →</a>
  </p>
  <p style="font-size: 12px; color: #6b6a82; margin-top: 24px; line-height: 1.5;">
    Starter = 30k tekens/mnd; Creator ($22/mnd) = 100k. Het quotum reset
    maandelijks vanzelf — upgraden is alleen nodig als dit vaker gebeurt.
  </p>
</body></html>`;

  const text = `${subject}

${impact}

Stand: ${usageStr}${resetStr ? `\nReset: ${resetStr}` : ""}
Abonnement: ${SUBSCRIPTION_URL}`;

  return { subject, html, text };
}
