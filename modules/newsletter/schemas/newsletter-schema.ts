import { z } from "zod";

const EMAIL_REQUIRED = "Ingresa tu correo";
const EMAIL_INVALID = "Ingresa un correo válido";

// Normaliza (trim + minúsculas) en el borde, antes de validar (D12).
export const subscribeSchema = z.object({
  email: z
    .string({ error: EMAIL_REQUIRED })
    .trim()
    .toLowerCase()
    .min(1, EMAIL_REQUIRED)
    .max(254, EMAIL_INVALID)
    .pipe(z.email(EMAIL_INVALID)),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
