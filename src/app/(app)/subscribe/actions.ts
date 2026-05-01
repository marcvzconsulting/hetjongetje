"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadUserGate } from "@/lib/user-gate";
import { createSubscriptionCheckout } from "@/lib/payments/subscriptions";

const ERROR_REDIRECTS: Record<string, string> = {
  unauth: "/login",
  not_approved: "/subscribe?error=not_approved",
  missing_plan: "/subscribe?error=missing_plan",
  terms: "/subscribe?error=terms",
  recurring_consent: "/subscribe?error=recurring_consent",
  already_subscribed: "/subscribe?error=already_subscribed",
  plan_not_found: "/subscribe?error=plan_not_found",
  plan_inactive: "/subscribe?error=plan_inactive",
  checkout_failed: "/subscribe?error=checkout_failed",
};

/**
 * Subscribe-button form action. Validates dual-consent (terms + SEPA
 * mandate), defers to createSubscriptionCheckout to create the Mollie
 * customer + first-payment, and redirects the browser to Mollie's hosted
 * checkout. The actual recurring schedule is created in the webhook
 * once the first payment is confirmed paid.
 */
export async function subscribeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect(ERROR_REDIRECTS.unauth);

  const gate = await loadUserGate(session.user.id);
  if (!gate?.isApproved) {
    redirect(ERROR_REDIRECTS.not_approved);
  }

  const planCode = String(formData.get("planCode") ?? "");
  const acceptedTerms = String(formData.get("acceptTerms") ?? "") === "1";
  const acceptedRecurring =
    String(formData.get("acceptRecurring") ?? "") === "1";

  if (!planCode) redirect(ERROR_REDIRECTS.missing_plan);
  if (!acceptedTerms) redirect(ERROR_REDIRECTS.terms);
  if (!acceptedRecurring) redirect(ERROR_REDIRECTS.recurring_consent);

  let checkoutUrl: string;
  try {
    const result = await createSubscriptionCheckout({
      userId: session.user.id,
      planCode,
    });
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "checkout_failed";
    if (ERROR_REDIRECTS[message]) {
      redirect(ERROR_REDIRECTS[message]);
    }
    console.error(
      `[subscribe] createSubscriptionCheckout failed for user ${session.user.id}`,
      err instanceof Error ? err.message : err,
    );
    redirect(ERROR_REDIRECTS.checkout_failed);
  }

  redirect(checkoutUrl);
}
