"use client";

import { useEffect, useRef, useState } from "react";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn, IconV2 } from "@/components/v2";
import { LoraConsentForm } from "./LoraConsentForm";

const MIN_PHOTOS = 5;
const MAX_PHOTOS = 15;
const POLL_INTERVAL_MS = 20_000;

type Status = "none" | "training" | "ready" | "failed";

type Props = {
  childId: string;
  childName: string;
  initialStatus: Status | "uploaded";
  initialTrainedAt: string | null;
  initialFailureReason: string | null;
};

type TransientStep = "idle" | "consent" | "upload";

export function LoraTrainer({
  childId,
  childName,
  initialStatus,
  initialTrainedAt,
  initialFailureReason,
}: Props) {
  const normaliseStatus = (s: string): Status =>
    s === "ready" || s === "training" || s === "failed" ? s : "none";

  const [status, setStatus] = useState<Status>(
    normaliseStatus(initialStatus)
  );
  const [trainedAt, setTrainedAt] = useState<string | null>(initialTrainedAt);
  const [failureReason, setFailureReason] = useState<string | null>(
    initialFailureReason
  );
  const [transient, setTransient] = useState<TransientStep>("idle");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh previews whenever photos change
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photos]);

  // Poll while training
  useEffect(() => {
    if (status !== "training") return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/children/${childId}/lora`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.status === "ready") {
          setStatus("ready");
          setTrainedAt(data.trainedAt ?? new Date().toISOString());
          setFailureReason(null);
        } else if (data.status === "failed") {
          setStatus("failed");
          setFailureReason(data.failureReason ?? "Onbekende fout");
        }
      } catch {
        /* keep polling — transient fetch error */
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, childId]);

  // ── Actions ────────────────────────────────────────────────
  function onPickFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError(null);
    const incoming = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/")
    );
    const merged = [...photos, ...incoming].slice(0, MAX_PHOTOS);
    setPhotos(merged);
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submitTraining() {
    if (photos.length < MIN_PHOTOS) {
      setError(`Upload minimaal ${MIN_PHOTOS} foto's`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("consent", "1");
      for (const f of photos) form.append("photos", f);

      const res = await fetch(`/api/children/${childId}/lora`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Training starten mislukt");
        return;
      }
      setStatus("training");
      setTransient("idle");
      setPhotos([]);
      setFailureReason(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeLora() {
    if (
      !confirm(
        `Weet je zeker dat je de character-training van ${childName} wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/children/${childId}/lora`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStatus("none");
        setTrainedAt(null);
        setFailureReason(null);
        setTransient("idle");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ──────────────────────────────────────────
  return (
    <section
      style={{
        marginTop: 40,
        padding: "28px 32px",
        background: V2.paperDeep,
        border: `1px solid ${V2.paperShade}`,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Kicker>Character herkenning</Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 24,
            letterSpacing: -0.4,
            margin: "10px 0 0",
            color: V2.ink,
          }}
        >
          {status === "ready" ? (
            <>
              {childName} is nu{" "}
              <span style={{ fontStyle: "italic" }}>herkenbaar.</span>
            </>
          ) : status === "training" ? (
            <>
              We leren {childName}{" "}
              <span style={{ fontStyle: "italic" }}>nu kennen…</span>
            </>
          ) : status === "failed" ? (
            <>
              Training{" "}
              <span style={{ fontStyle: "italic" }}>mislukt.</span>
            </>
          ) : (
            <>
              Train een{" "}
              <span style={{ fontStyle: "italic" }}>character-LoRA.</span>
            </>
          )}
        </h2>
      </div>

      {status === "none" && transient === "idle" && (
        <IdleState
          childName={childName}
          onStart={() => setTransient("consent")}
        />
      )}

      {status === "none" && transient === "consent" && (
        <LoraConsentForm
          childName={childName}
          onAccept={() => setTransient("upload")}
          onCancel={() => setTransient("idle")}
        />
      )}

      {status === "none" && transient === "upload" && (
        <UploadState
          photos={photos}
          previews={previews}
          fileInputRef={fileInputRef}
          onPickFiles={onPickFiles}
          onRemovePhoto={removePhoto}
          onSubmit={submitTraining}
          onBack={() => {
            setPhotos([]);
            setTransient("consent");
          }}
          submitting={submitting}
          error={error}
        />
      )}

      {status === "training" && <TrainingState />}

      {status === "ready" && (
        <ReadyState
          trainedAt={trainedAt}
          onRemove={removeLora}
          onRetrain={() => {
            setStatus("none");
            setTransient("consent");
          }}
          busy={submitting}
        />
      )}

      {status === "failed" && (
        <FailedState
          reason={failureReason}
          onRetry={() => {
            setStatus("none");
            setTransient("consent");
          }}
          onRemove={removeLora}
          busy={submitting}
        />
      )}
    </section>
  );
}

// ── State views ────────────────────────────────────────────────

function IdleState({
  childName,
  onStart,
}: {
  childName: string;
  onStart: () => void;
}) {
  return (
    <>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          lineHeight: 1.6,
          color: V2.inkSoft,
          margin: "0 0 16px",
        }}
      >
        Upload 5 tot 15 foto&rsquo;s en we trainen een klein model zodat{" "}
        {childName} in elk verhaal steeds hetzelfde eruit ziet. Duurt
        ongeveer tien minuten. Strikt optioneel.
      </p>
      <EBtn kind="primary" size="md" onClick={onStart}>
        Toestemming &amp; foto&rsquo;s →
      </EBtn>
    </>
  );
}

function UploadState({
  photos,
  previews,
  fileInputRef,
  onPickFiles,
  onRemovePhoto,
  onSubmit,
  onBack,
  submitting,
  error,
}: {
  photos: File[];
  previews: string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFiles: (files: FileList | null) => void;
  onRemovePhoto: (i: number) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const count = photos.length;
  const canSubmit = count >= MIN_PHOTOS && !submitting;
  return (
    <div>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          lineHeight: 1.6,
          color: V2.inkSoft,
          margin: "0 0 20px",
        }}
      >
        Kies {MIN_PHOTOS}–{MAX_PHOTOS} foto&rsquo;s waar het gezicht goed
        te zien is. Variatie helpt: dichtbij + verder weg, verschillende
        hoeken en uitdrukkingen. Geen zonnebrillen of half-afgedekte
        gezichten.
      </p>

      {previews.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            marginBottom: 20,
          }}
        >
          {previews.map((src, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                overflow: "hidden",
                background: V2.paper,
                border: `1px solid ${V2.paperShade}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Foto ${i + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                aria-label="Verwijder foto"
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(20,20,46,0.55)",
                  color: V2.paper,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconV2 name="close" size={12} color={V2.paper} />
              </button>
              <span
                style={{
                  position: "absolute",
                  bottom: 4,
                  left: 6,
                  fontFamily: V2.mono,
                  fontSize: 9,
                  color: V2.paper,
                  letterSpacing: "0.08em",
                  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          onPickFiles(e.target.files);
          // Reset so the same file can be re-picked
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <EBtn
          kind="ghost"
          size="md"
          onClick={() => fileInputRef.current?.click()}
        >
          <IconV2 name="plus" size={14} color={V2.ink} /> Foto&rsquo;s
          toevoegen
        </EBtn>
        <span
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color:
              count < MIN_PHOTOS
                ? V2.inkMute
                : count > MAX_PHOTOS
                  ? V2.heart
                  : V2.goldDeep,
          }}
        >
          {count} / {MAX_PHOTOS}
          {count < MIN_PHOTOS
            ? ` · NOG ${MIN_PHOTOS - count} NODIG`
            : count >= MIN_PHOTOS
              ? " · KLAAR VOOR TRAINING"
              : ""}
        </span>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(176,74,65,0.12)",
            borderLeft: `2px solid ${V2.heart}`,
            padding: "10px 14px",
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <EBtn kind="ghost" size="md" onClick={onBack}>
          Terug
        </EBtn>
        <EBtn
          kind="primary"
          size="md"
          onClick={canSubmit ? onSubmit : undefined}
          style={{
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Uploaden…" : "Start training →"}
        </EBtn>
      </div>
    </div>
  );
}

function TrainingState() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "4px 0",
      }}
    >
      <PulsingDot />
      <div>
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 15,
            lineHeight: 1.55,
            color: V2.inkSoft,
            margin: 0,
          }}
        >
          Dit duurt meestal 5 tot 10 minuten. Je kunt gewoon doorgaan met
          andere dingen, we updaten deze pagina zelf.
        </p>
        <p
          style={{
            fontFamily: V2.mono,
            fontSize: 10,
            color: V2.inkMute,
            letterSpacing: "0.14em",
            marginTop: 10,
            textTransform: "uppercase",
          }}
        >
          Je foto&rsquo;s worden binnen 7 dagen gewist
        </p>
      </div>
    </div>
  );
}

function ReadyState({
  trainedAt,
  onRemove,
  onRetrain,
  busy,
}: {
  trainedAt: string | null;
  onRemove: () => void;
  onRetrain: () => void;
  busy: boolean;
}) {
  const date = trainedAt
    ? new Date(trainedAt).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  return (
    <div>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          lineHeight: 1.6,
          color: V2.inkSoft,
          margin: "0 0 12px",
        }}
      >
        Klaar. Elk nieuw verhaal gebruikt nu automatisch het getrainde
        model.
        {date && (
          <>
            <br />
            <span
              style={{
                fontFamily: V2.mono,
                fontSize: 11,
                color: V2.inkMute,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Getraind op {date}
            </span>
          </>
        )}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <EBtn kind="ghost" size="sm" onClick={onRetrain}>
          Opnieuw trainen
        </EBtn>
        <button
          type="button"
          onClick={busy ? undefined : onRemove}
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.heart,
            background: "transparent",
            border: "none",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.5 : 1,
            padding: "10px 0",
          }}
        >
          Verwijder training &amp; toestemming intrekken
        </button>
      </div>
    </div>
  );
}

function FailedState({
  reason,
  onRetry,
  onRemove,
  busy,
}: {
  reason: string | null;
  onRetry: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <div
        style={{
          background: "rgba(176,74,65,0.12)",
          borderLeft: `2px solid ${V2.heart}`,
          padding: "12px 16px",
          fontFamily: V2.body,
          fontSize: 14,
          color: V2.ink,
          marginBottom: 16,
          lineHeight: 1.55,
        }}
      >
        {reason ?? "Er ging iets mis tijdens de training."}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <EBtn kind="primary" size="sm" onClick={onRetry}>
          Opnieuw proberen
        </EBtn>
        <button
          type="button"
          onClick={busy ? undefined : onRemove}
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            background: "transparent",
            border: "none",
            textDecoration: "underline",
            textUnderlineOffset: 3,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.5 : 1,
            padding: "10px 0",
          }}
        >
          Alles opruimen
        </button>
      </div>
    </div>
  );
}

function PulsingDot() {
  return (
    <>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: V2.gold,
          animation: "ov-pulse 1.4s ease-in-out infinite",
          flexShrink: 0,
        }}
      />
      <style>{`
        @keyframes ov-pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.88); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
