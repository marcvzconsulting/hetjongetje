import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

/**
 * Estimated AI cost per generated story — Claude (text) ≈ €0.05 plus
 * fal.ai (illustrations) ≈ €0.10. Rounded; only used for marge-indicators
 * on the admin dashboard, not for accounting.
 */
export const AI_COST_CENTS_PER_STORY = 15;

/**
 * Mollie switched to live mode on 2026-05-06. Everything paid before
 * that timestamp came from test transactions and shouldn't count
 * towards reported revenue. Move this date if we ever do a clean cut
 * later (e.g. fiscal-year reset).
 *
 * The orders themselves stay in DB so individual user pages still
 * show the full history — the dashboard just hides them from the
 * aggregates.
 */
export const REVENUE_CUTOFF = new Date("2026-05-06T00:00:00Z");

export type DashboardStats = Awaited<ReturnType<typeof loadDashboardStats>>;

/**
 * Cache-tag voor admin-dashboard stats. Server-actions die counters
 * direct beïnvloeden (user-approve, user-suspend, etc.) roepen
 * `revalidateTag(ADMIN_DASHBOARD_TAG)` aan zodat de wijziging meteen
 * zichtbaar is in plaats van pas na de 60s revalidate.
 */
export const ADMIN_DASHBOARD_TAG = "admin-dashboard";

const loadDashboardStatsCached = unstable_cache(
  loadDashboardStatsUncached,
  ["admin-dashboard-stats-v1"],
  { revalidate: 60, tags: [ADMIN_DASHBOARD_TAG] },
);

// unstable_cache JSON-roundtript de return-waarde, waardoor Date-velden
// als string terugkomen op een cache-hit. Dat liet /admin crashen met
// "a.getTime is not a function" zodra de eerste 60s-revalidate gepasseerd
// was (digest 980450884). We coercen de bekende Date-velden hier terug
// zodat de consumer kant alleen met echte Dates te maken heeft.
export async function loadDashboardStats(): Promise<
  Awaited<ReturnType<typeof loadDashboardStatsUncached>>
> {
  const raw = await loadDashboardStatsCached();
  return {
    ...raw,
    events: raw.events.map((e) => ({ ...e, at: new Date(e.at) })),
    feedback: {
      ...raw.feedback,
      recentNegative: raw.feedback.recentNegative.map((f) => ({
        ...f,
        feedbackAt: f.feedbackAt ? new Date(f.feedbackAt) : null,
      })),
    },
  };
}

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function startOfYear(now: Date): Date {
  return new Date(now.getFullYear(), 0, 1);
}
function maxDate(a: Date, b: Date): Date {
  return a.getTime() > b.getTime() ? a : b;
}

/**
 * Mollie's interval strings ("1 month", "12 months", "14 days") → number
 * of months for MRR-normalisation. Falls back to 1 for anything we
 * don't recognise so the row is at least counted, not silently dropped.
 */
function intervalToMonths(interval: string): number {
  const m = interval.trim().toLowerCase().match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)$/);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit.startsWith("month")) return n;
  if (unit.startsWith("year")) return n * 12;
  if (unit.startsWith("week")) return n / 4.345; // approx
  if (unit.startsWith("day")) return n / 30.44; // approx
  return 1;
}

async function loadDashboardStatsUncached() {
  const now = new Date();
  // Each window's lower bound is the later of (window start, REVENUE_CUTOFF)
  // so a window that opens before live-mode collapses to the cutoff itself.
  const today = maxDate(startOfDay(now), REVENUE_CUTOFF);
  const monthStart = maxDate(startOfMonth(now), REVENUE_CUTOFF);
  const yearStart = maxDate(startOfYear(now), REVENUE_CUTOFF);

  // Run all reads in parallel — Neon round-trips are the bottleneck.
  const [
    revenueToday,
    revenueMonth,
    revenueYear,
    revenueLifetime,
    paidOrdersToday,
    paidOrdersMonth,
    storiesToday,
    storiesMonth,
    storiesLifetime,
    newUsersToday,
    newUsersMonth,
    activeSubs,
    cancelledThisMonth,
    plans,
    pendingUsers,
    failedJobs,
    processingJobs,
    topCustomers,
    recentPaidOrders,
    recentRegistrations,
    recentSubscriptionEvents,
    feedbackUpCount,
    feedbackDownCount,
    recentNegativeFeedback,
    aiCostMonthAgg,
    aiCostLifetimeAgg,
    storiesMonthWithCost,
    storiesLifetimeWithCost,
  ] = await Promise.all([
    sumOrderAmount({ paidAt: { gte: today } }),
    sumOrderAmount({ paidAt: { gte: monthStart } }),
    sumOrderAmount({ paidAt: { gte: yearStart } }),
    sumOrderAmount({ paidAt: { gte: REVENUE_CUTOFF } }),
    prisma.order.count({ where: { status: "paid", paidAt: { gte: today } } }),
    prisma.order.count({ where: { status: "paid", paidAt: { gte: monthStart } } }),
    prisma.story.count({ where: { createdAt: { gte: today } } }),
    prisma.story.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.story.count(),
    prisma.user.count({ where: { role: "user", createdAt: { gte: today } } }),
    prisma.user.count({ where: { role: "user", createdAt: { gte: monthStart } } }),
    prisma.subscription.findMany({
      where: {
        status: "active",
        plan: { not: "free" },
        mollieSubscriptionId: { not: null },
      },
      select: { id: true, plan: true, startedAt: true },
    }),
    prisma.subscription.count({
      where: { status: "cancelled", cancelledAt: { gte: monthStart } },
    }),
    prisma.subscriptionPlan.findMany(),
    prisma.user.count({ where: { role: "user", status: "pending" } }),
    prisma.generationJob.count({ where: { status: "failed" } }),
    prisma.generationJob.count({ where: { status: "processing" } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { status: "paid", paidAt: { gte: REVENUE_CUTOFF } },
      _sum: { amountCents: true },
      _count: { _all: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 10,
    }),
    prisma.order.findMany({
      where: { status: "paid", paidAt: { gte: REVENUE_CUTOFF } },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { role: "user" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.subscription.findMany({
      where: {
        OR: [
          { mollieSubscriptionId: { not: null } },
          { cancelledAt: { not: null } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.story.count({ where: { feedbackKind: "up" } }),
    prisma.story.count({ where: { feedbackKind: "down" } }),
    prisma.story.findMany({
      where: { feedbackKind: "down" },
      orderBy: { feedbackAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        feedbackNote: true,
        feedbackAt: true,
        regenerationCount: true,
        childProfile: {
          select: { name: true, userId: true, user: { select: { email: true } } },
        },
      },
    }),
    // AI-kosten — alleen verhalen die werkelijk getrackt zijn (aiCostCents != null).
    // Verhalen van vóór deze tracking vallen in `*WithCost` op 0 zodat we
    // ze met de oude estimate kunnen aanvullen.
    prisma.story.aggregate({
      where: { aiCostCents: { not: null }, createdAt: { gte: monthStart } },
      _sum: { aiCostCents: true },
    }),
    prisma.story.aggregate({
      where: { aiCostCents: { not: null } },
      _sum: { aiCostCents: true },
    }),
    prisma.story.count({
      where: { aiCostCents: { not: null }, createdAt: { gte: monthStart } },
    }),
    prisma.story.count({ where: { aiCostCents: { not: null } } }),
  ]);

  // MRR — sum of normalised monthly contribution per active subscription.
  const planMap = new Map(plans.map((p) => [p.code, p]));
  const subsByPlan: Record<string, number> = {};
  let mrrCents = 0;
  for (const sub of activeSubs) {
    const plan = planMap.get(sub.plan);
    if (!plan) continue;
    const months = intervalToMonths(plan.interval);
    if (months > 0) mrrCents += plan.priceCents / months;
    subsByPlan[sub.plan] = (subsByPlan[sub.plan] ?? 0) + 1;
  }
  const arrCents = mrrCents * 12;

  // Top customers — re-fetch user details for the top-10 row set.
  // Orders van verwijderde accounts hebben userId null (SetNull, fiscale
  // bewaarplicht); die vallen terug op "(verwijderd)" hieronder.
  const topUserIds = topCustomers
    .map((c) => c.userId)
    .filter((id): id is string => id !== null);
  const topUserDetails = topUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: {
          id: true,
          name: true,
          email: true,
          storyCredits: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              mollieSubscriptionId: true,
            },
          },
          children: {
            select: { _count: { select: { stories: true } } },
          },
        },
      })
    : [];
  const topUserMap = new Map(topUserDetails.map((u) => [u.id, u]));
  const topCustomersHydrated = topCustomers.map((c) => {
    const u = c.userId ? topUserMap.get(c.userId) : undefined;
    const storyCount =
      u?.children?.reduce((s, c) => s + (c._count.stories ?? 0), 0) ?? 0;
    return {
      userId: c.userId,
      name: u?.name ?? "(verwijderd)",
      email: u?.email ?? "",
      paidOrders: c._count._all,
      lifetimeCents: c._sum.amountCents ?? 0,
      storyCredits: u?.storyCredits ?? 0,
      storiesGenerated: storyCount,
      activeSubscription:
        u?.subscription?.status === "active" &&
        !!u.subscription.mollieSubscriptionId &&
        u.subscription.plan !== "free"
          ? u.subscription.plan
          : null,
    };
  });

  // Activity feed — union, sort, take 20.
  type Event = {
    at: Date;
    kind: "order" | "register" | "sub-started" | "sub-cancelled";
    title: string;
    detail: string;
    userId?: string;
  };
  const events: Event[] = [];
  for (const o of recentPaidOrders) {
    if (!o.paidAt) continue;
    events.push({
      at: o.paidAt,
      kind: "order",
      title: `Betaling — €${(o.amountCents / 100).toFixed(2).replace(".", ",")}`,
      detail: `${o.user?.name ?? "?"} · ${o.kind === "subscription" ? "abonnement" : o.kind === "credits" ? "credits" : o.kind}`,
      userId: o.userId ?? undefined,
    });
  }
  for (const u of recentRegistrations) {
    events.push({
      at: u.createdAt,
      kind: "register",
      title: "Nieuwe registratie",
      detail: `${u.name} · ${u.email}`,
      userId: u.id,
    });
  }
  for (const s of recentSubscriptionEvents) {
    if (s.cancelledAt) {
      events.push({
        at: s.cancelledAt,
        kind: "sub-cancelled",
        title: "Abonnement opgezegd",
        detail: `${s.user?.name ?? "?"} · ${s.plan}`,
        userId: s.userId,
      });
    } else if (s.mollieSubscriptionId && s.startedAt) {
      events.push({
        at: s.startedAt,
        kind: "sub-started",
        title: "Abonnement gestart",
        detail: `${s.user?.name ?? "?"} · ${s.plan}`,
        userId: s.userId,
      });
    }
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  const activity = events.slice(0, 20);

  // AI-kosten: gebruik werkelijke `Story.aiCostCents` voor verhalen die
  // het hebben (na deploy van item 8). Voor verhalen van daarvóór, vul
  // aan met de €0,15-schatting per verhaal — dan staat het maandcijfer
  // niet kunstmatig laag tijdens de overgangsperiode.
  const trackedMonth = aiCostMonthAgg._sum.aiCostCents ?? 0;
  const untrackedMonth =
    Math.max(0, storiesMonth - storiesMonthWithCost) * AI_COST_CENTS_PER_STORY;
  const aiCostMonthCents = trackedMonth + untrackedMonth;

  const trackedLifetime = aiCostLifetimeAgg._sum.aiCostCents ?? 0;
  const untrackedLifetime =
    Math.max(0, storiesLifetime - storiesLifetimeWithCost) *
    AI_COST_CENTS_PER_STORY;
  const aiCostYearCents = trackedLifetime + untrackedLifetime;

  const grossMarginMonthCents = revenueMonth - aiCostMonthCents;

  return {
    revenue: {
      todayCents: revenueToday,
      monthCents: revenueMonth,
      yearCents: revenueYear,
      lifetimeCents: revenueLifetime,
      paidOrdersToday,
      paidOrdersMonth,
    },
    activity: {
      newUsersToday,
      newUsersMonth,
      storiesToday,
      storiesMonth,
      storiesLifetime,
    },
    subscriptions: {
      activeTotal: activeSubs.length,
      byPlan: subsByPlan,
      cancelledThisMonth,
      mrrCents,
      arrCents,
    },
    margin: {
      aiCostMonthCents,
      aiCostYearCents,
      grossMarginMonthCents,
      /** Hoeveel verhalen van deze maand een echte aiCostCents-meting
       *  hebben (rest valt terug op de €0,15-schatting). */
      storiesMonthWithCost,
      /** Som van werkelijke meet-cents voor deze maand (zonder
       *  fallback-component). Handig voor "X getrackt"-tekstjes. */
      trackedAiCostMonthCents: trackedMonth,
    },
    health: {
      pendingUsers,
      failedJobs,
      processingJobs,
    },
    topCustomers: topCustomersHydrated,
    events: activity,
    feedback: {
      upCount: feedbackUpCount,
      downCount: feedbackDownCount,
      recentNegative: recentNegativeFeedback,
    },
    plans, // expose so the dashboard can show plan names not codes
  };
}

async function sumOrderAmount(where: object): Promise<number> {
  const r = await prisma.order.aggregate({
    where: { status: "paid", ...where },
    _sum: { amountCents: true },
  });
  return r._sum.amountCents ?? 0;
}

// ── Revenue time-series ─────────────────────────────────────────────

export type Granularity = "day" | "week" | "month" | "quarter";
export type RevenueBucket = {
  /** Inclusive start of the bucket. */
  start: Date;
  /** Short Dutch label suitable for an x-axis tick. */
  label: string;
  /** Sum of paid Order.amountCents falling inside the bucket. */
  totalCents: number;
  /** Split per Order.kind so the chart can stack credits / subs separately. */
  creditsCents: number;
  subscriptionCents: number;
  bookCents: number;
  /** Count of paid orders for tooltip detail. */
  orderCount: number;
};

/**
 * Bucket every paid order between `from` (inclusive) and `to` (exclusive)
 * into time-buckets at the chosen granularity, and return one row per
 * bucket — including empty buckets so the chart's x-axis is gap-free.
 *
 * `from` is automatically clamped to REVENUE_CUTOFF; the chart never
 * shows pre-live test data even if the caller forgets to clamp.
 */
export async function loadRevenueTimeSeries(opts: {
  from: Date;
  to: Date;
  granularity: Granularity;
}): Promise<RevenueBucket[]> {
  const from = maxDate(opts.from, REVENUE_CUTOFF);
  const to = opts.to;
  if (from.getTime() >= to.getTime()) return [];

  const orders = await prisma.order.findMany({
    where: {
      status: "paid",
      paidAt: { gte: from, lt: to },
    },
    select: { paidAt: true, amountCents: true, kind: true },
    orderBy: { paidAt: "asc" },
  });

  // Generate empty buckets covering [from, to).
  const buckets: RevenueBucket[] = [];
  let cursor = bucketStart(from, opts.granularity);
  while (cursor.getTime() < to.getTime()) {
    buckets.push({
      start: new Date(cursor),
      label: bucketLabel(cursor, opts.granularity),
      totalCents: 0,
      creditsCents: 0,
      subscriptionCents: 0,
      bookCents: 0,
      orderCount: 0,
    });
    cursor = bucketAdvance(cursor, opts.granularity);
  }

  // Fill in totals — linear scan, both arrays are time-sorted.
  let bi = 0;
  for (const o of orders) {
    if (!o.paidAt) continue;
    while (
      bi + 1 < buckets.length &&
      o.paidAt.getTime() >= buckets[bi + 1].start.getTime()
    ) {
      bi++;
    }
    buckets[bi].totalCents += o.amountCents;
    buckets[bi].orderCount += 1;
    if (o.kind === "credits") buckets[bi].creditsCents += o.amountCents;
    else if (o.kind === "subscription")
      buckets[bi].subscriptionCents += o.amountCents;
    else if (o.kind === "book") buckets[bi].bookCents += o.amountCents;
  }
  return buckets;
}

function bucketStart(d: Date, g: Granularity): Date {
  if (g === "day") return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (g === "week") {
    // ISO week: Monday as the first day.
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayIdx = (start.getDay() + 6) % 7; // Mon=0, Sun=6
    start.setDate(start.getDate() - dayIdx);
    return start;
  }
  if (g === "month") return new Date(d.getFullYear(), d.getMonth(), 1);
  if (g === "quarter") {
    const qMonth = Math.floor(d.getMonth() / 3) * 3;
    return new Date(d.getFullYear(), qMonth, 1);
  }
  return d;
}

function bucketAdvance(d: Date, g: Granularity): Date {
  const next = new Date(d);
  if (g === "day") next.setDate(next.getDate() + 1);
  else if (g === "week") next.setDate(next.getDate() + 7);
  else if (g === "month") next.setMonth(next.getMonth() + 1);
  else if (g === "quarter") next.setMonth(next.getMonth() + 3);
  return next;
}

function bucketLabel(d: Date, g: Granularity): string {
  if (g === "day") {
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  }
  if (g === "week") {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${d.getDate()}-${end.getDate()} ${d.toLocaleDateString("nl-NL", { month: "short" })}`;
  }
  if (g === "month") {
    return d.toLocaleDateString("nl-NL", { month: "short", year: "2-digit" });
  }
  if (g === "quarter") {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} ${d.getFullYear().toString().slice(2)}`;
  }
  return d.toISOString().slice(0, 10);
}

// ── Conversion funnel ──────────────────────────────────────────────

export type FunnelStep = {
  /** Display label, e.g. "Registratie" */
  label: string;
  /** Optional one-line explanation shown under the label. */
  description: string;
  /** Number of users who reached this step. */
  count: number;
};

/**
 * The six-step customer funnel from sign-up to recurring revenue.
 * Each step's count is users who have *reached* the step — so by
 * definition counts decrease (or stay equal) down the chain.
 *
 * Default scope: alle users (niet admins) sinds REVENUE_CUTOFF, dus
 * live-mode-era. Met opts.since kun je een cohort-window meegeven
 * (bv. laatste 30 dagen voor onboarding-evaluatie).
 */
export async function loadFunnelStats(opts?: {
  since?: Date;
}): Promise<FunnelStep[]> {
  const since = opts?.since ?? REVENUE_CUTOFF;
  const where = { role: "user", createdAt: { gte: since } } as const;

  const [
    registered,
    approved,
    withChildProfile,
    withStory,
    withPaidOrder,
    withActiveSub,
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { ...where, status: "approved" } }),
    prisma.user.count({
      where: { ...where, children: { some: {} } },
    }),
    prisma.user.count({
      where: {
        ...where,
        children: { some: { stories: { some: {} } } },
      },
    }),
    prisma.user.count({
      where: {
        ...where,
        orders: { some: { status: "paid", paidAt: { gte: since } } },
      },
    }),
    prisma.user.count({
      where: {
        ...where,
        subscription: {
          is: {
            status: "active",
            plan: { not: "free" },
            mollieSubscriptionId: { not: null },
          },
        },
      },
    }),
  ]);

  return [
    {
      label: "Registratie",
      description: "Account aangemaakt",
      count: registered,
    },
    {
      label: "Goedgekeurd",
      description: "Admin heeft account vrijgegeven",
      count: approved,
    },
    {
      label: "Profiel",
      description: "Eerste kindprofiel ingevuld",
      count: withChildProfile,
    },
    {
      label: "Eerste verhaal",
      description: "Tenminste één verhaal gegenereerd",
      count: withStory,
    },
    {
      label: "Eerste betaling",
      description: "Credits of abonnement betaald",
      count: withPaidOrder,
    },
    {
      label: "Actief abonnement",
      description: "Recurring billing loopt",
      count: withActiveSub,
    },
  ];
}

// ── Cohort retention ───────────────────────────────────────────────

export type CohortRow = {
  /** Inclusive start of the cohort's signup month. */
  cohortStart: Date;
  /** Display label, e.g. "Mei 2026". */
  label: string;
  /** Cohort size — users who registered in that month. */
  size: number;
  /**
   * Per-month-offset retention.
   * `retained[k]` = number of cohort users who generated a story in
   * the calendar month that's k months after cohortStart.
   *
   * `retained[0]` is the signup month itself — anyone who generated a
   * story in their signup month counts as "activated", typically the
   * most useful single number alongside the eventual retention curve.
   *
   * Future months that haven't happened yet are not included; the
   * UI treats them as "not yet measured" rather than "0% retained".
   */
  retained: number[];
};

/**
 * Build a monthly cohort retention table.
 *
 * Activity signal: a user is "active in month M" if they generated at
 * least one story whose `createdAt` falls inside that month. Story
 * generation is the strongest engagement signal we have — login alone
 * could just be checking, story generation is the actual product use.
 *
 * Returns cohorts oldest-first so the table reads top-down by signup
 * date, with the longest retention curve at the top.
 */
export async function loadCohortRetention(opts: {
  /** Number of recent monthly cohorts to include. Default 6. */
  cohorts?: number;
} = {}): Promise<CohortRow[]> {
  const cohortCount = opts.cohorts ?? 6;
  const now = new Date();
  const currentMonth = startOfMonth(now);

  // First cohort starts (cohortCount - 1) months ago.
  const firstCohort = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - (cohortCount - 1),
    1,
  );

  // Pull users whose signup month ≥ firstCohort. Limit to `user` role.
  const users = await prisma.user.findMany({
    where: {
      role: "user",
      createdAt: { gte: firstCohort },
    },
    select: { id: true, createdAt: true },
  });

  // Pull all story creation timestamps for those users via children.
  // We could pre-compute (userId, month) buckets in DB but at our scale
  // it's fine to bucket in memory.
  const userIds = users.map((u) => u.id);
  const stories = userIds.length
    ? await prisma.story.findMany({
        where: {
          createdAt: { gte: firstCohort },
          childProfile: { userId: { in: userIds } },
        },
        select: { createdAt: true, childProfile: { select: { userId: true } } },
      })
    : [];

  // Per user → set of "active months" (yyyy-mm strings).
  const userActiveMonths = new Map<string, Set<string>>();
  for (const s of stories) {
    const uid = s.childProfile.userId;
    const key = `${s.createdAt.getFullYear()}-${s.createdAt.getMonth()}`;
    let set = userActiveMonths.get(uid);
    if (!set) {
      set = new Set();
      userActiveMonths.set(uid, set);
    }
    set.add(key);
  }

  // Build the cohort buckets oldest-first.
  const cohorts: CohortRow[] = [];
  for (let i = 0; i < cohortCount; i++) {
    const cohortStart = new Date(
      firstCohort.getFullYear(),
      firstCohort.getMonth() + i,
      1,
    );
    const monthsSinceCohort = monthsBetween(cohortStart, currentMonth) + 1; // include current
    const cohortUsers = users.filter(
      (u) =>
        u.createdAt.getFullYear() === cohortStart.getFullYear() &&
        u.createdAt.getMonth() === cohortStart.getMonth(),
    );
    const retained: number[] = [];
    for (let k = 0; k < monthsSinceCohort; k++) {
      const target = new Date(
        cohortStart.getFullYear(),
        cohortStart.getMonth() + k,
        1,
      );
      const targetKey = `${target.getFullYear()}-${target.getMonth()}`;
      let active = 0;
      for (const u of cohortUsers) {
        if (userActiveMonths.get(u.id)?.has(targetKey)) active++;
      }
      retained.push(active);
    }
    cohorts.push({
      cohortStart,
      label: cohortStart.toLocaleDateString("nl-NL", {
        month: "short",
        year: "2-digit",
      }),
      size: cohortUsers.length,
      retained,
    });
  }
  return cohorts;
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
