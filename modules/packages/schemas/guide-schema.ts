import { z } from "zod";

const NAME_MSG = "Ingresa un nombre de 2 a 80 caracteres";
const PHONE_MSG = "Ingresa un teléfono válido, ej. +51 900 000 000";

export const guideSchema = z.object({
  name: z.string({ error: NAME_MSG }).trim().min(2, NAME_MSG).max(80, NAME_MSG),
  phone: z
    .string({ error: PHONE_MSG })
    .trim()
    .regex(/^\+?[0-9][0-9\s()-]{5,19}$/, PHONE_MSG),
});

export type GuideInput = z.infer<typeof guideSchema>;
export type GuideDto = { id: string; name: string; phone: string };
