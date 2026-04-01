"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepBasicInfo } from "./steps/step-basic-info";
import { StepInterests } from "./steps/step-interests";
import { StepPeopleAndPets } from "./steps/step-people-and-pets";
import { StepCharacter } from "./steps/step-character";

export interface ProfileData {
  name: string;
  dateOfBirth: string;
  gender: string;
  interests: string[];
  pets: { name: string; type: string }[];
  friends: { name: string; relationship: string }[];
  favoriteThings: {
    color: string;
    food: string;
    toy: string;
    place: string;
  };
  fears: string[];
  mainCharacterType: string;
  mainCharacterDescription: string;
}

const INITIAL_DATA: ProfileData = {
  name: "",
  dateOfBirth: "",
  gender: "",
  interests: [],
  pets: [],
  friends: [],
  favoriteThings: { color: "", food: "", toy: "", place: "" },
  fears: [],
  mainCharacterType: "self",
  mainCharacterDescription: "",
};

const STEPS = [
  { title: "Basisgegevens", emoji: "📝" },
  { title: "Interesses", emoji: "⭐" },
  { title: "Vrienden & huisdieren", emoji: "🐾" },
  { title: "Hoofdpersonage", emoji: "🦸" },
];

export function ProfileWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ProfileData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateData(updates: Partial<ProfileData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Er ging iets mis");
        return;
      }

      const child = await res.json();
      router.push(`/generate/${child.id}`);
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex flex-col items-center text-xs ${
                i <= step ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="text-lg mb-1">{s.emoji}</span>
              <span className="hidden sm:block">{s.title}</span>
            </div>
          ))}
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Steps */}
      {step === 0 && (
        <StepBasicInfo data={data} onChange={updateData} onNext={next} />
      )}
      {step === 1 && (
        <StepInterests data={data} onChange={updateData} onNext={next} onBack={back} />
      )}
      {step === 2 && (
        <StepPeopleAndPets data={data} onChange={updateData} onNext={next} onBack={back} />
      )}
      {step === 3 && (
        <StepCharacter
          data={data}
          onChange={updateData}
          onBack={back}
          onSubmit={handleSubmit}
          saving={saving}
        />
      )}
    </div>
  );
}
