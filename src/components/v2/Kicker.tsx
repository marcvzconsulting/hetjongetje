import type { ReactNode } from "react";
import { V2 } from "./tokens";

type Props = { children: ReactNode; color?: string };

/**
 * Kleine uppercase label boven secties — editorial meta / kicker.
 * Staat in mono/Inter met grote letterspacing.
 */
export function Kicker({ children, color }: Props) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: color ?? V2.inkMute,
      }}
    >
      {children}
    </span>
  );
}

export function Rule({ color }: { color?: string }) {
  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px solid ${color ?? V2.paperShade}`,
        margin: 0,
      }}
    />
  );
}
