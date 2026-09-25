/**
 * Blinde leestest: welk tekstmodel schrijft de mooiste verhalen?
 *
 * Drie verhaalopdrachten voor hetzelfde (fictieve) kind, elk geschreven door
 * elk model via exact dezelfde generateStory() als productie. Per opdracht
 * staan de verhalen in willekeurige volgorde als A/B/C; welk model wat
 * schreef staat alleen in sleutel.html. Eerst lezen, dan pas de sleutel.
 *
 * Database-vrij: gebruikt de standaard promptteksten uit de code, niet de
 * overrides uit /admin/ai-prompts.
 *
 * Gebruik:
 *   npx tsx scripts/compare-story-models.ts --out <map>
 *       [--models claude-sonnet-5,claude-opus-5,claude-fable-5-1]
 *
 * Kosten: enkele tientallen centen voor 9 verhalen (staat in sleutel.html).
 */
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env" });

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
  fears: [],
  mainCharacterType: "self",
};

const BRIEFS = [
  {
    label: "Spannend ontdekkingsverhaal",
    request: {
      setting: "dinosaur_land",
      adventureType: "discovery",
      mood: "exciting",
      specialDetail:
        "Willem vond vandaag een glimmende steen in de zandbak en stopte hem trots in zijn broekzak.",
      length: "kort",
    },
  },
  {
    label: "Slaapverhaal",
    request: {
      setting: "magical_garden",
      adventureType: "friendship",
      mood: "bedtime",
      specialDetail:
        "Willem heeft vandaag voor het eerst zonder zijwieltjes gefietst en viel één keer, maar stond meteen weer op.",
      length: "lang",
    },
  },
  {
    label: "Grappig verjaardagsverhaal",
    request: {
      setting: "space_adventure",
      adventureType: "rescue",
      mood: "funny",
      occasion: "birthday",
      specialDetail:
        "Willem wordt morgen vijf en wil heel graag een taart in de vorm van een raket.",
      length: "kort",
    },
  },
];

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Result = {
  model: string;
  title?: string;
  pages?: string[];
  endingText?: string;
  endingSign?: string;
  words?: number;
  cents?: number;
  seconds: number;
  error?: string;
};

async function main() {
  const outDir = arg("out");
  if (!outDir) throw new Error("--out <map> is verplicht");
  const models = arg("models", "claude-sonnet-5,claude-opus-5,claude-fable-5-1")!.split(",");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY ontbreekt");

  const { generateStory } = await import("@/lib/ai/story-generator");
  const { AI_PROMPT_SNIPPETS } = await import("@/lib/ai/prompts/store");
  const { claudeCentsPerToken } = await import("@/lib/ai/pricing");
  const snippets = Object.fromEntries(AI_PROMPT_SNIPPETS.map((s) => [s.code, s.default]));

  await mkdir(outDir, { recursive: true });
  const letters = ["A", "B", "C", "D", "E"];
  let storiesHtml = "";
  let keyHtml = "";
  let totalCents = 0;

  for (const [bi, brief] of BRIEFS.entries()) {
    console.log(`⏳ Opdracht ${bi + 1}: ${brief.label} (${models.length} modellen parallel)...`);
    const results: Result[] = await Promise.all(
      models.map(async (model): Promise<Result> => {
        const t0 = Date.now();
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const story = await generateStory(CHILD as any, brief.request as any, { model, snippets });
          const pages = story.pages.map((p) => p.text);
          const rate = claudeCentsPerToken(model);
          const cents = story.textUsage
            ? story.textUsage.inputTokens * rate.input + story.textUsage.outputTokens * rate.output
            : 0;
          return {
            model,
            title: story.title,
            pages,
            endingText: story.endingText,
            endingSign: story.endingSign,
            words: [...pages, story.endingText].join(" ").split(/\s+/).filter(Boolean).length,
            cents,
            seconds: (Date.now() - t0) / 1000,
          };
        } catch (err) {
          return { model, seconds: (Date.now() - t0) / 1000, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    );
    const order = shuffle(results);
    storiesHtml += `<h2>Opdracht ${bi + 1}: ${esc(brief.label)}</h2><p class="brief">${esc(brief.request.specialDetail)}</p><div class="grid">`;
    keyHtml += `<h3>Opdracht ${bi + 1}: ${esc(brief.label)}</h3><ul>`;
    order.forEach((r, i) => {
      const letter = letters[i];
      totalCents += r.cents ?? 0;
      storiesHtml += r.error
        ? `<article><h3>Verhaal ${letter}</h3><p class="err">Mislukt: ${esc(r.error)}</p></article>`
        : `<article><h3>Verhaal ${letter}</h3><h4>${esc(r.title!)}</h4>${r
            .pages!.map((p) => `<p>${esc(p)}</p>`)
            .join("")}<p class="end">${esc(r.endingText ?? "")}</p><p class="sign">${esc(r.endingSign ?? "")}</p></article>`;
      keyHtml += `<li><b>Verhaal ${letter}</b> = ${esc(r.model)}${r.error ? " (mislukt)" : ` · ${r.words} woorden · ${r.seconds.toFixed(0)}s · ${(r.cents ?? 0).toFixed(1)} eurocent`}</li>`;
      console.log(`   ${letter} ${r.model}: ${r.error ? "FOUT " + r.error : `${r.words} woorden, ${r.seconds.toFixed(0)}s`}`);
    });
    storiesHtml += "</div>";
    keyHtml += "</ul>";
  }

  const style = `<style>
  body{font-family:Georgia,serif;margin:24px auto;max-width:1400px;padding:0 16px;background:#faf7f2;color:#222;line-height:1.55}
  h1{font-family:system-ui,sans-serif;font-size:22px} h2{font-family:system-ui,sans-serif;margin-top:40px;border-bottom:2px solid #e9c46a;padding-bottom:4px}
  .brief{font-style:italic;color:#555}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
  article{background:#fff;border:1px solid #e5ddd0;border-radius:8px;padding:16px}
  article h3{font-family:system-ui,sans-serif;margin:0;color:#e8734a} article h4{margin:6px 0 12px;font-size:18px}
  .end{border-top:1px dashed #ccc;padding-top:10px;font-style:italic} .sign{text-align:right;color:#777}
  .err{color:#a33}
</style>`;
  await writeFile(
    path.join(outDir, "index.html"),
    `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Blinde leestest verhalen</title>${style}</head><body>
<h1>Blinde leestest: drie opdrachten, drie schrijvers</h1>
<p>Lees per opdracht verhaal A, B en C en kies je favoriet. Welk model wat schreef staat in <code>sleutel.html</code>; open die pas als je je keuze hebt gemaakt.</p>
${storiesHtml}</body></html>`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "sleutel.html"),
    `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Sleutel leestest</title>${style}</head><body>
<h1>Sleutel</h1>${keyHtml}<p>Totale tekstkosten van deze test: ${(totalCents / 100).toFixed(2)} euro.</p></body></html>`,
    "utf8",
  );
  console.log(`✓ Klaar: ${path.join(outDir, "index.html")} (sleutel apart), kosten ≈ €${(totalCents / 100).toFixed(2)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
