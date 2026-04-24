"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteUserStorage } from "@/lib/storage/user-cleanup";
import { buildAppUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildPasswordChangedMail } from "@/lib/email/templates/password-changed";
import {
  changeContactEmail,
  deleteContact,
  subscribeToNewsletter,
} from "@/lib/email/brevo-contacts";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

function trim(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function nullIfEmpty(value: string): string | null {
  return value === "" ? null : value;
}

export async function updateProfileAction(formData: FormData) {
  const userId = await requireUser();

  const name = trim(formData.get("name"));
  const email = trim(formData.get("email")).toLowerCase();
  const phone = trim(formData.get("phone"));
  const locale = trim(formData.get("locale")) || "nl";

  if (!name || !email) {
    redirect("/account?error=profile_missing");
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect("/account?error=profile_email_invalid");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    redirect("/account?error=profile_email_taken");
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, newsletterOptIn: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      phone: nullIfEmpty(phone),
      locale,
    },
  });

  // Sync to Brevo when an opted-in user changes their email or name.
  if (before?.newsletterOptIn) {
    try {
      if (before.email !== email) {
        await changeContactEmail(before.email, email);
      }
      await subscribeToNewsletter({ email, name });
    } catch (err) {
      console.error("[account] newsletter sync after profile update failed", err);
    }
  }

  revalidatePath("/account");
  redirect("/account?saved=profile");
}

export async function toggleNewsletterAction(formData: FormData) {
  const userId = await requireUser();
  const optIn = formData.get("optIn") === "1";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, newsletterOptIn: true },
  });
  if (!user) redirect("/login");

  // No-op if state already matches what was requested.
  if (user.newsletterOptIn === optIn) {
    revalidatePath("/account");
    redirect(optIn ? "/account?saved=newsletter_on" : "/account?saved=newsletter_off");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      newsletterOptIn: optIn,
      newsletterOptInAt: optIn ? new Date() : null,
    },
  });

  // Also sync the standalone NewsletterSignup row, if any (e.g. user
  // signed up via the footer with the same email and now toggles off
  // from /account — both records must reflect the same state).
  if (!optIn) {
    await prisma.newsletterSignup.updateMany({
      where: { email: user.email, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
  }

  try {
    if (optIn) {
      await subscribeToNewsletter({ email: user.email, name: user.name });
    } else {
      // Fully delete the contact so they no longer appear in Brevo at all,
      // not just removed from the list.
      await deleteContact(user.email);
    }
  } catch (err) {
    console.error("[account] newsletter toggle sync failed", err);
  }

  revalidatePath("/account");
  redirect(optIn ? "/account?saved=newsletter_on" : "/account?saved=newsletter_off");
}

export async function updateAddressAction(formData: FormData) {
  const userId = await requireUser();

  const street = trim(formData.get("street"));
  const houseNumber = trim(formData.get("houseNumber"));
  const postalCode = trim(formData.get("postalCode")).toUpperCase();
  const city = trim(formData.get("city"));
  const country = trim(formData.get("country"));

  await prisma.user.update({
    where: { id: userId },
    data: {
      street: nullIfEmpty(street),
      houseNumber: nullIfEmpty(houseNumber),
      postalCode: nullIfEmpty(postalCode),
      city: nullIfEmpty(city),
      country: nullIfEmpty(country),
    },
  });

  revalidatePath("/account");
  redirect("/account?saved=address");
}

export async function changePasswordAction(formData: FormData) {
  const userId = await requireUser();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next || !confirm) {
    redirect("/account?error=password_missing");
  }
  if (next.length < 6) {
    redirect("/account?error=password_too_short");
  }
  if (next !== confirm) {
    redirect("/account?error=password_mismatch");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  const match = await bcrypt.compare(current, user.passwordHash);
  if (!match) {
    redirect("/account?error=password_wrong_current");
  }

  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  try {
    const loginUrl = await buildAppUrl("/login");
    const mail = buildPasswordChangedMail({
      name: user.name,
      loginUrl,
      source: "account",
    });
    await sendMail({
      to: user.email,
      toName: user.name,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tags: ["password-changed"],
    });
  } catch (mailError) {
    console.error("[account] password-changed mail failed", mailError);
  }

  revalidatePath("/account");
  redirect("/account?saved=password");
}

export async function deleteAccountAction(formData: FormData) {
  const userId = await requireUser();

  const password = String(formData.get("password") ?? "");
  const emailConfirm = trim(formData.get("emailConfirm")).toLowerCase();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  if (user.role === "admin") {
    redirect("/account?error=delete_admin_blocked");
  }
  if (!password || !emailConfirm) {
    redirect("/account?error=delete_missing");
  }
  if (emailConfirm !== user.email.toLowerCase()) {
    redirect("/account?error=delete_email_mismatch");
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    redirect("/account?error=delete_wrong_password");
  }

  // Remove storage objects BEFORE deleting the DB row — the cascade wipes the
  // URLs so we'd lose track of them otherwise. Storage failures are logged
  // but never block the account deletion itself.
  const cleanup = await deleteUserStorage(userId);
  if (cleanup.error) {
    console.error(
      `[account-delete] storage cleanup error for user ${userId}: ${cleanup.error}`
    );
  } else if (cleanup.failed.length > 0) {
    console.error(
      `[account-delete] ${cleanup.failed.length}/${cleanup.requested} storage keys failed to delete for user ${userId}:`,
      cleanup.failed
    );
  } else {
    console.log(
      `[account-delete] removed ${cleanup.requested} storage objects for user ${userId}`
    );
  }

  // Prisma cascade deletes children, stories, pages, books, rate limits.
  await prisma.user.delete({ where: { id: userId } });

  // AVG: also wipe the newsletter contact in Brevo. Best-effort.
  try {
    await deleteContact(user.email);
  } catch (err) {
    console.error("[account-delete] Brevo contact deletion failed", err);
  }

  await signOut({ redirectTo: "/?deleted=1" });
}
