import type { CSSProperties } from "react";
import { V2 } from "@/components/v2/tokens";

/**
 * Dag- en nachtpalet van de lezer. De nachtmodus is alleen een
 * palet-omschakeling: de lay-out blijft gelijk.
 */
export type ReaderPalette = {
  night: boolean;
  /** Achtergrond achter de pagina's (zichtbaar tijdens het omslaan). */
  stage: string;
  /** Achtergrond van een pagina. */
  bg: string;
  card: string;
  ink: string;
  soft: string;
  mute: string;
  tag: string;
  gold: string;
  goldDeep: string;
  line: string;
  /** Papierkleur van knoppen in de bediening. */
  paper: string;
  chromeBg: string;
  bottomBg: string;
  /** Markering van het voorgelezen woord. */
  word: string;
  dot: string;
  grain: number;
  imgFilter: string;
  /** Overgang van illustratie naar papier in de staande lay-out. */
  stackGrad: string;
  themeColor: string;
};

// De tekst staat direct op het papier, zonder eigen kaartkleur of korrel:
// tekst en illustratie vormen dan één geheel (keuze van Marc, 30 sep).
// De bovenbalk is doorzichtig met een zachte overgang, zodat de
// illustratie erdoorheen zichtbaar blijft.
export const READER_LIGHT: ReaderPalette = {
  night: false,
  stage: V2.paperDeep,
  bg: V2.paper,
  card: "transparent",
  ink: V2.ink,
  soft: V2.inkSoft,
  mute: V2.inkMute,
  tag: V2.inkMute,
  gold: V2.gold,
  goldDeep: V2.goldDeep,
  line: V2.paperShade,
  paper: V2.paper,
  chromeBg:
    "linear-gradient(to bottom, rgba(245,239,228,0.7) 0%, rgba(245,239,228,0.25) 60%, rgba(245,239,228,0) 100%)",
  bottomBg:
    "linear-gradient(to top, rgba(235,226,209,0.96) 0%, rgba(235,226,209,0.55) 70%, transparent 100%)",
  word: "rgba(201,169,97,0.38)",
  dot: "rgba(31,30,58,0.22)",
  grain: 0,
  imgFilter: "none",
  stackGrad:
    "linear-gradient(to bottom, transparent 82%, rgba(245,239,228,0.45) 100%)",
  themeColor: V2.paper,
};

export const READER_NIGHT: ReaderPalette = {
  night: true,
  stage: V2.night,
  bg: V2.night,
  card: "transparent",
  ink: V2.paper,
  soft: V2.goldSoft,
  mute: V2.nightMute,
  tag: V2.gold,
  gold: V2.gold,
  goldDeep: V2.gold,
  line: "rgba(245,239,228,0.14)",
  paper: V2.nightSoft,
  // 's Nachts is de illustratie lichter dan de balk: iets meer dekking
  // bovenin, anders zijn titel en knoppen niet te lezen.
  chromeBg:
    "linear-gradient(to bottom, rgba(20,20,46,0.88) 0%, rgba(20,20,46,0.4) 60%, rgba(20,20,46,0) 100%)",
  bottomBg:
    "linear-gradient(to top, rgba(20,20,46,0.95) 0%, rgba(20,20,46,0.6) 70%, transparent 100%)",
  word: "rgba(201,169,97,0.32)",
  dot: "rgba(245,239,228,0.3)",
  grain: 0,
  imgFilter: "brightness(0.86) saturate(0.9)",
  stackGrad:
    "linear-gradient(to bottom, transparent 72%, rgba(20,20,46,0.7) 100%)",
  themeColor: V2.night,
};

/**
 * Het palet als CSS-variabelen op de lezer. Onderdelen die van buiten in
 * de lezer worden gezet (de voorleespil) kleuren zo vanzelf mee.
 */
export function paletteVars(c: ReaderPalette): CSSProperties {
  return {
    "--ovr-ink": c.ink,
    "--ovr-paper": c.paper,
    "--ovr-mute": c.mute,
    "--ovr-gold": c.gold,
    "--ovr-line": c.line,
    // Accent óp de voorleespil, die de inktkleur als achtergrond heeft:
    // overdag donker (licht goud leest goed), 's nachts licht.
    "--ovr-pill-accent": c.night ? V2.goldDeep : V2.gold,
  } as CSSProperties;
}

// Papierkorrel als inline SVG (zelfde textuur als de vorige lezer).
export const PAPER_NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.10  0 0 0 0 0.18  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>")`;
