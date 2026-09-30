import type { CSSProperties } from "react";

/**
 * Zachte, golvende rand aan een illustratie, als aquarel op nat papier.
 * Een SVG-masker met ruis verplaatst de rand van een rechthoek heen en
 * weer en vervaagt hem licht. Browsers zonder ondersteuning voor maskers
 * tonen gewoon een rechte rand.
 *
 * Alleen de gevraagde kanten golven: aan de andere kanten steekt de
 * rechthoek ruim buiten het beeld.
 */
export type WavyEdge = "top" | "bottom" | "left" | "right";

const SIZE = 400;
/** Hoe ver een golvende rand binnen het beeld begint (in maskereenheden). */
const INSET = 14;
/** Hoe ver een rechte rand buiten het beeld ligt. */
const OVERHANG = 60;

const FILTER =
  "<filter id='f' x='-0.1' y='-0.1' width='1.2' height='1.2'>" +
  // Grote, trage golven met wat fijne rafel erop, zoals een aquarelrand.
  "<feTurbulence type='fractalNoise' baseFrequency='0.007 0.035' numOctaves='3' seed='4'/>" +
  "<feDisplacementMap in='SourceGraphic' scale='34' xChannelSelector='R' yChannelSelector='G'/>" +
  "<feGaussianBlur stdDeviation='1'/>" +
  "</filter>";

const cache = new Map<string, string>();

function maskFor(edges: WavyEdge[]): string {
  const key = [...edges].sort().join(",");
  const known = cache.get(key);
  if (known) return known;

  const has = (e: WavyEdge) => edges.includes(e);
  const x = has("left") ? INSET : -OVERHANG;
  const y = has("top") ? INSET : -OVERHANG;
  const right = has("right") ? SIZE - INSET : SIZE + OVERHANG;
  const bottom = has("bottom") ? SIZE - INSET : SIZE + OVERHANG;
  const markup =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${SIZE} ${SIZE}' preserveAspectRatio='none'>` +
    FILTER +
    `<rect x='${x}' y='${y}' width='${right - x}' height='${bottom - y}' fill='%23fff' filter='url(%23f)'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${markup}")`;
  cache.set(key, url);
  return url;
}

export function wavyEdge(...edges: WavyEdge[]): CSSProperties {
  const mask = maskFor(edges);
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
}
