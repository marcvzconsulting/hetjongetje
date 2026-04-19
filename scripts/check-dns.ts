/**
 * Quickly check if the onsverhaaltje.nl DNS records point to Vercel.
 *   npx tsx scripts/check-dns.ts
 *
 * Useful after adding records in TransIP — saves you reloading dnschecker.org.
 */
import { resolve4, resolveCname, resolveMx } from "dns/promises";

const DOMAIN = "onsverhaaltje.nl";

async function main() {
  console.log(`🔍 DNS check voor ${DOMAIN}\n`);

  try {
    const a = await resolve4(DOMAIN);
    console.log(`A records @:        ${a.join(", ")}`);
    if (a.some((ip) => ip.startsWith("76.76."))) {
      console.log(`  ✅ wijst naar Vercel`);
    } else {
      console.log(`  ⚠  wijst niet naar Vercel (verwacht 76.76.x.x)`);
    }
  } catch (err) {
    console.log(`A records @:        ❌ niet gevonden (${(err as Error).message})`);
  }

  try {
    const cname = await resolveCname(`www.${DOMAIN}`);
    console.log(`\nCNAME www:          ${cname.join(", ")}`);
    if (cname.some((c) => c.includes("vercel-dns.com"))) {
      console.log(`  ✅ wijst naar Vercel`);
    } else {
      console.log(`  ⚠  wijst niet naar Vercel`);
    }
  } catch (err) {
    console.log(`\nCNAME www:          ❌ niet gevonden`);
  }

  try {
    const mx = await resolveMx(DOMAIN);
    console.log(`\nMX records (mail):  ${mx.map((m) => m.exchange).join(", ") || "geen"}`);
    console.log(`  ℹ  blijft bij TransIP — admin@onsverhaaltje.nl werkt nog`);
  } catch {
    console.log(`\nMX records (mail):  ❌ niet gevonden — forwarding werkt niet!`);
  }

  console.log(`\n🌐 Test in browser: https://${DOMAIN}`);
}

main().catch(console.error);
