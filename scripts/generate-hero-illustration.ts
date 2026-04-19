/**
 * One-off: generate the hero spot illustration for the redesigned landing page.
 * Saves to public/design-exploration/hero-illustration.png
 *
 *   npx tsx scripts/generate-hero-illustration.ts
 */
import "dotenv/config";
import { fal } from "@fal-ai/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("FAL_KEY ontbreekt in .env");
  process.exit(1);
}
fal.config({ credentials: FAL_KEY });

const MODEL = "fal-ai/flux-pro/v1.1";
const OUT = path.resolve("public/design-exploration/hero-illustration.png");

const PROMPT = [
  "Tender watercolor and pencil spot illustration in the style of Gabrielle Vincent",
  "(Ernest et Célestine) and Beatrice Alemagna. A small girl in soft pajamas, kneeling",
  "on a wooden kitchen floor at dusk, gently hugging a stuffed grey elephant against",
  "her chest, eyes closed in contentment. A single warm amber lamp glow from above the",
  "scene. Loose pencil contour lines, transparent watercolor wash with bare paper showing",
  "through, gentle muted palette of cream, warm amber, dusty plum and soft rose. The",
  "illustration is a vignette — figures rendered in detail at the center, and the",
  "scene fades softly into bare cream paper at the edges with no frame, no border, no",
  "rectangle. Tender intimate domestic moment, picture book illustration, hand-drawn",
  "quality, paper texture visible. Cream paper background #F5F0E8. No text, no logos,",
  "no signature, no border. Avoid: glossy digital rendering, 3D, thick black outlines,",
  "harsh contrast, cartoon style, busy background, full-bleed background fill.",
].join(" ");

async function main() {
  console.log(`[fal.ai] model: ${MODEL}`);
  console.log("[fal.ai] genereren — kan 20-40s duren…");

  const result = await fal.subscribe(MODEL, {
    input: {
      prompt: PROMPT,
      image_size: "square_hd",
      num_images: 1,
      seed: 4242,
      safety_tolerance: "2",
    },
  });

  const url = (result as { data?: { images?: { url: string }[] } }).data
    ?.images?.[0]?.url;
  if (!url) {
    console.error("Geen afbeelding terug van fal.ai", result);
    process.exit(1);
  }

  console.log(`[fal.ai] url: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Download faalde: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, buf);
  console.log(`[ok] opgeslagen: ${OUT} (${(buf.length / 1024).toFixed(0)} kB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
