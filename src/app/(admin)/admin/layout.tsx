import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { V2 } from "@/components/v2/tokens";
import { Logo } from "@/components/v2";
import { SignOutButtonV2 } from "@/components/v2/app/SignOutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div
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
        <Link
          href="/admin"
          aria-label="Admin"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 14,
            textDecoration: "none",
          }}
        >
          <Logo size={20} />
          <span
            style={{
              fontFamily: V2.mono,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: V2.goldDeep,
              fontWeight: 500,
              paddingLeft: 14,
              borderLeft: `1px solid ${V2.paperShade}`,
              lineHeight: 1,
            }}
          >
            Admin
          </span>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            fontFamily: V2.ui,
            fontSize: 14,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/admin"
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            Dashboard
          </Link>
          <Link
            href="/admin/users"
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            Gebruikers
          </Link>
          <Link
            href="/admin/jobs"
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            Jobs
          </Link>

          <span
            style={{
              fontFamily: V2.mono,
              fontSize: 11,
              color: V2.inkMute,
              letterSpacing: "0.08em",
            }}
          >
            {session.user?.email}
          </span>

          <Link
            href="/dashboard"
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 12px",
              border: `1px solid ${V2.paperShade}`,
              color: V2.ink,
              textDecoration: "none",
            }}
          >
            Naar app
          </Link>

          <SignOutButtonV2 />
        </div>
      </nav>
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 40px 80px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
