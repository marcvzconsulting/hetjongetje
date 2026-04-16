"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HairColorPicker, HairStylePicker, EyeColorPicker, SkinColorPicker } from "@/components/profile/appearance-pickers";
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
  { value: "animals", label: "Dieren", emoji: "🐾" },
  { value: "space", label: "Ruimte", emoji: "🚀" },
  { value: "princesses", label: "Prinsessen", emoji: "👑" },
  { value: "dinosaurs", label: "Dinosaurussen", emoji: "🦕" },
  { value: "sports", label: "Sport", emoji: "⚽" },
  { value: "music", label: "Muziek", emoji: "🎵" },
  { value: "cars", label: "Auto's", emoji: "🚗" },
  { value: "nature", label: "Natuur", emoji: "🌿" },
  { value: "cooking", label: "Koken", emoji: "👩‍🍳" },
  { value: "art", label: "Tekenen", emoji: "🎨" },
  { value: "building", label: "Bouwen", emoji: "🧱" },
  { value: "reading", label: "Lezen", emoji: "📖" },
];

const CHARACTER_TYPES = [
  { value: "self", label: "Zichzelf", description: "Het kind is de held van het verhaal", emoji: "🧒" },
  { value: "stuffed_animal", label: "Knuffeldier", description: "Het favoriete knuffeldier als held", emoji: "🧸" },
  { value: "action_hero", label: "Superheld", description: "Een favoriete held of figuur", emoji: "🦸" },
  { value: "custom", label: "Eigen personage", description: "Een zelf bedacht karakter", emoji: "✨" },
];

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
    } catch { /* ignore */ }
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

  if (!editing) {
    // View mode
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Terug
          </Link>
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
          >
            Profiel bewerken
          </button>
        </div>

        <div className="text-center mb-8">
          <span className="text-5xl">
            {child.gender === "boy" ? "👦" : child.gender === "girl" ? "👧" : "🧒"}
          </span>
          <h1 className="text-2xl font-bold mt-3">{child.name}</h1>
          <p className="text-muted-foreground">{child.age} jaar oud &middot; {child.storyCount} verhalen</p>
        </div>

        <div className="space-y-6">
          {/* Interests */}
          <div className="rounded-2xl bg-white border border-muted p-5">
            <h3 className="font-semibold mb-3">Interesses</h3>
            <div className="flex flex-wrap gap-2">
              {child.interests.map((interest) => {
                const option = INTEREST_OPTIONS.find((o) => o.value === interest);
                return (
                  <span key={interest} className="rounded-full bg-muted px-3 py-1 text-sm">
                    {option ? `${option.emoji} ${option.label}` : interest}
                  </span>
                );
              })}
              {child.interests.length === 0 && (
                <span className="text-sm text-muted-foreground">Nog geen interesses ingevuld</span>
              )}
            </div>
          </div>

          {/* Appearance */}
          {(child.hairColor || child.eyeColor || child.skinColor) && (
            <div className="rounded-2xl bg-white border border-muted p-5">
              <h3 className="font-semibold mb-3">Uiterlijk</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {child.hairColor && <div><span className="text-muted-foreground">Haar:</span> {child.hairColor}{child.hairStyle ? `, ${child.hairStyle}` : ""}</div>}
                {child.eyeColor && <div><span className="text-muted-foreground">Ogen:</span> {child.eyeColor}</div>}
                {child.skinColor && <div><span className="text-muted-foreground">Huid:</span> {child.skinColor}</div>}
                {child.wearsGlasses && <div>Draagt een bril</div>}
                {child.hasFreckles && <div>Sproetjes</div>}
              </div>
            </div>
          )}

          {/* Favorites */}
          {child.favoriteThings && (
            <div className="rounded-2xl bg-white border border-muted p-5">
              <h3 className="font-semibold mb-3">Favoriete dingen</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {child.favoriteThings.color && <div><span className="text-muted-foreground">Kleur:</span> {child.favoriteThings.color}</div>}
                {child.favoriteThings.food && <div><span className="text-muted-foreground">Eten:</span> {child.favoriteThings.food}</div>}
                {child.favoriteThings.toy && <div><span className="text-muted-foreground">Speelgoed:</span> {child.favoriteThings.toy}</div>}
                {child.favoriteThings.place && <div><span className="text-muted-foreground">Plek:</span> {child.favoriteThings.place}</div>}
              </div>
            </div>
          )}

          {/* Pets & Friends */}
          {(child.pets.length > 0 || child.friends.length > 0) && (
            <div className="rounded-2xl bg-white border border-muted p-5">
              <h3 className="font-semibold mb-3">Vrienden & huisdieren</h3>
              <div className="space-y-2 text-sm">
                {child.pets.map((pet, i) => (
                  <div key={i}>🐾 {pet.name} ({pet.type})</div>
                ))}
                {child.friends.map((friend, i) => (
                  <div key={i}>👫 {friend.name} {friend.relationship && `(${friend.relationship})`}</div>
                ))}
              </div>
            </div>
          )}

          {/* Character */}
          <div className="rounded-2xl bg-white border border-muted p-5">
            <h3 className="font-semibold mb-3">Hoofdpersonage</h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{charType?.emoji}</span>
              <div>
                <p className="font-medium text-sm">{charType?.label}</p>
                {child.mainCharacterDescription && (
                  <p className="text-sm text-muted-foreground">{child.mainCharacterDescription}</p>
                )}
              </div>
            </div>
          </div>

          {/* Character preview */}
          <CharacterPreview
            childId={child.id}
            childName={child.name}
            currentPreviewUrl={child.approvedPreviewUrl}
            isApproved={child.hasApprovedPrompt}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href={`/generate/${child.id}`}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-primary-light transition-colors"
            >
              Nieuw verhaal maken
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setEditing(false)}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Annuleren
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-6">
        {/* Basic info */}
        <div className="rounded-2xl bg-white border border-muted p-5 space-y-4">
          <h3 className="font-semibold">Basisgegevens</h3>
          <div>
            <label className="block text-xs font-medium mb-1">Naam</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Geboortedatum</label>
            <input
              type="date"
              value={data.dateOfBirth}
              onChange={(e) => setData((d) => ({ ...d, dateOfBirth: e.target.value }))}
              className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Geslacht</label>
            <div className="flex gap-2">
              {[
                { value: "boy", label: "Jongen", emoji: "👦" },
                { value: "girl", label: "Meisje", emoji: "👧" },
                { value: "other", label: "Anders", emoji: "🧒" },
              ].map((g) => (
                <button
                  key={g.value}
                  onClick={() => setData((d) => ({ ...d, gender: g.value }))}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-lg border-2 py-2 text-sm transition-all ${
                    data.gender === g.value ? "border-primary bg-primary/5" : "border-muted"
                  }`}
                >
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl bg-white border border-muted p-5 space-y-4">
          <h3 className="font-semibold">Uiterlijk</h3>
          <p className="text-xs text-muted-foreground">Dit gebruiken we voor consistente illustraties</p>
          <SkinColorPicker value={data.skinColor} onChange={(v) => setData((d) => ({ ...d, skinColor: v }))} />
          <HairColorPicker value={data.hairColor} onChange={(v) => setData((d) => ({ ...d, hairColor: v }))} />
          <HairStylePicker value={data.hairStyle} onChange={(v) => setData((d) => ({ ...d, hairStyle: v }))} />
          <EyeColorPicker value={data.eyeColor} onChange={(v) => setData((d) => ({ ...d, eyeColor: v }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.wearsGlasses}
              onChange={(e) => setData((d) => ({ ...d, wearsGlasses: e.target.checked }))}
              className="w-4 h-4 rounded border-muted text-primary focus:ring-primary"
            />
            <span className="text-sm">Bril</span>
          </label>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.hasFreckles}
              onChange={(e) => setData((d) => ({ ...d, hasFreckles: e.target.checked }))}
              className="w-4 h-4 rounded border-muted text-primary focus:ring-primary"
            />
            <span className="text-sm">Sproetjes</span>
          </label>
        </div>

        {/* Interests */}
        <div className="rounded-2xl bg-white border border-muted p-5">
          <h3 className="font-semibold mb-3">Interesses</h3>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleInterest(opt.value)}
                className={`rounded-full px-3 py-1.5 text-sm transition-all ${
                  data.interests.includes(opt.value)
                    ? "bg-primary text-white"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Favorites */}
        <div className="rounded-2xl bg-white border border-muted p-5 space-y-3">
          <h3 className="font-semibold">Favoriete dingen</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "color", label: "Kleur", placeholder: "Blauw" },
              { key: "food", label: "Eten", placeholder: "Pannenkoeken" },
              { key: "toy", label: "Speelgoed", placeholder: "Lego" },
              { key: "place", label: "Plek", placeholder: "Het park" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1">{field.label}</label>
                <input
                  type="text"
                  value={data.favoriteThings[field.key as keyof typeof data.favoriteThings]}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      favoriteThings: { ...d.favoriteThings, [field.key]: e.target.value },
                    }))
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Character */}
        <div className="rounded-2xl bg-white border border-muted p-5 space-y-3">
          <h3 className="font-semibold">Hoofdpersonage</h3>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTER_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setData((d) => ({ ...d, mainCharacterType: ct.value }))}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                  data.mainCharacterType === ct.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/30"
                }`}
              >
                <span className="text-xl">{ct.emoji}</span>
                <span className="text-xs font-medium">{ct.label}</span>
              </button>
            ))}
          </div>
          {data.mainCharacterType !== "self" && (
            <textarea
              value={data.mainCharacterDescription}
              onChange={(e) => setData((d) => ({ ...d, mainCharacterDescription: e.target.value }))}
              placeholder="Beschrijf het personage..."
              rows={2}
              className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>

        {/* Save button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {saving ? "Opslaan..." : "Profiel opslaan"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-muted px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Annuleren
          </button>
        </div>

        {/* Delete profile */}
        <div className="rounded-2xl border border-red-200 p-5">
          <h3 className="font-semibold text-red-600 mb-2">Profiel verwijderen</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Dit verwijdert het profiel en alle {child.storyCount} verhalen. Dit kan niet ongedaan worden gemaakt.
          </p>
          {deleteConfirm ? (
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Verwijderen..." : "Ja, verwijder alles"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="rounded-lg border border-muted px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Profiel verwijderen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
