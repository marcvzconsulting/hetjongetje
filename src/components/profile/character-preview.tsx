"use client";

import { useState, useRef } from "react";

interface Props {
  childId: string;
  childName: string;
  currentPreviewUrl: string | null;
  isApproved: boolean;
}

export function CharacterPreview({ childId, childName, currentPreviewUrl, isApproved }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPreviewUrl);
  const [characterPrompt, setCharacterPrompt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [approved, setApproved] = useState(isApproved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate preview from profile settings (no photo)
  async function generatePreview() {
    setGenerating(true);
    setGeneratingStatus("Illustratie wordt gegenereerd...");
    setError("");
    setApproved(false);

    try {
      const res = await fetch(`/api/children/${childId}/preview`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Preview genereren mislukt");
      }

      const data = await res.json();
      setPreviewUrl(data.imageUrl);
      setCharacterPrompt(data.characterPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setGenerating(false);
      setGeneratingStatus("");
    }
  }

  // Generate preview from uploaded photo
  async function handlePhotoUpload(file: File) {
    setGenerating(true);
    setGeneratingStatus("Foto wordt omgezet naar illustratie...");
    setError("");
    setApproved(false);
    setShowConsent(false);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`/api/children/${childId}/preview/from-photo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Foto verwerken mislukt");
      }

      const data = await res.json();
      setPreviewUrl(data.imageUrl);
      setCharacterPrompt(data.characterPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setGenerating(false);
      setGeneratingStatus("");
    }
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      setError("Selecteer een afbeelding (JPG, PNG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Afbeelding is te groot (max 10MB)");
      return;
    }

    setShowConsent(true);
    // Store file for after consent
    (window as unknown as Record<string, File>).__pendingPhoto = file;
  }

  function onConsentAccepted() {
    const file = (window as unknown as Record<string, File>).__pendingPhoto;
    if (file) {
      handlePhotoUpload(file);
      delete (window as unknown as Record<string, File>).__pendingPhoto;
    }
  }

  function onConsentDeclined() {
    setShowConsent(false);
    delete (window as unknown as Record<string, File>).__pendingPhoto;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function approvePreview() {
    if (!previewUrl || !characterPrompt) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/children/${childId}/preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterPrompt,
          imageUrl: previewUrl,
        }),
      });

      if (res.ok) {
        setApproved(true);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl bg-white border border-muted p-5">
      <h3 className="font-semibold mb-1">{childName} voorbeeld</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Bekijk hoe {childName} eruitziet in de verhalen. Upload een foto of genereer een voorbeeld op basis van het profiel.
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</div>
      )}

      {/* Consent dialog */}
      {showConsent && (
        <div className="mb-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
          <h4 className="font-semibold text-sm mb-2">Privacy toestemming</h4>
          <p className="text-xs text-muted-foreground mb-3">
            De foto wordt eenmalig gebruikt om een illustratie te maken in de stijl van de verhalen.
            De originele foto wordt <strong>direct na verwerking verwijderd</strong> en wordt niet opgeslagen.
            Alleen de illustratie wordt bewaard.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onConsentAccepted}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
            >
              Akkoord, maak illustratie
            </button>
            <button
              onClick={onConsentDeclined}
              className="rounded-lg border border-muted px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Preview image */}
      {previewUrl ? (
        <div className="mb-4">
          <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border border-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Illustratie van ${childName}`}
              className="w-full h-full object-cover"
            />
            {approved && (
              <div className="absolute top-2 right-2 rounded-full bg-green-500 text-white text-xs px-2 py-0.5 font-semibold">
                Goedgekeurd
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 aspect-square max-w-[280px] mx-auto rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center text-center p-4">
          <span className="text-3xl mb-2">🎨</span>
          <p className="text-xs text-muted-foreground">
            Upload een foto of genereer een voorbeeld
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {generating ? (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
            <span className="animate-pulse">🎨</span>
            {generatingStatus}
          </div>
        ) : (
          <>
            {/* Photo upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileSelected}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
            >
              Foto uploaden
            </button>

            {/* Generate from profile */}
            <button
              onClick={generatePreview}
              className="w-full rounded-lg border border-muted px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              {previewUrl ? "Opnieuw genereren zonder foto" : "Genereer zonder foto"}
            </button>

            {/* Approve */}
            {previewUrl && !approved && (
              <button
                onClick={approvePreview}
                disabled={saving}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Opslaan..." : "Dit klopt, goedkeuren"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
