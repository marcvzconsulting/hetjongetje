"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { V2 } from "@/components/v2/tokens";
import { IconV2 } from "@/components/v2";
import {
  TTS_VOICES,
  isTtsVoiceKey,
  type TtsVoiceKey,
} from "@/lib/ai/tts-voices";
import type { WordTiming } from "@/lib/ai/tts";
import { TITLE_PAGE_NUMBER } from "@/lib/story/spread-audio";
import type { WordHighlight } from "@/components/v2/story/BookViewerV3";

/** Eén gegenereerde audio: stem + DB-paginanummer + url + timings. */
export type StoryAudioEntry = {
  voiceKey: string;
  pageNumber: number;
  url: string;
  /** Null = geen bruikbare alignment; afspelen werkt dan zonder markering. */
  wordTimings: WordTiming[] | null;
};

type Props = {
  storyId: string;
  /** Al gegenereerde audio's (uit de DB), per stem per pagina. */
  audios: StoryAudioEntry[];
  /** Eigenaar-pagina: mag nieuwe stemmen genereren. Deelpagina: alleen
   *  afspelen van stemmen waarvoor ALLE pagina's al audio hebben. */
  canGenerate: boolean;
  /** True wanneer canGenerate false is dóór de TTS-premium-gate (geen
   *  actief abonnement): stemmen zonder audio tonen dan een vriendelijke
   *  verwijzing naar /subscribe i.p.v. "Genereer stem". De deelpagina
   *  laat dit weg (default false) en houdt de neutrale teksten. */
  premiumGated?: boolean;
  /** Voorlees-item van de zichtbare spread: 0 = titelspread, anders het
   *  DB-paginanummer (tekst- of eindpagina); null wanneer de spread geen
   *  audio heeft. */
  currentPageNumber: number | null;
  /** Alle voorleesbare items op leesvolgorde, typisch
   *  [0, 1..N, eindpagina]. */
  pageNumbers: number[];
  /** DB-paginanummer van de eindspread-audio (vaste uitro), of null als
   *  het verhaal geen eindpagina met illustratie heeft. Daar tonen we
   *  geen woord-markering en na afloop "Het verhaaltje is uit". */
  endingPageNumber?: number | null;
  /** True wanneer de zichtbare spread ná het laatste voorleesbare item
   *  ligt zonder eigen audio — dan tonen we "Het verhaaltje is uit"
   *  i.p.v. "Blader naar het verhaal". */
  afterLastPage?: boolean;
  onClose: () => void;
  /** Meld een vers gegenereerde audio aan de parent zodat die z'n
   *  `audios`-state kan bijwerken (chrome-knop actief, hergebruik). */
  onGenerated?: (entry: StoryAudioEntry) => void;
  /** De speler is de bron van waarheid voor de woord-markering; de parent
   *  geeft dit door aan BookViewerV3. Null = geen markering. */
  onHighlightChange?: (highlight: WordHighlight | null) => void;
};

const MOBILE_BP = 768;

function entryKey(voiceKey: string, pageNumber: number): string {
  return `${voiceKey}:${pageNumber}`;
}

/** Grootste index i met timings[i].s <= t (binary search), of null. */
function findActiveWord(timings: WordTiming[], t: number): number | null {
  let lo = 0;
  let hi = timings.length - 1;
  let ans: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timings[mid].s <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/**
 * Voorlees-flow, paginagestuurd: keuzepaneel met de stemmen (bottom
 * sheet) → na keuze een spelerbalk vast onderin. De speler speelt alléén
 * de audio van de zichtbare pagina; bladert de lezer, dan wisselt de
 * audio automatisch mee. Word-timings sturen de markering in de viewer
 * via onHighlightChange. Eén verborgen <audio>-element doet het echte
 * werk.
 */
export function StoryAudioPlayer({
  storyId,
  audios,
  canGenerate,
  premiumGated = false,
  currentPageNumber,
  pageNumbers,
  endingPageNumber = null,
  afterLastPage = false,
  onClose,
  onGenerated,
  onHighlightChange,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [view, setView] = useState<"picker" | "player">("picker");
  const [active, setActive] = useState<TtsVoiceKey | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /** Audio van de huidige pagina is uitgespeeld → "Sla de bladzijde om". */
  const [pageEnded, setPageEnded] = useState(false);
  /** Browser blokkeerde autoplay → vraag om een tik op de afspeelknop. */
  const [needsTap, setNeedsTap] = useState(false);

  // Generatie-voortgang ("Stem voorbereiden, pagina 2 van 4…").
  const [genVoice, setGenVoice] = useState<TtsVoiceKey | null>(null);
  const [genLabel, setGenLabel] = useState<string | null>(null);
  const generatingRef = useRef(false);

  // Vers gegenereerde entries (nog niet per se terug in de props) + props
  // samengevoegd tot één lookup per (stem, pagina).
  const [freshEntries, setFreshEntries] = useState<StoryAudioEntry[]>([]);
  const entryMap = useMemo(() => {
    const map = new Map<string, StoryAudioEntry>();
    for (const a of audios) {
      if (isTtsVoiceKey(a.voiceKey)) {
        map.set(entryKey(a.voiceKey, a.pageNumber), a);
      }
    }
    for (const a of freshEntries) {
      map.set(entryKey(a.voiceKey, a.pageNumber), a);
    }
    return map;
  }, [audios, freshEntries]);

  /** Aantal pagina's met audio per stem (voor tile-status). */
  const presentCount = useCallback(
    (voice: TtsVoiceKey): number =>
      pageNumbers.filter((p) => entryMap.has(entryKey(voice, p))).length,
    [pageNumbers, entryMap],
  );

  const activeEntry = useMemo(() => {
    if (!active || currentPageNumber === null) return null;
    return entryMap.get(entryKey(active, currentPageNumber)) ?? null;
  }, [active, currentPageNumber, entryMap]);
  const activeUrl = activeEntry?.url ?? null;

  // Callbacks in refs zodat effects niet op elke parent-render herstarten.
  const highlightCbRef = useRef(onHighlightChange);
  const onGeneratedRef = useRef(onGenerated);
  useEffect(() => {
    highlightCbRef.current = onHighlightChange;
    onGeneratedRef.current = onGenerated;
  });

  const activeEntryRef = useRef(activeEntry);
  useEffect(() => {
    activeEntryRef.current = activeEntry;
  }, [activeEntry]);

  // ── Woord-markering: rAF-loop tijdens afspelen + timeupdate-check ──
  const lastEmittedRef = useRef<WordHighlight | null>(null);
  const rafRef = useRef<number | null>(null);

  const emitHighlight = useCallback((h: WordHighlight | null) => {
    const prev = lastEmittedRef.current;
    const same =
      prev === h ||
      (prev !== null &&
        h !== null &&
        prev.pageNumber === h.pageNumber &&
        prev.wordIndex === h.wordIndex);
    if (same) return;
    lastEmittedRef.current = h;
    highlightCbRef.current?.(h);
  }, []);

  const checkHighlight = useCallback(() => {
    const el = audioRef.current;
    const entry = activeEntryRef.current;
    if (
      !el ||
      !entry ||
      !Array.isArray(entry.wordTimings) ||
      entry.wordTimings.length === 0
    ) {
      emitHighlight(null);
      return;
    }
    // Titel- en eindspread renderen geen woord-spans: eventuele
    // opgeslagen wordTimings daar bewust negeren, geen markering emitten.
    if (
      entry.pageNumber === TITLE_PAGE_NUMBER ||
      (endingPageNumber !== null && entry.pageNumber === endingPageNumber)
    ) {
      emitHighlight(null);
      return;
    }
    const idx = findActiveWord(entry.wordTimings, el.currentTime);
    emitHighlight(
      idx === null ? null : { pageNumber: entry.pageNumber, wordIndex: idx },
    );
  }, [emitHighlight, endingPageNumber]);

  const stopHighlightLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startHighlightLoop = useCallback(() => {
    stopHighlightLoop();
    const tick = () => {
      checkHighlight();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [checkHighlight, stopHighlightLoop]);

  // Opruimen bij unmount: loop stoppen en markering uitzetten.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      highlightCbRef.current?.(null);
    };
  }, []);

  // startedRef voorkomt herstarts wanneer alleen de entryMap-identiteit
  // wijzigt (vers gegenereerde entries) terwijl stem + pagina gelijk
  // blijven. Key: `${voiceKey}:${pageNumber}` van de gestarte audio.
  const startedRef = useRef<string | null>(null);

  // ── Genereren (sequentieel, met voortgang) ──────────────────────
  const generatePages = useCallback(
    async (voice: TtsVoiceKey, targets: number[]): Promise<boolean> => {
      if (generatingRef.current) return false;
      generatingRef.current = true;
      setGenVoice(voice);
      setError(null);
      try {
        for (const p of targets) {
          // De teller telt titel en einde gewoon mee ("2 van 6").
          const pos = pageNumbers.indexOf(p) + 1;
          const total = pageNumbers.length;
          const what =
            p === TITLE_PAGE_NUMBER
              ? `de titel (${pos} van ${total})`
              : endingPageNumber !== null && p === endingPageNumber
                ? `het einde (${pos} van ${total})`
                : `pagina ${pos} van ${total}`;
          setGenLabel(`Stem voorbereiden, ${what}…`);
          const res = await fetch(`/api/stories/${storyId}/audio`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voiceKey: voice, pageNumber: p }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            url?: string;
            wordTimings?: unknown;
            error?: string;
          };
          if (!res.ok || !data.url) {
            setError(
              data.error ?? "Genereren mislukt, probeer het zo opnieuw.",
            );
            return false;
          }
          const entry: StoryAudioEntry = {
            voiceKey: voice,
            pageNumber: p,
            url: data.url,
            wordTimings: Array.isArray(data.wordTimings)
              ? (data.wordTimings as WordTiming[])
              : null,
          };
          setFreshEntries((prev) => [...prev, entry]);
          onGeneratedRef.current?.(entry);
        }
        return true;
      } catch {
        setError("Verbindingsfout, probeer het zo opnieuw.");
        return false;
      } finally {
        generatingRef.current = false;
        setGenVoice(null);
        setGenLabel(null);
      }
    },
    [storyId, pageNumbers, endingPageNumber],
  );

  function activate(voice: TtsVoiceKey) {
    setError(null);
    setPageEnded(false);
    setNeedsTap(false);
    startedRef.current = null;
    setActive(voice);
    setView("player");
  }

  async function chooseVoice(voice: TtsVoiceKey) {
    const missing = pageNumbers.filter(
      (p) => !entryMap.has(entryKey(voice, p)),
    );
    if (missing.length > 0) {
      if (!canGenerate) return; // tile is dan disabled, dit is defensief
      const ok = await generatePages(voice, missing);
      if (!ok) return;
    }
    activate(voice);
  }

  // ── Afspeellogica: volg de zichtbare pagina ─────────────────────
  useEffect(() => {
    if (view !== "player" || !active) {
      startedRef.current = null;
      return;
    }
    const el = audioRef.current;
    if (!el) return;

    if (currentPageNumber === null) {
      // Titel- of eindspread: geen audio, hint in de balk.
      startedRef.current = null;
      el.pause();
      setPageEnded(false);
      emitHighlight(null);
      return;
    }

    if (!activeUrl) {
      // Pagina zonder audio (bv. na een half gelukte generatie): de
      // eigenaar genereert 'm on-the-fly bij; de deelpagina toont de
      // afspeelknop gedimd.
      startedRef.current = null;
      el.pause();
      emitHighlight(null);
      if (canGenerate) void generatePages(active, [currentPageNumber]);
      return;
    }

    const startKey = `${active}:${currentPageNumber}`;
    if (startedRef.current === startKey) return; // deze pagina speelt al
    startedRef.current = startKey;

    setPageEnded(false);
    emitHighlight(null);
    if (el.dataset.src !== activeUrl) {
      el.src = activeUrl;
      el.dataset.src = activeUrl;
      setDuration(0);
    }
    // Bladeren (ook terug) = altijd opnieuw vanaf het begin.
    el.currentTime = 0;
    setCurrentTime(0);
    void el
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => {
        // Autoplay geweigerd (kan op de deelpagina bij de allereerste
        // start): toon de hint, de afspeelknop staat al prominent.
        setNeedsTap(true);
      });
  }, [
    view,
    active,
    currentPageNumber,
    activeUrl,
    canGenerate,
    generatePages,
    emitHighlight,
  ]);

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

  function togglePlay() {
    const el = audioRef.current;
    if (!el || !el.dataset.src) return;
    if (el.paused) {
      // Na "ended" begint play() anders op het eind: expliciet terug.
      if (el.ended) el.currentTime = 0;
      setPageEnded(false);
      void el
        .play()
        .then(() => setNeedsTap(false))
        .catch(() => {});
    } else {
      el.pause();
    }
  }

  function seekTo(clientX: number, target: HTMLElement) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
    setPageEnded(false);
    checkHighlight();
  }

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeVoice = active ? TTS_VOICES[active] : null;

  // Statusregel in de spelerbalk: hint of "leest pagina X van N".
  const pagePos =
    currentPageNumber !== null ? pageNumbers.indexOf(currentPageNumber) + 1 : 0;
  let statusText: string;
  let statusTone: "gold" | "mute" = "mute";
  if (genVoice && genLabel) {
    statusText = genLabel;
  } else if (currentPageNumber === null) {
    statusText = afterLastPage
      ? "Het verhaaltje is uit"
      : "Blader naar het verhaal →";
    statusTone = "gold";
  } else if (!activeUrl) {
    // Bijgenereren mislukt (bv. rate limit) → toon de fout in de balk;
    // terug- en weer vooruitbladeren probeert het opnieuw.
    statusText =
      error ??
      (canGenerate
        ? "Audio voorbereiden…"
        : "Deze pagina heeft nog geen audio");
    statusTone = "gold";
  } else if (pageEnded) {
    // Na de uitro van de eindpagina is het verhaal echt klaar.
    statusText =
      endingPageNumber !== null && currentPageNumber === endingPageNumber
        ? "Het verhaaltje is uit"
        : "Sla de bladzijde om →";
    statusTone = "gold";
  } else if (needsTap) {
    statusText = "Druk op de afspeelknop om te luisteren";
    statusTone = "gold";
  } else if (currentPageNumber === TITLE_PAGE_NUMBER) {
    statusText = "leest de titel";
  } else if (
    endingPageNumber !== null &&
    currentPageNumber === endingPageNumber
  ) {
    statusText = "leest het einde";
  } else {
    statusText =
      pagePos > 0 ? `leest pagina ${pagePos} van ${pageNumbers.length}` : "";
  }

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
        onPlay={() => {
          setPlaying(true);
          startHighlightLoop();
        }}
        onPause={() => {
          setPlaying(false);
          stopHighlightLoop();
        }}
        onEnded={() => {
          setPlaying(false);
          stopHighlightLoop();
          setPageEnded(true);
          emitHighlight(null);
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
          // Vangnet voor seeks terwijl de audio gepauzeerd is (dan draait
          // de rAF-loop niet).
          if (e.currentTarget.paused) checkHighlight();
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={(e) => {
          // dataset.src wissen zodat een volgende start de bron opnieuw
          // toewijst in plaats van de kapotte lading te hergebruiken.
          delete e.currentTarget.dataset.src;
          if (view === "player") {
            setError("Audio laden mislukt, probeer het zo opnieuw.");
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
                ? "Kies een stem die het verhaal per bladzijde voorleest. Elke stem wordt één keer gemaakt en is daarna direct af te spelen."
                : "Kies een stem die het verhaal per bladzijde voorleest."}
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
                  presentCount={presentCount(key)}
                  totalPages={pageNumbers.length}
                  isActive={active === key}
                  canGenerate={canGenerate}
                  premiumGated={premiumGated}
                  generating={genVoice === key}
                  generatingLabel={genVoice === key ? genLabel : null}
                  generateLocked={genVoice !== null && genVoice !== key}
                  reducedMotion={reducedMotion}
                  onSelect={() => void chooseVoice(key)}
                />
              ))}
            </div>

            {premiumGated && (
              <p
                style={{
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.inkSoft,
                  margin: "18px 0 0",
                  lineHeight: 1.55,
                }}
              >
                Nieuwe stemmen laten voorlezen is onderdeel van het
                abonnement. Al gemaakte stemmen blijven gewoon afspeelbaar.{" "}
                <a
                  href="/subscribe"
                  style={{
                    color: V2.goldDeep,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  Bekijk abonnementen →
                </a>
              </p>
            )}
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
              disabled={!activeUrl}
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                borderRadius: 999,
                background: V2.ink,
                border: "none",
                cursor: activeUrl ? "pointer" : "default",
                opacity: activeUrl ? 1 : 0.4,
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

            {/* Naam + status + voortgang + tijd */}
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
                      color: statusTone === "gold" ? V2.goldDeep : V2.inkMute,
                      fontWeight: statusTone === "gold" ? 500 : 400,
                      marginLeft: 8,
                    }}
                  >
                    {statusText}
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
              {/* Voortgangsbalk (per pagina) — klikbaar zoeken */}
              <div
                role="slider"
                aria-label="Positie in de audio van deze pagina"
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
  presentCount,
  totalPages,
  isActive,
  canGenerate,
  premiumGated,
  generating,
  generatingLabel,
  generateLocked,
  reducedMotion,
  onSelect,
}: {
  voiceKey: TtsVoiceKey;
  /** Aantal pagina's dat voor deze stem al audio heeft. */
  presentCount: number;
  totalPages: number;
  isActive: boolean;
  canGenerate: boolean;
  /** Genereren geblokkeerd door de premium-gate (geen abonnement). */
  premiumGated: boolean;
  generating: boolean;
  generatingLabel: string | null;
  /** Er loopt al een generatie (voor een andere stem). */
  generateLocked: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
}) {
  const voice = TTS_VOICES[voiceKey];
  const complete = totalPages > 0 && presentCount >= totalPages;
  const dimmed = !complete && !canGenerate;
  const disabled = dimmed || generateLocked || (generating && !complete);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={
        complete
          ? `${voice.label} afspelen`
          : canGenerate
            ? `Stem ${voice.label} genereren`
            : premiumGated
              ? `${voice.label}, onderdeel van het abonnement`
              : `${voice.label}, nog niet gegenereerd`
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
          color: complete ? V2.goldDeep : V2.inkMute,
          marginTop: 2,
        }}
      >
        {generating ? (
          <>
            <Spinner reducedMotion={reducedMotion} />
            <span style={{ textTransform: "none", letterSpacing: "0.04em" }}>
              {generatingLabel ?? "Bezig met genereren…"}
            </span>
          </>
        ) : complete ? (
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
            {presentCount > 0 ? "Maak stem af" : "Genereer stem (eenmalig)"}
          </span>
        ) : premiumGated ? (
          <span
            style={{
              textTransform: "none",
              letterSpacing: "0.04em",
              color: V2.goldDeep,
            }}
          >
            Onderdeel van het abonnement
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
