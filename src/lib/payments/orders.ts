import { prisma } from "@/lib/db";
import {
  getMollieClient,
  centsToMollieAmount,
  mollieStatusToOrderStatus,
} from "./mollie";
import { buildAppUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildCreditsPurchasedMail } from "@/lib/email/templates/credits-purchased";

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
  //    paying (or cancelling). The webhookUrl is where Mollie POSTs
  //    payment-status changes server-to-server. Both must be public URLs;
  //    in dev that requires a tunnel.
  const redirectUrl = await buildAppUrl(`/credits/order/${order.id}`);
  const webhookUrl = await buildAppUrl(`/api/payments/mollie/webhook`);

  const client = getMollieClient();
  const payment = await client.payments.create({
    amount: {
      currency: pack.currency,
      value: centsToMollieAmount(pack.priceCents),
    },
    description: `Ons Verhaaltje — ${description}`,
    redirectUrl,
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

  const order = await prisma.order.findUnique({
    where: { molliePaymentId: paymentId },
  });
  if (!order) {
    // Payment exists but no matching Order — could be a webhook for an
    // unrelated tenant, or a race we lost. Caller logs and moves on.
    return null;
  }

  const newStatus = mollieStatusToOrderStatus(payment.status);
  const wasPaid = order.status === "paid";
  const becomesPaid = newStatus === "paid" && !wasPaid;

  // Grant credits + mark paid in a single transaction so we never end
  // up with credits granted but order still pending (or vice versa).
  if (becomesPaid && order.kind === "credits" && order.creditAmount) {
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

    // Confirmation mail — best-effort, never blocks payment processing.
    // Idempotent because `becomesPaid` only fires on the pending → paid
    // transition; subsequent webhook calls see status="paid" and skip.
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
        `[orders] confirmation mail failed for order ${order.id}`,
        mailErr instanceof Error ? mailErr.message : mailErr,
      );
    }
  } else if (newStatus !== order.status) {
    // Other transition (failed, expired, cancelled) — just update the
    // order row, no credit change.
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus },
    });
  }

  return { ...order, status: newStatus };
}
