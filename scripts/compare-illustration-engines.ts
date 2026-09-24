/**
 * Vergelijk illustratie-engines op karakter-consistentie: zelfde kind,
 * zelfde vijf scènes, zelfde seed, drie engines naast elkaar.
 *
 *   flux1          huidige productiepad: flux-pro/v1.1, tekst + seed
 *   flux2          fal-ai/flux-2-pro/edit met het portret als referentie
 *   nano-banana-2  fal-ai/nano-banana-2/edit met het portret als referentie
 *
 * Database-vrij: kindprofiel en scènes staan hieronder in CONFIG. Portret
 * en karakterblad worden gemaakt met dezelfde functies als de wizard en
 * de goedkeurstap (character-sheet.ts) en dienen daarna als referenties.
 * De pagina's lopen door exact dezelfde renderIllustration() als productie.
 * --no-sheet laat het karakterblad weg (alleen het portret als referentie).
 *
 * Gebruik:
 *   npx tsx scripts/compare-illustration-engines.ts --out <map>
 *       [--engines flux1,flux2,nano-banana-2] [--seed 123456]
 *       [--style "STYLE: ..."]   de illustration.style-regel uit /admin/ai-prompts,
 *                                zodat de baseline overeenkomt met productie
 *
 * Kosten: ~$0.90 voor 1 portret + 3 × 5 beelden.
 * Output: <map>/index.html (contactvel), <map>/<engine>/NN.jpg, run.json
 */
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env" });

type EngineKey = "flux1" | "flux2" | "nano-banana-2";
const ALL_ENGINES: EngineKey[] = ["flux1", "flux2", "nano-banana-2"];
const ENGINE_LABEL: Record<EngineKey, string> = {
  flux1: "flux-pro/v1.1 · tekst + seed (huidig)",
  flux2: "flux-2-pro/edit · portret als referentie",
  "nano-banana-2": "nano-banana-2/edit · portret als referentie",
};

const CONFIG = {
  // Zelfde demo-kind als scripts/generate-demo-story.ts (geen echt kind).
  child: {
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
  },
  // Scènes in het formaat dat Claude aanlevert: karakteromschrijving
  // vooraan, dan de scène, dan de stijlzin (zie story-generator prompt).
  scenes: [
    "digging in a sandbox in the backyard on a sunny morning, discovering a shiny glittering stone, eyes wide with wonder",
    "walking through a lush prehistoric jungle with giant ferns, holding the glowing stone up high, a small friendly green dinosaur peeking from behind a tree",
    "riding on the back of a gentle long-necked dinosaur across a flower meadow with volcanoes far in the distance, laughing with arms spread wide",
    "sitting on a big rock sharing a picnic of berries with three baby dinosaurs beside a sparkling river at golden hour",
    "fast asleep in bed under a dinosaur-print blanket, the shiny stone glowing softly on the nightstand, moonlight through the window",
  ],
};

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

async function main() {
  const outDir = arg("out");
  if (!outDir) throw new Error("--out <map> is verplicht");
  const engines = arg("engines", ALL_ENGINES.join(","))!.split(",") as EngineKey[];
  for (const e of engines) {
    if (!ALL_ENGINES.includes(e)) throw new Error(`Onbekende engine: ${e}`);
  }
  const seed = Number(arg("seed", "123456"));
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY ontbreekt");

  // Dynamische imports ná dotenv, zodat fal.config() de key ziet.
  const { buildCharacterDescription, buildIllustrationStyle } = await import(
    "@/lib/ai/story-generator"
  );
  const { renderIllustration } = await import("@/lib/ai/illustration-generator");
  const { buildPortraitPrompt, generatePortrait, generateCharacterSheet } =
    await import("@/lib/ai/character-sheet");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bible = CONFIG.child as any;
  const charDescription = buildCharacterDescription(bible);
  // Productie leest de stijlregel uit de admin-overrides (DB); dit script
  // heeft geen DB, dus geef de live regel mee met --style voor een eerlijke
  // vergelijking. Zonder --style geldt de in-code default.
  const styleOverride = arg("style");
  const style = buildIllustrationStyle(
    bible,
    styleOverride ? { "illustration.style": styleOverride } : undefined,
  );
  const prompts = CONFIG.scenes.map(
    (s) => `${charDescription}, ${s}. Soft watercolor, children's picture book style`,
  );

  await mkdir(outDir, { recursive: true });

  // 1. Portret zoals de wizard het maakt (preview/route.ts)
  console.log("⏳ Portret maken (productiepad: flux-2-pro)...");
  const portraitPrompt = buildPortraitPrompt(charDescription, style);
  const portraitUrl = await generatePortrait(portraitPrompt, 424242);
  if (!portraitUrl) throw new Error("Portret mislukt");
  await download(portraitUrl, path.join(outDir, "00-portret.jpg"));
  console.log("✓ Portret klaar");

  // Karakterblad zoals de goedkeurstap het maakt (--no-sheet = alleen portret)
  const refs = [portraitUrl];
  if (!process.argv.includes("--no-sheet")) {
    console.log("⏳ Karakterblad maken (close-up + driekwart)...");
    const sheet = await generateCharacterSheet(portraitUrl, style);
    if (!sheet) throw new Error("Karakterblad mislukt");
    await download(sheet.faceUrl, path.join(outDir, "00-ref-face.jpg"));
    await download(sheet.bodyUrl, path.join(outDir, "00-ref-body.jpg"));
    refs.push(sheet.faceUrl, sheet.bodyUrl);
    console.log("✓ Karakterblad klaar");
  }

  // 2. Per engine dezelfde scènes met dezelfde seed
  const results: Record<string, { files: (string | null)[]; ms: number }> = {};
  for (const engine of engines) {
    console.log(`⏳ ${ENGINE_LABEL[engine]}...`);
    await mkdir(path.join(outDir, engine), { recursive: true });
    const opts =
      engine === "flux1" ? {} : { reference: { urls: refs, engine } };
    const t0 = Date.now();
    const urls = await Promise.all(
      prompts.map((p) => renderIllustration(p, style, seed, opts)),
    );
    const ms = Date.now() - t0;
    const files: (string | null)[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const rel = `${engine}/${String(i + 1).padStart(2, "0")}.jpg`;
      if (url) await download(url, path.join(outDir, rel));
      files.push(url ? rel : null);
    }
    results[engine] = { files, ms };
    console.log(
      `✓ ${urls.filter(Boolean).length}/${urls.length} gelukt in ${(ms / 1000).toFixed(1)}s`,
    );
  }

  // 3. Contactvel
  const header = engines
    .map(
      (e) =>
        `<th>${esc(ENGINE_LABEL[e])}<br><small>${(results[e].ms / 1000).toFixed(0)}s voor 5 beelden</small></th>`,
    )
    .join("");
  const rows = CONFIG.scenes
    .map((scene, i) => {
      const cells = engines
        .map((e) => {
          const f = results[e].files[i];
          return `<td>${f ? `<img src="${f}" loading="lazy">` : '<div class="miss">mislukt / geblokkeerd</div>'}</td>`;
        })
        .join("");
      return `<tr><th class="scene">${i + 1}<br><small>${esc(scene)}</small></th>${cells}</tr>`;
    })
    .join("\n");
  const refsHtml =
    refs.length > 1
      ? '<img class="portret" src="00-portret.jpg"> <img class="portret" src="00-ref-face.jpg"> <img class="portret" src="00-ref-body.jpg">'
      : '<img class="portret" src="00-portret.jpg">';
  const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8">
<title>Illustratie-engines vergeleken · seed ${seed}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:24px;background:#faf7f2;color:#222}
  h1{font-size:20px} p{max-width:900px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ddd;padding:8px;vertical-align:top;text-align:left}
  th{background:#f1ece3;font-weight:600}
  th.scene{width:160px;font-weight:700} small{font-weight:400;color:#555}
  img{width:100%;height:auto;display:block;border-radius:6px}
  .portret{width:220px;border-radius:8px;border:3px solid #e9c46a}
  .miss{padding:40px 8px;text-align:center;color:#a33;background:#fbeaea;border-radius:6px}
</style></head><body>
<h1>Illustratie-engines vergeleken</h1>
<p>Zelfde kind, zelfde vijf scènes, zelfde seed (${seed}). De engines met "portret als referentie"
kregen het onderstaande portret mee in elke pagina-call; het huidige pad kreeg alleen de tekstbeschrijving.</p>
<p>${refsHtml}<br><small>Referenties zoals productie ze maakt: flux-2-pro-portret${refs.length > 1 ? " + karakterblad (close-up, driekwart)" : ""}</small></p>
<table><thead><tr><th>Scène</th>${header}</tr></thead><tbody>
${rows}
</tbody></table>
</body></html>`;
  await writeFile(path.join(outDir, "index.html"), html, "utf8");
  await writeFile(
    path.join(outDir, "run.json"),
    JSON.stringify({ seed, engines, style, portraitPrompt, refs, prompts, results }, null, 2),
    "utf8",
  );
  console.log(`✓ Klaar: ${path.join(outDir, "index.html")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
