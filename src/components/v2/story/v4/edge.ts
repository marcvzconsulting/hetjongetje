import type { CSSProperties } from "react";

/**
 * Zachte, golvende rand aan een illustratie, als aquarel op nat papier.
 * Een SVG-masker met ruis verplaatst de rand van een rechthoek een paar
 * pixels heen en weer en vervaagt hem licht. Browsers zonder ondersteuning
 * voor maskers tonen gewoon een rechte rand.
 *
 * Alleen de gevraagde kant golft: de rechthoek steekt aan de andere kanten
 * ruim buiten het beeld.
 */
export type WavyEdge = "bottom" | "left" | "right";

const FILTER =
  "<filter id='f' x='-0.1' y='-0.1' width='1.2' height='1.2'>" +
  // Grote, trage golven met wat fijne rafel erop, zoals een aquarelrand.
  "<feTurbulence type='fractalNoise' baseFrequency='0.007 0.035' numOctaves='3' seed='4'/>" +
  "<feDisplacementMap in='SourceGraphic' scale='34' xChannelSelector='R' yChannelSelector='G'/>" +
  "<feGaussianBlur stdDeviation='1'/>" +
  "</filter>";

function svg(viewBox: string, rect: string): string {
  const markup =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}' preserveAspectRatio='none'>` +
    FILTER +
    `<rect ${rect} fill='%23fff' filter='url(%23f)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${markup}")`;
}

const MASKS: Record<WavyEdge, string> = {
  // Onderrand golft; boven en opzij steekt de rechthoek buiten beeld.
  bottom: svg("0 0 400 300", "x='-60' y='-60' width='520' height='344'"),
  // Rechterrand golft (illustratie links van de tekst).
  right: svg("0 0 300 400", "x='-60' y='-60' width='344' height='520'"),
  // Linkerrand golft (illustratie rechts van de tekst).
  left: svg("0 0 300 400", "x='16' y='-60' width='344' height='520'"),
};

export function wavyEdge(edge: WavyEdge): CSSProperties {
  const mask = MASKS[edge];
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: "100% 100%",
    WebkitMaskSize: "100% 100%",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
}
