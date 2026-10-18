import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn } from "@/components/v2";
import { AuthShell } from "@/components/v2/auth/AuthShell";

export const metadata: Metadata = {
  title: "Inloggen mislukt",
};

/**
 * Eigen foutpagina voor Auth.js (`pages.error` in src/lib/auth.ts).
 *
 * Auth.js stuurt hierheen met `?error=<type>`. Alleen een handvol typen is
 * "client-safe" (AccessDenied, Verification, …); al het andere — een
 * state/PKCE-cookie-mismatch bij Google, een databasefout in de
 * jwt-callback — komt binnen als `Configuration`. De echte oorzaak staat
 * in Sentry (logger in auth.ts); de klant krijgt hier alleen een rustige
 * uitleg en een knop om het opnieuw te proberen. Vóór deze pagina zag hij
 * de kale Engelse "Server error / problem with the server configuration".
 */
type Copy = {
  kicker: string;
  heading: ReactNode;
  body: string;
  hint?: string;
};

const COPY: Record<string, Copy> = {
  Configuration: {
    kicker: "Even geduld",
    heading: (
      <>
        Het inloggen is <span style={{ fontStyle: "italic" }}>niet gelukt</span>
      </>
    ),
    body:
      "Er ging iets mis terwijl we je aanmeldden. Dit is bijna altijd tijdelijk en opnieuw proberen lost het meestal op.",
    hint:
      "Lukt het via Google niet? Vraag dan op de inlogpagina een login-link per e-mail aan, die werkt onafhankelijk van Google.",
  },
  AccessDenied: {
    kicker: "Geen toegang",
    heading: (
      <>
        Dit account kan <span style={{ fontStyle: "italic" }}>niet inloggen</span>
      </>
    ),
    body:
      "Je aanmelding is geweigerd. Denk je dat dit niet klopt? Laat het ons weten, dan kijken we mee.",
  },
  Verification: {
    kicker: "Link verlopen",
    heading: (
      <>
        Deze link werkt <span style={{ fontStyle: "italic" }}>niet meer</span>
      </>
    ),
    body:
      "De login-link is verlopen of al een keer gebruikt. Vraag op de inlogpagina een nieuwe aan; die werkt 15 minuten.",
  },
};

const DEFAULT_COPY: Copy = {
  kicker: "Hmm",
  heading: (
    <>
      Inloggen is <span style={{ fontStyle: "italic" }}>niet gelukt</span>
    </>
  ),
  body:
    "Er ging iets mis bij het inloggen. Probeer het nog een keer; als het blijft gebeuren, horen we het graag.",
};

export default async function InlogfoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.error) ? params.error[0] : params.error;
  const copy = (raw && COPY[raw]) || DEFAULT_COPY;

  return (
    <AuthShell
      kicker={copy.kicker}
      heading={copy.heading}
      footer={
        <>
          Blijft het misgaan?{" "}
          <Link
            href="/contact"
            style={{ color: V2.ink, textDecoration: "underline" }}
          >
            Stuur ons een berichtje
          </Link>
        </>
      }
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 16,
          lineHeight: 1.6,
          color: V2.ink,
          margin: "0 0 16px",
        }}
      >
        {copy.body}
      </p>

      {copy.hint && (
        <div
          style={{
            background: "rgba(201, 169, 97, 0.14)",
            padding: 14,
            fontSize: 14,
            lineHeight: 1.5,
            color: V2.ink,
            marginBottom: 24,
            fontFamily: V2.body,
            borderLeft: `2px solid ${V2.goldDeep}`,
          }}
        >
          {copy.hint}
        </div>
      )}

      <EBtn
        kind="primary"
        size="lg"
        href="/login"
        style={{ width: "100%", justifyContent: "center" }}
      >
        Opnieuw inloggen →
      </EBtn>

      <p
        style={{
          fontFamily: V2.ui,
          fontSize: 12,
          color: V2.inkMute,
          marginTop: 16,
          textAlign: "center",
        }}
      >
        Niets van je gegevens is verloren gegaan.
      </p>
    </AuthShell>
  );
}
