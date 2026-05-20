import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

/**
 * Centrale plek voor request-body validatie. Doel is bescheiden:
 * misvormde input vroeg afvangen zodat downstream-code (DB-queries,
 * AI-calls, prijscalculaties) op vertrouwde shapes kan rekenen.
 *
 * Conventie:
 *   - Schemas zijn `safe` (geen throws naar buiten); roep ze met
 *     `parseJsonBody(req, schema)` aan en de helper geeft of de data
 *     of een NextResponse-error terug.
 *   - Lengtes zijn ruim — het is geen UX-validatie, alleen sanity.
 *     Diepere business-rules horen in de route zelf.
 *   - Sanitatie van AI-input gebeurt nog steeds in lib/ai/sanitize.ts;
 *     hier knippen we alleen tot een redelijk maximum.
 */

// ── Generieke helpers ───────────────────────────────────────────────

const uuid = z.string().uuid("ongeldig id");
const shortText = z.string().trim().min(1).max(120);
const mediumText = z.string().trim().min(1).max(500);
const longText = z.string().trim().min(1).max(5000);

/**
 * Parse de JSON-body van een request en valideer met het schema.
 * Retourneer een tuple: data of een 400-Response. Caller doet:
 *
 *   const parsed = await parseJsonBody(request, mySchema);
 *   if (parsed instanceof NextResponse) return parsed;
 *   const data = parsed;
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T | NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Body kon niet als JSON worden gelezen." },
      { status: 400 },
    );
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    // Geef de eerste 3 issues mee zodat de client weet welk veld stuk is,
    // zonder de hele Prisma-shape te lekken.
    return NextResponse.json(
      {
        error: "invalid_body",
        issues: result.error.issues.slice(0, 3).map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  return result.data;
}

// ── Concrete schemas ────────────────────────────────────────────────

/**
 * PATCH /api/children/[childId] — alle velden optioneel zodat partial
 * updates werken. dateOfBirth komt binnen als ISO-string en wordt hier
 * gevalideerd als parsebare datum.
 */
const isoDate = z
  .string()
  .refine((s) => !isNaN(new Date(s).getTime()), "ongeldige datum");

// Optionele tekstvelden mogen leeg zijn — de edit-form stuurt altijd
// alle velden mee, ook als de gebruiker uiterlijk/personage nog niet
// heeft ingevuld. Zonder dit blokkeerde min(1) elke PATCH.
const shortTextLoose = z.string().trim().max(120);
const mediumTextLoose = z.string().trim().max(500);

export const childProfileUpdateSchema = z
  .object({
    name: shortText.optional(),
    dateOfBirth: isoDate.optional(),
    gender: shortTextLoose.optional(),
    interests: z.array(shortText).max(20).optional(),
    pets: z.unknown().optional(), // JSON-blob; downstream code accepts shape
    friends: z.unknown().optional(),
    favoriteThings: z.unknown().optional(),
    fears: z.array(shortText).max(20).optional(),
    mainCharacterType: shortTextLoose.optional(),
    mainCharacterDescription: mediumTextLoose.optional(),
    hairColor: shortTextLoose.optional(),
    hairStyle: shortTextLoose.optional(),
    eyeColor: shortTextLoose.optional(),
    skinColor: shortTextLoose.optional(),
    wearsGlasses: z.boolean().optional(),
    hasFreckles: z.boolean().optional(),
  })
  .strict();
export type ChildProfileUpdateInput = z.infer<typeof childProfileUpdateSchema>;

/** POST /api/stories — childId + characterBible + storyRequest. */
export const createStorySchema = z
  .object({
    childId: uuid,
    characterBible: z
      .object({
        childName: shortText,
        dateOfBirth: z.string(),
        gender: shortText,
        interests: z.array(shortText).max(20),
        mainCharacterType: shortText,
      })
      .passthrough(), // accepteer ook overige velden zonder strict te zijn
    storyRequest: z
      .object({
        setting: shortText,
        adventureType: shortText,
        mood: shortText,
        occasion: shortText.optional(),
        companion: shortText.optional(),
        specialDetail: mediumText.optional(),
        regenerationFeedback: longText.optional(),
      })
      .passthrough(),
  })
  .strict();
export type CreateStoryInput = z.infer<typeof createStorySchema>;

/** POST /api/stories/[storyId]/regenerate — alleen optionele feedback. */
export const regenerateStorySchema = z
  .object({
    feedback: longText.optional(),
  })
  .strict();
export type RegenerateStoryInput = z.infer<typeof regenerateStorySchema>;

/** PATCH /api/stories/[storyId] — favorite-toggle of feedback-update. */
export const updateStorySchema = z
  .object({
    title: shortText.optional(),
    isFavorite: z.boolean().optional(),
    feedbackKind: z.enum(["up", "down"]).nullable().optional(),
    feedbackNote: z.string().max(1000).nullable().optional(),
  })
  .strict();
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
