"use client";

import { useState } from "react";
import Link from "next/link";
import { CREAM, INK, PURPLE, DISPLAY, INK_RGB } from "./tokens";

// TODO[fragments]: when the pre-generated story-fragment DB is wired up,
// import the existing types and a fragment lookup, then render via the
// real BookViewer or a stripped inline version of it. The shape mirrors
// the BookViewer Spread/PageType contract so a swap is a one-line change.
//
//   import type { Spread } from "@/components/story/BookViewer";
//   const fragmentFor = (gender, age) => fragments[`${gender}-${age}`] satisfies Spread;
//
// Note: the production BookViewer is `fixed inset-0` and uses a different
// terra/orange palette. For inline editorial preview we render in the
// landing-page design system instead. See deliverable note.

type Profile = {
  id: "girl-2" | "girl-4" | "boy-2" | "boy-4";
  label: string;
  fragmentKey: string;
};

const PROFILES: Profile[] = [
  { id: "girl-2", label: "Meisje, 2 jaar", fragmentKey: "voorbeeld-fragment-meisje-2" },
  { id: "girl-4", label: "Meisje, 4 jaar", fragmentKey: "voorbeeld-fragment-meisje-4" },
  { id: "boy-2", label: "Jongen, 2 jaar", fragmentKey: "voorbeeld-fragment-jongen-2" },
  { id: "boy-4", label: "Jongen, 4 jaar", fragmentKey: "voorbeeld-fragment-jongen-4" },
];

export function StoryPreview() {
  const [activeId, setActiveId] = useState<Profile["id"]>(PROFILES[0].id);
  const active = PROFILES.find((p) => p.id === activeId)!;

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-3 mb-10">
        {PROFILES.map((p) => {
          const selected = p.id === activeId;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(p.id)}
              className="rounded-full px-5 py-2 text-[13px] tracking-[0.04em] transition-colors duration-200"
              style={{
                color: selected ? CREAM : INK,
                backgroundColor: selected ? INK : "transparent",
                border: `1px solid ${selected ? INK : `rgba(${INK_RGB},0.22)`}`,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <PreviewSpread profile={active} />

      <p
        className="mt-8 text-[15px] italic"
        style={{ fontFamily: DISPLAY, opacity: 0.75 }}
      >
        Dit verhaal is gemaakt met een voorbeeldprofiel.{" "}
        <Link
          href="/register"
          className="not-italic underline-offset-4 hover:underline"
          style={{ color: PURPLE }}
        >
          Maak er één voor jouw kind →
        </Link>
      </p>
    </div>
  );
}

function PreviewSpread({ profile }: { profile: Profile }) {
  return (
    <div
      className="relative grid grid-cols-1 md:grid-cols-2 rounded-[2px] overflow-hidden"
      style={{
        aspectRatio: "1.55 / 1",
        backgroundColor: "#FBF7EF",
        boxShadow: `0 1px 0 rgba(${INK_RGB},0.06), 0 32px 60px -28px rgba(${INK_RGB},0.28), 0 8px 18px -10px rgba(${INK_RGB},0.12)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden md:block w-[2px] -translate-x-1/2"
        style={{
          background: `linear-gradient(to right, rgba(${INK_RGB},0) 0%, rgba(${INK_RGB},0.18) 50%, rgba(${INK_RGB},0) 100%)`,
        }}
      />
      {/* Left page — spot illustration placeholder */}
      <div className="relative flex flex-col justify-between p-6 md:p-8">
        <span
          className="text-[10px] tabular-nums"
          style={{ fontFamily: DISPLAY, opacity: 0.45 }}
        >
          4
        </span>
        <div
          className="mx-auto flex h-[78%] w-[88%] flex-col items-center justify-center gap-2 rounded-[1px]"
          style={{
            border: `1px dashed rgba(${INK_RGB},0.22)`,
            color: `rgba(${INK_RGB},0.5)`,
          }}
        >
          <span className="text-[10px] uppercase tracking-[0.22em]">
            aquarel-illustratie
          </span>
          <span
            className="text-[11px] italic"
            style={{ fontFamily: DISPLAY }}
          >
            [{profile.fragmentKey}]
          </span>
        </div>
        <span aria-hidden />
      </div>
      {/* Right page — text fragment */}
      <div className="relative flex flex-col justify-between p-7 md:p-9">
        <p
          className="text-[14px] italic leading-[1.65]"
          style={{ fontFamily: DISPLAY, opacity: 0.85 }}
        >
          [{profile.fragmentKey}]
          <br />
          <br />
          Hier komt straks een korte spread uit een echt voorbeeldverhaal.
          Een paragraaf of twee waarin de hoofdpersoon iets meemaakt dat
          past bij {profile.label.toLowerCase()}.
        </p>
        <div className="flex items-baseline justify-between">
          <span
            className="text-[10px] tabular-nums"
            style={{ fontFamily: DISPLAY, opacity: 0.45 }}
          >
            5
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ opacity: 0.45 }}
          >
            voorbeeld
          </span>
        </div>
      </div>
    </div>
  );
}
