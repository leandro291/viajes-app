# Database foundation

- Module: shared
- Status: done
- Approved by: leandro291 (2026-10-24)
- Mode: SDD

## Goal
Dejar lista la base de datos de Wayra: Postgres en Neon con Drizzle, el schema completo de [ERM.md](../../ERM.md) versionado en una migración, y un seed idempotente con los datos del artefacto de diseño para poder mostrar todas las pantallas.

Datos del seed: [database-foundation-seed-data.md](database-foundation-seed-data.md) (anexo, **parte de esta spec**).

## Prerrequisitos humanos (no son tareas)
Los hace el usuario antes de verificar los criterios marcados *(BD viva)*. Ninguna tarea escribe ni lee secretos del repo.
1. Crear el proyecto en Neon (región cercana, p. ej. `aws-sa-east-1`) y usar una **rama de desarrollo**, no la principal/producción, para sembrar.
2. Crear `.env.local` (git lo ignora) copiando los nombres de `.env.example` y pegando las dos cadenas de conexión de Neon: `DATABASE_URL` (pooled) y `DATABASE_URL_UNPOOLED` (directa).
3. Node >= 22.12 (Vitest 5 y el `WebSocket` global del driver lo exigen; el entorno tiene Node v24.19.0, cumple).
4. Las 18 fotos del artefacto ya están en `public/seed/<key>.jpg` (insumo existente, no es tarea de nadie).

Los developers terminan sus tareas con las verificaciones **offline** (`tsc`, `lint`, `test`, `db:generate`). Las *(BD viva)* las corre el usuario u orquestador cuando exista `.env.local`.

## Scope
- In:
  - Dependencias, config de drizzle-kit, `.env.example`, scripts `db:generate`, `db:migrate`, `db:seed`, `test`.
  - Conexión en `lib/db` y schema por dominio con las 21 tablas y 14 enums de ERM.
  - Una migración inicial versionada en el repo.
  - Seed idempotente y reproducible (ancla de fecha fija), con tests unitarios de los helpers y de coherencia de los datos.
  - Vitest 5 como runner (decisión D2) y `@types/node` `^24`.
  - Fotos del artefacto ya incluidas en `public/seed/` referenciadas por ruta (`/seed/<key>.jpg`).
- Out:
  - Clerk, Stripe, UI, endpoints, Vercel Blob, correo/WhatsApp.
  - `relations()` de Drizzle y tipos exportados: se agregan cuando un service los necesite (YAGNI).
  - Esquemas Zod, services y módulos de `modules/`.
  - Ejecutar migraciones en Vercel/ramas de preview (se decide con el despliegue).
  - Reseteo/`db:reset`: para resembrar de cero, usar una rama Neon nueva.
  - Datos de maqueta del panel (126 reservas, KPIs, "Medios de pago" del admin): no son del modelo.

## Decisiones a aprobar
- **D1 (aprobada por el usuario). Driver `drizzle-orm/neon-serverless` (Pool por WebSocket), no `neon-http`.** ERM exige confirmar reserva, pago y cupo en una transacción con `update ... where booked_seats + :pax <= capacity` y revisar filas afectadas. Verificado en `drizzle-orm@0.45.4`: `neon-http` lanza `"No transactions support in neon-http driver"`.
- **D2. Vitest 5** (`vitest@^5`, estable 5.0.5 verificado en npm: Node `^22.12 || ^24 || >=26`; `vite` es peer obligatorio `^6.4 || ^7 || ^8`, npm instala `vite@8.3.x` que pide Node `^20.19 || >=22.12`). Con Node v24.19.0 se cumple. `@types/node` sube a **`^24`** (alinea con el Node del usuario y satisface el peer `>=24` de Vitest; `next@16` acepta Node >= 20.9) como parte de T1. Es el primer runner del repo (SETUP §3 lo permite al escribir el primer test).
- **D3. Drizzle estable** (`drizzle-orm ^0.45`, `drizzle-kit ^0.31`, tag `latest`). La 1.0 sigue en RC.
- **D4. Migraciones en `lib/db/migrations`**, una sola migración inicial `0000_init`. Se generan al final de la fase 2.
- **D5. `tsx`** corre el seed (el repo no es `"type": "module"`, por eso el entry no usa top-level await). Variables con `--env-file=.env.local` de Node, sin `dotenv`.
- **D6. Seed:** ids uuid v5 deterministas + `onConflictDoNothing()`, todo en una transacción. No actualiza filas existentes (si cambia el seed, resembrar en rama nueva).
- **D7. Tipos que ERM no fija:** `start_time` es `time` (la UI formatea "4:00 a. m."); `exchange_rate` `numeric(8,4)` modo `number`; `lat`/`lng` `double precision`; `users.email` y `newsletter_subscribers.email` unique; `payments.provider` texto con default `'stripe'`.
- **D8. Guard del seed:** aborta si `NODE_ENV` o `VERCEL_ENV` es `production`, para no sembrar datos ficticios en producción.

## Reuse
- Reuse: `.gitignore` — se extiende con `!.env.example` (hoy ignora `.env*` entero).
- Reuse: `public/seed/*.jpg` — 18 fotos del artefacto ya en el repo; el seed las referencia por ruta, no las toca. La UI futura las sirve con `next/image` sin config remota.
- Reuse: `package.json` / `package-lock.json` — se agregan dependencias y scripts, y se sube `@types/node` a `^24`; `drizzle-kit`, `tsx` y `vitest` como `devDependencies`.
- Reuse: `tsconfig.json` (`@/*`, `include **/*.ts`) y `eslint.config.mjs` — sin cambios; el código nuevo los cumple. `lib/utils.ts` (`cn`) no aplica.
- Reuse: [ARCHITECTURE.md](../../ARCHITECTURE.md) — `lib/db` es el único lugar que instancia Drizzle; el ejemplo `db.query.packages.findMany` requiere pasar `schema` al cliente.
- Extend: nada de `components/`, `hooks/`, `modules/` (no existen ni hacen falta).
- New: `lib/db/**`, `drizzle.config.ts`, `vitest.config.ts`, `.env.example` — no existe nada de base de datos en el repo.
- No se agregan: `ws` (Node >= 22 trae `WebSocket`), `dotenv` (`--env-file`), `uuid` (`node:crypto`), `drizzle-seed` (genera datos aleatorios; acá son datos fijos del artefacto), `drizzle-zod`/`zod` (los schemas Zod van en cada módulo).
- Verificado offline en un directorio temporal: `drizzle-kit generate` con `casing: "snake_case"` emite `CREATE SEQUENCE` antes de la tabla que la usa, `CHECK`, `time`, `numeric` y default `sql` sin problemas; `tsx --env-file` y `node --env-file` leen el archivo.

## Acceptance criteria
Etiqueta *(offline)* = verificable sin base; *(BD viva)* = necesita los prerrequisitos.

- AC1 *(offline)*: Tras la fase 2 existe `lib/db/migrations/0000_init.sql` y `npm run db:generate` responde "No schema changes, nothing to migrate".
- AC2 *(offline)*: `npx tsc --noEmit`, `npm run lint` y `npm test` terminan en verde al cierre de cada fase.
- AC3 *(offline)*: La migración crea exactamente las 21 tablas de ERM (`users`, `organizers`, `notification_preferences`, `destinations`, `destination_climate_months`, `destination_sights`, `destination_faqs`, `categories`, `package_categories`, `packages`, `package_images`, `package_itinerary_days`, `package_inclusions`, `guides`, `departures`, `offers`, `bookings`, `booking_travelers`, `payments`, `stripe_events`, `newsletter_subscribers`) y los 14 enums de ERM con sus valores.
- AC4 *(offline)*: La migración incluye las constraints de [Contracts](#constraints): unique `(package_id, starts_at)`, check `booked_seats <= capacity`, check de total de reserva, check del formato de `code`, FKs con la política de borrado indicada e índices listados.
- AC5 *(BD viva)*: `npm run db:migrate` sobre una base vacía termina con código 0 y crea las 21 tablas, los enums y la secuencia `booking_code_seq`; ejecutarlo de nuevo no cambia nada.
- AC6 *(BD viva)*: Con el seed aplicado, insertar un booking sin `code` produce `WY-4822`; dos inserts seguidos producen `WY-4822` y `WY-4823`; un `code` con formato distinto de `WY-####` es rechazado.
- AC7 *(BD viva)*: La base rechaza (error de constraint): una segunda salida con el mismo `(package_id, starts_at)`; `booked_seats > capacity`; una reserva cuyo `total_cents <> unit_price_cents * pax_count - discount_cents`; un `departure_id` inexistente; un `clerk_id` repetido; un segundo viajero `is_primary` en la misma reserva; `refunded_cents > amount_cents`.
- AC8 *(offline)*: `lib/db/index.ts` exporta `db` (cliente Drizzle neon-serverless con `schema` y `casing: "snake_case"`) y re-exporta todas las tablas y enums; si falta `DATABASE_URL` lanza un error claro al importarse. No hay valores de conexión ni secretos en el repo; `.env.example` solo tiene nombres y no queda ignorado por git (`git check-ignore .env.example` no lo ignora).
- AC9 *(offline)*: `uuidV5` reproduce el vector conocido (`"www.example.com"` en el namespace DNS → `2ed6657d-e927-568b-95e1-2665a8aea6a2`); `seedId` es determinista, devuelve uuid válido y claves distintas dan ids distintos.
- AC10 *(offline)*: `applyOffer` reproduce los precios del artefacto: Tambopata 165000 al 25 % → unitario 123800; Machu Picchu Mágico 129000 al 15 % → 109700; Máncora 98000 al 30 % → 68600; Titicaca 89000 al 20 % → 71200; Colca 74000 al 10 % → 66600; Paracas 52000 al 20 % con 5 pax → 41600 y sin descuento con 3 pax (mínimo 4); Laguna 69 86000 al 15 % → 73100; Ballestas 2x1 con 2 pax → total 9500 (descuento 9500) y con 3 pax → total 19000. `penToUsdCents(247600, 3.75)` = 66027.
- AC11 *(offline)*: Los datos en memoria del seed coinciden con los conteos del [anexo §9](database-foundation-seed-data.md#9-conteos-esperados-tras-dbseed); ningún id se repite dentro de su tabla; toda referencia (paquete, destino, salida, oferta, usuario, guía, reserva) resuelve a una fila del seed; los 8 totales de reserva son 258000, 48000, 247600, 28500, 142400, 208000, 148000 y 98000 y cumplen `unit * pax - discount`; para cada salida `sum(pax confirmed) <= booked_seats <= capacity`; las 4 salidas de hoy caen el 2026-10-24 (Lima); los 20 paquetes están `published` (ninguno `draft`); los 4 roles de `user_role` tienen al menos un usuario.
- AC12 *(BD viva)*: `npm run db:seed` sobre la base migrada y vacía termina con código 0 e imprime los conteos por tabla iguales a los del anexo §9.
- AC13 *(BD viva)*: Un segundo `npm run db:seed` seguido termina con código 0 y deja los mismos conteos (sin duplicados ni errores de unique).
- AC14 *(BD viva)*: `db:seed` con `NODE_ENV=production` o `VERCEL_ENV=production`, o sin `DATABASE_URL`, termina con código distinto de 0 antes de escribir nada, con un mensaje claro.
- AC15 *(offline)*: Toda columna `*_url` del seed sale de `SEED_IMAGES` (`lib/db/seed/images.ts`, único lugar para cambiar a Vercel Blob) con forma `/seed/<key>.jpg`, y cada ruta usada existe como archivo en `public/seed/`. El seed no sube, mueve ni modifica archivos. Los créditos de `package_images.credit` salen del mismo mapa (autor + licencia).

## Contracts

### Variables de entorno
| Variable | Uso | Quién la lee |
| -------- | --- | ------------ |
| `DATABASE_URL` | Neon pooled | `lib/db/index.ts` (app y seed) |
| `DATABASE_URL_UNPOOLED` | Neon directa | `drizzle.config.ts` (`db:migrate`) |

`.env.example`: solo `DATABASE_URL=` y `DATABASE_URL_UNPOOLED=` sin valores (y comentario de una línea). Las demás variables de SYSTEM-DESIGN se agregan cuando se use cada servicio.

### Scripts (`package.json`)
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "node --env-file=.env.local ./node_modules/drizzle-kit/bin.cjs migrate",
"db:seed": "tsx --env-file=.env.local lib/db/seed/index.ts",
"test": "vitest run"
```
`db:generate` no necesita base ni `.env.local`. El `--name init` de la migración inicial se pasa a mano: `npm run db:generate -- --name init`.

### Dependencias
`drizzle-orm ^0.45`, `@neondatabase/serverless ^1.2` (dependencies); `drizzle-kit ^0.31`, `tsx ^4`, `vitest ^5`, `@types/node ^24` (devDependencies; `vite` entra como peer de Vitest: verificar que quede en el lockfile). Si `npm` avisa por scripts de instalación de `esbuild`, comprobar que `tsx` y `drizzle-kit` igual corren antes de aprobar scripts.

### `drizzle.config.ts`
`defineConfig({ dialect: "postgresql", schema: "./lib/db/schema", out: "./lib/db/migrations", casing: "snake_case", dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! } })`. El schema usa imports relativos (drizzle-kit no resuelve el alias `@/`).

### `lib/db`
```
lib/db/
  index.ts              # Pool + drizzle({ client, schema, casing: "snake_case" }); export { db }; export * from "./schema"
  schema/
    index.ts            # reexporta todos los archivos
    enums.ts            # los 14 pgEnum
    users.ts            # users, organizers, notification_preferences
    destinations.ts     # destinations, destination_climate_months, destination_sights, destination_faqs
    packages.ts         # categories, packages, package_categories, package_images, package_itinerary_days, package_inclusions
    departures.ts       # guides, departures
    offers.ts           # offers
    bookings.ts         # bookingCodeSeq, bookings, booking_travelers
    payments.ts         # payments, stripe_events
    newsletter.ts       # newsletter_subscribers
  migrations/           # generado por drizzle-kit (0000_init.sql + meta/)
  seed/                 # ver abajo
```
- Nombres TS de tablas en `camelCase` plural (`users`, `bookingTravelers`, `packageItineraryDays`); nombres SQL en `snake_case` como ERM. Enums: `userRole`, `organizerStatus`, `packageKind`, `publishStatus`, `inclusionKind`, `season`, `departureStatus`, `offerKind`, `discountType`, `bookingStatus`, `docType`, `paymentMethod`, `paymentStatus`, `notificationKey` (nombres SQL idénticos a ERM).
- `index.ts` usa `Pool` de `@neondatabase/serverless` y `drizzle` de `drizzle-orm/neon-serverless`. Sin `import "server-only"` (el seed corre fuera de Next). Sin cache global del Pool (YAGNI; en dev el HMR puede abrir pools extra, aceptable con el endpoint pooled).
- Ids `uuid().primaryKey().defaultRandom()`; fechas `timestamp({ withTimezone: true })`; dinero `integer` en céntimos; `packages.updated_at` con `$onUpdate`.

### Constraints
Todas las FKs explícitas. Política de borrado: **cascade** en hijas puras (`destination_*`, `package_categories`, `package_images`, `package_itinerary_days`, `package_inclusions`, `notification_preferences`, `booking_travelers`); **set null** en `departures.guide_id` y `bookings.offer_id`; **restrict** en el resto (`packages.organizer_id/destination_id`, `departures.package_id`, `offers.package_id`, `bookings.*`, `payments.booking_id`, `organizers.user_id`, `guides.organizer_id`): nunca se borran en cascada reservas ni pagos.

| Tabla | Unique / check / índices |
| ----- | ------------------------ |
| users | unique `clerk_id`, unique `email` |
| organizers | unique `user_id` |
| destinations | unique `slug` |
| destination_climate_months | pk `(destination_id, month)`, check `month between 1 and 12` |
| destination_sights / faqs | índice `(destination_id, sort_order)` |
| categories | unique `slug` |
| package_categories | pk `(package_id, category_id)` |
| packages | unique `slug`; índices `(status, kind)`, `destination_id`, `organizer_id`; check `price_cents >= 0`, `duration_days >= 1`, `nights >= 0`, `max_group_size > 0` |
| package_images | índice `(package_id, sort_order)` |
| package_itinerary_days | unique `(package_id, day_number)` |
| package_inclusions | índice `(package_id, kind, sort_order)` |
| guides | índice `organizer_id` |
| departures | **unique `(package_id, starts_at)`**; **check `booked_seats >= 0 and booked_seats <= capacity`**; check `capacity > 0`; índices `starts_at`, `guide_id` |
| offers | check `(discount_type = 'two_for_one' and discount_value is null) or (discount_type = 'percent' and discount_value between 1 and 100)`; índice `(package_id, is_active)` |
| bookings | unique `code`; **check `code ~ '^WY-[0-9]{4}$'`**; check `pax_count > 0`, `discount_cents >= 0`, **`total_cents = unit_price_cents * pax_count - discount_cents`**, `exchange_rate > 0`; índices `customer_id`, `departure_id`, `(package_id, status)`, `created_at` |
| booking_travelers | índice `booking_id`; **unique parcial `(booking_id) where is_primary`** |
| payments | unique `stripe_checkout_session_id` (nullable); índice `booking_id`; check `amount_cents >= 0`, `refunded_cents between 0 and amount_cents`; `provider` texto default `'stripe'` |
| stripe_events | pk `id` (texto, id del evento de Stripe) |
| newsletter_subscribers | unique `email` |

**Código de reserva:** `pgSequence("booking_code_seq", { startWith: 4822, minValue: 1, maxValue: 9999 })` (los códigos sembrados del artefacto son 4814-4821) y `bookings.code` con default `sql\`'WY-' || lpad(nextval('booking_code_seq')::text, 4, '0')\``. `maxValue: 9999` falla fuerte en vez de truncar (`lpad` recorta) y colisionar. *ponytail: techo de 9999 reservas; ampliar formato y check cuando se acerque.*

**Nullability:** `NOT NULL` en ids, FKs obligatorias, enums con default, `slug`, `name/title`, `price_cents`, `currency`, `created_at`. Nullable lo que el artefacto no siempre trae: `destinations.{tagline, description, altitude_m, best_season_text, from_lima_text, hero_image_url}`, `packages.{duration_hours, start_time, meeting_*, cover_image_url, description}`, `package_images.{alt, credit}`, `package_itinerary_days.{transport_leg, image_url, lat, lng}`, `departures.guide_id`, `offers.{discount_value, min_people, valid_until}`, `bookings.{offer_id, cancelled_at}`, `payments.{stripe_*, paid_at}`, `users.{phone, country, first_name, last_name}`, `newsletter_subscribers.unsubscribed_at`. `package_images.url` NOT NULL.

### Seed (`lib/db/seed/`)
```
helpers.ts       # uuidV5, seedId, SEED_ANCHOR, limaDate, soles, applyOffer, penToUsdCents, SEED_PEN_PER_USD
images.ts        # SEED_IMAGES: clave -> { path: "/seed/<key>.jpg", credit }
data/identity.ts   # users, organizers, notification_preferences, guides, newsletter_subscribers
data/destinations.ts # destinations, climate months, sights, faqs
data/packages.ts   # categories, packages, package_categories
data/package-details.ts # package_images, itinerary days, inclusions
data/schedule.ts   # departures, offers
data/bookings.ts   # bookings, booking_travelers, payments
index.ts         # runner
```
Firmas de `helpers.ts`:
```ts
uuidV5(name: string, namespace: string): string
seedId(key: string): string                        // uuidV5(key, SEED_NAMESPACE)
SEED_ANCHOR: "2026-10-24"
// images.ts
SEED_IMAGES: Record<SeedImageKey, { path: string; credit: string }>   // 18 claves del anexo §0
limaDate(date: string /* YYYY-MM-DD */, time?: string /* HH:mm, default 00:00 */): Date   // America/Lima, UTC-5
soles(amount: number): number                      // soles -> céntimos
applyOffer(input: { unitCents: number; pax: number; discountType: "percent" | "two_for_one"; discountValue: number | null; minPeople: number | null }):
  { discountedUnitCents: number; discountCents: number; totalCents: number }
penToUsdCents(totalCents: number, penPerUsd: number): number   // Math.round(totalCents / penPerUsd)
```
- `applyOffer`: `percent` → `discountedUnitCents = Math.floor((unitCents * (100 - value) + 5000) / 10000) * 100` (soles enteros, mitad hacia arriba); `discountCents = (unitCents - discountedUnitCents) * pax`; `two_for_one` → se pagan `Math.ceil(pax / 2)` lugares, `discountCents = (pax - ceil(pax/2)) * unitCents`; sin descuento (`discountCents = 0`) si `pax < minPeople`. `totalCents = unitCents * pax - discountCents`. La regla de redondeo está inferida de los precios del artefacto; la regla definitiva de checkout se fija en la spec de reservas.
- Cada `data/*.ts` exporta arrays tipados con `typeof tabla.$inferInsert` (con `id` ya resuelto vía `seedId`), sin acceso a base. `data/*` solo importa `helpers.ts`, el schema y, si necesita precios/slugs, otro `data/*` de una fase previa.
- `index.ts` (runner, sin top-level await: `main().catch(...)`): valida guard (D8) y `DATABASE_URL`; abre **una transacción** (`db.transaction`); inserta en orden de FK `users → organizers → notification_preferences → destinations → climate → sights → faqs → categories → packages → package_categories → package_images → itinerary → inclusions → guides → departures → offers → bookings → booking_travelers → payments → newsletter_subscribers` con `.onConflictDoNothing()`; al final imprime `tabla: n` por tabla (select count) y cierra con `db.$client.end()`.
- Anclas: `SEED_ANCHOR` y fechas absolutas del anexo. "Salidas de hoy" solo muestra datos el 2026-10-24; para otras fechas basta con el selector de jueves de noviembre.

## Edge cases
- `neon-http` no sirve para el flujo de cupo (sin transacciones): por eso D1. `db.query` requiere pasar `schema` a `drizzle()`.
- `casing: "snake_case"` debe estar tanto en `drizzle.config.ts` como en el cliente; si falta en uno, las columnas no coinciden.
- Sembrar sobre una base con filas manuales: `onConflictDoNothing()` omite conflictos sin fallar, pero no corrige datos distintos con la misma clave.
- El seed asume una base recién migrada: la secuencia `booking_code_seq` arranca en 4822 y las reservas sembradas llevan códigos explícitos < 4822, así que nunca chocan con las nuevas.
- Reservas sembradas con yape/plin/cash y pagos sin ids de Stripe: dato de demo, v1 solo implementa tarjeta (ERM).
- Los usuarios `seed_*` no existen en Clerk. Cuando se integre auth, esa spec decide cómo reemplazarlos.
- Si `drizzle-kit migrate` contra Neon pidiera `ws` o fallara por Node, es riesgo a validar en AC5 (no verificable offline); no se agrega `ws` por adelantado.
- Fechas del seed fijas (ancla 2026-10-24): con el tiempo las salidas quedan en el pasado. Refrescar = cambiar el ancla y resembrar en rama nueva.
- Tres de cuatro enums de estado de salida se siembran: no hay salidas `completed` ni `cancelled`.

## Tests
Vitest `^5`, `environment: node` (sin jsdom). Colocados junto al código.
- `lib/db/seed/helpers.test.ts` — AC9 (vector UUID v5, determinismo, formato), AC10 (tabla `applyOffer` con los 8 precios del artefacto + caso `minPeople` + 2x1 con 2 y 3 pax; `penToUsdCents`), `limaDate("2026-11-05", "07:30")` = `2026-11-05T12:30:00.000Z`, `SEED_IMAGES` con 18 claves y `path` = `/seed/<key>.jpg` (AC15).
- `lib/db/seed/seed-data.test.ts` — AC11 (conteos del anexo §9, ids únicos, referencias resueltas, totales y aritmética de las 8 reservas, invariante de cupo, salidas de hoy, 4 roles presentes) y que todo `*_url` del seed sea una ruta de `SEED_IMAGES` y exista en `public/seed/` (`fs.existsSync`, AC15).
- No se testea el schema (trivial) ni el runner contra una base real: eso es AC5-AC7 y AC12-AC14, con comprobación manual *(BD viva)*.

### Verificación manual *(BD viva)* (checklist del usuario)
`npm run db:migrate` → `npm run db:seed` (dos veces) → en Neon SQL editor: `select count(*) from bookings;` (8), `insert into bookings (...)` sin `code` → `WY-4822`, y un insert que viole cada constraint de AC7.

## Plan

### Phase 1 — Setup, conexión y schema de identidad, destinos y paquetes
Entrega: dependencias instaladas, config de drizzle-kit y `lib/db` con el schema de usuarios, destinos y paquetes compilando.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `npm i drizzle-orm @neondatabase/serverless`, `npm i -D drizzle-kit @types/node@^24`; scripts `db:generate`, `db:migrate`; `.env.example` (solo nombres); `drizzle.config.ts`; `!.env.example` en `.gitignore` | package.json, package-lock.json, .gitignore, .env.example, drizzle.config.ts | - | A | AC8 | done |
| T2 | `enums.ts` (los 14 enums de ERM) y `users.ts` (users, organizers, notification_preferences) con sus constraints | lib/db/schema/enums.ts, lib/db/schema/users.ts | T1 | B | AC3, AC4 | done |
| T3 | `destinations.ts` (destinations + climate_months, sights, faqs) | lib/db/schema/destinations.ts | T1 | B | AC3, AC4 | done |
| T4 | `packages.ts` (categories, packages, package_categories, package_images, package_itinerary_days, package_inclusions) | lib/db/schema/packages.ts | T2, T3 | C | AC3, AC4 | done |
| T5 | `lib/db/index.ts` (Pool neon-serverless, `db`, reexport del schema; error claro sin `DATABASE_URL`) y `schema/index.ts` reexportando los archivos de esta fase | lib/db/index.ts, lib/db/schema/index.ts | T4 | D | AC8, AC2 | done |

### Phase 2 — Schema de operación y ventas + migración inicial
Entrega: schema completo y migración `0000_init` generada y sin cambios pendientes.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T6 | `departures.ts` (guides, departures con unique y checks) y `offers.ts` (offers con check) | lib/db/schema/departures.ts, lib/db/schema/offers.ts | T5 | A | AC3, AC4 | done |
| T7 | `newsletter.ts` (newsletter_subscribers) | lib/db/schema/newsletter.ts | T5 | A | AC3 | done |
| T8 | `bookings.ts` (`bookingCodeSeq`, bookings con checks y default de `code`, booking_travelers con unique parcial) | lib/db/schema/bookings.ts | T6 | B | AC3, AC4, AC6, AC7 | done |
| T9 | `payments.ts` (payments, stripe_events) | lib/db/schema/payments.ts | T8 | C | AC3, AC4, AC7 | done |
| T10 | Actualizar `schema/index.ts` con todos los archivos y generar la migración: `npm run db:generate -- --name init` (revisar el SQL contra AC3/AC4) | lib/db/schema/index.ts, lib/db/migrations/0000_init.sql, lib/db/migrations/meta/_journal.json, lib/db/migrations/meta/0000_snapshot.json | T7, T9 | D | AC1, AC2, AC3, AC4 | done |

### Phase 3 — Seed: helpers y datos de catálogo
Entrega: runner de tests, helpers testeados y datos en memoria de identidad, destinos y paquetes.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T11 | setup: `npm i -D tsx vitest@^5`; scripts `db:seed` y `test`; `vitest.config.ts` (`environment: node`, `include` de `**/*.test.ts`) | package.json, package-lock.json, vitest.config.ts | - | A | AC2 | done |
| T12 | `helpers.ts` (+ tests): `uuidV5`, `seedId`, `limaDate`, `soles`, `applyOffer`, `penToUsdCents`; y `images.ts` con `SEED_IMAGES` (claves, rutas y créditos del anexo §0) | lib/db/seed/helpers.ts, lib/db/seed/helpers.test.ts, lib/db/seed/images.ts | T11 | B | AC9, AC10, AC15 | done |
| T13 | Datos de identidad y destinos: anexo §1 (usuarios, operador, preferencias, guías, suscriptores) y §3 (destinos, Cusco completo) | lib/db/seed/data/identity.ts, lib/db/seed/data/destinations.ts | T12 | C | AC11, AC15 | done |
| T14 | Datos de catálogo: anexo §2, §4 y §5 (categorías, 20 paquetes, `package_categories`, galería, itinerario, inclusiones) | lib/db/seed/data/packages.ts, lib/db/seed/data/package-details.ts | T12 | C | AC11, AC15 | done |

### Phase 4 — Seed: salidas, ofertas, reservas y runner
Entrega: `db:seed` completo e idempotente, y test de coherencia de los datos.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T15 | `schedule.ts`: anexo §6 y §7 (8 ofertas, 52 salidas con guías y `booked_seats`) | lib/db/seed/data/schedule.ts | T13, T14 | A | AC11 | done |
| T16 | `bookings.ts`: anexo §8 (8 reservas con `applyOffer`, 9 viajeros, 8 pagos con `penToUsdCents`) | lib/db/seed/data/bookings.ts | T15 | B | AC11 | done |
| T17 | Runner `index.ts` (guard D8, transacción, orden de FKs, `onConflictDoNothing`, conteos, `db.$client.end()`) y `seed-data.test.ts` | lib/db/seed/index.ts, lib/db/seed/seed-data.test.ts | T16 | C | AC2, AC11, AC12, AC13, AC14 | done |

Al cerrar la fase 4, el usuario ejecuta la verificación manual *(BD viva)* (AC5-AC7, AC12-AC14).

## Notas
- Las fotos de `public/seed/` son de Wikimedia Commons con licencias CC que exigen atribución: la UI futura debe mostrar `credit`. Hoy solo `package_images.credit` lo guarda (la galería de Machu Picchu Mágico).
- Al migrar a Vercel Blob, se reemplaza `SEED_IMAGES` por URLs absolutas y se resiembra en rama nueva.

## Open questions
Ninguna.
