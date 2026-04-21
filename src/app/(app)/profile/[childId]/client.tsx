"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { V2 } from "@/components/v2/tokens";
import { EBtn, Kicker, IconV2 } from "@/components/v2";
import {
  HairColorPicker,
  HairStylePicker,
  EyeColorPicker,
  SkinColorPicker,
} from "@/components/profile/appearance-pickers";
import { CharacterPreview } from "@/components/profile/character-preview";

interface ChildData {
  id: string;
  name: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinColor: string;
  wearsGlasses: boolean;
  hasFreckles: boolean;
  interests: string[];
  pets: { name: string; type: string }[];
  friends: { name: string; relationship: string }[];
  favoriteThings: { color: string; food: string; toy: string; place: string };
  fears: string[];
  mainCharacterType: string;
  mainCharacterDescription: string;
  storyCount: number;
  approvedPreviewUrl: string | null;
  hasApprovedPrompt: boolean;
}

interface Props {
  child: ChildData;
}

const INTEREST_OPTIONS = [
  { value: "animals", label: "Dieren" },
  { value: "space", label: "Ruimte" },
  { value: "princesses", label: "Prinsessen" },
  { value: "dinosaurs", label: "Dinosaurussen" },
  { value: "sports", label: "Sport" },
  { value: "music", label: "Muziek" },
  { value: "cars", label: "Auto's" },
  { value: "nature", label: "Natuur" },
  { value: "cooking", label: "Koken" },
  { value: "art", label: "Tekenen" },
  { value: "building", label: "Bouwen" },
  { value: "reading", label: "Lezen" },
];

const CHARACTER_TYPES = [
  { value: "self", label: "Zichzelf", description: "Het kind is de held" },
  { value: "stuffed_animal", label: "Knuffeldier", description: "Een favoriete knuffel als held" },
  { value: "action_hero", label: "Superheld", description: "Een favoriete held of figuur" },
  { value: "custom", label: "Eigen personage", description: "Een zelf bedacht karakter" },
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

// ── Shared view blocks ──────────────────────────────────────────

function SubCard({
  kicker,
  title,
  titleItalic,
  children,
}: {
  kicker: string;
  title?: string;
  titleItalic?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: 24,
      }}
    >
      <Kicker>{kicker}</Kicker>
      {(title || titleItalic) && (
        <h3
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 22,
            margin: "10px 0 18px",
            letterSpacing: -0.4,
            color: V2.ink,
          }}
        >
          {title}
          {titleItalic && (
            <>
              {" "}
              <span style={{ fontStyle: "italic" }}>{titleItalic}</span>
            </>
          )}
        </h3>
      )}
      <div style={{ marginTop: title || titleItalic ? 0 : 14 }}>{children}</div>
    </section>
  );
}

function Dl({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr)",
        gap: "10px 20px",
        margin: 0,
      }}
    >
      {rows.map(([term, value], i) => (
        <div key={i} style={{ display: "contents" }}>
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
        </div>
      ))}
    </dl>
  );
}

export function ProfileEditor({ child }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    name: child.name,
    dateOfBirth: child.dateOfBirth,
    gender: child.gender,
    interests: child.interests,
    pets: child.pets,
    friends: child.friends,
    favoriteThings: child.favoriteThings,
    fears: child.fears,
    hairColor: child.hairColor,
    hairStyle: child.hairStyle,
    eyeColor: child.eyeColor,
    skinColor: child.skinColor,
    wearsGlasses: child.wearsGlasses,
    hasFreckles: child.hasFreckles,
    mainCharacterType: child.mainCharacterType,
    mainCharacterDescription: child.mainCharacterDescription,
  });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Opslaan mislukt");
      setEditing(false);
      router.refresh();
    } catch {
      setError("Er ging iets mis bij het opslaan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/children/${child.id}`, { method: "DELETE" });
      if (res.ok) router.push("/dashboard");
    } catch {
      /* ignore */
    }
    setDeleting(false);
  }

  function toggleInterest(interest: string) {
    setData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  const charType = CHARACTER_TYPES.find((c) => c.value === data.mainCharacterType);
  const genderLabel =
    child.gender === "boy" ? "Jongen" : child.gender === "girl" ? "Meisje" : "Anders";

  // ── View mode ──────────────────────────────────────────────────

  if (!editing) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              color: V2.inkMute,
              letterSpacing: 0.2,
            }}
          >
            {child.storyCount} {child.storyCount === 1 ? "verhaal" : "verhalen"} · {genderLabel}
          </div>
          <EBtn kind="ghost" size="sm" onClick={() => setEditing(true)}>
            <IconV2 name="pen" size={14} color={V2.ink} /> Profiel bewerken
          </EBtn>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Interests */}
          <SubCard kicker="Interesses">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {child.interests.length === 0 ? (
                <span
                  style={{
                    fontFamily: V2.body,
                    fontStyle: "italic",
                    fontSize: 14,
                    color: V2.inkMute,
                  }}
                >
                  Nog geen interesses ingevuld.
                </span>
              ) : (
                child.interests.map((interest) => {
                  const option = INTEREST_OPTIONS.find((o) => o.value === interest);
                  return (
                    <span
                      key={interest}
                      style={{
                        padding: "6px 12px",
                        border: `1px solid ${V2.paperShade}`,
                        fontFamily: V2.body,
                        fontSize: 14,
                        color: V2.ink,
                        background: V2.paperDeep,
                      }}
                    >
                      {option?.label ?? interest}
                    </span>
                  );
                })
              )}
            </div>
          </SubCard>

          {/* Appearance */}
          {(child.hairColor || child.eyeColor || child.skinColor) && (
            <SubCard kicker="Uiterlijk">
              <Dl
                rows={[
                  ...(child.hairColor
                    ? [["Haar", `${child.hairColor}${child.hairStyle ? `, ${child.hairStyle}` : ""}`] as [string, React.ReactNode]]
                    : []),
                  ...(child.eyeColor ? [["Ogen", child.eyeColor] as [string, React.ReactNode]] : []),
                  ...(child.skinColor ? [["Huid", child.skinColor] as [string, React.ReactNode]] : []),
                  ...(child.wearsGlasses ? [["Bril", "Ja"] as [string, React.ReactNode]] : []),
                  ...(child.hasFreckles ? [["Sproetjes", "Ja"] as [string, React.ReactNode]] : []),
                ]}
              />
            </SubCard>
          )}

          {/* Favorites */}
          {child.favoriteThings &&
            (child.favoriteThings.color ||
              child.favoriteThings.food ||
              child.favoriteThings.toy ||
              child.favoriteThings.place) && (
              <SubCard kicker="Favoriete dingen">
                <Dl
                  rows={[
                    ...(child.favoriteThings.color
                      ? [["Kleur", child.favoriteThings.color] as [string, React.ReactNode]]
                      : []),
                    ...(child.favoriteThings.food
                      ? [["Eten", child.favoriteThings.food] as [string, React.ReactNode]]
                      : []),
                    ...(child.favoriteThings.toy
                      ? [["Speelgoed", child.favoriteThings.toy] as [string, React.ReactNode]]
                      : []),
                    ...(child.favoriteThings.place
                      ? [["Plek", child.favoriteThings.place] as [string, React.ReactNode]]
                      : []),
                  ]}
                />
              </SubCard>
            )}

          {/* Pets & friends */}
          {(child.pets.length > 0 || child.friends.length > 0) && (
            <SubCard kicker="Vrienden & huisdieren">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {child.pets.map((pet, i) => (
                  <div
                    key={`p${i}`}
                    style={{
                      fontFamily: V2.body,
                      fontSize: 15,
                      color: V2.ink,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: V2.ui,
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: V2.inkMute,
                        marginRight: 12,
                      }}
                    >
                      Huisdier
                    </span>
                    <span style={{ fontStyle: "italic" }}>{pet.name}</span>
                    <span style={{ color: V2.inkMute }}> — {pet.type}</span>
                  </div>
                ))}
                {child.friends.map((friend, i) => (
                  <div
                    key={`f${i}`}
                    style={{
                      fontFamily: V2.body,
                      fontSize: 15,
                      color: V2.ink,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: V2.ui,
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: V2.inkMute,
                        marginRight: 12,
                      }}
                    >
                      Vriend
                    </span>
                    <span style={{ fontStyle: "italic" }}>{friend.name}</span>
                    {friend.relationship && (
                      <span style={{ color: V2.inkMute }}> — {friend.relationship}</span>
                    )}
                  </div>
                ))}
              </div>
            </SubCard>
          )}

          {/* Character */}
          <SubCard kicker="Hoofdpersonage">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontFamily: V2.display,
                  fontSize: 20,
                  fontStyle: "italic",
                  color: V2.ink,
                }}
              >
                {charType?.label ?? data.mainCharacterType}
              </div>
              {child.mainCharacterDescription && (
                <p
                  style={{
                    fontFamily: V2.body,
                    fontSize: 14,
                    color: V2.inkSoft,
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {child.mainCharacterDescription}
                </p>
              )}
            </div>
          </SubCard>

          {/* Character preview */}
          <CharacterPreview
            childId={child.id}
            childName={child.name}
            currentPreviewUrl={child.approvedPreviewUrl}
            isApproved={child.hasApprovedPrompt}
          />

          {/* Primary action */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 24,
              borderTop: `1px solid ${V2.paperShade}`,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <EBtn
              kind="primary"
              size="lg"
              href={`/generate/${child.id}`}
            >
              Nieuw verhaal maken{" "}
              <IconV2 name="arrow" size={16} color={V2.paper} />
            </EBtn>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Kicker>Bewerken</Kicker>
        <button
          type="button"
          onClick={() => setEditing(false)}
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
          ← Annuleren
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            background: "rgba(196,165,168,0.2)",
            borderLeft: `2px solid ${V2.rose}`,
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Basic info */}
        <SubCard kicker="Basisgegevens">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 24,
            }}
          >
            <div>
              <label style={fieldLabel}>Naam</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                style={underlineInput}
              />
            </div>
            <div>
              <label style={fieldLabel}>Geboortedatum</label>
              <input
                type="date"
                value={data.dateOfBirth}
                onChange={(e) => setData((d) => ({ ...d, dateOfBirth: e.target.value }))}
                style={underlineInput}
              />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <label style={fieldLabel}>Geslacht</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {[
                { value: "boy", label: "Jongen" },
                { value: "girl", label: "Meisje" },
                { value: "other", label: "Anders" },
              ].map((g) => {
                const active = data.gender === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setData((d) => ({ ...d, gender: g.value }))}
                    style={{
                      padding: "14px 12px",
                      textAlign: "center",
                      background: active ? V2.ink : "transparent",
                      color: active ? V2.paper : V2.ink,
                      border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                      cursor: "pointer",
                      fontFamily: V2.display,
                      fontSize: 16,
                      fontStyle: active ? "italic" : "normal",
                    }}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </SubCard>

        {/* Appearance */}
        <SubCard kicker="Uiterlijk">
          <p
            style={{
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 13,
              color: V2.inkMute,
              margin: "0 0 20px",
            }}
          >
            Voor consistente illustraties door elk verhaal heen.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SkinColorPicker
              value={data.skinColor}
              onChange={(v) => setData((d) => ({ ...d, skinColor: v }))}
            />
            <HairColorPicker
              value={data.hairColor}
              onChange={(v) => setData((d) => ({ ...d, hairColor: v }))}
            />
            <HairStylePicker
              value={data.hairStyle}
              onChange={(v) => setData((d) => ({ ...d, hairStyle: v }))}
            />
            <EyeColorPicker
              value={data.eyeColor}
              onChange={(v) => setData((d) => ({ ...d, eyeColor: v }))}
            />
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
                onChange={(e) => setData((d) => ({ ...d, wearsGlasses: e.target.checked }))}
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
                onChange={(e) => setData((d) => ({ ...d, hasFreckles: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: V2.ink }}
              />
              Sproetjes
            </label>
          </div>
        </SubCard>

        {/* Interests */}
        <SubCard kicker="Interesses">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8,
            }}
          >
            {INTEREST_OPTIONS.map((opt) => {
              const active = data.interests.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleInterest(opt.value)}
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    background: active ? V2.ink : "transparent",
                    color: active ? V2.paper : V2.ink,
                    border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                    cursor: "pointer",
                    fontFamily: V2.display,
                    fontSize: 15,
                    fontStyle: active ? "italic" : "normal",
                    letterSpacing: -0.2,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </SubCard>

        {/* Favorites */}
        <SubCard kicker="Favoriete dingen">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 24,
            }}
          >
            {[
              { key: "color", label: "Kleur", placeholder: "Blauw" },
              { key: "food", label: "Eten", placeholder: "Pannenkoeken" },
              { key: "toy", label: "Speelgoed", placeholder: "Lego" },
              { key: "place", label: "Plek", placeholder: "Het park" },
            ].map((field) => (
              <div key={field.key}>
                <label style={fieldLabel}>{field.label}</label>
                <input
                  type="text"
                  value={
                    data.favoriteThings[field.key as keyof typeof data.favoriteThings]
                  }
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      favoriteThings: {
                        ...d.favoriteThings,
                        [field.key]: e.target.value,
                      },
                    }))
                  }
                  placeholder={field.placeholder}
                  style={underlineInput}
                />
              </div>
            ))}
          </div>
        </SubCard>

        {/* Character */}
        <SubCard kicker="Hoofdpersonage">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {CHARACTER_TYPES.map((ct) => {
              const active = data.mainCharacterType === ct.value;
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() =>
                    setData((d) => ({ ...d, mainCharacterType: ct.value }))
                  }
                  style={{
                    textAlign: "left",
                    padding: 16,
                    background: active ? V2.ink : "transparent",
                    color: active ? V2.paper : V2.ink,
                    border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontFamily: V2.display,
                      fontSize: 17,
                      fontStyle: active ? "italic" : "normal",
                    }}
                  >
                    {ct.label}
                  </div>
                  <div
                    style={{
                      fontFamily: V2.ui,
                      fontSize: 11,
                      marginTop: 4,
                      opacity: 0.75,
                      lineHeight: 1.4,
                    }}
                  >
                    {ct.description}
                  </div>
                </button>
              );
            })}
          </div>
          {data.mainCharacterType !== "self" && (
            <div style={{ marginTop: 18 }}>
              <label style={fieldLabel}>Beschrijving</label>
              <textarea
                value={data.mainCharacterDescription}
                onChange={(e) =>
                  setData((d) => ({ ...d, mainCharacterDescription: e.target.value }))
                }
                placeholder="Beschrijf het personage..."
                rows={2}
                style={{
                  ...underlineInput,
                  resize: "vertical",
                  minHeight: 50,
                }}
              />
            </div>
          )}
        </SubCard>

        {/* Save / cancel */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            paddingTop: 24,
            borderTop: `1px solid ${V2.paperShade}`,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <EBtn kind="ghost" size="md" onClick={() => setEditing(false)}>
            Annuleren
          </EBtn>
          <EBtn
            kind="primary"
            size="lg"
            onClick={() => !saving && handleSave()}
            style={{
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Opslaan..." : "Profiel opslaan"}{" "}
            {!saving && <IconV2 name="arrow" size={16} color={V2.paper} />}
          </EBtn>
        </div>

        {/* Danger zone */}
        <section
          style={{
            marginTop: 32,
            padding: 24,
            background: "rgba(196,165,168,0.08)",
            border: `1px solid rgba(176, 74, 65, 0.25)`,
          }}
        >
          <Kicker color={V2.heart}>Gevarenzone</Kicker>
          <h3
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: 22,
              margin: "10px 0 8px",
              letterSpacing: -0.4,
              color: V2.ink,
            }}
          >
            Profiel{" "}
            <span style={{ fontStyle: "italic" }}>verwijderen.</span>
          </h3>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 14,
              color: V2.inkSoft,
              margin: "0 0 18px",
              lineHeight: 1.6,
              maxWidth: "60ch",
            }}
          >
            Dit verwijdert het profiel en alle {child.storyCount}{" "}
            {child.storyCount === 1 ? "verhaal" : "verhalen"}. Dit kan niet worden teruggedraaid.
          </p>
          {deleteConfirm ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: "10px 20px",
                  background: V2.heart,
                  color: V2.paper,
                  border: "none",
                  fontFamily: V2.ui,
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: 0.2,
                  cursor: deleting ? "not-allowed" : "pointer",
                  borderRadius: 2,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Verwijderen..." : "Ja, verwijder alles"}
              </button>
              <EBtn kind="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>
                Annuleren
              </EBtn>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              style={{
                padding: "10px 18px",
                background: "transparent",
                color: V2.heart,
                border: `1px solid ${V2.heart}`,
                fontFamily: V2.ui,
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: 0.2,
                cursor: "pointer",
                borderRadius: 2,
              }}
            >
              Profiel verwijderen
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
