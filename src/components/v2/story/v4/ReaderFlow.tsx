"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import { V2 } from "@/components/v2/tokens";
import { toRoman, type DisplayUnit } from "@/lib/story/reader-units";
import type { WordHighlight } from "@/components/v2/story/BookViewerV3";
import {
  CARD_PAD_X,
  LINE_HEIGHT_PORTRAIT,
  insetFor,
  type ReaderLayout,
} from "./layout";
import type { ReaderPalette } from "./palette";
import { CoverContent, EndingContent, Illustration } from "./ReaderPage";
import { WORD_STYLE, dropcapStyle, textBlockStyle } from "./text-style";

/** Bediening van buitenaf: naar een pagina scrollen. */
export type FlowControl = {
  scrollTo: (index: number, animate: boolean) => void;
};

type Props = {
  units: DisplayUnit[];
  layout: ReaderLayout;
  c: ReaderPalette;
  childName: string;
  readOnly: boolean;
  fontPx: number;
  /** Hoogte van de vastgezette illustratie. */
  imageHeight: number;
  wordHighlight: WordHighlight | null;
  reducedMotion: boolean;
  /** Pagina om mee te beginnen (herstelde leespositie). */
  initialIndex: number;
  /** De pagina waarvan de illustratie bovenaan staat is veranderd. */
  onIndexChange: (index: number) => void;
  /** De lezer scrolt zelf (niet via knoppen of voorlezen). */
  onUserScroll: () => void;
  controlRef: RefObject<FlowControl | null>;
};

/**
 * Doorlopend scrollen (staande telefoon): elke pagina is een blok met de
 * illustratie bovenaan vastgezet (`position: sticky`) en de tekst
 * eronder. De tekst schuift onder de illustratie door; is de tekst op,
 * dan duwt de volgende pagina de illustratie omhoog en schuift z'n eigen
 * illustratie erin.
 */
export function ReaderFlow({
  units,
  layout,
  c,
  childName,
  readOnly,
  fontPx,
  imageHeight,
  wordHighlight,
  reducedMotion,
  initialIndex,
  onIndexChange,
  onUserScroll,
  controlRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const currentRef = useRef(initialIndex);
  /** Doel van een gestuurde scroll (knop, voorlezen): tot dat bereikt is
   *  telt het scrollen niet als "de lezer scrolt zelf". */
  const target = useRef<number | null>(null);
  const targetGuard = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserTop = useRef(0);
  const frame = useRef(0);

  const glideTo = useCallback(
    (top: number, animate: boolean) => {
      const container = containerRef.current;
      if (!container) return;
      const max = container.scrollHeight - container.clientHeight;
      const goal = Math.max(0, Math.min(top, max));
      target.current = goal;
      lastUserTop.current = goal;
      // Vangnet: komt de scroll niet precies uit (afronding), dan niet
      // eindeloos blijven wachten.
      if (targetGuard.current) clearTimeout(targetGuard.current);
      targetGuard.current = setTimeout(() => {
        target.current = null;
      }, 3000);
      container.scrollTo({
        top: goal,
        behavior: animate && !reducedMotion ? "smooth" : "auto",
      });
    },
    [reducedMotion],
  );

  const scrollToSection = useCallback(
    (index: number, animate: boolean) => {
      const section = sectionRefs.current[index];
      if (section) glideTo(section.offsetTop, animate);
    },
    [glideTo],
  );

  useEffect(() => {
    controlRef.current = { scrollTo: scrollToSection };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef, scrollToSection]);

  // Herstelde leespositie: direct naar die pagina, zonder animatie.
  useLayoutEffect(() => {
    const section = sectionRefs.current[initialIndex];
    const container = containerRef.current;
    if (section && container) container.scrollTop = section.offsetTop;
    lastUserTop.current = container?.scrollTop ?? 0;
    // Alleen bij het opbouwen: daarna bepaalt de lezer zelf de positie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const top = container.scrollTop;

      // De pagina waarvan de illustratie bovenaan staat: de laatste die
      // (meer dan half) tot boven het scherm is gescrold.
      let current = 0;
      sectionRefs.current.forEach((section, i) => {
        if (section && section.offsetTop <= top + imageHeight / 2) current = i;
      });
      if (current !== currentRef.current) {
        currentRef.current = current;
        onIndexChange(current);
      }

      if (target.current !== null) {
        if (Math.abs(top - target.current) < 2) target.current = null;
        return;
      }
      if (Math.abs(top - lastUserTop.current) > 24) {
        lastUserTop.current = top;
        onUserScroll();
      }
    });
  }
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      if (targetGuard.current) clearTimeout(targetGuard.current);
    },
    [],
  );

  // Voorlezen: houd het voorgelezen woord in beeld, onder de illustratie.
  useEffect(() => {
    const container = containerRef.current;
    const word = activeWordRef.current;
    if (!container || !word || !wordHighlight) return;
    const box = container.getBoundingClientRect();
    const rect = word.getBoundingClientRect();
    const minTop = box.top + imageHeight + 16;
    const maxBottom = box.bottom - insetFor(layout, "text", readOnly);
    if (rect.top < minTop || rect.bottom > maxBottom) {
      glideTo(
        container.scrollTop + (rect.top - box.top) - imageHeight - box.height * 0.22,
        true,
      );
    }
  }, [wordHighlight, imageHeight, layout, readOnly, glideTo]);

  const padX = layout.cardMarginX + CARD_PAD_X;
  const last = units.length - 1;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        position: "absolute",
        inset: 0,
        overflowY: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        background: c.bg,
        color: c.ink,
        fontFamily: V2.body,
      }}
    >
      {units.map((unit, i) => {
        const isLast = i === last;
        const activeWord =
          wordHighlight !== null &&
          unit.kind === "text" &&
          unit.pageNumber !== null &&
          wordHighlight.pageNumber === unit.pageNumber
            ? wordHighlight.wordIndex
            : null;

        return (
          <section
            key={i}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            aria-label={
              unit.kind === "cover"
                ? "Kaft"
                : unit.kind === "ending"
                  ? "Einde"
                  : `Pagina ${unit.storyPage}`
            }
            style={{ position: "relative" }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1,
                height: imageHeight,
                overflow: "hidden",
              }}
            >
              <Illustration
                unit={unit}
                layout={layout}
                c={c}
                childName={childName}
                roman=""
                activeWord={null}
                reducedMotion={reducedMotion}
                readOnly={readOnly}
                eager={i <= 1}
                imageShare={layout.maxImageShare}
                sizes="100vw"
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: c.stackGrad,
                }}
              />
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 0,
                boxSizing: "border-box",
                padding: `18px ${padX}px ${
                  isLast ? insetFor(layout, "ending", readOnly) : 44
                }px`,
                // Kaft en einde vullen het scherm; de tekst daartussen
                // neemt de ruimte die hij nodig heeft.
                minHeight:
                  unit.kind === "text" ? undefined : layout.height - imageHeight,
                display: "flex",
                flexDirection: "column",
                justifyContent: unit.kind === "ending" ? "center" : "flex-start",
              }}
            >
              {unit.kind === "cover" && (
                <CoverContent unit={unit} layout={layout} c={c} />
              )}
              {unit.kind === "text" && (
                <FlowText
                  unit={unit}
                  c={c}
                  fontPx={fontPx}
                  activeWord={activeWord}
                  activeRef={activeWordRef}
                  reducedMotion={reducedMotion}
                  roman={toRoman(i + 1)}
                />
              )}
              {unit.kind === "ending" && (
                <div style={{ textAlign: "center" }}>
                  <EndingContent
                    unit={unit}
                    layout={layout}
                    c={c}
                    childName={childName}
                  />
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FlowText({
  unit,
  c,
  fontPx,
  activeWord,
  activeRef,
  reducedMotion,
  roman,
}: {
  unit: Extract<DisplayUnit, { kind: "text" }>;
  c: ReaderPalette;
  fontPx: number;
  activeWord: number | null;
  activeRef: RefObject<HTMLSpanElement | null>;
  reducedMotion: boolean;
  roman: string;
}) {
  const words = unit.words;
  return (
    <>
      <div
        style={{
          ...(textBlockStyle(fontPx, LINE_HEIGHT_PORTRAIT) as CSSProperties),
          color: c.ink,
        }}
      >
        <span className="sr-only">{words.join(" ")}</span>
        <span aria-hidden>
          {unit.dropcap && (
            <span style={dropcapStyle(c.goldDeep, c.gold) as CSSProperties}>
              {words[0]?.charAt(0)}
            </span>
          )}
          {words.map((word, i) => {
            const active = i === activeWord;
            return (
              <span
                key={i}
                ref={active ? activeRef : undefined}
                style={{
                  ...(WORD_STYLE as CSSProperties),
                  background: active ? c.word : "transparent",
                  transition: reducedMotion ? "none" : "background .12s",
                }}
              >
                {unit.dropcap && i === 0 ? word.slice(1) : word}
              </span>
            );
          })}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <span
          style={{
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: 12,
            lineHeight: "18px",
            color: c.mute,
          }}
        >
          {roman}
        </span>
      </div>
    </>
  );
}
