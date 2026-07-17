import { SequenceType } from "@mollie/api-client";
import { prisma } from "@/lib/db";
import {
  getMollieClient,
  centsToMollieAmount,
} from "./mollie";
import { buildAppUrl, buildWebhookUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildSubscriptionCancelledMail } from "@/lib/email/templates/subscription-cancelled";
import {
  buildSubscriptionPaymentFailedMail,
  buildAdminSubscriptionPaymentFailedMail,
} from "@/lib/email/templates/subscription-payment-failed";
import { getAdminNotifyEmails } from "@/lib/admin/notify";
import { assignInvoiceNumber } from "./invoices";

/**
 * Mollie's recurring billing requires a `Customer` object that survives
 * across payments. We attach the id to our Subscription row so it sticks
 * with the user even if they cancel and re-subscribe.
 *
 * Idempotent: returns the existing customer id when present, creates a
 * fresh one otherwise.
 */
export async function getOrCreateMollieCustomer(userId: string): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { mollieCustomerId: true },
  });
  if (existing?.mollieCustomerId) return existing.mollieCustomerId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) throw new Error("user_not_found");

  const client = getMollieClient();
  const customer = await client.customers.create({
    name: user.name,
    email: user.email,
    metadata: { userId },
  });

  // Upsert Subscription row so we have a place to persist mollieCustomerId
  // before any actual subscription is started. The row lives in `free`
  // status until the first payment captures the mandate.
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: "free",
      status: "active",
      mollieCustomerId: customer.id,
    },
    update: { mollieCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Start the subscription purchase flow:
 *   1. Resolve plan from /admin/pricing catalog
 *   2. Refuse if the user already has a paid active subscription
 *   3. Get/create the Mollie customer
 *   4. Create our Order row (kind="subscription") for the first payment
 *   5. Create a customer-payment in Mollie with sequenceType="first" so
 *      the iDEAL/card UX captures a recurring mandate alongside the
 *      one-time charge
 *
 * Returns the hosted-checkout URL and our orderId. The actual Mollie
 * subscription (recurring billing schedule) is created later in the
 * webhook, once the first payment is confirmed paid and we have a
 * mandate id.
 */
export async function createSubscriptionCheckout(opts: {
  userId: string;
  planCode: string;
}): Promise<{ checkoutUrl: string; orderId: string }> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: opts.planCode },
  });
  if (!plan) throw new Error("plan_not_found");
  if (!plan.active) throw new Error("plan_inactive");

  // Block dual subscriptions — user must cancel current one first.
  const existing = await prisma.subscription.findUnique({
    where: { userId: opts.userId },
  });
  if (
    existing &&
    existing.plan !== "free" &&
    existing.status === "active" &&
    existing.mollieSubscriptionId
  ) {
    throw new Error("already_subscribed");
  }

  // Close the two-tab window: the check above only trips once a Mollie
  // subscription id exists, which isn't set until the first payment
  // confirms. Two checkouts started in parallel would otherwise both pay
  // and both spin up a recurring schedule. Refuse a second checkout while
  // a recent subscription order for this user is still pending.
  const pendingSubOrder = await prisma.order.findFirst({
    where: {
      userId: opts.userId,
      kind: "subscription",
      status: "pending",
      createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) },
    },
  });
  if (pendingSubOrder) {
    throw new Error("subscription_checkout_in_progress");
  }

  const customerId = await getOrCreateMollieCustomer(opts.userId);

  const order = await prisma.order.create({
    data: {
      userId: opts.userId,
      kind: "subscription",
      description: `Abonnement: ${plan.name}`,
      amountCents: plan.priceCents,
      currency: plan.currency,
      vatRate: plan.vatRate,
      status: "pending",
    },
  });

  const redirectUrl = await buildAppUrl(`/subscribe/order/${order.id}`);
  const cancelUrl = await buildAppUrl(`/subscribe`);
  const webhookUrl = await buildWebhookUrl(`/api/payments/mollie/webhook`);

  const client = getMollieClient();
  // sequenceType=first tells Mollie this is the inaugural payment of
  // a recurring relationship — its checkout shows the "automatische
  // incasso"-mandate UX in addition to the one-time charge UI. The
  // top-level payments.create endpoint accepts customerId for this.
  const payment = await client.payments.create({
    customerId,
    amount: {
      currency: plan.currency,
      value: centsToMollieAmount(plan.priceCents),
    },
    description: `Ons Verhaaltje — ${plan.name} (eerste betaling)`,
    redirectUrl,
    cancelUrl,
    webhookUrl,
    sequenceType: SequenceType.first,
    metadata: {
      orderId: order.id,
      planCode: plan.code,
      userId: opts.userId,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { molliePaymentId: payment.id },
  });

  const checkoutUrl = payment.getCheckoutUrl();
  if (!checkoutUrl) throw new Error("mollie_no_checkout_url");

  return { checkoutUrl, orderId: order.id };
}

/**
 * After the first subscription payment confirms paid, schedule the
 * recurring billing in Mollie. This is what makes future months/years
 * auto-charge without further user interaction.
 *
 * Idempotent — checks our DB first; if a Mollie subscription already
 * exists for this user, returns its id and does nothing.
 */
export async function startRecurringSubscription(opts: {
  userId: string;
  planCode: string;
  mandateId: string;
}): Promise<string> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: opts.planCode },
  });
  if (!plan) throw new Error("plan_not_found");

  const existing = await prisma.subscription.findUnique({
    where: { userId: opts.userId },
  });
  if (existing?.mollieSubscriptionId) {
    return existing.mollieSubscriptionId;
  }
  if (!existing?.mollieCustomerId) {
    throw new Error("no_mollie_customer");
  }

  const webhookUrl = await buildWebhookUrl(`/api/payments/mollie/webhook`);
  const client = getMollieClient();

  const subscription = await client.customerSubscriptions.create({
    customerId: existing.mollieCustomerId,
    amount: {
      currency: plan.currency,
      value: centsToMollieAmount(plan.priceCents),
    },
    interval: plan.interval,
    description: `Ons Verhaaltje — ${plan.name}`,
    webhookUrl,
    mandateId: opts.mandateId,
    metadata: {
      planCode: plan.code,
      userId: opts.userId,
    },
  });

  // Compute when the current paid period ends so we can stop access
  // promptly on cancellation. Mollie uses an interval string like
  // "1 month" or "12 months" — parse the leading integer + unit.
  const endsAt = computePeriodEnd(plan.interval, new Date());

  await prisma.subscription.update({
    where: { userId: opts.userId },
    data: {
      mollieSubscriptionId: subscription.id,
      mollieMandateId: opts.mandateId,
      plan: plan.code,
      status: "active",
      startedAt: new Date(),
      endsAt,
      cancelledAt: null,
    },
  });

  // Top up the credit balance for the period that just started.
  if (plan.creditsPerInterval && plan.creditsPerInterval > 0) {
    await prisma.user.update({
      where: { id: opts.userId },
      data: {
        storyCredits: { increment: plan.creditsPerInterval },
      },
    });
  }

  return subscription.id;
}

/**
 * Allowed values for `Subscription.cancellationReason`. The UI uses a
 * radio-set with these four codes; null means "opgezegd vóór de survey
 * werd ingebouwd".
 */
export const CANCELLATION_REASONS = [
  "te_duur",
  "weinig_gebruikt",
  "tijdelijk",
  "anders",
] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export function isCancellationReason(v: unknown): v is CancellationReason {
  return (
    typeof v === "string" &&
    (CANCELLATION_REASONS as readonly string[]).includes(v)
  );
}

/**
 * Cancel an active Mollie subscription. The user keeps access until the
 * end of the period they already paid for. Optionally records the
 * survey answer (reason + free-text note) on the Subscription row.
 */
export async function cancelSubscription(
  userId: string,
  opts?: { reason?: CancellationReason | null; note?: string | null },
): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  // No row, free plan, or already cancelled = nothing to do.
  if (!sub || sub.plan === "free" || sub.status === "cancelled") {
    throw new Error("no_active_subscription");
  }

  // Only call Mollie if there's an actual recurring billing arrangement.
  // Admin-comped subs (no Mollie IDs) just get marked cancelled in our DB.
  if (sub.mollieCustomerId && sub.mollieSubscriptionId) {
    const client = getMollieClient();
    await client.customerSubscriptions.cancel(sub.mollieSubscriptionId, {
      customerId: sub.mollieCustomerId,
    });
  }

  const note = opts?.note?.trim() ?? "";
  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationReason: opts?.reason ?? null,
      cancellationReasonNote: note.length > 0 ? note.slice(0, 1000) : null,
    },
  });

  // Confirmation mail. Best-effort — never fail the cancel if the mail
  // bounces. The user already sees the UI confirmation on /account.
  try {
    const [user, plan] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      }),
      prisma.subscriptionPlan.findUnique({ where: { code: updated.plan } }),
    ]);
    if (user) {
      const accountUrl = await buildAppUrl("/account");
      const subscribeUrl = await buildAppUrl("/subscribe");
      const mail = await buildSubscriptionCancelledMail({
        name: user.name,
        planName: plan?.name ?? "abonnement",
        endsAt: updated.endsAt,
        accountUrl,
        subscribeUrl,
      });
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["subscription-cancelled"],
      });
    }
  } catch (mailError) {
    console.error(
      `[subscriptions] cancel-confirmation mail failed for user ${userId}`,
      mailError instanceof Error ? mailError.message : mailError,
    );
  }
}

/**
 * Apply credits + mark the order paid for a renewal payment we just
 * received from Mollie. Idempotent — looks up by molliePaymentId, only
 * creates a new Order if one didn't already exist.
 */
export async function applyRecurringPayment(opts: {
  paymentId: string;
  customerId: string | null;
  subscriptionMollieId: string | null;
  amountCents: number;
  status: string;
}): Promise<void> {
  // Find our Subscription via the Mollie subscription id (preferred)
  // or via the customer id (fallback, in case subscriptionId field is
  // missing for some reason).
  const sub = opts.subscriptionMollieId
    ? await prisma.subscription.findFirst({
        where: { mollieSubscriptionId: opts.subscriptionMollieId },
      })
    : opts.customerId
      ? await prisma.subscription.findFirst({
          where: { mollieCustomerId: opts.customerId },
        })
      : null;
  if (!sub) {
    console.warn(
      `[subscriptions] recurring payment ${opts.paymentId} has no matching subscription — ignored`,
    );
    return;
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: sub.plan },
  });

  // Find or create the Order row for this renewal.
  let order = await prisma.order.findUnique({
    where: { molliePaymentId: opts.paymentId },
  });
  if (!order) {
    order = await prisma.order.create({
      data: {
        userId: sub.userId,
        kind: "subscription",
        description: plan ? `Abonnement: ${plan.name}` : "Abonnement",
        amountCents: opts.amountCents,
        currency: "EUR",
        vatRate: plan?.vatRate ?? 21,
        status: "pending",
        molliePaymentId: opts.paymentId,
        subscriptionId: sub.id,
      },
    });
  }

  if (opts.status === "paid" && order.status !== "paid") {
    const newEndsAt = plan
      ? computePeriodEnd(plan.interval, new Date())
      : null;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: "paid", paidAt: new Date() },
      }),
      // Top up credits if the plan grants them.
      ...(plan?.creditsPerInterval && plan.creditsPerInterval > 0
        ? [
            prisma.user.update({
              where: { id: sub.userId },
              data: {
                storyCredits: { increment: plan.creditsPerInterval },
              },
            }),
          ]
        : []),
      // Push the period end forward. Status altijd terug naar
      // "active" — ook wanneer een eerder mislukte incasso het
      // abonnement op "past_due" had gezet.
      prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: "active",
          ...(newEndsAt ? { endsAt: newEndsAt } : {}),
        },
      }),
    ]);

    // Factuurnummer voor de verlenging — best-effort, mag de betaling
    // nooit blokkeren.
    try {
      await assignInvoiceNumber(order.id);
    } catch (err) {
      console.error(
        `[subscriptions] invoice number assignment failed for order ${order.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  } else if (
    FAILED_RECURRING_STATUSES.includes(opts.status) &&
    order.status !== "paid" &&
    order.status !== opts.status
  ) {
    // Mislukte incasso (failed / expired / cancelled): orderstatus
    // bijwerken en het abonnement op past_due zetten (dunning). Mails
    // gaan alleen de deur uit bij de échte overgang active → past_due,
    // dus webhook-retries spammen niemand.
    await prisma.order.update({
      where: { id: order.id },
      data: { status: opts.status },
    });
    await markSubscriptionPastDue({
      subscriptionId: sub.id,
      paymentStatus: opts.status,
    });
  }
}

/** Order-statussen die een mislukte terugkerende incasso aangeven. */
const FAILED_RECURRING_STATUSES = ["failed", "expired", "cancelled"];

/**
 * Zet een abonnement op "past_due" (alleen wanneer het nu "active" is —
 * atomair via updateMany) en stuur klant + admin een notificatie.
 * Retourneert true wanneer de overgang daadwerkelijk plaatsvond; false
 * betekent dat het abonnement al past_due / cancelled was en er dus ook
 * geen mails verstuurd zijn.
 *
 * `skipMails` laat de cron de statusovergang doen terwijl het
 * e-maillogboek-dedupe daar de mails al heeft tegengehouden.
 */
export async function markSubscriptionPastDue(opts: {
  subscriptionId: string;
  /** De betaalstatus die de aanleiding was ("failed", "expired",
   *  "cancelled" of "overdue" voor het cron-vangnet). */
  paymentStatus: string;
  skipMails?: boolean;
}): Promise<boolean> {
  const res = await prisma.subscription.updateMany({
    where: { id: opts.subscriptionId, status: "active" },
    data: { status: "past_due" },
  });
  if (res.count === 0) return false;

  if (!opts.skipMails) {
    await sendPaymentFailedMails(opts.subscriptionId, opts.paymentStatus);
  }
  return true;
}

/**
 * Klant- en admin-mail voor een mislukte incasso. Volledig best-effort:
 * elke fout wordt gelogd en geslikt, de statusovergang is dan al gedaan.
 */
export async function sendPaymentFailedMails(
  subscriptionId: string,
  paymentStatus: string,
): Promise<void> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!sub?.user) return;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: sub.plan },
    });
    const planName = plan?.name ?? "abonnement";

    // Klantmail.
    try {
      const accountUrl = await buildAppUrl("/account");
      const mail = await buildSubscriptionPaymentFailedMail({
        name: sub.user.name,
        planName,
        endsAt: sub.endsAt,
        accountUrl,
      });
      await sendMail({
        to: sub.user.email,
        toName: sub.user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["subscription-payment-failed"],
      });
    } catch (err) {
      console.error(
        `[subscriptions] payment-failed mail to user ${sub.user.id} failed`,
        err instanceof Error ? err.message : err,
      );
    }

    // Admin-notificatie — per adres apart zodat één bounce de rest
    // niet blokkeert (zelfde patroon als andere admin-notificaties).
    try {
      const adminUrl = await buildAppUrl(`/admin/users/${sub.user.id}`);
      const adminMail = buildAdminSubscriptionPaymentFailedMail({
        userName: sub.user.name,
        userEmail: sub.user.email,
        planName,
        paymentStatus,
        endsAt: sub.endsAt,
        adminUrl,
      });
      for (const to of getAdminNotifyEmails()) {
        try {
          await sendMail({
            to,
            subject: adminMail.subject,
            html: adminMail.html,
            text: adminMail.text,
            tags: ["admin-subscription-payment-failed"],
          });
        } catch (perAddressErr) {
          console.error(
            `[subscriptions] admin payment-failed mail to ${to} failed`,
            perAddressErr instanceof Error
              ? perAddressErr.message
              : perAddressErr,
          );
        }
      }
    } catch (err) {
      console.error(
        `[subscriptions] admin payment-failed notification failed for subscription ${subscriptionId}`,
        err instanceof Error ? err.message : err,
      );
    }
  } catch (err) {
    console.error(
      `[subscriptions] sendPaymentFailedMails failed for subscription ${subscriptionId}`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Heeft deze gebruiker een actief betaald abonnement? Gebruikt door de
 * TTS-premium-gate: past_due of cancelled telt niet als actief.
 */
export async function hasActivePaidSubscription(
  userId: string,
): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, plan: true },
  });
  return !!sub && sub.status === "active" && sub.plan !== "free";
}

/**
 * Add an interval (Mollie's "1 month", "12 months", "14 days"…) to a
 * starting date. Used to compute the local `endsAt` so we can show the
 * user when their access expires after a cancellation.
 */
export function computePeriodEnd(interval: string, from: Date): Date {
  const match = interval.trim().match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)$/i);
  if (!match) {
    // Unknown shape — return the existing date untouched. The webhook
    // will still update on each renewal.
    return from;
  }
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const result = new Date(from);
  if (unit.startsWith("day")) result.setDate(result.getDate() + n);
  else if (unit.startsWith("week")) result.setDate(result.getDate() + n * 7);
  else if (unit.startsWith("month")) result.setMonth(result.getMonth() + n);
  else if (unit.startsWith("year")) result.setFullYear(result.getFullYear() + n);
  return result;
}
