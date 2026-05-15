"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

function getString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createFaqAction(formData: FormData) {
  await requireAdmin();
  const question = getString(formData, "question");
  const answer = getString(formData, "answer");
  if (!question || !answer) {
    redirect("/admin/faq?error=empty");
  }
  // Sorteer onderaan tenzij anders aangegeven.
  const last = await prisma.faqEntry.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.faqEntry.create({
    data: {
      question,
      answer,
      sortOrder: (last?.sortOrder ?? 0) + 10,
      isPublished: true,
    },
  });
  revalidatePath("/admin/faq");
  revalidatePath("/veelgestelde-vragen");
}

export async function updateFaqAction(formData: FormData) {
  await requireAdmin();
  const id = getString(formData, "id");
  const question = getString(formData, "question");
  const answer = getString(formData, "answer");
  const isPublished = formData.get("isPublished") === "on";
  const sortOrderRaw = getString(formData, "sortOrder");
  const sortOrder = Number.parseInt(sortOrderRaw, 10);
  if (!id || !question || !answer) {
    redirect(`/admin/faq?error=invalid`);
  }
  await prisma.faqEntry.update({
    where: { id },
    data: {
      question,
      answer,
      isPublished,
      ...(Number.isFinite(sortOrder) ? { sortOrder } : {}),
    },
  });
  revalidatePath("/admin/faq");
  revalidatePath("/veelgestelde-vragen");
}

export async function deleteFaqAction(formData: FormData) {
  await requireAdmin();
  const id = getString(formData, "id");
  if (!id) return;
  await prisma.faqEntry.delete({ where: { id } });
  revalidatePath("/admin/faq");
  revalidatePath("/veelgestelde-vragen");
}
