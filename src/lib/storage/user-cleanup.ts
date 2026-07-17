import { prisma } from "@/lib/db";
import { deleteObjects, deleteByPrefix, keyFromUrl } from "./scaleway";

export type StorageCleanupSummary = {
  /** How many objects (prefix listings + book keys) we attempted to delete. */
  requested: number;
  /** Prefixes/keys that failed to delete. */
  failed: string[];
};

function mergeSummary(
  a: StorageCleanupSummary,
  b: { requested: number; failed: string[] }
): StorageCleanupSummary {
  return {
    requested: a.requested + b.requested,
    failed: [...a.failed, ...b.failed],
  };
}

/**
 * Delete every bucket object belonging to a single story: all page
 * illustrations, the ending image and every read-aloud audio file all
 * live under the `stories/<storyId>/` prefix, so one prefix delete covers
 * the lot — including assets whose URL is no longer in the DB (e.g. audio
 * replaced by a regenerate). Never throws.
 */
export async function deleteStoryStorage(
  storyId: string
): Promise<StorageCleanupSummary> {
  return deleteByPrefix(`stories/${storyId}/`);
}

/**
 * Delete every bucket object belonging to a single child: its AI preview
 * portrait (`previews/<childId>/`), its LoRA training inputs — photos AND
 * the training-set zip (`lora-training/<childId>/`) — every story's assets,
 * and its book assets. Prefix-based so a real child's photos can never be
 * left behind on a public URL. Never throws.
 */
export async function deleteChildStorage(
  childId: string
): Promise<StorageCleanupSummary> {
  let summary: StorageCleanupSummary = { requested: 0, failed: [] };

  const child = await prisma.childProfile.findUnique({
    where: { id: childId },
    select: {
      id: true,
      stories: { select: { id: true } },
      books: {
        select: {
          coverImageUrl: true,
          interiorPdfUrl: true,
          coverPdfUrl: true,
        },
      },
    },
  });
  if (!child) return summary;

  // Child-scoped prefixes: AI preview + all LoRA training inputs (incl. zip).
  summary = mergeSummary(summary, await deleteByPrefix(`previews/${childId}/`));
  summary = mergeSummary(
    summary,
    await deleteByPrefix(`lora-training/${childId}/`)
  );

  // Every story's assets.
  for (const story of child.stories) {
    summary = mergeSummary(summary, await deleteStoryStorage(story.id));
  }

  // Book assets aren't under a single per-child prefix — delete by the
  // keys we stored on the book rows.
  const bookKeys = new Set<string>();
  for (const book of child.books) {
    for (const url of [
      book.coverImageUrl,
      book.interiorPdfUrl,
      book.coverPdfUrl,
    ]) {
      const key = keyFromUrl(url);
      if (key) bookKeys.add(key);
    }
  }
  if (bookKeys.size > 0) {
    try {
      const failed = await deleteObjects([...bookKeys]);
      summary = mergeSummary(summary, { requested: bookKeys.size, failed });
    } catch {
      summary = mergeSummary(summary, {
        requested: bookKeys.size,
        failed: [...bookKeys],
      });
    }
  }

  return summary;
}

/**
 * Delete every storage object owned by a user by walking each of their
 * children. Never throws — returns a summary so the caller can log/alert.
 * The account deletion itself proceeds regardless of storage failures
 * (the periodic orphan-cleanup is the safety net for anything left).
 */
export async function deleteUserStorage(
  userId: string
): Promise<StorageCleanupSummary & { error?: string }> {
  try {
    const children = await prisma.childProfile.findMany({
      where: { userId },
      select: { id: true },
    });
    let summary: StorageCleanupSummary = { requested: 0, failed: [] };
    for (const child of children) {
      summary = mergeSummary(summary, await deleteChildStorage(child.id));
    }
    return summary;
  } catch (err) {
    return {
      requested: 0,
      failed: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
