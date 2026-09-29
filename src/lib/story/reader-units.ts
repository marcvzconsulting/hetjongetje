import type { PageType, Spread } from "./spread-types";
import { splitWords } from "./word-split";

/**
 * Pagina-eenheden voor de lezer zonder boekformaat (BookViewerV4).
 *
 * Een spread uit `storyToSpreads()` wordt één eenheid: kaft, verhaalpagina
 * of einde. Past de tekst van een verhaalpagina niet op het scherm, dan
 * wordt die eenheid opgesplitst in delen die dezelfde illustratie houden.
 *
 * Alles hier is puur (geen DOM): het meten gebeurt in de viewer, die een
 * `fits`-functie aanlevert. Daardoor is de opsplitsing los te testen.
 */

export type ReaderIllustration = { url?: string; description: string };

export type CoverUnit = {
  kind: "cover";
  spreadIdx: number;
  tag: string;
  title: string;
  subtitle?: string;
  dateLabel?: string;
  image: ReaderIllustration | null;
};

export type TextUnit = {
  kind: "text";
  spreadIdx: number;
  /** Volgnummer van de verhaalpagina, vanaf 1. Bepaalt in de liggende
   *  lay-out aan welke kant de tekst staat. */
  storyPage: number;
  /** DB-paginanummer, voor audio en woord-markering. */
  pageNumber: number | null;
  /** Alle woorden van de pagina; een deel toont `words[start..end)`. */
  words: string[];
  charCount: number;
  dropcap: boolean;
  image: ReaderIllustration | null;
};

export type EndingUnit = {
  kind: "ending";
  spreadIdx: number;
  text: string;
  sign?: string;
  image: ReaderIllustration | null;
};

export type BaseUnit = CoverUnit | TextUnit | EndingUnit;

export type TextPart = { start: number; end: number };

/** Uitkomst van het meten voor één verhaalpagina. */
export type TextLayout = {
  fontPx: number;
  parts: TextPart[];
  /** Alleen bij `scroll`: de tekst past niet en de kaart scrollt. */
  scroll?: boolean;
};

export type DisplayTextUnit = TextUnit & {
  part: TextPart;
  partIndex: number;
  partCount: number;
  fontPx: number;
  scroll?: boolean;
};

export type DisplayUnit = CoverUnit | DisplayTextUnit | EndingUnit;

/** Leespositie die een andere lay-out overleeft (draaien, venster). */
export type ReaderAnchor = { s: number; w: number };

// ── Spreads → eenheden ─────────────────────────────────────────

function pagesOf(spread: Spread): PageType[] {
  return spread.fullSpread ? [spread.left] : [spread.left, spread.right];
}

function illustrationOf(spread: Spread): ReaderIllustration | null {
  for (const p of pagesOf(spread)) {
    if (p.type === "illustration") {
      return { url: p.url, description: p.description };
    }
  }
  return null;
}

export function buildBaseUnits(spreads: Spread[]): BaseUnit[] {
  const units: BaseUnit[] = [];
  let storyPage = 0;

  spreads.forEach((spread, spreadIdx) => {
    const pages = pagesOf(spread);
    const image = illustrationOf(spread);

    const title = pages.find((p) => p.type === "title");
    if (title && title.type === "title") {
      units.push({
        kind: "cover",
        spreadIdx,
        tag: title.tag,
        title: title.title,
        subtitle: title.subtitle,
        dateLabel: title.dateLabel,
        image,
      });
      return;
    }

    const ending = pages.find((p) => p.type === "ending");
    if (ending && ending.type === "ending") {
      units.push({
        kind: "ending",
        spreadIdx,
        text: ending.text,
        sign: ending.sign,
        image,
      });
      return;
    }

    const text = pages.find(
      (p) => p.type === "text" && p.content.trim().length > 0,
    );
    if (text && text.type === "text") {
      storyPage += 1;
      units.push({
        kind: "text",
        spreadIdx,
        storyPage,
        pageNumber:
          typeof text.pageNumber === "number" ? text.pageNumber : null,
        words: splitWords(text.content),
        charCount: text.content.trim().length,
        dropcap: text.layout === "dropcap",
        image,
      });
    }
  });

  return units;
}

export function expandUnits(
  base: BaseUnit[],
  layouts: Map<number, TextLayout>,
): DisplayUnit[] {
  const out: DisplayUnit[] = [];
  for (const unit of base) {
    if (unit.kind !== "text") {
      out.push(unit);
      continue;
    }
    const layout = layouts.get(unit.spreadIdx);
    const parts =
      layout && layout.parts.length > 0
        ? layout.parts
        : [{ start: 0, end: unit.words.length }];
    parts.forEach((part, partIndex) => {
      out.push({
        ...unit,
        part,
        partIndex,
        partCount: parts.length,
        fontPx: layout?.fontPx ?? 16,
        scroll: layout?.scroll,
      });
    });
  }
  return out;
}

export function anchorOf(unit: DisplayUnit): ReaderAnchor {
  return {
    s: unit.spreadIdx,
    w: unit.kind === "text" ? unit.part.start : 0,
  };
}

/** Index van de eenheid die bij een leespositie hoort (0 als onbekend). */
export function findUnitIndex(
  units: DisplayUnit[],
  anchor: ReaderAnchor | null,
): number {
  if (!anchor) return 0;
  let firstOfSpread = -1;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.spreadIdx !== anchor.s) continue;
    if (firstOfSpread === -1) firstOfSpread = i;
    if (u.kind !== "text") return i;
    if (anchor.w >= u.part.start && anchor.w < u.part.end) return i;
  }
  return firstOfSpread === -1 ? 0 : firstOfSpread;
}

// ── Lettergrootte ──────────────────────────────────────────────

/** Basisgroottes in px (vóór de schaal van tablet/desktop), groot → klein. */
export const PORTRAIT_SIZES = [17, 16, 15, 14] as const;
export const LANDSCAPE_SIZES = [15, 14, 13, 12] as const;
export const LAST_SIZE_STEP = PORTRAIT_SIZES.length - 1;

/** Trap in de groottereeks op basis van de tekstlengte in tekens. */
export function sizeStepForLength(chars: number): number {
  if (chars <= 260) return 0;
  if (chars <= 380) return 1;
  if (chars <= 500) return 2;
  return 3;
}

// ── Opsplitsen ─────────────────────────────────────────────────

/** Past `words[start..end)` op één pagina bij deze groottetrap? */
export type FitsFn = (start: number, end: number, step: number) => boolean;

const SENTENCE_END = /[.!?…]["'”’»)\]]*$/;

export function isSentenceEnd(word: string): boolean {
  return SENTENCE_END.test(word);
}

/** Grootste `end` waarvoor `words[start..end)` past; minstens één woord. */
function maxEnd(
  start: number,
  total: number,
  fitsRange: (s: number, e: number) => boolean,
): number {
  if (fitsRange(start, total)) return total;
  let lo = start + 1;
  let hi = total;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (fitsRange(start, mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Schuif een breekpunt terug naar het einde van een zin, zolang de
 * pagina daardoor niet meer dan ~45 % leger wordt.
 */
function preferSentenceBreak(
  words: string[],
  start: number,
  hardEnd: number,
): number {
  const minEnd = start + Math.ceil((hardEnd - start) * 0.55);
  for (let e = hardEnd; e >= minEnd && e > start; e--) {
    if (isSentenceEnd(words[e - 1])) return e;
  }
  return hardEnd;
}

function greedyParts(
  words: string[],
  fitsRange: (s: number, e: number) => boolean,
): TextPart[] {
  const parts: TextPart[] = [];
  const total = words.length;
  let start = 0;
  while (start < total) {
    let end = maxEnd(start, total, fitsRange);
    if (end < total) end = preferSentenceBreak(words, start, end);
    parts.push({ start, end });
    start = end;
  }
  return parts;
}

/**
 * Verdeel de tekst in `count` ongeveer even lange delen, bij voorkeur op
 * een zinseinde. Geeft null als een van de delen niet blijkt te passen.
 */
function balancedParts(
  words: string[],
  count: number,
  fitsRange: (s: number, e: number) => boolean,
): TextPart[] | null {
  const total = words.length;
  if (count < 2 || total < count) return null;

  // Cumulatieve lengte in tekens (woord + spatie) tot en met woord i-1.
  const cum: number[] = [0];
  for (const w of words) cum.push(cum[cum.length - 1] + w.length + 1);
  const totalChars = cum[total];

  const window = Math.max(3, Math.round((total / count) * 0.3));
  const breaks: number[] = [];
  let prev = 0;

  for (let j = 1; j < count; j++) {
    const target = (totalChars * j) / count;
    let ideal = prev + 1;
    for (let i = prev + 1; i < total; i++) {
      if (Math.abs(cum[i] - target) <= Math.abs(cum[ideal] - target)) {
        ideal = i;
      }
    }
    let best = ideal;
    let bestDistance = Number.POSITIVE_INFINITY;
    const from = Math.max(prev + 1, ideal - window);
    const to = Math.min(total - 1, ideal + window);
    for (let e = from; e <= to; e++) {
      if (!isSentenceEnd(words[e - 1])) continue;
      const distance = Math.abs(e - ideal);
      if (distance < bestDistance) {
        best = e;
        bestDistance = distance;
      }
    }
    if (best <= prev || best >= total) return null;
    breaks.push(best);
    prev = best;
  }

  const parts: TextPart[] = [];
  let start = 0;
  for (const end of [...breaks, total]) {
    if (!fitsRange(start, end)) return null;
    parts.push({ start, end });
    start = end;
  }
  return parts;
}

/**
 * Kies lettergrootte en delen voor één verhaalpagina.
 *
 * 1. Past de hele tekst, desnoods een trap kleiner, dan blijft het één
 *    pagina.
 * 2. Anders het kleinst mogelijke aantal delen. Elk deel krijgt de
 *    grootte die bij z'n eigen lengte hoort, zodat opgesplitste tekst
 *    niet onnodig klein blijft.
 */
export function layoutSplit(
  words: string[],
  charCount: number,
  fits: FitsFn,
): { step: number; parts: TextPart[] } {
  const total = words.length;
  if (total === 0) return { step: 0, parts: [{ start: 0, end: 0 }] };

  const baseStep = sizeStepForLength(charCount);
  for (let step = baseStep; step <= LAST_SIZE_STEP; step++) {
    if (fits(0, total, step)) {
      return { step, parts: [{ start: 0, end: total }] };
    }
  }

  const atStep = (step: number) => (s: number, e: number) =>
    fits(s, e, step);

  const smallest = greedyParts(words, atStep(LAST_SIZE_STEP));
  const count = smallest.length;
  const targetStep = sizeStepForLength(charCount / count);

  for (let step = targetStep; step <= LAST_SIZE_STEP; step++) {
    const greedy =
      step === LAST_SIZE_STEP ? smallest : greedyParts(words, atStep(step));
    if (greedy.length > count) continue;
    return {
      step,
      parts: balancedParts(words, greedy.length, atStep(step)) ?? greedy,
    };
  }
  return { step: LAST_SIZE_STEP, parts: smallest };
}

/**
 * Als `layoutSplit`, maar de illustratie mag eerst krimpen. `shares` zijn
 * de toegestane aandelen van de hoogte voor de illustratie, van groot
 * naar klein; `fitsFor(share)` meet bij dat aandeel.
 *
 * Volgorde: (1) illustratie kleiner, (2) letter een trap kleiner,
 * (3) pas dan opsplitsen. Wordt er toch gesplitst, dan krijgt de
 * illustratie het grootste aandeel waarbij het aantal delen gelijk
 * blijft: krimpen heeft dan geen zin meer.
 */
export function layoutSplitAdaptive(
  words: string[],
  charCount: number,
  shares: readonly number[],
  fitsFor: (share: number) => FitsFn,
): { step: number; share: number; parts: TextPart[] } {
  const total = words.length;
  const maxShare = shares[0];
  const minShare = shares[shares.length - 1];
  if (total === 0) {
    return { step: 0, share: maxShare, parts: [{ start: 0, end: 0 }] };
  }

  const baseStep = sizeStepForLength(charCount);
  for (let step = baseStep; step <= LAST_SIZE_STEP; step++) {
    for (const share of shares) {
      if (fitsFor(share)(0, total, step)) {
        return { step, share, parts: [{ start: 0, end: total }] };
      }
    }
  }

  const rangeFits = (share: number, step: number) => {
    const fits = fitsFor(share);
    return (s: number, e: number) => fits(s, e, step);
  };

  const smallest = greedyParts(words, rangeFits(minShare, LAST_SIZE_STEP));
  const count = smallest.length;
  const targetStep = sizeStepForLength(charCount / count);

  for (let step = targetStep; step <= LAST_SIZE_STEP; step++) {
    for (const share of shares) {
      const fitsRange = rangeFits(share, step);
      const greedy =
        share === minShare && step === LAST_SIZE_STEP
          ? smallest
          : greedyParts(words, fitsRange);
      if (greedy.length > count) continue;
      return {
        step,
        share,
        parts: balancedParts(words, greedy.length, fitsRange) ?? greedy,
      };
    }
  }
  return { step: LAST_SIZE_STEP, share: minShare, parts: smallest };
}

/**
 * Staande lay-out bij `scroll`: laat de illustratie krimpen tot de tekst
 * past. Lukt dat niet binnen de ondergrens, dan scrollt de tekstkaart.
 */
export function layoutScrollPortrait(opts: {
  /** Gemeten hoogte van de volledige tekst. */
  textHeight: number;
  /** Hoogte van de lezer. */
  rootHeight: number;
  /** Alles in de onderste helft dat geen tekst is (marges, bediening). */
  overhead: number;
  maxShare: number;
  minShare: number;
}): { imageShare: number; scroll: boolean } {
  const { textHeight, rootHeight, overhead, maxShare, minShare } = opts;
  const needed = textHeight + overhead;
  const share = 1 - needed / rootHeight;
  if (share >= maxShare) return { imageShare: maxShare, scroll: false };
  if (share >= minShare) {
    // Naar beneden afronden op hele procenten: liever iets te veel
    // ruimte voor de tekst dan een regel die net niet past.
    return { imageShare: Math.floor(share * 100) / 100, scroll: false };
  }
  return { imageShare: minShare, scroll: true };
}

// ── Overig ─────────────────────────────────────────────────────

export function toRoman(n: number): string {
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
