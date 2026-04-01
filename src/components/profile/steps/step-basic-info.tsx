"use client";

import type { ProfileData } from "../profile-wizard";

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

export function StepBasicInfo({ data, onChange, onNext }: Props) {
  const age = calculateAge(data.dateOfBirth);
  const validAge = age !== null && age >= 0 && age <= 10;
  const canContinue = data.name && data.dateOfBirth && validAge && data.gender;

  const today = new Date();
  const maxDate = today.toISOString().split("T")[0];
  const minDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
    .toISOString()
    .split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">
          Hoe heet je kind?
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Bijv. Emma"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Geboortedatum
        </label>
        <input
          type="date"
          value={data.dateOfBirth}
          min={minDate}
          max={maxDate}
          onChange={(e) => onChange({ dateOfBirth: e.target.value })}
          className="w-full rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {data.dateOfBirth && age !== null && (
          <p className="mt-1 text-xs text-muted-foreground">
            {validAge ? (
              <>
                {data.name || "Je kind"} is <strong>{age} jaar</strong> oud
                {age <= 1
                  ? " — verhalen worden heel kort en zacht"
                  : age <= 4
                    ? " — verhalen worden extra simpel en lief"
                    : age <= 7
                      ? " — verhalen met duidelijke emoties en humor"
                      : " — verhalen met meer avontuur en spanning"}
              </>
            ) : (
              <span className="text-red-500">
                Het Jongetje is bedoeld voor kinderen van 0 tot 10 jaar
              </span>
            )}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">
          Is je kind een...
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "boy", label: "Jongen", emoji: "👦" },
            { value: "girl", label: "Meisje", emoji: "👧" },
            { value: "other", label: "Anders", emoji: "🧒" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ gender: option.value })}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all ${
                data.gender === option.value
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/30"
              }`}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:opacity-50"
      >
        Volgende stap
      </button>
    </div>
  );
}
