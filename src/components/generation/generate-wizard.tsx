"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  STORY_SETTINGS,
  ADVENTURE_TYPES,
  STORY_MOODS,
  OCCASIONS,
  type StorySetting,
  type AdventureType,
  type StoryMood,
  type Occasion,
} from "@/lib/ai/prompts/story-request";

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
  pets: { name: string; type: string }[] | null;
  friends: { name: string; relationship: string }[] | null;
  favoriteThings: { color?: string; food?: string; toy?: string; place?: string } | null;
  fears: string[];
  mainCharacterType: string;
  mainCharacterDescription: string | null;
  approvedCharacterPrompt: string | null;
}

interface Props {
  child: ChildData;
}

const CHARACTER_TYPES = [
  {
    value: "self",
    label: "Zichzelf als held",
    description: "Het kind is het hoofdpersonage",
    emoji: "🧒",
  },
  {
    value: "stuffed_animal",
    label: "Favoriete knuffel",
    description: "De knuffel beleeft het avontuur",
    emoji: "🧸",
  },
  {
    value: "action_hero",
    label: "Favoriete held",
    description: "Een superheld of actieheld",
    emoji: "🦸",
  },
  {
    value: "custom",
    label: "Eigen personage",
    description: "Beschrijf zelf een personage",
    emoji: "✏️",
  },
];

interface StoryParams {
  mainCharacterType: string;
  mainCharacterDescription: string;
  setting: string;
  adventureType: string;
  mood: string;
  occasion: string;
  companion: string;
  specialDetail: string;
}

export function GenerateWizard({ child }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [params, setParams] = useState<StoryParams>({
    mainCharacterType: child.mainCharacterType,
    mainCharacterDescription: child.mainCharacterDescription || "",
    setting: "",
    adventureType: "",
    mood: "",
    occasion: "none",
    companion: "",
    specialDetail: "",
  });

  function updateParams(updates: Partial<StoryParams>) {
    setParams((prev) => ({ ...prev, ...updates }));
  }

  const needsDescription = params.mainCharacterType !== "self";

  async function handleGenerate() {
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
        interests: child.interests,
        pets: child.pets || undefined,
        friends: child.friends || undefined,
        favoriteThings: child.favoriteThings || undefined,
        fears: child.fears,
        mainCharacterType: params.mainCharacterType,
        mainCharacterDescription: params.mainCharacterDescription || undefined,
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
            occasion: params.occasion !== "none" ? params.occasion : undefined,
            companion: params.companion || undefined,
            specialDetail: params.specialDetail || undefined,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verhaal genereren mislukt");
      }

      const data = await res.json();
      router.push(`/story/${data.story.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6 text-6xl animate-bounce">📖</div>
        <h2 className="text-xl font-bold mb-2">
          Het verhaal wordt geschreven...
        </h2>
        <p className="text-muted-foreground mb-4">
          De verhalenverteller is druk bezig met een avontuur voor {child.name}
        </p>
        <div className="flex gap-2 text-2xl">
          <span className="animate-pulse" style={{ animationDelay: "0ms" }}>✨</span>
          <span className="animate-pulse" style={{ animationDelay: "200ms" }}>🖊️</span>
          <span className="animate-pulse" style={{ animationDelay: "400ms" }}>✨</span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Dit kan even duren (30-60 seconden)
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Step 0: Hoofdpersonage */}
      {step === 0 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Wie is de held van dit verhaal?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CHARACTER_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => updateParams({ mainCharacterType: type.value })}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  params.mainCharacterType === type.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/30"
                }`}
              >
                <span className="text-2xl">{type.emoji}</span>
                <div>
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {type.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {needsDescription && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Beschrijf het personage
              </label>
              <textarea
                value={params.mainCharacterDescription}
                onChange={(e) =>
                  updateParams({ mainCharacterDescription: e.target.value })
                }
                rows={2}
                className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={
                  params.mainCharacterType === "stuffed_animal"
                    ? "Bijv. een bruine teddybeer genaamd Boris"
                    : params.mainCharacterType === "action_hero"
                      ? "Bijv. een superheld die kan vliegen"
                      : "Beschrijf het personage..."
                }
              />
            </div>
          )}
          <button
            onClick={() => setStep(1)}
            disabled={!params.mainCharacterType || (needsDescription && !params.mainCharacterDescription)}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
          >
            Volgende
          </button>
        </div>
      )}

      {/* Step 1: Setting */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Waar speelt het avontuur zich af?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(STORY_SETTINGS).map(([key, setting]) => (
              <button
                key={key}
                onClick={() => updateParams({ setting: key })}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                  params.setting === key
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/30"
                }`}
              >
                <span className="text-2xl">{setting.emoji}</span>
                <span className="text-xs font-medium">{setting.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 rounded-lg border border-muted px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Terug
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!params.setting}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
            >
              Volgende
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Adventure type */}
      {step === 2 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Wat voor avontuur?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(ADVENTURE_TYPES).map(([key, type]) => (
              <button
                key={key}
                onClick={() => updateParams({ adventureType: key })}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                  params.adventureType === key
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/30"
                }`}
              >
                <span className="text-2xl">{type.emoji}</span>
                <span className="text-xs font-medium">{type.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-muted px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Terug
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!params.adventureType}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
            >
              Volgende
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Mood */}
      {step === 3 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">Welke sfeer?</label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(STORY_MOODS).map(([key, mood]) => (
              <button
                key={key}
                onClick={() => updateParams({ mood: key })}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                  params.mood === key
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/30"
                }`}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span className="text-xs font-medium">{mood.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-lg border border-muted px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Terug
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!params.mood}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
            >
              Volgende
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Aanleiding (optioneel) */}
      {step === 4 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Is er een speciale aanleiding? (optioneel)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Object.entries(OCCASIONS)
              .filter(([key]) => key !== "none")
              .map(([key, occ]) => (
              <button
                key={key}
                onClick={() => updateParams({ occasion: params.occasion === key ? "none" : key })}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all ${
                  params.occasion === key
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/30"
                }`}
              >
                <span className="text-xl">{occ.emoji}</span>
                <span className="text-[0.65rem] font-medium leading-tight">{occ.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg border border-muted px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Terug
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              {params.occasion === "none" ? "Overslaan" : "Volgende"}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Details + samenvatting */}
      {step === 5 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Wie gaat er mee op avontuur? (optioneel)
            </label>
            <input
              type="text"
              value={params.companion}
              onChange={(e) => updateParams({ companion: e.target.value })}
              className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={
                child.pets?.length
                  ? `Bijv. ${child.pets[0].name} de ${child.pets[0].type}`
                  : child.friends?.length
                    ? `Bijv. ${child.friends[0].name}`
                    : "Bijv. een pratende uil"
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Iets speciaals om te verwerken? (optioneel)
            </label>
            <textarea
              value={params.specialDetail}
              onChange={(e) => updateParams({ specialDetail: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Bijv. ze is net jarig geweest, of heeft leren fietsen"
            />
          </div>

          {/* Summary */}
          <div className="rounded-2xl bg-muted/50 p-4 text-sm">
            <h3 className="font-semibold mb-2">Jouw verhaal</h3>
            <p className="text-muted-foreground">
              <strong>
                {CHARACTER_TYPES.find((t) => t.value === params.mainCharacterType)?.label}
              </strong>
              {" "}beleeft een{" "}
              <strong>
                {STORY_MOODS[params.mood as StoryMood]?.label?.toLowerCase()}
              </strong>{" "}
              <strong>
                {ADVENTURE_TYPES[params.adventureType as AdventureType]?.label?.toLowerCase()}
              </strong>
              -avontuur in{" "}
              <strong>
                {STORY_SETTINGS[params.setting as StorySetting]?.label}
              </strong>
              {params.occasion !== "none" && (
                <>
                  {" "}met als thema <strong>{OCCASIONS[params.occasion as Occasion]?.label}</strong>
                </>
              )}
              {params.companion && (
                <>
                  {" "}samen met <strong>{params.companion}</strong>
                </>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(4)}
              className="flex-1 rounded-lg border border-muted px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Terug
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Maak mijn verhaal!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
