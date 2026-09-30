import { V2 } from "@/components/v2/tokens";

/**
 * Dag- en nachtpalet voor de vensters die over de lezer heen komen: de
 * stemkiezer, delen en reageren. Ze staan buiten de lezer in de boom en
 * erven zijn kleuren niet; de lezer meldt zijn nachtstand en de pagina
 * kiest dit palet. De namen volgen de V2-tokens, zodat de vensters overdag
 * er precies zo uitzien als voorheen.
 */
export type DialogPalette = {
  night: boolean;
  /** Donkere laag over de pagina achter het venster. */
  scrim: string;
  shadow: string;
  /** Achtergrond van het venster. */
  paper: string;
  /** Invoervelden en gedempte knoppen. */
  paperDeep: string;
  /** Lijnen en randen. */
  paperShade: string;
  ink: string;
  inkSoft: string;
  inkMute: string;
  gold: string;
  goldSoft: string;
  goldDeep: string;
  heart: string;
};

export const DIALOG_LIGHT: DialogPalette = {
  night: false,
  scrim: "rgba(20,20,46,0.45)",
  shadow: "0 -10px 40px rgba(20,20,46,0.25)",
  paper: V2.paper,
  paperDeep: V2.paperDeep,
  paperShade: V2.paperShade,
  ink: V2.ink,
  inkSoft: V2.inkSoft,
  inkMute: V2.inkMute,
  gold: V2.gold,
  goldSoft: V2.goldSoft,
  goldDeep: V2.goldDeep,
  heart: V2.heart,
};

// Zelfde keuzes als het nachtpalet van de lezer (`v4/palette.ts`): licht
// papier als inkt, zacht goud voor bijtekst. Knoppen met inktachtergrond
// worden zo licht met donkere tekst, zoals de voorleespil.
export const DIALOG_NIGHT: DialogPalette = {
  night: true,
  scrim: "rgba(0,0,0,0.6)",
  shadow: "0 -10px 40px rgba(0,0,0,0.5)",
  paper: V2.nightSoft,
  paperDeep: "#2a2a52",
  paperShade: "rgba(245,239,228,0.16)",
  ink: V2.paper,
  inkSoft: V2.goldSoft,
  inkMute: V2.nightMute,
  gold: V2.gold,
  goldSoft: "rgba(201,169,97,0.22)",
  goldDeep: V2.gold,
  heart: "#d0665c",
};

export function dialogPalette(night: boolean): DialogPalette {
  return night ? DIALOG_NIGHT : DIALOG_LIGHT;
}
