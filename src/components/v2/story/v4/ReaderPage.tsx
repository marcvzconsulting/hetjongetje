"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { V2 } from "@/components/v2/tokens";
import type {
  CoverUnit,
  DisplayTextUnit,
  DisplayUnit,
  EndingUnit,
  ReaderIllustration,
} from "@/lib/story/reader-units";
import {
  CARD_PAD_BOTTOM,
  CARD_PAD_TOP,
  CARD_PAD_X,
  CARD_TOP_GAP,
  LINE_HEIGHT_LANDSCAPE,
  LINE_HEIGHT_PORTRAIT,
  TEXT_MAX_EM,
  insetFor,
  px,
  textBox,
  type ReaderLayout,
} from "./layout";
import { PAPER_NOISE, type ReaderPalette } from "./palette";
import { WORD_STYLE, dropcapStyle, textBlockStyle } from "./text-style";

type PageProps = {
  unit: DisplayUnit;
  layout: ReaderLayout;
  c: ReaderPalette;
  childName: string;
  /** Romeins paginanummer van deze eenheid. */
  roman: string;
  /** Index (binnen de hele paginatekst) van het voorgelezen woord. */
  activeWord: number | null;
  reducedMotion: boolean;
  readOnly: boolean;
  /** Laad de illustratie met voorrang (de zichtbare pagina). */
  eager: boolean;
  /** Aandeel van de hoogte voor de illustratie (staande lay-out). */
  imageShare: number;
};

/**
 * Eén pagina-eenheid (kaft, verhaalpagina of einde) in de lay-out die bij
 * de oriëntatie hoort. Bevat geen bediening en geen eigen state, zodat
 * dezelfde pagina ook als wegdraaiend blad getoond kan worden.
 */
export function ReaderPage(props: PageProps) {
  return props.layout.orientation === "landscape" ? (
    <LandscapePage {...props} />
  ) : (
    <PortraitPage {...props} />
  );
}

// ── Staand: illustratie boven, tekstkaart eronder ──────────────

function PortraitPage(props: PageProps) {
  const { unit, layout, c, readOnly, imageShare: share } = props;
  const inset = insetFor(layout, unit.kind, readOnly);
  const scroll = unit.kind === "text" && unit.scroll === true;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: c.bg,
        color: c.ink,
        fontFamily: V2.body,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "relative",
          flex: `0 0 ${share * 100}%`,
          overflow: "hidden",
        }}
      >
        <Illustration {...props} sizes="100vw" />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: c.stackGrad,
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: `${CARD_TOP_GAP}px ${layout.cardMarginX}px ${inset}px`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: layout.cardMaxWidth,
            maxHeight: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            background: c.card,
            borderRadius: 6,
            padding: `${CARD_PAD_TOP}px ${CARD_PAD_X}px ${CARD_PAD_BOTTOM}px`,
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: c.grain,
              backgroundImage: PAPER_NOISE,
              mixBlendMode: "multiply",
            }}
          />
          {unit.kind === "cover" && (
            <CoverContent unit={unit} layout={layout} c={c} />
          )}
          {unit.kind === "text" && (
            <>
              <StoryText {...props} unit={unit} scroll={scroll} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 12,
                  flex: "none",
                }}
              >
                <span
                  style={{
                    fontFamily: V2.display,
                    fontStyle: "italic",
                    fontSize: 12,
                    lineHeight: "18px",
                    color: c.mute,
                  }}
                >
                  {props.roman}
                </span>
              </div>
            </>
          )}
          {unit.kind === "ending" && (
            <div style={{ textAlign: "center", padding: "6px 0 4px" }}>
              <EndingContent
                unit={unit}
                layout={layout}
                c={c}
                childName={props.childName}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Liggend: tekst en illustratie naast elkaar ─────────────────

function LandscapePage(props: PageProps) {
  const { unit, layout, c } = props;
  // Verhaalpagina's wisselen van kant: 1 tekst links, 2 tekst rechts, …
  // Delen van dezelfde pagina blijven aan dezelfde kant. Kaft en einde
  // hebben de illustratie altijd links.
  const textLeft = unit.kind === "text" && unit.storyPage % 2 === 1;

  const image = (
    <>
      <Illustration {...props} sizes="50vw" />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(20,20,46,0.18) 100%)",
        }}
      />
    </>
  );

  let content: ReactNode;
  if (unit.kind === "text") {
    content = (
      <TextColumn {...props} unit={unit} side={textLeft ? "left" : "right"} />
    );
  } else if (unit.kind === "cover") {
    content = (
      <div
        style={{
          height: "100%",
          boxSizing: "border-box",
          padding: `${layout.colPadTop}px 28px ${layout.colPadBottom}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <CoverContent unit={unit} layout={layout} c={c} spread />
      </div>
    );
  } else {
    content = (
      <div
        style={{
          height: "100%",
          boxSizing: "border-box",
          padding: `${layout.colPadTop}px 28px ${layout.colPadBottom + 40}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <EndingContent
          unit={unit}
          layout={layout}
          c={c}
          childName={props.childName}
          spread
        />
      </div>
    );
  }

  const half: CSSProperties = {
    position: "relative",
    width: "50%",
    height: "100%",
    overflow: "hidden",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        overflow: "hidden",
        background: c.bg,
        color: c.ink,
        fontFamily: V2.body,
      }}
    >
      <div style={half}>{textLeft ? content : image}</div>
      <div style={half}>{textLeft ? image : content}</div>
    </div>
  );
}

function TextColumn(
  props: PageProps & { unit: DisplayTextUnit; side: "left" | "right" },
) {
  const { unit, layout, side } = props;
  const scroll = unit.scroll === true;
  const left = side === "left" ? layout.colPadOuter : layout.colPadInner;
  const right = side === "left" ? layout.colPadInner : layout.colPadOuter;
  return (
    <div
      style={{
        height: "100%",
        boxSizing: "border-box",
        padding: `${layout.colPadTop}px ${right}px ${layout.colPadBottom}px ${left}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <StoryText {...props} scroll={scroll} />
    </div>
  );
}

// ── Verhaaltekst ───────────────────────────────────────────────

function StoryText({
  unit,
  layout,
  c,
  activeWord,
  reducedMotion,
  scroll,
  imageShare,
}: PageProps & { unit: DisplayTextUnit; scroll: boolean }) {
  const landscape = layout.orientation === "landscape";
  const { start, end } = unit.part;
  const dropcap = unit.dropcap && start === 0;
  const visible = unit.words.slice(start, end);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLSpanElement | null>(null);
  const activeInPart =
    activeWord !== null && activeWord >= start && activeWord < end
      ? activeWord
      : null;

  // Scrollende tekst: houd het voorgelezen woord in beeld.
  useEffect(() => {
    if (!scroll || activeInPart === null) return;
    const box = boxRef.current;
    const word = activeRef.current;
    if (!box || !word) return;
    const top = word.offsetTop - box.offsetTop;
    const bottom = top + word.offsetHeight;
    const margin = word.offsetHeight * 1.5;
    if (top < box.scrollTop + margin || bottom > box.scrollTop + box.clientHeight - margin) {
      box.scrollTo({
        top: Math.max(0, top - box.clientHeight / 3),
        behavior: reducedMotion ? "auto" : "smooth",
      });
    }
  }, [scroll, activeInPart, reducedMotion]);

  const box = textBox(layout, unit.fontPx, imageShare);

  return (
    <div
      ref={boxRef}
      style={{
        ...(textBlockStyle(
          unit.fontPx,
          landscape ? LINE_HEIGHT_LANDSCAPE : LINE_HEIGHT_PORTRAIT,
        ) as CSSProperties),
        position: "relative",
        width: "100%",
        maxWidth: landscape ? `${TEXT_MAX_EM}em` : undefined,
        color: c.ink,
        ...(scroll
          ? {
              maxHeight: box.height,
              overflowY: "auto",
              overscrollBehavior: "contain",
              touchAction: "pan-y",
              // Zachte rand onderin: er staat nog tekst onder.
              maskImage:
                "linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%)",
              paddingBottom: 20,
              boxSizing: "border-box",
            }
          : null),
      }}
    >
      {/* Schermlezers krijgen de lopende tekst; de losse woordblokjes
          (met afgesplitste beginletter) zijn alleen voor het oog. */}
      <span className="sr-only">{visible.join(" ")}</span>
      <span aria-hidden>
        {dropcap && (
          <span style={dropcapStyle(c.goldDeep, c.gold) as CSSProperties}>
            {visible[0]?.charAt(0)}
          </span>
        )}
        {visible.map((word, k) => {
          const index = start + k;
          const active = index === activeInPart;
          return (
            <span
              key={index}
              ref={active ? activeRef : undefined}
              style={{
                ...(WORD_STYLE as CSSProperties),
                background: active ? c.word : "transparent",
                transition: reducedMotion ? "none" : "background .12s",
              }}
            >
              {dropcap && k === 0 ? word.slice(1) : word}
            </span>
          );
        })}
      </span>
    </div>
  );
}

// ── Kaft ───────────────────────────────────────────────────────

function CoverContent({
  unit,
  layout,
  c,
  spread = false,
}: {
  unit: CoverUnit;
  layout: ReaderLayout;
  c: ReaderPalette;
  /** Liggende lay-out: kleinere maten, verdeeld over de hoogte. */
  spread?: boolean;
}) {
  const mono: CSSProperties = {
    display: "block",
    fontFamily: V2.mono,
    textTransform: "uppercase",
  };
  return (
    <>
      <span
        style={{
          ...mono,
          fontSize: 10,
          letterSpacing: "0.22em",
          color: c.tag,
          marginBottom: spread ? 0 : 14,
        }}
      >
        {unit.tag}
      </span>
      <div>
        <h1
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: px(layout, spread ? 26 : 32),
            letterSpacing: spread ? -0.8 : -0.9,
            lineHeight: 1.06,
            margin: 0,
            textWrap: "pretty",
            color: c.ink,
          }}
        >
          {unit.title}
        </h1>
        <Flourish c={c} margin={spread ? "10px 0" : "14px 0"} />
        {unit.subtitle && (
          <p
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: px(layout, spread ? 14 : 15),
              color: c.soft,
              margin: spread ? 0 : "0 0 18px",
              lineHeight: 1.4,
            }}
          >
            {unit.subtitle}
          </p>
        )}
      </div>
      <span
        style={{
          ...mono,
          textTransform: "none",
          fontSize: 9,
          letterSpacing: "0.2em",
          color: c.mute,
          lineHeight: 1.7,
        }}
      >
        {unit.dateLabel ?? "ONS VERHAALTJE"}
        <br />
        {/* AI Act art. 50: zichtbare AI-vermelding, als colofon. */}
        VERHAAL &amp; ILLUSTRATIES MET AI GEMAAKT
      </span>
    </>
  );
}

// ── Einde ──────────────────────────────────────────────────────

function EndingContent({
  unit,
  layout,
  c,
  childName,
  spread = false,
}: {
  unit: EndingUnit;
  layout: ReaderLayout;
  c: ReaderPalette;
  childName: string;
  spread?: boolean;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: px(layout, spread ? 17 : 19),
          color: c.soft,
          lineHeight: 1.5,
          margin: "0 auto 14px",
          maxWidth: spread ? "30ch" : "28ch",
        }}
      >
        {unit.text}
      </div>
      <Flourish c={c} center margin={spread ? "0 0 10px" : "0 0 12px"} />
      <div
        style={{
          fontFamily: V2.mono,
          fontSize: 9,
          letterSpacing: "0.24em",
          color: c.mute,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Welterusten,
      </div>
      <div
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: px(layout, spread ? 30 : 34),
          color: c.goldDeep,
          letterSpacing: spread ? -0.6 : -0.7,
          lineHeight: 1,
        }}
      >
        {childName}
      </div>
      {unit.sign && (
        <div
          style={{
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: px(layout, spread ? 13 : 14),
            color: c.mute,
            marginTop: 14,
          }}
        >
          {unit.sign}
        </div>
      )}
    </>
  );
}

function Flourish({
  c,
  center = false,
  margin,
}: {
  c: ReaderPalette;
  center?: boolean;
  margin: string;
}) {
  const line: CSSProperties = {
    width: center ? 22 : 26,
    height: 1,
    background: c.gold,
  };
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        gap: 8,
        margin,
      }}
    >
      <span style={line} />
      <span
        style={{
          width: 6,
          height: 6,
          background: c.gold,
          transform: "rotate(45deg)",
        }}
      />
      {center && <span style={line} />}
    </div>
  );
}

// ── Illustratie ────────────────────────────────────────────────

function Illustration({
  unit,
  c,
  readOnly,
  eager,
  sizes,
}: PageProps & { sizes: string }) {
  const image: ReaderIllustration | null = unit.image;

  if (image?.url) {
    return (
      <Image
        src={image.url}
        alt={image.description || "Illustratie bij het verhaal"}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        style={{
          objectFit: "cover",
          objectPosition: "50% 40%",
          filter: c.imgFilter,
        }}
      />
    );
  }

  // Geen illustratie. Op de eindpagina hoort dat er soms bij (een
  // verhaal zonder slotbeeld); elders is de illustratie mislukt.
  const missing = unit.kind !== "ending";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: c.night ? V2.nightSoft : V2.paperDeep,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 28px",
        textAlign: "center",
      }}
    >
      {!c.night && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: PAPER_NOISE,
            mixBlendMode: "multiply",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          width: 28,
          height: 28,
          background: c.night ? "transparent" : V2.goldSoft,
          border: `1px solid ${c.gold}`,
          transform: "rotate(45deg)",
          marginBottom: missing ? 18 : 0,
        }}
      />
      {missing && (
        <>
          <div
            style={{
              fontFamily: V2.ui,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: c.goldDeep,
              marginBottom: 10,
            }}
          >
            Illustratie ontbreekt
          </div>
          <div
            style={{
              fontFamily: V2.body,
              fontSize: 13,
              color: c.mute,
              lineHeight: 1.5,
              maxWidth: 340,
            }}
          >
            {readOnly
              ? "Deze illustratie kon niet gemaakt worden."
              : "Geen zorgen: je credit is teruggezet, je kunt het verhaal opnieuw laten maken."}
          </div>
        </>
      )}
    </div>
  );
}
