"use client";

import { useEffect, useState } from "react";
import { V2 } from "@/components/v2/tokens";

type Props = {
  /** Volledige URL inclusief domein, bv. https://www.onsverhaaltje.nl/r/AB12CD */
  shareUrl: string;
};

/**
 * Compacte uitnodig-kaart op het dashboard. Beloning is bewust kort
 * uitgelegd zodat ouders snappen wat ze + de uitgenodigde krijgen.
 */
export function ReferralCard({ shareUrl }: Props) {
  const [copied, setCopied] = useState(false);
  // Web-Share-API alleen client-side detecteren — anders mismatch tussen
  // SSR (geen knop) en hydratie (knop). Pas na mount renderen we 'm.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    // SSR rendert false; in browser zetten we 'm aan als Web Share bestaat.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard geblokkeerd — input blijft selecteerbaar.
    }
  }

  function shareNative() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      void navigator.share({
        title: "Ons Verhaaltje",
        text: "Maak je eigen voorleesverhalen — krijg er één gratis cadeau:",
        url: shareUrl,
      });
    }
  }

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: "48px auto 0",
        padding: "32px 40px",
        background: V2.paperDeep,
        border: `1px solid ${V2.paperShade}`,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          alignItems: "center",
        }}
        className="rc-grid"
      >
        <div>
          <div
            style={{
              fontFamily: V2.mono,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: V2.goldDeep,
              marginBottom: 8,
            }}
          >
            Nodig vrienden uit
          </div>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: 28,
              letterSpacing: -0.6,
              lineHeight: 1.15,
              margin: 0,
              color: V2.ink,
            }}
          >
            Beide{" "}
            <span style={{ fontStyle: "italic" }}>een gratis verhaal.</span>
          </h2>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 14,
              color: V2.inkSoft,
              lineHeight: 1.55,
              margin: "12px 0 0",
            }}
          >
            Deel je persoonlijke link. Wie via jou registreert krijgt
            meteen één verhaal cadeau. Jij krijgt er ook één extra op het
            moment dat zij hun eerste abonnement of tegoed kopen.
          </p>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "stretch",
              flexWrap: "wrap",
            }}
          >
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: "1 1 220px",
                padding: "10px 14px",
                fontFamily: V2.mono,
                fontSize: 13,
                color: V2.ink,
                background: V2.paper,
                border: `1px solid ${V2.paperShade}`,
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              type="button"
              onClick={copy}
              style={{
                padding: "10px 18px",
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.04em",
                background: copied ? V2.goldSoft : V2.ink,
                color: copied ? V2.goldDeep : V2.paper,
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {copied ? "Gekopieerd ✓" : "Kopieer link"}
            </button>
          </div>
          {canShare && (
            <button
              type="button"
              onClick={shareNative}
              style={{
                padding: "8px 14px",
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: 500,
                background: "transparent",
                color: V2.ink,
                border: `1px solid ${V2.paperShade}`,
                cursor: "pointer",
                justifySelf: "start",
              }}
            >
              Delen via app →
            </button>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (max-width: 760px) {
  .rc-grid { grid-template-columns: 1fr !important; gap: 18px !important; }
}
`,
        }}
      />
    </section>
  );
}
