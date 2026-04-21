import type { ReactNode } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo } from "@/components/v2";
import { Avatar } from "@/components/v2/Avatar";
import { SignOutButtonV2 } from "./SignOutButton";

type NavItem = {
  label: string;
  href: string;
  active?: boolean;
};

type Props = {
  /** Name of the logged-in user — used on the avatar */
  userName: string;
  /** Navigation items; pass `active: true` for the current page */
  nav?: NavItem[];
  /** Credits to show pill-style. `null` hides the pill (admin or pending). */
  credits?: number | null;
  /** Show "verhalen over" label in the pill */
  showCreditsLabel?: boolean;
  children: ReactNode;
};

const DEFAULT_NAV: NavItem[] = [
  { label: "Bibliotheek", href: "/dashboard" },
  { label: "Account", href: "/account" },
];

/**
 * Shared shell for logged-in pages: top nav with logo, links, credits pill,
 * avatar and sign-out. Wraps children in the v2 paper background.
 */
export function AppShell({
  userName,
  nav = DEFAULT_NAV,
  credits,
  showCreditsLabel = true,
  children,
}: Props) {
  return (
    <div
      className="v2-root"
      style={{
        fontFamily: V2.body,
        color: V2.ink,
        background: V2.paper,
        minHeight: "100vh",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          borderBottom: `1px solid ${V2.paperShade}`,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link href="/dashboard" aria-label="Bibliotheek">
          <Logo size={20} />
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontFamily: V2.ui,
            fontSize: 14,
            flexWrap: "wrap",
          }}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: item.active ? V2.ink : V2.inkMute,
                textDecoration: "none",
                fontWeight: item.active ? 500 : 400,
              }}
            >
              {item.label}
            </Link>
          ))}

          {credits !== null && credits !== undefined && (
            <span
              title="Aantal verhalen dat je nog kunt maken"
              style={{
                fontFamily: V2.ui,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "6px 12px",
                border: `1px solid ${
                  credits > 0 ? V2.paperShade : V2.rose
                }`,
                color: credits > 0 ? V2.inkMute : V2.ink,
                background: credits > 0 ? "transparent" : "rgba(196,165,168,0.15)",
              }}
            >
              {credits} {showCreditsLabel && (credits === 1 ? "verhaal over" : "verhalen over")}
            </span>
          )}

          <SignOutButtonV2 />
          <Link
            href="/account"
            aria-label="Mijn account"
            style={{ display: "inline-flex" }}
          >
            <Avatar name={userName} size={36} />
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
