"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { V2 } from "@/components/v2/tokens";
import { IconV2 } from "@/components/v2";
import {
  TTS_VOICES,
  isTtsVoiceKey,
  type TtsVoiceKey,
} from "@/lib/ai/tts-voices";

export type StoryAudioEntry = { voiceKey: string; url: string };

type Props = {
  storyId: string;
  /** Al gegenereerde audio's (uit de DB). */
  audios: StoryAudioEntry[];
  /** Eigenaar-pagina: mag nieuwe stemmen genereren. Deelpagina: alleen
   *  afspelen van wat er al is. */
  canGenerate: boolean;
  onClose: () => void;
  /** Meld een vers gegenereerde audio aan de parent zodat die z'n
   *  `audios`-state kan bijwerken (chrome-knop actief, hergebruik). */
  onGenerated?: (entry: StoryAudioEntry) => void;
};

const MOBILE_BP = 768;

/**
 * Voorlees-flow: keuzepaneel met de zes stemmen (bottom sheet) → na keuze
 * een minimalistische spelerbalk vast onderin, boven de bladerknoppen van
 * de viewer. Eén verborgen <audio>-element doet het echte werk.
 */
export function StoryAudioPlayer({
  storyId,
  audios,
  canGenerate,
  onClose,
  onGenerated,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [view, setView] = useState<"picker" | "player">("picker");
  const [active, setActive] = useState<TtsVoiceKey | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [generatingKey, setGeneratingKey] = useState<TtsVoiceKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vers gegenereerde url's (nog niet per se terug in de props) + props
  // samengevoegd tot één lookup per stem.
  const [freshUrls, setFreshUrls] = useState<
    Partial<Record<TtsVoiceKey, string>>
  >({});
  const audioByKey = useMemo(() => {
    const map: Partial<Record<TtsVoiceKey, string>> = {};
    for (const a of audios) {
      if (isTtsVoiceKey(a.voiceKey)) map[a.voiceKey] = a.url;
    }
    return { ...map, ...freshUrls };
  }, [audios, freshUrls]);

  // prefers-reduced-motion: geen slide-in/spinner-animaties.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BP : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Esc sluit paneel/speler — audio stopt vanzelf bij unmount.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function startPlayback(key: TtsVoiceKey, url: string) {
    setError(null);
    setActive(key);
    setView("player");
    const el = audioRef.current;
    if (!el) return;
    if (el.dataset.voice !== key) {
      el.src = url;
      el.dataset.voice = key;
      setCurrentTime(0);
      setDuration(0);
    }
    void el.play().catch(() => {
      // Autoplay kan door de browser geweigerd worden; de gebruiker kan
      // dan gewoon op de play-knop drukken.
    });
  }

  async function generateVoice(key: TtsVoiceKey) {
    if (generatingKey) return;
    setGeneratingKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/stories/${storyId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceKey: key }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setError(
          data.error ?? "Genereren mislukt — probeer het zo opnieuw.",
        );
        return;
      }
      setFreshUrls((prev) => ({ ...prev, [key]: data.url }));
      onGenerated?.({ voiceKey: key, url: data.url });
      startPlayback(key, data.url);
    } catch {
      setError("Verbindingsfout — probeer het zo opnieuw.");
    } finally {
      setGeneratingKey(null);
    }
  }

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }

  function seekTo(clientX: number, target: HTMLElement) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
  }

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeVoice = active ? TTS_VOICES[active] : null;

  return (
    <>
      {/* Keyframes voor slide-in + spinner. Bij reduced motion worden ze
          niet gebruikt (animation: none). */}
      <style>{`
        @keyframes ovAudioSheetUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes ovAudioSpin { to { transform: rotate(360deg); } }
      `}</style>

      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: "none" }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => {
          if (view === "player") {
            setError("Audio laden mislukt — probeer het zo opnieuw.");
            setView("picker");
          }
        }}
      />

      {view === "picker" ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kies een voorleesstem"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "rgba(20,20,46,0.45)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 640,
              maxHeight: "90vh",
              overflow: "auto",
              background: V2.paper,
              padding: "28px 24px 32px",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              marginBottom: "env(safe-area-inset-bottom, 0px)",
              boxShadow: "0 -10px 40px rgba(20,20,46,0.25)",
              animation: reducedMotion
                ? "none"
                : "ovAudioSheetUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              style={{
                position: "absolute",
                top: 14,
                right: 16,
                background: "transparent",
                border: "none",
                fontSize: 22,
                lineHeight: 1,
                color: V2.inkMute,
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <h2
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 22,
                letterSpacing: -0.4,
                margin: "0 0 6px",
                color: V2.ink,
              }}
            >
              Voorlezen
            </h2>
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 14,
                color: V2.inkSoft,
                margin: "0 0 18px",
                lineHeight: 1.55,
              }}
            >
              {canGenerate
                ? "Kies een stem die het verhaal voorleest. Elke stem wordt één keer gemaakt en is daarna direct af te spelen."
                : "Kies een stem die het verhaal voorleest."}
            </p>

            {error && (
              <div
                role="alert"
                style={{
                  marginBottom: 14,
                  padding: "10px 14px",
                  background: "rgba(176,74,65,0.12)",
                  borderLeft: `3px solid ${V2.heart}`,
                  fontFamily: V2.body,
                  fontSize: 13,
                  color: V2.ink,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {(Object.keys(TTS_VOICES) as TtsVoiceKey[]).map((key) => (
                <VoiceTile
                  key={key}
                  voiceKey={key}
                  url={audioByKey[key]}
                  isActive={active === key}
                  canGenerate={canGenerate}
                  generating={generatingKey === key}
                  generateLocked={generatingKey !== null}
                  reducedMotion={reducedMotion}
                  onPlay={(url) => startPlayback(key, url)}
                  onGenerate={() => void generateVoice(key)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        activeVoice && (
          <div
            role="region"
            aria-label="Voorleesspeler"
            style={{
              position: "fixed",
              // Boven de bladerknoppen van de viewer, zodat ouders
              // kunnen meebladeren terwijl er wordt voorgelezen.
              bottom: isMobile ? 96 : 112,
              left: "50%",
              transform: "translateX(-50%)",
              width: isMobile ? "calc(100vw - 20px)" : "min(620px, calc(100vw - 48px))",
              zIndex: 30,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 12 : 16,
              padding: isMobile ? "10px 12px" : "12px 18px",
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
              borderRadius: 12,
              boxShadow: "0 12px 36px rgba(20,20,46,0.18), 0 3px 10px rgba(20,20,46,0.10)",
              animation: reducedMotion
                ? "none"
                : "ovAudioSheetUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Play / pauze */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pauzeer" : "Speel af"}
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: 999,
                background: V2.ink,
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(20,20,46,0.22)",
              }}
            >
              {playing ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill={V2.paper}
                  aria-hidden
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill={V2.paper}
                  aria-hidden
                  style={{ marginLeft: 2 }}
                >
                  <path d="M7 4v16l13-8z" />
                </svg>
              )}
            </button>

            {/* Naam + voortgang + tijd */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: V2.ui,
                    fontSize: 13,
                    fontWeight: 500,
                    color: V2.ink,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {activeVoice.label}
                  <span
                    style={{
                      color: V2.inkMute,
                      fontWeight: 400,
                      marginLeft: 8,
                    }}
                  >
                    leest voor
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 11,
                    color: V2.inkMute,
                    whiteSpace: "nowrap",
                    letterSpacing: "0.04em",
                  }}
                >
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              {/* Voortgangsbalk — klikbaar zoeken */}
              <div
                role="slider"
                aria-label="Positie in de audio"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(currentTime)}
                tabIndex={0}
                onClick={(e) => seekTo(e.clientX, e.currentTarget)}
                onKeyDown={(e) => {
                  const el = audioRef.current;
                  if (!el || !duration) return;
                  if (e.key === "ArrowRight") {
                    el.currentTime = Math.min(duration, el.currentTime + 10);
                  } else if (e.key === "ArrowLeft") {
                    el.currentTime = Math.max(0, el.currentTime - 10);
                  }
                }}
                style={{
                  padding: "5px 0",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    height: 4,
                    background: V2.paperShade,
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress * 100}%`,
                      background: `linear-gradient(to right, ${V2.gold}, ${V2.goldDeep})`,
                      borderRadius: 999,
                      transition: reducedMotion ? "none" : "width 0.2s linear",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Andere stem */}
            <button
              type="button"
              onClick={() => setView("picker")}
              aria-label="Andere stem kiezen"
              title="Andere stem kiezen"
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: V2.inkMute,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: V2.ui,
                fontSize: 12,
                padding: "6px 4px",
              }}
            >
              <IconV2 name="mic" size={15} color={V2.inkMute} />
              {!isMobile && <span>Stem</span>}
            </button>

            {/* Sluiten */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Voorlezen sluiten"
              title="Sluiten"
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: V2.inkMute,
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 2px",
              }}
            >
              <IconV2 name="close" size={15} color={V2.inkMute} />
            </button>
          </div>
        )
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Stem-tegel
// ────────────────────────────────────────────────────────────────

function VoiceTile({
  voiceKey,
  url,
  isActive,
  canGenerate,
  generating,
  generateLocked,
  reducedMotion,
  onPlay,
  onGenerate,
}: {
  voiceKey: TtsVoiceKey;
  url: string | undefined;
  isActive: boolean;
  canGenerate: boolean;
  generating: boolean;
  /** Er loopt al een generatie (voor een andere stem). */
  generateLocked: boolean;
  reducedMotion: boolean;
  onPlay: (url: string) => void;
  onGenerate: () => void;
}) {
  const voice = TTS_VOICES[voiceKey];
  const hasAudio = !!url;
  const dimmed = !hasAudio && !canGenerate;
  const disabled = dimmed || (generateLocked && !hasAudio && !generating);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (hasAudio && url) onPlay(url);
        else if (canGenerate) onGenerate();
      }}
      aria-label={
        hasAudio
          ? `${voice.label} afspelen`
          : canGenerate
            ? `Stem ${voice.label} genereren`
            : `${voice.label} — nog niet gegenereerd`
      }
      style={{
        display: "grid",
        gap: 6,
        textAlign: "left",
        padding: "12px 14px",
        background: dimmed ? V2.paperDeep : V2.paper,
        border: `1px solid ${isActive ? V2.goldDeep : V2.paperShade}`,
        borderRadius: 8,
        cursor: disabled ? "default" : "pointer",
        opacity: dimmed ? 0.55 : 1,
        fontFamily: V2.ui,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
        }}
      >
        <GenderGlyph gender={voice.gender} color={dimmed ? V2.inkMute : V2.goldDeep} />
        <span
          style={{
            fontFamily: V2.ui,
            fontSize: 14,
            fontWeight: 500,
            color: V2.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {voice.label}
        </span>
        {voice.accent === "Vlaams" && (
          <span
            style={{
              fontFamily: V2.mono,
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: V2.goldDeep,
              border: `1px solid ${V2.gold}`,
              borderRadius: 999,
              padding: "2px 7px",
              whiteSpace: "nowrap",
            }}
          >
            Vlaams
          </span>
        )}
      </span>

      <span
        style={{
          fontFamily: V2.body,
          fontSize: 13,
          color: V2.inkSoft,
          lineHeight: 1.4,
        }}
      >
        {voice.description}
      </span>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: V2.mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: hasAudio ? V2.goldDeep : V2.inkMute,
          marginTop: 2,
        }}
      >
        {generating ? (
          <>
            <Spinner reducedMotion={reducedMotion} />
            <span>Bezig met genereren…</span>
          </>
        ) : hasAudio ? (
          <>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill={V2.goldDeep}
              aria-hidden
            >
              <path d="M7 4v16l13-8z" />
            </svg>
            <span>Afspelen</span>
          </>
        ) : canGenerate ? (
          <span style={{ borderBottom: `1px solid ${V2.paperShade}` }}>
            Genereer stem (eenmalig)
          </span>
        ) : (
          <span>Nog niet gegenereerd</span>
        )}
      </span>
    </button>
  );
}

/** Klein ♀/♂-teken in huisstijl (getekend, geen emoji). */
function GenderGlyph({
  gender,
  color,
}: {
  gender: "female" | "male";
  color: string;
}) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      {gender === "female" ? (
        <>
          <circle cx="12" cy="8" r="5" />
          <path d="M12 13v8M9 18h6" />
        </>
      ) : (
        <>
          <circle cx="10" cy="14" r="5" />
          <path d="M13.5 10.5L20 4M20 4h-5.5M20 4v5.5" />
        </>
      )}
    </svg>
  );
}

function Spinner({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return <span aria-hidden>···</span>;
  }
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden
      style={{ animation: "ovAudioSpin 0.9s linear infinite" }}
    >
      <path d="M12 3a9 9 0 1 1-9 9" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
