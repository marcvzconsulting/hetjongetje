import type { MetadataRoute } from "next";

/**
 * PWA manifest — primarily used by mobile browsers to render a richer
 * "Add to Home Screen" experience. Not a full PWA install yet; we keep
 * `display: browser` because the reader is meant to feel like a website,
 * not a standalone app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ons Verhaaltje",
    short_name: "Ons Verhaaltje",
    description:
      "Gepersonaliseerde voorleesverhalen voor je kind, met de naam, de knuffel en de mensen om hen heen.",
    start_url: "/",
    display: "browser",
    background_color: "#f5efe4",
    theme_color: "#1f1e3a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    lang: "nl",
  };
}
