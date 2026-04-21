/**
 * Shared spread/page types for the story reader and the storyToSpreads
 * helper. Lives in src/lib so it can be imported by both v2 reader and
 * any future renderer without a v1 dependency.
 */

export type IllustrationTheme =
  | "forest"
  | "warm"
  | "soft"
  | "dusk"
  | "night"
  | "sunset";

export type PageType =
  | {
      type: "title";
      title: string;
      subtitle?: string;
      tag: string;
      meta?: string;
    }
  | { type: "text"; content: string; layout?: "default" | "dropcap" }
  | {
      type: "illustration";
      description: string;
      url?: string;
      colorTheme?: IllustrationTheme;
    }
  | { type: "ending"; text: string; sign?: string };

export interface Spread {
  left: PageType;
  right: PageType;
  /** true = left page fills entire spread (no right-side content) */
  fullSpread?: boolean;
  pageNumbers?: [number, number];
}
