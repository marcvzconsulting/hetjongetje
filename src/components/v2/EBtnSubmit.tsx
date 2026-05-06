"use client";

import { useFormStatus } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import { V2 } from "./tokens";

type Kind = "primary" | "on-dark" | "ghost" | "ghost-dark";
type Size = "sm" | "md" | "lg";

type Props = {
  children: ReactNode;
  /** Label while the parent form's server action is in flight. */
  pendingLabel?: ReactNode;
  kind?: Kind;
  size?: Size;
  /** Disable independent of pending (e.g. invalid form). */
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
};

/**
 * Submit-only twin of <EBtn> that subscribes to its parent form's
 * `useFormStatus`. Uses the same paddings / radii / type-rules as
 * EBtn so the visual rhythm of buttons across the app stays
 * consistent — only the loading-state behaviour is added.
 *
 * Use this for any <button type="submit"> inside a form whose
 * `action={...}` is a server action that may take a couple of
 * hundred milliseconds — DB writes, mail sends, Mollie round-trips.
 */
export function EBtnSubmit({
  children,
  pendingLabel,
  kind = "primary",
  size = "md",
  disabled,
  style,
  className,
}: Props) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  const padH = size === "sm" ? 18 : size === "lg" ? 32 : 24;
  const padV = size === "sm" ? 9 : size === "lg" ? 16 : 13;
  const fs = size === "sm" ? 14 : size === "lg" ? 16 : 15;

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: `${padV}px ${padH}px`,
    borderRadius: 2,
    fontFamily: V2.ui,
    fontWeight: 500,
    fontSize: fs,
    letterSpacing: 0.2,
    cursor: isDisabled ? "default" : "pointer",
    textDecoration: "none",
    border: "none",
    transition: "background .15s, color .15s, opacity .15s",
    minHeight: 40,
    opacity: isDisabled && !pending ? 0.5 : 1,
    ...style,
  };

  if (kind === "primary") {
    Object.assign(base, {
      background: pending ? V2.inkSoft : V2.ink,
      color: V2.paper,
    });
  } else if (kind === "on-dark") {
    Object.assign(base, {
      background: pending ? V2.paperDeep : V2.paper,
      color: V2.ink,
    });
  } else if (kind === "ghost") {
    Object.assign(base, {
      background: pending ? V2.paperDeep : "transparent",
      color: V2.ink,
      border: `1px solid ${V2.ink}`,
    });
  } else if (kind === "ghost-dark") {
    Object.assign(base, {
      background: pending ? "rgba(255,255,255,0.08)" : "transparent",
      color: V2.paper,
      border: `1px solid ${V2.paper}`,
    });
  }

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={className}
      style={base}
    >
      {pending && (
        <Spinner
          color={
            kind === "primary" || kind === "ghost-dark" ? V2.paper : V2.ink
          }
        />
      )}
      <span>{pending ? (pendingLabel ?? "Bezig…") : children}</span>
    </button>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes ebs-spin { to { transform: rotate(360deg); } }`,
        }}
      />
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          border: `2px solid rgba(255,255,255,0.4)`,
          borderTopColor: color,
          borderRadius: "50%",
          display: "inline-block",
          animation: "ebs-spin 0.7s linear infinite",
        }}
      />
    </>
  );
}
