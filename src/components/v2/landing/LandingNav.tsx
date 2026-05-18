import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo, EBtn } from "@/components/v2";

/**
 * Publieke nav gebruikt op landing + content pages. Niet ingelogd.
 */
export function LandingNav() {
  return (
    <nav
      className="ln-pad"
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
      {/* Mobiele consistency met de homepage-Nav: hide content-links
          onder 760px zodat de balk niet uit z'n voegen barst. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (max-width: 760px) {
  .ln-pad { padding: 16px 20px !important; }
  .ln-cluster { gap: 14px !important; }
  .ln-mobile-hide { display: none !important; }
}
`,
        }}
      />
      <Link href="/" aria-label="Ons Verhaaltje, home">
        <Logo size={22} />
      </Link>
      <div
        className="ln-cluster"
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
          className="ln-mobile-hide"
          style={{ color: V2.ink, textDecoration: "none" }}
        >
          Hoe het werkt
        </Link>
        <Link
          href="/veelgestelde-vragen"
          className="ln-mobile-hide"
          style={{ color: V2.ink, textDecoration: "none" }}
        >
          FAQ
        </Link>
        <Link
          href="/over-ons"
          className="ln-mobile-hide"
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
