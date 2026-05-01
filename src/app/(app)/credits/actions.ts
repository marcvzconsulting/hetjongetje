"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadUserGate } from "@/lib/user-gate";
import { createCreditsCheckout } from "@/lib/payments/orders";

/**
 * Buy-credits server action. The form posts a packId; we resolve the
 * pack, create the matching Order + Mollie payment via
 * `createCreditsCheckout`, then redirect the browser to Mollie's hosted
 * checkout. From there Mollie handles iDEAL / cards / Apple-Pay /
 * Google-Pay UX and posts back to our webhook.
 */
export async function buyCreditsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  if (!gate?.isApproved) {
    // Pending users can't buy yet — we don't want to take payment from
    // accounts that aren't approved. Refund flows are nasty for AI credits.
    redirect("/credits?error=not_approved");
  }

  const packId = String(formData.get("packId") ?? "");
  const acceptedTerms = String(formData.get("acceptTerms") ?? "") === "1";
  if (!packId) redirect("/credits?error=missing_pack");
  if (!acceptedTerms) redirect("/credits?error=terms");

  let checkoutUrl: string;
  try {
    const result = await createCreditsCheckout({
      userId: session.user.id,
      packId,
    });
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    console.error(
      `[credits] createCreditsCheckout failed for user ${session.user.id}`,
      err instanceof Error ? err.message : err,
    );
    redirect("/credits?error=checkout_failed");
  }

  // Hop to Mollie's hosted checkout. After payment Mollie will redirect
  // the user back to /credits/order/[orderId] (configured in
  // createCreditsCheckout via redirectUrl).
  redirect(checkoutUrl);
}
