import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { REFERRAL_BONUS_CREDITS } from "@/lib/referral";

export const dynamic = "force-dynamic";

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

function formatPct(part: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("nl-NL", {
    month: "short",
    year: "2-digit",
  });
}

export default async function AdminReferralsPage() {
  const session = await auth();

  // Window: laatste 12 kalendermaanden (huidige maand + 11 ervoor).
  const now = new Date();
  const windowStart = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() - 11, 1),
  );

  const [totalInvitees, convertedInvitees, invitees, allInviterIds] =
    await Promise.all([
      prisma.user.count({ where: { referredByUserId: { not: null } } }),
      prisma.user.count({
        where: {
          referredByUserId: { not: null },
          referralBonusGrantedAt: { not: null },
        },
      }),
      // Volledige lijst (cap 200) voor de drill-down + maand-aggregatie
      prisma.user.findMany({
        where: { referredByUserId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          referralBonusGrantedAt: true,
          referredByUserId: true,
        },
      }),
      // Unieke inviter-ids zodat we hun namen + email kunnen ophalen
      prisma.user.findMany({
        where: { referredByUserId: { not: null } },
        select: { referredByUserId: true },
        distinct: ["referredByUserId"],
      }),
    ]);

  // Inviter-info ophalen
  const inviterIds = allInviterIds
    .map((u) => u.referredByUserId)
    .filter((v): v is string => v !== null);
  const inviterRows = await prisma.user.findMany({
    where: { id: { in: inviterIds } },
    select: { id: true, name: true, email: true },
  });
  const inviterById = new Map(inviterRows.map((u) => [u.id, u]));

  // Top-inviters aggregatie — group ALL invitees (niet alleen cap 200)
  // zodat de cijfers kloppen ook bij grote getallen.
  const allInviteesForAggregation = await prisma.user.findMany({
    where: { referredByUserId: { not: null } },
    select: {
      referredByUserId: true,
      referralBonusGrantedAt: true,
    },
  });
  const inviterStats = new Map<
    string,
    { invitees: number; converted: number }
  >();
  for (const inv of allInviteesForAggregation) {
    if (!inv.referredByUserId) continue;
    const cur = inviterStats.get(inv.referredByUserId) ?? {
      invitees: 0,
      converted: 0,
    };
    cur.invitees++;
    if (inv.referralBonusGrantedAt) cur.converted++;
    inviterStats.set(inv.referredByUserId, cur);
  }
  const topInviters = [...inviterStats.entries()]
    .map(([id, stats]) => ({
      id,
      info: inviterById.get(id),
      ...stats,
    }))
    .sort(
      (a, b) =>
        b.converted - a.converted || b.invitees - a.invitees,
    )
    .slice(0, 10);

  // Maand-aggregatie voor de last-12-months grafiek
  const monthMap = new Map<string, { registered: number; converted: number }>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthMap.set(monthKey(d), { registered: 0, converted: 0 });
  }
  // Voor de maand-grafiek doen we een aparte gerichte query met createdAt
  const inviteesWithDate = await prisma.user.findMany({
    where: {
      referredByUserId: { not: null },
      createdAt: { gte: windowStart },
    },
    select: { createdAt: true, referralBonusGrantedAt: true },
  });
  for (const inv of inviteesWithDate) {
    const key = monthKey(inv.createdAt);
    const cur = monthMap.get(key);
    if (!cur) continue;
    cur.registered++;
    if (inv.referralBonusGrantedAt) cur.converted++;
  }
  const monthsAsc = [...monthMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, stats]) => ({ key, label: monthLabel(key), ...stats }));
  const monthMaxReg = Math.max(1, ...monthsAsc.map((m) => m.registered));

  // Credits-uitkering: invitees krijgen +1 bij registratie, inviters +1
  // bij eerste betaalde order. Som = 1 × (invitees + converted).
  const totalCreditsGranted =
    (totalInvitees + convertedInvitees) * REFERRAL_BONUS_CREDITS;

  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin/referrals",
  }));

  return (
    <AdminShell
      section="Groei"
      title={
        <>
          Referral <span style={{ fontStyle: "italic" }}>conversie</span>
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
        Per inviter de invitees + hoeveel daarvan tot een betaalde order
        komen. Een invitee telt als &ldquo;betalend&rdquo; zodra ze hun
        eerste tegoed of abonnement hebben afgerekend — dat is ook het
        moment dat de inviter z&apos;n bonus krijgt.
      </p>

      {/* ── Top stats ───────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: 48,
        }}
      >
        <StatCard label="Totaal invitees" value={String(totalInvitees)} />
        <StatCard
          label="Betalende invitees"
          value={String(convertedInvitees)}
          sub={`${formatPct(convertedInvitees, totalInvitees)} conversie`}
        />
        <StatCard
          label="Conversie-rate"
          value={formatPct(convertedInvitees, totalInvitees)}
          featured
        />
        <StatCard
          label="Credits uitgekeerd"
          value={String(totalCreditsGranted)}
          sub={`${totalInvitees} invitees + ${convertedInvitees} bonus`}
        />
      </div>

      {/* ── Maand-grafiek ──────────────────────────────── */}
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
          Laatste 12 maanden
        </h2>
        {totalInvitees === 0 ? (
          <p style={{ fontFamily: V2.body, fontStyle: "italic", color: V2.inkMute }}>
            Nog geen referrals. Zodra de eerste invitees binnenkomen vul
            je deze grafiek vanzelf.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${monthsAsc.length}, minmax(0, 1fr))`,
              gap: 8,
              padding: "20px 18px 14px",
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
              alignItems: "end",
              minHeight: 200,
            }}
          >
            {monthsAsc.map((m) => {
              const h = (m.registered / monthMaxReg) * 160;
              const convertedH =
                m.registered > 0 ? (m.converted / m.registered) * h : 0;
              return (
                <div
                  key={m.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                  title={`${m.label}: ${m.registered} invitees, ${m.converted} betalend`}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 36,
                      height: h,
                      background: V2.paperShade,
                      position: "relative",
                      display: "flex",
                      alignItems: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: convertedH,
                        background: V2.goldDeep,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: V2.mono,
                      fontSize: 10,
                      color: V2.inkMute,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {m.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 18,
            marginTop: 12,
            fontFamily: V2.body,
            fontSize: 12,
            color: V2.inkMute,
          }}
        >
          <LegendDot color={V2.paperShade} label="Geregistreerd" />
          <LegendDot color={V2.goldDeep} label="Betalend" />
        </div>
      </section>

      {/* ── Top inviters ──────────────────────────────── */}
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
          Top inviters
        </h2>
        {topInviters.length === 0 ? (
          <p style={{ fontFamily: V2.body, fontStyle: "italic", color: V2.inkMute }}>
            Nog geen inviters met aangemelde invitees.
          </p>
        ) : (
          <div
            className="adm-cards-wrap"
            style={{
              overflowX: "auto",
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
            }}
          >
            <table
              className="adm-cards"
              style={{
                width: "100%",
                minWidth: 720,
                borderCollapse: "collapse",
                fontFamily: V2.body,
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Inviter</th>
                  <th style={{ ...th, textAlign: "right" }}>Invitees</th>
                  <th style={{ ...th, textAlign: "right" }}>Betalend</th>
                  <th style={{ ...th, textAlign: "right" }}>Conversie</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {topInviters.map((row) => (
                  <tr key={row.id}>
                    <td style={td} data-label="Inviter" data-stack="true">
                      <div style={{ fontWeight: 500 }}>
                        {row.info?.name ?? <em style={{ color: V2.inkMute }}>—</em>}
                      </div>
                      <div
                        style={{
                          fontFamily: V2.mono,
                          fontSize: 11,
                          color: V2.inkMute,
                          marginTop: 2,
                        }}
                      >
                        {row.info?.email ?? row.id}
                      </div>
                    </td>
                    <td
                      style={{ ...td, textAlign: "right", fontFamily: V2.mono }}
                      data-label="Invitees"
                    >
                      {row.invitees}
                    </td>
                    <td
                      style={{ ...td, textAlign: "right", fontFamily: V2.mono }}
                      data-label="Betalend"
                    >
                      {row.converted}
                    </td>
                    <td
                      style={{ ...td, textAlign: "right", fontFamily: V2.mono }}
                      data-label="Conversie"
                    >
                      {formatPct(row.converted, row.invitees)}
                    </td>
                    <td style={{ ...td, textAlign: "right" }} data-label="">
                      <Link
                        href={`/admin/users/${row.id}`}
                        style={{
                          fontFamily: V2.ui,
                          fontSize: 13,
                          color: V2.goldDeep,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Profiel →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Volledige invitee-lijst ───────────────────── */}
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
          Recente invitees ({invitees.length}
          {invitees.length === 200 && " — max 200"})
        </h2>
        {invitees.length === 0 ? (
          <p style={{ fontFamily: V2.body, fontStyle: "italic", color: V2.inkMute }}>
            Nog geen invitees in de database.
          </p>
        ) : (
          <div
            className="adm-cards-wrap"
            style={{
              overflowX: "auto",
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
            }}
          >
            <table
              className="adm-cards"
              style={{
                width: "100%",
                minWidth: 820,
                borderCollapse: "collapse",
                fontFamily: V2.body,
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Invitee</th>
                  <th style={th}>Inviter</th>
                  <th style={th}>Aangemeld</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invitees.map((inv) => {
                  const inviter = inv.referredByUserId
                    ? inviterById.get(inv.referredByUserId)
                    : null;
                  const paid = inv.referralBonusGrantedAt !== null;
                  return (
                    <tr key={inv.id}>
                      <td style={td} data-label="Invitee" data-stack="true">
                        <div style={{ fontWeight: 500 }}>{inv.name}</div>
                        <div
                          style={{
                            fontFamily: V2.mono,
                            fontSize: 11,
                            color: V2.inkMute,
                            marginTop: 2,
                          }}
                        >
                          {inv.email}
                        </div>
                      </td>
                      <td style={td} data-label="Inviter" data-stack="true">
                        <div>
                          {inviter?.name ?? (
                            <em style={{ color: V2.inkMute }}>—</em>
                          )}
                        </div>
                        {inviter?.email && (
                          <div
                            style={{
                              fontFamily: V2.mono,
                              fontSize: 11,
                              color: V2.inkMute,
                              marginTop: 2,
                            }}
                          >
                            {inviter.email}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          ...td,
                          fontFamily: V2.mono,
                          fontSize: 12,
                          color: V2.inkSoft,
                          whiteSpace: "nowrap",
                        }}
                        data-label="Aangemeld"
                      >
                        {inv.createdAt.toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td style={td} data-label="Status">
                        {paid ? (
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "3px 10px",
                              background: V2.goldSoft,
                              color: V2.goldDeep,
                              fontFamily: V2.ui,
                              fontSize: 11,
                              fontWeight: 500,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            Betalend
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              padding: "3px 10px",
                              background: V2.paperDeep,
                              color: V2.inkMute,
                              fontFamily: V2.ui,
                              fontSize: 11,
                              fontWeight: 500,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            Geregistreerd
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  featured,
}: {
  label: string;
  value: string;
  sub?: string;
  featured?: boolean;
}) {
  return (
    <div
      style={{
        background: featured ? V2.night : V2.paper,
        color: featured ? V2.paper : V2.ink,
        border: `1px solid ${featured ? V2.night : V2.paperShade}`,
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
          color: featured ? V2.gold : V2.inkMute,
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
          color: featured ? V2.paper : V2.ink,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 12,
            color: featured ? V2.paper : V2.inkMute,
            marginTop: 8,
            opacity: featured ? 0.85 : 1,
            lineHeight: 1.4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          background: color,
        }}
      />
      {label}
    </span>
  );
}
