import { ImageResponse } from "next/og";

/**
 * iOS home-screen icon. iOS ignores SVG favicons, so this rasterises
 * the brand monogram at the size Apple expects (180×180). Same OV
 * mark as the SVG favicon, kept in sync via the shared design tokens.
 */

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f1e3a",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 110,
          color: "#c9a961",
          letterSpacing: -2,
        }}
      >
        OV
      </div>
    ),
    { ...size },
  );
}
