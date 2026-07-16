/**
 * Admin-melding over het fal.ai-tegoed. Twee smaken:
 *  - "low": de dagelijkse cron ziet dat het saldo onder de drempel zit
 *  - "exhausted": een generatie faalde live op een leeg/geblokkeerd
 *    account (403 "Exhausted balance")
 * Niet editable via /admin/email-templates — interne ops-mail.
 */

type Opts = {
  kind: "low" | "exhausted";
  /** Actueel saldo in dollars; null als het niet op te vragen was. */
  balance: number | null;
  /** Drempel (alleen relevant voor kind="low"). */
  threshold?: number;
  /** Waar het misging (alleen relevant voor kind="exhausted"), bv.
   *  "verhaal-illustraties" of "karakterportret". */
  context?: string;
};

const BILLING_URL = "https://fal.ai/dashboard/billing";

export function buildAdminFalBalanceMail(opts: Opts): {
  subject: string;
  html: string;
  text: string;
} {
  const balanceStr =
    opts.balance !== null ? `$${opts.balance.toFixed(2)}` : "onbekend";
  const subject =
    opts.kind === "exhausted"
      ? "[Ops] fal.ai-tegoed is OP — illustraties falen nu"
      : `[Ops] fal.ai-tegoed bijna op (${balanceStr})`;

  const impact =
    opts.kind === "exhausted"
      ? `Een generatie (${opts.context ?? "onbekend"}) is zojuist mislukt omdat fal.ai het account blokkeert. Klanten krijgen nu verhalen zónder illustraties (partial + credit terug); portretten en LoRA-trainingen falen helemaal.`
      : `Het saldo zit onder de drempel van $${(opts.threshold ?? 5).toFixed(2)}. Nog even en klanten krijgen verhalen zonder illustraties.`;

  const html = `<!doctype html>
<html lang="nl">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f1e3a;">
  <h1 style="font-size: 18px; margin: 0 0 12px;">${
    opts.kind === "exhausted"
      ? "fal.ai-tegoed is op"
      : "fal.ai-tegoed bijna op"
  }</h1>
  <p style="font-size: 14px; line-height: 1.55; margin: 0 0 16px;">${impact}</p>
  <table style="font-size: 13px; border-collapse: collapse; margin: 0 0 20px;">
    <tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Saldo</td><td><strong>${balanceStr}</strong></td></tr>
    ${
      opts.kind === "low"
        ? `<tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Drempel</td><td>$${(opts.threshold ?? 5).toFixed(2)}</td></tr>`
        : `<tr><td style="padding: 4px 12px 4px 0; color: #6b6a82;">Faalde bij</td><td>${opts.context ?? "onbekend"}</td></tr>`
    }
  </table>
  <p style="font-size: 14px;">
    <a href="${BILLING_URL}" style="color: #8a7340;">Tegoed opwaarderen bij fal.ai →</a>
  </p>
  <p style="font-size: 12px; color: #6b6a82; margin-top: 24px; line-height: 1.5;">
    Tip: zet auto top-up aan in het fal.ai-billingdashboard, dan verdwijnt
    deze mail voorgoed.
  </p>
</body></html>`;

  const text = `${subject}

${impact}

Saldo: ${balanceStr}
Opwaarderen: ${BILLING_URL}`;

  return { subject, html, text };
}
