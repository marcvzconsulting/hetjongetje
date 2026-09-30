"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
import { wavyEdge } from "./edge";
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

/** Eén blok met een vastgezette illustratie en één of meer pagina's. */
type Block = { image: DisplayUnit; parts: { unit: DisplayUnit; index: number }[] };

/**
 * De kaft gebruikt de illustratie van pagina 1. Dezelfde illustratie twee
 * keer achter elkaar oogt vreemd, dus kaft en pagina 1 delen één blok:
 * illustratie, titel, en direct daaronder de tekst.
 */
function buildBlocks(units: DisplayUnit[]): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const next = units[i + 1];
    if (
      unit.kind === "cover" &&
      next?.kind === "text" &&
      next.image?.url === unit.image?.url
    ) {
      blocks.push({
        image: unit,
        parts: [
          { unit, index: i },
          { unit: next, index: i + 1 },
        ],
      });
      i += 1;
      continue;
    }
    blocks.push({ image: unit, parts: [{ unit, index: i }] });
  }
  return blocks;
}

/** Waar een pagina begint: het element, en of het onder een illustratie
 *  van een eerdere pagina in hetzelfde blok staat. */
type Anchor = { el: HTMLElement; followsImage: boolean };

/**
 * Doorlopend scrollen (staande telefoon): elk blok heeft de illustratie
 * bovenaan vastgezet (`position: sticky`) en de tekst eronder. De tekst
 * schuift onder de illustratie door; is de tekst op, dan duwt het
 * volgende blok de illustratie omhoog en schuift z'n eigen illustratie
 * erin.
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
  const blocks = useMemo(() => buildBlocks(units), [units]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const anchorRefs = useRef<(Anchor | null)[]>([]);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const currentRef = useRef(initialIndex);
  /** Doel van een gestuurde scroll (knop, voorlezen): tot dat bereikt is
   *  telt het scrollen niet als "de lezer scrolt zelf". */
  const target = useRef<number | null>(null);
  const targetGuard = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserTop = useRef(0);
  const frame = useRef(0);

  /** Scrollpositie waarop pagina `index` bovenaan staat: het blok zelf,
   *  of (voor een pagina die de illustratie deelt) het punt waarop de
   *  tekst precies onder de illustratie zit. */
  const startOf = useCallback(
    (index: number): number | null => {
      const container = containerRef.current;
      const anchor = anchorRefs.current[index];
      if (!container || !anchor) return null;
      const top =
        anchor.el.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;
      return anchor.followsImage ? top - imageHeight : top;
    },
    [imageHeight],
  );

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

  const scrollToIndex = useCallback(
    (index: number, animate: boolean) => {
      const top = startOf(index);
      if (top !== null) glideTo(top, animate);
    },
    [startOf, glideTo],
  );

  useEffect(() => {
    controlRef.current = { scrollTo: scrollToIndex };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef, scrollToIndex]);

  // Herstelde leespositie: direct naar die pagina, zonder animatie.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const top = startOf(initialIndex);
    if (container && top !== null) container.scrollTop = top;
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

      // De pagina die bovenaan staat: de laatste die tot boven het scherm
      // is gescrold. Een blok telt zodra het meer dan half in beeld
      // schuift; een pagina onder een gedeelde illustratie zodra haar
      // tekst de illustratie raakt.
      let current = 0;
      anchorRefs.current.forEach((anchor, i) => {
        if (!anchor) return;
        const start = startOf(i);
        if (start === null) return;
        // Kleine marge: scrollTop is een geheel getal, de positie niet.
        const lead = anchor.followsImage ? 1 : imageHeight / 2;
        if (start <= top + lead) current = i;
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
  const lastIndex = units.length - 1;

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
      {blocks.map((block, b) => (
        <section
          key={b}
          ref={(el) => {
            // Het blok zelf markeert het begin van z'n eerste pagina.
            const first = block.parts[0].index;
            anchorRefs.current[first] = el ? { el, followsImage: false } : null;
          }}
          aria-label={
            block.image.kind === "cover"
              ? "Kaft"
              : block.image.kind === "ending"
                ? "Einde"
                : `Pagina ${block.image.storyPage}`
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
              ...wavyEdge("bottom"),
            }}
          >
            <Illustration
              unit={block.image}
              layout={layout}
              c={c}
              childName={childName}
              roman=""
              activeWord={null}
              reducedMotion={reducedMotion}
              readOnly={readOnly}
              eager={b <= 1}
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

          {block.parts.map(({ unit, index }, p) => {
            const isLast = index === lastIndex;
            const lastInBlock = p === block.parts.length - 1;
            const activeWord =
              wordHighlight !== null &&
              unit.kind === "text" &&
              unit.pageNumber !== null &&
              wordHighlight.pageNumber === unit.pageNumber
                ? wordHighlight.wordIndex
                : null;
            return (
              <div
                key={index}
                ref={(el) => {
                  if (p === 0) return; // het blok zelf is het anker
                  anchorRefs.current[index] = el
                    ? { el, followsImage: true }
                    : null;
                }}
                style={{
                  position: "relative",
                  zIndex: 0,
                  boxSizing: "border-box",
                  padding: `${p === 0 ? 18 : 28}px ${padX}px ${
                    !lastInBlock
                      ? 0
                      : isLast
                        ? insetFor(layout, "ending", readOnly)
                        : 44
                  }px`,
                  // Kaft en einde vullen het scherm; de tekst neemt de
                  // ruimte die hij nodig heeft.
                  minHeight:
                    unit.kind === "ending"
                      ? layout.height - imageHeight
                      : undefined,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent:
                    unit.kind === "ending" ? "center" : "flex-start",
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
                    roman={toRoman(index + 1)}
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
            );
          })}
        </section>
      ))}
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
