"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { trim, nullIfEmpty } from "@/lib/form";
import { deleteUserStorage } from "@/lib/storage/user-cleanup";
import { cancelInProgressLoraJobs } from "@/lib/ai/lora-training";
import { buildAppUrl } from "@/lib/url";
import { sendMail } from "@/lib/email/client";
import { buildPasswordChangedMail } from "@/lib/email/templates/password-changed";
import {
  changeContactEmail,
  deleteContact,
  subscribeToNewsletter,
} from "@/lib/email/brevo-contacts";
import { validatePassword } from "@/lib/auth/password-policy";
import {
  cancelSubscription,
  isCancellationReason,
} from "@/lib/payments/subscriptions";
import {
  signUnsubscribeToken,
  signResubscribeToken,
} from "@/lib/newsletter/unsubscribe-token";
import { buildNewsletterWelcomeMail } from "@/lib/email/templates/newsletter-welcome";
import { buildNewsletterUnsubscribedMail } from "@/lib/email/templates/newsletter-unsubscribed";

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

  // Bevestigingsmail — welkom of afgemeld, naargelang het geval.
  try {
    if (optIn) {
      const unsubscribeToken = signUnsubscribeToken(user.email);
      const unsubscribeUrl = await buildAppUrl(
        `/unsubscribe?email=${encodeURIComponent(user.email)}&token=${unsubscribeToken}`,
      );
      const mail = await buildNewsletterWelcomeMail({
        name: user.name,
        email: user.email,
        unsubscribeUrl,
      });
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["newsletter-welcome"],
      });
    } else {
      // One-click herinschrijving — signed token zodat een klik in de
      // mail meteen werkt zonder dat de gebruiker eerst hoeft in te
      // loggen of nog een knop te zoeken.
      const reToken = signResubscribeToken(user.email);
      const resubscribeUrl = await buildAppUrl(
        `/resubscribe?email=${encodeURIComponent(user.email)}&token=${reToken}`,
      );
      const mail = await buildNewsletterUnsubscribedMail({
        name: user.name,
        email: user.email,
        resubscribeUrl,
      });
      await sendMail({
        to: user.email,
        toName: user.name,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        tags: ["newsletter-unsubscribed"],
      });
    }
  } catch (err) {
    console.error("[account] newsletter confirmation mail failed", err);
  }

  revalidatePath("/account");

  if (!optIn) {
    // De uitgeschreven user krijgt op /account de inline waarom-survey
    // te zien (newsletterStep=survey). Submit blijft binnen /account.
    // Hash anker zorgt dat de browser meteen naar de Nieuwsbrief-sectie
    // scrollt i.p.v. boven aan de pagina te beginnen.
    redirect("/account?saved=newsletter_off&newsletterStep=survey#newsletter");
  }
  redirect("/account?saved=newsletter_on#newsletter");
}

const VALID_NEWSLETTER_REASONS = new Set([
  "te_vaak",
  "niet_relevant",
  "nooit_aangemeld",
  "tijdelijk",
  "anders",
]);

/**
 * Slaat het waarom-antwoord op nadat een ingelogde gebruiker zich via
 * `/account` heeft uitgeschreven. Volledig optioneel — we doen niets
 * met de afmelding zelf hier; die is al verwerkt door
 * `toggleNewsletterAction` voordat de survey verscheen.
 */
export async function submitAccountUnsubscribeReasonAction(formData: FormData) {
  const userId = await requireUser();

  const reason = trim(formData.get("reason"));
  const note = trim(formData.get("note"));

  if (!VALID_NEWSLETTER_REASONS.has(reason)) {
    redirect("/account?saved=newsletter_off&newsletterStep=survey");
  }
  if (reason === "anders" && note.length === 0) {
    redirect(
      "/account?saved=newsletter_off&newsletterStep=survey&newsletterError=note_required",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  await prisma.newsletterUnsubscribeReason.create({
    data: {
      email: user?.email ?? null,
      reason,
      note: note.length > 0 ? note.slice(0, 2000) : null,
    },
  });

  revalidatePath("/account");
  redirect("/account?saved=newsletter_off_thanks#newsletter");
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
  const policy = validatePassword(next);
  if (!policy.ok) {
    redirect(`/account?error=password_${policy.reason}`);
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

  // GDPR cleanup, in order:
  //   1. cancel in-flight LoRA training (so we don't pay for an orphan job)
  //   2. delete bucket assets (photos, illustrations, book PDFs, previews)
  //   3. cascade-delete the DB row (children, stories, books, etc.)
  //   4. wipe Brevo contact (newsletter / transactional)
  //
  // Note on fal.ai: trained LoRA model files cannot be deleted via the
  // public API. We drop the URL from our DB during the cascade so the
  // file is no longer referenced; fal.ai eventually garbage-collects.
  await cancelInProgressLoraJobs(userId);
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

/**
 * Cancel the user's active Mollie subscription. Mollie stops scheduling
 * future renewals immediately, but the user keeps access until the end
 * of the period they already paid for (subscription.endsAt).
 */
export async function cancelSubscriptionAction(formData: FormData) {
  const userId = await requireUser();

  const rawReason = formData.get("reason");
  const reason = isCancellationReason(rawReason) ? rawReason : null;
  const noteRaw = formData.get("reasonNote");
  const note = typeof noteRaw === "string" ? noteRaw : "";

  try {
    await cancelSubscription(userId, { reason, note });
  } catch (err) {
    const message = err instanceof Error ? err.message : "cancel_failed";
    if (message === "no_active_subscription") {
      redirect("/account?error=subscription_no_active");
    }
    console.error(
      `[account] cancelSubscription failed for user ${userId}`,
      err instanceof Error ? err.message : err,
    );
    redirect("/account?error=subscription_cancel_failed");
  }

  revalidatePath("/account");
  redirect("/account?saved=subscription_cancelled");
}
