import { z } from "zod";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_CREDIT_LENGTH = 200;

export type UploadImageErrorCode =
  | "FILE_REQUIRED"
  | "FILE_EMPTY"
  | "FILE_TOO_LARGE"
  | "INVALID_TYPE"
  | "CREDIT_INVALID"
  | "UPLOAD_FAILED";

// El mensaje de cada issue es el propio código: el consumidor lee issues[0].message.
export const uploadImageSchema = z.object({
  file: z
    .instanceof(File, { error: "FILE_REQUIRED" })
    .refine((f) => f.size > 0, { error: "FILE_EMPTY" })
    .refine((f) => f.size <= MAX_IMAGE_BYTES, { error: "FILE_TOO_LARGE" })
    .refine((f) => (ALLOWED_IMAGE_TYPES as readonly string[]).includes(f.type), {
      error: "INVALID_TYPE",
    }),
  credit: z
    .string({ error: "CREDIT_INVALID" })
    .trim()
    .max(MAX_CREDIT_LENGTH, { error: "CREDIT_INVALID" })
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .transform((v) => v ?? null),
});

export type UploadImageInput = z.infer<typeof uploadImageSchema>;
