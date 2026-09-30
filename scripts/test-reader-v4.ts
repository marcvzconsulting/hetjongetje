/**
 * Controles voor de pure logica van de lezer (BookViewerV4):
 * nachtvenster, pagina-eenheden en het opsplitsen van lange teksten.
 *
 * Usage: npx tsx scripts/test-reader-v4.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_READER_SETTINGS,
  amsterdamMinutes,
  formatMinutes,
  inNightWindow,
  normalizeReaderSettings,
  resolveNight,
} from "../src/lib/reader/night";
import {
  buildBaseUnits,
  expandUnits,
  findUnitIndex,
  layoutSplit,
  layoutSplitAdaptive,
  sizeStepForLength,
  toRoman,
  type FitsFn,
  type TextLayout,
} from "../src/lib/story/reader-units";
import { storyToSpreads } from "../src/lib/story/storyToSpreads";
import { spreadsToPageNumbers } from "../src/lib/story/spread-audio";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}`);
    throw err;
  }
}

// ── Nachtvenster ───────────────────────────────────────────────

check("tijdvak over middernacht", () => {
  assert.equal(inNightWindow(20 * 60, 1200, 420), true);
  assert.equal(inNightWindow(23 * 60 + 59, 1200, 420), true);
  assert.equal(inNightWindow(0, 1200, 420), true);
  assert.equal(inNightWindow(6 * 60 + 59, 1200, 420), true);
  assert.equal(inNightWindow(7 * 60, 1200, 420), false);
  assert.equal(inNightWindow(19 * 60 + 59, 1200, 420), false);
  assert.equal(inNightWindow(12 * 60, 1200, 420), false);
});

check("tijdvak binnen één dag", () => {
  assert.equal(inNightWindow(600, 540, 660), true);
  assert.equal(inNightWindow(660, 540, 660), false);
  assert.equal(inNightWindow(539, 540, 660), false);
});

check("handmatige keuze wint van automatisch", () => {
  const s = DEFAULT_READER_SETTINGS;
  assert.equal(resolveNight(s, 21 * 60, null), true);
  assert.equal(resolveNight(s, 21 * 60, false), false);
  assert.equal(resolveNight(s, 12 * 60, true), true);
  assert.equal(resolveNight({ ...s, autoNight: false }, 21 * 60, null), false);
});

check("ongeldige instelling valt terug op default", () => {
  assert.deepEqual(normalizeReaderSettings({}), DEFAULT_READER_SETTINGS);
  assert.deepEqual(
    normalizeReaderSettings({
      autoNight: "ja",
      nightStart: 1215,
      nightEnd: 9999,
    }),
    DEFAULT_READER_SETTINGS,
  );
  assert.deepEqual(
    normalizeReaderSettings({
      autoNight: false,
      nightStart: 1110,
      nightEnd: 450,
    }),
    { autoNight: false, nightStart: 1110, nightEnd: 450 },
  );
});

check("tijd opmaken en Nederlandse tijd", () => {
  assert.equal(formatMinutes(1200), "20:00");
  assert.equal(formatMinutes(390), "06:30");
  // 1 januari 12:00 UTC = 13:00 in Nederland (wintertijd).
  assert.equal(amsterdamMinutes(new Date("2026-01-01T12:00:00Z")), 13 * 60);
  // 1 juli 12:00 UTC = 14:00 in Nederland (zomertijd).
  assert.equal(amsterdamMinutes(new Date("2026-07-01T12:00:00Z")), 14 * 60);
});

// ── Eenheden ───────────────────────────────────────────────────

const story = {
  title: "Mila en de kleine olifant",
  subtitle: null,
  setting: "onbekend",
  childName: "Mila",
  createdAt: new Date("2026-09-29T10:00:00Z"),
  pages: [
    { pageNumber: 1, text: "Eerste pagina. Met twee zinnen." },
    { pageNumber: 2, text: "Tweede pagina." },
    { pageNumber: 3, text: "Derde pagina." },
    { pageNumber: 4, text: "Vierde pagina." },
    { pageNumber: 5, text: "" },
  ].map((p) => ({
    ...p,
    illustrationUrl: `https://example.scw.cloud/p${p.pageNumber}.jpg`,
    illustrationDescription: `Illustratie ${p.pageNumber}`,
    illustrationPrompt: null,
  })),
};
const spreads = storyToSpreads(story);
const base = buildBaseUnits(spreads);

check("één eenheid per spread: kaft, pagina's, einde", () => {
  assert.equal(base.length, spreads.length);
  assert.deepEqual(
    base.map((u) => u.kind),
    ["cover", "text", "text", "text", "text", "ending"],
  );
  assert.deepEqual(
    base.map((u) => u.spreadIdx),
    [0, 1, 2, 3, 4, 5],
  );
});

check("kaft gebruikt de illustratie van pagina 1, einde z'n eigen", () => {
  assert.equal(base[0].image?.url, "https://example.scw.cloud/p1.jpg");
  assert.equal(base[5].image?.url, "https://example.scw.cloud/p5.jpg");
});

check("dropcap alleen op de eerste verhaalpagina", () => {
  const texts = base.filter((u) => u.kind === "text");
  assert.deepEqual(
    texts.map((u) => u.dropcap),
    [true, false, false, false],
  );
  assert.deepEqual(
    texts.map((u) => u.storyPage),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    texts.map((u) => u.pageNumber),
    [1, 2, 3, 4],
  );
});

check("spread-index sluit aan op de voorlees-koppeling", () => {
  const pageNumbers = spreadsToPageNumbers(spreads);
  for (const u of base) {
    if (u.kind === "text") {
      assert.equal(pageNumbers[u.spreadIdx], u.pageNumber);
    }
  }
  assert.equal(pageNumbers[0], 0);
});

check("einde zonder illustratie geeft geen beeld", () => {
  const noEnding = storyToSpreads({ ...story, pages: story.pages.slice(0, 4) });
  const units = buildBaseUnits(noEnding);
  const ending = units[units.length - 1];
  assert.equal(ending.kind, "ending");
  assert.equal(ending.image, null);
});

// ── Opsplitsen ─────────────────────────────────────────────────

/** Nep-meting: een pagina kan `capacity[step]` tekens bevatten. */
function fakeFits(words: string[], capacity: number[]): FitsFn {
  return (start, end, step) => {
    let chars = 0;
    for (let i = start; i < end; i++) chars += words[i].length + 1;
    return chars <= capacity[step];
  };
}

function makeText(sentences: number, wordsPerSentence: number): string[] {
  const out: string[] = [];
  for (let s = 0; s < sentences; s++) {
    for (let w = 0; w < wordsPerSentence; w++) {
      out.push(w === wordsPerSentence - 1 ? "woord." : "woord");
    }
  }
  return out;
}
const charsOf = (w: string[]) => w.reduce((n, x) => n + x.length + 1, 0);

check("groottetrap volgt de tekstlengte", () => {
  assert.equal(sizeStepForLength(260), 0);
  assert.equal(sizeStepForLength(261), 1);
  assert.equal(sizeStepForLength(380), 1);
  assert.equal(sizeStepForLength(500), 2);
  assert.equal(sizeStepForLength(501), 3);
});

check("korte tekst blijft één pagina op de eigen grootte", () => {
  const words = makeText(4, 8);
  const r = layoutSplit(words, charsOf(words), fakeFits(words, [400, 450, 520, 600]));
  assert.equal(r.parts.length, 1);
  assert.equal(r.step, 0);
});

check("net te lange tekst krimpt eerst, splitst niet", () => {
  const words = makeText(8, 10); // ~490 tekens → trap 2
  const chars = charsOf(words);
  const r = layoutSplit(words, chars, fakeFits(words, [300, 350, 400, 600]));
  assert.equal(r.parts.length, 1);
  assert.equal(r.step, 3);
});

check("lange tekst wordt opgesplitst in aansluitende delen", () => {
  const words = makeText(24, 9); // ~1300 tekens
  const chars = charsOf(words);
  const fits = fakeFits(words, [400, 450, 520, 600]);
  const r = layoutSplit(words, chars, fits);
  assert.ok(r.parts.length >= 2, "verwacht meerdere delen");
  assert.equal(r.parts[0].start, 0);
  assert.equal(r.parts[r.parts.length - 1].end, words.length);
  for (let i = 1; i < r.parts.length; i++) {
    assert.equal(r.parts[i].start, r.parts[i - 1].end);
  }
  for (const p of r.parts) {
    assert.ok(p.end > p.start, "geen lege delen");
    assert.ok(fits(p.start, p.end, r.step), "elk deel past");
  }
});

check("delen breken op een zinseinde en zijn in balans", () => {
  const words = makeText(24, 9);
  const chars = charsOf(words);
  const r = layoutSplit(words, chars, fakeFits(words, [400, 450, 520, 600]));
  for (const p of r.parts.slice(0, -1)) {
    assert.ok(words[p.end - 1].endsWith("."), "breekt na een zin");
  }
  const sizes = r.parts.map((p) => p.end - p.start);
  const ratio = Math.min(...sizes) / Math.max(...sizes);
  assert.ok(ratio > 0.6, `delen ongelijk verdeeld: ${sizes.join("/")}`);
});

check("opgesplitste tekst krijgt de grootte van z'n deel", () => {
  // ~700 tekens: past niet op één pagina (max 600), wel in twee delen
  // van ~350 tekens → trap 1 in plaats van de kleinste trap.
  const words = makeText(13, 9);
  const chars = charsOf(words);
  const r = layoutSplit(words, chars, fakeFits(words, [400, 450, 520, 600]));
  assert.equal(r.parts.length, 2);
  assert.equal(r.step, sizeStepForLength(chars / 2));
});

check("één woord dat nooit past loopt niet vast", () => {
  const words = ["Supercalifragilistisch", "woord", "woord."];
  const r = layoutSplit(words, charsOf(words), () => false);
  assert.equal(r.parts.length, 3);
});

// Nep-meting met een illustratie die kan krimpen: bij een kleiner
// aandeel voor de illustratie past er meer tekst op de pagina.
const SHARES = [0.47, 0.44, 0.41, 0.38, 0.36, 0.34];
function fakeFitsFor(words: string[], capacityAtMax: number[]) {
  return (share: number): FitsFn =>
    fakeFits(
      words,
      capacityAtMax.map((c) => Math.round(c * (1 + (0.47 - share) * 4))),
    );
}

check("krimpen: past de tekst, dan blijft de illustratie op volle maat", () => {
  const words = makeText(4, 8);
  const r = layoutSplitAdaptive(
    words,
    charsOf(words),
    SHARES,
    fakeFitsFor(words, [400, 450, 520, 600]),
  );
  assert.deepEqual(r.parts, [{ start: 0, end: words.length }]);
  assert.equal(r.share, 0.47);
  assert.equal(r.step, 0);
});

check("krimpen: eerst de illustratie kleiner, de letter blijft", () => {
  // ~245 tekens (trap 0); op volle maat passen er 220, met een kleinere
  // illustratie wel genoeg.
  const words = makeText(5, 8);
  const chars = charsOf(words);
  const r = layoutSplitAdaptive(
    words,
    chars,
    SHARES,
    fakeFitsFor(words, [220, 250, 290, 330]),
  );
  assert.equal(r.parts.length, 1);
  assert.equal(r.step, sizeStepForLength(chars));
  assert.ok(r.share < 0.47 && r.share >= 0.34, `aandeel ${r.share}`);
});

check("krimpen: splitsen pas als krimpen en kleinere letter niet helpen", () => {
  const words = makeText(24, 9);
  const chars = charsOf(words);
  const fitsFor = fakeFitsFor(words, [400, 450, 520, 600]);
  const r = layoutSplitAdaptive(words, chars, SHARES, fitsFor);
  assert.ok(r.parts.length >= 2);
  assert.equal(r.parts[r.parts.length - 1].end, words.length);
  for (const p of r.parts) {
    assert.ok(fitsFor(r.share)(p.start, p.end, r.step), "elk deel past");
  }
  // Niet méér delen dan met de kleinste illustratie en kleinste letter.
  const fewest = layoutSplit(words, chars, fitsFor(0.34)).parts.length;
  assert.ok(r.parts.length <= fewest, `${r.parts.length} > ${fewest}`);
});

check("krimpen: bij splitsen krijgt de illustratie de ruimte terug", () => {
  // Drie delen zijn hoe dan ook nodig; dan hoeft de illustratie niet
  // op haar kleinst.
  const words = makeText(24, 9);
  const chars = charsOf(words);
  const r = layoutSplitAdaptive(
    words,
    chars,
    SHARES,
    fakeFitsFor(words, [400, 450, 520, 600]),
  );
  assert.ok(r.share > 0.34, `aandeel ${r.share}`);
});

// ── Positie ────────────────────────────────────────────────────

check("leespositie overleeft een andere opsplitsing", () => {
  const long = { ...story, pages: story.pages.map((p) => ({ ...p })) };
  long.pages[1].text = makeText(24, 9).join(" ");
  const units = buildBaseUnits(storyToSpreads(long));
  const textUnit = units[2];
  assert.equal(textUnit.kind, "text");
  const total = textUnit.kind === "text" ? textUnit.words.length : 0;

  const three: TextLayout = {
    fontPx: 14,
    parts: [
      { start: 0, end: 72 },
      { start: 72, end: 144 },
      { start: 144, end: total },
    ],
  };
  const two: TextLayout = {
    fontPx: 14,
    parts: [
      { start: 0, end: 108 },
      { start: 108, end: total },
    ],
  };
  const a = expandUnits(units, new Map([[2, three]]));
  const b = expandUnits(units, new Map([[2, two]]));
  assert.equal(a.length, units.length + 2);
  assert.equal(b.length, units.length + 1);

  // Lezer staat op deel 2 van 3 (woord 72) → in de nieuwe indeling
  // hoort woord 72 bij deel 1 van 2.
  const idx = findUnitIndex(b, { s: 2, w: 72 });
  const found = b[idx];
  assert.equal(found.kind, "text");
  if (found.kind === "text") assert.equal(found.partIndex, 0);

  assert.equal(findUnitIndex(b, null), 0);
  assert.equal(findUnitIndex(b, { s: 99, w: 0 }), 0);
  const ending = findUnitIndex(b, { s: 5, w: 0 });
  assert.equal(b[ending].kind, "ending");
});

check("Romeinse cijfers", () => {
  assert.equal(toRoman(1), "I");
  assert.equal(toRoman(4), "IV");
  assert.equal(toRoman(8), "VIII");
  assert.equal(toRoman(14), "XIV");
});

console.log(`\n${passed} controles geslaagd`);
