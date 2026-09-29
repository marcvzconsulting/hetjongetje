import {
  LANDSCAPE_SIZES,
  PORTRAIT_SIZES,
  type DisplayUnit,
} from "@/lib/story/reader-units";

/**
 * Maatvoering van de lezer. Eén bron voor zowel de weergave als het
 * meten van de tekst, zodat die twee nooit uit elkaar lopen.
 *
 * De lay-out volgt de oriëntatie van de lezer, niet de breedte:
 * staand = illustratie boven en tekst eronder, liggend = naast elkaar.
 */

export type Orientation = "portrait" | "landscape";
export type Device = "phone" | "tablet" | "desktop";

export type ReaderLayout = {
  width: number;
  height: number;
  orientation: Orientation;
  device: Device;
  /** Vermenigvuldiger voor alle tekst (tablet en desktop lezen groter). */
  scale: number;
  /** Basisgroottes in px vóór de schaal, groot → klein. */
  sizes: readonly number[];
  listening: boolean;

  // Bediening
  topPad: string;
  bottomPad: string;
  navSize: number;
  bottomGap: number;
  /** Te smal voor titel + tekstknoppen in de bovenbalk. */
  narrow: boolean;

  // Staand
  cardMarginX: number;
  cardMaxWidth: number;
  maxImageShare: number;
  minImageShare: number;

  // Liggend: marges van de tekstkolom
  colPadTop: number;
  colPadBottom: number;
  colPadOuter: number;
  colPadInner: number;
};

export const CARD_PAD_TOP = 22;
export const CARD_PAD_X = 22;
export const CARD_PAD_BOTTOM = 18;
/** Regel met het paginanummer onder de tekst (marge + regelhoogte). */
export const CARD_FOOTER = 30;
/** Minimale lucht tussen illustratie en tekstkaart. */
export const CARD_TOP_GAP = 10;
export const TEXT_MAX_EM = 34;
/**
 * Aandeel van de hoogte voor de illustratie (staand), van groot naar
 * klein. 47 % is de maat uit het ontwerp; krimpen mag tot ruim een derde,
 * daaronder blijft er van een liggende illustratie te weinig over.
 */
export const IMAGE_SHARES = [0.47, 0.44, 0.41, 0.38, 0.36, 0.34] as const;
export const LINE_HEIGHT_PORTRAIT = 1.55;
export const LINE_HEIGHT_LANDSCAPE = 1.6;

/** Ruimte onder de kaart voor de bediening; meer als het voorleespaneel
 *  open is of als de laatste pagina extra knoppen toont. */
const INSET = 118;
const INSET_LISTENING = 58;
const INSET_ENDING = 48;
const INSET_ENDING_WRAP = 46;

const SAFE_TOP = "max(10px, calc(env(safe-area-inset-top, 0px) + 8px))";
const SAFE_TOP_LOW = "max(8px, calc(env(safe-area-inset-top, 0px) + 6px))";
const safeBottom = (px: number) =>
  `max(${px}px, calc(env(safe-area-inset-bottom, 0px) + 10px))`;

export function computeLayout(
  width: number,
  height: number,
  listening: boolean,
): ReaderLayout {
  const orientation: Orientation = width >= height ? "landscape" : "portrait";
  const shortSide = Math.min(width, height);
  const device: Device =
    shortSide < 600
      ? "phone"
      : orientation === "landscape" && width >= 1240
        ? "desktop"
        : "tablet";

  const landscape = orientation === "landscape";
  const phone = device === "phone";
  // Op een groot beeldscherm is 1,5× nog klein ten opzichte van het
  // beeld; daar groeit de tekst verder mee.
  const largeDesktop = device === "desktop" && width >= 1600 && height >= 950;
  const scale = phone
    ? 1
    : landscape
      ? device === "desktop"
        ? largeDesktop
          ? 1.8
          : 1.5
        : 1.45
      : 1.35;

  return {
    width,
    height,
    orientation,
    device,
    scale,
    sizes: landscape ? LANDSCAPE_SIZES : PORTRAIT_SIZES,
    listening,

    topPad: phone
      ? landscape
        ? `${SAFE_TOP_LOW} 24px 6px`
        : `${SAFE_TOP} 14px 8px`
      : `${SAFE_TOP} 28px 10px`,
    bottomPad: phone
      ? landscape
        ? `4px 16px ${safeBottom(8)}`
        : `10px 16px ${safeBottom(22)}`
      : `10px 16px ${safeBottom(26)}`,
    navSize: phone && landscape ? 32 : 44,
    bottomGap: phone && landscape ? 6 : 10,
    narrow: width < 520,

    cardMarginX: 18,
    cardMaxWidth: 760,
    maxImageShare: IMAGE_SHARES[0],
    minImageShare: IMAGE_SHARES[IMAGE_SHARES.length - 1],

    colPadTop: phone ? 56 : 72,
    colPadBottom: (phone ? 62 : 104) + (listening ? INSET_LISTENING : 0),
    colPadOuter: 30,
    colPadInner: 26,
  };
}

/** Ruimte onder de tekstkaart (staand) voor de bediening. */
export function insetFor(
  layout: ReaderLayout,
  kind: DisplayUnit["kind"],
  showCta: boolean,
): number {
  let inset = INSET + (layout.listening ? INSET_LISTENING : 0);
  if (kind === "ending") {
    inset += INSET_ENDING;
    // Twee knoppen passen op een smal scherm niet naast elkaar.
    if (showCta && layout.width < 380) inset += INSET_ENDING_WRAP;
  }
  return inset;
}

export function fontPxFor(layout: ReaderLayout, step: number): number {
  const base = layout.sizes[Math.min(step, layout.sizes.length - 1)];
  return Math.round(base * layout.scale * 10) / 10;
}

/** Schaal voor kaft- en eindtypografie: groeit mee, maar gematigd. */
export function px(layout: ReaderLayout, value: number): number {
  return Math.round(value * layout.scale * 10) / 10;
}

export type TextBox = { width: number; height: number };

/**
 * De ruimte waar de tekst van een verhaalpagina in moet passen.
 * `imageShare` telt alleen in de staande lay-out.
 */
export function textBox(
  layout: ReaderLayout,
  fontPx: number,
  imageShare: number,
): TextBox {
  if (layout.orientation === "landscape") {
    const colWidth = layout.width / 2;
    return {
      width: Math.min(
        colWidth - layout.colPadOuter - layout.colPadInner,
        TEXT_MAX_EM * fontPx,
      ),
      height: layout.height - layout.colPadTop - layout.colPadBottom,
    };
  }
  const cardWidth = Math.min(
    layout.width - 2 * layout.cardMarginX,
    layout.cardMaxWidth,
  );
  return {
    width: cardWidth - 2 * CARD_PAD_X,
    height:
      layout.height * (1 - imageShare) - portraitOverhead(layout, "text"),
  };
}

/** Alles in de onderste helft (staand) dat geen tekst is. */
export function portraitOverhead(
  layout: ReaderLayout,
  kind: DisplayUnit["kind"],
): number {
  return (
    insetFor(layout, kind, false) +
    CARD_TOP_GAP +
    CARD_PAD_TOP +
    CARD_PAD_BOTTOM +
    CARD_FOOTER
  );
}
