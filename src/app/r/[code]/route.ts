import { NextRequest, NextResponse } from "next/server";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE_DAYS,
  resolveReferralCode,
} from "@/lib/referral";

/**
 * `/r/<code>` — entry-point voor de uitgenodigde. Slaat de code op in
 * een cookie en stuurt door naar de landing. Bij registratie pakt de
 * register-API de cookie op.
 *
 * Onbekende code: cookie wordt niet gezet, gewoon naar de landing.
 * Zo doet een typo geen pijn.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const inviterId = await resolveReferralCode(code);

  const url = new URL("/", _request.url);
  // Toon op de landing eventueel een "uitgenodigd door ..." badge later;
  // voor nu houden we het simpel.
  if (inviterId) url.searchParams.set("ref", "1");

  const response = NextResponse.redirect(url);

  if (inviterId) {
    response.cookies.set(REFERRAL_COOKIE, code.toUpperCase(), {
      maxAge: REFERRAL_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
