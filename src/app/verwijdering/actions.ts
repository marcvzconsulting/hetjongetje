"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { subscribeToNewsletter } from "@/lib/email/brevo-contacts";

/**
 * "Herstel mijn account": annuleert een lopend verwijderverzoek binnen
 * de 30-dagen-bedenktijd. Zet `deletionRequestedAt` terug op null zodat
 * het slot van de (app)-layout verdwijnt en de mails weer meelopen.
 *
 * Het bij de aanvraag opgezegde Mollie-abonnement start NIET opnieuw —
 * dat kan technisch niet zonder nieuwe betaling; de gebruiker leest dit
 * op de pagina en kan via /subscribe opnieuw abonneren.
 */
export async function restoreAccountAction() {
  const userId = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      deletionRequestedAt: true,
      newsletterOptIn: true,
    },
  });
  if (!user) redirect("/login");

  if (user.deletionRequestedAt) {
    await prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: null },
    });

    // Bij de aanvraag is het Brevo-contact van de nieuwsbrieflijst
    // gehaald; stond de opt-in aan, dan zetten we 'm best-effort terug.
    if (user.newsletterOptIn) {
      try {
        await subscribeToNewsletter({ email: user.email, name: user.name });
      } catch (err) {
        console.error(
          "[account-restore] Brevo newsletter re-subscribe failed",
          err,
        );
      }
    }
  }

  // /dashboard kent (nog) geen querystring-meldingen, dus een kale
  // redirect — de bibliotheek die er weer gewoon staat, ís de melding.
  redirect("/dashboard");
}
