import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { EBtnSubmit } from "@/components/v2/EBtnSubmit";
import {
  closeContactMessageAction,
  reopenContactMessageAction,
} from "./actions";

type SearchParams = Promise<{ status?: string }>;

const PAGE_SIZE = 100;

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function StatusPill({ status }: { status: string }) {
  const isOpen = status === "open";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        background: isOpen ? V2.goldSoft : V2.paperDeep,
        color: isOpen ? V2.goldDeep : V2.inkMute,
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {isOpen ? "Open" : "Afgehandeld"}
    </span>
  );
}

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = params.status === "closed" ? "closed" : "open";

  const where: Prisma.ContactMessageWhereInput = { status };

  const [messages, openCount, closedCount] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.contactMessage.count({ where: { status: "open" } }),
    prisma.contactMessage.count({ where: { status: "closed" } }),
  ]);

  const session = await auth();
  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin/inbox",
    badge: n.href === "/admin/inbox" && openCount > 0 ? openCount : undefined,
  }));

  return (
    <AdminShell
      section="Klantcontact"
      title={
        <>
          Inkomende <span style={{ fontStyle: "italic" }}>berichten</span>
        </>
      }
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 14,
          color: V2.inkSoft,
          marginBottom: 24,
          maxWidth: 720,
          lineHeight: 1.55,
        }}
      >
        Berichten via het contactformulier op /contact. Replies op
        e-mails naar info@ vallen hier nog niet in — die staan
        rechtstreeks in je inbox. Markeer berichten als afgehandeld
        zodra je gereageerd hebt; dan vallen ze uit de open-lijst.
      </p>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${V2.paperShade}`,
          marginBottom: 28,
        }}
      >
        {(
          [
            { key: "open", label: "Open", count: openCount },
            { key: "closed", label: "Afgehandeld", count: closedCount },
          ] as const
        ).map((tab) => {
          const active = status === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/admin/inbox?status=${tab.key}`}
              style={{
                padding: "12px 20px",
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? V2.ink : V2.inkMute,
                borderBottom: `2px solid ${active ? V2.gold : "transparent"}`,
                marginBottom: -1,
                textDecoration: "none",
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              {tab.label}
              <span
                style={{
                  fontFamily: V2.mono,
                  fontSize: 11,
                  color: V2.inkMute,
                }}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {messages.length === 0 ? (
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 14,
            color: V2.inkMute,
            margin: 0,
            padding: "32px 0",
          }}
        >
          {status === "open"
            ? "Geen open berichten — heerlijk."
            : "Nog geen afgehandelde berichten."}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.map((m) => (
            <li
              key={m.id}
              style={{
                background: V2.paper,
                border: `1px solid ${V2.paperShade}`,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 16,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: V2.body,
                      fontSize: 16,
                      color: V2.ink,
                      fontWeight: 500,
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      fontFamily: V2.mono,
                      fontSize: 12,
                      color: V2.inkMute,
                      marginTop: 4,
                      letterSpacing: "0.02em",
                    }}
                  >
                    <a
                      href={`mailto:${m.email}`}
                      style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}
                    >
                      {m.email}
                    </a>
                    {" · "}
                    {formatDateTime(m.createdAt)}
                    {m.ip && ` · ${m.ip}`}
                  </div>
                </div>
                <StatusPill status={m.status} />
              </div>

              <p
                style={{
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.ink,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.6,
                  margin: "0 0 16px",
                  maxWidth: "70ch",
                }}
              >
                {m.body}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <a
                  href={`mailto:${m.email}?subject=${encodeURIComponent(
                    "Re: jouw bericht via Ons Verhaaltje",
                  )}`}
                  style={{
                    padding: "8px 16px",
                    background: V2.ink,
                    color: V2.paper,
                    border: "none",
                    fontFamily: V2.ui,
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: 0.2,
                    textDecoration: "none",
                  }}
                >
                  Beantwoorden →
                </a>

                {m.status === "open" ? (
                  <form action={closeContactMessageAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <EBtnSubmit
                      kind="ghost"
                      size="sm"
                      pendingLabel="Sluiten…"
                    >
                      Markeer afgehandeld
                    </EBtnSubmit>
                  </form>
                ) : (
                  <form action={reopenContactMessageAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <EBtnSubmit
                      kind="ghost"
                      size="sm"
                      pendingLabel="Heropenen…"
                    >
                      Heropen
                    </EBtnSubmit>
                  </form>
                )}

                {m.closedAt && (
                  <span
                    style={{
                      fontFamily: V2.mono,
                      fontSize: 11,
                      color: V2.inkMute,
                      letterSpacing: "0.04em",
                    }}
                  >
                    afgehandeld {formatDateTime(m.closedAt)}
                    {m.closedBy && ` door ${m.closedBy}`}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {messages.length === PAGE_SIZE && (
        <p
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            color: V2.inkMute,
            marginTop: 20,
            letterSpacing: "0.06em",
          }}
        >
          Eerste {PAGE_SIZE} getoond — pagineer-knoppen volgen later als de inbox echt voller wordt.
        </p>
      )}
    </AdminShell>
  );
}
