import type { MetadataRoute } from "next";

const BASE_URL = "https://www.onsverhaaltje.nl";

/**
 * Production robots.txt: allow public pages, block authenticated
 * routes and API. Sitemap link included so crawlers discover the
 * landing + content pages quickly.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard",
          "/account",
          "/profile/",
          "/generate/",
          "/story/",
          "/book/",
          "/auth/",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
