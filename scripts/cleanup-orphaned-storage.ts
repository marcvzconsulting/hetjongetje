/**
 * One-time cleanup of orphaned Scaleway objects.
 *
 * The DELETE routes historically only removed the DB rows, never the
 * bucket objects, and the LoRA training zip was never deleted at all. This
 * script sweeps the bucket for objects whose owning entity is gone (or, for
 * training inputs, whose training has finished) and removes them.
 *
 * DRY-RUN BY DEFAULT — prints what it WOULD delete and touches nothing.
 * Pass --apply to actually delete.
 *
 *   npx tsx scripts/cleanup-orphaned-storage.ts            # dry-run
 *   npx tsx scripts/cleanup-orphaned-storage.ts --apply    # delete for real
 *
 * Scoped to the prefixes we control: stories/, previews/, lora-training/.
 * Book assets (rare, feature is a stub) are not covered.
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { listKeysByPrefix, deleteObjects } from "../src/lib/storage/scaleway";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const APPLY = process.argv.includes("--apply");

/** Pull the entity id out of `<prefix>/<id>/...`. */
function idFromKey(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const slash = rest.indexOf("/");
  return slash === -1 ? null : rest.slice(0, slash);
}

async function main() {
  console.log(
    `\n🧹 Orphan-storage cleanup — ${APPLY ? "APPLY (deleting)" : "DRY-RUN (no deletes)"}\n`,
  );

  // Alive entity ids.
  const [stories, children] = await Promise.all([
    prisma.story.findMany({ select: { id: true } }),
    prisma.childProfile.findMany({
      select: { id: true, loraStatus: true },
    }),
  ]);
  const aliveStoryIds = new Set(stories.map((s) => s.id));
  const aliveChildIds = new Set(children.map((c) => c.id));
  // Children still actively training keep their LoRA inputs; everyone else
  // should have none left.
  const trainingChildIds = new Set(
    children.filter((c) => c.loraStatus === "training").map((c) => c.id),
  );

  const orphans: string[] = [];

  // stories/<storyId>/... → orphan if the story no longer exists.
  for (const key of await listKeysByPrefix("stories/")) {
    const id = idFromKey(key, "stories/");
    if (id && !aliveStoryIds.has(id)) orphans.push(key);
  }

  // previews/<childId>/... → orphan if the child no longer exists.
  for (const key of await listKeysByPrefix("previews/")) {
    const id = idFromKey(key, "previews/");
    if (id && !aliveChildIds.has(id)) orphans.push(key);
  }

  // lora-training/<childId>/... → orphan if the child is gone OR is no
  // longer training (training inputs should have been wiped post-training).
  for (const key of await listKeysByPrefix("lora-training/")) {
    const id = idFromKey(key, "lora-training/");
    if (id && (!aliveChildIds.has(id) || !trainingChildIds.has(id))) {
      orphans.push(key);
    }
  }

  if (orphans.length === 0) {
    console.log("✅ Geen wees-objecten gevonden.\n");
    return;
  }

  console.log(`Gevonden wees-objecten: ${orphans.length}`);
  for (const key of orphans.slice(0, 50)) console.log(`  - ${key}`);
  if (orphans.length > 50) console.log(`  … en ${orphans.length - 50} meer`);

  if (!APPLY) {
    console.log(
      `\nDRY-RUN — niets verwijderd. Draai opnieuw met --apply om ${orphans.length} objecten te wissen.\n`,
    );
    return;
  }

  const failed = await deleteObjects(orphans);
  console.log(
    `\n🗑️  Verwijderd: ${orphans.length - failed.length}/${orphans.length}`,
  );
  if (failed.length > 0) {
    console.log(`⚠️  Mislukt (${failed.length}):`);
    for (const k of failed.slice(0, 20)) console.log(`  - ${k}`);
  }
  console.log("");
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
