# CRUD de paquetes del operador (/operador/paquetes) y guías

- Module: packages
- Status: approved
- Approved by: leandro291 (2026-10-26)
- Mode: SDD

## Goal
Tarjeta Trello 021. El operador (`organizer`) crea, edita, publica/despublica y borra sus paquetes y tours desde `/operador/paquetes`, con itinerario, inclusiones, imágenes y categorías, y gestiona sus guías en `/operador/guias` (las usará 022, salidas). Al publicar o cambiar algo visible se invalida la caché del catálogo. El service filtra siempre por `organizer_id`.

## Scope
- In:
  - Rutas `/operador/paquetes` (lista), `/operador/paquetes/nuevo`, `/operador/paquetes/[id]/editar`; crear y editar comparten un solo formulario.
  - Acciones: crear, editar, publicar/pasar a borrador, borrar (con restricciones de FK).
  - CRUD de guías (`guides`) en `/operador/guias`.
  - Regla nueva por estado del operador (`pending`: solo borradores; `suspended`: nada de escritura), en el service.
  - Invalidación de `CACHE_TAGS.packages` desde las Server Actions.
  - Links "Paquetes" y "Guías" en `ORGANIZER_NAV_LINKS`.
  - Helpers `slugify` (lib/slug.ts) y `parseSolesToCents` / `centsToSolesInput` (lib/money.ts).
  - Componentes shadcn nuevos: `textarea`, `alert-dialog`; y `components/shared/confirm-action-dialog.tsx`.
- Out:
  - Salidas (`departures`) y asignar guía a una salida: tarjeta 022. El formulario de paquete **no tiene selector de guía**: la guía se elige por salida.
  - Ofertas, reservas del operador, KPIs.
  - Vista/edición de admin y `super_admin` sobre paquetes ajenos (tarjeta 027: reusará el service con otro alcance).
  - Selector de mapa para coordenadas (solo inputs numéricos opcionales).
  - Reordenar imágenes, itinerario por arrastre, editor rico de texto.
  - Borrar blobs huérfanos de Vercel Blob (ya aceptado en la spec de `lib/blob`).
  - Cambiar el slug después de crear, duplicar paquetes, historial/versiones.
  - Cambios de schema de BD o migraciones; dependencias npm nuevas.
  - Crear/editar categorías y destinos (028).

## Decisiones aprobadas
Fijadas por el usuario antes de esta spec; no se reabren.
1. **Rutas**: `/operador/paquetes`, `/operador/paquetes/nuevo`, `/operador/paquetes/[id]/editar`; un solo componente de formulario para crear y editar. Se agrega el link "Paquetes" a `ORGANIZER_NAV_LINKS`.
2. **Operador `pending`**: crea/edita borradores pero **no publica** hasta que un admin lo active. **`suspended`**: no escribe nada. Regla nueva (019 solo muestra aviso); vive en el service.
3. **Guías**: 021 incluye el CRUD de guías del operador (`guides`: `id`, `organizer_id`, `name`, `phone`) para que 022 las use. Sin guía por defecto en el paquete (sin columnas nuevas). El formulario de paquete no tiene selector de guía; la gestión es una página propia, `/operador/guias`.
4. **Validación**: un borrador **también** debe estar completo; el formulario valida todo siempre y `draft`/`published` solo difieren en visibilidad. El schema Zod de esta spec es la fuente (en BD `description` y `cover_image_url` son nullable, la regla de negocio las exige).
5. **Publicar sin salidas** está permitido; la UI muestra un aviso (las salidas llegan en 022).
6. **Slug** automático desde el título, sufijo `-2`, `-3` si colisiona, fijo tras crearlo; se reutiliza `lib/slug.ts`.
7. **Borrado real con restricción**: `bookings.package_id`, `departures.package_id` y `offers.package_id` son `onDelete: restrict`; con reservas se bloquea con "tiene reservas, pásalo a borrador". `package_categories/images/itinerary_days/inclusions` son `cascade`.
8. **Precio en soles** (`price_cents`, `currency` PEN fija).
9. **Coordenadas** (`meeting_lat/lng` y `lat/lng` por día): inputs numéricos opcionales, sin mapa; rangos lat −90..90, lng −180..180.
10. **Imágenes**: sin reordenar; orden de subida + botón quitar; `alt` texto opcional por imagen; crédito vía `uploadImage` (`lib/blob/upload-image-action.ts`); la UI de archivo/preview va en 021.
11. **Caché**: invalidar `CACHE_TAGS.packages` al publicar, al editar uno ya publicado, al despublicar y al borrar, con el patrón `"use cache"`/`cacheTag` existente.
12. **Alcance**: el service filtra siempre por `organizer_id` derivado del organizer de la sesión, nunca del cliente; admin/super_admin fuera de esta tarjeta; un paquete ajeno se trata como inexistente (not found), no 403.

## Decisiones técnicas (se aprueban con la spec)
- **T1. Ubicación**: todo en `modules/packages` (ARCHITECTURE §3 lista `guides` bajo `packages`; un módulo `guides` para una tabla de 4 columnas sería ceremonia). Si `departures` (022) crece, se evalúa separarlo entonces. El módulo `packages` importa `getCurrentOrganizer` desde la API pública de `organizers` (`index.ts`, hoy solo exporta componentes: se agrega ese export); `organizers` no importa nada de `packages`.
- **T2. Invalidación = `updateTag(CACHE_TAGS.packages)`** dentro de las Server Actions. Verificado en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md`: `updateTag(tag: string): void` solo se puede llamar desde Server Actions, expira el dato de inmediato y la siguiente request espera datos frescos (read-your-own-writes: el operador publica y ve el sitio actualizado). `revalidateTag(tag, "max")` (stale-while-revalidate, para route handlers/webhooks; la firma de 1 argumento es el comportamiento legado) no aplica: todas las escrituras entran por Server Actions. Si un día 027/webhooks escriben fuera de una action, ahí se usa `revalidateTag(tag, "max")`.
- **T3. Qué tags se tocan: solo `packages`.** Verificado con grep de `cacheTag`: `getFeaturedPackages`, `getPackages`, `getPackageBySlug`, `getTours` (`package-service`, `package-detail-service`, `tour-service`), `getDestinations` (`destination-service`, tags `destinations`+`packages`) y `getOffers` (`offer-service`, tags `offers`+`packages`) ya llevan `packages`. `categories` no cambia (no hay CRUD de categorías), `departures` y `offers` tampoco (no se escriben aquí). El panel del operador no usa `"use cache"`: lee la BD directo.
- **T4. Atomicidad**: `lib/db` usa `drizzle-orm/neon-serverless` con `Pool` (WebSocket), **no** Neon HTTP, y `db.transaction` ya se usa (`booking-service.ts`, `stripe-webhook-repository.ts`). Crear/editar/borrar se hacen en una transacción; al editar se reemplazan las hijas (delete + insert de itinerario, inclusiones, imágenes y categorías) dentro de la misma transacción.
- **T5. Envío del formulario**: estado cliente (`useState`) y llamada **directa con objeto tipado** a la Server Action (`createPackageAction(input)`), con `useTransition` para el pending. No `FormData` ni `useActionState`: itinerario, inclusiones e imágenes son arrays dinámicos, y serializar con `name="itinerary.0.title"` o con JSON en un campo oculto agrega un parser sin ganancia. Las Server Actions aceptan objetos serializables. El mismo `packageInputSchema` valida en cliente (errores inmediatos, sin round-trip) y **siempre de nuevo en servidor** (`safeParse` de `unknown`). Los campos numéricos del formulario son strings (permiten vacío) y `toPackageInput` los convierte antes de validar.
- **T6. Errores de negocio como resultado, no como excepción** (patrón de `uploadImage`): `{ ok: false, code, message, fieldErrors? }`. Solo `AuthError` y fallos inesperados de BD (capturados en la action y devueltos como `UNKNOWN` con `console.error` de texto fijo, sin datos del usuario) escapan de esa regla.
- **T7. Borrado bloqueado: pre-chequeo + captura de 23503.** El service cuenta primero reservas, salidas y ofertas del paquete (una consulta) y devuelve el motivo con prioridad reservas > salidas > ofertas, para dar un mensaje determinista y específico (Postgres reporta una FK arbitraria si fallan varias). Aun así envuelve el `delete` en `try/catch` y traduce el error de FK (`code === "23503"`, también en `error.cause`, porque Drizzle envuelve el error de `pg`) a `HAS_DEPENDENCIES` con mensaje genérico, para la carrera "alguien reservó entre el chequeo y el delete".
- **T8. Imágenes permitidas en el schema**: URL `https` con host `*.public.blob.vercel-storage.com` (lo que devuelve `uploadImage`) **o** ruta `/seed/<archivo>` (las fotos sembradas por `lib/db/seed` son archivos locales; sin esto no se podría editar un paquete sembrado). Cualquier otra cosa es inválida: el cliente no puede guardar URLs arbitrarias que rompan `next/image` (solo el host de Blob está en `remotePatterns`).
- **T9. Portada y galería**: portada **obligatoria** (la usan tarjeta, OG y fallback de galería); galería **opcional, 0–12** (`PackageDetail` ya cae a la portada si `images` está vacío, `package-detail.tsx:81`); imagen por día **opcional**. La portada no tiene crédito en BD (`packages` no tiene columna): el crédito solo se captura en galería. Una portada que quiera crédito también va a la galería.
- **T10. Guías**: pueden crearlas/editarlas operadores `active` y `pending` (no son visibles al público ni publican nada); `suspended` no. Borrar una guía asignada a salidas es válido: `departures.guide_id` es `ON DELETE SET NULL`; el diálogo de confirmación lo avisa.

## Reuse
- Reuse: `modules/packages/services/package-service.ts` (`getCategories`, cacheado con tag `categories`) — opciones de categorías del formulario; `isPublished`/patrón `"use cache"` de lectura pública no se tocan.
- Reuse: `modules/packages/utils/package-detail.ts` (`formatLanguages`) y `utils/package-utils.ts` (`formatDuration`) — etiquetas de idioma/duración en la lista.
- Reuse: `modules/organizers` — `getCurrentOrganizer` (por request, con `requireRole("organizer")`), `OrganizerShell`/layout con `OrganizerStatusNotice` (aviso `pending`/`suspended` ya está en el layout; la tarjeta solo agrega bloqueo funcional), `ORGANIZER_NAV_LINKS`/`isActiveNavLink`.
- Reuse: `lib/auth/require-role.ts` (`AuthError`); `lib/blob/upload-image-action.ts` (`uploadImage(formData)`, `UploadImageResult`, tope 4 MiB — el cliente valida antes); `lib/cache-tags.ts`; `lib/db` (`db.transaction`, tablas `packages`, `package_*`, `categories`, `guides`, `departures`, `bookings`, `offers`, `destinations`); `lib/slug.ts` (`isValidSlug` valida el resultado); `lib/money.ts` (`formatPen` para mostrar precios en la lista).
- Reuse (patrón): `modules/newsletter/actions/subscribe-action.ts` (parse Zod en el borde, `try/catch` con log de texto fijo) y su test con `vi.mock` del service; tests de `lib/blob/*` para el mock de `requireRole`; tests condicionados `describe.skipIf(!process.env.DATABASE_URL)` con import dinámico para services con BD.
- Reuse: `components/ui` — `alert`, `badge`, `button`, `checkbox`, `field`, `input`, `label`, `native-select` (destino), `separator`; `components/shared/status-badge.tsx` (`published` → `confirmed` "Publicado"; `draft` → `neutral` "Borrador").
- Extend: `lib/slug.ts` — `slugify(text, maxLength = 80)`; `lib/money.ts` — `parseSolesToCents`, `centsToSolesInput`.
- Extend: `modules/organizers/components/organizer-nav-links.ts` (+ su test, que hoy afirma que solo existe "/operador": se actualiza) — links "Paquetes" y "Guías".
- Extend: `modules/organizers/index.ts` — exporta `getCurrentOrganizer`.
- Extend: `modules/packages/index.ts` — exports de las páginas nuevas.
- New (shadcn, `npx shadcn@latest add`, base-nova/`@base-ui/react`): `textarea`, `alert-dialog` (confirmar borrado). Verificados con `npx shadcn@latest search @shadcn`. **No** se agregan `card` (la tarjeta del panel es `rounded-card bg-surface shadow-card`, como `OrganizerProfileCard`), `select` (se usa `NativeSelect`, ya instalado), `table` (lista semántica `<ul>` + filas) ni `dialog` (`alert-dialog` cubre la confirmación). Ya instalados y no se vuelven a agregar: `sheet`, `checkbox`, `field`, `native-select`.
- New: `components/shared/confirm-action-dialog.tsx` — dos usos (borrar guía y borrar paquete), por eso va en `shared` y no en el módulo (DRY con 2 usos). Props mínimas: ver Contracts.
- New: `modules/packages/{types,schemas,services,actions,utils,components}` de gestión — no existe nada de escritura de paquetes ni de guías; los servicios existentes son de lectura pública y cacheados.
- Verificado y descartado: `modules/destinations.getDestinations` solo devuelve destinos con paquetes publicados (no sirve para elegir destino de un paquete nuevo) → consulta propia `getManageOptions`. `lib/slug.ts` solo tiene `isValidSlug`, no hay `slugify`. `lib/money.ts` solo formatea, no parsea. No hay `Textarea` ni `AlertDialog` en `components/ui`. Sin `react-hook-form`/`@hookform` ni `sonner` instalados: no se agregan (estado cliente + `Alert` en línea).

## Acceptance criteria

### Guías
- AC1: `/operador/guias` lista las guías del operador (nombre y teléfono), ordenadas por nombre. Permite agregar una guía, editarla en línea y eliminarla con confirmación (`alert-dialog`). Con 0 guías muestra estado vacío con el formulario de alta. Un usuario sin fila en `organizers` ve el estado vacío "Aún no tienes un perfil de operador" (patrón AC6 de 019) sin formularios.
- AC2: Validación de guía: `name` con `trim`, 2–80 caracteres; `phone` con `trim`, formato `^\+?[0-9][0-9\s()-]{5,19}$` (6–20 caracteres). Errores por campo en español.
- AC3: El service de guías **siempre** filtra por `organizer_id` del `scope`: leer/crear/editar/borrar una guía de otro operador devuelve `NOT_FOUND` (nunca 403) y no modifica filas. El `organizer_id` nunca viene del cliente.
- AC4: Estado del operador en guías: `active` y `pending` pueden crear/editar/borrar; `suspended` recibe `ORGANIZER_SUSPENDED` y no se escribe nada (la UI deshabilita los controles). El diálogo de borrar avisa que las salidas con esa guía quedarán sin guía.

### Regla de escritura por estado
- AC5: `getWriteBlock(status, { publishing })` devuelve `null` o un código: `suspended` → `ORGANIZER_SUSPENDED` (siempre); `pending` con `publishing: true` → `ORGANIZER_PENDING`; `pending` con `publishing: false` y `active` → `null`. `MANAGE_MESSAGES` tiene un mensaje en español no vacío para cada `ManageErrorCode`.

### Schema y reglas de datos del paquete
- AC6: `packageInputSchema` exige: `title` (3–100, `trim`), `blurb` (10–200), `description` (30–5000), `destinationId` (uuid), ≥1 `categoryIds` (uuid, ≤10, sin repetidos), `priceCents` entero 100–10 000 000 (S/ 1 a S/ 100 000), `coverImageUrl`, ≥1 día de itinerario, `kind`, `maxGroupSize` (entero 1–100), ≥1 `languages` (valores `es` | `en`, sin repetidos) y `status` (`draft` | `published`). Un borrador con cualquiera de estos vacíos es **inválido** (decisión 4).
- AC7: Según `kind`: **`package`** exige `durationDays` (entero 1–30) y `nights` (entero 0–`durationDays`) y normaliza `durationHours`/`startTime` a `null`. **`day_tour`** exige `durationHours` (entero 1–24) y `startTime` (`HH:MM` 24 h) y normaliza `durationDays = 1`, `nights = 0`. Se respetan los CHECK de la tabla (`price_cents >= 0`, `duration_days >= 1`, `nights >= 0`, `max_group_size > 0`).
- AC8: Opcionales: `meetingPoint` (≤200; `""` → `null`), `meetingLat`/`meetingLng`, y por día `transportLeg` (≤100), `imageUrl`, `lat`/`lng`. Latitud −90..90, longitud −180..180; lat y lng van **juntas o ambas vacías** (par incompleto es error en el campo faltante). Vacío se normaliza a `null`.
- AC9: Itinerario: 1 a `durationDays` días (en `day_tour`, máx. 1); cada día con `title` (3–100), `description` (10–1500) y `place` (2–100). `day_number` no lo envía el cliente: se asigna 1..n según el orden. Inclusiones: `included` y `excluded`, hasta 30 ítems cada una, cada uno 2–150 caracteres tras `trim`, sin ítems vacíos; ambas listas pueden estar vacías.
- AC10: Imágenes: toda URL (portada, galería, día) debe cumplir T8; galería ≤12 ítems con `alt` (≤200, opcional → `null`) y `credit` (≤200, opcional → `null`). Una URL `http`, de otro host o `javascript:` es inválida.
- AC11: `toFieldErrors(zodError)` devuelve `Record<string, string>` con la clave = path unido por `.` (`itinerary.0.title`) y el primer mensaje de cada path. Todos los mensajes del schema están en español.
- AC12: `parseSolesToCents("1290")` → `129000`; `"1290.5"` → `129050`; `"1290,50"` → `129050`; `" 95 "` → `9500`; sin errores de coma flotante (`"19.99"` → `1999`); `""`, `"abc"`, `"-5"`, `"1.234"` (3 decimales) → `null`. `centsToSolesInput(129000)` → `"1290"`, `12050` → `"120.50"`, `9500` → `"95"`. `slugify("Machu Picchu 3 días")` → `machu-picchu-3-dias`; quita tildes y ñ → n, colapsa separadores, sin guiones en los bordes, máx. 80 caracteres, y para texto sin letras ni dígitos devuelve `"paquete"`. El resultado siempre cumple `isValidSlug`.

### Service de paquetes (alcance propio)
- AC13: `createPackage(scope, input)`: en **una transacción** inserta `packages` (`organizer_id = scope.id`, `currency = "PEN"`, `status = input.status`), `package_categories`, `package_images` (`sort_order` 0..n), `package_itinerary_days` (`day_number` 1..n), `package_inclusions` (`kind` + `sort_order` por lista). Si cualquier insert falla no queda nada. Devuelve `{ id, slug, catalogChanged }` con `catalogChanged = status === "published"`.
- AC14: Slug: base = `slugify(title)`; si ya existe (en **cualquier** organizador: `slug` es único global) se usa `-2`, `-3`, … el primero libre (`pickAvailableSlug`). Ante una violación de unicidad por carrera (`23505` sobre `packages_slug_unique`) se reintenta hasta 3 veces recalculando; si persiste devuelve `UNKNOWN`. El slug no cambia en `updatePackage`.
- AC15: `updatePackage(scope, id, input)`: en una transacción, `select ... where id and organizer_id = scope.id for update`; sin fila → `NOT_FOUND` (paquete ajeno = inexistente) y no escribe nada. Actualiza la fila (nunca `organizer_id` ni `slug`), borra e inserta de nuevo las 4 hijas. Devuelve `catalogChanged = (estado anterior === "published") || (input.status === "published")`.
- AC16: Regla de estado en create/update: se aplica `getWriteBlock(scope.status, { publishing: input.status === "published" })` antes de escribir. Operador `pending` puede guardar con `status: "draft"` (incluso sobre un paquete que estaba `published`, que pasa a borrador) pero no con `"published"` (`ORGANIZER_PENDING`); `suspended` no guarda nada. En ambos casos no se modifica ninguna fila.
- AC17: `setPackageStatus(scope, id, status)`: mismo filtro por `organizer_id` y la misma regla (publicar exige `active`; despublicar lo permite a `pending`; `suspended` no puede). Devuelve `catalogChanged = estado anterior !== status`. Si ya tenía ese estado, es un no-op sin error y `catalogChanged: false`.
- AC18: `deletePackage(scope, id)`: ajeno/inexistente → `NOT_FOUND`; `suspended` → `ORGANIZER_SUSPENDED`; con reservas → `HAS_BOOKINGS` ("tiene reservas, pásalo a borrador"); sin reservas pero con salidas → `HAS_DEPARTURES`; sin lo anterior pero con ofertas → `HAS_OFFERS`; FK violada en el `delete` por carrera → `HAS_DEPENDENCIES`. En todos los bloqueos no se borra nada. Sin bloqueos borra el paquete y por cascade sus hijas; devuelve `catalogChanged = (estado era "published")`.
- AC19: `listOwnPackages(organizerId)` devuelve solo paquetes con ese `organizer_id` (draft y published), más recientes primero, con `departureCount`; `getOwnPackageForEdit(organizerId, id)` devuelve `null` si el id no existe **o** es de otro operador, y si existe devuelve `values` (forma de `PackageInput`) con categorías, imágenes, itinerario e inclusiones ordenadas, y `departureCount`.

### Actions
- AC20: Cada action (`createPackageAction`, `updatePackageAction`, `setPackageStatusAction`, `deletePackageAction` y las de guías) llama primero a `getCurrentOrganizer()` (que ejecuta `requireRole("organizer")`): sin sesión lanza `AuthError("UNAUTHENTICATED")`, con rol `customer` `AuthError("FORBIDDEN")`; es lo único que lanza. Sin fila en `organizers` → `{ ok: false, code: "NO_ORGANIZER" }` sin llamar al service. El `organizerId` jamás se lee del input: se toma de `getCurrentOrganizer()`; un campo `organizerId` extra en el input se ignora (Zod lo descarta).
- AC21: El input de las actions es `unknown` y se revalida con Zod en servidor: inválido → `{ ok: false, code: "INVALID_INPUT", message, fieldErrors }` sin llamar al service. El `id` de la URL se valida con `z.uuid()`; inválido → `INVALID_INPUT`. Los códigos de negocio del service pasan al resultado con su `message` de `MANAGE_MESSAGES`. Un error inesperado de BD → `{ ok: false, code: "UNKNOWN" }` con `console.error` de texto fijo (sin título, ids ni mensaje del error).
- AC22: **Invalidación de caché**: tras un resultado `ok` con `catalogChanged: true` la action llama exactamente una vez a `updateTag(CACHE_TAGS.packages)`; con `catalogChanged: false` o `ok: false` **no** la llama. Resultado: se invalida al publicar (crear/editar/estado), al editar un paquete ya publicado, al despublicar y al borrar uno publicado; guardar un borrador sobre un borrador y borrar un borrador no tocan el catálogo público. Las actions de guías no invalidan nada.

### Formulario y UI
- AC23: `/operador/paquetes/nuevo` y `/operador/paquetes/[id]/editar` renderizan el **mismo** `PackageForm`; en editar viene precargado con los datos guardados (precio en soles con `centsToSolesInput`). Un `id` que no es uuid, no existe o es de otro operador → `notFound()` (404). Ambas páginas usan `Suspense` con esqueleto simple (datos dinámicos con `cacheComponents`).
- AC24: Campos del formulario, por secciones: **Datos básicos** (tipo `package`/`day_tour`, título, resumen, descripción, destino con `NativeSelect` de todos los destinos, categorías con `Checkbox`, idiomas con `Checkbox`), **Precio y cupo** (precio en soles, cupo máx.), **Duración** (`package`: días y noches; `day_tour`: horas y hora de inicio; los campos del otro tipo se ocultan), **Punto de encuentro** (texto + lat/lng opcionales), **Imágenes** (portada obligatoria + galería), **Itinerario** (días, mínimo 1), **Incluye / No incluye**. No hay selector de guía.
- AC25: Listas dinámicas: itinerario (agregar/quitar día; con 1 solo día el botón de quitar está deshabilitado), inclusiones (agregar/quitar ítems por lista), galería (agregar imagen, quitar, editar `alt`). Cada fila tiene una clave estable en cliente (no el índice) que **no** se envía al servidor. Sin reordenar.
- AC26: Subida de imágenes: el control valida en cliente tipo (JPG/PNG/WebP) y tamaño ≤ 4 MiB antes de llamar a `uploadImage(formData)`; muestra "Subiendo…" y deshabilita el control mientras sube; en éxito guarda `url` (y `credit` en galería) y muestra la vista previa con `alt`; en `{ ok: false }` muestra su `message`; si la llamada falla sin resultado (p. ej. 413) muestra "No pudimos subir la imagen. Inténtalo de nuevo". El campo de crédito (opcional) se envía con la subida; el crédito guardado se ve en la fila y para cambiarlo se quita y se vuelve a subir.
- AC27: Botones: "Guardar borrador" (envía `status: "draft"`) y "Publicar" (CTA `accent`, envía `"published"`; en edición de un paquete ya publicado el segundo se llama "Guardar cambios" y existe "Pasar a borrador"). Ambos validan **todo** con el schema (decisión 4). Mientras la action está en curso ambos quedan deshabilitados (evita doble creación). Con operador `pending` "Publicar" está deshabilitado con el texto "Tu cuenta debe estar activa para publicar. Mientras tanto guarda como borrador."; con `suspended` todo el formulario queda en solo lectura con el texto "Tu cuenta está suspendida: no puedes modificar paquetes".
- AC28: Errores: cada campo inválido muestra su mensaje con `aria-invalid` y `aria-describedby`; al enviar con errores aparece un `Alert` resumen (`role="alert"`) con el número de errores y el foco/scroll va al primero. Errores del servidor (`fieldErrors` o `message`) se muestran igual. Tras un guardado correcto (crear o editar) se navega con `router.replace` a la lista `/operador/paquetes`, que es dinámica y muestra el cambio.
- AC29: **Aviso sin salidas**: en el formulario, si el paquete está publicado (o se va a publicar) y `departureCount === 0` se muestra un `Alert` informativo "Este paquete se publicará sin salidas: nadie podrá reservarlo hasta que agregues salidas." (en `nuevo` siempre que se elija publicar; en `editar` además como aviso persistente si ya está publicado sin salidas). En la lista, las filas `published` con 0 salidas muestran el chip "Sin salidas". No bloquea nada ni enlaza a 022.
- AC30: Lista `/operador/paquetes`: filas con portada (miniatura), título, destino, tipo/duración (`formatDuration`), precio (`formatPen`), `StatusBadge` (Publicado/Borrador) y acciones: "Editar", "Ver en el sitio" (solo `published`, a `/paquetes/<slug>`), "Publicar" / "Pasar a borrador" y "Eliminar" (confirmación con `alert-dialog`). Con 0 paquetes: estado vacío "Aún no tienes paquetes" con CTA "Crear paquete" a `/operador/paquetes/nuevo`; sin fila de `organizers`: estado vacío de 019. Encabezado con botón "Nuevo paquete" (un solo CTA `accent` por vista; en la lista de estado vacío el CTA es el del estado vacío y el del encabezado pasa a variante secundaria).
- AC31: Acciones de la lista: publicar/despublicar llama a `setPackageStatusAction` y actualiza la lista; borrar abre la confirmación con el título del paquete; si la action devuelve `HAS_BOOKINGS`/`HAS_DEPARTURES`/`HAS_OFFERS`/`HAS_DEPENDENCIES` el diálogo permanece abierto mostrando el `message` (p. ej. "Este paquete tiene reservas, no se puede eliminar. Pásalo a borrador para ocultarlo."); en éxito se cierra y la fila desaparece. `pending`: "Publicar" deshabilitado con tooltip/texto; `suspended`: todas las acciones de escritura deshabilitadas.
- AC32: El sidebar muestra "Paquetes" (`/operador/paquetes`) y "Guías" (`/operador/guias`), activos en la ruta y sus subrutas (`isActiveNavLink`); `/operador` sigue activo solo en la ruta exacta.
- AC33: Accesibilidad (DESIGN-SYSTEM): `<label>` visible en cada campo, 16 px mínimo, objetivos ≥ 44 px, foco visible, íconos decorativos con `aria-hidden`, estados con ícono + texto (`StatusBadge`), `alert-dialog` con foco atrapado y `Esc` cierra, `prefers-reduced-motion` respetado, sin `div` clicables, sin scroll horizontal a 390 px, imágenes con `alt`.
- AC34: `npx tsc --noEmit`, `npm run lint` y `npm test` en verde al cerrar cada fase.

## Contracts

### Estructura de archivos
```
modules/packages/
  types/package-manage.ts
  utils/manage-gate.ts            (+ .test.ts)
  utils/field-errors.ts           (+ .test.ts)
  utils/package-write.ts          (+ .test.ts)   # helpers puros del service de escritura
  utils/package-form.ts           (+ .test.ts)   # valores del formulario <-> input
  schemas/guide-schema.ts         (+ .test.ts)
  schemas/package-schema.ts       (+ .test.ts)
  services/guide-service.ts       (+ .test.ts)
  services/own-package-service.ts (+ .test.ts)   # lecturas del operador
  services/package-manage-service.ts (+ .test.ts)# escrituras
  actions/guide-actions.ts        (+ .test.ts)
  actions/package-actions.ts      (+ .test.ts)
  components/{guide-manager,guides-page,image-upload-field,package-form,package-form-basics,
    package-form-inclusions,package-form-itinerary,package-form-media,package-editor,
    own-packages-list,package-row-actions}.tsx
components/shared/confirm-action-dialog.tsx
app/(organizer)/operador/{guias,paquetes,paquetes/nuevo,paquetes/[id]/editar}/page.tsx
```
Convención del repo: tests colocados `*.test.ts` (Vitest incluye solo `**/*.test.ts`); los componentes `.tsx` no tienen test (SETUP §3).

### Tipos compartidos (`types/package-manage.ts`)
```ts
import type { organizerStatus } from "@/lib/db/schema/enums";

// Estructural: OrganizerProfile (modules/organizers) es asignable; no se importa su tipo.
export type OrganizerScope = { id: string; status: (typeof organizerStatus.enumValues)[number] };

export type ManageErrorCode =
  | "NO_ORGANIZER" | "ORGANIZER_SUSPENDED" | "ORGANIZER_PENDING"
  | "NOT_FOUND" | "INVALID_INPUT"
  | "HAS_BOOKINGS" | "HAS_DEPARTURES" | "HAS_OFFERS" | "HAS_DEPENDENCIES"
  | "UNKNOWN";

export type ManageResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: ManageErrorCode; message: string; fieldErrors?: Record<string, string> };
```
Los services devuelven `ManageResult` para errores de negocio; los errores inesperados de BD se lanzan y los captura la action.

### `utils/manage-gate.ts`
```ts
export function getWriteBlock(
  status: OrganizerScope["status"],
  opts: { publishing: boolean },
): "ORGANIZER_SUSPENDED" | "ORGANIZER_PENDING" | null;

export const MANAGE_MESSAGES: Record<ManageErrorCode, string>;
// ORGANIZER_SUSPENDED: "Tu cuenta está suspendida: no puedes modificar paquetes."
// ORGANIZER_PENDING:   "Tu cuenta debe estar activa para publicar. Guarda como borrador mientras tanto."
// NOT_FOUND:           "No encontramos ese elemento."
// NO_ORGANIZER:        "Aún no tienes un perfil de operador."
// INVALID_INPUT:       "Revisa los campos marcados."
// HAS_BOOKINGS:        "Este paquete tiene reservas, no se puede eliminar. Pásalo a borrador para ocultarlo."
// HAS_DEPARTURES:      "Este paquete tiene salidas, no se puede eliminar. Pásalo a borrador para ocultarlo."
// HAS_OFFERS:          "Este paquete tiene ofertas, no se puede eliminar. Pásalo a borrador para ocultarlo."
// HAS_DEPENDENCIES:    "Este paquete tiene reservas, salidas u ofertas, no se puede eliminar. Pásalo a borrador para ocultarlo."
// UNKNOWN:             "No pudimos guardar los cambios. Inténtalo de nuevo."
```

### `utils/field-errors.ts`
```ts
import type { ZodError } from "zod";
export function toFieldErrors(error: ZodError): Record<string, string>; // AC11
```

### `schemas/guide-schema.ts`
```ts
export const guideSchema = z.object({
  name: z.string().trim().min(2, "...").max(80, "..."),
  phone: z.string().trim().regex(/^\+?[0-9][0-9\s()-]{5,19}$/, "Ingresa un teléfono válido, ej. +51 900 000 000"),
});
export type GuideInput = z.infer<typeof guideSchema>;
export type GuideDto = { id: string; name: string; phone: string };
```

### `schemas/package-schema.ts` (Zod 4)
```ts
export const PACKAGE_LANGUAGES = ["es", "en"] as const;
export const IMAGE_URL_RE: RegExp;            // T8
export const isAllowedImageUrl: (url: string) => boolean;

export type PackageInput = {
  kind: "package" | "day_tour";
  title: string; blurb: string; description: string;
  destinationId: string; categoryIds: string[];
  priceCents: number;
  durationDays: number; nights: number;            // day_tour => 1 y 0
  durationHours: number | null; startTime: string | null;   // package => null
  maxGroupSize: number; languages: ("es" | "en")[];
  meetingPoint: string | null; meetingLat: number | null; meetingLng: number | null;
  coverImageUrl: string;
  images: { url: string; alt: string | null; credit: string | null }[];
  itinerary: { title: string; description: string; place: string; transportLeg: string | null;
               imageUrl: string | null; lat: number | null; lng: number | null }[];
  included: string[]; excluded: string[];
  status: "draft" | "published";
};
export const packageInputSchema: z.ZodType<PackageInput, unknown>;
// z.object({...}) con refinements entre campos (nights <= durationDays, itinerario <= durationDays, lat/lng en par) y
// transform final que normaliza por `kind` y `""` -> null. Puede modelarse como discriminatedUnion("kind") o
// superRefine: el developer elige la sintaxis; el comportamiento es el de AC6-AC10.
export const packageIdSchema = z.uuid();
export const packageStatusSchema = z.enum(["draft", "published"]);
```
Nota Zod 4: los refinements a nivel de objeto no corren si ya hay errores de campo (se ven en una segunda pasada); es aceptable.

### Services
```ts
// services/guide-service.ts
export function listGuides(organizerId: string): Promise<GuideDto[]>;                    // order by name
export function createGuide(scope: OrganizerScope, input: GuideInput): Promise<ManageResult<{ id: string }>>;
export function updateGuide(scope: OrganizerScope, id: string, input: GuideInput): Promise<ManageResult>;
export function deleteGuide(scope: OrganizerScope, id: string): Promise<ManageResult>;
// update/delete: `where id = $1 and organizer_id = scope.id` + returning; 0 filas -> NOT_FOUND.

// services/own-package-service.ts   (sin "use cache": panel dinámico)
export type OwnPackageListItem = {
  id: string; slug: string; title: string; kind: "package" | "day_tour";
  status: "draft" | "published"; durationDays: number; priceCents: number;
  coverImageUrl: string | null; destinationName: string; departureCount: number;
};
export type OwnPackageEdit = { id: string; slug: string; values: PackageInput; departureCount: number };
export type ManageOptions = {
  destinations: { id: string; name: string; region: string }[];   // todos, por nombre
  categories: CategoryDto[];
};
export function listOwnPackages(organizerId: string): Promise<OwnPackageListItem[]>;
export function getOwnPackageForEdit(organizerId: string, id: string): Promise<OwnPackageEdit | null>;
export function getManageOptions(): Promise<ManageOptions>;   // categorías: reusa getCategories()

// services/package-manage-service.ts
export function createPackage(scope: OrganizerScope, input: PackageInput):
  Promise<ManageResult<{ id: string; slug: string; catalogChanged: boolean }>>;
export function updatePackage(scope: OrganizerScope, id: string, input: PackageInput):
  Promise<ManageResult<{ id: string; catalogChanged: boolean }>>;
export function setPackageStatus(scope: OrganizerScope, id: string, status: "draft" | "published"):
  Promise<ManageResult<{ catalogChanged: boolean }>>;
export function deletePackage(scope: OrganizerScope, id: string):
  Promise<ManageResult<{ catalogChanged: boolean }>>;
```
`utils/package-write.ts` (puro, testeable sin BD): `pickAvailableSlug(base, taken: string[]): string`; `toPackageRow(organizerId, input, slug)`; `toChildRows(packageId, input)` → `{ categories, images, itinerary, inclusions }`; `isFkViolation(error): boolean` y `isUniqueViolation(error, constraint?)` (revisan `error.code` y `error.cause?.code`).

### Actions (`"use server"`, solo exportan funciones async)
```ts
export type ActionResult<T = object> = ManageResult<T>;

// actions/package-actions.ts
export function createPackageAction(input: unknown): Promise<ActionResult<{ id: string }>>;
export function updatePackageAction(id: string, input: unknown): Promise<ActionResult>;
export function setPackageStatusAction(id: string, status: unknown): Promise<ActionResult>;
export function deletePackageAction(id: string): Promise<ActionResult>;

// actions/guide-actions.ts
export function createGuideAction(input: unknown): Promise<ActionResult<{ id: string }>>;
export function updateGuideAction(id: string, input: unknown): Promise<ActionResult>;
export function deleteGuideAction(id: string): Promise<ActionResult>;
```
Flujo de cada action de paquete: `organizer = await getCurrentOrganizer()` (lanza `AuthError`) → `null` → `NO_ORGANIZER` → validar `id`/`input` con Zod (`INVALID_INPUT` + `fieldErrors = toFieldErrors(...)`) → `try { result = await service(...) } catch { console.error("<action>: fallo inesperado"); return UNKNOWN }` → si `result.ok && result.catalogChanged` → `updateTag(CACHE_TAGS.packages)` (de `next/cache`) → devolver `result`. En fallos de negocio el `message` ya viene del service (`MANAGE_MESSAGES[code]`).

### `components/shared/confirm-action-dialog.tsx` (client)
```ts
type ConfirmActionDialogProps = {
  trigger: React.ReactElement;                  // botón que abre el diálogo (render prop de Base UI)
  title: string;
  description: React.ReactNode;
  confirmLabel: string;                         // p. ej. "Eliminar"
  onConfirm: () => Promise<{ ok: true } | { ok: false; message: string }>;
};
```
Mientras `onConfirm` corre, el botón de confirmar está deshabilitado y dice "Eliminando…"; en `ok: false` el diálogo queda abierto y muestra `message` en un `Alert` `role="alert"`; en `ok: true` se cierra. Botón de confirmar `variant="destructive"`.

### Formulario (`utils/package-form.ts`)
```ts
export type PackageFormValues = {      // todo texto, salvo booleanos/arrays: permite inputs vacíos
  kind: "package" | "day_tour";
  title: string; blurb: string; description: string;
  destinationId: string; categoryIds: string[];
  price: string;                       // soles, "1290.50"
  durationDays: string; nights: string; durationHours: string; startTime: string;
  maxGroupSize: string; languages: ("es" | "en")[];
  meetingPoint: string; meetingLat: string; meetingLng: string;
  coverImageUrl: string;
  images: { key: string; url: string; alt: string; credit: string }[];
  itinerary: { key: string; title: string; description: string; place: string; transportLeg: string;
               imageUrl: string; lat: string; lng: string }[];
  included: { key: string; text: string }[];
  excluded: { key: string; text: string }[];
};
export type FormErrors = Record<string, string>;      // claves: "title", "itinerary.0.title", "price"...
export type SectionProps = {
  values: PackageFormValues; errors: FormErrors; disabled: boolean;
  onChange: (patch: Partial<PackageFormValues>) => void;
};
export function emptyFormValues(): PackageFormValues;                 // 1 día de itinerario vacío, language ["es"]
export function toFormValues(input: PackageInput): PackageFormValues; // centsToSolesInput, keys nuevas
export function toPackageInput(values: PackageFormValues, status: "draft" | "published"): unknown;
//   convierte strings -> números/null (`parseSolesToCents`, "" -> null/NaN), descarta `key`; lo valida packageInputSchema
export function toFormErrors(fieldErrors: Record<string, string>): FormErrors; // `priceCents` -> `price`; resto igual
```

### Componentes cliente (props públicas)
```ts
// image-upload-field.tsx
type ImageUploadFieldProps = {
  label: string; disabled?: boolean; withCredit?: boolean;          // withCredit: input de crédito opcional (galería)
  onUploaded: (img: { url: string; credit: string | null }) => void;
  error?: string;
};
// package-form-{basics,inclusions,itinerary,media}.tsx: (props: SectionProps)
// package-form.tsx
type PackageFormProps = {
  mode: "create" | "edit";
  packageId?: string;                         // solo en edit
  initialValues: PackageFormValues;
  initialStatus: "draft" | "published";       // "draft" en create
  departureCount: number;                     // 0 en create
  options: ManageOptions;
  organizerStatus: OrganizerScope["status"];
};
// package-editor.tsx (server, async): `PackageEditor({ packageId?: string })` carga organizer + options (+ paquete en edit) y renderiza PackageForm o notFound()
// own-packages-list.tsx (server, async): lista, estados vacíos y avisos
// package-row-actions.tsx (client): publicar/despublicar/eliminar de una fila; props { item: OwnPackageListItem; organizerStatus }
// guides-page.tsx (server, async) + guide-manager.tsx (client): props { guides: GuideDto[]; organizerStatus }
```

### Rutas (`app/` solo routing; cada `page.tsx` delgado, `Suspense`, `metadata.title`)
| Ruta | Contenido |
| ---- | --------- |
| `/operador/paquetes` | `h1` "Paquetes" + `<Suspense><OwnPackagesList/></Suspense>` |
| `/operador/paquetes/nuevo` | `h1` "Nuevo paquete" + `<Suspense><PackageEditor/></Suspense>` |
| `/operador/paquetes/[id]/editar` | `await params`; `<Suspense><PackageEditor packageId={id}/></Suspense>`; `id` no uuid -> `notFound()` |
| `/operador/guias` | `h1` "Guías" + `<Suspense><GuidesPage/></Suspense>` |

### `modules/packages/index.ts` (agrega)
`OwnPackagesList`, `PackageEditor`, `GuidesPage`.
### `modules/organizers/index.ts` (agrega)
`export { getCurrentOrganizer } from "./services/current-organizer";`

### Nav (`organizer-nav-links.ts`)
```ts
[{ label: "Perfil", href: "/operador", icon: Building2 },
 { label: "Paquetes", href: "/operador/paquetes", icon: Package },   // lucide-react
 { label: "Guías", href: "/operador/guias", icon: UserRound }]
```
Cada link se agrega en la fase cuya página lo hace existir (D1 de 019: sin links a 404): "Guías" en Fase 2, "Paquetes" en Fase 5.

### Helpers de `lib`
```ts
// lib/slug.ts
export function slugify(text: string, maxLength = 80): string;
// lib/money.ts
export function parseSolesToCents(input: string): number | null;   // entero de céntimos, sin Number(float)
export function centsToSolesInput(cents: number): string;          // "1290" | "120.50"
```

### Estados de UI
| Estado | Dónde | Qué se ve |
| ------ | ----- | --------- |
| Sin fila de operador | lista, guías, editor | Tarjeta "Aún no tienes un perfil de operador" (sin formularios) |
| Lista vacía | `/operador/paquetes` | "Aún no tienes paquetes" + CTA "Crear paquete" |
| Guías vacías | `/operador/guias` | "Aún no tienes guías" + formulario de alta |
| `pending` | formulario y lista | Aviso global del layout (019) + "Publicar" deshabilitado con texto (AC27/AC31) |
| `suspended` | todo | Aviso global del layout + controles de escritura deshabilitados |
| Cargando | páginas | `Suspense` con esqueleto (bloques `animate-pulse`, `motion-reduce:animate-none`) |
| Error de validación | formulario | Mensaje por campo + `Alert` resumen |
| Error de servidor | formulario / diálogo | `Alert role="alert"` con `message` |
| Sin salidas | formulario y lista | `Alert` informativo / chip "Sin salidas" (AC29) |
| Confirmar borrado | lista, guías | `alert-dialog` con título del elemento; permanece abierto con el motivo si se bloquea |

## Edge cases
- **Paquete ajeno / inexistente / id mal formado**: `NOT_FOUND` en service (no revela existencia) y 404 en la página; nunca 403.
- **`pending` con un paquete ya publicado** (p. ej. un admin lo pasó a `pending` después): solo puede guardar como borrador (lo despublica) o "Pasar a borrador"; el formulario muestra "Publicar" deshabilitado. El borrado sigue permitido.
- **Cambiar `kind` en edición**: los campos del otro tipo se ocultan pero conservan su valor en estado; el schema normaliza (`day_tour` → 1 día/0 noches; `package` → sin horas ni hora de inicio). Un itinerario con más días que `durationDays` es inválido (AC9).
- **Disminuir `durationDays`** por debajo de los días del itinerario: error en el campo de duración con el máximo permitido; el operador quita días.
- **Doble clic en guardar**: botones deshabilitados durante `useTransition`; aun así, dos creaciones simultáneas producen slugs distintos (`-2`) por el reintento de AC14.
- **Colisión de slug por carrera**: reintento (máx. 3) y luego `UNKNOWN`.
- **Título con solo símbolos o emoji**: `slugify` devuelve `paquete` → `paquete`, `paquete-2`, …
- **Precio**: `"1290,50"` y `"1290.50"` valen lo mismo; 3 decimales o letras → error "Ingresa un precio válido, ej. 1290 o 1290.50". Rango S/ 1–S/ 100 000.
- **Subida con paquete sin guardar**: los blobs subidos y luego quitados o nunca guardados quedan huérfanos en Blob (límite aceptado en `lib/blob/upload-image.ts`).
- **Cuerpo > 4.5 MB**: Vercel responde 413 antes de la action; la UI valida ≤ 4 MiB en cliente y trata un fallo sin resultado como error genérico (AC26).
- **Paquetes sembrados**: cuyas imágenes son `/seed/*.jpg` se pueden editar (T8); si les faltan campos que el schema exige (p. ej. `description` nula), el operador los completa al guardar. Publicar/pasar a borrador desde la lista **no** re-valida completitud (no hay lectura completa en esa action; los borradores creados por 021 siempre están completos).
- **Estado del operador cambia durante la sesión**: `getCurrentOrganizer` lee la BD en cada request/action, no el token; la regla usa el estado fresco.
- **Borrado**: un paquete con `departures` sin reservas queda bloqueado por `HAS_DEPARTURES` aunque 021 no pueda borrar salidas (llegan en 022); mensaje guía a "pasar a borrador".
- **Borrar guía** asignada a salidas: `guide_id` pasa a `null`; el diálogo lo advierte. No hay chequeo de salidas futuras.
- **Guías duplicadas**: se permiten nombres repetidos (sin unique en la tabla); YAGNI.
- **Caché**: `updateTag` solo funciona dentro de Server Actions; las actions no se invocan desde route handlers. Si se invoca fuera de una action lanza error (el test de la action mockea `next/cache`).
- **`cacheComponents: true`**: leer sesión y BD en el panel es dato dinámico → siempre dentro de `Suspense`; `params` es una `Promise`.
- **Cadenas largas** (título, razón social): `break-words`; a 390 px sin scroll horizontal; filas de lista apilan acciones.
- **Tope de tamaños**: `Server Action` ya admite 4.5 MB (`bodySizeLimit`); el payload del paquete (solo texto y URLs) es muy inferior.

## Tests
Solo lógica de negocio (SETUP §3); sin tests de markup. Services con BD: `describe.skipIf(!process.env.DATABASE_URL)` + import dinámico (patrón del repo), con datos de prueba propios (organizador/ids de prueba) y limpieza en `afterAll`.
- `lib/slug.test.ts` (extiende) — AC12: `slugify` (tildes, ñ, espacios múltiples, símbolos, `"Machu Picchu 3 días"`, 80 caracteres, vacío → `paquete`, resultado siempre `isValidSlug`).
- `lib/money.test.ts` (extiende) — AC12: `parseSolesToCents` (enteros, 1 y 2 decimales, coma, espacios, `"19.99"` → 1999, inválidos → `null`) y `centsToSolesInput` (ida y vuelta).
- `modules/packages/utils/manage-gate.test.ts` — AC5: matriz de `getWriteBlock` (3 estados × `publishing`) y `MANAGE_MESSAGES` completo (toda la unión de códigos con texto no vacío).
- `modules/packages/utils/field-errors.test.ts` — AC11: primer mensaje por path, paths anidados y de arrays unidos con `.`.
- `modules/packages/schemas/guide-schema.test.ts` — AC2: límites de nombre, teléfono válido/ inválido, `trim`.
- `modules/packages/schemas/package-schema.test.ts` — AC6-AC10: paquete válido completo pasa; cada requerido ausente falla (título, blurb, descripción, destino, categorías, precio, portada, itinerario, idiomas, cupo); un borrador incompleto falla; límites de precio (99 falla, 100 pasa, 10 000 000 pasa, +1 falla), `nights > durationDays`, itinerario > días; `day_tour` sin horas o sin hora de inicio falla y normaliza 1/0; `package` normaliza horas/hora a `null`; lat/lng fuera de rango y par incompleto; URL de imagen: Blob https pasa, `/seed/x.jpg` pasa, `http://`, otro host y `javascript:` fallan; `""` → `null`; `organizerId`/`slug` extra descartados.
- `modules/packages/utils/package-write.test.ts` — AC13, AC14, AC18: `pickAvailableSlug` (libre, `-2`, `-3` si `base` y `base-2` ocupados, hueco), `toPackageRow` (organizer del argumento, `PEN`, status), `toChildRows` (`day_number` 1..n, `sort_order` por lista, kinds), `isFkViolation`/`isUniqueViolation` (código directo y en `cause`, otros códigos falsos).
- `modules/packages/utils/package-form.test.ts` — `toFormValues` ↔ `toPackageInput` ida y vuelta (precio, números vacíos → `null`, `key` descartada), `toFormErrors` (`priceCents` → `price`), `emptyFormValues` no pasa el schema (completitud) pero tiene 1 día.
- `modules/packages/services/guide-service.test.ts` (BD) — AC3, AC4: lista solo las propias; crear usa el `organizer_id` del scope; update/delete de guía ajena → `NOT_FOUND` y la fila no cambia; `suspended` bloquea y `pending` permite; borrar una guía con salida deja `departures.guide_id = null`.
- `modules/packages/services/own-package-service.test.ts` (BD) — AC19: `listOwnPackages` excluye paquetes de otro operador e incluye draft y published con `departureCount`; `getOwnPackageForEdit` ajeno/inexistente → `null`, propio → `values` completo y ordenado.
- `modules/packages/services/package-manage-service.test.ts` (BD) — AC13-AC18: crear inserta todo y asigna slug; segundo título igual → `-2`; rollback si falla un insert hija (p. ej. `categoryIds` inexistente → nada queda); editar reemplaza hijas y conserva slug; ajeno → `NOT_FOUND` sin cambios; `pending` publicar → `ORGANIZER_PENDING`, guardar borrador ok; `suspended` bloquea; `setPackageStatus` idempotente (`catalogChanged` false); borrar con reserva → `HAS_BOOKINGS`, con salida → `HAS_DEPARTURES`, con oferta → `HAS_OFFERS`, sin nada → borra y cascade; `catalogChanged` correcto en cada caso.
- `modules/packages/actions/package-actions.test.ts` — AC20-AC22 (mocks de `@/modules/organizers`, `../services/*` y `next/cache`): `AuthError` sube; sin organizer → `NO_ORGANIZER`; input inválido → `INVALID_INPUT` con `fieldErrors` sin llamar al service; el `organizerId` del input se ignora y el service recibe el del organizer de sesión; `updateTag(CACHE_TAGS.packages)` llamado una vez con `catalogChanged: true` y **no** llamado con `false` ni en fallos; códigos de negocio pasan con su mensaje; excepción del service → `UNKNOWN` y log de texto fijo.
- `modules/packages/actions/guide-actions.test.ts` — AC20-AC22: mismos casos que arriba (sin invalidación de caché) para guías.
- AC1, AC23-AC33 (UI): sin tests unitarios; verificación manual en la revisión (crear en blanco, error por campo, subir imagen, publicar como `pending`, borrar con reservas, editar uno ajeno por URL, 390 px).

## Plan
Cinco fases; cada una deja `lint + tsc + test` en verde y la app funcionando. Las fases 1 y 3 no cambian la UI; 2 entrega `/operador/guias`; 5 entrega todo el CRUD de paquetes. Se recomienda 1-2 fases por sesión. Los archivos de test son pequeños y cuentan junto al archivo que prueban.

### Phase 1 — Base de guías (tipos, regla por estado, service y actions; sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Tipos `OrganizerScope`/`ManageResult`, `getWriteBlock` + `MANAGE_MESSAGES`, `toFieldErrors` y tests | modules/packages/types/package-manage.ts, modules/packages/utils/manage-gate.ts, modules/packages/utils/manage-gate.test.ts, modules/packages/utils/field-errors.ts, modules/packages/utils/field-errors.test.ts | - | A | AC5, AC11 | done |
| T2 | `guideSchema` + tipos `GuideInput`/`GuideDto` y test | modules/packages/schemas/guide-schema.ts, modules/packages/schemas/guide-schema.test.ts | - | A | AC2 | done |
| T3 | `guide-service` (list/create/update/delete filtrando por `organizer_id`, regla por estado) y test con BD | modules/packages/services/guide-service.ts, modules/packages/services/guide-service.test.ts | T1, T2 | B | AC3, AC4 | done |
| T4 | `guide-actions` (`getCurrentOrganizer` → Zod → service) con test; export `getCurrentOrganizer` en el index de organizers | modules/packages/actions/guide-actions.ts, modules/packages/actions/guide-actions.test.ts, modules/organizers/index.ts | T1, T2, T3 | C | AC20, AC21 | done |

### Phase 2 — Página de guías (`/operador/guias`)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | setup: `npx shadcn@latest add alert-dialog textarea` (única tarea dueña de `components/ui` y `package.json`/lock si el CLI los toca) y `ConfirmActionDialog` | components/ui/alert-dialog.tsx, components/ui/textarea.tsx, components/shared/confirm-action-dialog.tsx, package.json, package-lock.json | - | - | AC1, AC4, AC33 | done |
| T6 | `GuidesPage` (server: organizer, lista, estados vacíos) y `GuideManager` (cliente: alta, edición en línea, borrado con confirmación, errores por campo, pending/suspended) | modules/packages/components/guides-page.tsx, modules/packages/components/guide-manager.tsx | T4, T5 | A | AC1, AC2, AC4, AC33 | done |
| T7 | Cableado: ruta `/operador/guias`, export en el index del módulo, link "Guías" en el nav y actualización del test del nav | app/(organizer)/operador/guias/page.tsx, modules/packages/index.ts, modules/organizers/components/organizer-nav-links.ts, modules/organizers/components/organizer-nav-links.test.ts | T6 | - | AC1, AC32, AC34 | done |

Nota: si `shadcn add` no toca `package.json`/lock (los componentes usan `@base-ui/react` ya instalado), T5 los deja intactos; se listan por si el CLI los modifica (`git diff` lo confirma).

### Phase 3 — Núcleo de paquetes (helpers, schema y services; sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T8 | `slugify`, `parseSolesToCents`, `centsToSolesInput` y tests | lib/slug.ts, lib/slug.test.ts, lib/money.ts, lib/money.test.ts | - | A | AC12 | done |
| T9 | `packageInputSchema` (+ `PackageInput`, `isAllowedImageUrl`) y test | modules/packages/schemas/package-schema.ts, modules/packages/schemas/package-schema.test.ts | - | A | AC6, AC7, AC8, AC9, AC10 | done |
| T10 | Lecturas del operador: `listOwnPackages`, `getOwnPackageForEdit`, `getManageOptions` y test con BD | modules/packages/services/own-package-service.ts, modules/packages/services/own-package-service.test.ts | T9 | B | AC19 | done |
| T11 | Escrituras: helpers puros + `createPackage`/`updatePackage`/`setPackageStatus`/`deletePackage` (transacción, slug, regla por estado, bloqueos de borrado) y tests | modules/packages/utils/package-write.ts, modules/packages/utils/package-write.test.ts, modules/packages/services/package-manage-service.ts, modules/packages/services/package-manage-service.test.ts | T8, T9 | B | AC13, AC14, AC15, AC16, AC17, AC18 | done |

Ajuste de ejecución (aprobado por el usuario tras review de F1/F2): al inicio de F3 se extrajo `manageFail(code, fieldErrors?)` a `modules/packages/utils/manage-gate.ts` (+ test) reemplazando las copias de `fail()` en `guide-service.ts` y `guide-actions.ts`; T11 y `package-actions` (T12) lo reusan. También se aplicó `text-base` a la descripción de `confirm-action-dialog.tsx` (AC33).

Nota: T10 y T11 corren en paralelo (no comparten archivos; ambos solo importan tipos del schema de T9). Fase de ~12 archivos por ser pequeños.

### Phase 4 — Actions de paquetes y piezas del formulario (sin cablear)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T12 | `package-actions` (4 actions, `updateTag` condicional) y test | modules/packages/actions/package-actions.ts, modules/packages/actions/package-actions.test.ts | T11 | A | AC20, AC21, AC22 | done |
| T13 | `PackageFormValues`, conversiones valores ↔ input, `toFormErrors` y test | modules/packages/utils/package-form.ts, modules/packages/utils/package-form.test.ts | T8, T9 | A | AC12, AC28 | done |
| T14 | `ImageUploadField` (validación cliente, `uploadImage`, vista previa, errores) | modules/packages/components/image-upload-field.tsx | T5 | A | AC26 | done |
| T15 | Secciones Datos básicos / Precio y cupo / Duración / Punto de encuentro y Incluye / No incluye | modules/packages/components/package-form-basics.tsx, modules/packages/components/package-form-inclusions.tsx | T13 | B | AC24, AC25, AC28, AC33 | done |
| T16 | Secciones Itinerario e Imágenes (portada + galería) | modules/packages/components/package-form-itinerary.tsx, modules/packages/components/package-form-media.tsx | T13, T14 | B | AC24, AC25, AC26, AC33 | done |

Ajuste de ejecución (aprobado por el usuario tras la review de F3): al inicio de F4 se corrigió `package-manage-service.ts` (+ `package-write.ts` y sus tests): `updatePackage` ya no nombra `organizer_id` ni `slug` en el `set()` (AC15 al pie de la letra) y un `destinationId`/`categoryIds` inexistente (23503) se devuelve como `INVALID_INPUT` con `fieldErrors` en vez de `UNKNOWN`. Además `toPackageInput` (T13) siempre envía `images`, `included` y `excluded` como arrays (el schema los exige).

Nota: T12-T14 son independientes (grupo A); T15 y T16 (grupo B) no comparten archivos. Ninguna ruta apunta aún a estos componentes (la app no cambia).

### Phase 5 — Formulario, lista y rutas de paquetes
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T17 | `PackageForm` (cliente: estado, validación con el schema, botones, avisos pending/suspended/sin salidas, llamada a la action) y `PackageEditor` (server: organizer, opciones, paquete, `notFound`) | modules/packages/components/package-form.tsx, modules/packages/components/package-editor.tsx | T12, T15, T16 | A | AC23, AC24, AC27, AC28, AC29, AC33 | done |
| T18 | `OwnPackagesList` (server: lista, vacíos, chip "Sin salidas") y `PackageRowActions` (cliente: publicar/despublicar/eliminar con `ConfirmActionDialog`) | modules/packages/components/own-packages-list.tsx, modules/packages/components/package-row-actions.tsx | T12, T5 | A | AC29, AC30, AC31, AC33 | done |
| T19 | Cableado: 3 rutas, exports del módulo, link "Paquetes" en el nav y su test | app/(organizer)/operador/paquetes/page.tsx, app/(organizer)/operador/paquetes/nuevo/page.tsx, app/(organizer)/operador/paquetes/[id]/editar/page.tsx, modules/packages/index.ts, modules/organizers/components/organizer-nav-links.ts, modules/organizers/components/organizer-nav-links.test.ts | T17, T18 | - | AC23, AC30, AC32, AC34 | done |

Ajuste de ejecución (aprobado por el usuario al abrir F5): antes de T19 se pagó deuda de review de F2/F4 en una tarea previa (R): nuevo `components/shared/page-skeleton.tsx` (esqueleto compartido), nuevo `modules/packages/components/form-section.tsx` (extracción de `Section`/`FieldShell` de las 4 secciones del formulario, sin cambio de props) y `MAX_GALLERY_IMAGES` exportada desde `package-schema.ts`. T19 amplía su `Owns` con `app/(organizer)/operador/guias/page.tsx` solo para reemplazar el `GuidesFallback` inline por `PageSkeleton`. `PackageFormBasics` recibe además `options: ManageOptions` (la lista de destinos y categorías sale del servidor).

Ajuste de ejecución (descubierto en `npm run build` de F5): `/operador/paquetes/[id]/editar` es la primera ruta del panel con segmento dinámico y `OrganizerNav`/`OrganizerMobileBar` (`usePathname`) fallaban al prerenderizar. Se envolvieron en `Suspense` en `modules/organizers/components/organizer-shell.tsx` (archivo de 019, fuera de los Owns de T17-T19). Además, T19 valida el `id` (`packageIdSchema` + `notFound()`) dentro de un componente interno bajo `Suspense` (el `await params` queda dentro) y `modules/packages/index.ts` exporta también `packageIdSchema` para que `app/` no importe internos (ARCHITECTURE §6). `notFound()` dentro de `Suspense` produce soft 404 (HTTP 200 con la UI de not-found): límite del framework con `cacheComponents`.

Nota: `modules/packages/index.ts` y `organizer-nav-links.ts` los toca una sola tarea por fase (T7 en la 2, T19 en la 5). Verificación manual del flujo completo (crear → publicar → ver en `/paquetes/<slug>` → despublicar → borrar) al cerrar la fase 5, con `DATABASE_URL`, Clerk y el store de Blob reales.

## Pendientes para el aprobador
Solo lo genuinamente ambiguo; todo lo demás tiene default en la spec.
1. **Mensajes y prioridad de bloqueo de borrado** (T7/AC18): reservas > salidas > ofertas, con los textos de `MANAGE_MESSAGES` y un genérico para la carrera. ¿Conforme con pre-chequeo + captura de `23503` (en vez de solo capturar el error)?
2. **Idiomas**: solo `es` y `en` (los únicos que `formatLanguages` sabe mostrar con nombre; el resto saldría como código crudo). Ampliar la lista exige tocar `formatLanguages` (fuera de esta tarjeta).
3. **Límites propuestos** (longitudes, precio S/ 1 a S/ 100 000, cupo ≤ 100, galería ≤ 12, 30 ítems por inclusión): razonables pero inventados; son constantes del schema, fáciles de cambiar.
4. **Publicar desde la lista no re-valida completitud** (Edge cases, paquetes sembrados o heredados). ¿Aceptable, o se exige lectura + validación al publicar desde la lista (más código)?
5. **Imágenes `/seed/*`** permitidas por compatibilidad con el seed (T8). Si el seed pasa a Blob antes de mergear, se elimina esa rama de la regex.
6. **Después de guardar vuelve a la lista** (sin toast; el estado se ve en el badge). Si se prefiere quedarse en el formulario con un aviso "Guardado", cambia solo AC28.
7. **Guías `pending`** pueden crearse/editarse (T10); si se prefiere que `pending` no pueda tocar nada salvo borradores de paquete, cambia solo `getWriteBlock` para guías.
