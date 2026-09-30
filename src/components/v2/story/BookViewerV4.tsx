"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { preload } from "react-dom";
import Image, { getImageProps } from "next/image";
import { motion } from "framer-motion";
import { V2 } from "@/components/v2/tokens";
import type { Spread } from "@/lib/story/spread-types";
import {
  anchorOf,
  buildBaseUnits,
  expandUnits,
  findUnitIndex,
  toRoman,
  type DisplayUnit,
  type ReaderAnchor,
} from "@/lib/story/reader-units";
import {
  formatMinutes,
  inNightWindow,
  resolveNight,
  type ReaderSettings,
} from "@/lib/reader/night";
import type { OverflowMode } from "@/lib/reader/version";
import type { WordHighlight } from "@/components/v2/story/BookViewerV3";
import {
  useHasChildren,
  useMediaQuery,
  useMinuteClock,
  useNightOverride,
  useReaderView,
} from "./v4/hooks";
import { fontPxFor } from "./v4/layout";
import { READER_LIGHT, READER_NIGHT, paletteVars } from "./v4/palette";
import { ReaderFlow, type FlowControl } from "./v4/ReaderFlow";
import { ReaderPage } from "./v4/ReaderPage";
import {
  ReaderBottomBar,
  ReaderToast,
  ReaderTopBar,
} from "./v4/ReaderChrome";
import { ReaderMenu } from "./v4/ReaderMenu";

export type { WordHighlight };

/** Handvat voor de pagina om de lezer aan te sturen vanuit de speler. */
export type ReaderHandle = {
  /** Voorlezen: de audio van de zichtbare pagina is uitgespeeld. Geeft
   *  true als de lezer zelf doorgaat naar de volgende pagina (doorlopend
   *  scrollen); anders blijft het aan de lezer om te bladeren. */
  continueReading: () => boolean;
};

/** Adempauze tussen de laatste zin en het doorscrollen naar de volgende
 *  pagina. */
const READ_ON_DELAY_MS = 700;

type Props = {
  spreads: Spread[];
  childName: string;
  /** Alleen voor de eigenaar: linkt naar "Nieuw verhaal" en vervolg. */
  childId?: string;
  storyId: string;
  storyTitle: string;
  /** Deelpagina (`/s/[token]`): geen eigenaar-acties, wel een
   *  uitnodiging om zelf een verhaal te maken op de laatste pagina. */
  readOnly?: boolean;
  isFavorite: boolean;
  onToggleFavorite?: () => void;
  /** Eigenaar: opent het deel-venster. Zonder deze prop deelt de knop
   *  het adres van de pagina zelf. */
  onShareClick?: () => void;
  isShared?: boolean;
  onReactClick?: () => void;
  hasFeedback?: boolean;
  /** Opent het voorlezen. Op de deelpagina alleen tonen als er audio
   *  bestaat (`hasAudio`): daar wordt nooit gegenereerd. */
  onListenClick?: () => void;
  hasAudio?: boolean;
  /** Het voorlezen staat open (stemkeuze of speler). */
  listenOpen?: boolean;
  /** Het element in de onderbalk waar de speler z'n paneel in zet. */
  onListenSlot?: (el: HTMLElement | null) => void;
  /** Meldt de spread-index van de zichtbare pagina. */
  onSpreadChange?: (spreadIdx: number) => void;
  wordHighlight?: WordHighlight | null;
  readerSettings: ReaderSettings;
  /** Minuten sinds middernacht volgens de server (Nederlandse tijd),
   *  voor de eerste weergave vóór de klok van het toestel bekend is. */
  serverMinutes: number;
  overflowMode: OverflowMode;
  /** Meldt de nachtstand, zodat vensters buiten de lezer (stemkiezer,
   *  delen, reageren) meekleuren. */
  onNightChange?: (night: boolean) => void;
  ref?: Ref<ReaderHandle>;
};

type Flip = { id: number; unit: DisplayUnit; index: number; dir: 1 | -1 };

const FLIP_SECONDS = 1.15;
const FLIP_EASE = [0.35, 0.05, 0.2, 1] as const;
const CHROME_HIDE_MS = 3500;
const IMG_SIZES = "(orientation: landscape) 60vw, 100vw";

function positionKey(storyId: string): string {
  return `ov_reader_v4_${storyId}`;
}

function readAnchor(storyId: string): ReaderAnchor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(positionKey(storyId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "s" in parsed &&
      "w" in parsed &&
      typeof parsed.s === "number" &&
      typeof parsed.w === "number"
    ) {
      return { s: parsed.s, w: parsed.w };
    }
  } catch {
    // Opslag geblokkeerd of beschadigd: begin bij de kaft.
  }
  return null;
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
const noSubscribe = () => () => {};

function isUiTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      "button, a, input, select, textarea, [role='dialog'], [role='slider'], [data-ovr-ui]",
    ) !== null
  );
}

/**
 * Lezer zonder boekformaat. De lay-out volgt de oriëntatie: staand staat
 * de illustratie boven de tekst, liggend staan ze naast elkaar.
 */
export function BookViewerV4({
  spreads,
  childName,
  childId,
  storyId,
  storyTitle,
  readOnly = false,
  isFavorite,
  onToggleFavorite,
  onShareClick,
  isShared = false,
  onReactClick,
  hasFeedback = false,
  onListenClick,
  hasAudio = false,
  listenOpen = false,
  onListenSlot,
  onSpreadChange,
  wordHighlight = null,
  readerSettings,
  serverMinutes,
  overflowMode,
  onNightChange,
  ref,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const baseUnits = useMemo(() => buildBaseUnits(spreads), [spreads]);

  // ── Voorleespaneel in de onderbalk ───────────────────────────
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);
  const pillOpen = useHasChildren(slotEl);
  const slotRef = useCallback(
    (el: HTMLDivElement | null) => {
      setSlotEl(el);
      onListenSlot?.(el);
    },
    [onListenSlot],
  );

  // ── Lay-out en pagina's ──────────────────────────────────────
  const view = useReaderView(rootRef, baseUnits, pillOpen);
  const layout = view?.layout ?? null;
  const imageShare = view?.imageShare ?? 0;

  // Doorlopend scrollen: alleen op een staande telefoon. Elders (tablet,
  // liggend) gedraagt deze optie zich als `split`.
  const flow =
    overflowMode === "flow" &&
    layout !== null &&
    layout.orientation === "portrait" &&
    layout.device === "phone";
  const flowUnits = useMemo(() => expandUnits(baseUnits, new Map()), [baseUnits]);
  const flowControl = useRef<FlowControl | null>(null);
  const units = flow ? flowUnits : (view?.units ?? null);

  // De leespositie is een anker (spread + eerste woord), geen index: de
  // indeling in pagina's verandert als de lezer het toestel draait.
  const [anchor, setAnchor] = useState<ReaderAnchor | null>(() =>
    readAnchor(storyId),
  );
  const index = units ? findUnitIndex(units, anchor) : 0;
  const unit = units?.[index] ?? null;
  const total = units?.length ?? 0;
  const isLast = total > 0 && index === total - 1;

  useEffect(() => {
    if (!anchor) return;
    try {
      window.localStorage.setItem(positionKey(storyId), JSON.stringify(anchor));
    } catch {
      // Niet kunnen bewaren is geen reden om het lezen te onderbreken.
    }
  }, [anchor, storyId]);

  const spreadIdx = unit?.spreadIdx ?? 0;
  useEffect(() => {
    onSpreadChange?.(spreadIdx);
  }, [spreadIdx, onSpreadChange]);

  // ── Nachtmodus ───────────────────────────────────────────────
  const nowMin = useMinuteClock(serverMinutes);
  const [nightOverride, setNightOverride] = useNightOverride();
  const night = resolveNight(readerSettings, nowMin, nightOverride);
  const c = night ? READER_NIGHT : READER_LIGHT;

  let autoNote: string | null = null;
  if (nightOverride === null && readerSettings.autoNight) {
    const { nightStart, nightEnd } = readerSettings;
    if (inNightWindow(nowMin, nightStart, nightEnd)) {
      autoNote = `Nachtmodus automatisch aan tot ${formatMinutes(nightEnd)} · ☾ zet 'm uit`;
    } else if (inNightWindow(nowMin, (nightStart + 1260) % 1440, nightStart)) {
      // Alleen in de drie uur vóór het tijdvak: overdag is de melding
      // ruis en gaat de bladerhint voor.
      autoNote = `Nachtmodus gaat automatisch aan om ${formatMinutes(nightStart)}`;
    }
  }

  useEffect(() => {
    onNightChange?.(night);
  }, [night, onNightChange]);

  // Kleur van de statusbalk van de browser mee laten gaan.
  useEffect(() => {
    const metas = Array.from(
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    );
    const before = metas.map((m) => m.content);
    metas.forEach((m) => (m.content = c.themeColor));
    return () => metas.forEach((m, i) => (m.content = before[i]));
  }, [c.themeColor]);

  // ── Bediening tonen en verbergen ─────────────────────────────
  // Alleen op aanraakschermen verdwijnt de bediening vanzelf. Onder een
  // muiscursor voelen wegspringende knoppen als een fout.
  const hasMouse = useMediaQuery("(hover: hover) and (pointer: fine)", true);
  const reducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
    false,
  );
  const [chromeShown, setChromeShown] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bump = useCallback(() => {
    setChromeShown(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(
      () => setChromeShown(false),
      CHROME_HIDE_MS,
    );
  }, []);
  useEffect(() => {
    hideTimer.current = setTimeout(
      () => setChromeShown(false),
      CHROME_HIDE_MS,
    );
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);
  // Aan het eind van het verhaal en met het menu open blijft alles staan.
  const chromeVisible = hasMouse || chromeShown || isLast || menuOpen;
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    bump();
  }, [bump]);

  // ── Bladeren ─────────────────────────────────────────────────
  const [flip, setFlip] = useState<Flip | null>(null);
  const flipSeq = useRef(0);
  /** Id van de lopende omslag; tijdens het omslaan is bladeren geblokkeerd. */
  const activeFlip = useRef<number | null>(null);
  const flipGuard = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endFlip = useCallback((id: number) => {
    if (activeFlip.current !== id) return;
    activeFlip.current = null;
    setFlip(null);
  }, []);
  useEffect(
    () => () => {
      if (flipGuard.current) clearTimeout(flipGuard.current);
    },
    [],
  );

  const navigate = useCallback(
    (next: number) => {
      if (!units || activeFlip.current !== null) return;
      if (next < 0 || next >= units.length || next === index) return;
      if (flow) {
        // Geen omslag: naar het blok van die pagina scrollen.
        setAnchor(anchorOf(units[next]));
        flowControl.current?.scrollTo(next, true);
        bump();
        return;
      }
      const id = ++flipSeq.current;
      activeFlip.current = id;
      setFlip({
        id,
        unit: units[index],
        index,
        dir: next > index ? 1 : -1,
      });
      setAnchor(anchorOf(units[next]));
      // Vangnet: komt de animatie niet af (tab op de achtergrond), dan
      // mag het bladeren niet geblokkeerd blijven.
      if (flipGuard.current) clearTimeout(flipGuard.current);
      flipGuard.current = setTimeout(
        () => endFlip(id),
        FLIP_SECONDS * 1000 + 400,
      );
      bump();
    },
    [units, index, flow, bump, endFlip],
  );

  // Doorlopend scrollen: de pagina waarvan de illustratie bovenaan staat
  // is de leespositie (dit stuurt ook het voorlezen).
  const onFlowIndex = useCallback(
    (i: number) => {
      const unit = flowUnits[i];
      if (unit) setAnchor(anchorOf(unit));
    },
    [flowUnits],
  );
  const onFlowScroll = useCallback(() => {
    // Zelf scrollen = lezen: de bediening dan uit de weg, tot een tik.
    if (hasMouse) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setChromeShown(false);
  }, [hasMouse]);

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
      // Spatie op een knop is "druk op de knop", geen bladeren.
      if (e.key === " " && t instanceof HTMLElement && t.closest("button, a")) {
        return;
      }
      if (e.key === "ArrowRight") navigate(index + 1);
      else if (e.key === "ArrowLeft") navigate(index - 1);
      else if (e.key === " ") {
        e.preventDefault();
        navigate(index + 1);
      } else return;
      bump();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, index, bump]);

  // Voorlezen loopt door naar het volgende deel van dezelfde pagina:
  // blader dan vanzelf mee. Alleen vooruit, zodat terugbladeren tijdens
  // het luisteren niet wordt teruggedraaid.
  const activeWord =
    wordHighlight !== null &&
    unit?.kind === "text" &&
    unit.pageNumber !== null &&
    wordHighlight.pageNumber === unit.pageNumber
      ? wordHighlight.wordIndex
      : null;
  const followTo =
    activeWord !== null &&
    unit?.kind === "text" &&
    activeWord >= unit.part.end &&
    units?.[index + 1]?.spreadIdx === unit.spreadIdx
      ? index + 1
      : null;
  useEffect(() => {
    if (followTo === null) return;
    queueMicrotask(() => navigate(followTo));
  }, [followTo, navigate]);

  // Doorlopend scrollen: is de pagina uitgelezen, dan scrolt de lezer na
  // een adempauze zelf naar de volgende. Bij bladeren blijft het omslaan
  // aan de lezer (de speler toont dan "Sla de bladzijde om").
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  const readOn = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (readOn.current) clearTimeout(readOn.current);
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      continueReading: () => {
        if (!flow || !units || index >= units.length - 1) return false;
        const next = index + 1;
        if (readOn.current) clearTimeout(readOn.current);
        readOn.current = setTimeout(() => {
          readOn.current = null;
          navigateRef.current(next);
        }, READ_ON_DELAY_MS);
        return true;
      },
    }),
    [flow, units, index],
  );

  // ── Tikken en vegen ──────────────────────────────────────────
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointer.current = isUiTarget(e.target)
      ? null
      : { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    pointer.current = null;
    if (!start || start.id !== e.pointerId) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 8) {
      if (!flow && Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy)) {
        navigate(index + (dx < 0 ? 1 : -1));
      }
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    // Doorlopend scrollen: bladeren gaat met scrollen, een tik toont of
    // verbergt alleen de bediening.
    if (!flow && x > 0.66) navigate(index + 1);
    else if (!flow && x < 0.34) navigate(index - 1);
    else if (hasMouse) return;
    else if (chromeShown) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setChromeShown(false);
    } else bump();
  }

  // ── Delen ────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  async function sharePage() {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: storyTitle, url });
        return;
      } catch (err) {
        // Deelvenster weggetikt: niets meer doen.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link gekopieerd · deel het verhaaltje");
    } catch {
      setToast("Kopiëren lukte niet. Kopieer het adres uit de adresbalk.");
    }
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }

  // ── Volledig scherm ──────────────────────────────────────────
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
  // iOS Safari kent geen volledig scherm voor een hele pagina.
  const canFullscreen = useSyncExternalStore(
    noSubscribe,
    () => typeof document.documentElement.requestFullscreen === "function",
    () => false,
  );
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  // ── Illustraties klaarzetten ─────────────────────────────────
  // De kaft is het eerste wat de lezer ziet, maar de pagina's zelf
  // verschijnen pas na het meten: laat de browser alvast beginnen.
  const coverUrl = baseUnits[0]?.image?.url;
  if (coverUrl) {
    const { props: img } = getImageProps({
      src: coverUrl,
      alt: "",
      fill: true,
      sizes: IMG_SIZES,
    });
    preload(img.src, {
      as: "image",
      imageSrcSet: img.srcSet,
      imageSizes: img.sizes,
      fetchPriority: "high",
    });
  }
  // Buurpagina's vooraf laden, anders is het blad onder de omslag leeg.
  const currentUrl = unit?.image?.url;
  const neighbourUrls = units
    ? [units[index + 1], units[index - 1]]
        .map((u) => u?.image?.url)
        .filter(
          (url, i, all): url is string =>
            typeof url === "string" &&
            url !== currentUrl &&
            all.indexOf(url) === i,
        )
    : [];

  const canListen = !!onListenClick && (!readOnly || hasAudio);

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (pointer.current = null)}
      style={{
        position: "relative",
        width: "100%",
        height: "100svh",
        overflow: "hidden",
        background: c.stage,
        color: c.ink,
        fontFamily: V2.body,
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "pan-y pinch-zoom",
        overscrollBehavior: "none",
        ...paletteVars(c),
      }}
    >
      <style>{`@keyframes ovrIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      {units && layout && unit && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: reducedMotion ? "none" : "ovrIn .25s ease both",
          }}
        >
          {flow ? (
            <ReaderFlow
              units={units}
              layout={layout}
              c={c}
              childName={childName}
              readOnly={readOnly}
              fontPx={fontPxFor(layout, 0)}
              imageHeight={Math.round(layout.height * layout.maxImageShare)}
              wordHighlight={wordHighlight}
              reducedMotion={reducedMotion}
              initialIndex={index}
              onIndexChange={onFlowIndex}
              onUserScroll={onFlowScroll}
              controlRef={flowControl}
            />
          ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              perspective: 1600,
            }}
          >
            <ReaderPage
              unit={unit}
              layout={layout}
              c={c}
              childName={childName}
              roman={toRoman(index + 1)}
              activeWord={activeWord}
              reducedMotion={reducedMotion}
              readOnly={readOnly}
              eager
              imageShare={imageShare}
            />

            {flip && (
              <motion.div
                key={flip.id}
                initial={reducedMotion ? { opacity: 1 } : { rotateY: 0 }}
                animate={
                  reducedMotion
                    ? { opacity: 0 }
                    : { rotateY: flip.dir > 0 ? -180 : 180 }
                }
                transition={
                  reducedMotion
                    ? { duration: 0.3, ease: "easeOut" }
                    : { duration: FLIP_SECONDS, ease: FLIP_EASE }
                }
                onAnimationComplete={() => endFlip(flip.id)}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 3,
                  // De uitgaande pagina draait weg rond de rugzijde.
                  transformOrigin:
                    flip.dir > 0 ? "left center" : "right center",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  willChange: "transform",
                  boxShadow: "0 0 40px rgba(20,20,46,0.35)",
                  pointerEvents: "none",
                }}
              >
                <ReaderPage
                  unit={flip.unit}
                  layout={layout}
                  c={c}
                  childName={childName}
                  roman={toRoman(flip.index + 1)}
                  activeWord={null}
                  reducedMotion={reducedMotion}
                  readOnly={readOnly}
                  eager
                  imageShare={imageShare}
                />
                {!reducedMotion && (
                  <motion.div
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.9 }}
                    transition={{ duration: FLIP_SECONDS, ease: FLIP_EASE }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      background: `linear-gradient(to ${
                        flip.dir > 0 ? "right" : "left"
                      }, rgba(20,20,46,0.55), rgba(20,20,46,0.05))`,
                    }}
                  />
                )}
              </motion.div>
            )}
          </div>
          )}

          <div
            aria-hidden
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              opacity: 0,
              pointerEvents: "none",
            }}
          >
            {neighbourUrls.map((url) => (
              <Image
                key={url}
                src={url}
                alt=""
                fill
                sizes={layout.orientation === "landscape" ? "60vw" : "100vw"}
                loading="eager"
              />
            ))}
          </div>

          <ReaderTopBar
            layout={layout}
            c={c}
            visible={chromeVisible}
            title={storyTitle}
            readOnly={readOnly}
            night={night}
            onToggleNight={() => {
              bump();
              setNightOverride(!night);
            }}
            onListen={
              canListen
                ? () => {
                    bump();
                    onListenClick?.();
                  }
                : undefined
            }
            listening={listenOpen}
            onShare={() => {
              bump();
              if (onShareClick) onShareClick();
              else void sharePage();
            }}
            isShared={isShared}
            onCover={() => {
              bump();
              navigate(0);
            }}
            onMenu={readOnly ? undefined : () => setMenuOpen(true)}
            menuOpen={menuOpen}
          />

          <ReaderBottomBar
            layout={layout}
            c={c}
            visible={chromeVisible}
            index={index}
            total={total}
            autoNote={autoNote}
            flipping={flip !== null}
            flow={flow}
            showCta={readOnly}
            onPrev={() => navigate(index - 1)}
            onNext={() => navigate(index + 1)}
            onGoTo={navigate}
            onCover={() => navigate(0)}
            listenSlotRef={slotRef}
            listening={pillOpen}
          />

          {menuOpen && (
            <ReaderMenu
              layout={layout}
              c={c}
              onClose={closeMenu}
              storyId={storyId}
              childId={childId}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              onReact={onReactClick}
              hasFeedback={hasFeedback}
              onToggleFullscreen={canFullscreen ? toggleFullscreen : undefined}
              isFullscreen={isFullscreen}
            />
          )}

          {toast && <ReaderToast text={toast} />}
        </div>
      )}
    </div>
  );
}
