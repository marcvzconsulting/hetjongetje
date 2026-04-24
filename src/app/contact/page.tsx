import { ContentPage, Lead } from "@/components/v2/landing/ContentPage";
import { V2 } from "@/components/v2/tokens";
import { EBtn } from "@/components/v2";
import { submitContactFormAction } from "./actions";

type SearchParams = Promise<{ sent?: string; error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Vul alsjeblieft alle velden in.",
  email: "Dat lijkt geen geldig e-mailadres.",
  short: "Het bericht is wel heel kort. Vertel ons iets meer.",
  long: "Het bericht is te lang (max. 5000 tekens).",
  ratelimit:
    "Je hebt net al een paar berichten gestuurd. Probeer het over een uur nog eens.",
  send: "Er ging iets mis met versturen. Probeer het later nog eens of mail ons direct.",
};

const labelStyle: React.CSSProperties = {
  fontFamily: V2.mono,
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: V2.inkMute,
  display: "block",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: `1px solid ${V2.paperShade}`,
  background: "transparent",
  fontSize: 16,
  fontFamily: V2.body,
  color: V2.ink,
  outline: "none",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const error = params.error ? ERROR_MESSAGES[params.error] ?? null : null;

  return (
    <ContentPage
      eyebrow="Contact"
      title={
        <>
          Vragen, opmerkingen,{" "}
          <span style={{ fontStyle: "italic" }}>een idee?</span>
        </>
      }
    >
      <Lead>
        Eén echt e-mailadres. Geen tickets. Reactie binnen één werkdag,
        dat durven we te beloven.
      </Lead>

      <p style={{ margin: "0 0 6px", fontFamily: V2.body, fontSize: 16 }}>
        Schrijf ons op:
      </p>
      <p
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: 26,
          fontWeight: 400,
          margin: "0 0 48px",
          letterSpacing: -0.3,
        }}
      >
        <a
          href="mailto:info@onsverhaaltje.nl"
          style={{ color: V2.ink, textDecoration: "none" }}
        >
          info@onsverhaaltje.nl
        </a>
      </p>

      <div
        style={{
          paddingTop: 40,
          borderTop: `1px solid ${V2.paperShade}`,
        }}
      >
        <p
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: V2.inkMute,
            margin: "0 0 18px",
          }}
        >
          Of vul het formulier in
        </p>

        {sent ? (
          <div
            style={{
              background: V2.paperDeep,
              border: `1px solid ${V2.paperShade}`,
              padding: "28px 32px",
            }}
          >
            <p
              style={{
                fontFamily: V2.display,
                fontStyle: "italic",
                fontSize: 22,
                fontWeight: 300,
                color: V2.ink,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Bedankt. Je bericht is onderweg.
            </p>
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 15,
                color: V2.inkSoft,
                margin: "12px 0 0",
                lineHeight: 1.55,
              }}
            >
              We lezen alles zelf. Je hoort binnen één werkdag van ons.
            </p>
          </div>
        ) : (
          <form action={submitContactFormAction}>
            {error && (
              <div
                style={{
                  background: "rgba(176,74,65,0.10)",
                  borderLeft: `2px solid ${V2.heart}`,
                  padding: "12px 16px",
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.ink,
                  marginBottom: 24,
                }}
              >
                {error}
              </div>
            )}

            {/* Honeypot — real users leave empty. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              style={{
                position: "absolute",
                left: "-9999px",
                width: 1,
                height: 1,
                opacity: 0,
              }}
              aria-hidden="true"
            />

            <div style={{ marginBottom: 28 }}>
              <label htmlFor="contact-name" style={labelStyle}>
                Naam
              </label>
              <input
                id="contact-name"
                type="text"
                name="name"
                required
                autoComplete="name"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label htmlFor="contact-email" style={labelStyle}>
                E-mail
              </label>
              <input
                id="contact-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 32 }}>
              <label htmlFor="contact-message" style={labelStyle}>
                Bericht
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={6}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: 140,
                  lineHeight: 1.55,
                }}
              />
            </div>

            <EBtn kind="primary" size="md" type="submit">
              Versturen
            </EBtn>
          </form>
        )}
      </div>
    </ContentPage>
  );
}
