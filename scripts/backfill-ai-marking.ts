/**
 * Backfill: voorzie alle al-bestaande AI-content in de Scaleway-bucket
 * van de machineleesbare AI-markering (art. 50(2) AI Act). Nieuwe
 * uploads krijgen de markering automatisch via uploadFromUrl /
 * markAudioAsAiGenerated; dit script haalt de historie bij.
 *
 * Pakt alleen de publieke AI-prefixes: stories/ (illustraties + mp3's)
 * en previews/ (AI-portretten). LoRA-trainingsfoto's (échte
 * kinderfoto's, private prefix) worden bewust NIET aangeraakt.
 *
 * Dry-run (default, schrijft niets):
 *   npx tsx scripts/backfill-ai-marking.ts
 * Echt uitvoeren:
 *   npx tsx scripts/backfill-ai-marking.ts --apply
 *
 * Idempotent: al gemarkeerde bestanden worden overgeslagen, dus het
 * script mag vaker draaien.
 */

import "dotenv/config";
import {
  listKeysByPrefix,
  publicUrlForKey,
  uploadBuffer,
} from "../src/lib/storage/scaleway";
import {
  markImageAsAiGenerated,
  markAudioAsAiGenerated,
} from "../src/lib/ai/ai-marking";

const APPLY = process.argv.includes("--apply");
const PREFIXES = ["stories/", "previews/"];

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
};

function extensionOf(key: string): string {
  const dot = key.lastIndexOf(".");
  return dot === -1 ? "" : key.slice(dot).toLowerCase();
}

async function main() {
  console.log(APPLY ? "APPLY-modus: wijzigingen worden geüpload." : "Dry-run (gebruik --apply om echt te schrijven).");

  let marked = 0;
  let skipped = 0;
  let failed = 0;
  let ignored = 0;

  for (const prefix of PREFIXES) {
    const keys = await listKeysByPrefix(prefix);
    console.log(`\n${prefix} — ${keys.length} objecten`);

    for (const key of keys) {
      const ext = extensionOf(key);
      const contentType = CONTENT_TYPES[ext];
      if (!contentType) {
        ignored++;
        continue; // zips, json, onbekend — niet onze zorg hier
      }

      try {
        const res = await fetch(publicUrlForKey(key));
        if (!res.ok) throw new Error(`GET ${res.status}`);
        const original = Buffer.from(await res.arrayBuffer());

        const markedBuf =
          ext === ".mp3"
            ? markAudioAsAiGenerated(original)
            : markImageAsAiGenerated(original);

        if (markedBuf === original) {
          skipped++;
          continue; // al gemarkeerd (of formaat onbekend — dan logde ai-marking al)
        }

        if (APPLY) {
          await uploadBuffer(markedBuf, key, contentType);
        }
        marked++;
        if (marked % 25 === 0) console.log(`  … ${marked} gemarkeerd`);
      } catch (err) {
        failed++;
        console.error(`  FOUT bij ${key}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(
    `\nKlaar. ${APPLY ? "Gemarkeerd en geüpload" : "Zou markeren"}: ${marked}, ` +
      `al gemarkeerd/overgeslagen: ${skipped}, genegeerd (ander bestandstype): ${ignored}, fouten: ${failed}`,
  );
  if (failed > 0) process.exit(1);
}

main();
