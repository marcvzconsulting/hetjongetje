"use client";

import { useState, useRef } from "react";
import { V2 } from "@/components/v2/tokens";
import { EBtn, Kicker, IconV2 } from "@/components/v2";

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
    <div
      style={{
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: 24,
      }}
    >
      <Kicker>Portret</Kicker>
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
        <span style={{ fontStyle: "italic" }}>{childName}</span> in het verhaal
      </h3>
      <p
        style={{
          fontFamily: V2.body,
          fontStyle: "italic",
          fontSize: 13,
          color: V2.inkMute,
          margin: "0 0 20px",
          lineHeight: 1.5,
        }}
      >
        Upload een foto of genereer een illustratie vanuit het profiel. Zo blijft het
        personage herkenbaar door elk verhaal.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 14px",
            background: "rgba(196,165,168,0.2)",
            borderLeft: `2px solid ${V2.rose}`,
            fontFamily: V2.body,
            fontSize: 13,
            color: V2.ink,
          }}
        >
          {error}
        </div>
      )}

      {/* Consent dialog */}
      {showConsent && (
        <div
          style={{
            marginBottom: 20,
            padding: 20,
            background: V2.paperDeep,
            border: `1px solid ${V2.paperShade}`,
          }}
        >
          <Kicker color={V2.goldDeep}>Privacy toestemming</Kicker>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 13,
              color: V2.inkSoft,
              margin: "10px 0 16px",
              lineHeight: 1.6,
            }}
          >
            De foto wordt eenmalig gebruikt om een illustratie te maken in de stijl van de verhalen.
            De originele foto wordt{" "}
            <strong style={{ color: V2.ink }}>direct na verwerking verwijderd</strong>{" "}
            en wordt niet opgeslagen. Alleen de illustratie wordt bewaard.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <EBtn kind="primary" size="sm" onClick={onConsentAccepted}>
              Akkoord, maak illustratie
            </EBtn>
            <EBtn kind="ghost" size="sm" onClick={onConsentDeclined}>
              Annuleren
            </EBtn>
          </div>
        </div>
      )}

      {/* Preview image */}
      {previewUrl ? (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              maxWidth: 280,
              margin: "0 auto",
              overflow: "hidden",
              border: `1px solid ${V2.paperShade}`,
              background: V2.paperDeep,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={`Illustratie van ${childName}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {approved && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: V2.ink,
                  color: V2.paper,
                  fontFamily: V2.ui,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                <IconV2 name="check" size={12} color={V2.paper} /> Goedgekeurd
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            marginBottom: 20,
            aspectRatio: "1 / 1",
            maxWidth: 280,
            margin: "0 auto 20px",
            border: `1px dashed ${V2.paperShade}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 20,
            background: V2.paperDeep,
          }}
        >
          <IconV2 name="image" size={32} color={V2.inkMute} />
          <p
            style={{
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 13,
              color: V2.inkMute,
              margin: "12px 0 0",
              lineHeight: 1.5,
            }}
          >
            Nog geen portret. Upload een foto of genereer vanuit het profiel.
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {generating ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "14px 0",
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 14,
              color: V2.inkMute,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: V2.gold,
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            {generatingStatus}
          </div>
        ) : (
          <>
            {/* Photo upload (hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileSelected}
              style={{ display: "none" }}
            />

            <EBtn
              kind="primary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              style={{ justifyContent: "center", width: "100%" }}
            >
              Foto uploaden
            </EBtn>

            <EBtn
              kind="ghost"
              size="md"
              onClick={generatePreview}
              style={{ justifyContent: "center", width: "100%" }}
            >
              {previewUrl ? "Opnieuw genereren zonder foto" : "Genereer zonder foto"}
            </EBtn>

            {previewUrl && !approved && (
              <button
                type="button"
                onClick={approvePreview}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "13px 24px",
                  background: V2.ink,
                  color: V2.paper,
                  border: "none",
                  borderRadius: 2,
                  fontFamily: V2.ui,
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: 0.2,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <IconV2 name="check" size={16} color={V2.paper} />
                {saving ? "Opslaan..." : "Dit klopt, goedkeuren"}
              </button>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
