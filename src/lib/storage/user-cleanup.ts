import { prisma } from "@/lib/db";
import { deleteObjects, keyFromUrl } from "./scaleway";

/**
 * Collect every storage key this user owns: child character previews,
 * reference photos, story page illustrations, and book assets (covers + PDFs).
 *
 * Only keys for URLs that live in our own bucket are returned — external URLs
 * (fal.ai originals, etc.) are skipped.
 */
export async function collectUserStorageKeys(userId: string): Promise<string[]> {
  const children = await prisma.childProfile.findMany({
    where: { userId },
    select: {
      id: true,
      approvedPreviewUrl: true,
      referenceImages: true,
      stories: {
        select: {
          id: true,
          pages: { select: { illustrationUrl: true } },
        },
      },
      books: {
        select: {
          coverImageUrl: true,
          interiorPdfUrl: true,
          coverPdfUrl: true,
        },
      },
    },
  });

  const urls: (string | null | undefined)[] = [];
  for (const child of children) {
    urls.push(child.approvedPreviewUrl);
    urls.push(...child.referenceImages);
    for (const story of child.stories) {
      for (const page of story.pages) {
        urls.push(page.illustrationUrl);
      }
    }
    for (const book of child.books) {
      urls.push(book.coverImageUrl);
      urls.push(book.interiorPdfUrl);
      urls.push(book.coverPdfUrl);
    }
  }

  const keys = new Set<string>();
  for (const url of urls) {
    const key = keyFromUrl(url);
    if (key) keys.add(key);
  }
  return [...keys];
}

/**
 * Delete every storage object owned by a user. Never throws — returns a
 * summary so the caller can decide whether to log/alert. Safe to call even
 * when the bucket or credentials are misconfigured: the account deletion
 * itself will proceed regardless.
 */
export async function deleteUserStorage(userId: string): Promise<{
  requested: number;
  failed: string[];
  error?: string;
}> {
  try {
    const keys = await collectUserStorageKeys(userId);
    if (keys.length === 0) return { requested: 0, failed: [] };
    const failed = await deleteObjects(keys);
    return { requested: keys.length, failed };
  } catch (err) {
    return {
      requested: 0,
      failed: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
