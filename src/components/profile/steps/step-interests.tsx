"use client";

import { V2 } from "@/components/v2/tokens";
import { EBtn, Kicker, IconV2 } from "@/components/v2";
import type { ProfileData } from "../profile-wizard";

interface Props {
  data: ProfileData;
  onChange: (updates: Partial<ProfileData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const INTEREST_OPTIONS = [
  { value: "dinosaurs", label: "Dinosaurussen" },
  { value: "space", label: "Ruimte" },
  { value: "animals", label: "Dieren" },
  { value: "princesses", label: "Prinsessen" },
  { value: "cars", label: "Auto's" },
  { value: "sports", label: "Sport" },
  { value: "music", label: "Muziek" },
  { value: "cooking", label: "Koken" },
  { value: "nature", label: "Natuur" },
  { value: "pirates", label: "Piraten" },
  { value: "fairies", label: "Feeën" },
  { value: "robots", label: "Robots" },
  { value: "art", label: "Tekenen" },
  { value: "building", label: "Bouwen" },
  { value: "superheroes", label: "Superhelden" },
  { value: "swimming", label: "Zwemmen" },
];

const fieldLabel = {
  fontFamily: V2.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: V2.inkMute,
  display: "block",
  marginBottom: 8,
};

const underlineInput = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: `1px solid ${V2.paperShade}`,
  background: "transparent",
  fontSize: 16,
  fontFamily: V2.body,
  color: V2.ink,
  outline: "none",
};

export function StepInterests({ data, onChange, onNext, onBack }: Props) {
  function toggleInterest(value: string) {
    const current = data.interests;
    if (current.includes(value)) {
      onChange({ interests: current.filter((i) => i !== value) });
    } else {
      onChange({ interests: [...current, value] });
    }
  }

  return (
    <div>
      <Kicker>Wat vindt het kind leuk?</Kicker>
      <h2
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: "clamp(28px, 3.6vw, 32px)",
          margin: "12px 0 8px",
          letterSpacing: -0.7,
          lineHeight: 1.1,
          color: V2.ink,
        }}
      >
        Waar houdt{" "}
        <span style={{ fontStyle: "italic" }}>
          {data.name || "het kind"}
        </span>{" "}
        van?
      </h2>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.inkSoft,
          marginTop: 4,
          marginBottom: 28,
          lineHeight: 1.55,
          maxWidth: 560,
        }}
      >
        Kies er zoveel als je wilt, dit maakt de verhalen persoonlijker.
      </p>

      {/* Interests grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 8,
          marginBottom: 40,
        }}
      >
        {INTEREST_OPTIONS.map((option) => {
          const active = data.interests.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleInterest(option.value)}
              style={{
                padding: "14px 16px",
                textAlign: "center",
                background: active ? V2.ink : "transparent",
                color: active ? V2.paper : V2.ink,
                border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                cursor: "pointer",
                fontFamily: V2.display,
                fontSize: 15,
                fontWeight: 400,
                fontStyle: active ? "italic" : "normal",
                letterSpacing: -0.2,
                transition: "background .15s",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Favorite things */}
      <div
        style={{
          borderTop: `1px solid ${V2.paperShade}`,
          paddingTop: 28,
        }}
      >
        <Kicker>Favoriete dingen</Kicker>
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 13,
            color: V2.inkMute,
            margin: "10px 0 24px",
          }}
        >
          Optioneel, wij weven deze details door de verhalen.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 24,
          }}
        >
          <div>
            <label style={fieldLabel}>Favoriete kleur</label>
            <input
              type="text"
              value={data.favoriteThings.color}
              onChange={(e) =>
                onChange({
                  favoriteThings: { ...data.favoriteThings, color: e.target.value },
                })
              }
              placeholder="Bijv. blauw"
              style={underlineInput}
            />
          </div>
          <div>
            <label style={fieldLabel}>Favoriete eten</label>
            <input
              type="text"
              value={data.favoriteThings.food}
              onChange={(e) =>
                onChange({
                  favoriteThings: { ...data.favoriteThings, food: e.target.value },
                })
              }
              placeholder="Bijv. pannenkoeken"
              style={underlineInput}
            />
          </div>
          <div>
            <label style={fieldLabel}>Favoriete speelgoed</label>
            <input
              type="text"
              value={data.favoriteThings.toy}
              onChange={(e) =>
                onChange({
                  favoriteThings: { ...data.favoriteThings, toy: e.target.value },
                })
              }
              placeholder="Bijv. Lego"
              style={underlineInput}
            />
          </div>
          <div>
            <label style={fieldLabel}>Favoriete plek</label>
            <input
              type="text"
              value={data.favoriteThings.place}
              onChange={(e) =>
                onChange({
                  favoriteThings: { ...data.favoriteThings, place: e.target.value },
                })
              }
              placeholder="Bijv. het strand"
              style={underlineInput}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 40,
          paddingTop: 28,
          borderTop: `1px solid ${V2.paperShade}`,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← Vorige stap
        </button>
        <EBtn kind="primary" size="lg" onClick={onNext}>
          Volgende <IconV2 name="arrow" size={16} color={V2.paper} />
        </EBtn>
      </div>
    </div>
  );
}
