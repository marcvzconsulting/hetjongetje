/**
 * Machineleesbare AI-markering voor gegenereerde content — artikel 50(2)
 * EU AI Act (verordening 2024/1689): output van een AI-systeem dat
 * synthetische content genereert moet "marked in a machine-readable
 * format and detectable as artificially generated" zijn.
 *
 * Aanpak (proportioneel voor onze schaal, conform de IPTC-standaard die
 * ook Google en Meta uitlezen):
 *  - Afbeeldingen (JPEG/PNG): een XMP-metadatapakket met
 *    Iptc4xmpExt:DigitalSourceType = trainedAlgorithmicMedia. Het pakket
 *    wordt ZONDER her-encoding in het bestand geschoven (JPEG: extra
 *    APP1-segment; PNG: extra iTXt-chunk) — de beeldbytes zelf blijven
 *    identiek, dus geen kwaliteitsverlies.
 *  - Audio (MP3): een ID3v2.3-tag vooraan met dezelfde
 *    DigitalSourceType-URI + een COMM-omschrijving. Spelers slaan de tag
 *    over; de audio-timeline (en dus onze woordtimings) verschuift niet.
 *
 * Alle functies zijn idempotent (al gemarkeerde bestanden gaan ongewijzigd
 * terug) en fail-open: bij een onbekend/kapot formaat retourneren we het
 * origineel in plaats van de upload te breken — liever één ongemarkeerd
 * bestand dan een kapotte verhaalgeneratie.
 */

/** IPTC-newscode voor volledig AI-gegenereerde media. */
export const DIGITAL_SOURCE_TYPE_AI =
  "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";

const XMP_NS_HEADER = "http://ns.adobe.com/xap/1.0/\0";

function buildXmpPacket(description: string): string {
  return (
    // De xpacket-header hoort met een BOM (U+FEFF) te beginnen — als
    // escape geschreven zodat editors/shells 'm niet kunnen slopen.
    '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
    '<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Ons Verhaaltje">' +
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
    '<rdf:Description rdf:about=""' +
    ' xmlns:xmp="http://ns.adobe.com/xap/1.0/"' +
    ' xmlns:dc="http://purl.org/dc/elements/1.1/"' +
    ' xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"' +
    ' xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/">' +
    "<xmp:CreatorTool>Ons Verhaaltje (onsverhaaltje.nl)</xmp:CreatorTool>" +
    "<photoshop:Credit>Gemaakt met AI — Ons Verhaaltje</photoshop:Credit>" +
    `<Iptc4xmpExt:DigitalSourceType>${DIGITAL_SOURCE_TYPE_AI}</Iptc4xmpExt:DigitalSourceType>` +
    "<dc:description><rdf:Alt>" +
    `<rdf:li xml:lang="x-default">${description}</rdf:li>` +
    "</rdf:Alt></dc:description>" +
    "</rdf:Description></rdf:RDF></x:xmpmeta>" +
    '<?xpacket end="w"?>'
  );
}

const IMAGE_DESCRIPTION =
  "Deze illustratie is gegenereerd met AI voor een persoonlijk " +
  "kinderverhaal van Ons Verhaaltje.";

/** Al eens gemarkeerd (door ons of upstream)? Dan niets meer doen. */
function alreadyMarked(buffer: Buffer): boolean {
  return buffer.includes("trainedAlgorithmicMedia");
}

// ── JPEG: XMP als APP1-segment ─────────────────────────────────

function markJpeg(buffer: Buffer): Buffer {
  // Invoegpunt: na SOI en eventuele bestaande APP0/APP1-segmenten
  // (JFIF/Exif horen voorop te blijven staan).
  let pos = 2;
  while (
    pos + 4 <= buffer.length &&
    buffer[pos] === 0xff &&
    (buffer[pos + 1] === 0xe0 || buffer[pos + 1] === 0xe1)
  ) {
    const segLen = buffer.readUInt16BE(pos + 2);
    if (segLen < 2 || pos + 2 + segLen > buffer.length) return buffer;
    pos += 2 + segLen;
  }

  const payload = Buffer.concat([
    Buffer.from(XMP_NS_HEADER, "latin1"),
    Buffer.from(buildXmpPacket(IMAGE_DESCRIPTION), "utf8"),
  ]);
  if (payload.length + 2 > 0xffff) return buffer; // past niet in één APP1

  const segment = Buffer.alloc(4 + payload.length);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  segment.writeUInt16BE(payload.length + 2, 2);
  payload.copy(segment, 4);

  return Buffer.concat([
    buffer.subarray(0, pos),
    segment,
    buffer.subarray(pos),
  ]);
}

// ── PNG: XMP als iTXt-chunk ────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function markPng(buffer: Buffer): Buffer {
  // Eerste chunk moet IHDR zijn; daar direct achter invoegen.
  if (buffer.length < 8 + 12) return buffer;
  const ihdrLen = buffer.readUInt32BE(8);
  if (buffer.toString("latin1", 12, 16) !== "IHDR") return buffer;
  const insertAt = 8 + 12 + ihdrLen; // signature + IHDR-chunk (len+type+data+crc)
  if (insertAt > buffer.length) return buffer;

  // iTXt-data: keyword \0 compressieflag(0) compressiemethode(0)
  // taal \0 vertaald-keyword \0 tekst (UTF-8).
  const data = Buffer.concat([
    Buffer.from("XML:com.adobe.xmp\0\0\0\0\0", "latin1"),
    Buffer.from(buildXmpPacket(IMAGE_DESCRIPTION), "utf8"),
  ]);
  const typeAndData = Buffer.concat([Buffer.from("iTXt", "latin1"), data]);

  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeAndData.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + data.length);

  return Buffer.concat([
    buffer.subarray(0, insertAt),
    chunk,
    buffer.subarray(insertAt),
  ]);
}

/**
 * Voeg een machineleesbare AI-markering toe aan een JPEG- of PNG-buffer.
 * Onbekende formaten en al gemarkeerde bestanden komen ongewijzigd terug.
 */
export function markImageAsAiGenerated(buffer: Buffer): Buffer {
  try {
    if (alreadyMarked(buffer)) return buffer;
    if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return markJpeg(buffer);
    }
    if (buffer.length > PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
      return markPng(buffer);
    }
    console.warn("[ai-marking] onbekend beeldformaat — buffer ongemarkeerd gelaten");
    return buffer;
  } catch (err) {
    console.warn("[ai-marking] markeren mislukt — origineel behouden", err);
    return buffer;
  }
}

// ── MP3: ID3v2.3-tag ───────────────────────────────────────────

/** ID3v2.3-frame: 4-byte id, 4-byte lengte (big-endian), 2 nulvlaggen. */
function id3Frame(id: string, payload: Buffer): Buffer {
  const frame = Buffer.alloc(10 + payload.length);
  frame.write(id, 0, "latin1");
  frame.writeUInt32BE(payload.length, 4);
  payload.copy(frame, 10);
  return frame;
}

/** TXXX: encoding(0=latin1) beschrijving \0 waarde. */
function txxxFrame(description: string, value: string): Buffer {
  return id3Frame(
    "TXXX",
    Buffer.from(`\0${description}\0${value}`, "latin1"),
  );
}

/** COMM: encoding(0) taal(3) korte-beschrijving \0 tekst. */
function commFrame(text: string): Buffer {
  return id3Frame("COMM", Buffer.from(`\0nld\0${text}`, "latin1"));
}

function syncsafe(n: number): Buffer {
  return Buffer.from([
    (n >>> 21) & 0x7f,
    (n >>> 14) & 0x7f,
    (n >>> 7) & 0x7f,
    n & 0x7f,
  ]);
}

/**
 * Zet een ID3v2.3-tag met AI-herkomst vóór een mp3-buffer. Sommige
 * ElevenLabs-bestanden hebben al een (lege) ID3v2.4-tag — daar zetten we
 * onze tag gewoon vóór: meerdere v2-tags zijn toegestaan, spelers lezen
 * de eerste en decoders resyncen op de MPEG-framebits.
 */
export function markAudioAsAiGenerated(buffer: Buffer): Buffer {
  try {
    if (alreadyMarked(buffer)) return buffer;
    const frames = Buffer.concat([
      txxxFrame("DigitalSourceType", DIGITAL_SOURCE_TYPE_AI),
      txxxFrame("AI-GENERATED", "true"),
      commFrame(
        "AI-gegenereerde voorleesaudio (tekst-naar-spraak). " +
          "Ons Verhaaltje - onsverhaaltje.nl",
      ),
    ]);
    const header = Buffer.concat([
      Buffer.from("ID3\x03\0\0", "latin1"),
      syncsafe(frames.length),
    ]);
    return Buffer.concat([header, frames, buffer]);
  } catch (err) {
    console.warn("[ai-marking] audio markeren mislukt — origineel behouden", err);
    return buffer;
  }
}
