/**
 * Generate four seed-variants of each of the three "Hoe het werkt" spot
 * illustrations. Saves to public/images/spot-candidates/.
 * Matches the fal-ai/flux-pro/v1.1 model used by hero + story illustrations.
 *
 *   pnpm gen:spots
 *   # or: npx tsx scripts/generate-spot-illustrations.ts
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
const OUT_DIR = path.resolve("public/images/spot-candidates");

// Four seeds per spot (deterministic so re-runs are reproducible).
const SEEDS = [1001, 1002, 1003, 1004];

type Spot = {
  slug: string;
  label: string;
  prompt: string;
};

const SPOTS: Spot[] = [
  {
    slug: "spot-01-vertellen",
    label: "Vertellen",
    prompt:
      "Tender watercolor and pencil spot illustration in the style of Gabrielle Vincent (Ernest et Célestine) and Beatrice Alemagna. A small boy around three years old, sitting cross-legged on a woven rug, holding a well-worn stuffed rabbit against his shoulder, looking off to the side in quiet concentration, completely in his own world. A few wooden blocks and a small enamel cup scattered near him on the rug. Soft morning light coming from a window out of frame. Loose pencil contour lines, transparent watercolor wash with bare paper showing through, gentle muted palette of cream, warm amber, dusty plum and soft rose. The illustration is a vignette — figures rendered in detail at the center, and the scene fades softly into bare cream paper at the edges with no frame, no border, no rectangle. Tender intimate domestic moment, picture book illustration, hand-drawn quality, paper texture visible. Cream paper background #F5F0E8. No text, no logos, no signature, no border. Avoid: glossy digital rendering, 3D, thick black outlines, harsh contrast, cartoon style, busy background, full-bleed background fill.",
  },
  {
    slug: "spot-02-schrijven",
    label: "Schrijven",
    prompt:
      "Tender watercolor and pencil spot illustration in the style of Gabrielle Vincent (Ernest et Célestine) and Beatrice Alemagna. A writing desk seen from slightly above, with a handwritten page covered in looping cursive (no readable words, just the gesture of writing), an open sketchbook showing soft watercolor washes, a slender paintbrush resting across a ceramic water cup, a warm cup of tea beside a small stack of cloth-bound books. No person visible, only the quiet traces of someone at work. Soft late-afternoon light falling across the desk. Loose pencil contour lines, transparent watercolor wash with bare paper showing through, gentle muted palette of cream, warm amber, dusty plum and soft rose. The illustration is a vignette — objects rendered in detail at the center, and the scene fades softly into bare cream paper at the edges with no frame, no border, no rectangle. Tender intimate craft moment, picture book illustration, hand-drawn quality, paper texture visible. Cream paper background #F5F0E8. No text, no logos, no signature, no border. Avoid: glossy digital rendering, 3D, thick black outlines, harsh contrast, cartoon style, busy background, full-bleed background fill, readable text or letterforms.",
  },
  {
    slug: "spot-03-voorlezen",
    label: "Voorlezen",
    prompt:
      "Tender watercolor and pencil spot illustration in the style of Gabrielle Vincent (Ernest et Célestine) and Beatrice Alemagna. A small girl around five years old tucked under a soft duvet in bed, her head resting on a pillow, eyes almost closed, about to drift asleep. An open picture book rests tilted on the duvet, its pages catching warm lamplight. A small bedside lamp glows warm amber just out of frame. A stuffed bear nestled beside her. The presence of a parent sitting nearby is felt but not shown. Loose pencil contour lines, transparent watercolor wash with bare paper showing through, gentle muted palette of cream, warm amber, dusty plum and soft rose. The illustration is a vignette — figures rendered in detail at the center, and the scene fades softly into bare cream paper at the edges with no frame, no border, no rectangle. Tender intimate bedtime moment, picture book illustration, hand-drawn quality, paper texture visible. Cream paper background #F5F0E8. No text, no logos, no signature, no border. Avoid: glossy digital rendering, 3D, thick black outlines, harsh contrast, cartoon style, busy background, full-bleed background fill.",
  },
];

type Job = {
  filename: string;
  spot: Spot;
  seed: number;
  variant: number;
};

async function generate(job: Job): Promise<{ job: Job; ok: boolean; bytes?: number; error?: string }> {
  const label = `${job.spot.label} v${job.variant} (seed ${job.seed})`;
  try {
    const started = Date.now();
    const result = await fal.subscribe(MODEL, {
      input: {
        prompt: job.spot.prompt,
        image_size: "square_hd",
        num_images: 1,
        seed: job.seed,
        safety_tolerance: "2",
      },
    });
    const url = (result as { data?: { images?: { url: string }[] } }).data
      ?.images?.[0]?.url;
    if (!url) {
      return { job, ok: false, error: "Geen image URL terug van fal.ai" };
    }
    const res = await fetch(url);
    if (!res.ok) {
      return { job, ok: false, error: `Download faalde: ${res.status}` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(OUT_DIR, job.filename);
    await writeFile(outPath, buf);
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `  ✓ ${job.filename.padEnd(32)} ${(buf.length / 1024).toFixed(0)} kB  (${elapsed}s)`
    );
    return { job, ok: true, bytes: buf.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${label}: ${message}`);
    return { job, ok: false, error: message };
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const jobs: Job[] = SPOTS.flatMap((spot) =>
    SEEDS.map((seed, i) => ({
      filename: `${spot.slug}-v${i + 1}.png`,
      spot,
      seed,
      variant: i + 1,
    }))
  );

  console.log(`[fal.ai] model: ${MODEL}`);
  console.log(
    `[fal.ai] ${jobs.length} images naar ${OUT_DIR}\n[fal.ai] parallel — kan 30-90s duren…\n`
  );

  const results = await Promise.all(jobs.map(generate));

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log(`\nResultaat: ${ok.length}/${jobs.length} geslaagd`);

  if (ok.length > 0) {
    console.log("\nAangemaakte bestanden:");
    for (const r of ok) {
      console.log(
        `  ${path.join(OUT_DIR, r.job.filename)}  (${((r.bytes ?? 0) / 1024).toFixed(0)} kB)`
      );
    }
  }

  if (failed.length > 0) {
    console.log("\nGefaald:");
    for (const r of failed) {
      console.log(`  ${r.job.filename}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
