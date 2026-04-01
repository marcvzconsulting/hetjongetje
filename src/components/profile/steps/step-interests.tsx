"use client";

import type { ProfileData } from "../profile-wizard";

interface Props {
  data: ProfileData;
  onChange: (updates: Partial<ProfileData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const INTEREST_OPTIONS = [
  { value: "dinosaurs", label: "Dinosaurussen", emoji: "🦕" },
  { value: "space", label: "Ruimte", emoji: "🚀" },
  { value: "animals", label: "Dieren", emoji: "🐾" },
  { value: "princesses", label: "Prinsessen", emoji: "👑" },
  { value: "cars", label: "Auto's", emoji: "🏎️" },
  { value: "sports", label: "Sport", emoji: "⚽" },
  { value: "music", label: "Muziek", emoji: "🎵" },
  { value: "cooking", label: "Koken", emoji: "👨‍🍳" },
  { value: "nature", label: "Natuur", emoji: "🌿" },
  { value: "pirates", label: "Piraten", emoji: "🏴‍☠️" },
  { value: "fairies", label: "Feeën", emoji: "🧚" },
  { value: "robots", label: "Robots", emoji: "🤖" },
  { value: "art", label: "Tekenen", emoji: "🎨" },
  { value: "building", label: "Bouwen", emoji: "🧱" },
  { value: "superheroes", label: "Superhelden", emoji: "🦸" },
  { value: "swimming", label: "Zwemmen", emoji: "🏊" },
];

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
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          Waar houdt {data.name || "je kind"} van?
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Kies er zoveel als je wilt - dit helpt ons persoonlijkere verhalen te
          maken
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {INTEREST_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => toggleInterest(option.value)}
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-all ${
                data.interests.includes(option.value)
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-muted hover:border-primary/30"
              }`}
            >
              <span>{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Favoriete dingen
        </label>
        <p className="text-xs text-muted-foreground mb-3">Optioneel, maar leuk voor in de verhalen</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Favoriete kleur
            </label>
            <input
              type="text"
              value={data.favoriteThings.color}
              onChange={(e) =>
                onChange({
                  favoriteThings: { ...data.favoriteThings, color: e.target.value },
                })
              }
              className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Bijv. blauw"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Favoriete eten
            </label>
            <input
              type="text"
              value={data.favoriteThings.food}
              onChange={(e) =>
                onChange({
                  favoriteThings: { ...data.favoriteThings, food: e.target.value },
                })
              }
              className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Bijv. pannenkoeken"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Favoriete speelgoed
            </label>
            <input
              type="text"
              value={data.favoriteThings.toy}
              onChange={(e) =>
                onChange({
                  favoriteThings: { ...data.favoriteThings, toy: e.target.value },
                })
              }
              className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Bijv. Lego"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Favoriete plek
            </label>
            <input
              type="text"
              value={data.favoriteThings.place}
              onChange={(e) =>
                onChange({
                  favoriteThings: { ...data.favoriteThings, place: e.target.value },
                })
              }
              className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Bijv. het strand"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-muted px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Terug
        </button>
        <button
          onClick={onNext}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
        >
          Volgende stap
        </button>
      </div>
    </div>
  );
}
