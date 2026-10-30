/**
 * Herkomst van aanmeldingen: via welk kanaal kwam een nieuwe gebruiker
 * binnen (bv. instagram / social / bio)?
 *
 * Flow: proxy.ts zet bij het eerste bezoek met UTM-tags, of vanaf een
 * externe site, de cookie `ov_src`. Bestaat die al, dan blijft hij staan
 * (eerste bron telt). Bij een aanmelding (wachtwoord of Google) slaan we
 * hem op bij de gebruiker en wissen we de cookie.
 *
 * Geen Node-imports: dit bestand draait ook in de proxy.
 */

export const SIGNUP_SOURCE_COOKIE = "ov_src";
export const SIGNUP_SOURCE_MAX_AGE_DAYS = 30;

export type SignupSource = {
  source: string;
  medium: string | null;
  campaign: string | null;
};

const OWN_HOSTS = ["onsverhaaltje.nl", "www.onsverhaaltje.nl"];

/** Terugkeer van inloggen of betalen is geen herkomst. */
const IGNORED_REFERRER_HOSTS = ["accounts.google.com", "mollie.com"];

/** Alleen kleine letters, cijfers, punt, streep en underscore; max 40. */
function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 40);
  return v || null;
}

/** "l.instagram.com" en "www.google.nl" → "instagram" en "google". */
function hostToSource(host: string): string | null {
  const parts = host.toLowerCase().replace(/^(www|l|m|lm)\./, "").split(".");
  return clean(parts.length > 1 ? parts[parts.length - 2] : parts[0]);
}

/**
 * Bron uit een binnenkomend request: UTM-tags gaan voor, anders een
 * externe referrer. Null = direct bezoek of eigen site.
 */
export function sourceFromRequest(
  url: URL,
  referer: string | null,
): SignupSource | null {
  const utmSource = clean(url.searchParams.get("utm_source"));
  if (utmSource) {
    return {
      source: utmSource,
      medium: clean(url.searchParams.get("utm_medium")),
      campaign: clean(url.searchParams.get("utm_campaign")),
    };
  }
  if (!referer) return null;
  try {
    const refHost = new URL(referer).hostname;
    if (
      OWN_HOSTS.includes(refHost) ||
      refHost.endsWith(".vercel.app") ||
      IGNORED_REFERRER_HOSTS.some(
        (h) => refHost === h || refHost.endsWith(`.${h}`),
      )
    ) {
      return null;
    }
    const source = hostToSource(refHost);
    return source ? { source, medium: "referral", campaign: null } : null;
  } catch {
    return null;
  }
}

export function encodeSignupSource(s: SignupSource): string {
  return [s.source, s.medium ?? "", s.campaign ?? ""].join("|");
}

/** Leest de cookie terug; alles wat er niet uitziet als onze waarde → null. */
export function parseSignupSource(
  value: string | null | undefined,
): SignupSource | null {
  if (!value) return null;
  const [source, medium, campaign] = value.split("|");
  const s = clean(source);
  if (!s) return null;
  return { source: s, medium: clean(medium), campaign: clean(campaign) };
}

/** Velden voor prisma.user.create; leeg object als er geen bron is. */
export function signupSourceFields(value: string | null | undefined) {
  const s = parseSignupSource(value);
  if (!s) return {};
  return {
    signupSource: s.source,
    signupMedium: s.medium,
    signupCampaign: s.campaign,
  };
}
