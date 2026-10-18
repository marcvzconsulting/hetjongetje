"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { V2 } from "@/components/v2/tokens";

/**
 * Laatste vangnet: alleen zichtbaar als de root-layout zelf omvalt.
 * Vervangt dan de hele <html>, dus alles staat hier inline en zonder
 * eigen componenten of webfonts. Fout gaat naar Sentry.
 */
export default function GlobalError({
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
    <html lang="nl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: V2.paper,
          color: V2.ink,
          fontFamily: "Georgia, serif",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 560 }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: V2.inkMute,
              margin: 0,
            }}
          >
            Er ging iets mis
          </p>
          <h1
            style={{
              fontWeight: 300,
              fontSize: "clamp(32px, 6vw, 48px)",
              lineHeight: 1.1,
              margin: "12px 0 24px",
            }}
          >
            Ons Verhaaltje is even de draad kwijt.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: V2.inkSoft }}>
            Er is een onverwachte fout opgetreden. We hebben er een melding
            van gekregen. Probeer het over een ogenblik nog eens.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "13px 24px",
                background: V2.ink,
                color: V2.paper,
                border: 0,
                borderRadius: 2,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Probeer opnieuw →
            </button>
            <Link
              href="/"
              style={{
                padding: "13px 24px",
                border: `1px solid ${V2.ink}`,
                borderRadius: 2,
                color: V2.ink,
                textDecoration: "none",
                fontSize: 15,
              }}
            >
              Naar de voorkant
            </Link>
          </div>
          {error.digest && (
            <p
              style={{
                marginTop: 32,
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                color: V2.inkMute,
              }}
            >
              Foutcode {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
