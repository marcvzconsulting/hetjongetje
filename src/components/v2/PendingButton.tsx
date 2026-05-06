"use client";

import type { CSSProperties, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { V2 } from "@/components/v2/tokens";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

type Props = {
  /** Button label when idle. */
  children: ReactNode;
  /** Optional override for the in-flight label; defaults to "Bezig…". */
  pendingLabel?: ReactNode;
  variant?: Variant;
  size?: Size;
  /** Extra styles merged on top of the variant defaults. */
  style?: CSSProperties;
  /** Disable independent of pending state (e.g. invalid form). */
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
};

/**
 * Submit-button that subscribes to its parent form's pending state via
 * `useFormStatus`. While the server action is in flight:
 *   - the label switches to `pendingLabel` ("Bezig…" by default)
 *   - a small spinner appears
 *   - the button itself is disabled, so a second click can't fire the
 *     same action twice (which would otherwise cause double-saves).
 *
 * Must live inside a <form action={...}> for useFormStatus to work.
 */
export function PendingButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  style,
  disabled,
  className,
  fullWidth,
}: Props) {
  const { pending } = useFormStatus();
  const isDisabled = !!(pending || disabled);

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: V2.ui,
    fontWeight: 500,
    letterSpacing: "0.04em",
    cursor: isDisabled ? "default" : "pointer",
    transition: "background .15s, opacity .15s",
    border: "none",
    width: fullWidth ? "100%" : undefined,
    ...sizeStyles(size),
    ...variantStyles(variant, isDisabled, pending),
    ...style,
  };

  return (
    <button type="submit" disabled={isDisabled} className={className} style={base}>
      {pending && <Spinner color={spinnerColor(variant)} />}
      <span>{pending ? (pendingLabel ?? "Bezig…") : children}</span>
    </button>
  );
}

function sizeStyles(size: Size): CSSProperties {
  if (size === "sm") return { padding: "8px 14px", fontSize: 12 };
  return { padding: "10px 22px", fontSize: 13 };
}

function variantStyles(
  variant: Variant,
  isDisabled: boolean,
  pending: boolean,
): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: pending ? V2.inkSoft : V2.ink,
        color: V2.paper,
        border: "none",
        opacity: isDisabled && !pending ? 0.5 : 1,
      };
    case "ghost":
      return {
        background: pending ? V2.paperDeep : V2.paper,
        color: V2.ink,
        border: `1px solid ${V2.paperShade}`,
        opacity: isDisabled && !pending ? 0.5 : 1,
      };
    case "danger":
      return {
        background: pending ? "rgba(176,74,65,0.12)" : "transparent",
        color: V2.heart,
        border: `1px solid ${V2.rose}`,
        opacity: isDisabled && !pending ? 0.5 : 1,
      };
  }
}

function spinnerColor(variant: Variant): string {
  return variant === "primary" ? V2.paper : V2.ink;
}

function Spinner({ color }: { color: string }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes pb-spin { to { transform: rotate(360deg); } }`,
        }}
      />
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          border: `2px solid ${V2.paperShade}`,
          borderTopColor: color,
          borderRadius: "50%",
          display: "inline-block",
          animation: "pb-spin 0.7s linear infinite",
        }}
      />
    </>
  );
}
