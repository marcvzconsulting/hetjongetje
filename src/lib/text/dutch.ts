/**
 * Nederlandse taalhulpjes voor teksten over het kind.
 *
 * Aanleiding (sept 2026): de wizard toonde "Willem heeft vandaag voor het
 * eerst haar naam zelf geschreven". Gebruik deze helpers overal waar een
 * tekst een voornaamwoord of bezitsvorm bij de naam van het kind zet, in
 * plaats van hij/zij of zijn/haar hard te coderen.
 *
 * gender komt uit ChildProfile.gender: "boy" | "girl" | iets anders. Bij
 * "anders" zijn er geen voornaamwoorden: formuleer dan met de naam.
 */

export type DutchPronouns = {
  /** hij / zij */
  subject: string;
  /** hem / haar */
  object: string;
  /** zijn / haar */
  possessive: string;
};

export function dutchPronouns(gender: string | null | undefined): DutchPronouns | null {
  if (gender === "boy") return { subject: "hij", object: "hem", possessive: "zijn" };
  if (gender === "girl") return { subject: "zij", object: "haar", possessive: "haar" };
  return null;
}

/** "jongetje" / "meisje" / "kind" */
export function dutchChildNoun(gender: string | null | undefined): string {
  if (gender === "boy") return "jongetje";
  if (gender === "girl") return "meisje";
  return "kind";
}

/** "vriend" / "vriendin" / "vriendje" */
export function dutchFriendNoun(gender: string | null | undefined): string {
  if (gender === "boy") return "vriend";
  if (gender === "girl") return "vriendin";
  return "vriendje";
}

/**
 * Bezitsvorm van een naam volgens de Taalunie: "Willems", "Annes", maar
 * "Anna's", "Timo's", "Lucy's" (apostrof na een lange klinker a/i/o/u/y) en
 * "Thomas'", "Max'" (alleen apostrof na een sisklank s/x/z/sh/ch).
 */
export function dutchGenitive(name: string): string {
  const n = name.trim();
  if (!n) return n;
  const lower = n.toLowerCase();
  if (/(s|x|z|sh|ch)$/.test(lower)) return `${n}'`;
  if (/[aiouy]$/.test(lower) && !/(ie|ee|oe)$/.test(lower)) return `${n}'s`;
  return `${n}s`;
}
