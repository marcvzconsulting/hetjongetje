"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ContentPage, P } from "@/components/v2/landing/ContentPage";
import { EBtn } from "@/components/v2";
import { V2 } from "@/components/v2/tokens";

/**
 * Crash-pagina voor alles onder de root-layout. Vangt fouten die tijdens
 * het renderen van een pagina ontstaan en toont een rustige Nederlandse
 * melding met "Probeer opnieuw" (Next' `reset`) in plaats van de kale
 * standaard. De fout gaat naar Sentry; `digest` is de code waarmee hij
 * daar terug te vinden is.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ContentPage
      eyebrow="Er ging iets mis"
      title={
        <>
          Dit hadden we{" "}
          <span style={{ fontStyle: "italic" }}>niet bedacht.</span>
        </>
      }
    >
      <P>
        Er is een fout opgetreden bij het laden van deze pagina. Dat ligt
        aan ons, niet aan jou. We hebben er een melding van gekregen en
        kijken ernaar. Probeer het nog een keer; meestal werkt het dan
        gewoon.
      </P>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 32,
        }}
      >
        <EBtn kind="primary" onClick={reset}>
          Probeer opnieuw →
        </EBtn>
        <EBtn kind="ghost" href="/">
          Naar de voorkant
        </EBtn>
      </div>

      {error.digest && (
        <p
          style={{
            marginTop: 40,
            fontFamily: V2.mono,
            fontSize: 12,
            color: V2.inkMute,
          }}
        >
          Foutcode {error.digest} · noem deze als je ons mailt.
        </p>
      )}
    </ContentPage>
  );
}
