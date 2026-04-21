import Link from "next/link";
import {
  CREAM,
  INK,
  PURPLE,
  AMBER,
  DISPLAY,
  BODY,
  HAND,
  INK_RGB,
} from "@/components/landing/tokens";
import { fontVariables } from "@/components/landing/fonts";
import { PaperGrain } from "@/components/landing/PaperGrain";
import { PageHeader } from "@/components/landing/PageHeader";
import { HeroIllustration } from "@/components/landing/HeroIllustration";
import { SectionDivider } from "@/components/landing/SectionDivider";
import { StoryPreview } from "@/components/landing/StoryPreview";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div
      className={`${fontVariables} relative flex flex-1 flex-col overflow-hidden`}
      style={{ backgroundColor: CREAM, color: INK, fontFamily: BODY }}
    >
      <PaperGrain />
      <PageHeader />

      <main className="relative z-10 flex-1">
        <Hero />
        <SectionDivider />
        <ExamplePreview />
        <SectionDivider />
        <HowItWorks />
        <SectionDivider />
        <WhyDifferent />
        <BookSection />
        <SectionDivider />
        <Pricing />
        <SectionDivider />
        <Testimonial />
        <SectionDivider />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}

// —— Section: Hero ————————————————————————————————————————————————————

function Hero() {
  return (
    <section className="relative mx-auto max-w-[1280px] px-8 pt-12 pb-20 md:px-16 md:pt-20 md:pb-32">
      <SectionFurniture number="01" eyebrow="Ons Verhaaltje" tail="voorblad" />

      <div className="mt-12 grid grid-cols-12 gap-x-6 md:mt-14 md:items-center">
        <div className="col-span-12 md:col-span-6">
          <p
            className="mb-7 text-[12px] uppercase tracking-[0.3em]"
            style={{ fontFamily: DISPLAY, color: PURPLE, opacity: 0.85 }}
          >
            Voor het slapengaan
          </p>
          <h1
            className="text-[clamp(2.6rem,5.4vw,4.6rem)] leading-[1.04] tracking-[-0.015em]"
            style={{ fontFamily: DISPLAY, fontWeight: 400 }}
          >
            Vanavond een verhaal
            <br />
            dat <em style={{ fontStyle: "italic" }}>écht</em> over{" "}
            <span
              style={{
                fontFamily: HAND,
                color: PURPLE,
                fontWeight: 500,
                fontStyle: "normal",
              }}
            >
              Emma
            </span>{" "}
            gaat.
          </h1>
          <p
            className="mt-8 max-w-[52ch] text-[17px] leading-[1.65]"
            style={{ opacity: 0.82 }}
          >
            Vertel ons wat er speelt in het leven van je kind. De nieuwe
            knuffel, het katje van de buren, het broertje dat eraan komt.
            En wij maken er een voorleesverhaal van met zachte
            {" "}aquarel-illustraties. Elke avond een nieuw hoofdstuk uit
            hun eigen leven. Samen terug te lezen in jullie eigen
            gedrukte boekje.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <PrimaryCta href="/register">Probeer een verhaal gratis</PrimaryCta>
            <span
              className="text-[22px] leading-none"
              style={{ fontFamily: HAND, color: INK, opacity: 0.7 }}
            >
              klaar in drie minuten
            </span>
          </div>
        </div>
        <div className="col-span-12 mt-12 md:col-span-6 md:mt-0">
          <HeroIllustration
            alt="Emma omhelst haar olifantje in de keuken bij avondlicht. Een illustratie uit haar verhaal."
            caption="Een illustratie uit Emma's verhaal. Naam, knuffel en plek zijn echt van haar."
          />
        </div>
      </div>
    </section>
  );
}

// —— Section: Voorbeeldverhaal ——————————————————————————————————————

function ExamplePreview() {
  return (
    <section className="relative mx-auto max-w-[1280px] px-8 py-16 md:px-16 md:py-20">
      <SectionHeader
        number="02"
        eyebrow="Voorbeeldverhaal"
        heading="Zo ziet een verhaal er uit."
      />
      <div className="mt-14 grid grid-cols-12 gap-x-6">
        <div className="col-span-12 md:col-span-10 md:col-start-2">
          <StoryPreview />
        </div>
      </div>
    </section>
  );
}

// —— Section: Hoe het werkt ——————————————————————————————————————————

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Vertel wie je kind is.",
      body: "Naam, leeftijd, knuffel, de mensen om hen heen. Wat ze leuk vinden, waar ze bang voor zijn, de grap die elke avond terugkomt.",
      image: "/images/spots/vertellen.png",
      alt: "Jongetje op een kleed met een knuffelkonijn tegen zijn schouder",
    },
    {
      n: "02",
      title: "Wij schrijven het verhaal.",
      body: "In een paar minuten maken we een voorleesverhaal met aquarel-illustraties. Een echt verhaal. Geen sjabloon met naam ingevuld.",
      image: "/images/spots/schrijven.png",
      alt: "Werktafel met beschreven vel, schetsboek, penseel en theekop",
    },
    {
      n: "03",
      title: "Voorlezen vanavond.",
      body: "Op de tablet, of uitgeprint. En op het einde van het jaar bundel je de mooiste tot een echt kinderboek.",
      image: "/images/spots/voorlezen.png",
      alt: "Meisje in bed met een prentenboek op het dekbed en een teddybeer",
    },
  ];

  return (
    <section className="relative mx-auto max-w-[1280px] px-8 py-16 md:px-16 md:py-20">
      <SectionHeader
        number="03"
        eyebrow="Hoe het werkt"
        heading="Drie stappen, geen wachtkamer."
      />
      <div className="mt-20 space-y-20 md:mt-24 md:space-y-28">
        {steps.map((step, i) => (
          <Step
            key={step.n}
            n={step.n}
            title={step.title}
            body={step.body}
            image={step.image}
            alt={step.alt}
            flip={i % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  body,
  image,
  alt,
  flip,
}: {
  n: string;
  title: string;
  body: string;
  image: string;
  alt: string;
  flip: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-10 md:items-center md:gap-16 ${
        flip ? "md:flex-row-reverse" : "md:flex-row"
      }`}
    >
      <div className="md:basis-7/12">
        <p
          className="mb-3 text-[clamp(4rem,9vw,7rem)] leading-none tabular-nums"
          style={{ fontFamily: DISPLAY, color: INK, fontWeight: 400 }}
        >
          {n}
        </p>
        <h3
          className="text-[clamp(1.5rem,2.8vw,2.1rem)] leading-[1.15] tracking-[-0.01em]"
          style={{ fontFamily: DISPLAY, fontWeight: 400 }}
        >
          {title}
        </h3>
        <p
          className="mt-4 max-w-[52ch] text-[16.5px] leading-[1.65]"
          style={{ opacity: 0.82 }}
        >
          {body}
        </p>
      </div>
      <div className="md:basis-5/12">
        <SpotImage src={image} alt={alt} />
      </div>
    </div>
  );
}

function SpotImage({ src, alt }: { src: string; alt: string }) {
  const vignette =
    "radial-gradient(ellipse 70% 74% at 50% 50%, black 50%, transparent 92%)";
  return (
    <div
      className="mx-auto aspect-square w-full max-w-[320px]"
      style={{
        maskImage: vignette,
        WebkitMaskImage: vignette,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="block h-full w-full object-cover select-none"
        draggable={false}
        loading="lazy"
      />
    </div>
  );
}

// —— Section: Waarom dit anders is ———————————————————————————————————

function WhyDifferent() {
  return (
    <section className="relative mx-auto max-w-[1280px] px-8 py-16 md:px-16 md:py-20">
      <SectionHeader number="04" eyebrow="Waarom dit anders is" />
      <div className="mt-12 grid grid-cols-12 gap-x-6">
        <div className="col-span-12 md:col-span-8 md:col-start-3">
          <h2
            className="text-[clamp(2rem,4vw,3.4rem)] leading-[1.08] tracking-[-0.015em]"
            style={{ fontFamily: DISPLAY, fontWeight: 400 }}
          >
            Niet iedere Emma is dezelfde Emma.
          </h2>
          <div
            className="mt-8 max-w-[60ch] space-y-5 text-[17px] leading-[1.65]"
            style={{ opacity: 0.85 }}
          >
            <p>
              Persoonlijk betekent voor ons meer dan een naam in een sjabloon
              vervangen. Het betekent dat de knuffel die in het verhaal eindigt
              ook echt op het bed ligt, dat de plek waar het zich afspeelt het
              straatje is waar je woont, dat het broertje of zusje dezelfde
              streken uithaalt als thuis.
            </p>
            <p>
              We gebruiken AI om dit betaalbaar te maken. Anders zou een
              schrijver per kind een week werk hebben. Maar de ingrediënten
              komen van jou: wie je kind is, wat ze meemaken, wat ze grappig
              vinden. Wij zetten ze om in een verhaal dat klopt.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// —— Section: Het boekje (full-bleed) —————————————————————————————

function BookSection() {
  return (
    <section className="relative grid grid-cols-1 gap-10 py-16 md:grid-cols-2 md:items-center md:gap-0 md:py-24">
      <div className="md:pl-8 lg:pl-16 px-8 md:px-0">
        <BookPhotoPlaceholder />
      </div>
      <div className="px-8 md:px-12 lg:pl-20 lg:pr-24">
        <p
          className="mb-4 text-[12px] uppercase tracking-[0.3em]"
          style={{ fontFamily: DISPLAY, color: PURPLE, opacity: 0.85 }}
        >
          Het boekje
        </p>
        <h2
          className="text-[clamp(2rem,4vw,3.4rem)] leading-[1.08] tracking-[-0.015em]"
          style={{ fontFamily: DISPLAY, fontWeight: 400 }}
        >
          Aan het einde van het jaar,
          <br />
          een echt boekje.
        </h2>
        <p
          className="mt-6 max-w-[48ch] text-[17px] leading-[1.65]"
          style={{ opacity: 0.82 }}
        >
          De mooiste verhalen van het afgelopen jaar, gedrukt als een echt
          kinderboek. Hardcover, gebonden, om jaren mee te doen.
        </p>
        <p
          className="mt-6 text-[22px]"
          style={{ fontFamily: HAND, color: INK, opacity: 0.7 }}
        >
          voor op het nachtkastje.
        </p>
      </div>
    </section>
  );
}

function BookPhotoPlaceholder() {
  return (
    <div
      className="flex aspect-[5/4] w-full flex-col items-center justify-center gap-3 rounded-[1px]"
      style={{
        border: `1px dashed rgba(${INK_RGB},0.3)`,
        color: `rgba(${INK_RGB},0.55)`,
        backgroundColor: `rgba(${INK_RGB},0.03)`,
      }}
    >
      <span className="text-[11px] uppercase tracking-[0.24em]">
        photography placeholder
      </span>
      <span
        className="max-w-[44ch] px-6 text-center text-[14px] italic leading-[1.55]"
        style={{ fontFamily: DISPLAY }}
      >
        real shoot required. Ouder en kind op bed, gedrukt boekje open
        tussen hen, daglicht door het raam, Apartamento-magazine register.
      </span>
    </div>
  );
}

// —— Section: Prijs ——————————————————————————————————————————————————

function Pricing() {
  return (
    <section className="relative mx-auto max-w-[1280px] px-8 py-16 md:px-16 md:py-20">
      <SectionHeader
        number="06"
        eyebrow="Wat het kost"
        heading="Een eerlijke prijs voor één avondritueel."
      />
      <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2 md:items-start md:gap-x-10">
        <PriceColumn
          eyebrow="Per maand"
          price="€7,95"
          unit="per maand"
          features={[
            "8 verhalen per maand",
            "Alle verhalen blijven bewaard",
            "Meerdere kinderen op één account",
            "Opzeggen kan elk moment",
          ]}
        />
        <PriceColumn
          eyebrow="Per jaar"
          eyebrowAccent="bespaar €16"
          price="€79"
          unit="per jaar"
          featured
          features={[
            "Eén beslissing, een heel jaar verhalen",
            "Alle verhalen blijven bewaard",
            "Meerdere kinderen op één account",
            "Opzeggen kan elk moment",
          ]}
        />
      </div>

      <p
        className="mt-12 max-w-[58ch] text-[14px] italic"
        style={{ fontFamily: DISPLAY, opacity: 0.7 }}
      >
        Een gedrukt jaarboek bestellen? Dat kan los. €29,95 per boek.
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-4">
        <PrimaryCta href="/register">
          Probeer eerst een verhaal gratis
        </PrimaryCta>
        <span className="max-w-[42ch] text-[14px]" style={{ opacity: 0.7 }}>
          Geen creditcard nodig. Je eerste verhaal is binnen drie minuten klaar.
        </span>
      </div>
    </section>
  );
}

function PriceColumn({
  eyebrow,
  eyebrowAccent,
  price,
  unit,
  features,
  featured,
}: {
  eyebrow: string;
  eyebrowAccent?: string;
  price: string;
  unit: string;
  features: string[];
  featured?: boolean;
}) {
  const inner = (
    <>
      <div className="flex items-baseline gap-3">
        <p
          className="text-[12px] uppercase tracking-[0.24em]"
          style={{ fontFamily: DISPLAY, color: INK, opacity: 0.7 }}
        >
          {eyebrow}
        </p>
        {eyebrowAccent && (
          <span
            className="text-[12px] uppercase tracking-[0.18em]"
            style={{ fontFamily: DISPLAY, color: INK }}
          >
            · {eyebrowAccent}
          </span>
        )}
      </div>
      <div className="mt-6 flex items-baseline gap-3">
        <span
          className="text-[clamp(2.6rem,5vw,3.8rem)] leading-none tabular-nums"
          style={{ fontFamily: DISPLAY, color: INK, fontWeight: 400 }}
        >
          {price}
        </span>
        <span className="text-[14px]" style={{ color: INK, opacity: 0.7 }}>
          {unit}
        </span>
      </div>
      <ul
        className="mt-8 space-y-3 text-[15.5px] leading-[1.6]"
        style={{ color: INK, opacity: 0.85 }}
      >
        {features.map((f) => (
          <li key={f} className="flex gap-3">
            <span
              aria-hidden
              className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: INK, opacity: 0.5 }}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </>
  );

  if (featured) {
    return (
      <div className="relative">
        <p
          className="mb-3 text-[19px] leading-none"
          style={{ fontFamily: HAND, color: INK, opacity: 0.7 }}
        >
          de meeste ouders kiezen dit
        </p>
        <div
          className="rounded-[2px] p-7 md:p-9"
          style={{ border: `1px solid rgba(${INK_RGB},0.45)` }}
        >
          {inner}
        </div>
      </div>
    );
  }

  return <div className="md:px-2 md:pt-[68px]">{inner}</div>;
}

// —— Section: Ouders vertellen ————————————————————————————————————

function Testimonial() {
  // TODO[copy]: replace placeholder with one real parent quote, ~30–40 woorden,
  // over een specifiek moment. Geen generieke lof. Wacht op echte ouderreacties.
  return (
    <section className="relative mx-auto max-w-[1280px] px-8 py-20 md:px-16 md:py-28">
      <SectionHeader number="07" eyebrow="Ouders vertellen" />
      <div className="mt-12 grid grid-cols-12 gap-x-6">
        <blockquote className="col-span-12 md:col-span-9 md:col-start-3">
          <p
            className="text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[1.35] tracking-[-0.005em]"
            style={{ fontFamily: DISPLAY, fontWeight: 400 }}
          >
            {"„[TESTIMONIAL PLACEHOLDER. Een echt ouderquote, ongeveer 30 tot 40 woorden, over een specifiek moment. Geen generieke lof. Wacht op echte ouderreacties.]”"}
          </p>
          <footer className="mt-6 text-[14px]" style={{ opacity: 0.7 }}>
            [Naam], moeder van [Kindnaam] (4)
          </footer>
        </blockquote>
      </div>
    </section>
  );
}

// —— Section: Slot-CTA ——————————————————————————————————————————————

function FinalCta() {
  return (
    <section className="relative mx-auto max-w-[1280px] px-8 py-20 md:px-16 md:py-28">
      <SectionHeader number="08" eyebrow="Begin vanavond" />
      <div className="mt-12 grid grid-cols-12 gap-x-6">
        <div className="col-span-12 md:col-span-9 md:col-start-3">
          <h2
            className="text-[clamp(2.6rem,5.4vw,4.6rem)] leading-[1.04] tracking-[-0.015em]"
            style={{ fontFamily: DISPLAY, fontWeight: 400 }}
          >
            Begin vanavond.
          </h2>
          <p
            className="mt-6 max-w-[52ch] text-[17px] leading-[1.65]"
            style={{ opacity: 0.82 }}
          >
            Eén gratis verhaal, voor het slapengaan van vanavond. Het is in
            drie minuten klaar.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            <PrimaryCta href="/register">
              Probeer een verhaal gratis
            </PrimaryCta>
            <span
              className="text-[22px] leading-none"
              style={{ fontFamily: HAND, color: INK, opacity: 0.7 }}
            >
              vanavond nog voorlezen
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// —— Shared bits ———————————————————————————————————————————————————

function SectionHeader({
  number,
  eyebrow,
  heading,
}: {
  number: string;
  eyebrow: string;
  heading?: string;
}) {
  return (
    <header className="grid grid-cols-12 gap-x-6">
      <div className="col-span-12 md:col-span-2">
        <span
          className="text-[12px] tabular-nums"
          style={{ fontFamily: DISPLAY, color: AMBER }}
        >
          {number}
        </span>
      </div>
      <div className="col-span-12 md:col-span-10">
        <p
          className="text-[13px] italic"
          style={{ fontFamily: DISPLAY, opacity: 0.6 }}
        >
          {eyebrow}
        </p>
        {heading && (
          <h2
            className="mt-2 text-[clamp(1.8rem,3.4vw,2.8rem)] leading-[1.1] tracking-[-0.01em]"
            style={{ fontFamily: DISPLAY, fontWeight: 400 }}
          >
            {heading}
          </h2>
        )}
      </div>
    </header>
  );
}

function SectionFurniture({
  number,
  eyebrow,
  tail,
}: {
  number: string;
  eyebrow: string;
  tail: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span
        className="text-[11px] uppercase tracking-[0.24em]"
        style={{ opacity: 0.55 }}
      >
        {eyebrow}
      </span>
      <span
        className="text-[12px] tabular-nums"
        style={{ fontFamily: DISPLAY }}
      >
        <span style={{ color: AMBER }}>{number}</span>
        <span style={{ color: INK, opacity: 0.55 }}>
          &nbsp;—&nbsp; {tail}
        </span>
      </span>
    </div>
  );
}

function PrimaryCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center rounded-full px-7 py-3.5 text-[15px] font-medium tracking-wide transition-transform duration-300 hover:-translate-y-[1px]"
      style={{
        backgroundColor: PURPLE,
        color: CREAM,
        boxShadow: `0 1px 0 rgba(${INK_RGB},0.10)`,
      }}
    >
      {children}
      <span
        aria-hidden
        className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-[3px]"
      >
        →
      </span>
    </Link>
  );
}
