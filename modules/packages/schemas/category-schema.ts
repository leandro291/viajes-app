import { z } from "zod";

import { hasSlugChars } from "@/lib/slug";

const NAME_MSG = "Ingresa un nombre de 2 a 40 caracteres";
const CHARS_MSG = "El nombre debe incluir al menos una letra o un número";

// Los campos extra (slug, id) se descartan: z.object los ignora.
export const categoryInputSchema = z.object({
  name: z
    .string({ error: NAME_MSG })
    .trim()
    .min(2, NAME_MSG)
    .max(40, NAME_MSG)
    .refine(hasSlugChars, CHARS_MSG),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export const categoryIdSchema = z.uuid();
export type CategoryAdminDto = { id: string; slug: string; name: string; packageCount: number };
