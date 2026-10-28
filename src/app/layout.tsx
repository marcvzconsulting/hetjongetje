import type { Metadata } from "next";
import { connection } from "next/server";
import { Lora, Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CookieBanner } from "@/components/v2/CookieBanner";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const SITE_URL = "https://www.onsverhaaltje.nl";

export const metadata: Metadata = {
  // metadataBase makes every relative URL in og:image, alternates etc.
  // resolve against the production domain — required for previews on
  // WhatsApp / X / LinkedIn to fetch the OG image.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ons Verhaaltje — Gepersonaliseerde voorleesverhalen",
    // Per-page metadata can set a string title and we'll append the
    // brand suffix. e.g. "Inloggen" → "Inloggen · Ons Verhaaltje".
    template: "%s · Ons Verhaaltje",
  },
  description:
    "Gepersonaliseerde voorleesverhalen voor je kind, met de naam, de knuffel en de mensen om hen heen. Elke avond een nieuw verhaal.",
  applicationName: "Ons Verhaaltje",
  authors: [{ name: "MVZ Consulting" }],
  generator: "Next.js",
  keywords: [
    "kinderverhalen",
    "voorleesverhaal",
    "gepersonaliseerd",
    "kinderboek",
    "AI verhalen",
    "slapengaan",
    "voor het slapen",
    "kinderboekje",
  ],
  category: "kids",
  // Per-page canonicals zetten op de paginas zelf via
  // `alternates.canonical`. Een layout-level default zou alle child-pages
  // een canonical naar "/" geven, wat Lighthouse (terecht) afkeurt.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: SITE_URL,
    siteName: "Ons Verhaaltje",
    title: "Ons Verhaaltje — Gepersonaliseerde voorleesverhalen",
    description:
      "Gepersonaliseerde voorleesverhalen voor je kind, met de naam, de knuffel en de mensen om hen heen.",
    // Image picked up automatically from src/app/opengraph-image.tsx.
  },
  twitter: {
    card: "summary_large_image",
    title: "Ons Verhaaltje — Gepersonaliseerde voorleesverhalen",
    description:
      "Gepersonaliseerde voorleesverhalen voor je kind, met de naam, de knuffel en de mensen om hen heen.",
  },
  formatDetection: {
    // Stop iOS Safari from auto-linking parts of body copy as phone
    // numbers / email / dates — looks ugly in editorial typography.
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1e3a" },
  ],
  width: "device-width",
  initialScale: 1,
  // Allow user to zoom — accessibility win.
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // De CSP in proxy.ts staat alleen scripts toe met de nonce van dít
  // request. Next.js kan die nonce alleen injecteren bij dynamisch
  // renderen; een statisch gebouwde pagina heeft geen nonce, de browser
  // blokkeert al z'n inline scripts en React hydrateert nooit (zo was
  // /auth/magic een lege pagina). Daarom rendert elke pagina per request.
  await connection();

  return (
    <html
      lang="nl"
      className={`${lora.variable} ${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CookieBanner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
