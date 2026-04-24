"use client";

import { V2 } from "@/components/v2/tokens";
import { EBtn, Kicker, IconV2 } from "@/components/v2";
import type { ProfileData } from "../profile-wizard";
import { HairColorPicker, HairStylePicker, EyeColorPicker, SkinColorPicker } from "../appearance-pickers";

interface Props {
  data: ProfileData;
  onChange: (updates: Partial<ProfileData>) => void;
  onNext: () => void;
}

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

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

export function StepBasicInfo({ data, onChange, onNext }: Props) {
  const age = calculateAge(data.dateOfBirth);
  const validAge = age !== null && age >= 0 && age <= 10;
  const canContinue = Boolean(data.name && data.dateOfBirth && validAge && data.gender);

  const today = new Date();
  const maxDate = today.toISOString().split("T")[0];
  const minDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
    .toISOString()
    .split("T")[0];

  const GENDERS = [
    { value: "boy", label: "Jongen" },
    { value: "girl", label: "Meisje" },
    { value: "other", label: "Anders" },
  ];

  return (
    <div>
      <Kicker>Basisgegevens</Kicker>
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
        Vertel ons wie <span style={{ fontStyle: "italic" }}>dit kind</span> is.
      </h2>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.inkSoft,
          marginTop: 4,
          marginBottom: 36,
          lineHeight: 1.55,
          maxWidth: 560,
        }}
      >
        Naam en leeftijd bepalen de toon van het verhaal. De rest is voor de illustratie.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 24,
          marginBottom: 28,
        }}
      >
        <div>
          <label style={fieldLabel}>Naam</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Bijv. Emma"
            style={underlineInput}
          />
        </div>

        <div>
          <label style={fieldLabel}>Geboortedatum</label>
          <input
            type="date"
            value={data.dateOfBirth}
            min={minDate}
            max={maxDate}
            onChange={(e) => onChange({ dateOfBirth: e.target.value })}
            style={underlineInput}
          />
          {data.dateOfBirth && age !== null && (
            <p
              style={{
                fontFamily: V2.body,
                fontStyle: "italic",
                fontSize: 13,
                color: validAge ? V2.inkMute : V2.heart,
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {validAge ? (
                <>
                  {data.name || "Je kind"} is <strong style={{ color: V2.ink, fontStyle: "normal" }}>{age} jaar</strong>
                  {age <= 1
                    ? ", verhalen worden heel kort en zacht"
                    : age <= 4
                      ? ", verhalen worden extra simpel en lief"
                      : age <= 7
                        ? ", verhalen met duidelijke emoties en humor"
                        : ", verhalen met meer avontuur en spanning"}
                </>
              ) : (
                <>Ons Verhaaltje is bedoeld voor kinderen van 0 tot 10 jaar.</>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Gender tiles */}
      <div style={{ marginBottom: 40 }}>
        <label style={fieldLabel}>Geslacht</label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
            marginTop: 2,
          }}
        >
          {GENDERS.map((g) => {
            const active = data.gender === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => onChange({ gender: g.value })}
                style={{
                  padding: "16px 12px",
                  textAlign: "center",
                  background: active ? V2.ink : "transparent",
                  color: active ? V2.paper : V2.ink,
                  border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                  cursor: "pointer",
                  fontFamily: V2.display,
                  fontSize: 17,
                  fontWeight: 400,
                  fontStyle: active ? "italic" : "normal",
                  letterSpacing: -0.2,
                  transition: "background .15s",
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appearance */}
      <div
        style={{
          borderTop: `1px solid ${V2.paperShade}`,
          paddingTop: 32,
          marginBottom: 32,
        }}
      >
        <Kicker>Uiterlijk</Kicker>
        <h3
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 24,
            margin: "10px 0 4px",
            letterSpacing: -0.4,
            color: V2.ink,
          }}
        >
          Hoe ziet{" "}
          <span style={{ fontStyle: "italic" }}>
            {data.name || "het kind"}
          </span>{" "}
          eruit?
        </h3>
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 13,
            color: V2.inkMute,
            margin: "0 0 24px",
          }}
        >
          Voor consistente illustraties door alle verhalen heen.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SkinColorPicker value={data.skinColor} onChange={(v) => onChange({ skinColor: v })} />
          <HairColorPicker value={data.hairColor} onChange={(v) => onChange({ hairColor: v })} />
          <HairStylePicker value={data.hairStyle} onChange={(v) => onChange({ hairStyle: v })} />
          <EyeColorPicker value={data.eyeColor} onChange={(v) => onChange({ eyeColor: v })} />
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontFamily: V2.ui,
              fontSize: 14,
              color: V2.ink,
            }}
          >
            <input
              type="checkbox"
              checked={data.wearsGlasses}
              onChange={(e) => onChange({ wearsGlasses: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: V2.ink }}
            />
            Bril
          </label>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontFamily: V2.ui,
              fontSize: 14,
              color: V2.ink,
            }}
          >
            <input
              type="checkbox"
              checked={data.hasFreckles}
              onChange={(e) => onChange({ hasFreckles: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: V2.ink }}
            />
            Sproetjes
          </label>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 40,
          paddingTop: 28,
          borderTop: `1px solid ${V2.paperShade}`,
        }}
      >
        <EBtn
          kind="primary"
          size="lg"
          onClick={() => canContinue && onNext()}
          style={{
            opacity: canContinue ? 1 : 0.4,
            cursor: canContinue ? "pointer" : "not-allowed",
          }}
        >
          Volgende <IconV2 name="arrow" size={16} color={V2.paper} />
        </EBtn>
      </div>
    </div>
  );
}
