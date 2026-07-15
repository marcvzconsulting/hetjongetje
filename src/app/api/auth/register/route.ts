import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { buildAppUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildWelcomeMail } from "@/lib/email/templates/welcome";
import { buildAdminNewSignupMail } from "@/lib/email/templates/admin-new-signup";
import {
  validatePassword,
  passwordPolicyMessage,
} from "@/lib/auth/password-policy";
import {
  REFERRAL_BONUS_CREDITS,
  REFERRAL_COOKIE,
  resolveReferralCode,
} from "@/lib/referral";
import { getAdminNotifyEmails } from "@/lib/admin/notify";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, termsAccepted } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Naam, email en wachtwoord zijn verplicht" },
        { status: 400 }
      );
    }

    // De frontend blokkeert dit al met een checkbox; deze server-check
    // vangt directe API-calls af. We slaan het moment van akkoord op
    // (termsAcceptedAt) als bewijs van instemming.
    if (termsAccepted !== true) {
      return NextResponse.json(
        { error: "Je moet akkoord gaan met de algemene voorwaarden" },
        { status: 400 }
      );
    }

    const policy = validatePassword(password);
    if (!policy.ok) {
      return NextResponse.json(
        { error: passwordPolicyMessage(policy.reason) },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Er bestaat al een account met dit e-mailadres" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Referral: read cookie, resolve to inviter user-id. Onbekende of
    // ongeldige code wordt stilzwijgend genegeerd.
    const refCookie = request.cookies.get(REFERRAL_COOKIE)?.value ?? null;
    const inviterId = await resolveReferralCode(refCookie);
    const refBonus = inviterId ? REFERRAL_BONUS_CREDITS : 0;

    const user = await prisma.user.create({
      // 5 starter credits — direct approved, geen goedkeuringswachtrij meer.
      // Plus eventuele referral-bonus.
      data: {
        name,
        email,
        passwordHash,
        storyCredits: 5 + refBonus,
        status: "approved",
        referredByUserId: inviterId,
        termsAcceptedAt: new Date(),
      },
    });

    try {
      const profileUrl = await buildAppUrl("/profile/new");
      const mail = await buildWelcomeMail({ name: user.name, profileUrl });
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["welcome"],
      });
    } catch (mailError) {
      // Mail failure must not block registration.
      console.error("[register] welcome mail failed", mailError);
    }

    // Notificatie naar alle admin-adressen bij elke nieuwe aanmelding —
    // één mail per adres zodat één bouncing inbox de andere niet blokkeert.
    // Accounts zijn auto-approved; dit is puur ter info, geen goedkeuring.
    try {
      const reviewUrl = await buildAppUrl(`/admin/users/${user.id}`);
      const mail = buildAdminNewSignupMail({
        userName: user.name,
        userEmail: user.email,
        createdAt: user.createdAt,
        reviewUrl,
      });
      for (const to of getAdminNotifyEmails()) {
        try {
          await sendMail({
            to,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            tags: ["admin-new-signup"],
          });
        } catch (perAddressErr) {
          console.error(
            `[register] admin notification to ${to} failed`,
            perAddressErr instanceof Error ? perAddressErr.message : perAddressErr,
          );
        }
      }
    } catch (adminMailError) {
      console.error("[register] admin notification build failed", adminMailError);
    }

    const response = NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 }
    );
    // Cookie heeft z'n werk gedaan; wis zodat er geen kruisbestuiving
    // ontstaat als deze browser later een ander account aanmaakt.
    if (refCookie) {
      response.cookies.delete(REFERRAL_COOKIE);
    }
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het registreren" },
      { status: 500 }
    );
  }
}
