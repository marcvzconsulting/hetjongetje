import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { logAdminAction } from "@/lib/admin/audit-log";

/**
 * AVG Art. 15 (recht van inzage) + Art. 20 (recht op dataportabiliteit).
 *
 * Levert een JSON-download met ALLE persoonsgegevens die we van de
 * ingelogde gebruiker bewaren. Inclusief gerelateerde rows (kinderen,
 * verhalen, orders, audit-entries waarvan de user het target was).
 *
 * Bewust niet meegestuurd:
 *   - passwordHash en token-hashes — geen persoonsgegevens en alleen
 *     intern relevant; opnemen zou een security-foot-gun zijn.
 *   - admin-audit-entries waar de user NIET het target is.
 *
 * Rate-limit: 1× per 24u per user. Het verzamelen is best-effort goedkoop
 * maar payloads kunnen MB's groot worden bij actieve gezinnen.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const userId = session.user.id;

  const rl = await rateLimit({
    key: `gdpr-export:${userId}`,
    limit: 1,
    windowSeconds: 24 * 60 * 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error:
          "Je kunt maximaal één keer per 24 uur een export downloaden. Probeer het later opnieuw.",
      },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      role: true,
      status: true,
      storyCredits: true,
      lastLoginAt: true,
      phone: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      country: true,
      newsletterOptIn: true,
      newsletterOptInAt: true,
      termsAcceptedAt: true,
      remindersOptOutAt: true,
      deletionRequestedAt: true,
      firstStoryEmailSentAt: true,
      reminderSentAt: true,
      day1ProfileReminderSentAt: true,
      day3StoryReminderSentAt: true,
      day7LoginReminderSentAt: true,
      onboardedAt: true,
      referralCode: true,
      referredByUserId: true,
      referralBonusGrantedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Account niet gevonden" }, { status: 404 });
  }

  const [
    subscription,
    children,
    books,
    orders,
    contactMessages,
    newsletterSignup,
    auditEntries,
    emailLogs,
  ] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId },
    }),
    prisma.childProfile.findMany({
      where: { userId },
      include: {
        stories: {
          orderBy: { createdAt: "asc" },
          include: {
            pages: { orderBy: { pageNumber: "asc" } },
            audio: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.storyBook.findMany({
      where: { childProfile: { userId } },
      include: { bookStories: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.contactMessage.findMany({
      where: { email: user.email },
      orderBy: { createdAt: "asc" },
    }),
    prisma.newsletterSignup.findUnique({
      where: { email: user.email },
    }),
    prisma.adminAuditLog.findMany({
      where: { targetType: "user", targetId: userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.emailLog.findMany({
      where: {
        OR: [{ userId }, { toEmail: user.email }],
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const exportData = {
    meta: {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      description:
        "Volledige export van persoonsgegevens conform AVG Art. 15 + 20. Wachtwoord-hashes en token-hashes zijn bewust weggelaten.",
    },
    user,
    subscription,
    children,
    books,
    orders,
    contactMessages,
    newsletterSignup,
    auditEntries,
    emailLogs,
  };

  // Audit het verzoek zelf zodat we kunnen aantonen dat we het hebben
  // verwerkt. Re-use van logAdminAction met de user als 'admin' van
  // hun eigen actie — adminId / adminEmail vullen we met user-data.
  void logAdminAction({
    adminId: user.id,
    adminEmail: user.email,
    adminName: user.name,
    action: "gdpr.export",
    targetType: "user",
    targetId: user.id,
    metadata: {
      childrenCount: children.length,
      storiesCount: children.reduce((s, c) => s + c.stories.length, 0),
      ordersCount: orders.length,
    },
  });

  const json = JSON.stringify(exportData, null, 2);
  const timestamp = new Date().toISOString().slice(0, 10);
  const safeEmail = user.email.replace(/[^a-z0-9.-]/gi, "_");

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ons-verhaaltje-${safeEmail}-${timestamp}.json"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
