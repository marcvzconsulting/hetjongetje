import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo, EBtn } from "@/components/v2";

/**
 * Publieke nav gebruikt op landing + content pages. Niet ingelogd.
 */
export function LandingNav() {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 48px",
        borderBottom: `1px solid ${V2.paperShade}`,
        background: V2.paper,
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      <Link href="/" aria-label="Ons Verhaaltje — home">
        <Logo size={22} />
      </Link>
      <div
        style={{
          display: "flex",
          gap: 32,
          alignItems: "center",
          fontFamily: V2.ui,
          fontSize: 14,
          fontWeight: 500,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/hoe-het-werkt"
          style={{ color: V2.ink, textDecoration: "none" }}
        >
          Hoe het werkt
        </Link>
        <Link
          href="/veelgestelde-vragen"
          style={{ color: V2.ink, textDecoration: "none" }}
        >
          FAQ
        </Link>
        <Link
          href="/over-ons"
          style={{ color: V2.ink, textDecoration: "none" }}
        >
          Over ons
        </Link>
        <Link href="/login" style={{ color: V2.ink, textDecoration: "none" }}>
          Inloggen
        </Link>
        <EBtn kind="primary" size="sm" href="/register">
          Probeer het
        </EBtn>
      </div>
    </nav>
  );
}
