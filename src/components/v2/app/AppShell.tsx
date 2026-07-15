import type { ReactNode } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo } from "@/components/v2";
import { Avatar } from "@/components/v2/Avatar";
import { SignOutButtonV2 } from "./SignOutButton";
import { SentryUserSync } from "@/components/monitoring/SentryUserSync";

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
  /** Show the "Naar admin"-shortcut. Page passes `true` only for admin users. */
  isAdmin?: boolean;
  children: ReactNode;
};

/**
 * When the credit balance drops to or below this value, the shell shows
 * an extra "Koop verhalen +"-button next to the credits-pill so the
 * top-up flow is one click away. Tuned conservatively: at 3 the
 * customer still has buffer, but the choice is now visible.
 */
const LOW_CREDIT_THRESHOLD = 3;

const DEFAULT_NAV: NavItem[] = [
  { label: "Bibliotheek", href: "/dashboard" },
  { label: "Abonnement", href: "/subscribe" },
  { label: "Credits", href: "/credits" },
  { label: "Account", href: "/account" },
];

/**
 * Returns the standard top-nav with the matching item flagged active.
 * Pass the page's own pathname (e.g. "/credits") so callers don't have
 * to hand-roll the nav array — keeps every page consistent when we add
 * or rename items.
 */
export function buildAppNav(activeHref?: string): NavItem[] {
  return DEFAULT_NAV.map((item) =>
    activeHref && item.href === activeHref ? { ...item, active: true } : item,
  );
}

/**
 * Shared shell for logged-in pages: top nav with logo, links, credits pill,
 * avatar and sign-out. Wraps children in the v2 paper background.
 */
export function AppShell({
  userName,
  nav = DEFAULT_NAV,
  credits,
  showCreditsLabel = true,
  isAdmin = false,
  children,
}: Props) {
  const showLowCreditCta =
    typeof credits === "number" && credits <= LOW_CREDIT_THRESHOLD;
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
      <SentryUserSync />
      {/* Mobile responsive overrides for any logged-in page that uses AppShell.
          Pages opt in by adding the matching classnames. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (max-width: 640px) {
  .app-nav-pad { padding: 14px 16px !important; gap: 10px !important; }
  .app-nav-links { gap: 14px !important; font-size: 13px !important; }
  .app-page-pad { padding: 24px 16px 64px !important; }
  .app-section-pad { padding: 32px 16px !important; }
  .app-form-row { grid-template-columns: 1fr !important; gap: 0 !important; }
  .app-section-h2 { font-size: 28px !important; }
  .app-child-header-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
  .app-actions-row { flex-direction: column !important; align-items: stretch !important; }
  .app-actions-row > * { width: 100% !important; }
}
`,
        }}
      />
      <nav
        className="app-nav-pad"
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
          className="app-nav-links"
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/credits"
                title={
                  credits > 0
                    ? "Aantal verhalen dat je nog kunt maken — klik om bij te kopen"
                    : "Geen credits meer — klik om bij te kopen"
                }
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
                  textDecoration: "none",
                }}
              >
                {credits} {showCreditsLabel && (credits === 1 ? "verhaal over" : "verhalen over")}
              </Link>
              {showLowCreditCta && (
                <Link
                  href="/credits"
                  title="Verhalen bijkopen"
                  style={{
                    fontFamily: V2.ui,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    padding: "6px 12px",
                    background: V2.gold,
                    color: V2.ink,
                    textDecoration: "none",
                    border: `1px solid ${V2.goldDeep}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  + Koop bij
                </Link>
              )}
            </span>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              title="Naar het admin-paneel"
              style={{
                fontFamily: V2.mono,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "6px 10px",
                color: V2.goldDeep,
                background: V2.goldSoft,
                border: `1px solid ${V2.goldDeep}`,
                textDecoration: "none",
              }}
            >
              Admin
            </Link>
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
      <main>{children}</main>
      {/* Subtiele juridische linkregel — bewust geen volle footer, alleen
          de plekken waar een ingelogde gebruiker soms naar zoekt. */}
      <footer
        style={{
          padding: "28px 24px 32px",
          textAlign: "center",
          fontFamily: V2.ui,
          fontSize: 12,
          color: V2.inkMute,
        }}
      >
        <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>
          Privacy
        </Link>
        <span aria-hidden style={{ margin: "0 10px" }}>
          ·
        </span>
        <Link href="/voorwaarden" style={{ color: "inherit", textDecoration: "none" }}>
          Voorwaarden
        </Link>
        <span aria-hidden style={{ margin: "0 10px" }}>
          ·
        </span>
        <Link href="/cookies" style={{ color: "inherit", textDecoration: "none" }}>
          Cookies
        </Link>
      </footer>
    </div>
  );
}
