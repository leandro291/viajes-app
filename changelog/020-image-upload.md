# 020 — image-upload

- Fecha: 2026-10-25
- Spec: `docs/specs/shared/image-upload.md`
- PR: `docs/prs/020-image-upload.md`

## Resumen
Server Action `uploadImage(formData)` que sube una imagen a Vercel Blob y devuelve `{ ok, url, credit }`, sin escribir en la base. Valida el rol, el tamaño (hasta 4 MiB), el tipo real por los primeros bytes (JPEG, PNG, WebP) y el crédito opcional. La reusarán 021 (paquetes) y 028 (destinos).

## Cambios
- `lib/blob/upload-image-schema.ts` (+ test) — constantes, schema Zod y códigos de error.
- `lib/blob/upload-image.ts` (+ test) — servicio: detecta el tipo por bytes y llama a `put` con `images/<uuid>.<ext>`, acceso público.
- `lib/blob/upload-image-action.ts` (+ test) — Server Action con `requireRole("organizer")`, resultado tipado y mensajes en español.
- `next.config.ts` — `images.remotePatterns` para el host público de Blob y `experimental.serverActions.bodySizeLimit: "4.5mb"`.
- `package.json`, `package-lock.json` — dependencia `@vercel/blob`.
- `.env.example` — variable `BLOB_READ_WRITE_TOKEN`.
- `docs/specs/shared/image-upload.md` — spec aprobada.

## Pendiente
- La Server Action `uploadImage` no se llamó de punta a punta con sesión de Clerk: la subida real (AC11) se probó sobre el servicio, no sobre la action.
- `next/image` mostrando una URL real de Blob (AC9 manual): se prueba cuando 021 muestre fotos.
- Sin limpieza de blobs huérfanos si el formulario no guarda la URL (comentario `ponytail:` en el servicio).
- Tope de 4 MiB por el límite de 4,5 MB de Vercel; más tamaño pide client upload.
- `remotePatterns` acepta cualquier store público de Blob (`*.public.blob.vercel-storage.com`); se puede fijar al id del store.
- `docs/ARCHITECTURE.md` §5 no lista `lib/blob` entre los lugares que instancian servicios externos.
