"use client";

import { useState } from "react";
import { V2 } from "@/components/v2/tokens";
import { StoryPreviewReader } from "./StoryPreviewReader";
import type { LandingPreview, LandingPreviewSlot } from "@/lib/story/landing-previews";

type Props = {
  previews: LandingPreview[];
};

export function StoryPreviewV2({ previews }: Props) {
  const [activeId, setActiveId] = useState<LandingPreviewSlot>(
    previews[0]?.slot ?? "girl-2"
  );
  const active = previews.find((p) => p.slot === activeId) ?? previews[0];

  if (!active) return null;

  return (
    <div>
      {/* Tabs */}
      <div role="tablist" className="mb-10 flex flex-wrap gap-3">
        {previews.map((p) => {
          const selected = p.slot === activeId;
          return (
            <button
              key={p.slot}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(p.slot)}
              style={{
                fontFamily: V2.ui,
                fontSize: 13,
                letterSpacing: "0.04em",
                padding: "9px 18px",
                borderRadius: 2,
                color: selected ? V2.paper : V2.ink,
                background: selected ? V2.ink : "transparent",
                border: `1px solid ${selected ? V2.ink : V2.paperShade}`,
                transition: "background .15s, color .15s",
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Reader */}
      {active.data ? (
        <StoryPreviewReader
          spreads={active.data.spreads}
          resetKey={active.slot}
        />
      ) : (
        <EmptySlot label={active.label} />
      )}

      <p
        style={{
          marginTop: 24,
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: 15,
          color: V2.inkMute,
          textAlign: "center",
        }}
      >
        {active.data
          ? `Voorbeeldverhaal van ${active.data.childName}. Blader door om te zien hoe het voelt.`
          : "Binnenkort staat hier een voorbeeldverhaal."}
      </p>
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 640,
        aspectRatio: "640 / 440",
        margin: "0 auto",
        background: `linear-gradient(175deg, ${V2.night} 0%, ${V2.nightSoft} 100%)`,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "22%",
          right: "22%",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: V2.gold,
          opacity: 0.85,
        }}
      />
      {[
        { x: 12, y: 20 },
        { x: 28, y: 35 },
        { x: 52, y: 15 },
        { x: 78, y: 48 },
        { x: 18, y: 58 },
        { x: 62, y: 62 },
        { x: 40, y: 72 },
        { x: 84, y: 78 },
      ].map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: V2.gold,
            opacity: 0.7,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "38%",
          background: V2.nightSoft,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "relative",
          fontFamily: V2.display,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 22,
          color: V2.paper,
          textAlign: "center",
          padding: "0 32px",
          zIndex: 2,
          textShadow: "0 2px 10px rgba(0,0,0,0.4)",
        }}
      >
        Verhaaltje voor {label.toLowerCase()} volgt binnenkort.
      </div>
    </div>
  );
}
