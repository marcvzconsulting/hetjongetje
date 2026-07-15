/**
 * Bedrijfsgegevens voor de juridische pagina's (/privacy, /voorwaarden,
 * /cookies) en imprint-blokken. Eén plek, zodat een wijziging (bv. een
 * nieuw adres) overal tegelijk doorwerkt.
 *
 * TODO(Marc): `kvk`, `btw` en `address` invullen zodra ze bekend zijn.
 * De UI toont die regels alleen als ze gevuld zijn — een lege string
 * verbergt de regel, dus de site blijft netjes zolang ze leeg zijn.
 */
export type CompanyInfo = {
  name: string;
  owner: string;
  email: string;
  kvk: string;
  btw: string;
  address: string;
};

export const COMPANY: CompanyInfo = {
  name: "MVZ Consulting",
  owner: "Marc van Zetten",
  email: "info@onsverhaaltje.nl",
  kvk: "",
  btw: "",
  address: "",
};
