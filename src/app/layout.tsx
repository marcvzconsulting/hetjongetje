import type { Metadata } from "next";
import { Nunito, Lora, Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

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
  alternates: {
    canonical: "/",
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${nunito.variable} ${lora.variable} ${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
