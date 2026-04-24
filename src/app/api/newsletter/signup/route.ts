import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { subscribeToNewsletter } from "@/lib/email/brevo-contacts";
import { sendMail } from "@/lib/email/client";
import { buildNewsletterWelcomeMail } from "@/lib/email/templates/newsletter-welcome";
import { signUnsubscribeToken } from "@/lib/newsletter/unsubscribe-token";
import { buildAppUrl } from "@/lib/url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

async function buildUnsubscribeUrl(email: string): Promise<string> {
  const token = signUnsubscribeToken(email);
  return buildAppUrl(
    `/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`
  );
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; name?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  // Honeypot — bots fill this, humans don't see it.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name =
    typeof body.name === "string" ? body.name.trim() || undefined : undefined;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Vul een geldig e-mailadres in." },
      { status: 400 }
    );
  }

  const ip = await getClientIp();
  const limit = await rateLimit({
    key: `newsletter-signup:${ip}`,
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Te veel pogingen. Probeer het over een uur opnieuw." },
      { status: 429 }
    );
  }

  // If this email belongs to an existing user, flip their account flag
  // instead of creating a separate signup row.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, newsletterOptIn: true, name: true },
  });

  let displayName: string | undefined = name;

  if (existingUser) {
    if (!existingUser.newsletterOptIn) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { newsletterOptIn: true, newsletterOptInAt: new Date() },
      });
    }
    displayName = name ?? existingUser.name;
    try {
      await subscribeToNewsletter({ email, name: displayName });
    } catch (err) {
      console.error("[newsletter] Brevo sync failed (existing user)", err);
    }
  } else {
    // Non-account signup → upsert in NewsletterSignup table.
    await prisma.newsletterSignup.upsert({
      where: { email },
      update: {
        name: name ?? undefined,
        ip,
        unsubscribedAt: null,
        optInAt: new Date(),
      },
      create: {
        email,
        name,
        ip,
        source: "footer",
        optInAt: new Date(),
      },
    });

    try {
      await subscribeToNewsletter({ email, name });
    } catch (err) {
      console.error("[newsletter] Brevo sync failed (footer signup)", err);
    }
  }

  // Confirmation mail with unsubscribe link.
  try {
    const unsubscribeUrl = await buildUnsubscribeUrl(email);
    const mail = buildNewsletterWelcomeMail({
      name: displayName,
      unsubscribeUrl,
    });
    await sendMail({
      to: email,
      toName: displayName,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tags: ["newsletter-welcome"],
    });
  } catch (err) {
    console.error("[newsletter] confirmation mail failed", err);
  }

  return NextResponse.json({ ok: true });
}
