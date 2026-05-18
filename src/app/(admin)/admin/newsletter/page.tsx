import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string }>;

const RANGE_PRESETS: Record<string, { label: string; days: number | "month" | "year" | "all" }> = {
  "30d": { label: "30 dagen", days: 30 },
  "90d": { label: "90 dagen", days: 90 },
  month: { label: "Deze maand", days: "month" },
  year: { label: "Dit jaar", days: "year" },
  all: { label: "Alles", days: "all" },
};

const REASON_LABELS: Record<string, string> = {
  te_vaak: "Te veel mails",
  niet_relevant: "Niet relevant",
  nooit_aangemeld: "Nooit aangemeld",
  tijdelijk: "Tijdelijke pauze",
  anders: "Anders",
};

function getRangeStart(presetKey: string): Date | null {
  const preset = RANGE_PRESETS[presetKey] ?? RANGE_PRESETS["30d"];
  const now = new Date();
  if (preset.days === "all") return null;
  if (preset.days === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (preset.days === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getTime() - (preset.days as number) * 86_400_000);
}

const th: React.CSSProperties = {
  fontFamily: V2.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: V2.inkMute,
  padding: "14px 16px",
  textAlign: "left",
  background: V2.paperDeep,
  borderBottom: `1px solid ${V2.paperShade}`,
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${V2.paperShade}`,
  fontSize: 14,
  fontFamily: V2.body,
  color: V2.ink,
  verticalAlign: "top",
};

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const presetKey = params.range && RANGE_PRESETS[params.range] ? params.range : "30d";
  const rangeStart = getRangeStart(presetKey);

  const where = rangeStart ? { createdAt: { gte: rangeStart } } : {};

  const [reasonBuckets, entries, totalUnsubscribes] = await Promise.all([
    prisma.newsletterUnsubscribeReason.groupBy({
      by: ["reason"],
      where,
      _count: { _all: true },
    }),
    prisma.newsletterUnsubscribeReason.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.newsletterSignup.count({
      where: rangeStart ? { unsubscribedAt: { gte: rangeStart } } : { unsubscribedAt: { not: null } },
    }),
  ]);

  const filledCount = reasonBuckets.reduce((s, b) => s + b._count._all, 0);
  const responseRate =
    totalUnsubscribes > 0
      ? Math.round((filledCount / totalUnsubscribes) * 100)
      : 0;

  const session = await auth();
  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin/newsletter",
  }));

  return (
    <AdminShell
      section="Klantcontact"
      title={
        <>
          Nieuwsbrief <span style={{ fontStyle: "italic" }}>afmeldingen</span>
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
          maxWidth: 720,
          marginBottom: 28,
          lineHeight: 1.55,
        }}
      >
        Waarom mensen zich afmelden voor de nieuwsbrief — survey verschijnt
        op de uitschrijfpagina, optioneel in te vullen. Antwoorden zijn
        cumulatief en append-only.
      </p>

      {/* ── Range pills ───────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
        {Object.entries(RANGE_PRESETS).map(([key, preset]) => {
          const active = key === presetKey;
          return (
            <Link
              key={key}
              href={`/admin/newsletter?range=${key}`}
              style={{
                fontFamily: V2.ui,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.04em",
                padding: "6px 12px",
                border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                background: active ? V2.ink : V2.paper,
                color: active ? V2.paper : V2.ink,
                textDecoration: "none",
              }}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>

      {/* ── Top stats ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: 40,
        }}
      >
        <StatCard label="Afmeldingen" value={String(totalUnsubscribes)} />
        <StatCard label="Met reden" value={String(filledCount)} />
        <StatCard label="Response-rate" value={`${responseRate}%`} />
      </div>

      {/* ── Reden-verdeling ───────────────────────────── */}
      {filledCount > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: 22,
              letterSpacing: -0.4,
              margin: "0 0 18px",
            }}
          >
            Reden-verdeling
          </h2>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            {[...reasonBuckets]
              .sort((a, b) => b._count._all - a._count._all)
              .map((b) => {
                const label = REASON_LABELS[b.reason] ?? b.reason;
                const pct = Math.round((b._count._all / filledCount) * 100);
                return (
                  <div
                    key={b.reason}
                    style={{
                      padding: "14px 16px",
                      background: V2.paperDeep,
                      border: `1px solid ${V2.paperShade}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: V2.ui,
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: V2.inkMute,
                        marginBottom: 6,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontFamily: V2.display,
                        fontWeight: 300,
                        fontSize: 28,
                        lineHeight: 1,
                        color: V2.ink,
                        letterSpacing: -0.6,
                      }}
                    >
                      {b._count._all}
                      <span
                        style={{
                          fontFamily: V2.mono,
                          fontSize: 12,
                          color: V2.inkMute,
                          marginLeft: 8,
                          letterSpacing: 0,
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* ── Volledige lijst ───────────────────────────── */}
      <section>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 22,
            letterSpacing: -0.4,
            margin: "0 0 18px",
          }}
        >
          Alle antwoorden ({entries.length}
          {entries.length === 200 && " — max 200"})
        </h2>

        {entries.length === 0 ? (
          <p style={{ fontStyle: "italic", color: V2.inkMute }}>
            Nog geen antwoorden in deze periode.
          </p>
        ) : (
          <div className="adm-cards-wrap" style={{ overflowX: "auto", background: V2.paper, border: `1px solid ${V2.paperShade}` }}>
            <table className="adm-cards" style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontFamily: V2.body }}>
              <thead>
                <tr>
                  <th style={th}>Wanneer</th>
                  <th style={th}>Reden</th>
                  <th style={th}>Toelichting</th>
                  <th style={th}>E-mail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td style={{ ...td, fontFamily: V2.mono, fontSize: 12, color: V2.inkSoft, whiteSpace: "nowrap" }} data-label="Wanneer">
                      {e.createdAt.toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td style={td} data-label="Reden">
                      {REASON_LABELS[e.reason] ?? e.reason}
                    </td>
                    <td style={td} data-label="Toelichting" data-stack="true">
                      {e.note ? (
                        <span style={{ fontStyle: "italic", color: V2.inkSoft }}>
                          &ldquo;{e.note}&rdquo;
                        </span>
                      ) : (
                        <span style={{ color: V2.inkMute }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, fontFamily: V2.mono, fontSize: 12, color: V2.inkMute }} data-label="E-mail">
                      {e.email ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: V2.inkMute,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: 36,
          lineHeight: 1.05,
          marginTop: 10,
          letterSpacing: -1,
          color: V2.ink,
        }}
      >
        {value}
      </div>
    </div>
  );
}
