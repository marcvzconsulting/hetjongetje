import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { V2 } from "./tokens";

type Kind = "primary" | "on-dark" | "ghost" | "ghost-dark";
type Size = "sm" | "md" | "lg";

type Props = {
  children: ReactNode;
  kind?: Kind;
  size?: Size;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  style?: CSSProperties;
  className?: string;
};

/**
 * v2 editorial button — plat, geen shadow. Gebruikt Inter UI font.
 *   primary    — inkt-op-crème, standaard CTA
 *   on-dark    — crème-op-nacht, voor donkere secties
 *   ghost      — alleen 1px inkt-border op crème
 *   ghost-dark — alleen 1px crème-border op nacht
 */
export function EBtn({
  children,
  kind = "primary",
  size = "md",
  href,
  onClick,
  type = "button",
  style,
  className,
}: Props) {
  const padH = size === "sm" ? 18 : size === "lg" ? 32 : 24;
  const padV = size === "sm" ? 9 : size === "lg" ? 16 : 13;
  const fs = size === "sm" ? 14 : size === "lg" ? 16 : 15;

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: `${padV}px ${padH}px`,
    borderRadius: 2,
    fontFamily: V2.ui,
    fontWeight: 500,
    fontSize: fs,
    letterSpacing: 0.2,
    cursor: "pointer",
    textDecoration: "none",
    border: "none",
    transition: "background .15s, color .15s",
    ...style,
  };

  if (kind === "primary") {
    Object.assign(base, { background: V2.ink, color: V2.paper });
  } else if (kind === "on-dark") {
    Object.assign(base, { background: V2.paper, color: V2.ink });
  } else if (kind === "ghost") {
    Object.assign(base, {
      background: "transparent",
      color: V2.ink,
      border: `1px solid ${V2.ink}`,
    });
  } else if (kind === "ghost-dark") {
    Object.assign(base, {
      background: "transparent",
      color: V2.paper,
      border: `1px solid ${V2.paper}`,
    });
  }

  if (href) {
    return (
      <Link href={href} style={base} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      style={base}
      className={className}
    >
      {children}
    </button>
  );
}
