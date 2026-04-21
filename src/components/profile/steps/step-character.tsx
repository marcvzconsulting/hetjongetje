"use client";

import { V2 } from "@/components/v2/tokens";
import { EBtn, Kicker, IconV2 } from "@/components/v2";
import type { ProfileData } from "../profile-wizard";

interface Props {
  data: ProfileData;
  onChange: (updates: Partial<ProfileData>) => void;
  onBack: () => void;
  onSubmit: () => void;
  saving: boolean;
}

const CHARACTER_TYPES = [
  {
    value: "self",
    label: "Zichzelf als held",
    description: "Het kind is het hoofdpersonage van elk verhaal",
  },
  {
    value: "stuffed_animal",
    label: "Favoriete knuffel",
    description: "De knuffel beleeft de avonturen, het kind is de beste vriend",
  },
  {
    value: "action_hero",
    label: "Favoriete held",
    description: "Een superheld of filmfiguur is het hoofdpersonage",
  },
  {
    value: "custom",
    label: "Eigen personage",
    description: "Beschrijf zelf een uniek personage",
  },
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

export function StepCharacter({
  data,
  onChange,
  onBack,
  onSubmit,
  saving,
}: Props) {
  const needsDescription = data.mainCharacterType !== "self";
  const canSubmit = !(saving || (needsDescription && !data.mainCharacterDescription));

  const descriptionPlaceholder =
    data.mainCharacterType === "stuffed_animal"
      ? "Bijv. een bruine teddybeer genaamd Boris met een rood strikje"
      : data.mainCharacterType === "action_hero"
        ? "Bijv. een superheld die kan vliegen en onzichtbaar worden"
        : "Beschrijf het personage...";

  return (
    <div>
      <Kicker>Hoofdpersonage</Kicker>
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
        Wie staat{" "}
        <span style={{ fontStyle: "italic" }}>centraal</span> in het verhaal?
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
        De rode draad door elk verhaal — wie beleeft het avontuur?
      </p>

      {/* Character type tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 8,
          marginBottom: 28,
        }}
      >
        {CHARACTER_TYPES.map((type) => {
          const active = data.mainCharacterType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange({ mainCharacterType: type.value })}
              style={{
                textAlign: "left",
                padding: 18,
                background: active ? V2.ink : "transparent",
                color: active ? V2.paper : V2.ink,
                border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                cursor: "pointer",
                transition: "background .15s",
              }}
            >
              <div
                style={{
                  fontFamily: V2.display,
                  fontSize: 20,
                  fontStyle: active ? "italic" : "normal",
                  fontWeight: 400,
                }}
              >
                {type.label}
              </div>
              <div
                style={{
                  fontFamily: V2.ui,
                  fontSize: 12,
                  marginTop: 6,
                  opacity: 0.75,
                  lineHeight: 1.4,
                }}
              >
                {type.description}
              </div>
            </button>
          );
        })}
      </div>

      {needsDescription && (
        <div style={{ marginBottom: 40 }}>
          <label style={fieldLabel}>Beschrijf het personage</label>
          <textarea
            value={data.mainCharacterDescription}
            onChange={(e) =>
              onChange({ mainCharacterDescription: e.target.value })
            }
            rows={3}
            placeholder={descriptionPlaceholder}
            style={{
              width: "100%",
              padding: "10px 0",
              border: "none",
              borderBottom: `1px solid ${V2.paperShade}`,
              background: "transparent",
              fontSize: 16,
              fontFamily: V2.body,
              color: V2.ink,
              outline: "none",
              resize: "vertical",
              minHeight: 70,
            }}
          />
        </div>
      )}

      {/* Summary */}
      <div
        style={{
          marginTop: 40,
          padding: 24,
          background: V2.paper,
          border: `1px solid ${V2.paperShade}`,
        }}
      >
        <Kicker>Samenvatting</Kicker>
        <dl
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr)",
            gap: "10px 20px",
            margin: "14px 0 0",
          }}
        >
          <SummaryRow
            term="Naam"
            value={data.name || <em style={{ color: V2.inkMute }}>—</em>}
          />
          <SummaryRow
            term="Geboortedatum"
            value={
              data.dateOfBirth ? (
                new Date(data.dateOfBirth).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              ) : (
                <em style={{ color: V2.inkMute }}>—</em>
              )
            }
          />
          {data.interests.length > 0 && (
            <SummaryRow
              term="Interesses"
              value={data.interests.join(", ")}
            />
          )}
          {data.pets.length > 0 && (
            <SummaryRow
              term="Huisdieren"
              value={data.pets.map((p) => `${p.name} (${p.type})`).join(", ")}
            />
          )}
          {data.friends.length > 0 && (
            <SummaryRow
              term="Vrienden"
              value={data.friends.map((f) => f.name).join(", ")}
            />
          )}
        </dl>
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
        <EBtn
          kind="primary"
          size="lg"
          onClick={() => canSubmit && onSubmit()}
          style={{
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Profiel opslaan..." : "Profiel opslaan"}{" "}
          {!saving && <IconV2 name="arrow" size={16} color={V2.paper} />}
        </EBtn>
      </div>
    </div>
  );
}

function SummaryRow({
  term,
  value,
}: {
  term: string;
  value: React.ReactNode;
}) {
  return (
    <>
      <dt
        style={{
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: V2.inkMute,
          paddingTop: 2,
        }}
      >
        {term}
      </dt>
      <dd
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.ink,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {value}
      </dd>
    </>
  );
}
