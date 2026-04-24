"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { V2 } from "@/components/v2/tokens";
import { StepBasicInfo } from "./steps/step-basic-info";
import { StepInterests } from "./steps/step-interests";
import { StepPeopleAndPets } from "./steps/step-people-and-pets";
import { StepCharacter } from "./steps/step-character";

export interface ProfileData {
  name: string;
  dateOfBirth: string;
  gender: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinColor: string;
  wearsGlasses: boolean;
  hasFreckles: boolean;
  interests: string[];
  pets: { name: string; type: string; description?: string }[];
  friends: { name: string; relationship: string; description?: string }[];
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
  hairColor: "",
  hairStyle: "",
  eyeColor: "",
  skinColor: "",
  wearsGlasses: false,
  hasFreckles: false,
  interests: [],
  pets: [],
  friends: [],
  favoriteThings: { color: "", food: "", toy: "", place: "" },
  fears: [],
  mainCharacterType: "self",
  mainCharacterDescription: "",
};

const STEPS = [
  { title: "Basisgegevens" },
  { title: "Interesses" },
  { title: "Vrienden & huisdieren" },
  { title: "Hoofdpersonage" },
];

const TOTAL_STEPS = STEPS.length;

function roman(n: number): string {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII"][n] ?? String(n);
}

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

      await res.json();
      router.push("/dashboard");
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Meta row — step indicator + section title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 0 24px",
          borderBottom: `1px solid ${V2.paperShade}`,
          marginBottom: 32,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.14em",
          }}
        >
          STAP {roman(step + 1)} VAN {roman(TOTAL_STEPS)}
        </div>
        <div
          style={{
            fontFamily: V2.display,
            fontSize: 16,
            fontStyle: "italic",
            color: V2.ink,
          }}
        >
          {STEPS[step].title}
        </div>
      </div>

      {/* Progress hairline */}
      <div
        style={{
          height: 1,
          background: V2.paperShade,
          marginBottom: 40,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 1,
            background: V2.ink,
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: "width .3s",
          }}
        />
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
