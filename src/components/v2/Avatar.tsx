import Image from "next/image";
import { V2 } from "./tokens";

type Props = {
  name: string;
  size?: number;
  bg?: string;
  ink?: string;
  italic?: boolean;
  /** Optionele portret-URL (bv. het goedgekeurde AI-karakterportret van
   *  een kind, `approvedPreviewUrl`). Indien gezet wordt de foto getoond
   *  in plaats van de beginletter, met een subtiele gouden ring. */
  src?: string | null;
};

/**
 * Round avatar with first letter of name. Gebruikt display-serif zodat
 * hij in het editoriale systeem past. Met `src` wordt het een
 * portret-medaillon.
 */
export function Avatar({
  name,
  size = 36,
  bg,
  ink,
  italic = true,
  src,
}: Props) {
  if (src) {
    return (
      <span
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          position: "relative",
          overflow: "hidden",
          display: "inline-block",
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${V2.paper}, 0 0 0 3.5px ${V2.goldDeep}, 0 2px 8px rgba(31,30,58,0.18)`,
        }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={`${size}px`}
          style={{ objectFit: "cover" }}
        />
      </span>
    );
  }
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg ?? V2.paperShade,
        color: ink ?? V2.ink,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: V2.display,
        fontSize: size * 0.44,
        fontStyle: italic ? "italic" : "normal",
        fontWeight: 400,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}
