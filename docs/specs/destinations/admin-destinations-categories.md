# CRUD admin de destinos (con clima, imperdibles y FAQ) y de categorías (/admin/destinos, /admin/categorias)

- Module: destinations
- Status: approved
- Approved by: leandro291 (2026-10-29) — con los defaults de Open questions 1–8
- Mode: SDD

## Goal
Tarjeta Trello 028. `admin` y `super_admin` crean, editan y borran destinos con sus hijas (clima de 12 meses, lugares imperdibles y preguntas frecuentes) desde `/admin/destinos`, y gestionan las categorías desde `/admin/categorias`. Las fotos se suben con `uploadImage` (020). Cada escritura exitosa invalida la caché pública del catálogo.

## Scope
- In:
  - Rutas `/admin/destinos` (lista), `/admin/destinos/nuevo`, `/admin/destinos/[id]/editar` (un solo formulario) y `/admin/categorias` (gestor en línea, patrón de `/operador/guias`).
  - Destino: campos de `destinations`, foto de portada, clima (12 meses o ninguno), lugares imperdibles (con foto y coordenadas opcionales) y preguntas frecuentes. Crear, editar, borrar.
  - Categoría: crear (nombre), renombrar, borrar.
  - Server Actions con guard `requireRole("admin")` (admin y super_admin, ERM: CRUD en ambas entidades) e invalidación con `updateTag`.
  - Bloqueo de borrado si hay paquetes asociados (destino y categoría), con mensaje.
  - Links "Destinos" y "Categorías" en `ADMIN_NAV_LINKS`.
  - Extracciones mínimas por DRY (2º uso): `ImageUploadField` y `FormSection`/`FieldShell` a `components/shared`, `isAllowedImageUrl` a `lib/blob`, helpers de errores de Postgres a `lib/db`.
- Out:
  - Reordenar lugares o preguntas (el orden es el de la lista del formulario; sin arrastre ni botones subir/bajar).
  - Cambiar el slug después de crear (afecta URLs `/destinos/<slug>` y filtros `?categoria=`/`?destino=`).
  - Estado borrador/publicado del destino: no existe en BD (un destino sin paquetes publicados no se muestra, ya lo resuelve `getDestinationPage`/`getDestinations`).
  - Crédito de foto por imagen (`destination_sights` y `destinations` no tienen columna); selector de mapa para coordenadas (inputs numéricos).
  - Borrar blobs huérfanos de Vercel Blob (límite ya aceptado en `lib/blob/upload-image.ts`).
  - Duplicar destinos, historial, importar/exportar, búsqueda y paginación de la lista (hay pocos destinos).
  - Cambios de schema de BD o migraciones; dependencias npm nuevas; componentes shadcn nuevos.
  - Gestión de paquetes ajenos (027) y reservas (026).

## Decisiones propuestas (se aprueban con la spec)
- **D1. Rutas en español, carpetas en inglés**: `/admin/destinos`, `/admin/destinos/nuevo`, `/admin/destinos/[id]/editar`, `/admin/categorias` (ARCHITECTURE §4). Crear y editar comparten `DestinationForm`.
- **D2. Dónde vive el código.** Destinos en `modules/destinations` (tablas `destinations`, `destination_*`). Categorías en `modules/packages`: ARCHITECTURE §3 asigna la tabla `categories` a `packages` y `getCategories` ya está ahí (ver Q1). `modules/admin` no se toca salvo el nav (compone, no importa Drizzle, AC10 de 025); las páginas de panel se exportan desde el `index.ts` de su módulo, como `GuidesPage`.
- **D3. Autorización = `requireRole("admin")` en cada action y en cada componente de página** (D6 de 025). `super_admin` pasa por jerarquía (`lib/auth/roles.ts`). No hay alcance por organizador. `uploadImage` exige `requireRole("organizer")`: admin y super_admin lo superan por jerarquía, no se modifica.
- **D4. Slug automático y fijo.** `slugify(name)` al crear (`lib/slug.ts`), nunca cambia. No se usa sufijo `-2`: un destino/categoría con el mismo slug es un duplicado y se rechaza con error en el campo `name` ("Ya existe uno con ese nombre"), vía captura de `23505`. El nombre debe contener al menos una letra latina o un dígito (si no, `slugify` devolvería `"paquete"`).
- **D5. Atomicidad**: crear/editar/borrar destino en una transacción (`db.transaction`, ya usada en `package-manage-service.ts`); al editar se reemplazan clima, lugares y preguntas (delete + insert) dentro de la misma transacción. Los ids de lugares y preguntas se regeneran: nada los referencia.
- **D6. Invalidación = `updateTag(...)` dentro de las Server Actions** (T2 de `package-crud.md`, verificado contra `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md`). Tags verificados con grep de `cacheTag`: `getDestinations` (`destinations`+`packages`), `getDestinationBySlug` (`destinations`), `getCategories` (`categories`); los paquetes (`getPackages`, `getFeaturedPackages`, `getPackageBySlug`, `getTours`, `getOffers`) cachean con `packages` e incluyen nombre/slug de destino y de categorías en la tarjeta. Por eso: escritura de destino -> `destinations` + `packages`; escritura de categoría -> `categories` + `packages`. Siempre que el resultado sea `ok` (sin bandera `catalogChanged`: son escrituras raras de un admin y no hay estado publicado/borrador; YAGNI).
- **D7. Borrado real con restricción.** `packages.destination_id` es `onDelete: restrict`: un destino con paquetes (en cualquier estado) devuelve `HAS_PACKAGES` (pre-chequeo de conteo + captura de `23503` para la carrera). `package_categories.category_id` es `cascade`: borrar una categoría en uso la quitaría en silencio de los paquetes; por defecto se **bloquea** si algún paquete la usa (ver Q2). Los hijos del destino (`destination_*`) son `cascade`.
- **D8. Lecturas del panel sin caché** (leen la BD directo, como `own-package-service`); dentro de `Suspense` por `cacheComponents` (`params` es `Promise`).
- **D9. Resultado tipado compartido** `CatalogResult` (en `lib/`, ver Contracts) en vez de ampliar `ManageErrorCode`/`MANAGE_MESSAGES` de `packages` (archivo que 027 también tocará). Mensajes neutros ("Tiene paquetes asociados...") sirven a destino y categoría.
- **D10. Formulario**: mismo patrón que `PackageForm` (T5 de `package-crud.md`): estado cliente, valores como strings, objeto tipado a la action con `useTransition`, el mismo schema valida en cliente y **siempre de nuevo en servidor** (`safeParse` de `unknown`).
- **D11. Diseño**: tokens de `DESIGN-SYSTEM.md` (`bg-surface rounded-card shadow-card`, un solo CTA `accent` por vista, objetivos >= 44 px, 16 px mínimo). No hay pantalla del artefacto para estas vistas de admin: se mantiene la consistencia con el panel del operador/025; el developer lista desvíos.

## Reuse
- Reuse: `lib/auth/require-role.ts` (`requireRole`, `AuthError`); `lib/blob/upload-image-action.ts` (`uploadImage`, `UploadImageResult`); `lib/cache-tags.ts`; `lib/db` (tablas `destinations`, `destination_climate_months/sights/faqs`, `categories`, `package_categories`, `packages`); `lib/slug.ts` (`slugify`, `isValidSlug`).
- Reuse: `modules/packages` vía su `index.ts` desde `destinations` (ya hay import de tipos desde `@/modules/packages`; `packages` no importa `destinations`, sin ciclo): `toFieldErrors` para `fieldErrors`. No se importan internos.
- Reuse: `modules/destinations/utils/destination-page.ts` (`SEASON_LABEL`, `MONTH_NAMES`) — etiquetas del selector de clima; `types/destination.ts` (`Season`, `ClimateMonthDto`, `SightDto`, `FaqDto`) — tipos de lectura.
- Reuse (patrón): `modules/packages/{actions,services,schemas,utils}` de `package-crud.md` — Server Action con `try/catch` y log de texto fijo, `ManageResult`, `parse` Zod en el borde, transacción con reemplazo de hijas, `toFormValues`/`toPackageInput`/`toFormErrors`, `newKey`; `modules/packages/components/guide-manager.tsx` y `guides-page.tsx` — gestor en línea con `ConfirmActionDialog` (base de `/admin/categorias`); `package-form.tsx` y secciones — formulario por secciones con `Alert` resumen y foco al primer error; `modules/offers/actions/offer-actions.ts` — patrón de wrapper + `updateTag`.
- Reuse: `components/shared/{confirm-action-dialog,page-skeleton}.tsx`; `components/ui/{alert,alert-dialog,button,field,input,label,native-select,textarea}.tsx` (ya instalados; sin `shadcn add`).
- Reuse (tests): `describe.skipIf(!process.env.DATABASE_URL)` + import dinámico para services con BD; `vi.mock` de `@/lib/auth/require-role` y `next/cache` en tests de actions.
- Extend: `modules/packages/schemas/package-schema.ts` — `IMAGE_URL_RE`/`isAllowedImageUrl` pasan a `lib/blob/image-url.ts` y el schema los re-exporta (sus tests no cambian).
- Extend: `modules/packages/utils/package-write.ts` — `findPgError`, `isFkViolation` e `isUniqueViolation` pasan a `lib/db/pg-errors.ts` y se re-exportan (tests no cambian).
- Extend: `modules/packages/components/{package-form-media,package-form-itinerary,package-form-basics,package-form-inclusions}.tsx` — solo cambian imports de `ImageUploadField` y `FormSection`/`FieldShell`.
- Extend: `modules/packages/index.ts`, `modules/destinations/index.ts` (exports de páginas), `modules/admin/components/admin-nav-links.ts` (2 links).
- Move: `modules/packages/components/image-upload-field.tsx` -> `components/shared/image-upload-field.tsx`; `modules/packages/components/form-section.tsx` -> `components/shared/form-section.tsx`. Segundo consumidor real (destinos y paquetes). No se puede importar desde el barrel de `packages` en un componente cliente (arrastraría `lib/db`/servicios al bundle cliente) ni duplicar (DRY).
- New: `lib/catalog-action.ts` (tipos de resultado + `runAdminAction`), `lib/db/pg-errors.ts`, `hasSlugChars` en `lib/slug.ts` — dos módulos (destinations y packages/categorías) los necesitan.
- New: `modules/destinations/{schemas,services,actions,utils,types,components}` de gestión y `modules/packages/{schemas,services,actions,components}` de categorías — hoy solo hay lecturas públicas cacheadas (`getDestinations`, `getDestinationBySlug`, `getCategories`); ninguna sirve para el panel (cacheadas por hora, sin `id` del destino para editar, sin conteos).
- Verificado y descartado: `getDestinationBySlug` (cacheada por slug, requiere slug) para precargar el formulario -> lectura propia por `id`. `components/ui/table` (ya instalado por otra tarjeta) no se usa: lista semántica `<ul>` con filas, como en operador. `react-hook-form`/`sonner` no están instalados y no se agregan.

## Acceptance criteria

### Lib y extracciones
- AC1: `isAllowedImageUrl`/`IMAGE_URL_RE` viven en `lib/blob/image-url.ts` (Blob https `*.public.blob.vercel-storage.com` o `/seed/<archivo>`; `http`, otros hosts y `javascript:` falsos) y `package-schema.ts` los re-exporta. `findPgError`/`isFkViolation`/`isUniqueViolation` viven en `lib/db/pg-errors.ts` (revisan el error y su `cause`) y `package-write.ts` los re-exporta. `ImageUploadField` y `FormSection`/`FieldShell` viven en `components/shared` con las mismas props. Los tests existentes de `packages` pasan sin editarse y el formulario de paquetes se ve y se comporta igual.
- AC2: `hasSlugChars(text)` es `true` si tras quitar tildes hay al menos una letra `a-z` o un dígito (`"Cusco"`, `"Ñuñoa"`, `"2 Mares"`), `false` para `""`, `"   "`, `"!!!"` y `"日本"`.
- AC3: `runAdminAction(name, body)` llama primero a `requireRole("admin")` (el `AuthError` sube: sin sesión `UNAUTHENTICATED`, `organizer`/`customer` `FORBIDDEN`); ejecuta `body()`; si lanza, registra `console.error("<name>: fallo inesperado")` (texto fijo, sin datos del input ni del error) y devuelve `{ ok: false, code: "UNKNOWN", message }`. `catalogFail(code, fieldErrors?)` arma `{ ok: false, code, message: CATALOG_MESSAGES[code], fieldErrors? }` y hay mensaje en español no vacío para cada `CatalogErrorCode`.

### Categorías
- AC4: `categoryInputSchema`: `name` con `trim`, 2–40 caracteres y `hasSlugChars`; mensajes en español; los campos extra (`slug`, `id`) se descartan.
- AC5: `createCategory(input)` inserta con `slug = slugify(name)` y devuelve `{ ok: true, id }`. Slug duplicado (`23505`) -> `SLUG_TAKEN` con `fieldErrors: { name: ... }` y nada insertado.
- AC6: `updateCategory(id, input)` cambia solo `name` (nunca `slug`); `id` inexistente -> `NOT_FOUND`; guardar el mismo nombre es válido.
- AC7: `deleteCategory(id)`: inexistente -> `NOT_FOUND`; usada por >= 1 paquete (cualquier estado) -> `HAS_PACKAGES` y no borra; sin uso -> borra. Una categoría sembrada sin paquetes se puede borrar.
- AC8: `listCategoriesWithUsage()` devuelve `{ id, slug, name, packageCount }` por nombre asc, con `packageCount` = paquetes (draft y published) que la usan; 0 si ninguno.
- AC9: Las actions de categoría (`createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`) usan `runAdminAction`; el input es `unknown` y se revalida con Zod en servidor (`INVALID_INPUT` + `fieldErrors = toFieldErrors(...)` sin llamar al service); el `id` se valida con `z.uuid()`. Tras un resultado `ok` llaman **exactamente una vez** a `updateTag(CACHE_TAGS.categories)` y **una vez** a `updateTag(CACHE_TAGS.packages)`; con `ok: false` no llaman a ninguna.

### Schema y reglas del destino
- AC10: `destinationInputSchema` exige `name` (`trim`, 2–80, `hasSlugChars`), `region` (2–80) y `heroImageUrl` (portada obligatoria, `isAllowedImageUrl`). Opcionales (`""` -> `null`): `tagline` (<=160), `description` (<=2000), `altitudeM` (entero 0–9000), `bestSeasonText` (<=120), `fromLimaText` (<=120), `howToGetText` (<=1000), `tipsText` (<=1000). Mensajes en español; campos extra (`slug`, `id`) se descartan.
- AC11: `climate` es un arreglo de 12 posiciones (índice 0 = enero) de `"dry" | "mixed" | "rainy" | null`. Válido si las 12 son `null` (sin clima) o las 12 tienen valor; mezcla -> error en la clave `climate` ("Define los 12 meses o déjalos todos sin definir"). La página pública oculta la sección si faltan meses, por eso no se permiten parciales.
- AC12: `sights` hasta 12 ítems (puede ser 0): `name` (2–80), `description` (10–500), `imageUrl` (obligatoria, `isAllowedImageUrl`: la columna es `NOT NULL`), `lat`/`lng` opcionales (−90..90 / −180..180) **juntas o ambas vacías**. `faqs` hasta 20 ítems (puede ser 0): `question` (5–200) y `answer` (10–1000). `sort_order` no lo envía el cliente: se asigna 0..n por el orden. Cualquier URL de imagen que no cumpla AC1 es inválida.
- AC13: `toFieldErrors` produce claves por path (`sights.0.name`, `faqs.1.answer`, `climate`, `heroImageUrl`).

### Service de destinos
- AC14: `createDestination(input)`: en **una transacción** inserta `destinations` (`slug = slugify(name)`) y sus hijas (`destination_climate_months` con `month` 1..12 solo si hay clima, `destination_sights` y `destination_faqs` con `sort_order` 0..n). Si cualquier insert falla no queda nada. Devuelve `{ ok: true, id, slug }`. Slug duplicado (`23505`) -> `SLUG_TAKEN` con `fieldErrors: { name }`.
- AC15: `updateDestination(id, input)`: en una transacción, `select ... for update` por `id`; sin fila -> `NOT_FOUND` y no escribe nada. Actualiza la fila **sin nombrar `id` ni `slug`** en el `set()` y reemplaza las tres tablas hijas (delete + insert). Cambiar `name` no cambia el `slug`.
- AC16: `deleteDestination(id)`: inexistente -> `NOT_FOUND`; con >= 1 paquete (cualquier estado) -> `HAS_PACKAGES`; violación de FK (`23503`) en el `delete` por carrera -> `HAS_PACKAGES`; en todo bloqueo no se borra nada. Sin paquetes borra el destino y, por cascade, clima, lugares y preguntas.
- AC17: `listAdminDestinations()` devuelve `{ id, slug, name, region, heroImageUrl, packageCount, publishedCount, sightCount }` por nombre asc (`packageCount` = todos los estados, `publishedCount` = solo `published`). `getDestinationForEdit(id)` devuelve `null` si no existe y, si existe, `{ id, slug, values: DestinationInput }` con `climate` en 12 posiciones (meses faltantes o ausentes -> `null`), lugares y preguntas ordenados por `sort_order`.

### Actions de destinos
- AC18: `createDestinationAction`, `updateDestinationAction`, `deleteDestinationAction` usan `runAdminAction` (AC3); el input es `unknown` y se revalida con Zod en servidor (`INVALID_INPUT` + `fieldErrors` sin llamar al service); el `id` se valida con `z.uuid()`. Un `slug` o `id` extra en el input se ignora.
- AC19: Tras un resultado `ok` cada action de destino llama **exactamente una vez** a `updateTag(CACHE_TAGS.destinations)` y **una vez** a `updateTag(CACHE_TAGS.packages)`; con `ok: false` (incluidos `INVALID_INPUT`, `NOT_FOUND`, `HAS_PACKAGES`, `SLUG_TAKEN`, `UNKNOWN`) no llaman a ninguna. Resultado: tras crear, editar o borrar un destino, `/destinos/<slug>`, el bento de Inicio y las tarjetas de paquete muestran el cambio en la siguiente request sin esperar a que expire la caché.

### UI: destinos
- AC20: `/admin/destinos` lista los destinos (miniatura de la portada con `alt` vacío decorativo si el nombre ya está en texto, nombre, región, nº de paquetes) con acciones "Editar", "Ver en el sitio" (a `/destinos/<slug>`, **solo si `publishedCount > 0`**: sin paquetes publicados esa página da 404) y "Eliminar" (`ConfirmActionDialog` con el nombre; si la action devuelve `HAS_PACKAGES` el diálogo permanece abierto mostrando el `message`; en éxito la fila desaparece). Encabezado con botón "Nuevo destino" (un solo CTA `accent` por vista). Con 0 destinos: estado vacío "Aún no hay destinos" con CTA a `/admin/destinos/nuevo`. "Eliminar" está siempre habilitado: el bloqueo por paquetes se explica al intentar (diálogo abierto con el motivo).
- AC21: `/admin/destinos/nuevo` y `/admin/destinos/[id]/editar` renderizan el **mismo** `DestinationForm`; en editar viene precargado. `id` no uuid, inexistente -> `notFound()`. Ambas páginas usan `Suspense` con `PageSkeleton`.
- AC22: Secciones del formulario: **Datos básicos** (nombre, región, eslogan, descripción, altitud en metros, mejor época, desde Lima), **Cómo llegar y consejos** (dos `Textarea`), **Foto de portada** (obligatoria, con vista previa), **Clima por mes** (12 `NativeSelect` etiquetados con `MONTH_NAMES`, opciones "Sin definir"/`SEASON_LABEL`; ayuda: "Define los 12 meses o déjalos todos sin definir"), **Lugares imperdibles** (lista dinámica: nombre, descripción, foto obligatoria por lugar, lat/lng opcionales; agregar/quitar; tope 12) y **Preguntas frecuentes** (lista dinámica: pregunta/respuesta; agregar/quitar; tope 20). Cada fila de lista tiene una clave estable en cliente (no el índice) que no se envía. Sin reordenar.
- AC23: Subida de imágenes (portada y lugares) con el `ImageUploadField` compartido: valida tipo (JPG/PNG/WebP) y tamaño <= 4 MiB antes de `uploadImage`, muestra "Subiendo…" y deshabilita el control, guarda la `url` y muestra vista previa, y muestra el `message` de `{ ok: false }` o el error genérico si la llamada falla sin resultado. Un destino sembrado con `/seed/*.jpg` se puede editar y guardar tal cual (AC1).
- AC24: Envío: "Guardar" (CTA `accent`) valida todo con `destinationInputSchema` en cliente, queda deshabilitado mientras la action corre (evita doble creación) y llama a la action con un objeto tipado. Errores: cada campo inválido muestra su mensaje con `aria-invalid`/`aria-describedby`; un `Alert` resumen (`role="alert"`) con el número de errores y foco/scroll al primero; los `fieldErrors`/`message` del servidor se muestran igual (incl. `SLUG_TAKEN` en `name`). Tras guardar bien (crear o editar) `router.replace("/admin/destinos")`.

### UI: categorías
- AC25: `/admin/categorias` lista las categorías (nombre, slug de solo lectura en texto, "N paquetes") por nombre; permite agregar una (campo nombre), renombrar en línea y eliminar con `ConfirmActionDialog`. Con 0 categorías: estado vacío con el formulario de alta. Una categoría en uso muestra el motivo del bloqueo (`HAS_PACKAGES`) en el diálogo, que permanece abierto. Errores por campo en español (incl. `SLUG_TAKEN`).

### Navegación, accesibilidad y calidad
- AC26: El sidebar de administración muestra "Destinos" (`/admin/destinos`) y "Categorías" (`/admin/categorias`), activos en la ruta y sus subrutas; "Resumen" sigue activo solo en `/admin` exacto. Cada link se agrega en la fase cuya página lo hace existir (sin links a 404).
- AC27: Cada componente de página/servidor (`AdminDestinationsList`, `DestinationEditor`, `AdminCategoriesPage`) llama `requireRole("admin")` antes de leer; `organizer`/`customer` no llegan por `proxy.ts` (ya redirige) y, si llegaran, `AuthError` va al error boundary.
- AC28: Accesibilidad (DESIGN-SYSTEM): `<label>` visible en cada campo, texto >= 16 px, objetivos >= 44 px, foco visible, íconos decorativos `aria-hidden`, estados con ícono + texto, `alert-dialog` con foco atrapado y `Esc` cierra, `prefers-reduced-motion` respetado, sin `div` clicables, sin scroll horizontal a 390 px, imágenes con `alt`, cadenas largas con `break-words`.
- AC29: `npx tsc --noEmit`, `npm run lint` y `npm test` en verde al cerrar cada fase; `npm run build` en verde al cerrar las fases 3 y 6 (primeras rutas dinámicas nuevas del panel y ruta con `[id]` bajo `Suspense`).

## Contracts

### Archivos
```
lib/blob/image-url.ts                    (+ .test.ts)   # isAllowedImageUrl, IMAGE_URL_RE
lib/db/pg-errors.ts                      (+ .test.ts)   # findPgError, isFkViolation, isUniqueViolation
lib/catalog-action.ts                    (+ .test.ts)   # CatalogResult, catalogFail, runAdminAction
lib/slug.ts                              (+ .test.ts)   # + hasSlugChars
components/shared/{image-upload-field,form-section}.tsx # movidos desde modules/packages/components

modules/packages/                        # categorías
  schemas/category-schema.ts             (+ .test.ts)
  services/category-manage-service.ts    (+ .test.ts)   # BD
  actions/category-actions.ts            (+ .test.ts)
  components/{admin-categories-page,category-manager}.tsx
modules/destinations/                    # destinos
  schemas/destination-schema.ts          (+ .test.ts)
  types/destination-manage.ts
  utils/destination-write.ts             (+ .test.ts)   # filas insert/update/hijas, puro
  utils/destination-form.ts              (+ .test.ts)   # valores del formulario <-> input
  services/destination-manage-service.ts (+ .test.ts)   # BD
  services/destination-admin-service.ts  (+ .test.ts)   # BD, lecturas del panel
  actions/destination-actions.ts         (+ .test.ts)
  components/{destination-form,destination-form-basics,destination-form-climate,
    destination-form-sights,destination-form-faqs,destination-editor,
    admin-destinations-list,destination-row-actions}.tsx
app/(admin)/admin/{destinos,destinos/nuevo,destinos/[id]/editar,categorias}/page.tsx
```
Convención del repo: tests colocados `*.test.ts`; los `.tsx` sin test (SETUP §3).

### `lib/catalog-action.ts`
```ts
export type CatalogErrorCode = "NOT_FOUND" | "INVALID_INPUT" | "SLUG_TAKEN" | "HAS_PACKAGES" | "UNKNOWN";
export type CatalogResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: CatalogErrorCode; message: string; fieldErrors?: Record<string, string> };

export const CATALOG_MESSAGES: Record<CatalogErrorCode, string>;
// NOT_FOUND:     "No encontramos ese elemento."
// INVALID_INPUT: "Revisa los campos marcados."
// SLUG_TAKEN:    "Ya existe uno con ese nombre."
// HAS_PACKAGES:  "Tiene paquetes asociados, no se puede eliminar."
// UNKNOWN:       "No pudimos guardar los cambios. Inténtalo de nuevo."
export function catalogFail(code: CatalogErrorCode, fieldErrors?: Record<string, string>):
  Extract<CatalogResult, { ok: false }>;
export function runAdminAction<T>(name: string, body: () => Promise<CatalogResult<T>>): Promise<CatalogResult<T>>;
// requireRole("admin") -> try { body() } catch { console.error(`${name}: fallo inesperado`); UNKNOWN }
```
`lib/db/pg-errors.ts`: `findPgError(error, code)`, `isFkViolation(error)`, `isUniqueViolation(error, constraint?)` (mismo comportamiento actual de `package-write.ts`). `lib/slug.ts`: `export function hasSlugChars(text: string): boolean`.

### Categorías (`modules/packages`)
```ts
// schemas/category-schema.ts
export const categoryInputSchema = z.object({ name: z.string().trim().min(2).max(40).refine(hasSlugChars, "...") });
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export const categoryIdSchema = z.uuid();
export type CategoryAdminDto = { id: string; slug: string; name: string; packageCount: number };

// services/category-manage-service.ts  (sin "use cache")
export function listCategoriesWithUsage(): Promise<CategoryAdminDto[]>;
export function createCategory(input: CategoryInput): Promise<CatalogResult<{ id: string }>>;
export function updateCategory(id: string, input: CategoryInput): Promise<CatalogResult>;
export function deleteCategory(id: string): Promise<CatalogResult>;
// create: 23505 -> SLUG_TAKEN {name}; update: set({ name }) únicamente; delete: cuenta package_categories antes (HAS_PACKAGES)

// actions/category-actions.ts ("use server")
export function createCategoryAction(input: unknown): Promise<CatalogResult<{ id: string }>>;
export function updateCategoryAction(id: string, input: unknown): Promise<CatalogResult>;
export function deleteCategoryAction(id: string): Promise<CatalogResult>;
// runAdminAction -> parse -> service -> si ok: updateTag(categories), updateTag(packages)

// components (server + client)
// admin-categories-page.tsx (async server): requireRole("admin"), listCategoriesWithUsage(), renderiza <CategoryManager categories={...}/>
// category-manager.tsx (client): props { categories: CategoryAdminDto[] }

// modules/packages/index.ts (agrega)
export { AdminCategoriesPage } from "./components/admin-categories-page";
```

### Destinos (`modules/destinations`)
```ts
// schemas/destination-schema.ts (Zod 4)
export const MAX_SIGHTS = 12; export const MAX_FAQS = 20;
export type DestinationInput = {
  name: string; region: string; heroImageUrl: string;
  tagline: string | null; description: string | null; altitudeM: number | null;
  bestSeasonText: string | null; fromLimaText: string | null;
  howToGetText: string | null; tipsText: string | null;
  climate: (Season | null)[];                         // 12 posiciones, [0] = enero; todo null o todo definido
  sights: { name: string; description: string; imageUrl: string; lat: number | null; lng: number | null }[];
  faqs: { question: string; answer: string }[];
};
export const destinationInputSchema: z.ZodType<DestinationInput, unknown>;
export const destinationIdSchema = z.uuid();

// types/destination-manage.ts
export type DestinationAdminItem = {
  id: string; slug: string; name: string; region: string; heroImageUrl: string | null;
  packageCount: number; publishedCount: number; sightCount: number;
};
export type DestinationEdit = { id: string; slug: string; values: DestinationInput };

// utils/destination-write.ts (puro, sin BD)
export function toDestinationRow(input: DestinationInput): Omit<typeof destinations.$inferInsert, "id" | "slug">;
export function toChildRows(destinationId: string, input: DestinationInput):
  { climate: ...[]; sights: ...[]; faqs: ...[] };   // month 1..12 solo si hay clima; sortOrder 0..n

// services/destination-admin-service.ts (sin "use cache")
export function listAdminDestinations(): Promise<DestinationAdminItem[]>;
export function getDestinationForEdit(id: string): Promise<DestinationEdit | null>;

// services/destination-manage-service.ts
export function createDestination(input: DestinationInput): Promise<CatalogResult<{ id: string; slug: string }>>;
export function updateDestination(id: string, input: DestinationInput): Promise<CatalogResult>;
export function deleteDestination(id: string): Promise<CatalogResult>;

// actions/destination-actions.ts ("use server")
export function createDestinationAction(input: unknown): Promise<CatalogResult<{ id: string }>>;
export function updateDestinationAction(id: string, input: unknown): Promise<CatalogResult>;
export function deleteDestinationAction(id: string): Promise<CatalogResult>;
// runAdminAction -> parse (INVALID_INPUT + toFieldErrors de @/modules/packages) -> service
// -> si ok: updateTag(destinations), updateTag(packages)
```

### Formulario (`utils/destination-form.ts`)
```ts
export type DestinationFormValues = {      // texto salvo arrays: permite inputs vacíos
  name: string; region: string; tagline: string; description: string; altitudeM: string;
  bestSeasonText: string; fromLimaText: string; howToGetText: string; tipsText: string;
  heroImageUrl: string;
  climate: ("dry" | "mixed" | "rainy" | "")[];                       // 12; "" = sin definir
  sights: { key: string; name: string; description: string; imageUrl: string; lat: string; lng: string }[];
  faqs: { key: string; question: string; answer: string }[];
};
export type FormErrors = Record<string, string>;
export function emptyFormValues(): DestinationFormValues;            // climate de 12 "", sin lugares ni preguntas
export function toFormValues(input: DestinationInput): DestinationFormValues;   // keys nuevas
export function toDestinationInput(values: DestinationFormValues): unknown;      // strings -> números/null, "" -> null, descarta key
// SectionProps = { values; errors: FormErrors; disabled: boolean; onChange: (patch: Partial<DestinationFormValues>) => void }
```
Componentes: `DestinationForm({ mode: "create" | "edit"; destinationId?: string; initialValues: DestinationFormValues })` (client); `DestinationEditor({ destinationId?: string })` (async server: `requireRole("admin")`, carga el destino en edit, `notFound()` si no existe); `AdminDestinationsList()` (async server) y `DestinationRowActions({ item: DestinationAdminItem })` (client).

### Rutas (`app/` delgada; `Suspense` + `PageSkeleton`; `metadata.title`)
| Ruta | Contenido |
| ---- | --------- |
| `/admin/destinos` | `h1` "Destinos" + `<Suspense><AdminDestinationsList/></Suspense>` |
| `/admin/destinos/nuevo` | `h1` "Nuevo destino" + `<Suspense><DestinationEditor/></Suspense>` |
| `/admin/destinos/[id]/editar` | `await params`; `id` no uuid -> `notFound()`; `<Suspense><DestinationEditor destinationId={id}/></Suspense>` |
| `/admin/categorias` | `h1` "Categorías" + `<Suspense><AdminCategoriesPage/></Suspense>` |

`modules/destinations/index.ts` agrega: `AdminDestinationsList`, `DestinationEditor`, `destinationIdSchema` (para que `app/` no importe internos, ARCHITECTURE §1.6).

### Nav (`admin-nav-links.ts`, una línea por tarjeta)
```ts
{ label: "Destinos", href: "/admin/destinos", icon: MapPin },
{ label: "Categorías", href: "/admin/categorias", icon: Tags },   // lucide-react
```

### Estados de UI
| Estado | Dónde | Qué se ve |
| ------ | ----- | --------- |
| Lista vacía | `/admin/destinos` | "Aún no hay destinos" + CTA "Nuevo destino" |
| Categorías vacías | `/admin/categorias` | "Aún no hay categorías" + formulario de alta |
| Cargando | páginas | `PageSkeleton` en `Suspense` |
| Error de validación | formularios | Mensaje por campo + `Alert` resumen |
| Error de servidor | formulario / diálogo / fila | `Alert role="alert"` con `message` |
| Borrado bloqueado | diálogo | Permanece abierto con el motivo (`HAS_PACKAGES`) |
| Subiendo imagen | `ImageUploadField` | "Subiendo…" y control deshabilitado |

## Edge cases
- **Slug duplicado** (nombre repetido o equivalente tras `slugify`, p. ej. "Cuzco" no colisiona con "Cusco" pero "CUSCO" sí): `SLUG_TAKEN` en `name`, sin escribir nada. Dos creaciones simultáneas del mismo nombre: la segunda cae en `23505`.
- **Nombre sin letras ni dígitos** ("!!!", emoji): inválido en el schema (no se genera slug `paquete`).
- **Renombrar**: el slug no cambia, así que URLs y filtros siguen vivos; la caché se invalida para que el nuevo nombre aparezca.
- **Borrar destino/categoría con paquetes** (incluso solo borradores): bloqueado con `HAS_PACKAGES`; para borrar hay que reasignar o borrar esos paquetes antes (027/operador). Borrar un destino cuyo paquete se creó entre el chequeo y el `delete`: la FK `restrict` lo atrapa (`23503` -> `HAS_PACKAGES`). En categorías no hay FK que proteja (cascade): un paquete que la adopte entre el chequeo y el `delete` la perdería; ventana mínima, aceptada.
- **Clima parcial**: inválido por schema; un destino sembrado con clima de 12 meses precarga los 12; uno con 0 filas precarga 12 `null`. Si por datos heredados la BD tuviera 1–11 meses, `getDestinationForEdit` rellena `null` y el admin debe completar o vaciar todos para guardar (el schema rechaza el parcial).
- **Imágenes**: URL solo Blob o `/seed/*` (AC1); el cliente no puede guardar URLs arbitrarias (solo el host de Blob está en `remotePatterns`). Blobs subidos y luego quitados quedan huérfanos (límite aceptado).
- **Seed**: `db:seed` hace `onConflictDoUpdate` sobre `destinations` y `destination_sights` (D7 de `destination-page.md`); volver a sembrar sobrescribe las ediciones del admin sobre los 8 destinos sembrados. Solo afecta entornos de desarrollo/demo; no se cambia el seed aquí.
- **Cadena larga / 390 px**: `break-words`, filas de lista apilan acciones, sin scroll horizontal.
- **Doble clic en guardar o eliminar**: botones deshabilitados durante `useTransition`/confirmación en curso.
- **`updateTag` solo funciona en Server Actions**: las actions no se invocan desde route handlers; el test mockea `next/cache`.
- **`cacheComponents: true`**: sesión y BD dentro de `Suspense`; `params` es `Promise`. `notFound()` dentro de `Suspense` produce soft 404 (límite del framework, ya documentado en `package-crud.md`).
- **Rol insuficiente que llega a la action**: `AuthError` sube (no se captura); es lo único que lanza.
- **Colisión con otras ramas** (`026-admin-bookings`, `027-admin-packages-offers`): ver Plan, "Archivos compartidos".

## Tests
Solo lógica de negocio (SETUP §3); sin tests de markup. Services con BD: `describe.skipIf(!process.env.DATABASE_URL)` + import dinámico, con datos de prueba propios y limpieza en `afterAll`.
- `lib/blob/image-url.test.ts` — AC1: Blob https pasa, `/seed/x.jpg` pasa, `http://`, otro host, `javascript:` y vacío fallan.
- `lib/db/pg-errors.test.ts` — AC1: código directo y en `cause`, `constraint` opcional, otros códigos falsos, valores no objeto.
- `lib/slug.test.ts` (extiende) — AC2: `hasSlugChars` (`"Cusco"`, `"Ñuñoa"`, `"2 Mares"` true; `""`, `"   "`, `"!!!"`, `"日本"` false).
- `lib/catalog-action.test.ts` — AC3: `AuthError` sube con `requireRole` mockeado; `body` que lanza -> `UNKNOWN` y `console.error` con texto fijo (no incluye el mensaje del error); `catalogFail` arma el mensaje; `CATALOG_MESSAGES` completo.
- `modules/packages/schemas/category-schema.test.ts` — AC4: límites 1/2/40/41, `trim`, `"!!!"` inválido, extras descartados.
- `modules/packages/services/category-manage-service.test.ts` (BD) — AC5–AC8: crear asigna slug; duplicado -> `SLUG_TAKEN` sin fila nueva; renombrar conserva slug; inexistente -> `NOT_FOUND`; borrar en uso -> `HAS_PACKAGES`, sin uso -> borra; `listCategoriesWithUsage` cuenta draft y published.
- `modules/packages/actions/category-actions.test.ts` — AC9 (mock de `@/lib/auth/require-role`, `../services/category-manage-service`, `next/cache`): `AuthError` sube; input inválido -> `INVALID_INPUT` con `fieldErrors` sin llamar al service; `id` no uuid -> `INVALID_INPUT`; `ok` -> `updateTag` 2 veces (`categories`, `packages`); `ok: false` -> 0 veces; excepción del service -> `UNKNOWN`.
- `modules/destinations/schemas/destination-schema.test.ts` — AC10–AC13: destino mínimo válido pasa; faltantes (nombre, región, portada) fallan; límites de cada campo; `""` -> `null`; altitud fuera de 0–9000 y no entera; clima: 12 `null` pasa, 12 definidos pasa, 11 definidos falla, longitud != 12 falla; lugares: tope 12/13, imagen faltante o inválida, lat sin lng falla y fuera de rango falla; faqs: tope 20/21, longitudes; claves de `toFieldErrors` (`sights.0.name`, `climate`); `slug`/`id` extra descartados.
- `modules/destinations/utils/destination-write.test.ts` — AC14, AC15: `toDestinationRow` no incluye `id` ni `slug`; `toChildRows` (`month` 1..12 solo con clima, `sortOrder` 0..n, sin clima -> `[]`).
- `modules/destinations/utils/destination-form.test.ts` — `toFormValues` <-> `toDestinationInput` ida y vuelta (altitud, vacío -> `null`, `key` descartada, clima de 12), `emptyFormValues` no pasa el schema (falta nombre/región/portada) pero tiene 12 meses.
- `modules/destinations/services/destination-manage-service.test.ts` (BD) — AC14–AC16: crear inserta destino e hijas con `sort_order`/`month`; rollback si falla un insert hijo (p. ej. `season` inválido forzado) deja 0 filas; slug duplicado -> `SLUG_TAKEN`; editar reemplaza hijas y conserva slug; inexistente -> `NOT_FOUND`; borrar con paquete (draft) -> `HAS_PACKAGES` sin cambios; sin paquetes borra y cascade limpia hijas.
- `modules/destinations/services/destination-admin-service.test.ts` (BD) — AC17: `listAdminDestinations` con `packageCount`/`publishedCount`/`sightCount` correctos; `getDestinationForEdit` inexistente -> `null`, con clima parcial rellena `null`, lugares y preguntas ordenados.
- `modules/destinations/actions/destination-actions.test.ts` — AC18, AC19: mismos casos que categorías (`updateTag` con `destinations` y `packages`, una vez cada una, solo en `ok`); un `slug` extra en el input no llega al service.
- AC20–AC28 (UI): sin tests unitarios; verificación manual en la revisión con `DATABASE_URL`, Clerk y Blob reales (rol `admin` y `super_admin`; `organizer` redirigido): crear destino con 12 meses, 2 lugares con foto y 2 preguntas; verlo en `/destinos/<slug>` tras añadirle un paquete publicado; renombrar y ver el cambio en la tarjeta de paquete sin esperar a la caché; intentar borrar uno con paquetes; error por campo; subir imagen; categoría en uso; 390 px.

## Plan
Seis fases; cada una deja `lint + tsc + test` en verde y la app funcionando. Las fases 1, 2 y 4 no cambian la UI visible; la 3 entrega `/admin/categorias`; la 5 deja el formulario sin enrutar; la 6 entrega `/admin/destinos`. Se recomienda 1-2 fases por sesión.

**Archivos compartidos con otras ramas** (`026-admin-bookings`, `027-admin-packages-offers`): solo cuatro, todos ediciones de una o pocas líneas y declarados en `Owns` de una única tarea: `modules/admin/components/admin-nav-links.ts` (+1 línea en T9 y +1 en T19), `modules/packages/index.ts` (+1 export en T9; 027 también exportará aquí), `modules/destinations/index.ts` (+3 exports en T19) y el movimiento de `form-section.tsx`/`image-upload-field.tsx` (T1/T2, toca imports en 4 componentes de formulario de paquetes que 027 podría reutilizar). Ni `app/(admin)/layout.tsx`, `modules/admin/index.ts`, `components/shared/panel-*` ni `modules/admin/components/admin-shell.tsx` se tocan. Orden de merge recomendado: si 026/027 mergean antes, resolver los conflictos de `admin-nav-links.ts` y de `index.ts` conservando las líneas de ambos lados.

### Phase 1 — Mover `FormSection` y helpers de lib (sin cambio de comportamiento)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: mover `FormSection`/`FieldShell` a `components/shared/form-section.tsx` y actualizar su import en las 4 secciones del formulario de paquetes | components/shared/form-section.tsx, modules/packages/components/form-section.tsx, modules/packages/components/package-form-basics.tsx, modules/packages/components/package-form-inclusions.tsx, modules/packages/components/package-form-itinerary.tsx, modules/packages/components/package-form-media.tsx | - | A | AC1 | done |
| T4 | setup: `lib/catalog-action.ts` (`CatalogResult`, `catalogFail`, `runAdminAction`) + test | lib/catalog-action.ts, lib/catalog-action.test.ts | - | A | AC3 | done |
| T5 | setup: `hasSlugChars` en `lib/slug.ts` + test | lib/slug.ts, lib/slug.test.ts | - | A | AC2 | done |

### Phase 2 — Mover `ImageUploadField` y helpers de Postgres (sin cambio de comportamiento)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T2 | setup: mover `ImageUploadField` a `components/shared` y `isAllowedImageUrl`/`IMAGE_URL_RE` a `lib/blob/image-url.ts` (+ test); `package-schema.ts` los re-exporta; actualizar imports en media e itinerario | components/shared/image-upload-field.tsx, modules/packages/components/image-upload-field.tsx, lib/blob/image-url.ts, lib/blob/image-url.test.ts, modules/packages/schemas/package-schema.ts, modules/packages/components/package-form-media.tsx, modules/packages/components/package-form-itinerary.tsx | T1 | A | AC1 | done |
| T3 | setup: `findPgError`/`isFkViolation`/`isUniqueViolation` a `lib/db/pg-errors.ts` (+ test); `package-write.ts` los re-exporta | lib/db/pg-errors.ts, lib/db/pg-errors.test.ts, modules/packages/utils/package-write.ts | - | A | AC1 | done |

Nota: T1 y T2 están en fases distintas porque ambos editan `package-form-media.tsx` y `package-form-itinerary.tsx` (una fase no puede repartir un archivo entre dos tareas). `tsc` queda en verde al cierre de cada una.

### Phase 3 — Categorías (`/admin/categorias`)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T6 | `categoryInputSchema` + `category-manage-service` (list/create/update/delete) y tests (BD en el service) | modules/packages/schemas/category-schema.ts, modules/packages/schemas/category-schema.test.ts, modules/packages/services/category-manage-service.ts, modules/packages/services/category-manage-service.test.ts | T3, T4, T5 | - | AC4, AC5, AC6, AC7, AC8 | done |
| T7 | `category-actions` (`runAdminAction` -> Zod -> service -> `updateTag` x2) y test | modules/packages/actions/category-actions.ts, modules/packages/actions/category-actions.test.ts | T6 | - | AC9 | done |
| T8 | `AdminCategoriesPage` (server) y `CategoryManager` (cliente: alta, renombrar en línea, borrar con confirmación, errores) | modules/packages/components/admin-categories-page.tsx, modules/packages/components/category-manager.tsx | T7 | - | AC25, AC27, AC28 | done |
| T9 | Cableado: ruta `/admin/categorias`, export en el index de `packages` y link "Categorías" (**compartido con 026/027**) | app/(admin)/admin/categorias/page.tsx, modules/packages/index.ts, modules/admin/components/admin-nav-links.ts | T8 | - | AC25, AC26, AC29 | done |

### Phase 4 — Núcleo de destinos (schema y services; sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T10 | `destinationInputSchema` + `DestinationInput` + `destinationIdSchema` y test | modules/destinations/schemas/destination-schema.ts, modules/destinations/schemas/destination-schema.test.ts | T2, T5 | - | AC10, AC11, AC12, AC13 | done |
| T11 | Tipos de gestión, helpers puros de escritura y `destination-manage-service` (create/update/delete en transacción) con tests | modules/destinations/types/destination-manage.ts, modules/destinations/utils/destination-write.ts, modules/destinations/utils/destination-write.test.ts, modules/destinations/services/destination-manage-service.ts, modules/destinations/services/destination-manage-service.test.ts | T3, T4, T10 | - | AC14, AC15, AC16 | done |
| T12 | `destination-admin-service`: `listAdminDestinations` y `getDestinationForEdit` con test (BD) | modules/destinations/services/destination-admin-service.ts, modules/destinations/services/destination-admin-service.test.ts | T10, T11 | B | AC17 | done |
| T13 | `destination-actions` (3 actions, `updateTag` x2 en `ok`) y test | modules/destinations/actions/destination-actions.ts, modules/destinations/actions/destination-actions.test.ts | T11 | B | AC18, AC19 | done |

Nota: T12 depende de T11 solo por el archivo de tipos `destination-manage.ts` (`DestinationAdminItem`, `DestinationEdit`); T12 y T13 no comparten archivos y pueden correr en paralelo tras T11 (mismo `Group` B).

### Phase 5 — Formulario de destinos (sin enrutar)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T14 | `DestinationFormValues` y conversiones valores <-> input, `emptyFormValues` y test | modules/destinations/utils/destination-form.ts, modules/destinations/utils/destination-form.test.ts | T10 | - | AC22, AC24 | done |
| T15 | Secciones Datos básicos / Cómo llegar y consejos / Portada y Clima por mes | modules/destinations/components/destination-form-basics.tsx, modules/destinations/components/destination-form-climate.tsx | T1, T2, T14 | B | AC22, AC23, AC28 | done |
| T16 | Secciones Lugares imperdibles y Preguntas frecuentes (listas dinámicas) | modules/destinations/components/destination-form-sights.tsx, modules/destinations/components/destination-form-faqs.tsx | T1, T2, T14 | B | AC22, AC23, AC28 | done |
| T17 | `DestinationForm` (cliente: estado, validación con el schema, `Alert` resumen, llamada a la action, `router.replace`) y `DestinationEditor` (server: `requireRole`, carga, `notFound`) | modules/destinations/components/destination-form.tsx, modules/destinations/components/destination-editor.tsx | T12, T13, T15, T16 | - | AC21, AC24, AC27, AC28 | done |

### Phase 6 — Lista y rutas de destinos
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T18 | `AdminDestinationsList` (server: lista, estado vacío, "Ver en el sitio" condicional) y `DestinationRowActions` (cliente: eliminar con `ConfirmActionDialog`, motivo de bloqueo) | modules/destinations/components/admin-destinations-list.tsx, modules/destinations/components/destination-row-actions.tsx | T13, T12 | - | AC20, AC27, AC28 | done |
| T19 | Cableado: 3 rutas, exports del módulo (`AdminDestinationsList`, `DestinationEditor`, `destinationIdSchema`) y link "Destinos" (**compartido con 026/027**) | app/(admin)/admin/destinos/page.tsx, app/(admin)/admin/destinos/nuevo/page.tsx, app/(admin)/admin/destinos/[id]/editar/page.tsx, modules/destinations/index.ts, modules/admin/components/admin-nav-links.ts | T17, T18 | - | AC21, AC26, AC29 | done |

Nota: la verificación manual completa (crear -> añadir paquete publicado -> ver `/destinos/<slug>` -> renombrar -> intentar borrar -> borrar uno sin paquetes) se hace al cerrar la fase 6; la de categorías al cerrar la fase 3.

## Cambios durante la implementación
- `lib/catalog-action.ts` se partió: tipos, `CATALOG_MESSAGES` y `catalogFail` viven en `lib/catalog-result.ts` (puro, lo importan componentes cliente); `catalog-action.ts` los re-exporta y deja solo `runAdminAction` (`requireRole`). Motivo: un componente `"use client"` no puede importar `requireRole` (Clerk server).
- `toFieldErrors` se movió a `lib/field-errors.ts`; `modules/packages/utils/field-errors.ts` lo re-exporta. Motivo: `destinations` (cliente) no puede importar el barrel de `packages`.
- `DestinationForm` no recibe `mode`: se deduce de `destinationId`.
- Pendiente para cerrar la rama: `npm run build`, tests de integración con BD y verificación manual (ver Plan).

## Open questions (resueltas: se aprobó con los defaults indicados en cada una)
1. **¿Categorías en `modules/packages` o en `modules/destinations`?** Default de la spec: `packages`, porque ARCHITECTURE §3 le asigna la tabla `categories` y `getCategories` ya vive ahí. La tarjeta lista solo `modules/destinations` como relacionado. Si prefieres todo en `destinations`, cambian solo las rutas de archivos de T6–T9 (y se evita tocar `modules/packages/index.ts`, reduciendo colisión con 027).
2. **Borrar una categoría usada por paquetes**: default = bloquear (`HAS_PACKAGES`). La alternativa (ERM: `cascade`) la quitaría en silencio de todos los paquetes. ¿Confirmas bloquear?
3. **Slug fijo tras crear** (afecta URLs públicas y filtros) y duplicado = error en el nombre, sin sufijo `-2`. ¿Conforme, o quieres poder editarlo/elegirlo al crear?
4. **Portada del destino obligatoria** (la hero la usa siempre; en BD es nullable). ¿Conforme? También: clima todo-o-nada (la página oculta la sección si faltan meses), tope de 12 lugares y 20 preguntas, y longitudes propuestas (constantes del schema, fáciles de cambiar).
5. **`admin` y `super_admin` con los mismos permisos** (ERM: CRUD ambos). Confirmado por ERM; se anota por si hubiera algo exclusivo de `super_admin` que no esté documentado.
6. **Mover `ImageUploadField` y `FormSection` a `components/shared`** toca 4–6 archivos del formulario de paquetes (T1/T2). Si 027 va a reutilizar `PackageForm` y prefieres cero riesgo de conflicto, la alternativa es duplicar ambos en `destinations` (viola DRY). Default: mover.
7. **`db:seed` sobrescribe ediciones del admin** en los 8 destinos sembrados (upsert con `onConflictDoUpdate`). ¿Aceptable (solo dev/demo) o se pide cambiar el seed a `DoNothing` en otra tarjeta?
8. **Orden de lugares y preguntas**: v1 sin reordenar (el orden de la lista es el orden público; para cambiarlo se quita y se vuelve a agregar). ¿Basta o quieres botones subir/bajar?
