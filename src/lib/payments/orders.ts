import { prisma } from "@/lib/db";
import {
  getMollieClient,
  centsToMollieAmount,
  mollieStatusToOrderStatus,
} from "./mollie";
import { buildAppUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildCreditsPurchasedMail } from "@/lib/email/templates/credits-purchased";
import {
  startRecurringSubscription,
  applyRecurringPayment,
} from "./subscriptions";
import { buildSubscriptionStartedMail } from "@/lib/email/templates/subscription-started";

/**
 * Create a credits order + matching Mollie payment in one transaction-
 * adjacent flow:
 *   1. Insert Order row in `pending`
 *   2. Call Mollie to create the Payment, with our orderId as metadata
 *   3. Patch the Order with the molliePaymentId Mollie returns
 *
 * If step 2 throws, the Order stays in `pending` with a null
 * molliePaymentId — webhook will never visit it; a janitor query can
 * later sweep these by `status=pending AND molliePaymentId IS NULL AND
 * createdAt < now() - 1h`.
 *
 * Returns the URL the user should be redirected to (Mollie's hosted
 * checkout). The caller is responsible for the actual redirect.
 */
export async function createCreditsCheckout(opts: {
  userId: string;
  packId: string;
}): Promise<{ checkoutUrl: string; orderId: string }> {
  const pack = await prisma.creditPack.findUnique({
    where: { id: opts.packId },
  });
  if (!pack) throw new Error("pack_not_found");
  if (!pack.active) throw new Error("pack_inactive");

  const description = `${pack.creditAmount} ${
    pack.creditAmount === 1 ? "verhaal" : "verhalen"
  }`;

  // 1. Create the Order in pending — gives us a stable id we can hand to
  //    Mollie as metadata so the webhook can find us back.
  const order = await prisma.order.create({
    data: {
      userId: opts.userId,
      kind: "credits",
      description,
      amountCents: pack.priceCents,
      currency: pack.currency,
      vatRate: pack.vatRate,
      creditAmount: pack.creditAmount,
      status: "pending",
    },
  });

  // 2. Hand off to Mollie. The redirectUrl is where the user lands after
  //    paying (or after a final fail/expire). The cancelUrl is where the
  //    "Vorige pagina"-style escape on Mollie's checkout sends them
  //    when they back out without choosing a method — we point this at
  //    /credits so they're back on the pack-picker, not on a stale order
  //    status page. The webhookUrl is where Mollie POSTs payment-status
  //    changes server-to-server. All three must be public URLs; in dev
  //    that requires a tunnel.
  const redirectUrl = await buildAppUrl(`/credits/order/${order.id}`);
  const cancelUrl = await buildAppUrl(`/credits`);
  const webhookUrl = await buildAppUrl(`/api/payments/mollie/webhook`);

  const client = getMollieClient();
  const payment = await client.payments.create({
    amount: {
      currency: pack.currency,
      value: centsToMollieAmount(pack.priceCents),
    },
    description: `Ons Verhaaltje — ${description}`,
    redirectUrl,
    cancelUrl,
    webhookUrl,
    metadata: { orderId: order.id, kind: "credits", packCode: pack.code },
  });

  // 3. Stamp the payment id onto the order. From here, the webhook
  //    is what drives status updates.
  await prisma.order.update({
    where: { id: order.id },
    data: { molliePaymentId: payment.id },
  });

  // The SDK exposes the checkout URL via getCheckoutUrl() in v4.
  const checkoutUrl = payment.getCheckoutUrl();
  if (!checkoutUrl) {
    // Defensive — should never happen for a fresh hosted-checkout payment.
    throw new Error("mollie_no_checkout_url");
  }

  return { checkoutUrl, orderId: order.id };
}

/**
 * Resolve a Mollie payment status into our DB state. Idempotent: safe to
 * call multiple times for the same payment (Mollie webhooks can fire
 * twice for the same status). Grants credits exactly once on the
 * pending → paid transition.
 *
 * Returns the resolved Order so the caller can inspect / log.
 */
export async function applyMolliePaymentStatus(paymentId: string) {
  const client = getMollieClient();
  const payment = await client.payments.get(paymentId);

  const newStatus = mollieStatusToOrderStatus(payment.status);

  // Recurring subscription payment: Mollie creates the Payment object
  // automatically each interval, we don't have an Order in advance.
  // Detect by sequenceType — "recurring" only fires for auto-charges.
  const isRecurring =
    (payment.sequenceType as string | undefined) === "recurring";

  const order = await prisma.order.findUnique({
    where: { molliePaymentId: paymentId },
  });

  if (!order && isRecurring) {
    // First-time we see this renewal. Hand off to subscriptions module
    // which finds the right Subscription, creates an Order, applies status.
    await applyRecurringPayment({
      paymentId,
      customerId: payment.customerId ?? null,
      subscriptionMollieId:
        (payment as { subscriptionId?: string }).subscriptionId ?? null,
      amountCents: Math.round(parseFloat(payment.amount.value) * 100),
      status: newStatus,
    });
    return null;
  }

  if (!order) {
    // Payment exists but no matching Order — could be a webhook for an
    // unrelated tenant, or a race we lost. Caller logs and moves on.
    return null;
  }

  const wasPaid = order.status === "paid";
  const becomesPaid = newStatus === "paid" && !wasPaid;

  // Dispatch on order kind — credits, subscription, book each need
  // different handling on the pending → paid transition.
  if (becomesPaid && order.kind === "credits" && order.creditAmount) {
    await applyCreditsPaid(order);
  } else if (becomesPaid && order.kind === "subscription") {
    await applySubscriptionFirstPaid(order, payment);
  } else if (newStatus !== order.status) {
    // Other transition (failed, expired, cancelled) — just update the
    // order row, no credit / subscription change.
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus },
    });
  }

  return { ...order, status: newStatus };
}

/**
 * Handle the credits-purchase pending → paid transition: grant credits
 * to the user in a transaction, then fire the confirmation mail.
 */
async function applyCreditsPaid(order: {
  id: string;
  userId: string;
  creditAmount: number | null;
  amountCents: number;
  vatRate: number;
}): Promise<void> {
  if (!order.creditAmount) return;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "paid", paidAt: new Date() },
    }),
    prisma.user.update({
      where: { id: order.userId },
      data: { storyCredits: { increment: order.creditAmount } },
    }),
  ]);

  try {
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true, name: true },
    });
    if (user) {
      const dashboardUrl = await buildAppUrl("/dashboard");
      const mail = buildCreditsPurchasedMail({
        name: user.name,
        creditAmount: order.creditAmount,
        amountCents: order.amountCents,
        vatRate: order.vatRate,
        dashboardUrl,
        orderId: order.id,
      });
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["credits-purchased"],
      });
    }
  } catch (mailErr) {
    console.error(
      `[orders] credits confirmation mail failed for order ${order.id}`,
      mailErr instanceof Error ? mailErr.message : mailErr,
    );
  }
}

/**
 * First subscription payment paid: capture the mandate id from the
 * payment, kick off Mollie's recurring schedule, link the Order to the
 * Subscription record, send the welcome-to-subscription mail.
 */
async function applySubscriptionFirstPaid(
  order: {
    id: string;
    userId: string;
    amountCents: number;
    vatRate: number;
  },
  payment: {
    mandateId?: string | null;
    metadata?: unknown;
  },
): Promise<void> {
  // Mark order paid first so we have a stable record; the rest is best-
  // effort and recoverable.
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "paid", paidAt: new Date() },
  });

  const mandateId = payment.mandateId ?? null;
  const meta = (payment.metadata ?? {}) as { planCode?: string };
  const planCode = meta.planCode;

  if (!mandateId || !planCode) {
    console.error(
      `[orders] subscription first-payment ${order.id} missing mandate or planCode`,
      { mandateId, planCode },
    );
    return;
  }

  try {
    const subscriptionMollieId = await startRecurringSubscription({
      userId: order.userId,
      planCode,
      mandateId,
    });
    // Backfill the Order's subscriptionId now that we know which row
    // it belongs to (Subscription is found-or-created in startRecurring).
    const sub = await prisma.subscription.findUnique({
      where: { userId: order.userId },
    });
    if (sub) {
      await prisma.order.update({
        where: { id: order.id },
        data: { subscriptionId: sub.id },
      });
    }
    // Best-effort welcome mail.
    try {
      const [user, plan] = await Promise.all([
        prisma.user.findUnique({
          where: { id: order.userId },
          select: { email: true, name: true },
        }),
        prisma.subscriptionPlan.findUnique({
          where: { code: planCode },
        }),
      ]);
      if (user && plan && sub) {
        const accountUrl = await buildAppUrl("/account");
        const mail = buildSubscriptionStartedMail({
          name: user.name,
          planName: plan.name,
          amountCents: order.amountCents,
          vatRate: order.vatRate,
          interval: plan.interval,
          creditsPerInterval: plan.creditsPerInterval,
          nextChargeAt: sub.endsAt,
          accountUrl,
          subscriptionMollieId,
        });
        await sendMail({
          to: user.email,
          toName: user.name,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          tags: ["subscription-started"],
        });
      }
    } catch (mailErr) {
      console.error(
        `[orders] subscription welcome mail failed for order ${order.id}`,
        mailErr instanceof Error ? mailErr.message : mailErr,
      );
    }
  } catch (err) {
    console.error(
      `[orders] startRecurringSubscription failed for order ${order.id}`,
      err instanceof Error ? err.message : err,
    );
  }
}
