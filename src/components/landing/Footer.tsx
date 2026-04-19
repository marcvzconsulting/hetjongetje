import Link from "next/link";
import { INK, DISPLAY } from "./tokens";

export function Footer() {
  return (
    <footer className="relative z-10 mx-auto max-w-[1280px] px-8 pb-14 md:px-16 md:pb-16">
      <div
        className="mb-12 h-px"
        style={{ backgroundColor: INK, opacity: 0.18 }}
      />
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <p
            className="text-[18px] tracking-[-0.005em]"
            style={{ fontFamily: DISPLAY, color: INK }}
          >
            Ons Verhaaltje
          </p>
          <p
            className="mt-2 max-w-[28ch] text-[13px] italic leading-[1.55]"
            style={{ fontFamily: DISPLAY, opacity: 0.6 }}
          >
            Een avondritueel. Voor één kind, één keer geschreven.
          </p>
        </div>
        <nav
          className="flex flex-col gap-2 text-[14px]"
          style={{ color: INK }}
        >
          <FooterLink href="/over-ons">Over ons</FooterLink>
          <FooterLink href="/hoe-het-werkt">Hoe het werkt</FooterLink>
          <FooterLink href="/veelgestelde-vragen">
            Veelgestelde vragen
          </FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
        </nav>
        <div
          className="flex flex-col gap-2 text-[14px] md:items-end"
          style={{ color: INK }}
        >
          <FooterLink href="/privacy">Privacy</FooterLink>
          <FooterLink href="/voorwaarden">Voorwaarden</FooterLink>
          <span
            className="tabular-nums"
            style={{ fontFamily: DISPLAY, opacity: 0.6 }}
          >
            © 2026
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="w-fit hover:opacity-70 transition-opacity">
      {children}
    </Link>
  );
}
