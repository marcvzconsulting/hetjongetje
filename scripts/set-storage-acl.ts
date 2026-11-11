/**
 * Zet de leesrechten van alle kindplaatjes in de bucket om.
 *
 *   npx tsx scripts/set-storage-acl.ts --private          (proefdraai, wijzigt niets)
 *   npx tsx scripts/set-storage-acl.ts --private --apply
 *   npx tsx scripts/set-storage-acl.ts --public  --apply  (terugdraaien)
 *
 * Raakt alleen objecten onder `stories/` en `previews/` (illustraties,
 * portret, karakterblad). Leest de Scaleway-gegevens uit de omgeving; voor
 * productie: zet ze in .env.production.local en voeg --prod toe.
 *
 * Volgorde bij het overstappen naar privé-opslag:
 *   1. Code met de schakelaar is live, STORAGE_PRIVATE_IMAGES nog uit.
 *   2. Zet STORAGE_PRIVATE_IMAGES=1 in Vercel en deploy opnieuw. De app
 *      levert plaatjes nu uit via /api/img; dat werkt ook voor objecten die
 *      nog publiek zijn.
 *   3. Draai dit script met --private --apply. Pas nu zijn oude links dood.
 * Terug: script met --public --apply, daarna de schakelaar uit.
 */
import { config } from "dotenv";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectAclCommand,
} from "@aws-sdk/client-s3";

const args = new Set(process.argv.slice(2));
config({ path: args.has("--prod") ? ".env.production.local" : ".env", override: true });

const makePrivate = args.has("--private");
const makePublic = args.has("--public");
const apply = args.has("--apply");
if (makePrivate === makePublic) {
  console.error("Kies precies één van --private of --public.");
  process.exit(1);
}

const REGION = process.env.SCALEWAY_REGION || "nl-ams";
const BUCKET = process.env.SCALEWAY_BUCKET;
if (!BUCKET || !process.env.SCALEWAY_ACCESS_KEY || !process.env.SCALEWAY_SECRET_KEY) {
  console.error("SCALEWAY_BUCKET, SCALEWAY_ACCESS_KEY en SCALEWAY_SECRET_KEY zijn nodig.");
  process.exit(1);
}

const client = new S3Client({
  region: REGION,
  endpoint: `https://s3.${REGION}.scw.cloud`,
  credentials: {
    accessKeyId: process.env.SCALEWAY_ACCESS_KEY,
    secretAccessKey: process.env.SCALEWAY_SECRET_KEY,
  },
});

async function main() {
  const acl = makePrivate ? "private" : "public-read";
  console.log(`Bucket ${BUCKET}: ${acl}${apply ? "" : " (proefdraai, er wijzigt niets)"}`);
  let total = 0;
  let failed = 0;
  for (const prefix of ["stories/", "previews/"]) {
    let token: string | undefined;
    let count = 0;
    do {
      const page = await client.send(
        new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }),
      );
      for (const obj of page.Contents ?? []) {
        if (!obj.Key) continue;
        count++;
        if (!apply) continue;
        try {
          await client.send(new PutObjectAclCommand({ Bucket: BUCKET, Key: obj.Key, ACL: acl }));
        } catch (err) {
          failed++;
          console.error(`  mislukt: ${obj.Key}`, err instanceof Error ? err.message : err);
        }
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    console.log(`  ${prefix}: ${count} objecten`);
    total += count;
  }
  console.log(apply ? `Klaar: ${total - failed} omgezet, ${failed} mislukt.` : `Zou ${total} objecten omzetten. Voeg --apply toe om het uit te voeren.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
