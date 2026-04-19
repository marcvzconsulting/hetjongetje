"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteUserStorage } from "@/lib/storage/user-cleanup";

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

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      phone: nullIfEmpty(phone),
      locale,
    },
  });

  revalidatePath("/account");
  redirect("/account?saved=profile");
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

  await signOut({ redirectTo: "/?deleted=1" });
}
