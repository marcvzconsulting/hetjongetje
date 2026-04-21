"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type SaveDraftInput = {
  childId: string;
  title: string;
  subtitle: string;
  dedication: string;
  coverStyle: string;
  format: string;
  selectedStoryIds: string[];
};

/**
 * Save (or create) the draft book for this child. One draft per child —
 * we upsert on the first book with printStatus="draft" for that child.
 * Returns the book id so the client can cache it for subsequent saves.
 */
export async function saveBookDraft(
  input: SaveDraftInput
): Promise<{ ok: true; bookId: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthenticated" };

  const child = await prisma.childProfile.findFirst({
    where: { id: input.childId, userId: session.user.id },
    select: { id: true },
  });
  if (!child) return { ok: false, error: "child_not_found" };

  const existing = await prisma.storyBook.findFirst({
    where: {
      childProfileId: input.childId,
      printStatus: "draft",
    },
    select: { id: true },
  });

  const bookId = await prisma.$transaction(async (tx) => {
    const book = existing
      ? await tx.storyBook.update({
          where: { id: existing.id },
          data: {
            title: input.title,
            subtitle: input.subtitle || null,
            dedication: input.dedication || null,
            coverStyle: input.coverStyle,
            format: input.format,
          },
          select: { id: true },
        })
      : await tx.storyBook.create({
          data: {
            childProfileId: input.childId,
            title: input.title,
            subtitle: input.subtitle || null,
            dedication: input.dedication || null,
            coverStyle: input.coverStyle,
            format: input.format,
            printStatus: "draft",
          },
          select: { id: true },
        });

    // Replace selected stories in one shot to keep it simple.
    await tx.bookStory.deleteMany({ where: { bookId: book.id } });
    if (input.selectedStoryIds.length > 0) {
      await tx.bookStory.createMany({
        data: input.selectedStoryIds.map((storyId, i) => ({
          bookId: book.id,
          storyId,
          sortOrder: i,
        })),
      });
    }

    return book.id;
  });

  revalidatePath(`/book/${input.childId}`);
  return { ok: true, bookId };
}
