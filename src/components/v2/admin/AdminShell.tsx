import type { ReactNode } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo } from "@/components/v2";
import { SignOutButtonV2 } from "@/components/v2/app/SignOutButton";

type NavItem = {
  label: string;
  href: string;
  /** Single character / glyph shown in the sidebar gutter. */
  icon: string;
  /** Page sets this to true so the sidebar highlights the current item. */
  active?: boolean;
  /** Optional small badge after the label, e.g. count of pending items. */
  badge?: number | string;
};

type Props = {
  /** Section name shown above page title — e.g. "Klanten", "Pricing". */
  section: string;
  /** Big page title under the section name. */
  title: ReactNode;
  /** Optional kicker eyebrow above the title. */
  eyebrow?: string;
  /** Nav items; pass `active: true` on the current page. If omitted the
   *  default nav with no active highlight is shown. */
  nav?: NavItem[];
  /** Email shown bottom-left so admins know which account they're in. */
  adminEmail?: string;
  /** Optional right-side action area (e.g. "Refresh"-knop). */
  actions?: ReactNode;
  children: ReactNode;
};

export const ADMIN_NAV: Omit<NavItem, "active">[] = [
  { label: "Dashboard", href: "/admin", icon: "◐" },
  { label: "Klanten", href: "/admin/users", icon: "◇" },
  { label: "Pricing", href: "/admin/pricing", icon: "◯" },
  { label: "Mails", href: "/admin/email-templates", icon: "✉" },
  { label: "AI-prompts", href: "/admin/ai-prompts", icon: "✦" },
  { label: "Jobs", href: "/admin/jobs", icon: "◮" },
];

/**
 * Admin layout with a fixed left-side navigation rail. Sticky on
 * desktop, collapses to a top-row of pills on narrow screens.
 *
 * The rail is intentionally muted — admins look here all day, and a
 * loud nav competes with the data they're scanning. Active item gets
 * an inkt-coloured background and 1.5px left accent in gold.
 */
export function AdminShell({
  section,
  title,
  eyebrow,
  nav = ADMIN_NAV,
  adminEmail,
  actions,
  children,
}: Props) {
  return (
    <div
      style={{
        fontFamily: V2.body,
        color: V2.ink,
        background: V2.paper,
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (max-width: 900px) {
  .adm-grid { grid-template-columns: 1fr !important; }
  .adm-rail {
    position: static !important;
    height: auto !important;
    border-right: none !important;
    border-bottom: 1px solid ${V2.paperShade} !important;
    padding: 16px 20px !important;
  }
  .adm-rail-inner { flex-direction: row !important; gap: 8px !important; flex-wrap: wrap !important; }
  .adm-rail-brand { margin-bottom: 0 !important; padding-bottom: 0 !important; border-bottom: none !important; padding-right: 12px !important; border-right: 1px solid ${V2.paperShade} !important; }
  .adm-rail-link {
    flex-direction: row !important;
    gap: 6px !important;
    padding: 8px 12px !important;
    font-size: 13px !important;
    border-left: none !important;
    border-bottom: 2px solid transparent !important;
  }
  .adm-rail-link.active {
    border-left: none !important;
    border-bottom-color: ${V2.gold} !important;
    background: transparent !important;
    color: ${V2.ink} !important;
  }
  .adm-rail-foot { display: none !important; }
  .adm-main-pad { padding: 32px 20px 64px !important; }
}
`,
        }}
      />

      {/* ── Left rail ──────────────────────────────── */}
      <aside
        className="adm-rail"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          borderRight: `1px solid ${V2.paperShade}`,
          background: V2.paperDeep,
          padding: "28px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="adm-rail-brand"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            padding: "0 24px 24px",
            marginBottom: 24,
            borderBottom: `1px solid ${V2.paperShade}`,
          }}
        >
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <Logo size={18} />
          </Link>
          <span
            style={{
              fontFamily: V2.mono,
              fontSize: 9,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: V2.goldDeep,
              fontWeight: 500,
            }}
          >
            Admin
          </span>
        </div>

        <nav
          className="adm-rail-inner"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "0 12px",
            flex: 1,
          }}
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`adm-rail-link${item.active ? " active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "10px 14px",
                fontFamily: V2.ui,
                fontSize: 14,
                fontWeight: item.active ? 500 : 400,
                color: item.active ? V2.ink : V2.inkSoft,
                background: item.active ? V2.paper : "transparent",
                borderLeft: `2px solid ${item.active ? V2.gold : "transparent"}`,
                textDecoration: "none",
                transition: "background .12s",
              }}
            >
              <span
                aria-hidden
                style={{
                  fontFamily: V2.mono,
                  fontSize: 14,
                  width: 16,
                  textAlign: "center",
                  color: item.active ? V2.goldDeep : V2.inkMute,
                }}
              >
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && item.badge !== 0 && (
                <span
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 11,
                    padding: "2px 8px",
                    background: V2.goldSoft,
                    color: V2.goldDeep,
                    fontWeight: 500,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div
          className="adm-rail-foot"
          style={{
            padding: "24px",
            borderTop: `1px solid ${V2.paperShade}`,
            marginTop: 24,
          }}
        >
          {adminEmail && (
            <div
              style={{
                fontFamily: V2.mono,
                fontSize: 10,
                color: V2.inkMute,
                letterSpacing: "0.06em",
                marginBottom: 14,
                wordBreak: "break-all",
                lineHeight: 1.4,
              }}
            >
              {adminEmail}
            </div>
          )}
          <Link
            href="/dashboard"
            style={{
              display: "block",
              fontFamily: V2.ui,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "8px 12px",
              border: `1px solid ${V2.paperShade}`,
              color: V2.ink,
              textDecoration: "none",
              textAlign: "center",
              marginBottom: 10,
              background: V2.paper,
            }}
          >
            ← Naar app
          </Link>
          <SignOutButtonV2 />
        </div>
      </aside>

      {/* ── Main column ───────────────────────────── */}
      <main className="adm-main-pad" style={{ padding: "44px 48px 80px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            marginBottom: 32,
            paddingBottom: 20,
            borderBottom: `1px solid ${V2.paperShade}`,
            flexWrap: "wrap",
          }}
        >
          <div>
            {eyebrow && (
              <div
                style={{
                  fontFamily: V2.mono,
                  fontSize: 10,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: V2.goldDeep,
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                {eyebrow}
              </div>
            )}
            <div
              style={{
                fontFamily: V2.mono,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: V2.inkMute,
                marginBottom: 6,
              }}
            >
              {section}
            </div>
            <h1
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: "clamp(28px, 3.4vw, 38px)",
                margin: 0,
                letterSpacing: -1.1,
                lineHeight: 1.1,
                color: V2.ink,
              }}
            >
              {title}
            </h1>
          </div>
          {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
        </header>

        {children}
      </main>
    </div>
  );
}
