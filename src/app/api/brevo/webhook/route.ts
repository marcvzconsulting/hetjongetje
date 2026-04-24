import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Brevo posts events here when subscribers act on a campaign (unsubscribe,
 * hard bounce, spam-mark, etc). Configure the webhook URL in Brevo:
 *   https://onsverhaaltje.nl/api/brevo/webhook?secret=<BREVO_WEBHOOK_SECRET>
 *
 * We mainly care about "unsubscribed" so we can flip the flag in our DB and
 * keep the two systems in sync. Hard bounces are also treated as opt-outs to
 * stop sending to dead mailboxes.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  const provided = req.nextUrl.searchParams.get("secret");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { event?: unknown; email?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const event = String(payload.event ?? "");
  const email = String(payload.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: true, ignored: "no email" });
  }

  const optOutEvents = new Set([
    "unsubscribed",
    "hard_bounce",
    "spam",
    "blocked",
  ]);
  if (!optOutEvents.has(event)) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  await prisma.user.updateMany({
    where: { email, newsletterOptIn: true },
    data: { newsletterOptIn: false, newsletterOptInAt: null },
  });

  await prisma.newsletterSignup.updateMany({
    where: { email, unsubscribedAt: null },
    data: { unsubscribedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
