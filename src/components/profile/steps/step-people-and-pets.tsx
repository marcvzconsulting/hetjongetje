"use client";

import { useState } from "react";
import { V2 } from "@/components/v2/tokens";
import { EBtn, Kicker, IconV2 } from "@/components/v2";
import type { ProfileData } from "../profile-wizard";

interface Props {
  data: ProfileData;
  onChange: (updates: Partial<ProfileData>) => void;
  onNext: () => void;
  onBack: () => void;
}

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
  flex: 1,
  minWidth: 0,
  padding: "10px 0",
  border: "none",
  borderBottom: `1px solid ${V2.paperShade}`,
  background: "transparent",
  fontSize: 16,
  fontFamily: V2.body,
  color: V2.ink,
  outline: "none",
};

const addBtn = (disabled: boolean) => ({
  padding: "10px 14px",
  background: disabled ? "transparent" : V2.ink,
  color: disabled ? V2.inkMute : V2.paper,
  border: `1px solid ${disabled ? V2.paperShade : V2.ink}`,
  fontFamily: V2.ui,
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: 0.2,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

function Chip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px 6px 14px",
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        type="button"
        style={{
          background: "transparent",
          border: "none",
          color: V2.inkMute,
          cursor: "pointer",
          padding: 2,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Verwijder"
      >
        <IconV2 name="close" size={12} color={V2.inkMute} />
      </button>
    </span>
  );
}

function SectionTitle({
  kicker,
  title,
  italicized,
  description,
}: {
  kicker: string;
  title: string;
  italicized?: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Kicker>{kicker}</Kicker>
      <h3
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: 22,
          margin: "10px 0 4px",
          letterSpacing: -0.4,
          color: V2.ink,
        }}
      >
        {title}
        {italicized && (
          <>
            {" "}
            <span style={{ fontStyle: "italic" }}>{italicized}</span>
          </>
        )}
      </h3>
      <p
        style={{
          fontFamily: V2.body,
          fontStyle: "italic",
          fontSize: 13,
          color: V2.inkMute,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
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

  const childName = data.name || "het kind";

  return (
    <div>
      <Kicker>Vrienden, huisdieren & angsten</Kicker>
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
        De mensen, en dieren,{" "}
        <span style={{ fontStyle: "italic" }}>om hen heen.</span>
      </h2>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.inkSoft,
          marginTop: 4,
          marginBottom: 36,
          lineHeight: 1.55,
          maxWidth: 560,
        }}
      >
        Alles is optioneel. Wat je invult komt terug in de verhalen.
      </p>

      {/* Pets */}
      <div style={{ marginBottom: 40 }}>
        <SectionTitle
          kicker="Huisdieren"
          title={`Heeft ${childName} huisdieren`}
          italicized="om zich heen?"
          description="Huisdieren kunnen meespelen in de verhalen."
        />

        {data.pets.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {data.pets.map((pet, i) => (
              <Chip
                key={i}
                label={`${pet.name} (${pet.type})`}
                onRemove={() => removePet(i)}
              />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            <label style={fieldLabel}>Naam</label>
            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              placeholder="Bijv. Bella"
              style={{ ...underlineInput, width: "100%" }}
            />
          </div>
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            <label style={fieldLabel}>Soort</label>
            <input
              type="text"
              value={petType}
              onChange={(e) => setPetType(e.target.value)}
              placeholder="Bijv. kat"
              style={{ ...underlineInput, width: "100%" }}
            />
          </div>
          <button
            type="button"
            onClick={addPet}
            disabled={!petName || !petType}
            style={addBtn(!petName || !petType)}
          >
            <IconV2 name="plus" size={14} color={(!petName || !petType) ? V2.inkMute : V2.paper} /> Toevoegen
          </button>
        </div>
      </div>

      {/* Friends */}
      <div
        style={{
          borderTop: `1px solid ${V2.paperShade}`,
          paddingTop: 28,
          marginBottom: 40,
        }}
      >
        <SectionTitle
          kicker="Vrienden"
          title="Beste"
          italicized="vriendjes."
          description="Vrienden kunnen opduiken als personages in de verhalen."
        />

        {data.friends.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {data.friends.map((friend, i) => (
              <Chip
                key={i}
                label={friend.relationship ? `${friend.name} · ${friend.relationship}` : friend.name}
                onRemove={() => removeFriend(i)}
              />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            <label style={fieldLabel}>Naam</label>
            <input
              type="text"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              placeholder="Bijv. Noor"
              style={{ ...underlineInput, width: "100%" }}
            />
          </div>
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            <label style={fieldLabel}>Relatie</label>
            <input
              type="text"
              value={friendRelation}
              onChange={(e) => setFriendRelation(e.target.value)}
              placeholder="Bijv. buurmeisje"
              style={{ ...underlineInput, width: "100%" }}
            />
          </div>
          <button
            type="button"
            onClick={addFriend}
            disabled={!friendName}
            style={addBtn(!friendName)}
          >
            <IconV2 name="plus" size={14} color={!friendName ? V2.inkMute : V2.paper} /> Toevoegen
          </button>
        </div>
      </div>

      {/* Fears */}
      <div
        style={{
          borderTop: `1px solid ${V2.paperShade}`,
          paddingTop: 28,
        }}
      >
        <SectionTitle
          kicker="Vermijden"
          title={`Waar is ${childName}`}
          italicized="bang voor?"
          description="Deze onderwerpen houden we uit de verhalen."
        />

        {data.fears.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {data.fears.map((fear, i) => (
              <Chip key={i} label={fear} onRemove={() => removeFear(i)} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 280px", minWidth: 0 }}>
            <label style={fieldLabel}>Onderwerp</label>
            <input
              type="text"
              value={fearInput}
              onChange={(e) => setFearInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFear())}
              placeholder="Bijv. donker, spinnen, onweer"
              style={{ ...underlineInput, width: "100%" }}
            />
          </div>
          <button
            type="button"
            onClick={addFear}
            disabled={!fearInput}
            style={addBtn(!fearInput)}
          >
            <IconV2 name="plus" size={14} color={!fearInput ? V2.inkMute : V2.paper} /> Toevoegen
          </button>
        </div>
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
        <EBtn kind="primary" size="lg" onClick={onNext}>
          Volgende <IconV2 name="arrow" size={16} color={V2.paper} />
        </EBtn>
      </div>
    </div>
  );
}
