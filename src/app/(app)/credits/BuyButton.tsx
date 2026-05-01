"use client";

import { useFormStatus } from "react-dom";
import { V2 } from "@/components/v2/tokens";
import { IconV2 } from "@/components/v2";

/**
 * Submit-button for the credits buy form. Uses React's useFormStatus to
 * flip into a "Bezig…" state the moment the form posts, so the user gets
 * instant visual feedback while the server action talks to Mollie.
 *
 * Must be a client component — useFormStatus is a hook, and only works
 * for descendants of the same form it belongs to.
 */
export function BuyButton({
  disabled,
  featured,
}: {
  /** Hard-disable from the parent (e.g. unapproved user). */
  disabled: boolean;
  /** Match the card colour scheme — gold-on-dark vs ink-on-paper. */
  featured: boolean;
}) {
  const { pending } = useFormStatus();
  const blocked = disabled || pending;

  return (
    <button
      type="submit"
      disabled={blocked}
      style={{
        width: "100%",
        marginTop: 14,
        padding: "12px 16px",
        background: featured ? V2.gold : V2.ink,
        color: featured ? V2.ink : V2.paper,
        border: "none",
        fontFamily: V2.ui,
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: "0.04em",
        cursor: blocked ? "not-allowed" : "pointer",
        opacity: blocked ? 0.55 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 44,
        transition: "opacity 0.15s",
      }}
    >
      {pending ? (
        <>
          <Spinner color={featured ? V2.ink : V2.paper} />
          <span>Bezig met doorsturen…</span>
        </>
      ) : (
        <>
          <span>Bestellen</span>
          <IconV2
            name="arrow"
            size={14}
            color={featured ? V2.ink : V2.paper}
          />
        </>
      )}
    </button>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      style={{ animation: "ov-spin 0.9s linear infinite" }}
      aria-hidden
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
      <style>{`@keyframes ov-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
