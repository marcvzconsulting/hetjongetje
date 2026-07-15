/**
 * Bedrijfsgegevens voor de juridische pagina's (/privacy, /voorwaarden,
 * /cookies) en imprint-blokken. Eén plek, zodat een wijziging (bv. een
 * nieuw adres) overal tegelijk doorwerkt.
 *
 * De UI toont kvk/btw/address alleen als ze gevuld zijn — een lege
 * string verbergt de regel.
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
  kvk: "77282957",
  btw: "NL003183545B28",
  address: "Heijbergstraat 7, 3055 PP Rotterdam",
};
