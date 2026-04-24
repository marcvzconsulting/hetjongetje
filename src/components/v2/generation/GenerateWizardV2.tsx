"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn, IconV2 } from "@/components/v2";
import { StarField } from "@/components/v2/StarField";
import {
  STORY_SETTINGS,
  ADVENTURE_TYPES,
  STORY_MOODS,
  OCCASIONS,
} from "@/lib/ai/prompts/story-request";

// ── Types ───────────────────────────────────────────────────────

interface ChildData {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  hairColor: string | null;
  hairStyle: string | null;
  eyeColor: string | null;
  skinColor: string | null;
  wearsGlasses: boolean;
  hasFreckles: boolean;
  interests: string[];
  pets: { name: string; type: string; description?: string }[] | null;
  friends: { name: string; relationship: string; description?: string }[] | null;
  favoriteThings: {
    color?: string;
    food?: string;
    toy?: string;
    place?: string;
  } | null;
  fears: string[];
  mainCharacterType: string;
  mainCharacterDescription: string | null;
  approvedCharacterPrompt: string | null;
  loraUrl: string | null;
  loraTriggerWord: string | null;
}

type Length = "short" | "medium" | "long";

interface Params {
  specialDetail: string;
  mainCharacterType: string;
  mainCharacterDescription: string;
  length: Length;
  setting: string;
  adventureType: string;
  mood: string;
  occasion: string;
}

const HERO_TYPES = [
  { value: "self", label: "Zichzelf", description: "Het kind is de held" },
  {
    value: "stuffed_animal",
    label: "De knuffel",
    description: "De favoriete knuffel beleeft het",
  },
  {
    value: "action_hero",
    label: "Favoriete held",
    description: "Een superheld of filmfiguur",
  },
  {
    value: "custom",
    label: "Eigen personage",
    description: "Beschrijf het zelf",
  },
] as const;

const LENGTHS: { value: Length; label: string; sub: string }[] = [
  { value: "short", label: "Kort", sub: "± 3 min" },
  { value: "medium", label: "Normaal", sub: "± 6 min" },
  { value: "long", label: "Lang", sub: "± 10 min" },
];

const TOTAL_STEPS = 4;

// ── Main ────────────────────────────────────────────────────────

export function GenerateWizardV2({ child }: { child: ChildData }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [params, setParams] = useState<Params>({
    specialDetail: "",
    mainCharacterType: child.mainCharacterType || "self",
    mainCharacterDescription: child.mainCharacterDescription ?? "",
    length: "medium",
    setting: "",
    adventureType: "",
    mood: "",
    occasion: "none",
  });

  function update(u: Partial<Params>) {
    setParams((p) => ({ ...p, ...u }));
  }

  async function submit() {
    setGenerating(true);
    setError("");
    try {
      const characterBible = {
        childName: child.name,
        dateOfBirth: child.dateOfBirth,
        gender: child.gender,
        hairColor: child.hairColor || undefined,
        hairStyle: child.hairStyle || undefined,
        eyeColor: child.eyeColor || undefined,
        skinColor: child.skinColor || undefined,
        wearsGlasses: child.wearsGlasses,
        hasFreckles: child.hasFreckles,
        approvedCharacterPrompt: child.approvedCharacterPrompt || undefined,
        loraUrl: child.loraUrl || undefined,
        loraTriggerWord: child.loraTriggerWord || undefined,
        interests: child.interests,
        pets: child.pets || undefined,
        friends: child.friends || undefined,
        favoriteThings: child.favoriteThings || undefined,
        fears: child.fears,
        mainCharacterType: params.mainCharacterType,
        mainCharacterDescription:
          params.mainCharacterDescription || undefined,
      };

      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: child.id,
          characterBible,
          storyRequest: {
            setting: params.setting,
            adventureType: params.adventureType,
            mood: params.mood,
            occasion:
              params.occasion !== "none" ? params.occasion : undefined,
            length: params.length,
            specialDetail: params.specialDetail || undefined,
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "" }));
        throw new Error(d.error || "Verhaal genereren mislukt");
      }
      const data = await res.json();
      router.push(`/story/${data.story.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
      setGenerating(false);
    }
  }

  if (generating) return <GeneratingState childName={child.name} />;

  // Validation per step to allow/disallow "Volgende"
  const canNext =
    step === 1
      ? // step 1: hero must be picked; description required for non-self
        Boolean(params.mainCharacterType) &&
        (params.mainCharacterType === "self" ||
          params.mainCharacterDescription.trim().length > 0)
      : step === 2
        ? Boolean(params.setting)
        : step === 3
          ? Boolean(params.adventureType) && Boolean(params.mood)
          : true;

  return (
    <div>
      {/* Top meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 0 32px",
          borderBottom: `1px solid ${V2.paperShade}`,
          marginBottom: 40,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
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
        ) : (
          <span />
        )}
        <div
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.14em",
          }}
        >
          STAP {roman(step)} VAN {roman(TOTAL_STEPS)}
        </div>
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
          }}
        >
          voor{" "}
          <span
            style={{
              color: V2.ink,
              fontStyle: "italic",
              fontFamily: V2.display,
              fontSize: 16,
            }}
          >
            {child.name}
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(196,165,168,0.2)",
            padding: 16,
            marginBottom: 24,
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
            borderLeft: `2px solid ${V2.rose}`,
          }}
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <Step1
          params={params}
          update={update}
          childName={child.name}
        />
      )}
      {step === 2 && <Step2 params={params} update={update} />}
      {step === 3 && <Step3 params={params} update={update} />}
      {step === 4 && <Step4 params={params} update={update} />}

      {/* Footer nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 48,
          paddingTop: 28,
          borderTop: `1px solid ${V2.paperShade}`,
        }}
      >
        {step < TOTAL_STEPS ? (
          <EBtn
            kind="primary"
            size="lg"
            onClick={() => canNext && setStep((s) => s + 1)}
            style={{
              opacity: canNext ? 1 : 0.4,
              cursor: canNext ? "pointer" : "not-allowed",
            }}
          >
            Volgende{" "}
            <IconV2 name="arrow" size={16} color={V2.paper} />
          </EBtn>
        ) : (
          <EBtn kind="primary" size="lg" onClick={submit}>
            Maak het verhaal{" "}
            <IconV2 name="arrow" size={16} color={V2.paper} />
          </EBtn>
        )}
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────────

function Step1({
  params,
  update,
  childName,
}: {
  params: Params;
  update: (u: Partial<Params>) => void;
  childName: string;
}) {
  const charCount = params.specialDetail.length;
  const needsDescription = params.mainCharacterType !== "self";
  return (
    <>
      <Kicker>Vertel ons wat er vandaag is</Kicker>
      <h1
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: "clamp(38px, 5vw, 52px)",
          margin: "20px 0 12px",
          letterSpacing: -1.4,
          lineHeight: 1.05,
        }}
      >
        Wat is er <span style={{ fontStyle: "italic" }}>vandaag</span>{" "}
        gebeurd?
      </h1>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 17,
          color: V2.inkSoft,
          marginTop: 6,
          maxWidth: 620,
          lineHeight: 1.55,
        }}
      >
        Eén zin is genoeg. Vertel meer als je wil. Wij halen eruit wat
        belangrijk is. Laat het leeg als het gewoon een avondverhaal moet
        worden.
      </p>

      <div
        style={{
          marginTop: 32,
          border: `1px solid ${V2.paperShade}`,
          background: V2.paper,
        }}
      >
        <textarea
          value={params.specialDetail}
          onChange={(e) => update({ specialDetail: e.target.value })}
          maxLength={500}
          placeholder={`Bijv. "${childName} heeft vandaag voor het eerst haar naam zelf geschreven."`}
          style={{
            width: "100%",
            padding: "20px 24px",
            border: "none",
            outline: "none",
            fontSize: 18,
            fontFamily: V2.display,
            fontWeight: 300,
            minHeight: 150,
            resize: "none",
            background: "transparent",
            color: V2.ink,
            lineHeight: 1.5,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "10px 20px",
            borderTop: `1px solid ${V2.paperShade}`,
            fontFamily: V2.mono,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.1em",
          }}
        >
          {charCount} / 500
        </div>
      </div>

      {/* Hero + Length side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 40,
          marginTop: 48,
        }}
      >
        <div>
          <Kicker>Wie is de held?</Kicker>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 14,
            }}
          >
            {HERO_TYPES.map((h) => {
              const active = params.mainCharacterType === h.value;
              return (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => update({ mainCharacterType: h.value })}
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
                    {h.label}
                  </div>
                  <div
                    style={{
                      fontFamily: V2.ui,
                      fontSize: 12,
                      marginTop: 4,
                      opacity: 0.7,
                    }}
                  >
                    {h.description}
                  </div>
                </button>
              );
            })}
          </div>
          {needsDescription && (
            <input
              type="text"
              value={params.mainCharacterDescription}
              onChange={(e) =>
                update({ mainCharacterDescription: e.target.value })
              }
              placeholder={
                params.mainCharacterType === "stuffed_animal"
                  ? "Bijv. Haasje met één oog"
                  : params.mainCharacterType === "action_hero"
                    ? "Bijv. Superman, Elsa, Batman"
                    : "Beschrijf het personage"
              }
              style={{
                width: "100%",
                marginTop: 14,
                padding: "12px 0",
                border: "none",
                borderBottom: `1px solid ${V2.ink}`,
                background: "transparent",
                fontSize: 16,
                fontFamily: V2.body,
                color: V2.ink,
                outline: "none",
              }}
            />
          )}
        </div>

        <div>
          <Kicker>Hoe lang?</Kicker>
          <div
            style={{
              display: "flex",
              gap: 0,
              marginTop: 14,
              border: `1px solid ${V2.paperShade}`,
            }}
          >
            {LENGTHS.map((L, i) => {
              const active = params.length === L.value;
              return (
                <button
                  key={L.value}
                  type="button"
                  onClick={() => update({ length: L.value })}
                  style={{
                    flex: 1,
                    padding: "16px 12px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: active ? V2.ink : "transparent",
                    color: active ? V2.paper : V2.ink,
                    borderLeft:
                      i > 0
                        ? `1px solid ${active ? V2.ink : V2.paperShade}`
                        : "none",
                    border: "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: V2.display,
                      fontSize: 18,
                      fontStyle: active ? "italic" : "normal",
                    }}
                  >
                    {L.label}
                  </div>
                  <div
                    style={{
                      fontFamily: V2.mono,
                      fontSize: 10,
                      opacity: 0.7,
                      letterSpacing: "0.1em",
                      marginTop: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    {L.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function Step2({
  params,
  update,
}: {
  params: Params;
  update: (u: Partial<Params>) => void;
}) {
  return (
    <>
      <Kicker>De wereld</Kicker>
      <h1
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: "clamp(38px, 5vw, 52px)",
          margin: "20px 0 12px",
          letterSpacing: -1.4,
          lineHeight: 1.05,
        }}
      >
        Waar speelt het zich{" "}
        <span style={{ fontStyle: "italic" }}>af?</span>
      </h1>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 17,
          color: V2.inkSoft,
          marginTop: 6,
          maxWidth: 620,
          lineHeight: 1.55,
        }}
      >
        Kies een wereld. Jullie eigen thuissituatie blijft altijd het
        vertrekpunt. Dit bepaalt waar het avontuur heen gaat.
      </p>
      <TileGrid
        options={Object.entries(STORY_SETTINGS).map(([key, s]) => ({
          value: key,
          label: s.label,
        }))}
        active={params.setting}
        onPick={(v) => update({ setting: v })}
        cols={3}
      />
    </>
  );
}

function Step3({
  params,
  update,
}: {
  params: Params;
  update: (u: Partial<Params>) => void;
}) {
  return (
    <>
      <Kicker>Soort & sfeer</Kicker>
      <h1
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: "clamp(38px, 5vw, 52px)",
          margin: "20px 0 12px",
          letterSpacing: -1.4,
          lineHeight: 1.05,
        }}
      >
        Wat voor{" "}
        <span style={{ fontStyle: "italic" }}>avontuur</span> wordt het?
      </h1>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 17,
          color: V2.inkSoft,
          marginTop: 6,
          maxWidth: 620,
          lineHeight: 1.55,
        }}
      >
        Twee keuzes: wat voor soort verhaal, en welke sfeer het moet hebben.
      </p>

      <div style={{ marginTop: 40 }}>
        <Kicker>Soort avontuur</Kicker>
        <TileGrid
          options={Object.entries(ADVENTURE_TYPES).map(([k, a]) => ({
            value: k,
            label: a.label,
          }))}
          active={params.adventureType}
          onPick={(v) => update({ adventureType: v })}
          cols={3}
        />
      </div>

      <div style={{ marginTop: 40 }}>
        <Kicker>Sfeer</Kicker>
        <TileGrid
          options={Object.entries(STORY_MOODS).map(([k, m]) => ({
            value: k,
            label: m.label,
          }))}
          active={params.mood}
          onPick={(v) => update({ mood: v })}
          cols={4}
        />
      </div>
    </>
  );
}

function Step4({
  params,
  update,
}: {
  params: Params;
  update: (u: Partial<Params>) => void;
}) {
  const occasionEntries = Object.entries(OCCASIONS).filter(
    ([k]) => k !== "none"
  );
  return (
    <>
      <Kicker>Bijzondere aanleiding</Kicker>
      <h1
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: "clamp(38px, 5vw, 52px)",
          margin: "20px 0 12px",
          letterSpacing: -1.4,
          lineHeight: 1.05,
        }}
      >
        Is er iets te{" "}
        <span style={{ fontStyle: "italic" }}>vieren?</span>
      </h1>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 17,
          color: V2.inkSoft,
          marginTop: 6,
          maxWidth: 620,
          lineHeight: 1.55,
        }}
      >
        Optioneel. Laat het op &ldquo;Geen&rdquo; staan als het gewoon een
        avondverhaal moet worden.
      </p>

      <div style={{ marginTop: 32 }}>
        <button
          type="button"
          onClick={() => update({ occasion: "none" })}
          style={{
            display: "block",
            width: "100%",
            padding: 18,
            textAlign: "left",
            background: params.occasion === "none" ? V2.ink : "transparent",
            color: params.occasion === "none" ? V2.paper : V2.ink,
            border: `1px solid ${
              params.occasion === "none" ? V2.ink : V2.paperShade
            }`,
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: V2.display,
              fontSize: 20,
              fontStyle: params.occasion === "none" ? "italic" : "normal",
            }}
          >
            Geen speciale aanleiding
          </div>
          <div
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              marginTop: 4,
              opacity: 0.7,
            }}
          >
            Gewoon een avondverhaal
          </div>
        </button>

        <TileGrid
          options={occasionEntries.map(([k, o]) => ({
            value: k,
            label: o.label,
          }))}
          active={params.occasion}
          onPick={(v) => update({ occasion: v })}
          cols={3}
        />
      </div>
    </>
  );
}

// ── UI primitives ──────────────────────────────────────────────

function TileGrid({
  options,
  active,
  onPick,
  cols,
}: {
  options: { value: string; label: string }[];
  active: string;
  onPick: (v: string) => void;
  cols: 3 | 4;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 8,
        marginTop: 14,
      }}
    >
      {options.map((o) => {
        const selected = o.value === active;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            style={{
              padding: "20px 16px",
              textAlign: "center",
              background: selected ? V2.ink : "transparent",
              color: selected ? V2.paper : V2.ink,
              border: `1px solid ${selected ? V2.ink : V2.paperShade}`,
              cursor: "pointer",
              fontFamily: V2.display,
              fontSize: 17,
              fontWeight: 400,
              fontStyle: selected ? "italic" : "normal",
              letterSpacing: -0.2,
              transition: "background .15s",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function GeneratingState({ childName }: { childName: string }) {
  return (
    <div
      style={{
        background: V2.night,
        color: V2.paper,
        padding: "80px 40px",
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        margin: "-32px",
      }}
    >
      <StarField count={18} />
      <div style={{ position: "relative", maxWidth: 520, margin: "0 auto" }}>
        <Kicker color={V2.gold}>Even geduld</Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 44,
            letterSpacing: -1.2,
            margin: "20px 0 12px",
            color: V2.paper,
            lineHeight: 1.1,
          }}
        >
          We schrijven het verhaal{" "}
          <span style={{ fontStyle: "italic", color: V2.gold }}>
            van {childName}.
          </span>
        </h2>
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 16,
            lineHeight: 1.55,
            opacity: 0.85,
            marginTop: 20,
          }}
        >
          De verhalenverteller en de illustrator zijn aan het werk. Dit
          duurt meestal 30 tot 60 seconden.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            marginTop: 32,
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.nightMute,
            textDecoration: "underline",
            textUnderlineOffset: 4,
          }}
        >
          terug naar bibliotheek
        </Link>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function roman(n: number): string {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII"][n] ?? String(n);
}
