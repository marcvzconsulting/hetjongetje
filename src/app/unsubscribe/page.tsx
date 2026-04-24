import { ContentPage, Lead, P } from "@/components/v2/landing/ContentPage";
import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";
import { deleteContact } from "@/lib/email/brevo-contacts";

type SearchParams = Promise<{ email?: string; token?: string }>;

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { email: rawEmail, token } = await searchParams;
  const email = (rawEmail ?? "").trim().toLowerCase();

  const valid = email && token && verifyUnsubscribeToken(email, token);

  if (!valid) {
    return (
      <ContentPage
        number="A5"
        eyebrow="Uitschrijven"
        title={
          <>
            Deze link werkt{" "}
            <span style={{ fontStyle: "italic" }}>niet meer.</span>
          </>
        }
      >
        <Lead>
          De uitschrijflink lijkt incompleet of beschadigd te zijn. Mail ons
          op{" "}
          <a
            href="mailto:info@onsverhaaltje.nl"
            style={{ color: "inherit" }}
          >
            info@onsverhaaltje.nl
          </a>{" "}
          en we halen je handmatig van de lijst.
        </Lead>
      </ContentPage>
    );
  }

  // Side-effects: flip user flag, mark signup row, wipe Brevo contact.
  await prisma.user.updateMany({
    where: { email, newsletterOptIn: true },
    data: { newsletterOptIn: false, newsletterOptInAt: null },
  });

  await prisma.newsletterSignup.updateMany({
    where: { email, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });

  try {
    await deleteContact(email);
  } catch (err) {
    console.error("[unsubscribe] Brevo delete failed", err);
  }

  return (
    <ContentPage
      number="A5"
      eyebrow="Uitschrijven"
      title={
        <>
          Je bent{" "}
          <span style={{ fontStyle: "italic" }}>uitgeschreven.</span>
        </>
      }
    >
      <Lead>Geen mails meer van ons. Bedankt voor de tijd dat je meelas.</Lead>
      <P>
        Mocht je je bedenken: aanmelden kan altijd weer onderaan elke pagina
        op{" "}
        <a href="https://onsverhaaltje.nl" style={{ color: "inherit" }}>
          onsverhaaltje.nl
        </a>
        .
      </P>
    </ContentPage>
  );
}
