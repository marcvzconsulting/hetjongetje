import {
  layoutScrollPortrait,
  layoutSplit,
  layoutSplitAdaptive,
  sizeStepForLength,
  type BaseUnit,
  type FitsFn,
  type TextLayout,
  type TextUnit,
} from "@/lib/story/reader-units";
import type { OverflowMode } from "@/lib/reader/version";
import {
  IMAGE_SHARES,
  LINE_HEIGHT_LANDSCAPE,
  LINE_HEIGHT_PORTRAIT,
  fontPxFor,
  portraitOverhead,
  textBox,
  type ReaderLayout,
} from "./layout";
import {
  WORD_STYLE,
  dropcapStyle,
  textBlockStyle,
  type StyleMap,
} from "./text-style";

/**
 * Meet hoe hoog een stuk tekst wordt, in een verborgen element binnen de
 * lezer. Het element krijgt dezelfde stijlen als de echte pagina.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toCss(style: StyleMap): string {
  return Object.entries(style)
    .map(
      ([key, value]) =>
        `${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`,
    )
    .join(";");
}

// Kleuren doen er voor de hoogte niet toe.
const WORD_CSS = toCss(WORD_STYLE);
const DROPCAP_CSS = toCss(dropcapStyle("transparent", "transparent"));

class TextMeasurer {
  private el: HTMLDivElement;

  constructor(host: HTMLElement) {
    this.el = document.createElement("div");
    this.el.setAttribute("aria-hidden", "true");
    Object.assign(this.el.style, {
      position: "absolute",
      left: "0",
      top: "0",
      visibility: "hidden",
      pointerEvents: "none",
      zIndex: "-1",
    });
    host.appendChild(this.el);
  }

  configure(width: number, fontPx: number, lineHeight: number) {
    Object.assign(this.el.style, textBlockStyle(fontPx, lineHeight), {
      width: `${width}px`,
    });
  }

  height(words: string[], start: number, end: number, dropcap: boolean) {
    let html = "";
    for (let i = start; i < end; i++) {
      let word = words[i];
      if (dropcap && i === start) {
        html += `<span style="${DROPCAP_CSS}">${escapeHtml(word.charAt(0))}</span>`;
        word = word.slice(1);
      }
      html += `<span style="${WORD_CSS}">${escapeHtml(word)}</span>`;
    }
    this.el.innerHTML = html;
    return this.el.getBoundingClientRect().height;
  }

  dispose() {
    this.el.remove();
  }
}

function lineHeightOf(layout: ReaderLayout): number {
  return layout.orientation === "landscape"
    ? LINE_HEIGHT_LANDSCAPE
    : LINE_HEIGHT_PORTRAIT;
}

/**
 * Meetfuncties voor één verhaalpagina. De hoogte van een stuk tekst
 * hangt af van de lettergrootte, niet van de illustratie: één keer meten
 * volstaat voor elk aandeel van de illustratie.
 */
function fitters(m: TextMeasurer, unit: TextUnit, layout: ReaderLayout) {
  const lineHeight = lineHeightOf(layout);
  const heights = new Map<string, number>();

  const heightOf = (start: number, end: number, step: number): number => {
    const key = `${start}:${end}:${step}`;
    const known = heights.get(key);
    if (known !== undefined) return known;
    const fontPx = fontPxFor(layout, step);
    // De breedte van het tekstvak hangt niet af van de illustratie.
    m.configure(
      textBox(layout, fontPx, layout.maxImageShare).width,
      fontPx,
      lineHeight,
    );
    const height = m.height(
      unit.words,
      start,
      end,
      unit.dropcap && start === 0,
    );
    heights.set(key, height);
    return height;
  };

  const fitsFor =
    (share: number): FitsFn =>
    (start, end, step) =>
      heightOf(start, end, step) <=
      textBox(layout, fontPxFor(layout, step), share).height + 0.5;

  return { heightOf, fitsFor };
}

type Fitters = ReturnType<typeof fitters>;

/** Het aandeel voor de illustratie dat déze pagina nodig heeft. */
function neededShare(
  f: Fitters,
  unit: TextUnit,
  layout: ReaderLayout,
  mode: OverflowMode,
): number {
  if (mode === "scroll") {
    const step = sizeStepForLength(unit.charCount);
    return layoutScrollPortrait({
      textHeight: f.heightOf(0, unit.words.length, step),
      rootHeight: layout.height,
      overhead: portraitOverhead(layout, "text"),
      maxShare: layout.maxImageShare,
      minShare: layout.minImageShare,
    }).imageShare;
  }
  return layoutSplitAdaptive(
    unit.words,
    unit.charCount,
    IMAGE_SHARES,
    f.fitsFor,
  ).share;
}

function pageLayout(
  f: Fitters,
  unit: TextUnit,
  layout: ReaderLayout,
  mode: OverflowMode,
  share: number,
): TextLayout {
  if (mode === "scroll") {
    const step = sizeStepForLength(unit.charCount);
    const fontPx = fontPxFor(layout, step);
    return {
      fontPx,
      parts: [{ start: 0, end: unit.words.length }],
      scroll:
        f.heightOf(0, unit.words.length, step) >
        textBox(layout, fontPx, share).height + 0.5,
    };
  }
  const { step, parts } = layoutSplit(
    unit.words,
    unit.charCount,
    f.fitsFor(share),
  );
  return { fontPx: fontPxFor(layout, step), parts };
}

export type MeasuredStory = {
  /** Lettergrootte en indeling per verhaalpagina, op spread-index. */
  layouts: Map<number, TextLayout>;
  /** Aandeel van de hoogte voor de illustratie (staand), voor het hele
   *  verhaal gelijk: een illustratie die per pagina van maat wisselt,
   *  oogt onrustig bij het bladeren. */
  imageShare: number;
};

export function measureStory(
  host: HTMLElement,
  units: BaseUnit[],
  layout: ReaderLayout,
  mode: OverflowMode,
): MeasuredStory {
  const layouts = new Map<number, TextLayout>();
  const textUnits = units.filter((u): u is TextUnit => u.kind === "text");
  const m = new TextMeasurer(host);
  try {
    const measured = textUnits.map((unit) => ({
      unit,
      f: fitters(m, unit, layout),
    }));

    // Liggend staat de illustratie naast de tekst, en bij `split-fixed`
    // houdt ze haar vaste maat: krimpen speelt dan niet.
    const canShrink =
      layout.orientation === "portrait" && mode !== "split-fixed";
    const imageShare = canShrink
      ? measured.reduce(
          (min, { unit, f }) =>
            Math.min(min, neededShare(f, unit, layout, mode)),
          layout.maxImageShare,
        )
      : layout.maxImageShare;

    for (const { unit, f } of measured) {
      layouts.set(
        unit.spreadIdx,
        pageLayout(f, unit, layout, mode, imageShare),
      );
    }
    return { layouts, imageShare };
  } finally {
    m.dispose();
  }
}
