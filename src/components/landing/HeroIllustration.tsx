import { DISPLAY } from "./tokens";

type Props = {
  alt: string;
  caption: string;
  src?: string;
};

export function HeroIllustration({
  alt,
  caption,
  src = "/design-exploration/hero-illustration.png",
}: Props) {
  const vignette =
    "radial-gradient(ellipse 68% 74% at 50% 47%, black 52%, transparent 92%)";
  return (
    <figure className="relative">
      <div
        className="relative w-full"
        style={{
          aspectRatio: "1 / 1",
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
        />
      </div>
      <figcaption
        className="mt-2 max-w-[34ch] text-[13px] italic leading-[1.55] md:pl-2"
        style={{ fontFamily: DISPLAY, opacity: 0.6 }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}
