import type { ReactNode } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo } from "@/components/v2";
import { SignOutButtonV2 } from "@/components/v2/app/SignOutButton";
import { AdminMobileNav } from "@/components/v2/admin/AdminMobileNav";

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
  { label: "Inbox", href: "/admin/inbox", icon: "✎" },
  { label: "Pricing", href: "/admin/pricing", icon: "◯" },
  { label: "Mails", href: "/admin/email-templates", icon: "✉" },
  { label: "AI-prompts", href: "/admin/ai-prompts", icon: "✦" },
  { label: "FAQ", href: "/admin/faq", icon: "?" },
  { label: "Jobs", href: "/admin/jobs", icon: "◮" },
  { label: "Audit", href: "/admin/audit", icon: "▤" },
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
      className="adm-shell"
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
  .adm-shell { display: block !important; grid-template-columns: none !important; }
  .adm-rail { display: none !important; }
  .adm-topbar { display: flex !important; }
  .adm-main-pad { padding: 24px 16px 64px !important; }
  .adm-header { gap: 12px !important; margin-bottom: 24px !important; padding-bottom: 16px !important; }
  .adm-header h1 { font-size: 22px !important; letter-spacing: -0.5px !important; line-height: 1.15 !important; }
  .adm-section { margin-top: 36px !important; }
  .adm-table-wrap { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
}
@media (max-width: 700px) {
  .adm-cards-wrap { overflow: visible !important; border: none !important; background: transparent !important; }
  .adm-cards { min-width: 0 !important; border: none !important; background: transparent !important; }
  .adm-cards thead { display: none !important; }
  .adm-cards tbody, .adm-cards tr, .adm-cards td { display: block !important; }
  .adm-cards tr {
    background: ${V2.paper} !important;
    border: 1px solid ${V2.paperShade} !important;
    margin-bottom: 12px !important;
    padding: 14px 16px !important;
  }
  .adm-cards td {
    padding: 6px 0 !important;
    border: none !important;
    display: flex !important;
    justify-content: space-between !important;
    gap: 12px !important;
    align-items: baseline !important;
    text-align: left !important;
    max-width: none !important;
  }
  .adm-cards td::before {
    content: attr(data-label);
    font-family: ${V2.ui};
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${V2.inkMute};
    flex: 0 0 auto;
    white-space: nowrap;
  }
  .adm-cards td[data-stack="true"] {
    flex-direction: column !important;
    align-items: flex-start !important;
  }
  .adm-cards td[data-stack="true"]::before {
    margin-bottom: 4px;
  }
  .adm-cards td[data-label=""]::before { display: none; }
}
`,
        }}
      />

      <AdminMobileNav
        section={section}
        nav={nav}
        adminEmail={adminEmail}
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
          className="adm-header"
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
