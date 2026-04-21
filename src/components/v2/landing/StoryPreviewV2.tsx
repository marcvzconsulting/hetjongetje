"use client";

import { useState } from "react";
import { V2 } from "@/components/v2/tokens";

type Profile = {
  id: "girl-2" | "girl-4" | "boy-2" | "boy-4";
  label: string;
  name: string;
  readTime: string;
  paragraph: string;
};

// Korte voorbeeldfragmenten per leeftijd/geslacht. Placeholder tot de
// echte pre-generated story DB er is — zelfde contract (1 paragraph per
// profiel, beginletter als dropcap).
const PROFILES: Profile[] = [
  {
    id: "girl-2",
    label: "Meisje, 2 jaar",
    name: "Noor",
    readTime: "~ 1 MIN VOORLEZEN",
    paragraph:
      "Noor kon niet slapen. Ze keek naar de maan door het raam. De maan keek terug. 'Slaap lekker, Noor,' fluisterde de maan zachtjes. En toen — héél langzaam — vielen Noors ogen dicht.",
  },
  {
    id: "girl-4",
    label: "Meisje, 4 jaar",
    name: "Noor",
    readTime: "~ 2 MIN VOORLEZEN",
    paragraph:
      "Noor stond op haar tenen bij het raam en keek naar de lucht. De sterren leken vanavond dichterbij dan anders. Ze telde er één, twee, drie… wel negen! Haar haasje vond ze er tien. 'Eén voor elke droom,' fluisterde Noor.",
  },
  {
    id: "boy-2",
    label: "Jongen, 2 jaar",
    name: "Daan",
    readTime: "~ 1 MIN VOORLEZEN",
    paragraph:
      "Daan had een beer. Een grote, zachte beer. De beer had honger. 'Wat eet jij?' vroeg Daan. De beer zei niks. Dus gaf Daan hem een boterham. Van knuffelbrood.",
  },
  {
    id: "boy-4",
    label: "Jongen, 4 jaar",
    name: "Daan",
    readTime: "~ 2 MIN VOORLEZEN",
    paragraph:
      "In Daans kamer was vanavond iets bijzonders: de maan was op bezoek. Hij zat gewoon op de vensterbank, zoals een kat. 'Mag ik iets vragen?' zei Daan. De maan knikte plechtig — zoals alleen manen dat kunnen.",
  },
];

export function StoryPreviewV2() {
  const [activeId, setActiveId] = useState<Profile["id"]>(PROFILES[0].id);
  const active = PROFILES.find((p) => p.id === activeId)!;

  return (
    <div>
      {/* Tabs */}
      <div role="tablist" className="mb-10 flex flex-wrap gap-3">
        {PROFILES.map((p) => {
          const selected = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(p.id)}
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

      {/* Book spread */}
      <div
        style={{
          background: V2.paperDeep,
          padding: "48px 56px",
          border: `1px solid ${V2.paperShade}`,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 56,
            alignItems: "center",
          }}
        >
          {/* Left: illustration plate */}
          <div
            style={{
              position: "relative",
              aspectRatio: "4 / 5",
              background: `linear-gradient(175deg, ${V2.night} 0%, ${V2.nightSoft} 100%)`,
              overflow: "hidden",
            }}
          >
            {/* moon */}
            <div
              style={{
                position: "absolute",
                top: "18%",
                right: "22%",
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: V2.gold,
                opacity: 0.9,
              }}
            />
            {/* starry specks, static per profile for consistency */}
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
            {/* horizon band */}
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
            <span
              style={{
                position: "absolute",
                bottom: 16,
                left: 20,
                fontFamily: V2.mono,
                fontSize: 10,
                letterSpacing: "0.14em",
                color: V2.gold,
                opacity: 0.7,
              }}
            >
              ILLUSTRATIE — BLZ 1
            </span>
          </div>

          {/* Right: text */}
          <div>
            <div
              style={{
                fontFamily: V2.display,
                fontStyle: "italic",
                fontSize: 22,
                color: V2.goldDeep,
                marginBottom: 18,
              }}
            >
              Eén
            </div>
            <p
              style={{
                fontFamily: V2.display,
                fontSize: 24,
                lineHeight: 1.5,
                margin: 0,
                fontWeight: 400,
                letterSpacing: -0.3,
                color: V2.ink,
              }}
            >
              <span
                style={{
                  fontSize: 72,
                  float: "left",
                  lineHeight: 0.8,
                  marginRight: 12,
                  marginTop: 6,
                  fontWeight: 400,
                }}
              >
                {active.paragraph.charAt(0)}
              </span>
              {active.paragraph.slice(1)}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 40,
                paddingTop: 20,
                borderTop: `1px solid ${V2.paperShade}`,
                fontFamily: V2.mono,
                fontSize: 11,
                color: V2.inkMute,
                letterSpacing: "0.1em",
              }}
            >
              <span>BLZ 1 / 6</span>
              <span>{active.readTime}</span>
            </div>
          </div>
        </div>
      </div>

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
        Voorbeeldfragment met profiel {active.name}.
      </p>
    </div>
  );
}
