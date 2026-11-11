import { keyFromUrl, privateImagesEnabled } from "./scaleway";
import { IMAGE_ROUTE_PREFIX } from "./image-url";

/**
 * Maak van een opgeslagen plaatjes-URL de URL die de browser mag krijgen.
 *
 * Publieke stand: de opgeslagen URL, ongewijzigd. Privé-stand: het pad van
 * de plaatjesroute, die per verzoek controleert of de kijker het plaatje
 * mag zien. Voor een gedeeld verhaal gaat het deeltoken mee, zodat een
 * bezoeker zonder account de plaatjes van precies dat verhaal kan zien
 * zolang delen aanstaat.
 *
 * Alleen aanroepen op de server (server components, routes): de schakelaar
 * is een server-omgevingsvariabele.
 */
export function toDisplayUrl(
  url: string | null | undefined,
  opts?: { shareToken?: string | null }
): string | null {
  if (!url) return null;
  if (!privateImagesEnabled()) return url;
  const key = keyFromUrl(url);
  if (!key) return url; // geen object van ons
  const path =
    IMAGE_ROUTE_PREFIX + key.split("/").map(encodeURIComponent).join("/");
  return opts?.shareToken
    ? `${path}?s=${encodeURIComponent(opts.shareToken)}`
    : path;
}
