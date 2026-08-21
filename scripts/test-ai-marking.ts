/**
 * Test voor src/lib/ai/ai-marking.ts: markeer mini-fixtures (1×1 JPEG,
 * 1×1 PNG, kale mp3-frames) en valideer daarna de bestandsstructuur
 * byte-voor-byte (JPEG-segmentwalk, PNG-chunkwalk mét CRC-controle,
 * ID3-header-parse). Draait zonder netwerk of credentials:
 *
 *   npx tsx scripts/test-ai-marking.ts
 *
 * Optioneel: een URL als argument om een écht bestand uit de bucket te
 * checken (alleen lezen + valideren, er wordt niets geüpload):
 *
 *   npx tsx scripts/test-ai-marking.ts https://ons-verhaaltje-prod.s3.nl-ams.scw.cloud/stories/<id>/page-1.jpg
 */

import {
  markImageAsAiGenerated,
  markAudioAsAiGenerated,
} from "../src/lib/ai/ai-marking";

let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ── Fixtures ───────────────────────────────────────────────────

const JPEG_1PX = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// Twee kale MPEG-frames (geen ID3), zoals ElevenLabs ze levert.
const MP3_BARE = Buffer.concat([
  Buffer.from([0xff, 0xfb, 0x90, 0x64]),
  Buffer.alloc(413, 0xaa),
  Buffer.from([0xff, 0xfb, 0x90, 0x64]),
  Buffer.alloc(413, 0xbb),
]);

// ── Validators ─────────────────────────────────────────────────

/** Walk alle JPEG-segmenten; retourneert de gevonden APP1-XMP-payloads. */
function walkJpeg(buf: Buffer): { xmpPayloads: string[] } {
  if (buf.readUInt16BE(0) !== 0xffd8) throw new Error("geen SOI");
  const xmpPayloads: string[] = [];
  let pos = 2;
  while (pos < buf.length) {
    if (buf[pos] !== 0xff) throw new Error(`marker verwacht op ${pos}`);
    const marker = buf[pos + 1];
    if (marker === 0xd9) return { xmpPayloads }; // EOI
    if (marker === 0xda) {
      // SOS: entropy-coded data tot EOI — scan naar het einde.
      if (buf.readUInt16BE(buf.length - 2) !== 0xffd9)
        throw new Error("geen EOI aan bestandseind");
      return { xmpPayloads };
    }
    const segLen = buf.readUInt16BE(pos + 2);
    if (segLen < 2 || pos + 2 + segLen > buf.length)
      throw new Error(`kapotte segmentlengte op ${pos}`);
    if (marker === 0xe1) {
      const payload = buf.subarray(pos + 4, pos + 2 + segLen);
      if (payload.toString("latin1").startsWith("http://ns.adobe.com/xap/1.0/")) {
        xmpPayloads.push(payload.toString("utf8"));
      }
    }
    pos += 2 + segLen;
  }
  throw new Error("bestand eindigt zonder EOI");
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Walk alle PNG-chunks met CRC-check; retourneert de chunk-types. */
function walkPng(buf: Buffer): { types: string[]; xmpTexts: string[] } {
  const types: string[] = [];
  const xmpTexts: string[] = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const typeAndData = buf.subarray(pos + 4, pos + 8 + len);
    const crc = buf.readUInt32BE(pos + 8 + len);
    if (crc !== crc32(typeAndData))
      throw new Error(`CRC-fout in chunk ${type}`);
    types.push(type);
    if (type === "iTXt") {
      const data = buf.subarray(pos + 8, pos + 8 + len);
      const kwEnd = data.indexOf(0);
      if (data.toString("latin1", 0, kwEnd) === "XML:com.adobe.xmp") {
        // keyword \0 flag byte method byte taal \0 vertaald \0 tekst
        xmpTexts.push(data.subarray(kwEnd + 5).toString("utf8"));
      }
    }
    pos += 12 + len;
    if (type === "IEND") break;
  }
  return { types, xmpTexts };
}

// ── Tests ──────────────────────────────────────────────────────

console.log("JPEG:");
{
  const marked = markImageAsAiGenerated(JPEG_1PX);
  check("buffer is gewijzigd", marked.length > JPEG_1PX.length);
  const { xmpPayloads } = walkJpeg(marked);
  check("segmentstructuur intact + XMP-APP1 aanwezig", xmpPayloads.length === 1);
  check(
    "DigitalSourceType=trainedAlgorithmicMedia in XMP",
    xmpPayloads[0]?.includes("trainedAlgorithmicMedia") ?? false,
  );
  check(
    "JFIF-APP0 blijft vóór onze APP1",
    marked.readUInt16BE(2) === 0xffe0,
  );
  check("idempotent (2e keer geen wijziging)", markImageAsAiGenerated(marked) === marked);
}

console.log("PNG:");
{
  const marked = markImageAsAiGenerated(PNG_1PX);
  check("buffer is gewijzigd", marked.length > PNG_1PX.length);
  const { types, xmpTexts } = walkPng(marked);
  check(
    "chunkstructuur + CRC's intact, iTXt direct na IHDR",
    types[0] === "IHDR" && types[1] === "iTXt" && types.at(-1) === "IEND",
    types.join(","),
  );
  check(
    "DigitalSourceType in XMP-iTXt",
    xmpTexts[0]?.includes("trainedAlgorithmicMedia") ?? false,
  );
  check("idempotent", markImageAsAiGenerated(marked) === marked);
}

console.log("MP3:");
{
  const marked = markAudioAsAiGenerated(MP3_BARE);
  check("begint met ID3v2.3-header", marked.toString("latin1", 0, 5) === "ID3\x03\0");
  const tagSize =
    (marked[6] << 21) | (marked[7] << 14) | (marked[8] << 7) | marked[9];
  check(
    "originele MPEG-frames volgen exact na de tag",
    marked.subarray(10 + tagSize).equals(MP3_BARE),
  );
  const tagBody = marked.subarray(10, 10 + tagSize).toString("latin1");
  check("DigitalSourceType-frame aanwezig", tagBody.includes("trainedAlgorithmicMedia"));
  check("COMM-vermelding aanwezig", tagBody.includes("AI-gegenereerde voorleesaudio"));
  check("idempotent", markAudioAsAiGenerated(marked) === marked);

  // Bestand dat al een (vreemde, lege) ID3v2.4-tag heeft: onze tag komt
  // ervóór, de originele bytes blijven intact erachter.
  const foreignTag = Buffer.concat([
    Buffer.from("ID3\x04\0\0", "latin1"),
    Buffer.from([0, 0, 0, 10]),
    Buffer.alloc(10, 0),
  ]);
  const withForeign = Buffer.concat([foreignTag, MP3_BARE]);
  const remarked = markAudioAsAiGenerated(withForeign);
  check(
    "bestaande ID3-tag: onze tag ervóór, origineel intact",
    remarked.toString("latin1", 0, 5) === "ID3\x03\0" &&
      remarked.subarray(remarked.length - withForeign.length).equals(withForeign),
  );
  check("bestaande ID3-tag: idempotent", markAudioAsAiGenerated(remarked) === remarked);
}

console.log("Randgevallen:");
{
  const garbage = Buffer.from("dit is geen afbeelding", "utf8");
  check("onbekend formaat gaat ongewijzigd terug", markImageAsAiGenerated(garbage) === garbage);
  const empty = Buffer.alloc(0);
  check("lege buffer crasht niet", markImageAsAiGenerated(empty) === empty);
}

// ── Optioneel: echt bestand uit de bucket ──────────────────────

async function checkRemote(url: string) {
  console.log(`Extern bestand: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch mislukt: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (url.endsWith(".mp3")) {
    const marked = markAudioAsAiGenerated(buf);
    check("gemarkeerd of al gemarkeerd", marked !== buf || buf.toString("latin1", 0, 3) === "ID3");
  } else {
    const marked = markImageAsAiGenerated(buf);
    if (marked === buf) {
      check("al gemarkeerd (idempotent)", buf.includes("trainedAlgorithmicMedia"));
    } else {
      const result = buf[0] === 0xff ? walkJpeg(marked).xmpPayloads : walkPng(marked).xmpTexts;
      check("structuur intact + XMP aanwezig na markering", result.length === 1);
    }
  }
}

const remoteUrl = process.argv[2];
(remoteUrl ? checkRemote(remoteUrl) : Promise.resolve()).then(() => {
  if (failures > 0) {
    console.error(`\n${failures} test(s) GEFAALD`);
    process.exit(1);
  }
  console.log("\nAlle tests geslaagd.");
});
