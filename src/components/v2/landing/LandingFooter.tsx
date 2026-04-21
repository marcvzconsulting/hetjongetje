import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo } from "@/components/v2";

export function LandingFooter() {
  return (
    <footer
      style={{
        padding: "48px 48px",
        borderTop: `1px solid ${V2.paperShade}`,
        fontFamily: V2.ui,
        fontSize: 13,
        background: V2.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <Logo size={16} />
        <div
          style={{
            display: "flex",
            gap: 32,
            color: V2.inkMute,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/privacy"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Privacy
          </Link>
          <Link
            href="/voorwaarden"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Voorwaarden
          </Link>
          <Link
            href="/veelgestelde-vragen"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            FAQ
          </Link>
          <Link
            href="/over-ons"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Over ons
          </Link>
          <Link
            href="/contact"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Contact
          </Link>
          <a
            href="mailto:hallo@onsverhaaltje.nl"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            hallo@onsverhaaltje.nl
          </a>
        </div>
      </div>
    </footer>
  );
}
