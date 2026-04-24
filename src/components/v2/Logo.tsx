import { V2 } from "./tokens";

type Variant = "inline" | "mark" | "icon";

type Props = {
  color?: string;
  size?: number;
  variant?: Variant;
  showOrnament?: boolean;
  accent?: string;
};

/**
 * v2 Logo — gestapelde wordmark (richting #02).
 *   variant="inline" — horizontaal, voor nav/footer
 *   variant="mark"   — gestapeld, voor hero/covers (met optionele jaartal-regel)
 *   variant="icon"   — "ov" monogram in cirkel voor favicons / tight spots
 */
export function Logo({
  color,
  size = 22,
  variant = "inline",
  showOrnament = false,
  accent,
}: Props) {
  const c = color ?? V2.ink;
  const acc = accent ?? V2.goldDeep;

  if (variant === "icon") {
    return (
      <span
        style={{
          width: size,
          height: size,
          border: `1.2px solid ${c}`,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: V2.display,
          fontSize: size * 0.48,
          letterSpacing: -0.5,
          color: c,
        }}
      >
        <span>o</span>
        <span style={{ fontStyle: "italic", marginLeft: -size * 0.03 }}>v</span>
      </span>
    );
  }

  if (variant === "mark") {
    return (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "flex-start",
          fontFamily: V2.display,
          color: c,
          lineHeight: 0.95,
          letterSpacing: -size * 0.03,
        }}
      >
        <span style={{ fontSize: size, fontWeight: 300 }}>ons</span>
        <span style={{ fontSize: size, fontWeight: 300, fontStyle: "italic" }}>
          verhaaltje
        </span>
        {showOrnament && (
          <span
            style={{
              fontFamily: V2.mono,
              fontSize: Math.max(9, size * 0.16),
              letterSpacing: "0.28em",
              color: acc,
              marginTop: size * 0.22,
              fontWeight: 400,
            }}
          >
            SINDS 2026
          </span>
        )}
      </span>
    );
  }

  // inline default
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: size * 0.22,
        fontFamily: V2.display,
        fontSize: size,
        fontWeight: 300,
        color: c,
        letterSpacing: -0.4,
        lineHeight: 1,
      }}
    >
      <span>ons</span>
      <span style={{ fontStyle: "italic" }}>verhaaltje</span>
    </span>
  );
}
