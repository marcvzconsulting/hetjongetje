import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyReminderOptOutToken } from "@/lib/newsletter/unsubscribe-token";

/**
 * Unsubscribe from retention reminders: sets remindersOptOutAt = NOW()
 * so no future day-1/3/7 reminders are sent.
 *
 * Unauthenticated but HMAC-signed: the link carries a token bound to the
 * user id + AUTH_SECRET, so only links we generated are honoured. Knowing
 * a bare user UUID is no longer enough to opt someone out.
 *
 * GET /api/reminders/opt-out?user_id=<uuid>&token=<hmac>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const token = searchParams.get("token");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing user_id parameter" },
      { status: 400 }
    );
  }

  if (!token || !verifyReminderOptOutToken(userId, token)) {
    return NextResponse.json(
      { error: "Invalid or missing token" },
      { status: 403 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Set opt-out timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { remindersOptOutAt: new Date() },
    });

    // Return a simple confirmation (no HTML, just text)
    return new NextResponse(
      `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Afgemeld</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 40px auto; }
    h1 { color: #333; }
    p { color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Je bent afgemeld</h1>
  <p>Je ontvangt geen reminder-mails meer van Ons Verhaaltje.</p>
  <p>Als je je bedenkt en reminders weer wil ontvangen, neem je contact op via het contactformulier.</p>
</body>
</html>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("[reminders/opt-out] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
