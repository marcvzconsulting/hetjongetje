"use client";

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
    emoji: "🧒",
  },
  {
    value: "stuffed_animal",
    label: "Favoriete knuffel",
    description: "De knuffel beleeft de avonturen, het kind is de beste vriend",
    emoji: "🧸",
  },
  {
    value: "action_hero",
    label: "Favoriete held",
    description: "Een superheld of actieheid is het hoofdpersonage",
    emoji: "🦸",
  },
  {
    value: "custom",
    label: "Eigen personage",
    description: "Beschrijf zelf een uniek personage",
    emoji: "✏️",
  },
];

export function StepCharacter({
  data,
  onChange,
  onBack,
  onSubmit,
  saving,
}: Props) {
  const needsDescription = data.mainCharacterType !== "self";

  const descriptionPlaceholder =
    data.mainCharacterType === "stuffed_animal"
      ? "Bijv. een bruine teddybeer genaamd Boris met een rood strikje"
      : data.mainCharacterType === "action_hero"
        ? "Bijv. een superheld die kan vliegen en onzichtbaar worden"
        : "Beschrijf het personage...";

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          Wie is het hoofdpersonage?
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Dit personage staat centraal in elk verhaal
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CHARACTER_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => onChange({ mainCharacterType: type.value })}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                data.mainCharacterType === type.value
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
      </div>

      {needsDescription && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Beschrijf het personage
          </label>
          <textarea
            value={data.mainCharacterDescription}
            onChange={(e) =>
              onChange({ mainCharacterDescription: e.target.value })
            }
            rows={3}
            className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={descriptionPlaceholder}
          />
        </div>
      )}

      {/* Summary */}
      <div className="rounded-2xl bg-muted/50 p-4">
        <h3 className="font-semibold text-sm mb-2">Samenvatting</h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <strong>Naam:</strong> {data.name}
          </p>
          <p>
            <strong>Geboortedatum:</strong>{" "}
            {data.dateOfBirth
              ? new Date(data.dateOfBirth).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "-"}
          </p>
          {data.interests.length > 0 && (
            <p>
              <strong>Interesses:</strong> {data.interests.join(", ")}
            </p>
          )}
          {data.pets.length > 0 && (
            <p>
              <strong>Huisdieren:</strong>{" "}
              {data.pets.map((p) => `${p.name} (${p.type})`).join(", ")}
            </p>
          )}
          {data.friends.length > 0 && (
            <p>
              <strong>Vrienden:</strong>{" "}
              {data.friends.map((f) => f.name).join(", ")}
            </p>
          )}
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
          onClick={onSubmit}
          disabled={saving || (needsDescription && !data.mainCharacterDescription)}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
        >
          {saving ? "Profiel opslaan..." : "Profiel opslaan & eerste verhaal maken!"}
        </button>
      </div>
    </div>
  );
}
