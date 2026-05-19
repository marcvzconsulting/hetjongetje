import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyResubscribeToken } from "@/lib/newsletter/unsubscribe-token";
import { subscribeToNewsletter } from "@/lib/email/brevo-contacts";
import { rateLimit } from "@/lib/rate-limit/rate-limit";

/**
 * One-click herinschrijving — `/resubscribe?email=X&token=Y` in de
 * uitschrijf-bevestigingsmail. GET-only (mail-clients triggeren GETs
 * vanzelf). Verifieert de signed token, zet de user/signup-status terug
 * en stuurt door naar /account#newsletter met bevestiging (of homepage
 * wanneer er geen account-row is).
 *
 * Geen bevestigingsmail vanuit hier — anders genereert iedere
 * heen-en-weer een mailstroom.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const email = rawEmail.trim().toLowerCase();

  // Per-IP rate-limit, hetzelfde idee als /unsubscribe — voorkomt dat
  // iemand een token-space brute-forced om een gebruiker ongewenst weer
  // aan te melden. 60/min is genoeg voor één klant die een keer dubbelklikt
  // of refresht, te krap voor scans.
  const fwd = request.headers.get("x-forwarded-for");
  const ip =
    fwd?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = await rateLimit({
    key: `resubscribe:${ip}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  if (!email || !token || !verifyResubscribeToken(email, token)) {
    // Token klopt niet — terug naar landing zonder iets te doen.
    return NextResponse.redirect(new URL("/?resubscribe=invalid", url.origin));
  }

  let touchedUser = false;
  let name: string | undefined;
  try {
    const userUpdate = await prisma.user.updateMany({
      where: { email, newsletterOptIn: false },
      data: { newsletterOptIn: true, newsletterOptInAt: new Date() },
    });
    touchedUser = userUpdate.count > 0;

    if (touchedUser) {
      const u = await prisma.user.findUnique({
        where: { email },
        select: { name: true },
      });
      name = u?.name ?? undefined;
    }

    // Heractiveer ook de standalone NewsletterSignup-rij als die bestaat.
    await prisma.newsletterSignup.updateMany({
      where: { email, unsubscribedAt: { not: null } },
      data: { unsubscribedAt: null },
    });
  } catch (err) {
    console.error("[resubscribe] DB update failed", err);
  }

  try {
    await subscribeToNewsletter({ email, name });
  } catch (err) {
    console.error("[resubscribe] Brevo subscribe failed", err);
  }

  // Account-houders krijgen bevestiging in hun portaal; losse signups
  // gaan naar landing met confirmatie-query (footer kan dat oppikken
  // later — nu blijft het 'm alleen tonen in de URL).
  const target = touchedUser
    ? "/account?saved=newsletter_on#newsletter"
    : "/?resubscribed=1";
  return NextResponse.redirect(new URL(target, url.origin));
}
