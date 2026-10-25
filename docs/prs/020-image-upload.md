# 020 — image-upload

- Spec: `docs/specs/shared/image-upload.md`
- Rama: `020-image-upload`

## Qué se hizo
Server Action `uploadImage` que sube una imagen a Vercel Blob y devuelve `{ ok, url, credit }`. No escribe en la base: cada formulario (021, 028) guarda la URL en su propia fila.

## Cambios
- `lib/blob/`: `upload-image-schema`, `upload-image`, `upload-image-action`, cada uno con su test
- `next.config.ts`: `remotePatterns` de Blob y `bodySizeLimit` de 4,5 MB
- `package.json`, `package-lock.json`: `@vercel/blob`
- `.env.example`: `BLOB_READ_WRITE_TOKEN`
- `docs/specs/shared/image-upload.md`, `changelog/020-image-upload.md`, `docs/prs/020-image-upload.md`

## Criterios de aceptación
- [x] AC1: `requireRole("organizer")` va primero; `AuthError` es lo único que la action lanza
- [x] AC2: éxito devuelve `{ ok: true, url, credit }` y no usa `lib/db`
- [x] AC3: `put` con `access: "public"`, `addRandomSuffix: false` y `images/<uuid>.<ext>`
- [x] AC4: errores de archivo ausente, vacío o de más de 4 MiB
- [x] AC5: solo JPEG, PNG y WebP, validado por `file.type` y por los primeros bytes
- [x] AC6: crédito recortado, máximo 200 caracteres, vacío pasa a `null`
- [x] AC7: si `put` falla devuelve `UPLOAD_FAILED` sin relanzar y sin datos en el log
- [x] AC8: todo error trae código estable y mensaje en español
- [x] AC9 (config): `next.config.ts` con `remotePatterns` y `bodySizeLimit`
- [x] AC10: lint, tsc y tests en verde
- [ ] AC9 (manual): `next/image` con una URL real de Blob: sin probar
- [x] AC11: subida real de un PNG de 1×1 px al store `viajes-app-images`: URL `https://<id>.public.blob.vercel-storage.com/images/<uuid>.png`, 200 `image/png` sin credenciales; el blob se borró después (404)
- [ ] `npm run build`: lo corrió el developer de T1, no se repitió al entregar

## Cómo probar
1. `npm test -- lib/blob` y `npx tsc --noEmit`.
2. Con `BLOB_READ_WRITE_TOKEN` en `.env.local`, llamar a `uploadImageToBlob` con un PNG pequeño y abrir la URL devuelta sin sesión (así se hizo AC11, con un script fuera del repo).

## Notas
- Tope de 4 MiB, no 5: Vercel limita el cuerpo de una Server Action a 4,5 MB (decisión D1 de la spec).
- La action no tiene pantalla ni ruta, así que no hay prueba en navegador.
- Riesgo de merge: `package.json`, `package-lock.json` y `next.config.ts`.

## Revisión
- Reviewer: APPROVED (T1 a T4, sin bloqueantes)
- lint ✓ · tsc ✓ · tests ✓ (200) · Playwright: n.a. (sin UI)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
