import { CREAM, INK, BODY, DISPLAY, AMBER } from "./tokens";
import { fontVariables } from "./fonts";
import { PaperGrain } from "./PaperGrain";
import { PageHeader } from "./PageHeader";
import { Footer } from "./Footer";

type Props = {
  number: string;
  eyebrow: string;
  title: string;
  todo: string;
};

export function StubPage({ number, eyebrow, title, todo }: Props) {
  return (
    <div
      className={`${fontVariables} relative flex flex-1 flex-col overflow-hidden`}
      style={{ backgroundColor: CREAM, color: INK, fontFamily: BODY }}
    >
      <PaperGrain />
      <PageHeader />
      <main className="relative z-10 mx-auto w-full max-w-[1280px] flex-1 px-8 pt-20 pb-32 md:px-16 md:pt-28 md:pb-40">
        <div className="grid grid-cols-12 gap-x-6">
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
            <h1
              className="mt-2 text-[clamp(2.2rem,4.4vw,3.6rem)] leading-[1.08] tracking-[-0.015em]"
              style={{ fontFamily: DISPLAY, fontWeight: 400 }}
            >
              {title}
            </h1>
            <p
              className="mt-10 max-w-[60ch] text-[16px] italic leading-[1.65]"
              style={{ fontFamily: DISPLAY, opacity: 0.7 }}
            >
              {todo}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
