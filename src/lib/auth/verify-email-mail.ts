import { sendMail } from "@/lib/email/client";
import { buildVerifyEmailMail } from "@/lib/email/templates/verify-email";
import { buildTrustedUrl } from "@/lib/url";
import { createVerifyEmailToken } from "@/lib/auth/verify-email-token";

/**
 * Verstuur de bevestigingsmail. Mag de registratie nooit breken: een
 * mislukte mail wordt gelogd en de gebruiker kan hem vanaf het dashboard
 * opnieuw aanvragen.
 */
export async function sendVerifyEmailMail(user: {
  id: string;
  email: string;
  name: string | null;
  credits: number;
}): Promise<boolean> {
  try {
    const token = createVerifyEmailToken(user.id, user.email);
    // Alleen de vertrouwde basis-URL uit de env, nooit een request-header.
    const verifyUrl = buildTrustedUrl(
      `/auth/verify?token=${encodeURIComponent(token)}`,
    );
    const mail = buildVerifyEmailMail({
      name: user.name,
      verifyUrl,
      credits: user.credits,
    });
    await sendMail({
      to: user.email,
      toName: user.name ?? undefined,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tags: ["verify-email"],
    });
    return true;
  } catch (err) {
    console.error("[auth] bevestigingsmail mislukt", err);
    return false;
  }
}
