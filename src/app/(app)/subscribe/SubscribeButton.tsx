"use client";

import { useFormStatus } from "react-dom";
import { V2 } from "@/components/v2/tokens";
import { IconV2 } from "@/components/v2";

/**
 * Submit button for the /subscribe form. Mirrors /credits BuyButton:
 * useFormStatus flips to a "Bezig met doorsturen…" state the second the
 * server action starts, so the user gets instant feedback while we talk
 * to Mollie.
 */
export function SubscribeButton({
  disabled,
  featured,
  label = "Abonnement starten",
}: {
  disabled: boolean;
  featured: boolean;
  label?: string;
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
          <span>{label}</span>
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
      style={{ animation: "ov-spin-sub 0.9s linear infinite" }}
      aria-hidden
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
      <style>{`@keyframes ov-spin-sub { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
