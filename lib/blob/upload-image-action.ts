"use server";

import { requireRole } from "@/lib/auth/require-role";

import { uploadImageSchema, type UploadImageErrorCode } from "./upload-image-schema";
import { InvalidImageError, uploadImageToBlob } from "./upload-image";

export type UploadImageResult =
  | { ok: true; url: string; credit: string | null }
  | { ok: false; error: UploadImageErrorCode; message: string };

const MESSAGES: Record<UploadImageErrorCode, string> = {
  FILE_REQUIRED: "Selecciona una imagen",
  FILE_EMPTY: "El archivo está vacío",
  FILE_TOO_LARGE: "La imagen supera los 4 MB",
  INVALID_TYPE: "Usa una imagen JPG, PNG o WebP",
  CREDIT_INVALID: "El crédito no puede superar 200 caracteres",
  UPLOAD_FAILED: "No pudimos subir la imagen. Inténtalo de nuevo",
};

const fail = (error: UploadImageErrorCode): UploadImageResult => ({
  ok: false,
  error,
  message: MESSAGES[error],
});

// AuthError (sin sesión / rol insuficiente) es lo único que sube; el resto se devuelve como resultado.
export async function uploadImage(formData: FormData): Promise<UploadImageResult> {
  await requireRole("organizer");

  const parsed = uploadImageSchema.safeParse({
    file: formData.get("file"),
    credit: formData.get("credit"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message as UploadImageErrorCode);

  try {
    const { url } = await uploadImageToBlob(parsed.data.file);
    return { ok: true, url, credit: parsed.data.credit };
  } catch (error) {
    if (error instanceof InvalidImageError) return fail("INVALID_TYPE");
    // Sin detalles del error, nombre de archivo ni token en logs.
    console.error("uploadImage: fallo al subir a Blob");
    return fail("UPLOAD_FAILED");
  }
}
