"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn, IconV2 } from "@/components/v2";
import { StarField } from "@/components/v2/StarField";
import { BookMiniPreview, type MiniSpread } from "./BookMiniPreview";
import { saveBookDraft } from "@/app/(app)/book/[childId]/actions";

export type BookStoryData = {
  id: string;
  title: string;
  createdAt: string;
  pageCount: number;
  firstIllustrationUrl: string | null;
  firstParagraph: string;
};

export type BookDraft = {
  title: string;
  subtitle: string;
  dedication: string;
  coverStyle: "night" | "cream" | "linen";
  format: "soft" | "hard" | "deluxe";
  selectedStoryIds: string[];
};

type Props = {
  childId: string;
  childName: string;
  stories: BookStoryData[];
  initialDraft: BookDraft | null;
};

type Format = {
  id: "soft" | "hard" | "deluxe";
  t: string;
  s: string;
  p: number;
  d: string;
  popular?: boolean;
};

const FORMATS: Format[] = [
  { id: "soft", t: "Zachte kaft", s: "15 × 21 cm", p: 29, d: "ingenaaid, matlaminaat" },
  { id: "hard", t: "Harde kaft", s: "17 × 24 cm", p: 49, d: "linnen met folieletters", popular: true },
  { id: "deluxe", t: "Verzamelband", s: "21 × 28 cm", p: 79, d: "linnen + leeslint + sleeve" },
];

const COVER_STYLES: { id: "night" | "cream" | "linen"; t: string }[] = [
  { id: "night", t: "Nacht" },
  { id: "cream", t: "Crème" },
  { id: "linen", t: "Linnen" },
];

export function BookBuilderV2({
  childId,
  childName,
  stories,
  initialDraft,
}: Props) {
  const storyIds = useMemo(() => stories.map((s) => s.id), [stories]);
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (initialDraft) {
      // Only keep ids that still exist in the current stories list
      return new Set(
        initialDraft.selectedStoryIds.filter((id) => storyIds.includes(id))
      );
    }
    return new Set(storyIds);
  });
  const [title, setTitle] = useState(
    initialDraft?.title ?? `Het jaar van ${childName}`
  );
  const [subtitle, setSubtitle] = useState(
    initialDraft?.subtitle || "een verzameling verhalen"
  );
  const [dedication, setDedication] = useState(
    initialDraft?.dedication ||
      `Voor ${childName},\nzodat je later, veel later,\nnog weet wat je vroeg aan de maan.\n\n— mama & papa, 2026`
  );
  const [format, setFormat] = useState<Format["id"]>(
    initialDraft?.format ?? "hard"
  );
  const [coverStyle, setCoverStyle] = useState<
    (typeof COVER_STYLES)[number]["id"]
  >(initialDraft?.coverStyle ?? "night");
  const [orderModal, setOrderModal] = useState(false);

  // ── Auto-save draft ───────────────────────────────────────────
  type SaveStatus = "idle" | "saving" | "saved" | "error";
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const lastSentRef = useRef<string>(
    initialDraft ? serializeDraft(initialDraft) : ""
  );
  const firstRenderRef = useRef(true);

  useEffect(() => {
    // Skip save on mount — we just loaded the data
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    const payload: BookDraft = {
      title,
      subtitle,
      dedication,
      coverStyle,
      format,
      selectedStoryIds: Array.from(selected),
    };
    const key = serializeDraft(payload);
    if (key === lastSentRef.current) return;

    const t = setTimeout(async () => {
      setSaveStatus("saving");
      const res = await saveBookDraft({ childId, ...payload });
      if (res.ok) {
        lastSentRef.current = key;
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [
    childId,
    title,
    subtitle,
    dedication,
    coverStyle,
    format,
    selected,
  ]);

  const selectedStories = useMemo(
    () => stories.filter((s) => selected.has(s.id)),
    [stories, selected]
  );

  const totalStoryPages = selectedStories.reduce(
    (a, s) => a + s.pageCount,
    0
  );
  const extras = 16; // cover, dedication, toc, colophon etc.
  const totalPages = totalStoryPages + extras;

  const chosenFormat = FORMATS.find((f) => f.id === format)!;
  const shipping = 4.95;
  const total = chosenFormat.p + shipping;

  function toggleStory(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // Build mini-preview spreads
  const miniSpreads = useMemo<MiniSpread[]>(() => {
    if (selectedStories.length === 0) return [];
    const spreads: MiniSpread[] = [];
    spreads.push({
      type: "cover",
      title,
      childName,
      storyCount: selectedStories.length,
    });
    spreads.push({ type: "dedication", text: dedication });
    let page = 3;
    const tocItems: { title: string; startPage: number }[] = [];
    for (const s of selectedStories) {
      tocItems.push({ title: s.title, startPage: page });
      page += s.pageCount;
    }
    spreads.push({ type: "toc", items: tocItems });
    let pageCursor = 5;
    for (const s of selectedStories) {
      spreads.push({
        type: "story",
        illustrationUrl: s.firstIllustrationUrl,
        title: s.title,
        firstParagraph: s.firstParagraph,
        pageL: pageCursor,
        pageR: pageCursor + 1,
      });
      pageCursor += s.pageCount;
    }
    spreads.push({ type: "colophon", year: "2026" });
    return spreads;
  }, [selectedStories, title, dedication, childName]);

  return (
    <>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 40px 80px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 340px",
          gap: 48,
        }}
      >
        {/* LEFT — content */}
        <div>
          {/* Save status indicator */}
          <div
            style={{
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: `1px solid ${V2.paperShade}`,
              textAlign: "right",
            }}
          >
            <SaveIndicator status={saveStatus} />
          </div>

          {/* Story selector */}
          <section style={{ marginBottom: 56 }}>
            <SectionHeader
              kicker="Stap I — De inhoud"
              title="Welke verhalen mogen mee?"
              meta={`${selected.size} VAN ${stories.length} GEKOZEN`}
            />
            {stories.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  border: `1px dashed ${V2.paperShade}`,
                  fontFamily: V2.display,
                  fontStyle: "italic",
                  color: V2.inkMute,
                  textAlign: "center",
                }}
              >
                Nog geen verhalen om te bundelen. Maak eerst een paar
                verhalen voor {childName}.
              </div>
            ) : (
              <div style={{ border: `1px solid ${V2.paperShade}` }}>
                {stories.map((s, i) => {
                  const on = selected.has(s.id);
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "48px 1fr auto",
                        gap: 20,
                        alignItems: "center",
                        padding: "14px 20px",
                        borderTop: i === 0 ? "none" : `1px solid ${V2.paperShade}`,
                        background: on ? V2.paper : V2.paperDeep,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 48,
                          background: V2.night,
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {s.firstIllustrationUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.firstIllustrationUrl}
                            alt={s.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 6,
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: V2.gold,
                              opacity: 0.9,
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: V2.display,
                            fontSize: 18,
                            fontStyle: "italic",
                            fontWeight: 400,
                            color: V2.ink,
                          }}
                        >
                          {s.title}
                        </div>
                        <div
                          style={{
                            fontFamily: V2.mono,
                            fontSize: 10,
                            color: V2.inkMute,
                            letterSpacing: "0.1em",
                            marginTop: 4,
                            textTransform: "uppercase",
                          }}
                        >
                          {new Date(s.createdAt).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          · {s.pageCount} BLZ
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStory(s.id)}
                        aria-label={on ? "Uit boek halen" : "Aan boek toevoegen"}
                        style={{
                          width: 24,
                          height: 24,
                          border: `1.5px solid ${on ? V2.ink : V2.paperShade}`,
                          background: on ? V2.ink : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {on && (
                          <IconV2 name="check" size={14} color={V2.paper} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Mini-preview */}
          {selectedStories.length > 0 && (
            <section style={{ marginBottom: 56 }}>
              <SectionHeader
                kicker="Voorproef — zo wordt je boek"
                title="Blader er alvast doorheen"
              />
              <BookMiniPreview spreads={miniSpreads} />
            </section>
          )}

          {/* Cover */}
          <section style={{ marginBottom: 56 }}>
            <SectionHeader
              kicker="Stap II — De kaft"
              title="Wat komt er op de voorkant?"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 32,
                alignItems: "flex-start",
              }}
            >
              <CoverPreview
                title={title}
                childName={childName}
                storyCount={selectedStories.length}
                totalPages={totalPages}
                coverStyle={coverStyle}
              />
              <div>
                <LabeledInput
                  label="Titel"
                  value={title}
                  onChange={setTitle}
                  italic
                />
                <LabeledInput
                  label="Ondertitel"
                  value={subtitle}
                  onChange={setSubtitle}
                />
                <div style={{ marginBottom: 28 }}>
                  <FieldLabel>Stijl</FieldLabel>
                  <div
                    style={{
                      display: "flex",
                      border: `1px solid ${V2.paperShade}`,
                    }}
                  >
                    {COVER_STYLES.map((o, i) => {
                      const active = coverStyle === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setCoverStyle(o.id)}
                          style={{
                            flex: 1,
                            padding: "14px 12px",
                            textAlign: "center",
                            cursor: "pointer",
                            background: active ? V2.ink : "transparent",
                            color: active ? V2.paper : V2.ink,
                            borderLeft:
                              i > 0 ? `1px solid ${V2.paperShade}` : "none",
                            border: "none",
                            fontFamily: V2.display,
                            fontSize: 16,
                            fontStyle: active ? "italic" : "normal",
                          }}
                        >
                          {o.t}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    padding: 16,
                    background: V2.paperDeep,
                    border: `1px solid ${V2.paperShade}`,
                    fontFamily: V2.body,
                    fontSize: 13,
                    fontStyle: "italic",
                    color: V2.inkMute,
                    lineHeight: 1.5,
                  }}
                >
                  De omslag wordt in folie gedrukt op linnen. Titel staat
                  iets verhoogd, goed voelbaar.
                </div>
              </div>
            </div>
          </section>

          {/* Dedication */}
          <section style={{ marginBottom: 56 }}>
            <SectionHeader
              kicker="Stap III — Voor in het boek"
              title="Schrijf een opdracht"
            />
            <div
              style={{
                background: V2.paperDeep,
                padding: "32px 36px",
                border: `1px solid ${V2.paperShade}`,
              }}
            >
              <textarea
                value={dedication}
                onChange={(e) => setDedication(e.target.value)}
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  fontFamily: V2.display,
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: 19,
                  lineHeight: 1.7,
                  minHeight: 140,
                  resize: "vertical",
                  outline: "none",
                  color: V2.ink,
                }}
              />
            </div>
          </section>

          {/* Format */}
          <section>
            <SectionHeader
              kicker="Stap IV — Formaat"
              title="Hoe groot moet het boek worden?"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              {FORMATS.map((f) => {
                const active = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    style={{
                      padding: 24,
                      border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                      background: active ? V2.paperDeep : V2.paper,
                      position: "relative",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: V2.body,
                      color: V2.ink,
                    }}
                  >
                    {f.popular && !active && (
                      <div
                        style={{
                          position: "absolute",
                          top: -10,
                          left: 20,
                          padding: "3px 10px",
                          background: V2.ink,
                          color: V2.paper,
                          fontFamily: V2.mono,
                          fontSize: 9,
                          letterSpacing: "0.16em",
                        }}
                      >
                        POPULAIR
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: V2.display,
                        fontSize: 22,
                        fontWeight: 400,
                      }}
                    >
                      {f.t}
                    </div>
                    <div
                      style={{
                        fontFamily: V2.mono,
                        fontSize: 10,
                        color: V2.inkMute,
                        letterSpacing: "0.12em",
                        marginTop: 4,
                        textTransform: "uppercase",
                      }}
                    >
                      {f.s}
                    </div>
                    <div
                      style={{
                        fontFamily: V2.body,
                        fontSize: 13,
                        color: V2.inkMute,
                        marginTop: 12,
                        fontStyle: "italic",
                      }}
                    >
                      {f.d}
                    </div>
                    <div
                      style={{
                        fontFamily: V2.display,
                        fontSize: 28,
                        fontWeight: 300,
                        marginTop: 20,
                        color: V2.ink,
                      }}
                    >
                      €{f.p}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* RIGHT — sticky summary */}
        <aside
          style={{
            position: "sticky",
            top: 20,
            alignSelf: "flex-start",
          }}
        >
          <div
            style={{
              background: V2.paperDeep,
              border: `1px solid ${V2.paperShade}`,
              padding: 24,
            }}
          >
            <Kicker>Jouw bestelling</Kicker>
            <div
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 26,
                margin: "10px 0 24px",
                letterSpacing: -0.6,
                lineHeight: 1.15,
                color: V2.ink,
              }}
            >
              {title.split(childName)[0]}
              <span style={{ fontStyle: "italic" }}>{childName}</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                paddingBottom: 18,
                borderBottom: `1px solid ${V2.paperShade}`,
              }}
            >
              <Row l="Verhalen" r={String(selectedStories.length)} />
              <Row l="Pagina's (± excl. cover)" r={String(totalPages)} />
              <Row l="Formaat" r={`${chosenFormat.t} · ${chosenFormat.s}`} />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "18px 0",
              }}
            >
              <Row l="Boek" r={`€ ${chosenFormat.p.toFixed(2).replace(".", ",")}`} />
              <Row l="Verzending (NL)" r={`€ ${shipping.toFixed(2).replace(".", ",")}`} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: 18,
                borderTop: `1px solid ${V2.paperShade}`,
              }}
            >
              <span
                style={{
                  fontFamily: V2.display,
                  fontSize: 20,
                  fontWeight: 400,
                  color: V2.ink,
                }}
              >
                Totaal
              </span>
              <span
                style={{
                  fontFamily: V2.display,
                  fontSize: 28,
                  fontWeight: 300,
                  letterSpacing: -0.8,
                  color: V2.ink,
                }}
              >
                € {total.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <EBtn
              kind="primary"
              size="lg"
              onClick={() => setOrderModal(true)}
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 20,
                opacity: selectedStories.length > 0 ? 1 : 0.4,
                cursor: selectedStories.length > 0 ? "pointer" : "not-allowed",
              }}
            >
              Bestellen →
            </EBtn>
            <div
              style={{
                fontFamily: V2.body,
                fontStyle: "italic",
                fontSize: 12,
                color: V2.inkMute,
                textAlign: "center",
                marginTop: 14,
                lineHeight: 1.5,
              }}
            >
              We drukken op aanvraag. Levering in 7–10 werkdagen.
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 16,
              border: `1px solid ${V2.paperShade}`,
              fontFamily: V2.body,
              fontSize: 12,
              color: V2.inkMute,
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontFamily: V2.mono,
                fontSize: 10,
                letterSpacing: "0.16em",
                color: V2.goldDeep,
                marginBottom: 8,
              }}
            >
              — TIP —
            </div>
            <div style={{ fontStyle: "italic" }}>
              Maak een exemplaar voor oma en opa — dezelfde bestelling,
              ander adres. Bij de tweede geven we 20% korting.
            </div>
          </div>
        </aside>
      </div>

      {orderModal && <OrderModal onClose={() => setOrderModal(false)} />}
    </>
  );
}

// ── Sub components ──────────────────────────────────────────────

function SectionHeader({
  kicker,
  title,
  meta,
}: {
  kicker: string;
  title: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 24,
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <Kicker>{kicker}</Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 30,
            margin: "10px 0 0",
            letterSpacing: -0.7,
            color: V2.ink,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
      </div>
      {meta && (
        <span
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.12em",
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

function Row({ l, r }: { l: string; r: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <span
        style={{
          fontFamily: V2.body,
          fontSize: 13,
          color: V2.inkSoft,
        }}
      >
        {l}
      </span>
      <span
        style={{
          fontFamily: V2.display,
          fontSize: 14,
          color: V2.ink,
        }}
      >
        {r}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: V2.inkMute,
        display: "block",
        marginBottom: 8,
      }}
    >
      {children}
    </label>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  italic,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  italic?: boolean;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 0",
          border: "none",
          borderBottom: `1px solid ${V2.paperShade}`,
          fontSize: italic ? 18 : 15,
          fontFamily: italic ? V2.display : V2.body,
          fontStyle: italic ? "italic" : "normal",
          background: "transparent",
          outline: "none",
          color: V2.ink,
        }}
      />
    </div>
  );
}

function CoverPreview({
  title,
  childName,
  storyCount,
  totalPages,
  coverStyle,
}: {
  title: string;
  childName: string;
  storyCount: number;
  totalPages: number;
  coverStyle: "night" | "cream" | "linen";
}) {
  const isNight = coverStyle === "night";
  const isLinen = coverStyle === "linen";
  const bg = isNight ? V2.night : isLinen ? V2.paperDeep : V2.paper;
  const fg = isNight ? V2.paper : V2.ink;
  const accent = isNight ? V2.gold : V2.goldDeep;

  const [beforeName, afterName] = title.includes(childName)
    ? title.split(childName)
    : [title, ""];

  return (
    <div
      style={{
        aspectRatio: "3 / 4",
        background: bg,
        color: fg,
        padding: 28,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 18px 40px rgba(20,20,46,0.22)",
      }}
    >
      {isNight && <StarField count={16} />}
      {/* crescent */}
      {isNight && (
        <>
          <div
            style={{
              position: "absolute",
              top: "22%",
              right: "20%",
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: V2.gold,
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "22%",
              right: "14%",
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: V2.night,
            }}
          />
        </>
      )}
      <div style={{ position: "relative", marginTop: "56%" }}>
        <div
          style={{
            fontFamily: V2.mono,
            fontSize: 9,
            letterSpacing: "0.28em",
            color: accent,
            marginBottom: 12,
            opacity: 0.85,
          }}
        >
          — VERZAMELD MMXXVI —
        </div>
        <div
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 28,
            lineHeight: 1.02,
            letterSpacing: -0.8,
          }}
        >
          {beforeName}
          {afterName !== undefined && title.includes(childName) ? (
            <>
              <br />
              <span style={{ fontStyle: "italic" }}>{childName}</span>
              {afterName}
            </>
          ) : null}
        </div>
        <div
          style={{
            height: 1,
            background: accent,
            width: 32,
            margin: "18px 0 12px",
            opacity: 0.55,
          }}
        />
        <div
          style={{
            fontFamily: V2.mono,
            fontSize: 9,
            letterSpacing: "0.2em",
            color: accent,
            opacity: 0.7,
          }}
        >
          {storyCount} VERHALEN · {totalPages} BLZ
        </div>
      </div>
    </div>
  );
}

function serializeDraft(d: BookDraft): string {
  return JSON.stringify({
    t: d.title,
    s: d.subtitle,
    d: d.dedication,
    cs: d.coverStyle,
    f: d.format,
    ids: [...d.selectedStoryIds].sort(),
  });
}

function SaveIndicator({
  status,
}: {
  status: "idle" | "saving" | "saved" | "error";
}) {
  let label = "";
  let color: string = V2.inkMute;
  if (status === "saving") {
    label = "Opslaan…";
  } else if (status === "saved") {
    label = "✓ Opgeslagen";
    color = V2.goldDeep;
  } else if (status === "error") {
    label = "Opslaan mislukt";
    color = V2.heart;
  } else {
    label = "Automatisch opgeslagen";
  }
  return (
    <span
      style={{
        fontFamily: V2.mono,
        fontSize: 11,
        color,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

function OrderModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,20,46,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: "100%",
          background: V2.paper,
          padding: 40,
          position: "relative",
          color: V2.ink,
        }}
      >
        <Kicker>Binnenkort</Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 32,
            margin: "14px 0 16px",
            letterSpacing: -0.8,
            lineHeight: 1.1,
          }}
        >
          Het <span style={{ fontStyle: "italic" }}>bestellen</span> werkt
          nog niet.
        </h2>
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 15,
            lineHeight: 1.6,
            color: V2.inkSoft,
            margin: "0 0 24px",
          }}
        >
          We zijn bezig met de drukker. Zodra dit klaar is kun je hier je
          boekje bestellen. Je samenstelling blijft bewaard, niks gaat
          verloren.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <EBtn kind="ghost" size="md" onClick={onClose}>
            Sluiten
          </EBtn>
        </div>
      </div>
    </div>
  );
}
