/**
 * Experiment: wordt FLUX.2 consistenter met méér referentiebeelden?
 *
 * Drie varianten, zelfde vijf scènes, zelfde seed, engine flux-2-pro/edit:
 *
 *   A  één referentie: het wizardportret (flux-pro/v1.1, 512px, zoals nu)
 *   B  drie referenties: wizardportret + close-up gezicht + driekwart-view,
 *      beide afgeleid van het wizardportret met flux-2-pro/edit
 *   C  als B, maar het basisportret is zelf met flux-2-pro (text-to-image)
 *      gemaakt, zodat het hele karakterblad "FLUX.2-eigen" is
 *
 * Gebruik:
 *   npx tsx scripts/compare-reference-sets.ts --out <map> [--seed 123456]
 *
 * Kosten: ~$1.10 (2 portretten, 4 bladbeelden, 15 pagina's).
 * Output: <map>/index.html, <map>/refs/*.jpg, <map>/<variant>/NN.jpg, run.json
 */
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env" });

const SCENES = [
  "digging in a sandbox in the backyard on a sunny morning, discovering a shiny glittering stone, eyes wide with wonder",
  "walking through a lush prehistoric jungle with giant ferns, holding the glowing stone up high, a small friendly green dinosaur peeking from behind a tree",
  "riding on the back of a gentle long-necked dinosaur across a flower meadow with volcanoes far in the distance, laughing with arms spread wide",
  "sitting on a big rock sharing a picnic of berries with three baby dinosaurs beside a sparkling river at golden hour",
  "fast asleep in bed under a dinosaur-print blanket, the shiny stone glowing softly on the nightstand, moonlight through the window",
];

const CHILD = {
  childName: "Willem",
  dateOfBirth: "2022-03-15",
  gender: "boy",
  hairColor: "blond",
  hairStyle: "kort",
  eyeColor: "blauw",
  skinColor: "licht",
  wearsGlasses: false,
  hasFreckles: false,
  interests: ["dino's", "graafmachines", "zwemmen"],
  mainCharacterType: "self",
};

type Variant = { key: string; label: string; refs: string[] };

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

async function download(url: string, file: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download mislukt (${res.status}): ${url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type FalImages = { data?: { images?: { url: string }[] } };
function firstUrl(result: unknown, what: string): string {
  const url = (result as FalImages).data?.images?.[0]?.url;
  if (!url) throw new Error(`${what}: geen beeld terug`);
  return url;
}

async function main() {
  const outDir = arg("out");
  if (!outDir) throw new Error("--out <map> is verplicht");
  const seed = Number(arg("seed", "123456"));
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY ontbreekt");

  const { buildCharacterDescription, buildIllustrationStyle } = await import(
    "@/lib/ai/story-generator"
  );
  const { renderIllustration } = await import("@/lib/ai/illustration-generator");
  const { fal } = await import("@fal-ai/client");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bible = CHILD as any;
  const charDescription = buildCharacterDescription(bible);
  const style = buildIllustrationStyle(bible);
  const prompts = SCENES.map(
    (s) => `${charDescription}, ${s}. Soft watercolor, children's picture book style`,
  );
  const portraitPrompt = `${charDescription}, standing in a sunny meadow with flowers, smiling and waving, full body portrait, looking at the viewer. ${style}`;

  await mkdir(path.join(outDir, "refs"), { recursive: true });
  const saved: Record<string, string> = {};
  async function keep(name: string, url: string): Promise<string> {
    const rel = `refs/${name}.jpg`;
    await download(url, path.join(outDir, rel));
    saved[name] = rel;
    return url;
  }

  // Karakterblad afleiden van een basisportret met flux-2-pro/edit.
  async function sheetFrom(portraitUrl: string, tag: string): Promise<string[]> {
    const face = await fal.subscribe("fal-ai/flux-2-pro/edit", {
      input: {
        prompt: `Close-up portrait of the child in image 1: head and shoulders, facing the viewer, gentle soft smile, eyes clearly visible. Exactly the same face, hair, eye colour, skin tone and clothes as in image 1. Plain soft cream background. ${style}`,
        image_urls: [portraitUrl],
        image_size: "square_hd",
        seed: 777,
        safety_tolerance: "5",
        output_format: "jpeg",
      },
    });
    const faceUrl = await keep(`${tag}-face`, firstUrl(face, "close-up"));
    const body = await fal.subscribe("fal-ai/flux-2-pro/edit", {
      input: {
        prompt: `Full-body view of the child in image 1 standing and turned three-quarters to the left, arms relaxed, looking slightly past the viewer. Exactly the same face, hair, eye colour, skin tone and clothes as in image 1. Plain soft cream background. ${style}`,
        image_urls: [portraitUrl],
        image_size: "square",
        seed: 778,
        safety_tolerance: "5",
        output_format: "jpeg",
      },
    });
    const bodyUrl = await keep(`${tag}-body`, firstUrl(body, "driekwart"));
    return [faceUrl, bodyUrl];
  }

  // A/B: wizardportret zoals nu (flux-pro/v1.1, 512px)
  console.log("⏳ Wizardportret (flux-pro/v1.1)...");
  const portraitA = await keep(
    "A-portret",
    firstUrl(
      await fal.subscribe("fal-ai/flux-pro/v1.1", {
        input: { prompt: portraitPrompt, image_size: "square", num_images: 1, seed: 424242, safety_tolerance: "2" },
      }),
      "wizardportret",
    ),
  );
  console.log("⏳ Karakterblad B (uit wizardportret)...");
  const sheetB = await sheetFrom(portraitA, "B");

  // C: basisportret met flux-2-pro text-to-image
  console.log("⏳ Portret C (flux-2-pro text-to-image)...");
  const portraitC = await keep(
    "C-portret",
    firstUrl(
      await fal.subscribe("fal-ai/flux-2-pro", {
        input: { prompt: portraitPrompt, image_size: "square_hd", seed: 424242, safety_tolerance: "5", output_format: "jpeg" },
      }),
      "portret C",
    ),
  );
  console.log("⏳ Karakterblad C...");
  const sheetC = await sheetFrom(portraitC, "C");

  const variants: Variant[] = [
    { key: "A", label: "A · 1 ref: wizardportret (huidige opzet)", refs: [portraitA] },
    { key: "B", label: "B · 3 refs: wizardportret + close-up + driekwart", refs: [portraitA, ...sheetB] },
    { key: "C", label: "C · 3 refs: FLUX.2-portret + close-up + driekwart", refs: [portraitC, ...sheetC] },
  ];

  const results: Record<string, { files: (string | null)[]; ms: number }> = {};
  for (const v of variants) {
    console.log(`⏳ ${v.label}...`);
    await mkdir(path.join(outDir, v.key), { recursive: true });
    const t0 = Date.now();
    const urls = await Promise.all(
      prompts.map((p) =>
        renderIllustration(p, style, seed, { reference: { urls: v.refs, engine: "flux2" } }),
      ),
    );
    const ms = Date.now() - t0;
    const files: (string | null)[] = [];
    for (let i = 0; i < urls.length; i++) {
      const rel = `${v.key}/${String(i + 1).padStart(2, "0")}.jpg`;
      if (urls[i]) await download(urls[i]!, path.join(outDir, rel));
      files.push(urls[i] ? rel : null);
    }
    results[v.key] = { files, ms };
    console.log(`✓ ${urls.filter(Boolean).length}/${urls.length} gelukt in ${(ms / 1000).toFixed(1)}s`);
  }

  const refBlock = (v: Variant) => {
    const names = v.key === "A" ? ["A-portret"] : v.key === "B" ? ["A-portret", "B-face", "B-body"] : ["C-portret", "C-face", "C-body"];
    return names.map((n) => `<img class="ref" src="${saved[n]}" title="${n}">`).join("");
  };
  const header = variants
    .map((v) => `<th>${esc(v.label)}<br><div class="refs">${refBlock(v)}</div><small>${(results[v.key].ms / 1000).toFixed(0)}s voor 5 beelden</small></th>`)
    .join("");
  const rows = SCENES.map((scene, i) => {
    const cells = variants
      .map((v) => {
        const f = results[v.key].files[i];
        return `<td>${f ? `<img src="${f}" loading="lazy">` : '<div class="miss">mislukt</div>'}</td>`;
      })
      .join("");
    return `<tr><th class="scene">${i + 1}<br><small>${esc(scene)}</small></th>${cells}</tr>`;
  }).join("\n");
  const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8">
<title>FLUX.2 referentiesets vergeleken · seed ${seed}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:24px;background:#faf7f2;color:#222}
  h1{font-size:20px} p{max-width:900px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}
  th{background:#f1ece3;font-weight:600}
  th.scene{width:150px;font-weight:700} small{font-weight:400;color:#555}
  img{width:100%;height:auto;display:block;border-radius:6px}
  .refs{display:flex;gap:6px;margin:6px 0} .refs img.ref{width:90px;border:2px solid #e9c46a}
  .miss{padding:40px 8px;text-align:center;color:#a33;background:#fbeaea;border-radius:6px}
</style></head><body>
<h1>FLUX.2 Pro edit: één referentie versus karakterblad</h1>
<p>Zelfde kind, zelfde vijf scènes, zelfde seed (${seed}). Boven elke kolom staan de referentiebeelden die het model per pagina meekreeg.</p>
<table><thead><tr><th>Scène</th>${header}</tr></thead><tbody>
${rows}
</tbody></table>
</body></html>`;
  await writeFile(path.join(outDir, "index.html"), html, "utf8");
  await writeFile(
    path.join(outDir, "run.json"),
    JSON.stringify({ seed, portraitPrompt, prompts, variants: variants.map((v) => ({ key: v.key, refs: v.refs })), results }, null, 2),
    "utf8",
  );
  console.log(`✓ Klaar: ${path.join(outDir, "index.html")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
