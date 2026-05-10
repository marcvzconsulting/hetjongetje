"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { V2 } from "@/components/v2/tokens";

type Step = {
  /** Korte volgorde-label boven de stap (bv. "Stap 1 / 4"). */
  index: number;
  total: number;
  /** Sectie-eyebrow in goud, bv. "Profiel". */
  kicker: string;
  /** Hoofdkop, leesbaar en niet schreeuwerig. */
  title: string;
  /** Toelichting; één korte alinea is genoeg. */
  body: string;
  /** Klein illustratief ASCII/SVG-blokje. */
  visual: React.ReactNode;
};

const STEPS: Omit<Step, "index" | "total">[] = [
  {
    kicker: "Profiel",
    title: "Maak een kindprofiel",
    body:
      "Vertel ons over je kind. Hoe ze heten, hoe oud ze zijn, waar ze blij van worden en hoe ze eruitzien. Hoe meer je deelt, hoe persoonlijker het verhaal wordt dat we straks voor ze maken.",
    visual: <ProfileGlyph />,
  },
  {
    kicker: "Aanleiding",
    title: "Kies waarover het gaat",
    body:
      "Een verjaardag, een spannend avontuur, een verhaal voor het slapengaan of een troostend moment na een rotdag. Wij passen het verhaal aan op precies dat wat jouw kind op dit moment nodig heeft.",
    visual: <OccasionGlyph />,
  },
  {
    kicker: "Generatie",
    title: "Wij maken het verhaal",
    body:
      "In ongeveer een minuut schrijven we een uniek verhaal met persoonlijke illustraties erbij. Vind je het niet helemaal raak? Dan maken we er nog één keer een nieuwe versie van, met jouw aanwijzingen erbij.",
    visual: <SparkleGlyph />,
  },
  {
    kicker: "Bewaren",
    title: "Lees, print of bundel later",
    body:
      "Lees het verhaal samen vanaf je telefoon of tablet, sla het op als PDF om thuis uit te printen en bewaar je favoriete verhalen om er een echt boekje van te maken.",
    visual: <BookGlyph />,
  },
];

const TOTAL = STEPS.length;

export function OnboardingTour({
  finishAction,
  primaryHref,
}: {
  /** Server-action die User.onboardedAt op now() zet. */
  finishAction: () => Promise<void>;
  /** Waar de "Aan de slag"-knop op de laatste stap heen brengt. */
  primaryHref: string;
}) {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [closing, setClosing] = useState(false);
  const [, startTransition] = useTransition();

  const step = STEPS[stepIdx];
  const isLast = stepIdx === TOTAL - 1;

  function close(navigateTo?: string) {
    if (closing) return;
    setClosing(true);
    // Mark onboarded server-side and refresh; geen await nodig op de
    // navigate, want we sluiten direct.
    void finishAction();
    if (navigateTo) {
      router.push(navigateTo);
    } else {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welkom bij Ons Verhaaltje"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(20,20,46,0.55)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: V2.paper,
          padding: "32px 32px 24px",
          boxShadow: "0 20px 60px rgba(20,20,46,0.30)",
          position: "relative",
        }}
      >
        {/* Sluiten — telt als "skip" */}
        <button
          type="button"
          aria-label="Sluiten"
          onClick={() => close()}
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            background: "transparent",
            border: "none",
            fontSize: 24,
            lineHeight: 1,
            color: V2.inkMute,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        {/* Step counter */}
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: V2.inkMute,
            marginBottom: 18,
          }}
        >
          Stap {stepIdx + 1} / {TOTAL}
        </div>

        {/* Visual */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 22,
            color: V2.goldDeep,
          }}
        >
          {step.visual}
        </div>

        {/* Kicker + title + body */}
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: V2.goldDeep,
            marginBottom: 8,
          }}
        >
          {step.kicker}
        </div>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 28,
            lineHeight: 1.15,
            letterSpacing: -0.4,
            color: V2.ink,
            margin: "0 0 12px",
          }}
        >
          {step.title}
        </h2>
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 15,
            lineHeight: 1.6,
            color: V2.inkSoft,
            margin: 0,
            maxWidth: "52ch",
          }}
        >
          {step.body}
        </p>

        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 28,
          }}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 28,
                height: 3,
                background: i <= stepIdx ? V2.goldDeep : V2.paperShade,
                transition: "background .25s",
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginTop: 24,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => close()}
            style={{
              fontFamily: V2.ui,
              fontSize: 13,
              color: V2.inkMute,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              padding: "8px 0",
            }}
          >
            Sla over
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => setStepIdx(stepIdx - 1)}
                style={{
                  fontFamily: V2.ui,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "10px 18px",
                  border: `1px solid ${V2.paperShade}`,
                  background: V2.paper,
                  color: V2.ink,
                  cursor: "pointer",
                }}
              >
                ← Vorige
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={() => close(primaryHref)}
                style={{
                  fontFamily: V2.ui,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "10px 22px",
                  border: "none",
                  background: V2.ink,
                  color: V2.paper,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                Aan de slag →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIdx(stepIdx + 1)}
                style={{
                  fontFamily: V2.ui,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "10px 22px",
                  border: "none",
                  background: V2.ink,
                  color: V2.paper,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                Volgende →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Glyphs ───────────────────────────────────────────────────────────
// Eenvoudige line-art SVGs zodat we niet afhankelijk zijn van extra
// illustraties. Alle in goldDeep zodat ze goed kleuren met de paper-bg.

function ProfileGlyph() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="22" r="9" />
      <path d="M14 52c2.5-9.5 10-15 18-15s15.5 5.5 18 15" />
    </svg>
  );
}

function OccasionGlyph() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="22" width="44" height="30" rx="2" />
      <path d="M20 22V14M44 22V14" />
      <path d="M10 32h44" />
      <circle cx="22" cy="42" r="2" />
      <circle cx="32" cy="42" r="2" />
      <circle cx="42" cy="42" r="2" />
    </svg>
  );
}

function SparkleGlyph() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 8v12M32 44v12M8 32h12M44 32h12" />
      <path d="M32 14l4 14 14 4-14 4-4 14-4-14-14-4 14-4z" />
    </svg>
  );
}

function BookGlyph() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14c8 0 16 2 22 6 6-4 14-6 22-6v36c-8 0-16 2-22 6-6-4-14-6-22-6V14z" />
      <path d="M32 20v36" />
    </svg>
  );
}
