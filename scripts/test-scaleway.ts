/**
 * Quick connectivity test for Scaleway Object Storage.
 *   npx tsx scripts/test-scaleway.ts
 *
 * Uploads a small test file, checks the public URL, then deletes it.
 * Helps verify credentials + bucket permissions before touching real data.
 */
import "dotenv/config";
import { uploadBuffer, deleteObject } from "../src/lib/storage/scaleway";

async function main() {
  const key = `_test/connectivity-${Date.now()}.txt`;
  const body = Buffer.from(`Hallo vanaf Ons Verhaaltje! ${new Date().toISOString()}`);

  console.log("📤 Probeer te uploaden...");
  console.log(`   Region: ${process.env.SCALEWAY_REGION}`);
  console.log(`   Bucket: ${process.env.SCALEWAY_BUCKET}`);
  console.log(`   Key:    ${key}\n`);

  let url: string;
  try {
    url = await uploadBuffer(body, key, "text/plain");
    console.log(`✅ Upload gelukt!`);
    console.log(`   URL: ${url}\n`);
  } catch (err) {
    console.error("❌ Upload mislukt:");
    console.error(err);
    process.exit(1);
  }

  console.log("🌐 Probeer de URL publiek op te halen...");
  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      console.log(`✅ Publieke toegang werkt! (HTTP ${res.status})`);
      console.log(`   Content: "${text}"\n`);
    } else {
      console.warn(
        `⚠  URL gaf HTTP ${res.status} — upload werkt, maar publieke toegang nog niet.`
      );
      console.warn(
        `   In Scaleway bucket settings: zet 'Block Public Access' zo dat object-ACLs zijn toegestaan.\n`
      );
    }
  } catch (err) {
    console.warn("⚠  Kon URL niet ophalen:", err);
  }

  console.log("🧹 Opruimen van test-bestand...");
  try {
    await deleteObject(key);
    console.log("✅ Test-bestand verwijderd.\n");
  } catch (err) {
    console.warn("⚠  Delete mislukt (niet kritiek):", err);
  }

  console.log("🎉 Klaar!");
}

main().catch((err) => {
  console.error("Onverwachte fout:", err);
  process.exit(1);
});
