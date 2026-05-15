import type { MetadataRoute } from "next";

const BASE_URL = "https://www.onsverhaaltje.nl";

/**
 * Production robots.txt: allow public pages, block authenticated
 * routes and API. Sitemap link included so crawlers discover the
 * landing + content pages quickly.
 *
 * AI-crawlers krijgen een eigen regel zodat we expliciet aangeven dat ze
 * onze publieke content mogen lezen (Answer Engine Optimization). Bots
 * zonder regel vallen terug op `*`, maar veel AI-crawlers checken eerst
 * op hun eigen user-agent.
 */
const SHARED_DISALLOW = [
  "/api/",
  "/admin/",
  "/dashboard",
  "/account",
  "/profile/",
  "/generate/",
  "/story/",
  "/book/",
  "/s/",
  "/auth/",
  "/forgot-password",
  "/reset-password",
];

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: SHARED_DISALLOW,
      },
      ...AI_CRAWLERS.map((agent) => ({
        userAgent: agent,
        allow: "/",
        disallow: SHARED_DISALLOW,
      })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
