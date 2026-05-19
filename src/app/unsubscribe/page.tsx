import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ContentPage, Lead, P } from "@/components/v2/landing/ContentPage";
import { V2 } from "@/components/v2/tokens";
import { prisma } from "@/lib/db";
import {
  verifyUnsubscribeToken,
  signResubscribeToken,
} from "@/lib/newsletter/unsubscribe-token";
import { deleteContact } from "@/lib/email/brevo-contacts";
import { sendMail } from "@/lib/email/client";
import { buildAppUrl } from "@/lib/url";
import { buildNewsletterUnsubscribedMail } from "@/lib/email/templates/newsletter-unsubscribed";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { submitUnsubscribeReasonAction } from "./actions";

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

type SearchParams = Promise<{
  email?: string;
  token?: string;
  thanks?: string;
  error?: string;
}>;

const REASON_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: "te_vaak", label: "Ik krijg te veel mails", hint: "Frequentie te hoog" },
  { value: "niet_relevant", label: "De inhoud past niet bij me" },
  { value: "nooit_aangemeld", label: "Ik heb me hier nooit voor aangemeld", hint: "Spam-melding" },
  { value: "tijdelijk", label: "Tijdelijke pauze", hint: "Misschien kom ik later terug" },
  { value: "anders", label: "Anders, namelijk:" },
];

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawEmail = params.email ?? "";
  const token = params.token ?? "";
  const email = rawEmail.trim().toLowerCase();

  // Per-IP rate-limit zodat brute-forcen van tokens (om bv. iemand
  // ongewenst uit te schrijven of de email-bestaande-test te draaien)
  // niet werkt. 60/min is genoeg voor normale klik+refresh+submit, te
  // krap voor scanning. We laten 'm als notFound zien zodat een
  // attacker niet weet dat ze tegen de muur lopen.
  const ip = await getClientIp();
  const rl = await rateLimit({
    key: `unsubscribe-view:${ip}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.allowed) notFound();

  const valid = email && token && verifyUnsubscribeToken(email, token);

  // ── Ongeldige link ─────────────────────────────────────────
  if (!valid) {
    return (
      <ContentPage
        eyebrow="Uitschrijven"
        title={
          <>
            Deze link werkt{" "}
            <span style={{ fontStyle: "italic" }}>niet meer.</span>
          </>
        }
      >
        <Lead>
          De uitschrijflink lijkt incompleet of beschadigd te zijn. Mail
          ons op{" "}
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

  // ── Side-effects: idempotent afmelden bij elke aanroep ──────
  // updateMany retourneert het aantal aangepaste rijen, zodat we de
  // bevestigingsmail alleen sturen bij de eerste keer dat deze user
  // daadwerkelijk wordt uitgeschreven.
  const userUpdate = await prisma.user.updateMany({
    where: { email, newsletterOptIn: true },
    data: { newsletterOptIn: false, newsletterOptInAt: null },
  });
  const signupUpdate = await prisma.newsletterSignup.updateMany({
    where: { email, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });
  const justUnsubscribed = userUpdate.count + signupUpdate.count > 0;
  try {
    await deleteContact(email);
  } catch (err) {
    console.error("[unsubscribe] Brevo delete failed", err);
  }

  if (justUnsubscribed) {
    try {
      // Naam ophalen voor persoonlijke aanhef; fallback op leeg.
      const user = await prisma.user.findUnique({
        where: { email },
        select: { name: true },
      });
      const signup = user
        ? null
        : await prisma.newsletterSignup.findUnique({
            where: { email },
            select: { name: true },
          });
      // One-click herinschrijving via signed token — werkt voor zowel
      // account-houders als losse signups, en de /resubscribe-route
      // stuurt door naar /account of landing afhankelijk van wat er is.
      const reToken = signResubscribeToken(email);
      const resubscribeUrl = await buildAppUrl(
        `/resubscribe?email=${encodeURIComponent(email)}&token=${reToken}`,
      );
      const mail = await buildNewsletterUnsubscribedMail({
        name: user?.name ?? signup?.name ?? null,
        email,
        resubscribeUrl,
      });
      await sendMail({
        to: email,
        toName: user?.name ?? signup?.name ?? undefined,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["newsletter-unsubscribed"],
      });
    } catch (err) {
      console.error("[unsubscribe] confirmation mail failed", err);
    }
  }

  // ── Bedankt-staat (na survey-submit) ────────────────────────
  if (params.thanks === "1") {
    return (
      <ContentPage
        eyebrow="Uitschrijven"
        title={
          <>
            Bedankt voor je{" "}
            <span style={{ fontStyle: "italic" }}>feedback.</span>
          </>
        }
      >
        <Lead>
          Je staat helemaal uit. We gebruiken je antwoord om de
          nieuwsbrief beter te maken voor de mensen die wél blijven.
        </Lead>
        <P>
          Mocht je je bedenken: aanmelden kan altijd weer onderaan elke
          pagina op{" "}
          <a href="https://onsverhaaltje.nl" style={{ color: "inherit" }}>
            onsverhaaltje.nl
          </a>
          .
        </P>
      </ContentPage>
    );
  }

  // ── Survey-staat (default na uitschrijven) ───────────────────
  const noteRequiredError = params.error === "note_required";

  return (
    <ContentPage
      eyebrow="Uitschrijven"
      title={
        <>
          Je bent{" "}
          <span style={{ fontStyle: "italic" }}>uitgeschreven.</span>
        </>
      }
    >
      <Lead>
        Geen mails meer van ons. Mag ik je nog kort iets vragen — dat
        helpt om de nieuwsbrief beter te maken.
      </Lead>

      <form
        action={submitUnsubscribeReasonAction}
        // `minWidth: 0` voorkomt dat lange radio-labels of de textarea
        // de grid-cel breder dwingen dan het scherm — dat zou anders
        // horizontale scroll geven en daarmee de nav-/footer-wrap
        // breken.
        style={{ marginTop: 32, display: "grid", gap: 24, minWidth: 0 }}
      >
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />

        <fieldset
          style={{
            border: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 10,
            // Browser-default: fieldset heeft min-inline-size: min-content
            // — kan de pagina horizontaal opblazen bij lange labels.
            minInlineSize: 0,
            minWidth: 0,
          }}
        >
          <legend
            style={{
              fontFamily: V2.ui,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: V2.inkMute,
              marginBottom: 6,
            }}
          >
            Waarom afgemeld?
          </legend>

          {REASON_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                background: V2.paper,
                border: `1px solid ${V2.paperShade}`,
                cursor: "pointer",
                fontFamily: V2.body,
                fontSize: 15,
                color: V2.ink,
                lineHeight: 1.4,
              }}
            >
              <input
                type="radio"
                name="reason"
                value={opt.value}
                required
                style={{ marginTop: 4, flex: "0 0 auto" }}
              />
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  // Zonder min-width:0 mag deze flex-child uitgroeien
                  // voorbij de parent op smalle schermen.
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span>{opt.label}</span>
                {opt.hint && (
                  <span
                    style={{
                      fontSize: 13,
                      fontStyle: "italic",
                      color: V2.inkMute,
                    }}
                  >
                    {opt.hint}
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>

        <div>
          <label
            htmlFor="note"
            style={{
              fontFamily: V2.ui,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: V2.inkMute,
              display: "block",
              marginBottom: 6,
            }}
          >
            Toelichting{" "}
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              (optioneel — verplicht bij &ldquo;Anders&rdquo;)
            </span>
          </label>
          <textarea
            id="note"
            name="note"
            rows={4}
            maxLength={2000}
            placeholder="Wat had je anders gewild?"
            style={{
              width: "100%",
              // Anders telt padding + border bovenop de 100% → overflow
              // op mobiel, en daardoor verkeerde nav-wrap.
              boxSizing: "border-box",
              padding: "12px 14px",
              fontFamily: V2.body,
              fontSize: 15,
              lineHeight: 1.5,
              color: V2.ink,
              background: V2.paper,
              border: `1px solid ${noteRequiredError ? V2.heart : V2.paperShade}`,
              outline: "none",
              resize: "vertical",
            }}
          />
          {noteRequiredError && (
            <p
              style={{
                marginTop: 6,
                fontFamily: V2.body,
                fontSize: 13,
                color: V2.heart,
              }}
            >
              Vul een korte toelichting in wanneer je &ldquo;Anders&rdquo; kiest.
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="submit"
            style={{
              padding: "12px 24px",
              background: V2.ink,
              color: V2.paper,
              border: "none",
              fontFamily: V2.ui,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 0.2,
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            Verstuur →
          </button>
          <a
            href="https://onsverhaaltje.nl"
            style={{
              fontFamily: V2.ui,
              fontSize: 13,
              color: V2.inkMute,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Liever overslaan
          </a>
        </div>
      </form>
    </ContentPage>
  );
}
