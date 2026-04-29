"use client";

import { signIn } from "next-auth/react";
import { V2 } from "@/components/v2/tokens";

type Props = {
  /** Where NextAuth should redirect after successful sign-in. Optional —
   *  defaults to /dashboard. */
  callbackUrl?: string;
  /** Button label. Defaults to "Verder met Google". */
  label?: string;
};

/**
 * Google OAuth sign-in button. Uses NextAuth client-side `signIn` which
 * handles the full redirect dance. Shared between /login and /register
 * because the handler is identical: NextAuth either signs the user in
 * (existing) or creates a pending account (new) — same outcome either way.
 */
export function GoogleSignInButton({
  callbackUrl = "/dashboard",
  label = "Verder met Google",
}: Props) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        width: "100%",
        minHeight: 44,
        padding: "10px 16px",
        background: V2.paper,
        color: V2.ink,
        border: `1px solid ${V2.paperShade}`,
        borderRadius: 2,
        fontFamily: V2.ui,
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = V2.paperDeep;
        e.currentTarget.style.borderColor = V2.inkMute;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = V2.paper;
        e.currentTarget.style.borderColor = V2.paperShade;
      }}
    >
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}

/** "of met email" divider used between the OAuth button and the form. */
export function AuthDivider({ label = "of met email" }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "20px 0",
      }}
      aria-hidden
    >
      <span style={{ flex: 1, height: 1, background: V2.paperShade }} />
      <span
        style={{
          fontFamily: V2.ui,
          fontSize: 12,
          color: V2.inkMute,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: V2.paperShade }} />
    </div>
  );
}

function GoogleIcon() {
  // Google "G" mark, official colours. Inline SVG so we don't load
  // an external asset and trip CSP.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
