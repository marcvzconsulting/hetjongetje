"use client";

import { useState } from "react";
import type { ProfileData } from "../profile-wizard";

interface Props {
  data: ProfileData;
  onChange: (updates: Partial<ProfileData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPeopleAndPets({ data, onChange, onNext, onBack }: Props) {
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [friendName, setFriendName] = useState("");
  const [friendRelation, setFriendRelation] = useState("");
  const [fearInput, setFearInput] = useState("");

  function addPet() {
    if (!petName || !petType) return;
    onChange({ pets: [...data.pets, { name: petName, type: petType }] });
    setPetName("");
    setPetType("");
  }

  function removePet(index: number) {
    onChange({ pets: data.pets.filter((_, i) => i !== index) });
  }

  function addFriend() {
    if (!friendName) return;
    onChange({
      friends: [
        ...data.friends,
        { name: friendName, relationship: friendRelation || "vriend" },
      ],
    });
    setFriendName("");
    setFriendRelation("");
  }

  function removeFriend(index: number) {
    onChange({ friends: data.friends.filter((_, i) => i !== index) });
  }

  function addFear() {
    if (!fearInput) return;
    onChange({ fears: [...data.fears, fearInput] });
    setFearInput("");
  }

  function removeFear(index: number) {
    onChange({ fears: data.fears.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-6">
      {/* Pets */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Heeft {data.name || "je kind"} huisdieren? 🐾
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Huisdieren kunnen meespelen in de verhalen
        </p>
        {data.pets.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {data.pets.map((pet, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-sm"
              >
                {pet.name} ({pet.type})
                <button
                  onClick={() => removePet(i)}
                  className="ml-1 text-muted-foreground hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Naam (bijv. Bella)"
            className="flex-1 rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            value={petType}
            onChange={(e) => setPetType(e.target.value)}
            placeholder="Soort (bijv. kat)"
            className="flex-1 rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addPet}
            disabled={!petName || !petType}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>

      {/* Friends */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Beste vriendjes 🤝
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Vrienden kunnen opduiken als personages in de verhalen
        </p>
        {data.friends.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {data.friends.map((friend, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-3 py-1 text-sm"
              >
                {friend.name}
                <button
                  onClick={() => removeFriend(i)}
                  className="ml-1 text-muted-foreground hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            placeholder="Naam"
            className="flex-1 rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            value={friendRelation}
            onChange={(e) => setFriendRelation(e.target.value)}
            placeholder="Relatie (bijv. buurmeisje)"
            className="flex-1 rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addFriend}
            disabled={!friendName}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>

      {/* Fears / things to avoid */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Waar is {data.name || "je kind"} bang voor? 🙈
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Deze onderwerpen vermijden we in de verhalen
        </p>
        {data.fears.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {data.fears.map((fear, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm text-red-700"
              >
                {fear}
                <button
                  onClick={() => removeFear(i)}
                  className="ml-1 hover:text-red-900"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={fearInput}
            onChange={(e) => setFearInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFear()}
            placeholder="Bijv. donker, spinnen, onweer"
            className="flex-1 rounded-lg border border-muted bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addFear}
            disabled={!fearInput}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            +
          </button>
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
