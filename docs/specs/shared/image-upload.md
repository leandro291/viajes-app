# Subida de imágenes (Vercel Blob)

- Module: shared (`lib/blob`)
- Status: approved
- Approved by: leandro291 (2026-10-25)
- Mode: SDD

## Goal
Server Action `uploadImage` que sube una imagen a Vercel Blob y devuelve `{ url, credit }`, sin escribir en la base. La reusarán los formularios de paquetes (tarjeta 021) y de destinos/categorías (028), que guardan la URL en su propia fila (`package_images.url` + `package_images.credit`, `packages.cover_image_url`, `destinations.hero_image_url`). Trello 020; SYSTEM-DESIGN §Decisiones 2.

## Scope
- In:
  - Dependencia `@vercel/blob`.
  - `next.config.ts`: `images.remotePatterns` para el host público de Blob y `experimental.serverActions.bodySizeLimit` (ver D1).
  - `lib/blob/`: schema Zod (archivo + crédito), servicio puro (sniff de tipo real + `put`), Server Action fina con guard `requireRole("organizer")`.
  - Resultado tipado (`UploadImageResult`) con códigos de error estables para que 021/028 muestren el mensaje.
  - Tests unitarios de schema, servicio y action (con mocks de `@vercel/blob`, `requireRole`).
- Out:
  - Componente de UI / input de archivo / preview (lo hace 021).
  - Escribir en la base (la action no toca Drizzle).
  - Borrar o limpiar blobs huérfanos (YAGNI; ver D5 y Edge cases).
  - Client upload directo a Blob (token por route handler): solo si el usuario rechaza D1.
  - Redimensionar/optimizar/convertir imágenes (lo hace `next/image` al servir).
  - Subir varios archivos por llamada, `alt`, orden (`sort_order`) y cualquier otro campo de `package_images`.
  - Rate limit.
  - Subir archivos que no son imágenes (PDF, video).

## Decisiones a aprobar
- **D1 (necesita confirmación del usuario). Tope de 4 MB, no 5 MB.** Verificado: la doc de `@vercel/blob@2.8.2` dice que una *server upload* en Vercel está limitada a **4.5 MB** de cuerpo de request; además Next limita el cuerpo de una Server Action a **1 MB por defecto** (`experimental.serverActions.bodySizeLimit`, incluye el overhead multipart de ~10–20 KB, verificado en `node_modules/next/dist/docs/.../serverActions.md`). Subir `bodySizeLimit` a 5 MB no sirve: Vercel cortaría antes con un 413 genérico, sin pasar por nuestra validación. Recomendación: `MAX_IMAGE_BYTES = 4 * 1024 * 1024` (4 194 304 B + overhead multipart < 4.5 MB aunque Vercel cuente 4 500 000) y `bodySizeLimit: "4.5mb"` en `next.config.ts` (deja que decida nuestra validación y no Next). Alternativa si hacen falta 5 MB o más: *client upload* (`handleUpload` en un route handler + `upload()` desde el navegador), que **cambia el alcance** (route handler y cliente, ya no "solo Server Action"): se re-especifica. Se recomienda D1 tal cual; las fotos de paquetes en JPEG/WebP caben de sobra en 4 MB.
- **D2. Ubicación `lib/blob/`.** El servicio es transversal (lo usan `packages` y `destinations`; ARCHITECTURE §1.6 prohíbe que un módulo importe internos de otro) y no pertenece a un dominio. Server Action en `lib/` es válido (puede vivir en cualquier archivo con `"use server"`); es la primera del repo en `lib/` (la de `newsletter` vive en su módulo). Alternativa descartada: módulo `media` nuevo (YAGNI: sin tablas ni UI).
- **D3. Contrato de la action: `uploadImage(formData: FormData)`**, no la forma `(prevState, formData)` de `useActionState`: un campo de archivo con preview se llama normalmente desde un handler (`await uploadImage(fd)`) y el formulario 021 guarda la URL en su estado. Campos: `file` (File) y `credit` (texto opcional).
- **D4. Validar el tipo real, no solo `file.type`.** `file.type` lo declara el cliente. El servicio lee los primeros 12 bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF....WEBP`) y usa ese tipo para `contentType` y la extensión. Es un borde de confianza (security), por eso no se omite.
- **D5. Nombre del blob: `images/<uuid>.<ext>`** (`crypto.randomUUID()`), `access: "public"`, `addRandomSuffix: false` (el uuid ya es único y `allowOverwrite` queda en `false` por defecto). Nunca se usa el nombre del archivo del usuario (caracteres raros, filtra datos). Sin subcarpetas por dominio (YAGNI).
- **D6. Host de `next/image`: `*.public.blob.vercel-storage.com`**, `protocol: "https"`, `pathname: "/**"`, `search: ""` (sintaxis verificada en `image.md`: `*` = una etiqueta de subdominio). *ponytail: cualquier store público de Blob podría pasar por nuestro `/_next/image`; si preocupa, fijar el hostname al id del store (`<storeId>.public.blob.vercel-storage.com`).*
- **D7. Crédito:** texto, `trim`, máx **200** caracteres, vacío o ausente → `null`. Sin sanitizar HTML (React escapa al renderizar; la columna es `text`).

## Reuse
- Reuse: `lib/auth/require-role.ts` (`requireRole`, `AuthError`) — guard y error de auth; el rol sale del token.
- Reuse: `zod` v4 (instalado) — schema de archivo y crédito. `vitest` (instalado, `vitest.config.ts` con alias `@` e `include **/*.test.ts`) — tests colocados como `lib/money.test.ts`.
- Reuse (patrón): `modules/newsletter/actions/subscribe-action.ts` — `"use server"`, parse con Zod, `try/catch` que devuelve estado de error sin loguear datos sensibles; y su test con `vi.mock` del servicio.
- Extend: `.env.example` — se agregó `BLOB_READ_WRITE_TOKEN=` (main no la tenía; cambio hecho a mano antes de la spec, fuera de los `Owns`). Store `viajes-app-images` ya creado (público, iad1) y token en Vercel y `.env.local`.
- Extend: `next.config.ts` (hoy solo `cacheComponents: true`) — `images.remotePatterns` y `experimental.serverActions.bodySizeLimit`. Conserva `cacheComponents`.
- Extend: `package.json` / `package-lock.json` — `@vercel/blob` (`^2.8`, última 2.8.2, Node >= 20).
- New: `lib/blob/upload-image-schema.ts`, `lib/blob/upload-image.ts`, `lib/blob/upload-image-action.ts` — no existe nada de subida en el repo. No se agrega `file-type` (sniff de 3 formatos son ~15 líneas), ni `sharp`, ni `server-only` (no está instalado; el servicio nunca se importa desde el cliente por convención de `lib`).
- Verificado: `put(pathname, body, { access })` — `access` es obligatorio (`'public' | 'private'`); `addRandomSuffix` por defecto `false` y `allowOverwrite` `false` (colisión de nombre lanza error); `maximumSizeInBytes` solo se aplica en multipart (no sirve aquí, el tope lo da nuestro schema); `contentType` se infiere del pathname si no se pasa.

## Acceptance criteria
- AC1: `uploadImage(formData)` llama primero a `requireRole("organizer")`. Sin sesión lanza `AuthError("UNAUTHENTICATED")`; con rol `customer` lanza `AuthError("FORBIDDEN")`; con `organizer`, `admin` o `super_admin` continúa. En los dos primeros casos no se llama a `put`. `AuthError` es el único caso en que la action lanza.
- AC2: Con un archivo válido devuelve `{ ok: true, url, credit }` donde `url` es la `url` devuelta por `put` y `credit` es `string | null`. No importa ni usa `lib/db`.
- AC3: `put` se invoca con `access: "public"`, `addRandomSuffix: false`, un `pathname` de la forma `images/<uuid>.<ext>` (`jpg`, `png` o `webp`) y `contentType` igual al tipo real detectado. El nombre original del archivo nunca aparece en el `pathname`.
- AC4: Falta `file`, no es un `File` (p. ej. un string) → `{ ok: false, error: "FILE_REQUIRED" }`. Un `File` de 0 bytes → `"FILE_EMPTY"`. Un archivo de más de 4 MiB (`MAX_IMAGE_BYTES = 4 * 1024 * 1024`; exactamente 4 MiB pasa) → `"FILE_TOO_LARGE"`. En todos, `put` no se llama.
- AC5: Solo se aceptan `image/jpeg`, `image/png` y `image/webp`: otro `file.type` (`image/gif`, `application/pdf`, vacío, `image/svg+xml`) → `"INVALID_TYPE"`. Si `file.type` declara uno permitido pero los primeros bytes no corresponden a un JPEG/PNG/WebP real (p. ej. un PDF renombrado) → `"INVALID_TYPE"`. Si declara uno permitido y los bytes son de otro formato permitido, se sube con el tipo real. `put` no se llama en los rechazos.
- AC6: `credit` ausente, `null` o solo espacios → `credit: null` en el resultado; `"  Foto: Ana (CC BY 4.0) "` → `"Foto: Ana (CC BY 4.0)"`; más de 200 caracteres tras `trim` → `{ ok: false, error: "CREDIT_INVALID" }` sin llamar a `put`; un `File` en el campo `credit` → `"CREDIT_INVALID"`.
- AC7: Si `put` lanza (token ausente, red, Blob caído), la action devuelve `{ ok: false, error: "UPLOAD_FAILED" }` con mensaje genérico, sin relanzar, y solo hace `console.error` con un texto fijo (sin nombre de archivo, token ni mensaje del error).
- AC8: Todo `{ ok: false }` incluye `message` en español, listo para mostrar (ver Contracts), y `error` es un código estable de `UploadImageErrorCode`.
- AC9: `next.config.ts` mantiene `cacheComponents: true` y agrega `images.remotePatterns` con `https`, hostname `*.public.blob.vercel-storage.com`, `pathname: "/**"`, `search: ""`; y `experimental.serverActions.bodySizeLimit: "4.5mb"`. `npm run build` carga la config sin error. *(manual, con el store real)*: una URL devuelta por `put` renderiza con `next/image` sin error "hostname not configured".
- AC10: `npx tsc --noEmit`, `npm run lint` y `npm test` en verde al cerrar la fase.
- AC11 *(manual, post-deploy/local con `.env.local`)*: subir una imagen real de ≤4 MiB vía el servicio devuelve una URL `https://<id>.public.blob.vercel-storage.com/images/<uuid>.<ext>` accesible sin autenticación.

## Contracts

### Archivos
```
lib/blob/
  upload-image-schema.ts        # constantes + Zod + tipos
  upload-image-schema.test.ts
  upload-image.ts               # servicio puro: sniff + put
  upload-image.test.ts
  upload-image-action.ts        # "use server": requireRole -> parse -> servicio -> resultado
  upload-image-action.test.ts
```
Nombres de archivos kebab-case en inglés (ARCHITECTURE §1.3). Sin `index.ts` (YAGNI: los consumidores importan `@/lib/blob/upload-image-action`). `"use server"` solo exporta funciones async: constantes y tipos viven en el schema.

### `upload-image-schema.ts`
```ts
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_CREDIT_LENGTH = 200;

export type UploadImageErrorCode =
  | "FILE_REQUIRED" | "FILE_EMPTY" | "FILE_TOO_LARGE"
  | "INVALID_TYPE" | "CREDIT_INVALID" | "UPLOAD_FAILED";

// Los `error`/mensaje de cada issue Zod son el propio código (se lee issue.message).
export const uploadImageSchema = z.object({
  file: z.instanceof(File, { error: "FILE_REQUIRED" })
    .refine((f) => f.size > 0, { error: "FILE_EMPTY" })
    .refine((f) => f.size <= MAX_IMAGE_BYTES, { error: "FILE_TOO_LARGE" })
    .refine((f) => (ALLOWED_IMAGE_TYPES as readonly string[]).includes(f.type), { error: "INVALID_TYPE" }),
  credit: z.string({ error: "CREDIT_INVALID" }).trim()
    .max(MAX_CREDIT_LENGTH, { error: "CREDIT_INVALID" })
    .transform((v) => (v === "" ? null : v))
    .nullish()                       // ausente/null del FormData
    .transform((v) => v ?? null),
});
export type UploadImageInput = z.infer<typeof uploadImageSchema>;   // { file: File; credit: string | null }
```
(El developer ajusta la sintaxis exacta de Zod v4; el comportamiento es el de AC4–AC6. `FormData.get` devuelve `null` si falta: `file` ausente → `FILE_REQUIRED`.)

### `upload-image.ts` (servicio)
```ts
import { put } from "@vercel/blob";

export class InvalidImageError extends Error {}           // sniff no coincide -> INVALID_TYPE

export async function uploadImageToBlob(file: File): Promise<{ url: string }>;
// 1. sniff de los primeros 12 bytes -> "image/jpeg" | "image/png" | "image/webp" | null (null => throw InvalidImageError)
// 2. put(`images/${crypto.randomUUID()}.${ext}`, file, { access: "public", addRandomSuffix: false, contentType })
// 3. return { url: blob.url }
// Errores de put se propagan; la action los mapea a UPLOAD_FAILED.
// ponytail: sin limpieza de blobs huérfanos. Si el formulario no guarda la URL (cierra la pestaña, falla el
// guardado, reemplaza la foto), el archivo queda en el store. Límite aceptado en v1; mejora futura: borrar con
// `del()` al reemplazar/borrar la fila y un job que compare el store (`list()`) contra las columnas *_url.
```
La extensión sale del tipo detectado (`jpeg→jpg`, `png→png`, `webp→webp`). El servicio no valida tamaño ni crédito (ya lo hizo el schema).

### `upload-image-action.ts`
```ts
"use server";

export type UploadImageResult =
  | { ok: true; url: string; credit: string | null }
  | { ok: false; error: UploadImageErrorCode; message: string };

export async function uploadImage(formData: FormData): Promise<UploadImageResult>;
```
Flujo: `await requireRole("organizer")` (sin `try`: `AuthError` sube) → `uploadImageSchema.safeParse({ file: formData.get("file"), credit: formData.get("credit") })` → si falla, `error = issues[0].message` y su mensaje → `try { uploadImageToBlob } catch` (`InvalidImageError` → `INVALID_TYPE`; resto → `UPLOAD_FAILED` con `console.error("uploadImage: fallo al subir a Blob")`) → `{ ok: true, url, credit }`. `UploadImageResult` y `UploadImageErrorCode` se declaran en el schema o en este archivo (como *type exports*, permitidos en `"use server"`); 021/028 los importan como tipos.

### Mensajes (`message`)
| Código | Mensaje |
| ------ | ------- |
| `FILE_REQUIRED` | Selecciona una imagen |
| `FILE_EMPTY` | El archivo está vacío |
| `FILE_TOO_LARGE` | La imagen supera los 4 MB |
| `INVALID_TYPE` | Usa una imagen JPG, PNG o WebP |
| `CREDIT_INVALID` | El crédito no puede superar 200 caracteres |
| `UPLOAD_FAILED` | No pudimos subir la imagen. Inténtalo de nuevo |

### `next.config.ts`
```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**", search: "" },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
};
```

### Variables de entorno
`BLOB_READ_WRITE_TOKEN` (solo servidor). `@vercel/blob` la lee solo de `process.env`; el código no la lee ni la loguea.

### Dependencias
`@vercel/blob@^2.8` (dependencies).

## Edge cases
- **Blob huérfano:** si el formulario sube y luego no guarda (o reemplaza la foto), el archivo queda en el store. Fuera de alcance; comentario `ponytail:` en el servicio (D5/Contracts).
- **Cuerpo > 4.5 MB:** Vercel responde 413 antes de llegar a la action; no hay `UploadImageResult`. 021 debe validar el tamaño en el cliente (≤4 MiB) y tratar un rechazo sin resultado como error genérico.
- **Muchos archivos/doble clic:** cada llamada sube un blob nuevo con uuid propio (no colisiona). Sin dedupe.
- **WebP animado o PNG enorme en píxeles:** solo se valida bytes y tipo, no dimensiones.
- **Archivo con `file.type` vacío** (algunos navegadores/archivos): `INVALID_TYPE`.
- **Token ausente en local:** `put` lanza → `UPLOAD_FAILED`; revisar `.env.local` (`vercel env pull`).
- **SVG:** rechazado a propósito (riesgo de scripts incrustados).
- **Origen de la action (CSRF):** Next compara `Origin`/`Host` en Server Actions; no se agrega `allowedOrigins`.
- **Riesgo de merge:** `package.json`, `package-lock.json` y `next.config.ts` pueden chocar con otras ramas (p. ej. `006-webhook-clerk-users`, `013-price-stripe-client`); `lib/blob/` es carpeta nueva sin solapes. Rebasar sobre `main` y regenerar el lockfile con `npm i` si choca.

## Tests
- `lib/blob/upload-image-schema.test.ts` — cubre AC4, AC5 (parte de `file.type`), AC6: archivo ausente/string, vacío, 4 MiB exactos pasa y 4 MiB + 1 B falla, tipos permitidos y no permitidos (gif, pdf, svg, vacío), crédito ausente/`null`/espacios → `null`, `trim`, 200 pasa y 201 falla, `File` en crédito.
- `lib/blob/upload-image.test.ts` — cubre AC3, AC5 (sniff), con `vi.mock("@vercel/blob")`: JPEG/PNG/WebP con cabecera real → `put` con `access: "public"`, `addRandomSuffix: false`, `contentType` y `images/<uuid>.<ext>` (regex), nombre original ausente; PDF con `type: "image/png"` → `InvalidImageError` sin `put`; PNG declarado como `image/jpeg` → sube como `png`; devuelve `url` de `put`; error de `put` se propaga.
- `lib/blob/upload-image-action.test.ts` — cubre AC1, AC2, AC6 (end to end), AC7, AC8, con `vi.mock` de `@/lib/auth/require-role` (definir un `AuthError` falso o `importOriginal` si Clerk carga sin entorno) y de `./upload-image`: sin sesión/FORBIDDEN lanza `AuthError` y no llama al servicio; roles permitidos continúan; éxito devuelve `{ ok, url, credit }`; cada código de error con su `message`; `InvalidImageError` → `INVALID_TYPE`; fallo del servicio → `UPLOAD_FAILED` sin relanzar y `console.error` sin datos del error (espiar `console.error`).
- AC9 y AC11: verificación manual/`npm run build`, no se testea la config.

## Plan

### Phase 1 — Server Action de subida de imágenes
Una sola fase (~8 archivos, 4 tareas): deja la action usable por 021/028 y la config lista para mostrar las fotos.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `npm i @vercel/blob`; `next.config.ts` con `images.remotePatterns` y `experimental.serverActions.bodySizeLimit` (verificar sintaxis en `node_modules/next/dist/docs/`); `npm run build` carga la config | package.json, package-lock.json, next.config.ts | - | A | AC9 | todo |
| T2 | Schema Zod + constantes + tipos de error y tests | lib/blob/upload-image-schema.ts, lib/blob/upload-image-schema.test.ts | - | A | AC4, AC5, AC6 | todo |
| T3 | Servicio `uploadImageToBlob` (sniff + `put`) con comentario `ponytail:` de blobs huérfanos y tests con mock de `@vercel/blob` | lib/blob/upload-image.ts, lib/blob/upload-image.test.ts | T1, T2 | B | AC3, AC5 | todo |
| T4 | Server Action `uploadImage` (`requireRole` → schema → servicio → `UploadImageResult`, mensajes) y tests | lib/blob/upload-image-action.ts, lib/blob/upload-image-action.test.ts | T2, T3 | C | AC1, AC2, AC6, AC7, AC8, AC10 | todo |

T1 y T2 no comparten archivos ni dependencias (T2 solo usa `zod`, ya instalado): corren en paralelo (grupo A). T3 y T4 son secuenciales (T3 importa constantes de T2 y `@vercel/blob` de T1; T4 importa T2 y T3). AC11 lo verifica el humano con el store real tras T4.

## Open questions
- **D1 — RESUELTA (2026-10-25): se acepta el tope de 4 MB (opción A).** Pregunta original: ¿se acepta bajar el tope a **4 MB** (Server Action + `bodySizeLimit: "4.5mb"`) en vez de 5 MB? Es la recomendación: Vercel limita el cuerpo a 4.5 MB, así que 5 MB solo se logra con *client upload* (route handler + cliente, cambia el alcance y obliga a re-especificar). Si el usuario exige 5 MB, esta spec vuelve a `draft` con ese cambio.
- (Menor, con default) Tope de crédito en 200 caracteres: se asume suficiente para "Autor, licencia, fuente".
- (Menor, con default) Docs: agregar `lib/blob` a la lista de "únicos lugares que instancian" de ARCHITECTURE §5 no está en este plan; se puede sumar si el equipo lo quiere.
