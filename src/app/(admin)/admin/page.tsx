import Link from "next/link";
import { auth } from "@/lib/auth";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import {
  loadDashboardStats,
  AI_COST_CENTS_PER_STORY,
  type DashboardStats,
} from "@/lib/admin/dashboard-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function eur(cents: number, opts?: { decimals?: 0 | 2 }): string {
  const decimals = opts?.decimals ?? 2;
  const value = cents / 100;
  return `€${value
    .toLocaleString("nl-NL", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
}

function relativeNl(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const m = Math.round(diffMs / 60_000);
  if (m < 1) return "zojuist";
  if (m < 60) return `${m} min geleden`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} uur geleden`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} dag${d === 1 ? "" : "en"} geleden`;
  return date.toLocaleDateString("nl-NL");
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const stats = await loadDashboardStats();
  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin",
    badge: n.href === "/admin/users" && stats.health.pendingUsers > 0
      ? stats.health.pendingUsers
      : undefined,
  }));

  return (
    <AdminShell
      section="Overzicht"
      eyebrow="Vandaag"
      title={
        <>
          Hoe gaat het{" "}
          <span style={{ fontStyle: "italic" }}>met de zaak.</span>
        </>
      }
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      {stats.health.pendingUsers > 0 && (
        <ActionBanner pending={stats.health.pendingUsers} />
      )}

      {/* ── Omzet ───────────────────────────────────────── */}
      <Section title="Omzet">
        <Grid>
          <Stat
            label="Vandaag"
            value={eur(stats.revenue.todayCents)}
            sub={`${stats.revenue.paidOrdersToday} betaling${stats.revenue.paidOrdersToday === 1 ? "" : "en"}`}
          />
          <Stat
            label="Deze maand"
            value={eur(stats.revenue.monthCents)}
            sub={`${stats.revenue.paidOrdersMonth} betaling${stats.revenue.paidOrdersMonth === 1 ? "" : "en"}`}
          />
          <Stat
            label="Dit jaar"
            value={eur(stats.revenue.yearCents)}
          />
          <Stat
            label="Lifetime"
            value={eur(stats.revenue.lifetimeCents)}
            sub="alle betalingen ooit"
          />
        </Grid>
      </Section>

      {/* ── Recurring ───────────────────────────────────── */}
      <Section title="Abonnementen & recurring revenue">
        <Grid>
          <Stat
            label="MRR"
            value={eur(Math.round(stats.subscriptions.mrrCents))}
            sub="gemiddelde maandelijkse omzet uit actieve abo's"
            featured
          />
          <Stat
            label="ARR-projectie"
            value={eur(Math.round(stats.subscriptions.arrCents), { decimals: 0 })}
            sub="MRR × 12, bij gelijkblijvende basis"
          />
          <Stat
            label="Actieve abonnementen"
            value={String(stats.subscriptions.activeTotal)}
            sub={subPlanBreakdown(stats)}
          />
          <Stat
            label="Opzeggingen deze maand"
            value={String(stats.subscriptions.cancelledThisMonth)}
            sub={
              stats.subscriptions.cancelledThisMonth === 0
                ? "geen churn nog"
                : `netto ${
                    Object.values(stats.subscriptions.byPlan).reduce(
                      (a, b) => a + b,
                      0,
                    ) - stats.subscriptions.cancelledThisMonth
                  } na churn`
            }
          />
        </Grid>
      </Section>

      {/* ── Activiteit ──────────────────────────────────── */}
      <Section title="Activiteit">
        <Grid>
          <Stat
            label="Nieuwe registraties (vandaag)"
            value={String(stats.activity.newUsersToday)}
          />
          <Stat
            label="Nieuwe registraties (maand)"
            value={String(stats.activity.newUsersMonth)}
          />
          <Stat
            label="Verhalen (vandaag)"
            value={String(stats.activity.storiesToday)}
          />
          <Stat
            label="Verhalen (maand)"
            value={String(stats.activity.storiesMonth)}
            sub={`${eur(stats.margin.aiCostMonthCents)} geschatte AI-kosten`}
          />
        </Grid>
      </Section>

      {/* ── Marge & systeem in twee kolommen ────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 32,
          marginTop: 56,
        }}
      >
        <Panel title="Marge deze maand">
          <Row label="Bruto-omzet (paid orders)">{eur(stats.revenue.monthCents)}</Row>
          <Row label={`AI-kosten (${stats.activity.storiesMonth} × ${eur(AI_COST_CENTS_PER_STORY)})`}>
            − {eur(stats.margin.aiCostMonthCents)}
          </Row>
          <Row label="Geschatte bruto-marge" emphasised>
            {eur(stats.margin.grossMarginMonthCents)}
          </Row>
          <FootNote>
            Exclusief Mollie-fees, hosting en drukkosten. Indicatief voor de
            verhouding AI-kosten ↔ omzet.
          </FootNote>
        </Panel>

        <Panel title="Systeem-gezondheid">
          <Row
            label="Wachtende registraties"
            href={
              stats.health.pendingUsers > 0
                ? "/admin/users?status=pending"
                : undefined
            }
          >
            {stats.health.pendingUsers}
          </Row>
          <Row label="Jobs nu actief">{stats.health.processingJobs}</Row>
          <Row
            label="Mislukte jobs"
            href={stats.health.failedJobs > 0 ? "/admin/jobs" : undefined}
            warning={stats.health.failedJobs > 0}
          >
            {stats.health.failedJobs}
          </Row>
        </Panel>
      </div>

      {/* ── Top klanten ─────────────────────────────────── */}
      <Section title="Top 10 klanten op lifetime spend">
        {stats.topCustomers.length === 0 ? (
          <EmptyState>Nog geen betalende klanten — dit vult zich vanzelf.</EmptyState>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: V2.body,
              fontSize: 14,
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${V2.paperShade}` }}>
                <Th>Klant</Th>
                <Th align="right">Lifetime</Th>
                <Th align="right">Bestellingen</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {stats.topCustomers.map((c) => (
                <tr
                  key={c.userId}
                  style={{ borderBottom: `1px solid ${V2.paperShade}` }}
                >
                  <Td>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div
                      style={{
                        fontFamily: V2.mono,
                        fontSize: 11,
                        color: V2.inkMute,
                      }}
                    >
                      {c.email}
                    </div>
                  </Td>
                  <Td align="right" mono>
                    {eur(c.lifetimeCents)}
                  </Td>
                  <Td align="right" mono>
                    {c.paidOrders}
                  </Td>
                  <Td>
                    {c.activeSubscription ? (
                      <span
                        style={{
                          fontFamily: V2.mono,
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          background: V2.goldSoft,
                          color: V2.goldDeep,
                          fontWeight: 500,
                        }}
                      >
                        {c.activeSubscription}
                      </span>
                    ) : (
                      <span style={{ color: V2.inkMute, fontSize: 12 }}>—</span>
                    )}
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/admin/users/${c.userId}`}
                      style={{
                        fontFamily: V2.ui,
                        fontSize: 12,
                        color: V2.goldDeep,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Profiel →
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ── Recent activity feed ────────────────────────── */}
      <Section title="Recente activiteit">
        {stats.events.length === 0 ? (
          <EmptyState>Nog geen activiteit — als er iets gebeurt zie je het hier.</EmptyState>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
            }}
          >
            {stats.events.map((e, i) => (
              <li
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 16,
                  alignItems: "center",
                  padding: "14px 20px",
                  borderTop: i === 0 ? "none" : `1px solid ${V2.paperShade}`,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 14,
                    width: 20,
                    textAlign: "center",
                    color:
                      e.kind === "order"
                        ? V2.goldDeep
                        : e.kind === "sub-started"
                          ? V2.goldDeep
                          : e.kind === "sub-cancelled"
                            ? V2.heart
                            : V2.inkMute,
                  }}
                >
                  {e.kind === "order"
                    ? "€"
                    : e.kind === "register"
                      ? "+"
                      : e.kind === "sub-started"
                        ? "↗"
                        : "✕"}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: V2.body,
                      fontSize: 14,
                      fontWeight: 500,
                      color: V2.ink,
                    }}
                  >
                    {e.title}
                  </div>
                  <div
                    style={{
                      fontFamily: V2.body,
                      fontSize: 12,
                      color: V2.inkMute,
                      marginTop: 2,
                    }}
                  >
                    {e.detail}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 11,
                    color: V2.inkMute,
                    whiteSpace: "nowrap",
                  }}
                >
                  {relativeNl(e.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </AdminShell>
  );
}

// ── Tiny UI primitives (private to this page) ─────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 48 }}>
      <h2
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: 22,
          letterSpacing: -0.4,
          margin: "0 0 18px",
          color: V2.ink,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      {children}
    </div>
  );
}

function Stat({
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

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: "22px 24px",
      }}
    >
      <h3
        style={{
          fontFamily: V2.ui,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: V2.inkMute,
          margin: "0 0 16px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({
  label,
  href,
  emphasised,
  warning,
  children,
}: {
  label: string;
  href?: string;
  emphasised?: boolean;
  warning?: boolean;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <span
        style={{
          fontFamily: V2.body,
          fontSize: 14,
          color: V2.inkSoft,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: emphasised ? V2.display : V2.mono,
          fontSize: emphasised ? 22 : 14,
          fontWeight: emphasised ? 400 : 500,
          color: warning ? V2.heart : V2.ink,
          letterSpacing: emphasised ? -0.4 : 0,
        }}
      >
        {children}
      </span>
    </>
  );
  const styleBase = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: emphasised ? "16px 0 6px" : "10px 0",
    borderTop: emphasised ? `1px solid ${V2.paperShade}` : undefined,
    textDecoration: "none",
    color: "inherit",
  } as const;
  if (href) {
    return (
      <Link href={href} style={{ ...styleBase, cursor: "pointer" }}>
        {inner}
      </Link>
    );
  }
  return <div style={styleBase}>{inner}</div>;
}

function FootNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: V2.body,
        fontStyle: "italic",
        fontSize: 12,
        color: V2.inkMute,
        margin: "14px 0 0",
        lineHeight: 1.5,
      }}
    >
      {children}
    </p>
  );
}

function ActionBanner({ pending }: { pending: number }) {
  return (
    <Link
      href="/admin/users?status=pending"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 32,
        padding: "16px 22px",
        background: V2.goldSoft,
        borderLeft: `3px solid ${V2.goldDeep}`,
        textDecoration: "none",
        color: V2.ink,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: V2.mono,
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: V2.goldDeep,
          }}
        >
          Actie
        </div>
        <div
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 18,
            marginTop: 4,
            letterSpacing: -0.3,
          }}
        >
          {pending}{" "}
          {pending === 1 ? "account wacht" : "accounts wachten"}{" "}
          <span style={{ fontStyle: "italic" }}>op goedkeuring</span>
        </div>
      </div>
      <span
        style={{
          fontFamily: V2.ui,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Bekijken →
      </span>
    </Link>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 28,
        border: `1px dashed ${V2.paperShade}`,
        fontFamily: V2.body,
        fontStyle: "italic",
        fontSize: 14,
        color: V2.inkMute,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      style={{
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: V2.inkMute,
        padding: "12px 18px",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      style={{
        fontFamily: mono ? V2.mono : V2.body,
        fontSize: 14,
        color: V2.ink,
        padding: "14px 18px",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </td>
  );
}

function subPlanBreakdown(stats: DashboardStats): string | undefined {
  const entries = Object.entries(stats.subscriptions.byPlan);
  if (entries.length === 0) return undefined;
  const planMap = new Map(stats.plans.map((p) => [p.code, p.name]));
  return entries
    .map(([code, n]) => `${n}× ${planMap.get(code) ?? code}`)
    .join(" · ");
}
