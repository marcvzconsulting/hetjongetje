/**
 * Smoke-test a Mollie API key BEFORE rolling it into Vercel.
 *
 * Verifies four things in one go:
 *   1. The key authenticates against Mollie at all (no 401)
 *   2. Whether it's a test_ or live_ key, so you don't ship the wrong one
 *   3. Which payment methods are enabled for one-off charges (credits flow)
 *   4. Which payment methods are enabled for first-of-recurring charges
 *      (abonnement flow) — this is where iDEAL silently disappears if SEPA
 *      Direct Debit isn't activated yet.
 *
 * Usage:
 *   pnpm tsx scripts/verify-mollie.ts                    # uses MOLLIE_API_KEY from .env
 *   pnpm tsx scripts/verify-mollie.ts --key=live_xxx     # test a key inline (not stored)
 *   pnpm tsx scripts/verify-mollie.ts --prod             # uses .env.production.local
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { createMollieClient, SequenceType } from "@mollie/api-client";

const args = process.argv.slice(2);
const inlineKey = args.find((a) => a.startsWith("--key="))?.slice("--key=".length);
const useProd = args.includes("--prod");

if (!inlineKey) {
  if (useProd) {
    const ENV_FILE = ".env.production.local";
    if (!existsSync(resolve(process.cwd(), ENV_FILE))) {
      console.error(`❌ ${ENV_FILE} bestaat niet.`);
      process.exit(1);
    }
    config({ path: ENV_FILE, override: true });
  } else {
    // Next.js convention: .env.local overrides .env. Load both, with
    // .env.local last so its values win.
    config({ path: ".env" });
    if (existsSync(resolve(process.cwd(), ".env.local"))) {
      config({ path: ".env.local", override: true });
    }
  }
}

const apiKey = inlineKey ?? process.env.MOLLIE_API_KEY;
if (!apiKey) {
  console.error("❌ Geen API key gevonden — pass --key=live_xxx of zet MOLLIE_API_KEY in je env.");
  process.exit(1);
}

const isLive = apiKey.startsWith("live_");
const isTest = apiKey.startsWith("test_");
if (!isLive && !isTest) {
  console.error(
    "❌ Key heeft geen test_ of live_ prefix — vrijwel zeker geen Mollie API key.",
  );
  process.exit(1);
}

const client = createMollieClient({ apiKey });

async function listMethods(sequenceType: SequenceType): Promise<string[]> {
  const methods = await client.methods.list({ sequenceType });
  // Mollie SDK returns a paginated List — iterate the page.
  return methods.map((m) => `${m.id} (${m.description})`);
}

async function main() {
  console.log(`📡 Mode: ${isLive ? "🟢 LIVE" : "🟡 TEST"}`);
  console.log(`📡 Key:  ${apiKey!.slice(0, 8)}…${apiKey!.slice(-4)}\n`);

  // 1. Auth-check — listing methods is the cheapest call that proves the
  //    key is valid. A bad key gets a 401 here.
  let oneoff: string[];
  try {
    oneoff = await listMethods(SequenceType.oneoff);
  } catch (err) {
    console.error(
      "❌ API call mislukt — key wordt niet door Mollie geaccepteerd.",
    );
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log("✓ Authenticatie OK.\n");

  // 2. One-off methods (credit-pakketten flow)
  console.log("💳 Eenmalige betalingen (credits-flow):");
  if (oneoff.length === 0) {
    console.log("  ⚠️  Geen methodes geactiveerd!");
  } else {
    oneoff.forEach((m) => console.log(`  · ${m}`));
  }
  console.log();

  // 3. First-of-recurring methods (subscription flow)
  console.log("🔁 Eerste betaling van abonnement (recurring-first):");
  const first = await listMethods(SequenceType.first);
  if (first.length === 0) {
    console.log(
      "  ⚠️  Geen methodes voor recurring — abonnementen werken NIET.",
    );
    console.log(
      "      Activeer SEPA Direct Debit in Mollie dashboard → Profielen.",
    );
  } else {
    first.forEach((m) => console.log(`  · ${m}`));
    const hasIdeal = first.some((m) => m.startsWith("ideal"));
    const hasCreditcard = first.some((m) => m.startsWith("creditcard"));
    console.log();
    if (hasIdeal) {
      console.log("  ✓ iDEAL werkt voor abonnementen (SEPA mandaat geactiveerd).");
    } else if (hasCreditcard) {
      console.log(
        "  ⚠️  Alleen creditcard — iDEAL ontbreekt voor abonnementen.",
      );
      console.log(
        "      Activeer SEPA Direct Debit in Mollie dashboard om iDEAL toe te voegen.",
      );
    }
  }
  console.log();

  // 4. Profile info — only available on live; test mode often returns
  //    a generic placeholder. Best-effort.
  try {
    const profile = await client.profiles.getCurrent();
    console.log("🏷️  Mollie-profiel:");
    console.log(`  Naam:    ${profile.name}`);
    console.log(`  Website: ${profile.website}`);
    console.log(`  E-mail:  ${profile.email}`);
    console.log(`  Status:  ${profile.status}`);
  } catch (err) {
    console.log(
      "  (profiel-info niet beschikbaar — meestal OK voor test-keys)",
    );
    if (process.env.DEBUG) {
      console.log(err instanceof Error ? err.message : err);
    }
  }

  console.log();
  console.log(
    isLive
      ? "🟢 Klaar om live te gaan. Zet MOLLIE_API_KEY in Vercel → Production."
      : "🟡 Test-key — alle betalingen zijn nep. Wissel naar live_ wanneer je klaar bent.",
  );
}

main().catch((err) => {
  console.error("❌ Onverwachte fout:", err);
  process.exit(1);
});
