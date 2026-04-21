import { V2 } from "./tokens";

type Props = {
  name: string;
  size?: number;
  bg?: string;
  ink?: string;
  italic?: boolean;
};

/**
 * Round avatar with first letter of name. Gebruikt display-serif zodat
 * hij in het editoriale systeem past.
 */
export function Avatar({
  name,
  size = 36,
  bg,
  ink,
  italic = true,
}: Props) {
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
