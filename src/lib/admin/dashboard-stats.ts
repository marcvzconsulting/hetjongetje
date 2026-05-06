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

export async function loadDashboardStats() {
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
  const topUserIds = topCustomers.map((c) => c.userId);
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
    const u = topUserMap.get(c.userId);
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
      userId: o.userId,
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

  // Margin estimate — only stories cost AI right now (book PDFs are
  // priced per print). Not perfect but a useful directional number.
  const aiCostMonthCents = storiesMonth * AI_COST_CENTS_PER_STORY;
  const aiCostYearCents = storiesLifetime * AI_COST_CENTS_PER_STORY;
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
    },
    health: {
      pendingUsers,
      failedJobs,
      processingJobs,
    },
    topCustomers: topCustomersHydrated,
    events: activity,
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
    select: { paidAt: true, amountCents: true },
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
