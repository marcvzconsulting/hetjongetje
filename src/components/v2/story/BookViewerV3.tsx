"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { V2 } from "@/components/v2/tokens";
import { Logo, IconV2 } from "@/components/v2";
import { SignOutButtonV2 } from "@/components/v2/app/SignOutButton";
import type { Spread, PageType } from "@/lib/story/spread-types";
import { splitWords } from "@/lib/story/word-split";

/** Actief voorgelezen woord: DB-paginanummer + woordindex in splitWords. */
export type WordHighlight = { pageNumber: number; wordIndex: number };

type Props = {
  spreads: Spread[];
  childName: string;
  /** Omit on public read-only views — the "Nieuw verhaal"-link wordt dan
   *  vervangen door een "Maak je eigen"-CTA naar de landing. */
  childId?: string;
  storyId: string;
  isFavorite: boolean;
  /** Omit on read-only views to hide de favorite-knop. */
  onToggleFavorite?: () => void;
  storyTitle: string;
  /** Public share-view (`/s/[token]`): logo linkt naar landing, geen
   *  PDF-download / SignOut / Plankje, CTA naar registratie. */
  readOnly?: boolean;
  /** Optionele chrome-knoppen voor parent-only acties. Niet getoond in
   *  readOnly-modus. */
  onShareClick?: () => void;
  isShared?: boolean;
  onReactClick?: () => void;
  hasFeedback?: boolean;
  /** Opent het "Voorlezen"-paneel. In readOnly-modus wordt de knop alleen
   *  getoond als er al audio bestaat (`hasAudio`) — de deelpagina mag
   *  nooit genereren. */
  onListenClick?: () => void;
  hasAudio?: boolean;
  /** Gemeld bij elke navigatie (én bij init/herstel uit localStorage):
   *  de index van de zichtbare spread. Op mobiel (losse pagina's) is dat
   *  de spread waar de zichtbare pagina bij hoort. */
  onSpreadChange?: (spreadIdx: number) => void;
  /** Actief voorgelezen woord. De tekstpagina met dit DB-paginanummer
   *  markeert het woord met een zachte gouden achtergrond. */
  wordHighlight?: WordHighlight | null;
};

// SVG fractal-noise texture, inlined as data URL. Subtle paper grain,
// looks crisp on retina because it scales as a vector.
const PAPER_NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.10  0 0 0 0 0.18  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>")`;

const MOBILE_BP = 768;

/**
 * Decide whether to show the compact (single-page) reader.
 *
 * - Width ≥ 768: spread (desktop / tablet)
 * - Width 560–767 in landscape: spread (phone held sideways — parents can
 *   show text + illustration side-by-side)
 * - Otherwise: compact single-page mode
 */
function shouldUseCompact(w: number, h: number): boolean {
  if (w >= MOBILE_BP) return false;
  if (w >= 560 && w > h) return false;
  return true;
}

export function BookViewerV3({
  spreads,
  childName,
  childId,
  storyId,
  isFavorite,
  onToggleFavorite,
  storyTitle,
  readOnly = false,
  onShareClick,
  isShared = false,
  onReactClick,
  hasFeedback = false,
  onListenClick,
  hasAudio = false,
  onSpreadChange,
  wordHighlight = null,
}: Props) {
  // ── Viewport ─────────────────────────────────────────────────
  // `isMobile` here = "use compact single-page mode". A phone in landscape
  // is technically still mobile, but gets the spread for richer reading.
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? shouldUseCompact(window.innerWidth, window.innerHeight)
      : false,
  );
  /** Chrome-knoppen alleen-icoon (geen tekst) wanneer de balk anders te
   *  krap wordt en titel + plankje gaan overlappen. */
  const [compactLabels, setCompactLabels] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 1100 : false,
  );
  /** Titel in het midden van de chrome verbergen op smallere desktops
   *  zodat de knoppenrij rechts niet over de Plankje-pill rolt. */
  const [showTitle, setShowTitle] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 960 : true,
  );
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(shouldUseCompact(w, h));
      setCompactLabels(w < 1100);
      setShowTitle(w >= 960);
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // ── Pages: on mobile we flatten spreads to single pages ──────
  const pages = useMemo(() => flattenSpreads(spreads), [spreads]);
  const totalUnits = isMobile ? pages.length : spreads.length;

  // Mobiel unit-idx → spread-idx (zelfde volgorde als flattenSpreads:
  // fullSpread = 1 unit, anders links + rechts = 2 units).
  const unitToSpreadIdx = useMemo(() => {
    const arr: number[] = [];
    spreads.forEach((s, i) => {
      arr.push(i);
      if (!s.fullSpread) arr.push(i);
    });
    return arr;
  }, [spreads]);

  // prefers-reduced-motion: woord-markering zonder transition tonen.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // queueMicrotask: zelfde truc als bij de leespositie-restore
    // hieronder — geen synchrone setState in de effect-body.
    queueMicrotask(() => setReducedMotion(mq.matches));
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // ── Position (saved per story) ───────────────────────────────
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Touch-swipe tracker voor tablet (DesktopBookFrame route).
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Fullscreen-state — gehouden in sync met de browser's fullscreen-API
  // zodat ook ESC-uittreden de knop terugdraait. iOS Safari ondersteunt
  // de full-element-fullscreen-API niet; daar tonen we de knop niet.
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supportsFullscreen, setSupportsFullscreen] = useState(false);
  useEffect(() => {
    // queueMicrotask: synchrone setState in een effect-body triggert
    // cascading renders (lint set-state-in-effect); een microtask
    // ontkoppelt de write van de render-fase.
    queueMicrotask(() =>
      setSupportsFullscreen(
        typeof document.documentElement.requestFullscreen === "function",
      ),
    );
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    // iOS Safari heeft geen Element.requestFullscreen op `<html>` — alleen
    // op video. Feature-detect synchroon zodat we niet in een TypeError
    // belanden (een .catch() vangt 'm niet op want de error is synchroon).
    if (document.fullscreenElement) {
      if (typeof document.exitFullscreen === "function") {
        void document.exitFullscreen().catch(() => {});
      }
      return;
    }
    const el = document.documentElement;
    if (typeof el.requestFullscreen === "function") {
      void el.requestFullscreen().catch(() => {});
    }
    // Anders: button doet niets. Op iOS Safari is dat de enige optie
    // tot Apple alsnog full-element fullscreen toevoegt.
  };

  useEffect(() => {
    const key = `ov_reader_v3_${storyId}_${isMobile ? "m" : "d"}`;
    // queueMicrotask defers de setState uit de effect-body — voorkomt
    // de "set-state-in-effect"-warning + cascading-render. Gedrag blijft
    // identiek (de localStorage-lookup is sync genoeg).
    queueMicrotask(() => {
      const saved =
        typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (saved) {
        const n = parseInt(saved, 10);
        if (!isNaN(n) && n >= 0 && n < totalUnits) {
          setIdx(n);
          return;
        }
      }
      setIdx(0);
    });
  }, [storyId, isMobile, totalUnits]);

  useEffect(() => {
    const key = `ov_reader_v3_${storyId}_${isMobile ? "m" : "d"}`;
    if (typeof window !== "undefined") localStorage.setItem(key, String(idx));
  }, [idx, storyId, isMobile]);

  // Meld de zichtbare spread aan de parent (voorleesfunctie) — ook bij
  // init en bij herstel van de leespositie uit localStorage.
  const currentSpreadIdx = isMobile
    ? (unitToSpreadIdx[idx] ?? 0)
    : Math.min(idx, Math.max(0, spreads.length - 1));
  useEffect(() => {
    onSpreadChange?.(currentSpreadIdx);
  }, [currentSpreadIdx, onSpreadChange]);

  const go = useCallback(
    (d: 1 | -1) => {
      setIdx((prev) => {
        const next = prev + d;
        if (next < 0 || next >= totalUnits) return prev;
        setDirection(d);
        return next;
      });
    },
    [totalUnits],
  );

  // Keyboard — global page-flip shortcuts. Skip when the user is
  // typing in a form control (input/textarea/select/contenteditable),
  // otherwise spacebar in our regen-feedback textarea would be eaten by
  // preventDefault() and arrow keys would jump pages mid-sentence.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        go(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // ── Auto-hide chrome ─────────────────────────────────────────
  // Alleen op touch-apparaten: daar wint het boek van de knoppen. Op een
  // laptop/desktop (echte muis: hover + fine pointer) blijven de pijltjes
  // en de balk gewoon staan — wegspringende knoppen onder een muiscursor
  // voelen als een bug, niet als rust.
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const hasMouse = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    // Muis aanwezig: chrome blijft gewoon staan. Geen setState nodig —
    // de state initialiseert al op true en niets zet hem hier uit.
    if (hasMouse) return;
    function bump() {
      setChromeVisible(true);
      if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
      chromeTimerRef.current = setTimeout(() => setChromeVisible(false), 3500);
    }
    bump();
    window.addEventListener("mousemove", bump, { passive: true });
    window.addEventListener("touchstart", bump, { passive: true });
    window.addEventListener("keydown", bump);
    return () => {
      if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("touchstart", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [idx]);

  // ── Render ───────────────────────────────────────────────────
  const progress = totalUnits > 1 ? idx / (totalUnits - 1) : 1;

  return (
    <div
      style={{
        minHeight: "100svh", // mobile-friendly small viewport units
        background: V2.paperDeep,
        color: V2.ink,
        fontFamily: V2.body,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient vignette */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(20,20,46,0.18) 100%)`,
          zIndex: 1,
        }}
      />

      {/* Top bar */}
      <nav
        aria-label="Verhaal navigatie"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          padding: isMobile ? "10px 14px" : "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          background: `${V2.paper}f0`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: `1px solid ${V2.paperShade}`,
          opacity: chromeVisible ? 1 : 0.08,
          transform: chromeVisible ? "translateY(0)" : "translateY(-4px)",
          transition:
            "opacity 0.5s ease, transform 0.5s ease",
        }}
        onMouseEnter={() => setChromeVisible(true)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <Link
            href={readOnly ? "/" : "/dashboard"}
            aria-label={readOnly ? "Naar Ons Verhaaltje" : "Terug naar bibliotheek"}
          >
            <Logo size={isMobile ? 16 : 18} />
          </Link>
          {!readOnly && (
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: 500,
                color: V2.ink,
                textDecoration: "none",
                whiteSpace: "nowrap",
                padding: "7px 14px",
                border: `1.5px solid ${V2.goldDeep}`,
                background: V2.paper,
                borderRadius: 999,
                letterSpacing: "0.02em",
              }}
            >
              <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>←</span>
              <span>Plankje</span>
            </Link>
          )}
        </div>

        {showTitle && (
          <div
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: 17,
              color: V2.ink,
              maxWidth: 420,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              opacity: 0.92,
            }}
          >
            {storyTitle}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: isMobile ? 10 : 18,
            alignItems: "center",
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
          }}
        >
          {onListenClick && (!readOnly || hasAudio) && (
            <ChromeButton
              label="Voorlezen"
              iconName="speaker"
              active={hasAudio}
              activeColor={V2.goldDeep}
              onClick={onListenClick}
              compact={compactLabels}
            />
          )}
          {!readOnly && onShareClick && (
            <ChromeButton
              label="Delen"
              iconName="share"
              active={isShared}
              activeColor={V2.goldDeep}
              onClick={onShareClick}
              compact={compactLabels}
            />
          )}
          {!readOnly && onReactClick && (
            <ChromeButton
              label="Reageren"
              iconName="redo"
              active={hasFeedback}
              activeColor={V2.goldDeep}
              onClick={onReactClick}
              compact={compactLabels}
            />
          )}
          {!readOnly && onToggleFavorite && (
            <ChromeButton
              label={isFavorite ? "Favoriet" : "Bewaren"}
              iconName="heart"
              active={isFavorite}
              activeColor={V2.heart}
              onClick={onToggleFavorite}
              compact={compactLabels}
            />
          )}
          {!readOnly && (
            <a
              href={`/api/stories/${storyId}/pdf`}
              download
              aria-label="Download als PDF"
              title="Download als PDF"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: V2.inkMute,
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: 400,
                padding: compactLabels ? "8px 6px" : "8px 4px",
                minHeight: 36,
                textDecoration: "none",
              }}
            >
              <ButtonIcon name="download" color={V2.inkMute} active={false} />
              {!compactLabels && <span>PDF</span>}
            </a>
          )}
          {supportsFullscreen && (
            <ChromeButton
              label={isFullscreen ? "Verlaten" : "Volledig scherm"}
              iconName={isFullscreen ? "fullscreen-exit" : "fullscreen"}
              active={isFullscreen}
              onClick={toggleFullscreen}
              compact={compactLabels}
            />
          )}

          {!compactLabels && !readOnly && childId && (
            <Link
              href={`/generate/${childId}`}
              style={{ color: V2.inkMute, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Nieuw verhaal
            </Link>
          )}
          {!compactLabels && !readOnly && childId && storyId && (
            <Link
              href={`/generate/${childId}?vervolgVan=${storyId}`}
              style={{ color: V2.inkMute, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Vervolgverhaal
            </Link>
          )}
          {!compactLabels && !readOnly && <SignOutButtonV2 />}

          {readOnly && (
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: 500,
                color: V2.paper,
                background: V2.ink,
                textDecoration: "none",
                whiteSpace: "nowrap",
                padding: "8px 16px",
                borderRadius: 999,
                letterSpacing: "0.02em",
              }}
            >
              {isMobile ? "Maak je eigen →" : "Maak je eigen verhaal →"}
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile: title strip beneath nav (so the nav stays compact) */}
      {isMobile && (
        <div
          style={{
            textAlign: "center",
            padding: "8px 16px 0",
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: 14,
            color: V2.inkMute,
            opacity: chromeVisible ? 0.9 : 0,
            transition: "opacity 0.5s ease",
            zIndex: 5,
            position: "relative",
          }}
        >
          {storyTitle}
        </div>
      )}

      {/* Stage */}
      <div
        style={{
          padding: isMobile ? "12px 0 80px" : "40px 24px 140px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
          minHeight: isMobile ? "calc(100svh - 120px)" : "auto",
          touchAction: isMobile ? undefined : "pan-y",
        }}
        // Touch-swipe op tablet (waar de DesktopBookFrame draait maar
        // de gebruiker wel met vingers bladert). Mobile heeft z'n eigen
        // framer-motion drag, dus daar laten we deze handlers stil.
        onTouchStart={
          isMobile
            ? undefined
            : (e) => {
                const t = e.touches[0];
                if (!t) return;
                touchStartRef.current = { x: t.clientX, y: t.clientY };
              }
        }
        onTouchEnd={
          isMobile
            ? undefined
            : (e) => {
                const start = touchStartRef.current;
                touchStartRef.current = null;
                if (!start) return;
                const t = e.changedTouches[0];
                if (!t) return;
                const dx = t.clientX - start.x;
                const dy = t.clientY - start.y;
                // Alleen reageren op duidelijk horizontale swipe; anders
                // is 't waarschijnlijk gewoon scrollen.
                if (Math.abs(dx) < 50) return;
                if (Math.abs(dy) > Math.abs(dx)) return;
                go(dx < 0 ? 1 : -1);
              }
        }
      >
        {isMobile ? (
          <MobilePager
            page={pages[idx]}
            childName={childName}
            direction={direction}
            idx={idx}
            onSwipe={(d) => go(d)}
            wordHighlight={wordHighlight}
            reducedMotion={reducedMotion}
          />
        ) : (
          <DesktopBookFrame
            spread={spreads[idx]}
            childName={childName}
            direction={direction}
            idx={idx}
            wordHighlight={wordHighlight}
            reducedMotion={reducedMotion}
          />
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: isMobile ? "10px 16px 14px" : "16px 24px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          background: `linear-gradient(to top, ${V2.paperDeep} 0%, ${V2.paperDeep}cc 70%, transparent 100%)`,
          zIndex: 15,
          opacity: chromeVisible ? 1 : 0.15,
          transition: "opacity 0.5s ease",
          pointerEvents: chromeVisible ? "auto" : "none",
        }}
      >
        {/* Ribbon progress */}
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            height: 2,
            background: V2.paperShade,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{
              height: "100%",
              background: `linear-gradient(to right, ${V2.gold}, ${V2.goldDeep})`,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 18 : 28,
          }}
        >
          <NavButton
            direction="prev"
            disabled={idx === 0}
            onClick={() => go(-1)}
            size={isMobile ? 48 : 52}
          />
          <div
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: isMobile ? 14 : 15,
              color: V2.inkMute,
              minWidth: isMobile ? 78 : 110,
              textAlign: "center",
              letterSpacing: 0.2,
            }}
          >
            <span style={{ color: V2.ink }}>{toRoman(idx + 1)}</span>{" "}
            <span style={{ opacity: 0.55 }}>·</span>{" "}
            {toRoman(totalUnits)}
          </div>
          <NavButton
            direction="next"
            disabled={idx === totalUnits - 1}
            onClick={() => go(1)}
            size={isMobile ? 48 : 52}
          />
        </div>

        {/* Op de laatste pagina: prominente herstart-knop voor de
            "nog een keer!"-momentjes. */}
        {idx === totalUnits - 1 && (
          <button
            type="button"
            onClick={() => {
              setDirection(-1);
              setIdx(0);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 22px",
              background: V2.ink,
              color: V2.paper,
              border: "none",
              borderRadius: 999,
              fontFamily: V2.ui,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(20,20,46,0.20)",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Lees opnieuw vanaf het begin</span>
          </button>
        )}
      </div>

      {/* Floating bookmark ribbon when favorited */}
      {isFavorite && (
        <BookmarkRibbon isMobile={isMobile} chromeVisible={chromeVisible} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MOBILE PAGER — single page, swipe horizontally
// ────────────────────────────────────────────────────────────────

function MobilePager({
  page,
  childName,
  direction,
  idx,
  onSwipe,
  wordHighlight,
  reducedMotion,
}: {
  page: PageType;
  childName: string;
  direction: 1 | -1;
  idx: number;
  onSwipe: (d: 1 | -1) => void;
  wordHighlight: WordHighlight | null;
  reducedMotion: boolean;
}) {
  const SWIPE_THRESHOLD = 60;

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const { offset, velocity } = info;
    const swipe = Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 400;
    if (!swipe) return;
    if (offset.x < 0) onSwipe(1);
    else onSwipe(-1);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 460,
        aspectRatio: "3 / 4.4",
        // Stay inside viewport on small phones
        maxHeight: "calc(100svh - 200px)",
        margin: "0 14px",
        perspective: 1400,
      }}
    >
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={idx}
          custom={direction}
          drag="x"
          dragElastic={0.18}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          initial={{
            opacity: 0,
            x: direction > 0 ? 80 : -80,
            rotateY: direction > 0 ? 18 : -18,
          }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          exit={{
            opacity: 0,
            x: direction > 0 ? -60 : 60,
            rotateY: direction > 0 ? -14 : 14,
          }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            background: V2.paper,
            backgroundImage: PAPER_NOISE,
            backgroundBlendMode: "multiply",
            boxShadow:
              "0 24px 60px rgba(20,20,46,0.22), 0 6px 18px rgba(20,20,46,0.12)",
            transformStyle: "preserve-3d",
            cursor: "grab",
            overflow: "hidden",
            borderRadius: 2,
          }}
        >
          <PageContent
            page={page}
            side="full"
            childName={childName}
            wordHighlight={wordHighlight}
            reducedMotion={reducedMotion}
          />
          {/* Inner page edge highlight */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `linear-gradient(to right, rgba(0,0,0,0.05) 0%, transparent 4%, transparent 96%, rgba(0,0,0,0.05) 100%)`,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Subtle hint on first page */}
      {idx === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: -28,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: V2.ui,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: 0.6,
            pointerEvents: "none",
          }}
        >
          ← veeg om te bladeren →
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// DESKTOP BOOK FRAME — two-page spread with page-flip
// ────────────────────────────────────────────────────────────────

function DesktopBookFrame({
  spread,
  childName,
  direction,
  idx,
  wordHighlight,
  reducedMotion,
}: {
  spread: Spread;
  childName: string;
  direction: 1 | -1;
  idx: number;
  wordHighlight: WordHighlight | null;
  reducedMotion: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "min(100%, 980px)",
        aspectRatio: "980 / 620",
        maxHeight: "calc(100vh - 200px)",
        perspective: 2400,
      }}
    >
      {/* Page-edge stack illusion (bottom + right) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -2,
          background: `repeating-linear-gradient(to bottom, ${V2.paperShade} 0px, ${V2.paperShade} 1px, ${V2.paper} 1px, ${V2.paper} 3px)`,
          opacity: 0.6,
          zIndex: 0,
          transform: "translate(4px, 4px)",
          filter: "blur(0.4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: V2.paper,
          backgroundImage: PAPER_NOISE,
          backgroundBlendMode: "multiply",
          boxShadow:
            "0 36px 90px rgba(20,20,46,0.30), 0 12px 36px rgba(20,20,46,0.14)",
          transformStyle: "preserve-3d",
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={idx}
            custom={direction}
            initial={{
              opacity: 0,
              rotateY: direction > 0 ? 24 : -24,
              x: direction > 0 ? 28 : -28,
            }}
            animate={{ opacity: 1, rotateY: 0, x: 0 }}
            exit={{
              opacity: 0,
              rotateY: direction > 0 ? -24 : 24,
              x: direction > 0 ? -28 : 28,
            }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              transformStyle: "preserve-3d",
              transformOrigin: direction > 0 ? "left center" : "right center",
            }}
          >
            {spread.fullSpread ? (
              <FullBleedPage
                page={spread.left}
                childName={childName}
                wordHighlight={wordHighlight}
                reducedMotion={reducedMotion}
              />
            ) : (
              <>
                <Page
                  side="left"
                  page={spread.left}
                  childName={childName}
                  wordHighlight={wordHighlight}
                  reducedMotion={reducedMotion}
                />
                <Page
                  side="right"
                  page={spread.right}
                  childName={childName}
                  wordHighlight={wordHighlight}
                  reducedMotion={reducedMotion}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Spine shadow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 56,
            transform: "translateX(-50%)",
            background:
              "linear-gradient(to right, transparent 0%, rgba(20,20,46,0.18) 48%, rgba(20,20,46,0.18) 52%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />

        {/* Inner page-edge highlights */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(to right, rgba(0,0,0,0.06) 0%, transparent 3%, transparent 97%, rgba(0,0,0,0.06) 100%), linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, transparent 4%, transparent 96%, rgba(0,0,0,0.04) 100%)",
            zIndex: 4,
          }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// PAGES
// ────────────────────────────────────────────────────────────────

function Page({
  side,
  page,
  childName,
  wordHighlight,
  reducedMotion,
}: {
  side: "left" | "right";
  page: PageType;
  childName: string;
  wordHighlight: WordHighlight | null;
  reducedMotion: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "50%",
        height: "100%",
        background: "transparent",
        overflow: "hidden",
      }}
    >
      <PageContent
        page={page}
        side={side}
        childName={childName}
        wordHighlight={wordHighlight}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

function FullBleedPage({
  page,
  childName,
  wordHighlight,
  reducedMotion,
}: {
  page: PageType;
  childName: string;
  wordHighlight: WordHighlight | null;
  reducedMotion: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "transparent",
        overflow: "hidden",
      }}
    >
      <PageContent
        page={page}
        side="full"
        childName={childName}
        wordHighlight={wordHighlight}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

function PageContent({
  page,
  side,
  childName,
  wordHighlight = null,
  reducedMotion = false,
}: {
  page: PageType;
  side: "left" | "right" | "full";
  childName: string;
  wordHighlight?: WordHighlight | null;
  reducedMotion?: boolean;
}) {
  if (page.type === "title") return <TitlePage page={page} />;
  if (page.type === "ending") return <EndingPage page={page} childName={childName} />;
  if (page.type === "illustration")
    return <IllustrationPage page={page} childName={childName} full={side === "full"} />;
  return (
    <TextPage
      page={page}
      side={side === "right" ? "right" : "left"}
      wordHighlight={wordHighlight}
      reducedMotion={reducedMotion}
    />
  );
}

// ── Title ──────────────────────────────────────────────────────

function TitlePage({ page }: { page: Extract<PageType, { type: "title" }> }) {
  return (
    <div
      style={{
        height: "100%",
        padding: "clamp(28px, 6vw, 64px) clamp(20px, 5vw, 56px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          fontFamily: V2.mono,
          fontSize: 11,
          letterSpacing: "0.22em",
          color: V2.inkMute,
          textTransform: "uppercase",
        }}
      >
        {page.tag}
      </span>
      <div>
        <h1
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(30px, 7vw, 52px)",
            letterSpacing: -1.2,
            lineHeight: 1.04,
            margin: 0,
            color: V2.ink,
          }}
        >
          {page.title}
        </h1>
        <Flourish />
        {page.subtitle && (
          <p
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: "clamp(15px, 3.4vw, 19px)",
              color: V2.inkSoft,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {page.subtitle}
          </p>
        )}
      </div>
      <span
        style={{
          fontFamily: V2.mono,
          fontSize: 10,
          letterSpacing: "0.22em",
          color: V2.inkMute,
        }}
      >
        {page.dateLabel ?? "ONS VERHAALTJE · 2026"}
      </span>
    </div>
  );
}

// ── Text (with ornamented drop cap) ────────────────────────────

function TextPage({
  page,
  side,
  wordHighlight,
  reducedMotion,
}: {
  page: Extract<PageType, { type: "text" }>;
  side: "left" | "right";
  wordHighlight: WordHighlight | null;
  reducedMotion: boolean;
}) {
  const isDropcap = page.layout === "dropcap";
  const text = page.content.trim();
  const first = text.charAt(0);

  // Zelfde splitsing als server-side (word-split.ts) zodat de
  // woordindex uit de wordTimings 1-op-1 op deze spans mapt.
  const words = useMemo(() => splitWords(page.content), [page.content]);

  // Alleen markeren wanneer de highlight bij déze pagina hoort.
  const activeWordIndex =
    wordHighlight !== null &&
    typeof page.pageNumber === "number" &&
    wordHighlight.pageNumber === page.pageNumber
      ? wordHighlight.wordIndex
      : null;

  return (
    <div
      style={{
        height: "100%",
        padding: "clamp(28px, 6vw, 64px) clamp(22px, 5vw, 56px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          fontFamily: V2.body,
          fontSize: "clamp(17px, 2.4vw, 20px)",
          fontWeight: 400,
          lineHeight: 1.62,
          letterSpacing: 0.02,
          color: V2.ink,
          maxWidth: "44ch",
          marginLeft: side === "right" ? "auto" : 0,
          marginRight: side === "left" ? "auto" : 0,
          textShadow: "0 0 0.4px rgba(31,30,58,0.4)",
        }}
      >
        {isDropcap ? (
          <>
            <span
              style={{
                fontFamily: V2.display,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(58px, 9vw, 84px)",
                float: "left",
                lineHeight: 0.82,
                marginRight: 12,
                marginTop: 6,
                color: V2.goldDeep,
                paddingBottom: 4,
                borderBottom: `1px solid ${V2.gold}`,
              }}
            >
              {first}
            </span>
            {/* Woord 0 zonder z'n eerste letter (die is de dropcap);
                de woordindexen blijven gelijk aan de volledige tekst. */}
            <WordSpans
              words={
                words.length > 0 ? [words[0].slice(1), ...words.slice(1)] : []
              }
              activeIndex={activeWordIndex}
              reducedMotion={reducedMotion}
            />
          </>
        ) : (
          <WordSpans
            words={words}
            activeIndex={activeWordIndex}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Paginatekst als losse woord-spans, zodat het actief voorgelezen woord
 * een zachte gouden markering kan krijgen. De spans staan er altijd
 * (ook zonder voorlezen) zodat de DOM niet verspringt wanneer de
 * markering aan gaat.
 */
function WordSpans({
  words,
  activeIndex,
  reducedMotion,
}: {
  words: string[];
  activeIndex: number | null;
  reducedMotion: boolean;
}) {
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span
            style={{
              borderRadius: 3,
              background:
                i === activeIndex ? "rgba(201,169,97,0.35)" : "transparent",
              // Beetje lucht om het woord zonder de layout te verschuiven.
              padding: "0 2px",
              margin: "0 -2px",
              transition: reducedMotion ? "none" : "background 0.12s ease",
            }}
          >
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

// ── Illustration ───────────────────────────────────────────────

function IllustrationPage({
  page,
  full,
}: {
  page: Extract<PageType, { type: "illustration" }>;
  childName: string;
  full: boolean;
}) {
  if (page.url) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <Image
          src={page.url}
          alt={page.description || "Illustratie"}
          fill
          priority
          sizes={full ? "100vw" : "(max-width: 768px) 100vw, 50vw"}
          style={{
            objectFit: "cover",
          }}
          draggable={false}
        />
        {/* Soft inner vignette on illustration so type-pages on the other side feel balanced */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(20,20,46,0.18) 100%)",
          }}
        />
      </div>
    );
  }

  // Fallback wanneer de illustratie ontbreekt — papier-fond + duidelijke
  // melding zodat een ouder begrijpt dat dit niet zo bedoeld is. Vroeger
  // een night-sky look, wat oogde alsof we ze een zwart vlak hadden
  // geserveerd; deze versie maakt duidelijk dat de illustratie nog komt.
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: V2.paperDeep,
        backgroundImage: PAPER_NOISE,
        backgroundBlendMode: "multiply",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: full ? "40px 48px" : "24px 28px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Decoratief diamant-icoon zodat het niet leeg oogt */}
      <div
        aria-hidden
        style={{
          width: full ? 36 : 28,
          height: full ? 36 : 28,
          background: V2.goldSoft,
          transform: "rotate(45deg)",
          marginBottom: full ? 24 : 18,
          border: `1px solid ${V2.gold}`,
        }}
      />
      <div
        style={{
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: V2.goldDeep,
          marginBottom: 12,
        }}
      >
        Illustratie ontbreekt
      </div>
      <div
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: full ? 18 : 15,
          color: V2.inkSoft,
          lineHeight: 1.5,
          maxWidth: 460,
          marginBottom: 16,
        }}
      >
        {page.description ?? "Deze pagina-illustratie kon niet gegenereerd worden."}
      </div>
      <div
        style={{
          fontFamily: V2.body,
          fontSize: 13,
          color: V2.inkMute,
          lineHeight: 1.5,
          maxWidth: 380,
        }}
      >
        Geen zorgen — je credit is teruggezet, je kunt het verhaal
        opnieuw genereren.
      </div>
    </div>
  );
}

// ── Ending (keepsake) ──────────────────────────────────────────

function EndingPage({
  page,
  childName,
}: {
  page: Extract<PageType, { type: "ending" }>;
  childName: string;
}) {
  return (
    <div
      style={{
        height: "100%",
        padding: "clamp(32px, 6vw, 64px) clamp(20px, 5vw, 56px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          fontFamily: V2.display,
          fontSize: "clamp(20px, 4vw, 26px)",
          fontStyle: "italic",
          color: V2.inkSoft,
          lineHeight: 1.5,
          maxWidth: "34ch",
          margin: "0 auto 24px",
          fontWeight: 400,
        }}
      >
        {page.text}
      </div>
      <Flourish center />
      <div
        style={{
          fontFamily: V2.mono,
          fontSize: 10,
          letterSpacing: "0.24em",
          color: V2.inkMute,
          margin: "8px auto 14px",
          textTransform: "uppercase",
        }}
      >
        Welterusten,
      </div>
      <div
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: "clamp(28px, 6vw, 44px)",
          fontWeight: 300,
          color: V2.goldDeep,
          letterSpacing: -0.8,
          lineHeight: 1,
        }}
      >
        {childName}
      </div>
      {page.sign && (
        <div
          style={{
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: "clamp(14px, 2.6vw, 17px)",
            color: V2.inkMute,
            marginTop: 18,
            opacity: 0.85,
          }}
        >
          {page.sign}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// CONTROLS
// ────────────────────────────────────────────────────────────────

function NavButton({
  direction,
  disabled,
  onClick,
  size = 52,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  size?: number;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "Vorige pagina" : "Volgende pagina"}
      style={{
        width: size,
        height: size,
        background: isPrev ? V2.paper : V2.ink,
        color: isPrev ? V2.ink : V2.paper,
        border: isPrev ? `1px solid ${V2.paperShade}` : "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.25 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        boxShadow: disabled
          ? "none"
          : isPrev
            ? "0 2px 8px rgba(20,20,46,0.08)"
            : "0 4px 14px rgba(20,20,46,0.22)",
        transition: "transform 0.15s ease, box-shadow 0.2s ease",
      }}
      onMouseDown={(e) =>
        !disabled && (e.currentTarget.style.transform = "scale(0.94)")
      }
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isPrev ? V2.ink : V2.paper}
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d={isPrev ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

function ChromeButton({
  label,
  iconName,
  active,
  activeColor,
  onClick,
  compact,
}: {
  label: string;
  iconName: "heart" | "speaker" | "x" | "fullscreen" | "fullscreen-exit" | "share" | "redo";
  active: boolean;
  activeColor?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const color = active ? activeColor ?? V2.ink : V2.inkMute;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color,
        fontFamily: V2.ui,
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        padding: compact ? "8px 6px" : "8px 4px",
        minHeight: 36,
      }}
      aria-pressed={active}
      aria-label={label}
    >
      <ButtonIcon name={iconName} color={color} active={active} />
      {!compact && <span>{label}</span>}
    </button>
  );
}

function ButtonIcon({
  name,
  color,
  active,
}: {
  name: "heart" | "speaker" | "x" | "download" | "fullscreen" | "fullscreen-exit" | "share" | "redo";
  color: string;
  active: boolean;
}) {
  if (name === "redo") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    );
  }
  if (name === "share") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 16V4" />
        <path d="M7 9l5-5 5 5" />
        <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
    );
  }
  if (name === "heart") {
    return (
      <IconV2 name="heart" size={16} color={color} filled={active} />
    );
  }
  if (name === "fullscreen") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </svg>
    );
  }
  if (name === "fullscreen-exit") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      </svg>
    );
  }
  if (name === "download") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4v12M6 12l6 6 6-6M5 20h14" />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  // speaker / read-aloud
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 8a5 5 0 0 1 0 8" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

// ── Bookmark ribbon ─────────────────────────────────────────────

function BookmarkRibbon({
  isMobile,
  chromeVisible,
}: {
  isMobile: boolean;
  chromeVisible: boolean;
}) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      aria-hidden
      style={{
        position: "fixed",
        top: isMobile ? 56 : 60,
        right: isMobile ? 16 : 36,
        width: isMobile ? 22 : 26,
        height: isMobile ? 86 : 110,
        background: V2.heart,
        boxShadow: "0 6px 14px rgba(176,74,65,0.34)",
        clipPath:
          "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
        zIndex: 12,
        opacity: chromeVisible ? 1 : 0.55,
        transition: "opacity 0.4s ease",
      }}
    />
  );
}

// ── Flourish (small ornament) ──────────────────────────────────

function Flourish({ center = false }: { center?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        gap: 8,
        margin: "18px 0",
      }}
    >
      <span
        style={{
          width: 36,
          height: 1,
          background: V2.goldDeep,
          opacity: 0.7,
        }}
      />
      <span
        style={{
          width: 4,
          height: 4,
          background: V2.gold,
          transform: "rotate(45deg)",
        }}
      />
      <span
        style={{
          width: 36,
          height: 1,
          background: V2.goldDeep,
          opacity: 0.7,
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────

function flattenSpreads(spreads: Spread[]): PageType[] {
  const out: PageType[] = [];
  for (const s of spreads) {
    if (s.fullSpread) {
      out.push(s.left);
    } else {
      out.push(s.left);
      out.push(s.right);
    }
  }
  return out;
}

function toRoman(n: number): string {
  if (n <= 0) return "";
  const map: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let res = "";
  let v = n;
  for (const [num, sym] of map) {
    while (v >= num) {
      res += sym;
      v -= num;
    }
  }
  return res;
}
