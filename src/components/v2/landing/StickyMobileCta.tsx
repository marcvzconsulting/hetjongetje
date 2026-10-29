"use client";

import { useEffect, useState } from "react";
import { V2 } from "@/components/v2/tokens";
import { EBtn, IconV2 } from "@/components/v2";

/**
 * Sticky CTA onderaan het scherm, alleen op mobiel en alleen op de
 * landingspagina. Verschijnt zodra de hero-knop (element met
 * `data-sticky-cta-anchor`) uit beeld is gescrold en verdwijnt weer zolang
 * een element met `data-sticky-cta-hide` in beeld is (de slot-CTA en de
 * footer, die hebben hun eigen knop). Blijft verborgen terwijl de
 * cookiebanner open staat (`html[data-cookie-banner-open]`, gezet door
 * CookieBanner), zodat de twee elkaar nooit overlappen.
 *
 * Desktop ziet hem nooit: de wrapper is `display: none` boven 760px, het
 * breekpunt van de rest van de landingspagina.
 */
type Props = {
  href?: string;
  label?: string;
  note?: string;
};

export function StickyMobileCta({
  href = "/register",
  label = "Maak het eerste verhaal",
  note = "Klaar in 3 minuten",
}: Props) {
  const [pastAnchor, setPastAnchor] = useState(false);
  const [blockerInView, setBlockerInView] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const anchor = document.querySelector("[data-sticky-cta-anchor]");
    const blockers = Array.from(
      document.querySelectorAll("[data-sticky-cta-hide]"),
    );

    const anchorObserver = anchor
      ? new IntersectionObserver(([entry]) => {
          // Alleen tonen als de hero-knop *boven* het beeld verdwenen is,
          // niet als de pagina net geladen is en de knop nog onder de
          // vouw staat.
          setPastAnchor(
            !entry.isIntersecting && entry.boundingClientRect.top < 0,
          );
        })
      : null;
    anchorObserver?.observe(anchor as Element);

    const inView = new Set<Element>();
    const blockerObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inView.add(e.target);
        else inView.delete(e.target);
      }
      setBlockerInView(inView.size > 0);
    });
    blockers.forEach((b) => blockerObserver.observe(b));

    return () => {
      anchorObserver?.disconnect();
      blockerObserver.disconnect();
    };
  }, []);

  const shown = pastAnchor && !blockerInView;

  return (
    <>
      <style>{`
        .lp-sticky-cta { display: none; }
        @media (max-width: 760px) {
          .lp-sticky-cta { display: block; }
        }
        html[data-cookie-banner-open] .lp-sticky-cta { display: none !important; }
        @media (prefers-reduced-motion: reduce) {
          .lp-sticky-cta { transition: none !important; }
        }
      `}</style>
      <div
        className="lp-sticky-cta"
        aria-hidden={!shown}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 900,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
          background: V2.paper,
          borderTop: `1px solid ${V2.paperShade}`,
          boxShadow: "0 -8px 24px rgba(31, 30, 58, 0.10)",
          transform: shown ? "translateY(0)" : "translateY(110%)",
          visibility: shown ? "visible" : "hidden",
          transition: "transform .22s ease, visibility .22s",
        }}
      >
        <EBtn
          kind="primary"
          size="lg"
          href={href}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {label} <IconV2 name="arrow" size={16} color={V2.paper} />
        </EBtn>
        {note && (
          <div
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              color: V2.inkMute,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {note}
          </div>
        )}
      </div>
    </>
  );
}
