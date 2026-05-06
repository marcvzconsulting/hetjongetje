"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminWithIdentity } from "@/lib/admin/identity";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin/audit-log";
import { findAiPromptSnippet } from "@/lib/ai/prompts/store";

function trim(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export async function saveAiPromptAction(formData: FormData) {
  const { audit } = await requireAdminWithIdentity();
  const code = trim(formData.get("code"));
  const meta = findAiPromptSnippet(code);
  if (!meta) {
    redirect("/admin/ai-prompts?error=unknown");
  }
  const value = trim(formData.get("value"));
  if (!value) {
    redirect(`/admin/ai-prompts?error=empty&code=${encodeURIComponent(code)}`);
  }

  await prisma.aiPromptOverride.upsert({
    where: { code },
    create: { code, value, updatedById: audit.actorId },
    update: { value, updatedById: audit.actorId },
  });

  await logAdminAction({
    ...audit,
    action: "ai_prompt.update",
    targetType: "ai_prompt",
    targetId: code,
  });

  revalidatePath("/admin/ai-prompts");
  redirect(`/admin/ai-prompts?saved=${encodeURIComponent(code)}`);
}

export async function resetAiPromptAction(formData: FormData) {
  const { audit } = await requireAdminWithIdentity();
  const code = trim(formData.get("code"));
  await prisma.aiPromptOverride.delete({ where: { code } }).catch(() => {});
  await logAdminAction({
    ...audit,
    action: "ai_prompt.reset",
    targetType: "ai_prompt",
    targetId: code,
  });
  revalidatePath("/admin/ai-prompts");
  redirect(`/admin/ai-prompts?saved=reset:${encodeURIComponent(code)}`);
}
