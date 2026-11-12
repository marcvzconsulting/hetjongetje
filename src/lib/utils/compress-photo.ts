/**
 * Client-side verkleining van foto's vóór upload.
 *
 * Waarom: Vercel weigert request bodies groter dan ~4,5 MB (413 voordat
 * onze route draait), en Claude Vision weigert afbeeldingen > 5 MB. Een
 * iPhone-foto is al snel 2-5 MB, dus 5 foto's in één FormData haalt die
 * grens niet. We schalen elke foto in de browser naar JPEG en houden het
 * totaal onder een budget. Bijvangst: HEIC (iPhone) wordt door Safari
 * gedecodeerd en komt er als JPEG uit, en EXIF-rotatie wordt toegepast.
 *
 * FLUX LoRA-training werkt intern op ~512-1024 px, dus 1024-1536 px is
 * ruim voldoende kwaliteit.
 */

/** Veilig onder de 4,5 MB-limiet van Vercel, met ruimte voor multipart-overhead. */
export const UPLOAD_BUDGET_BYTES = 3.8 * 1024 * 1024;

const STEPS: { maxSide: number; quality: number }[] = [
  { maxSide: 1536, quality: 0.85 },
  { maxSide: 1280, quality: 0.82 },
  { maxSide: 1024, quality: 0.8 },
  { maxSide: 896, quality: 0.75 },
  { maxSide: 768, quality: 0.7 },
];

export class PhotoDecodeError extends Error {
  constructor(public fileName: string) {
    super(`Kan foto ${fileName} niet openen`);
    this.name = "PhotoDecodeError";
  }
}

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

async function decode(file: File): Promise<Decoded> {
  // createImageBitmap past EXIF-oriëntatie toe in moderne browsers.
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* val terug op <img>: oudere Safari kan sommige formaten alleen zo */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new PhotoDecodeError(file.name);
  }
}

function encode(d: Decoded, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(d.width, d.height));
  const w = Math.max(1, Math.round(d.width * scale));
  const h = Math.max(1, Math.round(d.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas niet beschikbaar"));
  // Witte achtergrond voor PNG's met transparantie (JPEG kent geen alpha).
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(d.source, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Foto comprimeren mislukt"))),
      "image/jpeg",
      quality
    )
  );
}

/**
 * Verklein alle foto's zodat het totaal onder `budgetBytes` blijft.
 * Gooit PhotoDecodeError als een foto niet te openen is.
 */
export async function compressPhotosForUpload(
  files: File[],
  budgetBytes = UPLOAD_BUDGET_BYTES
): Promise<File[]> {
  const perFile = Math.floor(budgetBytes / Math.max(1, files.length));
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const d = await decode(f);
    try {
      let blob: Blob | null = null;
      for (const step of STEPS) {
        blob = await encode(d, step.maxSide, step.quality);
        if (blob.size <= perFile) break;
      }
      out.push(
        new File([blob!], `photo-${String(i + 1).padStart(2, "0")}.jpg`, {
          type: "image/jpeg",
        })
      );
    } finally {
      d.close();
    }
  }
  return out;
}
