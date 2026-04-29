import { ImageResponse } from "next/og";

/**
 * Default Open Graph image used by every page that doesn't define its
 * own. Rendered server-side by Next.js's `next/og` ImageResponse so the
 * design lives in source instead of a Figma export.
 *
 * Dimensions: 1200×630, the canonical Open Graph share size. The same
 * image is reused as the Twitter card via Next.js's automatic fallback.
 *
 * Note: Satori (the renderer behind ImageResponse) only supports flex
 * layout — every element with more than one child needs `display: flex`
 * explicitly, and `inline-block` is not permitted.
 */

export const runtime = "edge";
export const alt = "Ons Verhaaltje — gepersonaliseerde verhalen voor je kind";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f5efe4";
const PAPER_DEEP = "#ebe2d1";
const PAPER_SHADE = "#e2d7c2";
const INK = "#1f1e3a";
const INK_SOFT = "#2e2d52";
const GOLD = "#c9a961";
const GOLD_DEEP = "#8a7340";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${PAPER} 0%, ${PAPER_DEEP} 100%)`,
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
          color: INK,
          position: "relative",
        }}
      >
        {/* Top mono mark — line + label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 18,
            letterSpacing: 6,
            color: GOLD_DEEP,
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          <div style={{ width: 56, height: 1, background: GOLD_DEEP }} />
          <div style={{ display: "flex" }}>Ons Verhaaltje</div>
        </div>

        {/* Hero block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 88,
              fontWeight: 300,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: INK,
              maxWidth: 980,
            }}
          >
            Een verhaaltje waarin ze zichzelf herkennen.
          </div>

          {/* Hairline divider with diamond */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginTop: 36,
            }}
          >
            <div style={{ width: 64, height: 1, background: GOLD }} />
            <div
              style={{
                width: 6,
                height: 6,
                background: GOLD,
                transform: "rotate(45deg)",
              }}
            />
            <div style={{ width: 64, height: 1, background: GOLD }} />
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 28,
              fontStyle: "italic",
              color: INK_SOFT,
              lineHeight: 1.4,
              maxWidth: 800,
            }}
          >
            Gepersonaliseerde voorleesverhalen, met de naam, de knuffel en de
            mensen om hen heen.
          </div>
        </div>

        {/* Footer URL row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginTop: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontFamily: "monospace",
              letterSpacing: 4,
              color: INK_SOFT,
              textTransform: "uppercase",
            }}
          >
            onsverhaaltje.nl
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 14,
              fontFamily: "monospace",
              letterSpacing: 4,
              color: GOLD_DEEP,
              textTransform: "uppercase",
            }}
          >
            Voor het slapengaan
          </div>
        </div>

        {/* Decorative paper-shade frame */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 32,
            right: 32,
            bottom: 32,
            left: 32,
            border: `1px solid ${PAPER_SHADE}`,
            pointerEvents: "none",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
