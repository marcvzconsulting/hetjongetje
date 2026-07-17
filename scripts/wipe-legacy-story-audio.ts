/**
 * Eenmalig opruimscript voor de overstap van hele-verhaal-audio naar
 * per-pagina-audio: verwijdert ALLE story_audio-rijen én de bijbehorende
 * Scaleway-objecten. De oude rijen (één mp3 per verhaal per stem,
 * `stories/<id>/audio-<stem>.mp3`) passen niet in het nieuwe model
 * (@@unique([storyId, voiceKey, pageNumber]) + word_timings) en zouden
 * de schema-push blokkeren omdat page_number NOT NULL is.
 *
 * Gebruik:
 *   npx tsx scripts/wipe-legacy-story-audio.ts            (dry run)
 *   npx tsx scripts/wipe-legacy-story-audio.ts --apply    (echt wissen)
 *
 * Leest .env en overschrijft met .env.production.local wanneer aanwezig
 * (zelfde patroon als de andere scripts) — draait dus tegen PROD zodra
 * dat bestand er staat. Draai bewust, met --apply.
 */
import { config } from "dotenv";
config(); // .env als basis
config({ path: ".env.production.local", override: true });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // De scaleway-helper leest env-vars op module-niveau (PUBLIC_BASE_URL),
  // dus pas importeren nádat dotenv hierboven gedraaid heeft.
  const { keyFromUrl, deleteObjects } = await import(
    "../src/lib/storage/scaleway"
  );

  // Raw query i.p.v. prisma.storyAudio: de gegenereerde client kent na
  // de schema-wijziging al page_number, maar de (prod-)tabel nog niet.
  const rows = await prisma.$queryRaw<
    { id: string; story_id: string; voice_key: string; url: string }[]
  >`SELECT id, story_id, voice_key, url FROM story_audio`;

  console.log(`Gevonden: ${rows.length} story_audio-rij(en).`);
  if (rows.length === 0) {
    console.log("Niets te wissen.");
    return;
  }

  const keys: string[] = [];
  for (const row of rows) {
    const key = keyFromUrl(row.url);
    console.log(
      `  • story ${row.story_id} stem ${row.voice_key} → ${key ?? "(geen eigen-bucket-url, wordt overgeslagen)"}`,
    );
    if (key) keys.push(key);
  }

  if (!APPLY) {
    console.log(
      `\nDry run: zou ${keys.length} bucket-object(en) en ${rows.length} rij(en) wissen. Draai met --apply om echt te wissen.`,
    );
    return;
  }

  // Eerst de bucket-objecten (idempotent: nogmaals draaien kan altijd),
  // daarna de rijen.
  if (keys.length > 0) {
    const failed = await deleteObjects(keys);
    if (failed.length > 0) {
      console.warn(
        `⚠ ${failed.length} object(en) niet verwijderd uit de bucket:`,
        failed,
      );
    } else {
      console.log(`✓ ${keys.length} bucket-object(en) verwijderd.`);
    }
  }

  const deleted = await prisma.$executeRaw`DELETE FROM story_audio`;
  console.log(`✓ ${deleted} story_audio-rij(en) verwijderd.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
