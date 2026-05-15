import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

/**
 * Open Graph preview voor een gedeeld verhaal. Geladen door social
 * crawlers (WhatsApp, Facebook, iMessage) op het moment dat iemand de
 * `/s/[token]`-link plakt.
 *
 * Satori (de renderer achter ImageResponse) ondersteunt alleen flex —
 * elke parent met >1 child heeft `display: flex` nodig.
 *
 * Runtime moet "nodejs" zijn omdat we Prisma gebruiken; edge zou alleen
 * werken via een fetch-call naar een aparte endpoint.
 */
export const runtime = "nodejs";
export const alt = "Een gepersonaliseerd verhaal — Ons Verhaaltje";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f5efe4";
const PAPER_DEEP = "#ebe2d1";
const PAPER_SHADE = "#e2d7c2";
const INK = "#1f1e3a";
const INK_SOFT = "#2e2d52";
const GOLD = "#c9a961";
const GOLD_DEEP = "#8a7340";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,32}$/;

export default async function Image({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;

  const story = TOKEN_PATTERN.test(token)
    ? await prisma.story.findFirst({
        where: { shareToken: token, status: "ready" },
        select: {
          title: true,
          childProfile: { select: { name: true } },
          pages: {
            orderBy: { pageNumber: "asc" },
            take: 1,
            select: { illustrationUrl: true },
          },
        },
      })
    : null;

  const title = story?.title ?? "Een gepersonaliseerd verhaaltje";
  const childName = story?.childProfile.name ?? "een kind";
  const cover = story?.pages[0]?.illustrationUrl ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${PAPER} 0%, ${PAPER_DEEP} 100%)`,
          fontFamily: "Georgia, serif",
          color: INK,
          position: "relative",
        }}
      >
        {/* Cover-illustratie links */}
        <div
          style={{
            display: "flex",
            width: 480,
            height: "100%",
            background: PAPER_DEEP,
            borderRight: `1px solid ${PAPER_SHADE}`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              width={480}
              height={630}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
                color: GOLD,
              }}
            >
              ✦
            </div>
          )}
        </div>

        {/* Tekst rechts */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "72px 64px",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 15,
              letterSpacing: 6,
              color: GOLD_DEEP,
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            <div style={{ width: 48, height: 1, background: GOLD_DEEP }} />
            <div style={{ display: "flex" }}>Ons Verhaaltje</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", marginTop: 40 }}>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                fontStyle: "italic",
                color: INK_SOFT,
                marginBottom: 18,
              }}
            >
              Een verhaal voor {childName}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 54,
                fontWeight: 400,
                lineHeight: 1.1,
                letterSpacing: -1,
                color: INK,
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 28,
              }}
            >
              <div style={{ width: 48, height: 1, background: GOLD }} />
              <div
                style={{
                  width: 6,
                  height: 6,
                  background: GOLD,
                  transform: "rotate(45deg)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontFamily: "monospace",
              letterSpacing: 4,
              color: INK_SOFT,
              textTransform: "uppercase",
            }}
          >
            onsverhaaltje.nl
          </div>
        </div>

        {/* Hairline frame */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 24,
            right: 24,
            bottom: 24,
            left: 24,
            border: `1px solid ${PAPER_SHADE}`,
            pointerEvents: "none",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
