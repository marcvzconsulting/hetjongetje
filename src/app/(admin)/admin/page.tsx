import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { RevenueChart, type ChartMode } from "@/components/v2/admin/RevenueChart";
import { Funnel } from "@/components/v2/admin/Funnel";
import { CohortTable } from "@/components/v2/admin/CohortTable";
import {
  loadDashboardStats,
  loadRevenueTimeSeries,
  loadFunnelStats,
  loadCohortRetention,
} from "@/lib/admin/dashboard-stats";
import {
  AI_COST_CENTS_PER_STORY,
  REVENUE_CUTOFF,
  type DashboardStats,
  type Granularity,
} from "@/lib/admin/dashboard-stats";
import {
  loadReminderEffect,
  type ReminderTriggerStats,
} from "@/lib/admin/reminder-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{
  range?: string;
  granularity?: string;
  from?: string;
  to?: string;
  /** "total" (default) or "split" — splits the line per Order.kind. */
  mode?: string;
  /** "30d" | "90d" | "all" — cohort-venster voor de funnel. */
  funnel?: string;
}>;

const FUNNEL_PRESETS: Record<string, { label: string; days: number | "all" }> = {
  "30d": { label: "Laatste 30 dagen", days: 30 },
  "90d": { label: "Laatste 90 dagen", days: 90 },
  all: { label: "Sinds live", days: "all" },
};

const RANGE_PRESETS: Record<
  string,
  { label: string; days: number; granularity: Granularity }
> = {
  "30d": { label: "30 dagen", days: 30, granularity: "day" },
  "90d": { label: "90 dagen", days: 90, granularity: "week" },
  "12m": { label: "12 maanden", days: 365, granularity: "month" },
  ytd: { label: "Dit jaar", days: 0, granularity: "month" },
};

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isGranularity(s: string | undefined): s is Granularity {
  return s === "day" || s === "week" || s === "month" || s === "quarter";
}

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

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const sp = await searchParams;

  // Range — preset wins unless explicit from/to are passed.
  const customFrom = parseDate(sp.from);
  const customTo = parseDate(sp.to);
  const presetKey = sp.range && RANGE_PRESETS[sp.range] ? sp.range : "30d";
  const preset = RANGE_PRESETS[presetKey];
  const now = new Date();
  let rangeFrom: Date;
  let rangeTo: Date;
  if (customFrom && customTo) {
    rangeFrom = customFrom;
    rangeTo = customTo;
  } else if (presetKey === "ytd") {
    rangeFrom = new Date(now.getFullYear(), 0, 1);
    rangeTo = now;
  } else {
    rangeFrom = new Date(now.getTime() - preset.days * 86_400_000);
    rangeTo = now;
  }
  // exclusive upper bound: include today through end-of-day
  const rangeToExclusive = new Date(rangeTo.getTime() + 86_400_000);
  const granularity: Granularity = isGranularity(sp.granularity)
    ? sp.granularity
    : preset.granularity;
  const chartMode: ChartMode = sp.mode === "split" ? "split" : "total";

  // Start van de huidige kalendermaand voor het opzeg-redenen-rapport.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Funnel-cohort: default 30d zodat onboarding-uitval over recente
  // weken zichtbaar is. "all" valt terug op de REVENUE_CUTOFF-default
  // van loadFunnelStats.
  const funnelKey = sp.funnel && FUNNEL_PRESETS[sp.funnel] ? sp.funnel : "30d";
  const funnelPreset = FUNNEL_PRESETS[funnelKey];
  const funnelSince =
    funnelPreset.days === "all"
      ? undefined
      : new Date(now.getTime() - funnelPreset.days * 86_400_000);

  const [
    stats,
    buckets,
    funnel,
    cohorts,
    cancelReasonsThisMonth,
    recentCancelNotes,
    openInboxCount,
    newsletterReasonsThisMonth,
    recentNewsletterNotes,
    reminderEffect,
  ] = await Promise.all([
    loadDashboardStats(),
    loadRevenueTimeSeries({
      from: rangeFrom,
      to: rangeToExclusive,
      granularity,
    }),
    loadFunnelStats({ since: funnelSince }),
    loadCohortRetention({ cohorts: 6 }),
    prisma.subscription.groupBy({
      by: ["cancellationReason"],
      where: { status: "cancelled", cancelledAt: { gte: monthStart } },
      _count: { _all: true },
    }),
    prisma.subscription.findMany({
      where: {
        status: "cancelled",
        cancelledAt: { gte: monthStart },
        cancellationReasonNote: { not: null },
      },
      orderBy: { cancelledAt: "desc" },
      take: 10,
      select: {
        cancelledAt: true,
        cancellationReason: true,
        cancellationReasonNote: true,
      },
    }),
    prisma.contactMessage.count({ where: { status: "open" } }),
    // Nieuwsbrief-afmeld-redenen deze maand — zelfde periode als hierboven.
    prisma.newsletterUnsubscribeReason.groupBy({
      by: ["reason"],
      where: { createdAt: { gte: monthStart } },
      _count: { _all: true },
    }),
    prisma.newsletterUnsubscribeReason.findMany({
      where: { createdAt: { gte: monthStart }, note: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { createdAt: true, reason: true, note: true },
    }),
    loadReminderEffect(),
  ]);
  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin",
    badge:
      n.href === "/admin/users" && stats.health.pendingUsers > 0
        ? stats.health.pendingUsers
        : n.href === "/admin/inbox" && openInboxCount > 0
          ? openInboxCount
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

      {/* ── Omzet over tijd (chart) ─────────────────────── */}
      <Section title="Omzet over tijd">
        <RangeControls
          presetKey={presetKey}
          granularity={granularity}
          chartMode={chartMode}
          customFrom={customFrom ? isoDate(customFrom) : ""}
          customTo={customTo ? isoDate(customTo) : ""}
        />
        <RevenueChart buckets={buckets} mode={chartMode} />
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 12,
            color: V2.inkMute,
            marginTop: 12,
            lineHeight: 1.5,
          }}
        >
          Test-betalingen vóór {REVENUE_CUTOFF.toLocaleDateString("nl-NL")} zijn
          uitgesloten van de cijfers — pas de datum in dashboard-stats.ts aan
          als je een andere drempel wilt.
        </p>
      </Section>

      {/* ── Omzet ───────────────────────────────────────── */}
      <Section title="Omzet (samengevat)">
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

      {/* ── Opzeg-redenen ───────────────────────────────── */}
      <Section title="Opzeg-redenen (deze maand)">
        <CancelReasons
          buckets={cancelReasonsThisMonth}
          notes={recentCancelNotes}
        />
      </Section>

      {/* ── Nieuwsbrief afmeld-redenen ──────────────────── */}
      <Section title="Nieuwsbrief afmeld-redenen (deze maand)">
        <NewsletterReasons
          buckets={newsletterReasonsThisMonth}
          notes={recentNewsletterNotes}
        />
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
            sub={(() => {
              const tracked = stats.margin.storiesMonthWithCost;
              const total = stats.activity.storiesMonth;
              if (total === 0) return `${eur(0)} AI-kosten`;
              if (tracked === total) {
                return `${eur(stats.margin.aiCostMonthCents)} AI-kosten (gemeten)`;
              }
              if (tracked === 0) {
                return `${eur(stats.margin.aiCostMonthCents)} geschatte AI-kosten`;
              }
              return `${eur(stats.margin.aiCostMonthCents)} AI-kosten (${tracked}/${total} gemeten, rest geschat)`;
            })()}
          />
          <Stat
            label="Openstaande credits"
            value={String(stats.credits.outstanding)}
            sub="nog te genereren verhalen (klant-tegoed)"
          />
        </Grid>
      </Section>

      {/* ── Reminder-effect ─────────────────────────────── */}
      <Section title="Reminder-effect">
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 13,
            color: V2.inkMute,
            margin: "0 0 14px",
            lineHeight: 1.5,
          }}
        >
          Kwamen klanten in beweging na een reminder? Gemeten vanaf het
          verzendmoment (cron én handmatig via{" "}
          <Link href="/admin/reminders" style={{ color: "inherit" }}>
            Reminders
          </Link>
          ): &ldquo;doel behaald&rdquo; is de actie waar de mail om vroeg,
          &ldquo;teruggekomen&rdquo; is opnieuw ingelogd.
        </p>
        <Grid>
          {reminderEffect.triggers.map((t: ReminderTriggerStats) => (
            <Panel key={t.key} title={t.label}>
              <Row label="Verstuurd">{String(t.sent)}</Row>
              <Row
                label={`Doel behaald (${t.goalLabel})`}
                emphasised={t.sent > 0 && t.goalReached > 0}
              >
                {t.sent === 0
                  ? "—"
                  : `${t.goalReached} (${Math.round((t.goalReached / t.sent) * 100)}%)`}
              </Row>
              <Row label="Teruggekomen (ingelogd)">
                {t.sent === 0
                  ? "—"
                  : `${t.returned} (${Math.round((t.returned / t.sent) * 100)}%)`}
              </Row>
            </Panel>
          ))}
        </Grid>
        <FootNote>
          Verwijderde accounts vallen uit de meting. Een klant telt als
          &ldquo;doel behaald&rdquo; zodra de actie ná het verzendmoment
          plaatsvond — ook als de mail daar niet de oorzaak van was.
        </FootNote>
      </Section>

      {/* ── Conversie-funnel ────────────────────────────── */}
      <Section title="Conversie-funnel">
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 13,
            color: V2.inkMute,
            margin: "0 0 14px",
            lineHeight: 1.5,
          }}
        >
          Van registratie tot recurring revenue. Elke stap toont absoluut
          aantal, percentage van top, en conversie vanaf de vorige stap.
          De Goedgekeurd-stap maakt admin-approval als drop-off zichtbaar.
        </p>

        {/* Cohort-filter — laatste 30d laat onboarding-uitval over recente
            weken zien; "Sinds live" is de all-time view die er voorheen was. */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {Object.entries(FUNNEL_PRESETS).map(([key, preset]) => {
            const active = key === funnelKey;
            return (
              <Link
                key={key}
                href={`/admin?funnel=${key}`}
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
        <Funnel steps={funnel} />
      </Section>

      {/* ── Cohort-retentie ─────────────────────────────── */}
      <Section title="Cohort-retentie (verhalen-activiteit)">
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 13,
            color: V2.inkMute,
            margin: "0 0 14px",
            lineHeight: 1.5,
          }}
        >
          Per maand-cohort: percentage gebruikers dat in maand M{"<"}n{"> "}
          minimaal één verhaal heeft gegenereerd. Donkerder = meer
          actief. Cellen zonder data zijn maanden die voor het cohort
          nog niet zijn aangebroken.
        </p>
        <CohortTable cohorts={cohorts} />
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
          <Row
            label={(() => {
              const tracked = stats.margin.storiesMonthWithCost;
              const total = stats.activity.storiesMonth;
              if (tracked === total && total > 0) {
                return `AI-kosten (${total} verhalen, gemeten)`;
              }
              if (tracked === 0) {
                return `AI-kosten (${total} × ${eur(AI_COST_CENTS_PER_STORY)} schatting)`;
              }
              return `AI-kosten (${tracked} gemeten + ${total - tracked} × ${eur(AI_COST_CENTS_PER_STORY)} geschat)`;
            })()}
          >
            − {eur(stats.margin.aiCostMonthCents)}
          </Row>
          <Row label="Geschatte bruto-marge" emphasised>
            {eur(stats.margin.grossMarginMonthCents)}
          </Row>
          <FootNote>
            Exclusief Mollie-fees, hosting en drukkosten. Verhalen van vóór
            de kostentracking-deploy vallen op een €0,15-schatting terug.
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
          <Row label="LoRA-trainingen bezig">{stats.health.lora.training}</Row>
          <Row label="LoRA klaar (totaal)">{stats.health.lora.ready}</Row>
          <Row
            label="LoRA mislukt"
            warning={stats.health.lora.failed > 0}
          >
            {stats.health.lora.failed}
          </Row>
        </Panel>
      </div>

      {/* ── Top klanten ─────────────────────────────────── */}
      <Section title="Top 10 klanten op lifetime spend">
        {stats.topCustomers.length === 0 ? (
          <EmptyState>Nog geen betalende klanten — dit vult zich vanzelf.</EmptyState>
        ) : (
          <div className="adm-table-wrap">
          <table
            style={{
              width: "100%",
              minWidth: 720,
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
                <Th align="right">Verhalen</Th>
                <Th align="right">Tegoed</Th>
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
                  <Td align="right" mono>
                    {c.storiesGenerated}
                  </Td>
                  <Td align="right" mono>
                    {c.storyCredits}
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
          </div>
        )}
      </Section>

      {/* ── Klant-feedback ─────────────────────────────── */}
      <Section title="Klant-feedback op verhalen">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <Stat
            label="👍 Mooi"
            value={String(stats.feedback.upCount)}
            sub="totaal aantal duim-omhoog"
          />
          <Stat
            label="👎 Minder"
            value={String(stats.feedback.downCount)}
            sub={
              stats.feedback.downCount > 0
                ? "klik op een rij om de notitie te zien"
                : "geen duim-omlaag (nog)"
            }
          />
        </div>

        {stats.feedback.recentNegative.length === 0 ? (
          <EmptyState>
            Nog geen negatieve feedback. Mooi nieuws (of niemand drukt
            op de knop — beide).
          </EmptyState>
        ) : (
          <div className="adm-table-wrap">
          <table
            style={{
              width: "100%",
              minWidth: 640,
              borderCollapse: "collapse",
              fontFamily: V2.body,
              fontSize: 14,
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${V2.paperShade}` }}>
                <Th>Verhaal</Th>
                <Th>Kind</Th>
                <Th>Notitie</Th>
                <Th>Wanneer</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {stats.feedback.recentNegative.map((f) => (
                <tr
                  key={f.id}
                  style={{ borderBottom: `1px solid ${V2.paperShade}` }}
                >
                  <Td>
                    <div style={{ fontWeight: 500 }}>{f.title}</div>
                    {f.regenerationCount > 0 && (
                      <div
                        style={{
                          fontFamily: V2.mono,
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: V2.goldDeep,
                          marginTop: 4,
                        }}
                      >
                        Al opnieuw gegenereerd
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div>{f.childProfile.name}</div>
                    <div
                      style={{
                        fontFamily: V2.mono,
                        fontSize: 11,
                        color: V2.inkMute,
                      }}
                    >
                      {f.childProfile.user.email}
                    </div>
                  </Td>
                  <Td>
                    {f.feedbackNote ? (
                      <span
                        style={{
                          fontStyle: "italic",
                          color: V2.inkSoft,
                          fontSize: 13,
                        }}
                      >
                        &ldquo;{f.feedbackNote}&rdquo;
                      </span>
                    ) : (
                      <span style={{ color: V2.inkMute, fontSize: 12 }}>—</span>
                    )}
                  </Td>
                  <Td mono>
                    {f.feedbackAt
                      ? f.feedbackAt.toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/admin/users/${f.childProfile.userId}`}
                      style={{
                        fontFamily: V2.ui,
                        fontSize: 12,
                        color: V2.goldDeep,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Klant →
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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

// ── Opzeg-redenen rapport ─────────────────────────────────────────────

const CANCEL_REASON_LABELS: Record<string, string> = {
  te_duur: "Te duur",
  weinig_gebruikt: "Te weinig gebruikt",
  tijdelijk: "Tijdelijke pauze",
  anders: "Anders",
};

function CancelReasons({
  buckets,
  notes,
}: {
  buckets: { cancellationReason: string | null; _count: { _all: number } }[];
  notes: {
    cancelledAt: Date | null;
    cancellationReason: string | null;
    cancellationReasonNote: string | null;
  }[];
}) {
  const total = buckets.reduce((sum, b) => sum + b._count._all, 0);

  if (total === 0) {
    return (
      <p
        style={{
          fontFamily: V2.body,
          fontStyle: "italic",
          fontSize: 14,
          color: V2.inkMute,
          margin: 0,
        }}
      >
        Nog geen opzeggingen deze maand.
      </p>
    );
  }

  // Sort by count desc, push "onbekend" (null) to the end.
  const sorted = [...buckets].sort((a, b) => {
    if (a.cancellationReason === null) return 1;
    if (b.cancellationReason === null) return -1;
    return b._count._all - a._count._all;
  });

  return (
    <div>
      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          marginBottom: 18,
        }}
      >
        {sorted.map((b) => {
          const label = b.cancellationReason
            ? (CANCEL_REASON_LABELS[b.cancellationReason] ??
              b.cancellationReason)
            : "Onbekend (vóór survey)";
          const pct = Math.round((b._count._all / total) * 100);
          return (
            <div
              key={b.cancellationReason ?? "_null"}
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

      {notes.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: V2.ui,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: V2.inkMute,
              marginBottom: 10,
            }}
          >
            Recente toelichtingen
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {notes.map((n, i) => (
              <li
                key={i}
                style={{
                  padding: "10px 14px",
                  background: V2.paperDeep,
                  border: `1px solid ${V2.paperShade}`,
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.ink,
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 11,
                    color: V2.inkMute,
                    marginBottom: 4,
                    letterSpacing: "0.04em",
                  }}
                >
                  {n.cancelledAt
                    ? n.cancelledAt.toLocaleDateString("nl-NL")
                    : "—"}
                  {" · "}
                  {n.cancellationReason
                    ? (CANCEL_REASON_LABELS[n.cancellationReason] ??
                      n.cancellationReason)
                    : "geen reden"}
                </div>
                {n.cancellationReasonNote}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Nieuwsbrief afmeld-redenen rapport ────────────────────────────────

const NEWSLETTER_REASON_LABELS: Record<string, string> = {
  te_vaak: "Te veel mails",
  niet_relevant: "Niet relevant",
  nooit_aangemeld: "Nooit aangemeld",
  tijdelijk: "Tijdelijke pauze",
  anders: "Anders",
};

function NewsletterReasons({
  buckets,
  notes,
}: {
  buckets: { reason: string; _count: { _all: number } }[];
  notes: { createdAt: Date; reason: string; note: string | null }[];
}) {
  const total = buckets.reduce((sum, b) => sum + b._count._all, 0);

  if (total === 0) {
    return (
      <p
        style={{
          fontFamily: V2.body,
          fontStyle: "italic",
          fontSize: 14,
          color: V2.inkMute,
          margin: 0,
        }}
      >
        Nog geen afmeldingen met reden deze maand.
      </p>
    );
  }

  const sorted = [...buckets].sort((a, b) => b._count._all - a._count._all);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          marginBottom: 18,
        }}
      >
        {sorted.map((b) => {
          const label = NEWSLETTER_REASON_LABELS[b.reason] ?? b.reason;
          const pct = Math.round((b._count._all / total) * 100);
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

      {notes.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: V2.ui,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: V2.inkMute,
              marginBottom: 10,
            }}
          >
            Recente toelichtingen
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {notes.map((n, i) => (
              <li
                key={i}
                style={{
                  padding: "10px 14px",
                  background: V2.paperDeep,
                  border: `1px solid ${V2.paperShade}`,
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.ink,
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 11,
                    color: V2.inkMute,
                    marginBottom: 4,
                    letterSpacing: "0.04em",
                  }}
                >
                  {n.createdAt.toLocaleDateString("nl-NL")}
                  {" · "}
                  {NEWSLETTER_REASON_LABELS[n.reason] ?? n.reason}
                </div>
                {n.note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
    <section className="adm-section" style={{ marginTop: 48 }}>
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

function RangeControls({
  presetKey,
  granularity,
  chartMode,
  customFrom,
  customTo,
}: {
  presetKey: string;
  granularity: Granularity;
  chartMode: ChartMode;
  customFrom: string;
  customTo: string;
}) {
  const usingCustom = !!(customFrom && customTo);

  /** Build a /admin URL that preserves all controls except those overridden. */
  function buildHref(overrides: Record<string, string>): string {
    const params = new URLSearchParams();
    if (usingCustom) {
      params.set("from", customFrom);
      params.set("to", customTo);
    } else {
      params.set("range", presetKey);
    }
    params.set("granularity", granularity);
    if (chartMode !== "total") params.set("mode", chartMode);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return `/admin?${params.toString()}`;
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 14,
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      {/* Preset range pills */}
      <div style={{ display: "flex", gap: 6 }}>
        {Object.entries(RANGE_PRESETS).map(([key, preset]) => {
          const active = !usingCustom && key === presetKey;
          return (
            <Link
              key={key}
              href={buildHref({ range: key, from: "", to: "" })}
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

      {/* Granularity pills */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["day", "week", "month", "quarter"] as const).map((g) => {
          const active = g === granularity;
          return (
            <Link
              key={g}
              href={buildHref({ granularity: g })}
              style={{
                fontFamily: V2.mono,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "6px 10px",
                border: `1px solid ${active ? V2.goldDeep : V2.paperShade}`,
                background: active ? V2.goldSoft : "transparent",
                color: active ? V2.goldDeep : V2.inkMute,
                textDecoration: "none",
              }}
            >
              {g === "day"
                ? "Dag"
                : g === "week"
                  ? "Week"
                  : g === "month"
                    ? "Maand"
                    : "Kwartaal"}
            </Link>
          );
        })}
      </div>

      {/* Total / split toggle */}
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
        {([
          { v: "total", label: "Totaal" },
          { v: "split", label: "Per kategorie" },
        ] as const).map((m) => {
          const active = m.v === chartMode;
          return (
            <Link
              key={m.v}
              href={buildHref({ mode: m.v === "total" ? "" : m.v })}
              style={{
                fontFamily: V2.ui,
                fontSize: 12,
                fontWeight: active ? 500 : 400,
                padding: "6px 12px",
                border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                background: active ? V2.paper : "transparent",
                color: V2.ink,
                textDecoration: "none",
              }}
            >
              {m.label}
            </Link>
          );
        })}
      </div>

      {/* Custom date-range form */}
      <form
        method="get"
        action="/admin"
        style={{
          width: "100%",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          paddingTop: 8,
          marginTop: 4,
          borderTop: `1px dashed ${V2.paperShade}`,
        }}
      >
        <input type="hidden" name="granularity" value={granularity} />
        {chartMode !== "total" && (
          <input type="hidden" name="mode" value={chartMode} />
        )}
        <label
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Eigen periode:
        </label>
        <input
          type="date"
          name="from"
          defaultValue={customFrom}
          style={dateInputStyle}
        />
        <span style={{ color: V2.inkMute }}>→</span>
        <input
          type="date"
          name="to"
          defaultValue={customTo}
          style={dateInputStyle}
        />
        <button
          type="submit"
          style={{
            fontFamily: V2.ui,
            fontSize: 12,
            fontWeight: 500,
            padding: "6px 14px",
            background: V2.ink,
            color: V2.paper,
            border: "none",
            cursor: "pointer",
          }}
        >
          Toepassen
        </button>
        {usingCustom && (
          <Link
            href={buildHref({ range: "30d", from: "", to: "" })}
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              color: V2.inkMute,
              textDecoration: "underline",
            }}
          >
            wis
          </Link>
        )}
      </form>
    </div>
  );
}

const dateInputStyle: React.CSSProperties = {
  fontFamily: V2.mono,
  fontSize: 12,
  padding: "5px 8px",
  border: `1px solid ${V2.paperShade}`,
  background: V2.paper,
  color: V2.ink,
};

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
