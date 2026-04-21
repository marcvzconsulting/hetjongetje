"use client";

import { signOut } from "next-auth/react";
import { V2 } from "@/components/v2/tokens";

export function SignOutButtonV2() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        fontFamily: V2.ui,
        fontSize: 13,
        color: V2.inkMute,
        cursor: "pointer",
        textDecoration: "underline",
        textUnderlineOffset: 3,
      }}
    >
      Uitloggen
    </button>
  );
}
