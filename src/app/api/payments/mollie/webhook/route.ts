import { NextRequest, NextResponse } from "next/server";
import { applyMolliePaymentStatus } from "@/lib/payments/orders";

/**
 * Mollie payment webhook.
 *
 * Mollie POSTs an `id=tr_xxx` form-body whenever a payment changes
 * status — they don't sign or hash the body, so we MUST treat the id
 * as an opaque pointer and verify the actual status by calling Mollie
 * back via the SDK. That call is what authenticates the event: only
 * we have the API key, and we read the truth from Mollie itself.
 *
 * The endpoint is public (no auth) but only acts on payment ids that
 * resolve to a real Order in our DB; anything else is a no-op.
 *
 * Mollie expects an HTTP 200 quickly; failures are retried with
 * exponential backoff. Our handler is idempotent so retries are safe.
 */
export async function POST(request: NextRequest) {
  let paymentId: string | null = null;
  try {
    const formData = await request.formData();
    paymentId = String(formData.get("id") ?? "").trim();
  } catch {
    // Malformed body — Mollie will retry, but nothing we can do here.
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!paymentId.startsWith("tr_")) {
    // Not a payment id at all — silent 200 so Mollie doesn't keep retrying.
    return NextResponse.json({ ok: true });
  }

  try {
    await applyMolliePaymentStatus(paymentId);
  } catch (err) {
    console.error(
      `[mollie-webhook] failed to apply status for ${paymentId}`,
      err instanceof Error ? err.message : err,
    );
    // 500 → Mollie retries with exponential backoff.
    return NextResponse.json({ error: "process_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
