import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn } from "@/components/v2";
import { AuthShell } from "@/components/v2/auth/AuthShell";
import { AuthField } from "@/components/v2/auth/AuthField";
import { requestResetAction } from "./actions";

type SearchParams = Promise<{ sent?: string; error?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const error = params.error;

  if (sent) {
    return (
      <AuthShell
        kicker="Check je mailbox"
        heading={
          <>
            We hebben je een{" "}
            <span style={{ fontStyle: "italic" }}>sleutel</span> gestuurd.
          </>
        }
        rightKicker="Zachtjes"
        rightTitle="De maan kijkt mee"
        rightMeta="WACHT OP JE — EEN UUR GELDIG"
        footer={
          <Link
            href="/login"
            style={{ color: V2.ink, textDecoration: "underline" }}
          >
            ← Terug naar inloggen
          </Link>
        }
      >
        <div
          style={{
            background: "rgba(201, 169, 97, 0.14)",
            padding: 20,
            fontSize: 15,
            color: V2.inkSoft,
            fontFamily: V2.body,
            lineHeight: 1.55,
            borderLeft: `2px solid ${V2.gold}`,
          }}
        >
          <p style={{ margin: 0, fontWeight: 500, color: V2.ink }}>
            Als er een account bestaat met dat adres,
          </p>
          <p style={{ margin: "8px 0 0" }}>
            hebben we een reset-link verstuurd. Check je mailbox (en
            spam-folder). De link is 1 uur geldig.
          </p>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 13,
              color: V2.inkMute,
              fontStyle: "italic",
            }}
          >
            Tip voor dev: de link staat nu in de console van de dev-server.
            E-mailverzending is nog niet geconfigureerd.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      kicker="Wachtwoord vergeten"
      heading={
        <>
          Geen zorgen —<br />
          we sturen je een{" "}
          <span style={{ fontStyle: "italic" }}>sleutel.</span>
        </>
      }
      rightKicker="Vergeten"
      rightTitle="Komt zo terug"
      rightMeta="WACHT EVEN OP JULLIE"
      footer={
        <Link
          href="/login"
          style={{ color: V2.ink, textDecoration: "underline" }}
        >
          ← Terug naar inloggen
        </Link>
      }
    >
      <form action={requestResetAction}>
        {error === "missing" && (
          <div
            style={{
              background: "rgba(196, 165, 168, 0.2)",
              padding: 12,
              fontSize: 14,
              color: V2.ink,
              marginBottom: 24,
              fontFamily: V2.body,
              borderLeft: `2px solid ${V2.rose}`,
            }}
          >
            Vul een emailadres in
          </div>
        )}

        <AuthField
          label="E-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="je@email.nl"
        />

        <EBtn
          kind="primary"
          size="lg"
          type="submit"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Reset-link versturen →
        </EBtn>
      </form>
    </AuthShell>
  );
}
