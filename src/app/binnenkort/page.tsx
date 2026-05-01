import { ContentPage, Lead, P } from "@/components/v2/landing/ContentPage";
import { V2 } from "@/components/v2/tokens";
import { EBtn } from "@/components/v2";
import { submitBinnenkortAction } from "./actions";

export const metadata = {
  title: "Het gedrukte boekje komt eraan",
  description:
    "We werken aan de drukker-koppeling. Laat je gegevens achter en we mailen je zodra het boekje besteld kan worden.",
  alternates: { canonical: "/binnenkort" },
};

type SearchParams = Promise<{ sent?: string; error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Vul alsjeblieft alle velden in.",
  email: "Dat lijkt geen geldig e-mailadres.",
  short: "Het bericht is wel heel kort. Vertel ons iets meer.",
  long: "Het bericht is te lang (max. 5000 tekens).",
  ratelimit:
    "Je hebt net al een paar berichten gestuurd. Probeer het over een uur nog eens.",
  send: "Er ging iets mis met versturen. Probeer het later nog eens.",
};

export default async function BinnenkortPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const errorKey = params.error;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : null;

  return (
    <ContentPage
      eyebrow="Het gedrukte boekje"
      title={
        <>
          Komt eraan,{" "}
          <span style={{ fontStyle: "italic" }}>nog even geduld.</span>
        </>
      }
    >
      <Lead>
        Het samenstellen werkt al — daar kun je rustig mee verder. Het
        bestellen en drukken zelf is nog een laatste stap die we aan het
        regelen zijn met onze drukker.
      </Lead>

      <P>
        We zoeken een drukker die de kwaliteit en het materiaal levert die we
        voor jullie boekje voor ogen hebben — linnen kaft, gevoel van een echt
        kinderboek. Zodra de samenwerking rond is, kun je hier rechtstreeks
        bestellen en wordt het binnen twee weken thuisbezorgd.
      </P>

      <P>
        Wil je een seintje krijgen wanneer het zover is? Of wil je eerder al
        een proefdruk kunnen aanvragen? Laat hieronder je gegevens achter, dan
        nemen we contact op.
      </P>

      {sent ? (
        <div
          style={{
            marginTop: 32,
            padding: "20px 24px",
            background: "rgba(201, 169, 97, 0.14)",
            borderLeft: `3px solid ${V2.goldDeep}`,
            fontFamily: V2.body,
            fontSize: 15,
            color: V2.ink,
            lineHeight: 1.55,
          }}
        >
          ✓ Bedankt — we hebben je bericht ontvangen en mailen je zodra het
          drukken werkt.
        </div>
      ) : (
        <form
          action={submitBinnenkortAction}
          style={{
            marginTop: 36,
            paddingTop: 36,
            borderTop: `1px solid ${V2.paperShade}`,
          }}
        >
          {/* Honeypot — the action silently treats this as a successful
              submit so bots that fill it think they got through. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            style={{
              position: "absolute",
              left: -9999,
              width: 1,
              height: 1,
              opacity: 0,
            }}
          />

          {errorMessage && (
            <div
              style={{
                marginBottom: 24,
                padding: "14px 18px",
                background: "rgba(196,165,168,0.20)",
                borderLeft: `3px solid ${V2.rose}`,
                fontFamily: V2.body,
                fontSize: 14,
                color: V2.ink,
              }}
            >
              {errorMessage}
            </div>
          )}

          <BinnenkortField
            label="Naam"
            name="name"
            type="text"
            autoComplete="name"
            required
          />
          <BinnenkortField
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <BinnenkortTextarea
            label="Bericht (optioneel)"
            name="message"
            placeholder="Bv. ik wil graag een mailtje als het bestellen werkt, of ik heb een specifieke wens voor mijn boekje."
          />

          <div style={{ marginTop: 28 }}>
            <EBtn kind="primary" size="lg" type="submit">
              Versturen →
            </EBtn>
          </div>
          <p
            style={{
              marginTop: 14,
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 12,
              color: V2.inkMute,
            }}
          >
            We bewaren je gegevens alleen om je terug te mailen, niets meer.
          </p>
        </form>
      )}
    </ContentPage>
  );
}

function BinnenkortField({
  label,
  name,
  type,
  autoComplete,
  required,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label
        htmlFor={name}
        style={{
          display: "block",
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: V2.inkMute,
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        style={{
          width: "100%",
          padding: "12px 0",
          border: "none",
          borderBottom: `1px solid ${V2.paperShade}`,
          background: "transparent",
          fontFamily: V2.body,
          fontSize: 16,
          color: V2.ink,
          outline: "none",
        }}
      />
    </div>
  );
}

function BinnenkortTextarea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label
        htmlFor={name}
        style={{
          display: "block",
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: V2.inkMute,
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        rows={4}
        style={{
          width: "100%",
          padding: "12px 14px",
          border: `1px solid ${V2.paperShade}`,
          background: "transparent",
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.ink,
          lineHeight: 1.5,
          outline: "none",
          resize: "vertical",
          minHeight: 100,
        }}
      />
    </div>
  );
}
