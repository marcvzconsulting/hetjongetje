import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Unsubscribe from retention reminders: sets remindersOptOutAt = NOW()
 * so no future day-1/3/7 reminders are sent.
 *
 * This endpoint is NOT authenticated — the user_id is in the URL, which
 * is acceptable because opting out is a positive action the user initiated
 * via email. Not a sensitive operation.
 *
 * GET /api/reminders/opt-out?user_id=<uuid>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing user_id parameter" },
      { status: 400 }
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
