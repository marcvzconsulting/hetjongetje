/**
 * Kleine, browserveilige helpers voor plaatjes-URL's. Bewust los van
 * scaleway.ts en display-url.ts: die trekken de S3-client mee en horen
 * niet in de browserbundel.
 */

/** Pad van de beveiligde plaatjesroute (zie app/api/img/[...key]/route.ts). */
export const IMAGE_ROUTE_PREFIX = "/api/img/";

/**
 * Is dit een URL van de beveiligde plaatjesroute? Zulke plaatjes mogen niet
 * door de beeldoptimalisatie van Next (/_next/image): die haalt het
 * bronplaatje zonder sessie op en bewaart het resultaat voor iedereen.
 */
export function isProtectedImageUrl(url: string | null | undefined): boolean {
  return !!url && url.startsWith(IMAGE_ROUTE_PREFIX);
}
