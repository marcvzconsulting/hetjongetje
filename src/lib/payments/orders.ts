import { prisma } from "@/lib/db";
import {
  getMollieClient,
  centsToMollieAmount,
  mollieStatusToOrderStatus,
} from "./mollie";
import { buildAppUrl, buildWebhookUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildCreditsPurchasedMail } from "@/lib/email/templates/credits-purchased";
import {
  startRecurringSubscription,
  applyRecurringPayment,
} from "./subscriptions";
import { buildSubscriptionStartedMail } from "@/lib/email/templates/subscription-started";
import { maybeGrantReferralBonus } from "@/lib/referral";
import { getAdminNotifyEmails } from "@/lib/admin/notify";
import { assignInvoiceNumber } from "./invoices";

/**
 * Best-effort factuurnummer-toekenning: een factuurnummer mag een
 * betaling nooit blokkeren, dus elke fout wordt gelogd en geslikt.
 */
export async function tryAssignInvoiceNumber(orderId: string): Promise<void> {
  try {
    await assignInvoiceNumber(orderId);
  } catch (err) {
    console.error(
      `[orders] invoice number assignment failed for order ${orderId}`,
      err instanceof Error ? err.message : err,
    );
  }
}

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
  const webhookUrl = await buildWebhookUrl(`/api/payments/mollie/webhook`);

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

  if (isRecurring) {
    // Auto-charge (sequenceType="recurring"). Hand off to the
    // subscriptions module, which finds the right Subscription, finds-or-
    // creates the Order and applies status idempotently. Dispatch on
    // isRecurring ALONE (not "!order && isRecurring"): if the renewal
    // Order already exists — e.g. an earlier webhook delivery created it,
    // or a crash landed between order.create and the paid transaction —
    // the paid webhook must still reach applyRecurringPayment, otherwise
    // it falls through to the first-payment branch and the customer pays
    // without getting credits or an endsAt extension.
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

  const order = await prisma.order.findUnique({
    where: { molliePaymentId: paymentId },
  });

  if (!order) {
    // Payment exists but no matching Order — could be a webhook for an
    // unrelated tenant, or a race we lost. Caller logs and moves on.
    return null;
  }

  // Refunded is a terminal state managed by the admin refund action
  // (which reverses credits). A refund does NOT change the Mollie payment
  // status — it stays "paid" — so without this guard the next webhook
  // delivery would see status "refunded" ≠ "paid", treat it as a fresh
  // pending→paid transition, and re-grant the credits we just clawed back.
  if (order.status === "refunded") {
    return { ...order };
  }

  // Chargeback / dispute: Mollie keeps the payment "paid" but reports a
  // non-zero amountChargedBack. Reverse the benefit best-effort and alert
  // an admin — otherwise the money is gone while credits/access remain.
  const chargedBackValue = parseFloat(
    (payment as { amountChargedBack?: { value?: string } }).amountChargedBack
      ?.value ?? "0",
  );
  if (chargedBackValue > 0 && order.status !== "charged_back") {
    await handleChargeback(order);
    return { ...order, status: "charged_back" };
  }

  const wasPaid = order.status === "paid";
  const becomesPaid = newStatus === "paid" && !wasPaid;

  // Account verwijderd terwijl de betaling nog liep (userId is dan null
  // via SetNull): er is niemand meer om credits of een abonnement aan
  // toe te kennen. Alleen de orderstatus bijwerken voor de administratie.
  if (!order.userId) {
    if (newStatus !== order.status) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      });
    }
    if (newStatus === "paid") await tryAssignInvoiceNumber(order.id);
    return { ...order, status: newStatus };
  }
  const orderWithUser = { ...order, userId: order.userId };

  // Dispatch on order kind — credits, subscription, book each need
  // different handling on the pending → paid transition. Both apply*Paid
  // helpers claim the transition atomically and return whether THIS call
  // is the one that granted it, so the referral bonus (and nothing else)
  // fires exactly once even when webhook and redirect race.
  let granted = false;
  if (becomesPaid && order.kind === "credits" && order.creditAmount) {
    granted = await applyCreditsPaid(orderWithUser);
  } else if (becomesPaid && order.kind === "subscription") {
    granted = await applySubscriptionFirstPaid(orderWithUser, payment);
  } else if (newStatus !== order.status) {
    // Other transition (failed, expired, cancelled) — just update the
    // order row, no credit / subscription change.
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus },
    });
  }
  if (granted) {
    await tryGrantReferralBonus(orderWithUser.userId);
  }

  // Factuurnummer voor elke betaalde order — idempotent, dus ook veilig
  // bij webhook-retries van al-betaalde orders. Best-effort.
  if (newStatus === "paid") await tryAssignInvoiceNumber(order.id);

  return { ...order, status: newStatus };
}

/**
 * Wrapper rond `maybeGrantReferralBonus` zodat een mislukte bonus de
 * order-flow niet meeneemt. Logt en gaat door.
 */
async function tryGrantReferralBonus(userId: string): Promise<void> {
  try {
    await maybeGrantReferralBonus(userId);
  } catch (err) {
    console.error(
      `[orders] referral bonus grant failed for user ${userId}`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Handle the credits-purchase pending → paid transition: grant credits
 * to the user, then fire the confirmation mail. Returns true only when
 * THIS call performed the grant.
 *
 * The status flip and the credit increment happen together in one
 * interactive transaction, guarded by `status NOT IN (paid, refunded)`.
 * Two concurrent callers (Mollie webhook + the redirect page both calling
 * applyMolliePaymentStatus at once) therefore grant credits exactly once:
 * only the caller whose updateMany actually flips the row (count === 1)
 * proceeds; the loser sees count 0 and returns false.
 */
async function applyCreditsPaid(order: {
  id: string;
  userId: string;
  creditAmount: number | null;
  amountCents: number;
  vatRate: number;
}): Promise<boolean> {
  if (!order.creditAmount) return false;
  const creditAmount = order.creditAmount;

  const granted = await prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: { id: order.id, status: { notIn: ["paid", "refunded"] } },
      data: { status: "paid", paidAt: new Date() },
    });
    if (claim.count !== 1) return false;
    await tx.user.update({
      where: { id: order.userId },
      data: { storyCredits: { increment: creditAmount } },
    });
    return true;
  });

  if (!granted) return false;

  try {
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true, name: true },
    });
    if (user) {
      const dashboardUrl = await buildAppUrl("/dashboard");
      const mail = await buildCreditsPurchasedMail({
        name: user.name,
        creditAmount: creditAmount,
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

  return true;
}

/**
 * First subscription payment paid: capture the mandate id from the
 * payment, kick off Mollie's recurring schedule, link the Order to the
 * Subscription record, send the welcome-to-subscription mail. Returns
 * true only when THIS call claimed the transition.
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
): Promise<boolean> {
  // Atomically claim the pending → paid transition. The webhook and the
  // Mollie redirect page both call this for the SAME order id at almost
  // the same moment; without the claim both would run
  // startRecurringSubscription and create TWO Mollie subscriptions on one
  // mandate (double monthly charge). Only the caller that flips the row
  // (count === 1) proceeds.
  const claim = await prisma.order.updateMany({
    where: { id: order.id, status: { notIn: ["paid", "refunded"] } },
    data: { status: "paid", paidAt: new Date() },
  });
  if (claim.count !== 1) return false;

  const mandateId = payment.mandateId ?? null;
  const meta = (payment.metadata ?? {}) as { planCode?: string };
  const planCode = meta.planCode;

  if (!mandateId || !planCode) {
    console.error(
      `[orders] subscription first-payment ${order.id} missing mandate or planCode`,
      { mandateId, planCode },
    );
    // The transition was claimed (order is paid) but we can't start the
    // recurring schedule. Still return true so the referral bonus fires
    // once for this genuine first payment.
    return true;
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
        const mail = await buildSubscriptionStartedMail({
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

  return true;
}

/**
 * A paid order was (partly) charged back. Best-effort: mark the order,
 * claw back the benefit without ever pushing a balance negative, and
 * alert an admin so they can follow up (e.g. block the account). Never
 * throws — a failure here must not 500 the webhook.
 */
async function handleChargeback(order: {
  id: string;
  userId: string | null;
  kind: string;
  creditAmount: number | null;
  subscriptionId: string | null;
  description: string;
  amountCents: number;
}): Promise<void> {
  try {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "charged_back" },
    });

    if (order.userId && order.kind === "credits" && order.creditAmount) {
      // Clamp at zero: only decrement when the user still has at least the
      // credits this order granted, so a spent balance never goes negative.
      await prisma.user.updateMany({
        where: { id: order.userId, storyCredits: { gte: order.creditAmount } },
        data: { storyCredits: { decrement: order.creditAmount } },
      });
    }

    if (order.userId && order.kind === "subscription" && order.subscriptionId) {
      // Stop granting access; leave the actual Mollie cancellation to the
      // admin, who also decides whether to block the account.
      await prisma.subscription.updateMany({
        where: {
          id: order.subscriptionId,
          status: { in: ["active", "past_due"] },
        },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
    }
  } catch (err) {
    console.error(
      `[orders] chargeback bookkeeping failed for order ${order.id}`,
      err instanceof Error ? err.message : err,
    );
  }

  try {
    const adminUrl = order.userId
      ? await buildAppUrl(`/admin/users/${order.userId}`)
      : await buildAppUrl(`/admin`);
    const subject = `⚠️ Chargeback op order ${order.id}`;
    const body =
      `Er is een chargeback/terugboeking gemeld voor order ${order.id} ` +
      `(${order.description}, €${(order.amountCents / 100).toFixed(2)}).\n\n` +
      `De order is op 'charged_back' gezet en toegekende credits/toegang ` +
      `zijn best-effort teruggedraaid. Controleer het account en overweeg ` +
      `verdere actie: ${adminUrl}`;
    for (const to of getAdminNotifyEmails()) {
      try {
        await sendMail({
          to,
          subject,
          html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
          text: body,
          tags: ["admin-chargeback"],
        });
      } catch (perAddressErr) {
        console.error(
          `[orders] chargeback admin mail to ${to} failed`,
          perAddressErr instanceof Error
            ? perAddressErr.message
            : perAddressErr,
        );
      }
    }
  } catch (err) {
    console.error(
      `[orders] chargeback admin notification failed for order ${order.id}`,
      err instanceof Error ? err.message : err,
    );
  }
}
