"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit/rate-limit";
import { sendMail } from "@/lib/email/client";
import { buildContactFormMail } from "@/lib/email/templates/contact-form";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function submitContactFormAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  const honeypot = String(formData.get("website") ?? "").trim();

  if (honeypot) {
    redirect("/contact?sent=1");
  }

  if (!name || !email || !message) {
    redirect("/contact?error=missing");
  }
  if (!EMAIL_RE.test(email)) {
    redirect("/contact?error=email");
  }
  if (message.length < 10) {
    redirect("/contact?error=short");
  }
  if (message.length > 5000) {
    redirect("/contact?error=long");
  }

  const ip = await getClientIp();

  const limit = await rateLimit({
    key: `contact-form:${ip}`,
    limit: 3,
    windowSeconds: 60 * 60,
  });
  if (!limit.allowed) {
    redirect("/contact?error=ratelimit");
  }

  // Sla het bericht eerst op in de DB — dan kan de admin het altijd
  // zien in /admin/inbox, ook als de Brevo-mail later faalt. Een
  // mislukte DB-insert is wel blokkerend (zonder DB-rij is het bericht
  // verloren als de mail óók faalt).
  let messageRowId: string;
  try {
    const row = await prisma.contactMessage.create({
      data: { name, email, body: message, ip, status: "open" },
      select: { id: true },
    });
    messageRowId = row.id;
  } catch (err) {
    console.error("[contact-form] DB write failed", err);
    redirect("/contact?error=send");
  }

  const mail = buildContactFormMail({ fromName: name, fromEmail: email, message, ip });

  try {
    await sendMail({
      to: "info@onsverhaaltje.nl",
      toName: "Ons Verhaaltje",
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
      tags: ["contact-form"],
    });
  } catch (err) {
    // Mail mislukt, maar de admin ziet het bericht nog in /admin/inbox.
    // We loggen + tonen de gebruiker een nette fout.
    console.error(
      `[contact-form] mail send failed (DB row=${messageRowId})`,
      err,
    );
    redirect("/contact?error=send");
  }

  redirect("/contact?sent=1");
}
