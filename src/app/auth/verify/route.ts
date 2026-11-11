import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTrustedBaseUrl } from "@/lib/url";
import { verifyVerifyEmailToken } from "@/lib/auth/verify-email-token";
import { confirmEmailForSession } from "@/lib/auth/email-verification";

/**
 * Landingsroute van de bevestigingslink uit de registratiemail.
 *
 * De link alleen is niet genoeg: de gebruiker moet ook zijn ingelogd op
 * het account waar de link bij hoort. Zo bewijst een bevestiging zowel het
 * wachtwoord als de mailbox. Iemand die het adres van een ander
 * registreerde krijgt de mail niet; de eigenaar van de mailbox die de link
 * aanklikt is niet ingelogd en bevestigt dus niets. Linkscanners in
 * mailprogramma's hebben geen sessie en verbruiken de link ook niet.
 */
export async function GET(request: NextRequest) {
  const base = getTrustedBaseUrl();
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const session = await auth();

  if (!session?.user?.id) {
    const back = `/auth/verify?token=${encodeURIComponent(token)}`;
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(back)}`, base),
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user) return NextResponse.redirect(new URL("/login", base));

  if (user.emailVerifiedAt) {
    return NextResponse.redirect(new URL("/dashboard", base));
  }
  if (!verifyVerifyEmailToken(token, user.id, user.email)) {
    return NextResponse.redirect(new URL("/dashboard?bevestigen=mislukt", base));
  }

  await confirmEmailForSession(user.id);
  return NextResponse.redirect(new URL("/dashboard?bevestigen=gelukt", base));
}
