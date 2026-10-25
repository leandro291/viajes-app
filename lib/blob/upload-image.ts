import { put } from "@vercel/blob";

export class InvalidImageError extends Error {}

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

type DetectedType = keyof typeof EXTENSIONS;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, i) => bytes[offset + i] === byte);

function sniffImageType(bytes: Uint8Array): DetectedType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

// ponytail: sin limpieza de blobs huérfanos. Si el formulario no guarda la URL (cierra la pestaña, falla el
// guardado, reemplaza la foto), el archivo queda en el store. Límite aceptado en v1; mejora futura: borrar con
// `del()` al reemplazar/borrar la fila y un job que compare el store (`list()`) contra las columnas *_url.
export async function uploadImageToBlob(file: File): Promise<{ url: string }> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const contentType = sniffImageType(head);
  if (!contentType) throw new InvalidImageError();

  const blob = await put(`images/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType,
  });
  return { url: blob.url };
}
