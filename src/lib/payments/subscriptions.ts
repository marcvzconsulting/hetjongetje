import { SequenceType } from "@mollie/api-client";
import { prisma } from "@/lib/db";
import {
  getMollieClient,
  centsToMollieAmount,
} from "./mollie";
import { buildAppUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildSubscriptionCancelledMail } from "@/lib/email/templates/subscription-cancelled";

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
  const webhookUrl = await buildAppUrl(`/api/payments/mollie/webhook`);

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

  const webhookUrl = await buildAppUrl(`/api/payments/mollie/webhook`);
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
 * Cancel an active Mollie subscription. The user keeps access until the
 * end of the period they already paid for.
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.mollieCustomerId || !sub.mollieSubscriptionId) {
    throw new Error("no_active_subscription");
  }

  const client = getMollieClient();
  await client.customerSubscriptions.cancel(sub.mollieSubscriptionId, {
    customerId: sub.mollieCustomerId,
  });

  const updated = await prisma.subscription.update({
    where: { userId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
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
      const mail = buildSubscriptionCancelledMail({
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
      // Push the period end forward.
      ...(newEndsAt
        ? [
            prisma.subscription.update({
              where: { id: sub.id },
              data: { endsAt: newEndsAt, status: "active" },
            }),
          ]
        : []),
    ]);
  }
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
