# Detalle de paquete (/paquetes/[slug])

- Module: packages
- Status: approved
- Approved by: leandro291 (2026-10-25)
- Mode: SDD

## Goal
Crear la ruta pública `/paquetes/[slug]` (tarjeta Trello 009, pantalla 6 del diseño): galería con créditos de foto, datos clave, itinerario por día, incluye / no incluye y un panel de reserva con las próximas salidas (con cupo) y el CTA "Reservar". Cierra el 404 de las tarjetas de `/paquetes` y del Inicio, y deja listo el link `/pago?salida=<id>&viajeros=<n>` que consumirá 014.

## Scope
- In:
  - Ruta `app/(public)/paquetes/[slug]/page.tsx` (delgada) y componente `PackageDetail` en `modules/packages`.
  - Services `getPackageBySlug(slug)` (paquete + galería + itinerario + inclusiones, caché `hours`) y `getDepartures(packageId)` (salidas próximas, caché `minutes`).
  - Utilidades puras: parseo de `?salida=` y `?viajeros=`, hrefs, cupo, textos de cupo, fechas en zona Lima, idiomas.
  - Galería (único componente cliente), datos clave, "Qué vas a vivir", itinerario acordeón, incluye / no incluye, banner de cancelación, panel de reserva (salida y viajeros por URL), barra inferior fija en móvil, skeleton, `generateMetadata`.
  - Tolerar paquetes sin galería, itinerario o inclusiones (hoy solo `machu-picchu-magico` los tiene en el seed).
- Out:
  - Mapa de la ruta (Leaflet): el diseño lo trae, se decidió dejarlo fuera; `lat/lng` de los días quedan sin usar.
  - Insignia "Confirmación inmediata" del diseño (no sale de ningún dato; la confirmación depende del pago, tarjeta 014).
  - La página `/pago`, la creación del booking y la verificación real de cupo (tarjeta 014; aquí el cupo es informativo).
  - Link de la miga al destino (`/destinos/[slug]` no existe aún, tarjeta 011).
  - Invalidación de caché (la dejan las specs de CRUD/pagos, ver `docs/specs/packages/home.md`).
  - Cambios de schema, migraciones y dependencias nuevas.
  - Datos de seed para otros paquetes: ver Phase 3 (condicional a Q1).

## Decisiones a aprobar
- **D1. Salida y viajeros viajan por la URL**, igual que los filtros de 008: `?salida=<uuid>` y `?viajeros=<n>`. Las fechas y el stepper `−` / `+` son `<Link scroll={false}>` (sin JS, URL compartible). Sin `salida` válida se marca la primera salida con cupo; `viajeros` por defecto 2 (como el diseño) y se acota a `[1, min(maxGroupSize, cupo de la salida)]`.
- **D2. Un solo componente cliente: `PackageGallery`** (carrusel con miniaturas, flechas, contador y swipe). El resto es Server Component; el itinerario usa `<details name="itinerary">` nativo (acordeón exclusivo, el día 1 abierto) en vez de estado de cliente.
- **D3. Caché por tipo de dato.** El paquete y sus hijos cambian poco → `use cache` + `cacheLife("hours")` + `cacheTag(CACHE_TAGS.packages)`. Las salidas llevan cupo que cambia con cada reserva → `use cache` + `cacheLife("minutes")` + `cacheTag(CACHE_TAGS.departures)` (clave nueva en `lib/cache-tags.ts`). El cupo mostrado puede quedar desfasado hasta ~1 min; 014 revalida el cupo con el `UPDATE ... WHERE booked_seats + :pax <= capacity` del ERM antes de cobrar.
- **D4. Salidas visibles** = `status = scheduled` y `starts_at > now()`. Las que no tienen cupo se muestran como "Agotado" (deshabilitadas, sin link), no se ocultan. Máximo 8 próximas. Con ninguna: mensaje "Aún no hay salidas programadas" y CTA deshabilitado (`aria-disabled`, sin `href`).
- **D5. `[slug]` con Cache Components.** `params` es un dato de runtime: la página es un shell estático (migas y marcos) y todo lo que depende del slug va dentro de `<Suspense>`, con `await params` dentro de la frontera (patrón de `node_modules/next/dist/docs/01-app/02-guides/incremental-static-regeneration-cache-components.md`). No hay `generateStaticParams` (YAGNI: la primera visita de cada slug renderiza y queda en caché). Slug inexistente o `draft` → `notFound()`. Techo conocido: al llamarse dentro de un `<Suspense>` en streaming, el status HTTP puede ser 200 con la UI de not-found (Next agrega `noindex`); si importa el 404 real, se agrega `generateStaticParams` + `dynamicParams`.
- **D6. Créditos de foto.** La foto activa muestra su `credit` ("Foto: Diego Delso, CC BY-SA 4.0") sobre la propia galería, en vivo (`aria-live`). Si el paquete no tiene `package_images`, la galería cae a `cover_image_url` como única foto, sin crédito (el campo no existe para la portada). `PhotoCredits` del Inicio no se toca: se retira cuando las fotos pasen a Blob (D12 de 007).
- **D7. Migas "Inicio / Paquetes / <título>"** (el diseño usa el destino como segundo nivel, pero `/destinos/[slug]` no existe; ver Out).
- **D8. Tours de un día** (`kind = day_tour`) usan esta misma ruta. Datos clave: "Duración" muestra `duration_hours` ("N horas") y "Salida" muestra `start_time` en vez de noches. Un `day_tour` sin `duration_hours` cae a `formatDuration(durationDays)`.
- **D9. Precio** siempre PEN con `formatPen`, "por persona, habitación doble" (ERM). El total del panel es `priceCents × viajeros`.

## Reuse
- Reuse: `modules/packages` — `formatDuration`, `isDayTour`, `withCategories`-style mapeo de destino, `PackageFilters`/patrón de `parse*Params` + `build*Href` de `utils/package-filters.ts` (misma forma, mismo `zod` v4).
- Reuse: `lib/money.ts` (`formatPen`), `lib/cache-tags.ts` (`CACHE_TAGS`), `lib/db` (`packages`, `destinations`, `packageImages`, `packageItineraryDays`, `packageInclusions`, `departures`), `components/ui/badge.tsx`/`button.tsx`, `lucide-react`, `next/image`, `next/link`, `cn`, tokens de `globals.css` (`rounded-card`, `shadow-card`, `bg-sand`, `text-ink-muted`, `font-display`).
- Reuse: `(public)/layout.tsx` (encabezado, `<main>` de 1240 px, pie), `listing-skeleton.tsx` como referencia del skeleton, `lib/db/seed` (`seedPackages`, `seedPackageImages`, `seedPackageInclusions`, `seedPackageItineraryDays`) como oráculo de los tests.
- Extend: `modules/packages/services/package-service.ts` — exportar `isPublished` (hoy privado) para no duplicar el filtro de visibilidad.
- Extend: `modules/packages/types/package.ts`, `modules/packages/index.ts`, `lib/cache-tags.ts` (clave `departures`).
- New: `modules/packages/services/package-detail-service.ts` — `getPackageBySlug` y `getDepartures`; archivo aparte para no mezclar el catálogo (tarjetas) con el detalle y evitar conflictos de ownership.
- New: `modules/packages/utils/package-detail.ts` — funciones puras con test (el cupo, las fechas y los hrefs no tienen equivalente).
- New: componentes de detalle. No existe galería ni acordeón en `components/ui`; `shadcn` en `base-nova` no cubre un carrusel con miniaturas y el acordeón nativo `<details>` evita añadir uno.

## Acceptance criteria
*(auto)* = comando/test; *(db)* = test de integración con `DATABASE_URL` (`npm run test:db`); *(visual)* = Playwright a 390 px y 1280 px sobre `/paquetes/machu-picchu-magico` con la base sembrada (`npm run db:seed`), comparando con el diseño (`Paquete` / `Movil-Paquete`).

- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` en verde al cierre de cada fase. `next build` no marca `/paquetes/[slug]` como ruta bloqueante (shell estático + contenido en streaming).
- AC2 *(auto)*: `parseDetailParams(raw)` devuelve `{ salida?, viajeros? }`. `salida` solo si es un uuid válido; `viajeros` solo un entero de 1 a 20; arrays → primer valor; lo demás se descarta sin lanzar.
- AC3 *(auto)*: `buildDetailHref(slug, current, change)` genera `/paquetes/<slug>` sin `?` cuando no hay parámetros, omite claves vacías, conserva el otro parámetro y siempre produce el mismo string (orden `salida`, `viajeros`). `buildCheckoutHref(salida, viajeros)` devuelve `/pago?salida=<id>&viajeros=<n>`.
- AC4 *(auto)*: `seatsLeft({capacity, bookedSeats})` = `capacity − bookedSeats` (≥ 0). `seatsLabel(n)` → "Agotado" (0), "Queda 1 cupo" (1), "Quedan N cupos" (≥ 2). `clampTravelers(n, maxGroupSize, seatsLeft)` devuelve un entero en `[1, min(maxGroupSize, seatsLeft)]` y nunca menos de 1.
- AC5 *(auto)*: `formatDepartureDate(date)` y `formatDepartureChip(date)` usan `America/Lima` (no la zona del servidor): `2026-11-05T12:30:00Z` → "jueves 5 de noviembre" y `{ dow: "Jue", day: "5" }`; una hora cerca de medianoche UTC no cambia el día. `formatLanguages(["es"])` → "Español", `(["es","en"])` → "Español e inglés".
- AC6 *(db)*: `getPackageBySlug("machu-picchu-magico")` devuelve el paquete con destino, 6 imágenes ordenadas por `sort_order` (todas con `credit`), 4 días ordenados por `day_number` y las inclusiones separadas en `included` / `excluded` ordenadas por `sort_order`; las cifras se calculan desde las exportaciones `seed*` del seed, no se fijan. Slug inexistente → `null`; un `draft` insertado por el test → `null`.
- AC7 *(db)*: un paquete publicado sin filas hijas (p. ej. `montana-de-colores`) devuelve `images: []`, `itinerary: []`, `inclusions: { included: [], excluded: [] }` sin lanzar.
- AC8 *(db)*: `getDepartures(packageId)` devuelve solo `scheduled` con `starts_at > now()`, ordenadas por `starts_at` asc, máximo 8, cada una con `seatsLeft` calculado; una salida llena aparece con `seatsLeft: 0`; una pasada y una `cancelled` no aparecen. El test inserta sus propias salidas relativas a `now()` (las fechas del seed caducan) y las borra en `afterAll`.
- AC9 *(auto)*: `getPackageBySlug` llama a `cacheLife("hours")` y `cacheTag(CACHE_TAGS.packages)`; `getDepartures` a `cacheLife("minutes")` y `cacheTag(CACHE_TAGS.departures)` (test con `next/cache` mockeado).
- AC10 *(visual)*: `/paquetes/machu-picchu-magico` muestra migas "Inicio / Paquetes / Machu Picchu Mágico", un único `h1` con el título, el `blurb`, la galería y las secciones "Qué vas a vivir", "Itinerario día a día", "Incluye" / "No incluye". Las tarjetas de `/paquetes` y del Inicio ya no dan 404.
- AC11 *(visual)*: Galería. Muestra la foto activa a pantalla completa de hero, 6 miniaturas, flechas "Foto anterior" / "Foto siguiente", contador "1 / 6" con `aria-live="polite"` y el crédito de la foto activa. Funciona con teclado (Tab/Enter) y con swipe en 390 px. Con 1 sola foto no hay flechas ni miniaturas; sin `package_images` usa `cover_image_url`. Todas las imágenes con `alt` no vacío.
- AC12 *(visual)*: Datos clave en 4 tarjetas: Duración ("4 días · 3 noches"), Grupo ("Hasta 12 personas"), Idioma ("Español e inglés"), Salida (`meeting_point`, o el nombre del destino si es nulo). Para `day_tour`, ver D8.
- AC13 *(visual)*: "Qué vas a vivir" renderiza `description` (se omite la sección si es nula). El itinerario muestra un acordeón por día (número, título; al abrir: descripción, `place`, `transport_leg` e imagen si existen), con el día 1 abierto y solo uno abierto a la vez; es nativo y funciona sin JS. Sin días no aparece la sección ni queda hueco.
- AC14 *(visual)*: "Incluye" (tarjeta blanca con checks) y "No incluye" (tarjeta arena con equis) en dos columnas ≥ 768 px y apiladas en 390 px. Si falta una de las dos listas se muestra solo la otra; si faltan ambas, ninguna.
- AC15 *(visual)*: Panel de reserva. Precio "Desde S/ 1 290 / por persona, habitación doble"; salidas como botones-link (día de la semana y número) con la primera con cupo marcada `aria-current="true"` por defecto; elegir una cambia `?salida=` sin saltar el scroll; las llenas salen "Agotado" y no son links. Texto de cupo de la seleccionada ("Quedan N cupos"). Stepper de viajeros con links `−` / `+` (acotado por D1; extremos como `aria-disabled`), línea "S/ 1 290 × 2" y total. "Reservar ahora" es un `<a>` a `buildCheckoutHref`. Sin salidas: mensaje y CTA deshabilitado (D4). Parámetros inválidos (`?salida=zzz&viajeros=99`) se ignoran sin error.
- AC16 *(visual)*: Responsive. ≥ 1024 px: dos columnas, panel `sticky` a la derecha. En 390 px: una columna, el panel de salidas y viajeros va después de los datos clave y hay una barra inferior fija (`position: sticky; bottom: 0`) con "S/ total · N viajeros · fecha" y el botón "Reservar" al mismo `href`. Sin scroll horizontal de página a 390 y 1280 px.
- AC17 *(visual)*: Banner de cancelación ("Cancelación gratuita hasta 48 h antes", con la regla del ERM: reembolso completo; con menos tiempo se retiene el costo de las entradas ya emitidas).
- AC18 *(visual)*: `/paquetes/no-existe` y el slug de un `draft` muestran la página not-found (D5). Slug con mayúsculas o caracteres raros no rompe (404).
- AC19 *(auto)*: `generateMetadata` devuelve `title` = título del paquete (la plantilla raíz produce "<título> · Wayra"), `description` = `blurb`, y `openGraph.images` = portada si existe. Slug desconocido → `title: "Paquete no encontrado"`.
- AC20 *(auto)*: `PackageGallery` es el único `"use client"` nuevo; `package.json` no gana dependencias; no hay Leaflet ni mapa.
- AC21 *(visual)*: Tokens y accesibilidad: chip/fecha activa `ink` con texto blanco; objetivos táctiles ≥ 44 px; foco visible; con `prefers-reduced-motion` no hay transiciones nuevas; contraste AA en texto sobre la foto del hero (degradado inferior).
- AC22 *(visual)*: Con red lenta se ve el skeleton del detalle (no pantalla en blanco) y las migas no parpadean.

## Contracts

### URL
```
/paquetes/<slug>?salida=<uuid>&viajeros=<1..20>
/pago?salida=<uuid>&viajeros=<n>        (destino del CTA; ruta de 014)
```

### `modules/packages/types/package.ts` (extiende)
```ts
export type PackageImageDto = { url: string; alt: string | null; credit: string | null };
export type ItineraryDayDto = {
  dayNumber: number; title: string; description: string; place: string;
  transportLeg: string | null; imageUrl: string | null;
};
export type PackageDetailDto = {
  id: string; slug: string; title: string; blurb: string; description: string | null;
  kind: "package" | "day_tour";
  durationDays: number; nights: number; durationHours: number | null;
  startTime: string | null;            // "07:30:00" tal cual la BD
  priceCents: number;                  // por persona, habitación doble (D9)
  maxGroupSize: number; languages: string[];
  meetingPoint: string | null; coverImageUrl: string | null;
  destination: { slug: string; name: string; region: string };
  images: PackageImageDto[];           // por sort_order; [] si no hay
  itinerary: ItineraryDayDto[];        // por day_number; [] si no hay
  inclusions: { included: string[]; excluded: string[] }; // por sort_order
};
export type DepartureDto = { id: string; startsAt: Date; capacity: number; seatsLeft: number };
export type DetailParams = { salida?: string; viajeros?: number };
```

### `modules/packages/utils/package-detail.ts` (puras, sin db)
```ts
export function parseDetailParams(raw: Record<string, string | string[] | undefined>): DetailParams; // AC2
export function buildDetailHref(slug: string, current: DetailParams, change: Partial<Record<keyof DetailParams, string | number | undefined>>): string; // AC3
export function buildCheckoutHref(departureId: string, travelers: number): string; // AC3
export function seatsLeft(d: { capacity: number; bookedSeats: number }): number;   // AC4
export function seatsLabel(n: number): string;                                      // AC4
export function clampTravelers(n: number, maxGroupSize: number, seatsLeft: number): number; // AC4
export function formatDepartureDate(d: Date): string;                               // AC5
export function formatDepartureChip(d: Date): { dow: string; day: string };          // AC5
export function formatLanguages(codes: string[]): string;                            // AC5
```

### `modules/packages/services/package-detail-service.ts`
```ts
export async function getPackageBySlug(slug: string): Promise<PackageDetailDto | null>;
// "use cache", cacheLife("hours"), cacheTag(CACHE_TAGS.packages). WHERE isPublished AND slug = $.
export async function getDepartures(packageId: string): Promise<DepartureDto[]>;
// "use cache", cacheLife("minutes"), cacheTag(CACHE_TAGS.departures). Argumento: string (serializable).
```
`DepartureDto.startsAt` es `Date`; al cruzar la frontera de caché se serializa, por eso el service la devuelve como `Date` y los componentes no asumen identidad.

### `modules/packages/components/` (todos Server Components salvo `package-gallery.tsx`)
```tsx
// package-detail.tsx — migas, h1, <Suspense> con el contenido; await params dentro de la frontera (D5)
PackageDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> })
generateDetailMetadata(params: Promise<{ slug: string }>): Promise<Metadata>

// package-gallery.tsx — "use client"
PackageGallery({ images }: { images: PackageImageDto[] })   // [] no se pasa: el caller ya hizo el fallback a portada

// package-facts.tsx, package-itinerary.tsx, package-inclusions.tsx
PackageFacts({ pkg }: { pkg: PackageDetailDto })
PackageItinerary({ days }: { days: ItineraryDayDto[] })       // <details name="itinerary">
PackageInclusions({ included, excluded }: { included: string[]; excluded: string[] })

// booking-panel.tsx — aside en ≥ lg; también el bloque "Elige tu salida" en móvil
BookingPanel({ pkg, departures, params }: { pkg: PackageDetailDto; departures: DepartureDto[]; params: DetailParams })
// mobile-booking-bar.tsx
MobileBookingBar({ total: string; summary: string; href: string | null }: ...)

// detail-skeleton.tsx
DetailSkeleton()
```

### `modules/packages/index.ts` (extiende)
```ts
export { PackageDetail, generateDetailMetadata } from "./components/package-detail";
export { getPackageBySlug, getDepartures } from "./services/package-detail-service";
export type { PackageDetailDto, DepartureDto, PackageImageDto, ItineraryDayDto } from "./types/package";
// + exports actuales sin cambios
```

### Ruta
```tsx
// app/(public)/paquetes/[slug]/page.tsx  (delgada)
import { PackageDetail, generateDetailMetadata } from "@/modules/packages";
export const generateMetadata = ({ params }: PageProps<"/paquetes/[slug]">) => generateDetailMetadata(params);
export default function Page({ params, searchParams }: PageProps<"/paquetes/[slug]">) {
  return <PackageDetail params={params} searchParams={searchParams} />;
}
```
(`PageProps` lo genera Next al correr `next dev`/`build`; si el helper no existe en la versión instalada se tipa a mano igual que en `app/(public)/paquetes/page.tsx`.)

## Edge cases
- **Paquete sin galería / itinerario / inclusiones** (19 de 20 en el seed): se omiten las secciones sin dejar huecos; la galería cae a `cover_image_url`; sin portada tampoco, el hero usa `bg-sand` con el título.
- **Sin salidas, todas llenas o todas pasadas**: D4; el panel nunca queda vacío sin mensaje y el CTA nunca lleva a `/pago` sin `salida`.
- **`viajeros` mayor que el cupo o que `max_group_size`**: se acota; el `+` queda `aria-disabled` en el tope.
- **`salida` de otro paquete o cancelada** (uuid válido pero fuera de la lista): se ignora y se usa la primera con cupo.
- **Cupo desfasado** (D3): si alguien reserva en el último minuto, 014 rechaza en el servidor; aquí no hay promesa de cupo.
- **Zona horaria**: el servidor puede estar en UTC; todas las fechas se formatean en `America/Lima` (AC5).
- **`description` / `meeting_point` nulos**: se omite el texto; "Salida" cae al nombre del destino.
- **Texto largo**: títulos con `text-wrap: balance`, itinerario con `min-w-0`; sin scroll horizontal.
- **Imágenes**: rutas locales `/seed/*.jpg` hoy; `next/image` con `sizes` y `priority` solo en la primera foto del hero.
- **Slug**: se valida `^[a-z0-9-]{1,100}$` antes de consultar; fuera de eso, `notFound()` sin tocar la BD.
- **`DATABASE_URL` ausente**: igual que 007/008, `lib/db` lanza al importarse y `next build` falla; aceptado.
- **Idioma**: español, con tildes.

## Tests
`npm test` corre los no-db; los *(db)* corren con `npm run test:db` (requiere `.env.local`) y se omiten sin `DATABASE_URL`, mismo patrón de 007/008 (`describe.skipIf`, `await import()` dentro del bloque, `next/cache` mockeado).

- `modules/packages/utils/package-detail.test.ts` — AC2 (uuid válido/ inválido, `viajeros` 0, 21, `abc`, `2.5`, array), AC3 (sin params → ruta limpia, conserva el otro param, orden fijo, `buildCheckoutHref`), AC4 (cupo, textos 0/1/N, clamp en los extremos y con `seatsLeft` 0), AC5 (fecha y chip en Lima incluida una hora que en UTC cae al día siguiente; idiomas).
- `modules/packages/services/package-detail-service.test.ts` *(db)* — AC6, AC7, AC8 (inserta paquete `draft` y salidas propias; limpia en `afterAll`), AC9 (`next/cache` mockeado).
- No se testea markup ni componentes (SETUP §3). AC10–AC22 son manuales con Playwright (390×844 y 1280×800), a cargo del orquestador tras la fase 2: capturas, teclado, swipe, `scrollWidth`, `/paquetes/no-existe`, `?salida=zzz&viajeros=99`, `/paquetes/montana-de-colores` (sin galería ni itinerario), comparación con el diseño.

## Plan

### Phase 1 — Datos y utilidades
Entrega: `getPackageBySlug`, `getDepartures` y las funciones puras testeadas. La app no gana rutas.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: tipos de detalle; clave `departures` en `CACHE_TAGS`; exportar `isPublished` | modules/packages/types/package.ts, lib/cache-tags.ts, modules/packages/services/package-service.ts | - | A | AC20 | done |
| T2 | Utilidades puras de detalle + test | modules/packages/utils/package-detail.ts, modules/packages/utils/package-detail.test.ts | T1 | B | AC2, AC3, AC4, AC5 | done |
| T3 | `package-detail-service.ts` (`getPackageBySlug`, `getDepartures`) + tests de integración | modules/packages/services/package-detail-service.ts, modules/packages/services/package-detail-service.test.ts | T1 | B | AC6, AC7, AC8, AC9 | done |

### Phase 2 — UI y ruta
Entrega: `/paquetes/[slug]` completa con datos reales, salida y viajeros por URL, estado vacío por sección y skeleton.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | `PackageGallery` (cliente) | modules/packages/components/package-gallery.tsx | - | A | AC11, AC20, AC21 | done |
| T5 | `PackageFacts`, `PackageItinerary`, `PackageInclusions` + banner de cancelación | modules/packages/components/package-facts.tsx, modules/packages/components/package-itinerary.tsx, modules/packages/components/package-inclusions.tsx | - | A | AC12, AC13, AC14, AC17 | done |
| T6 | `BookingPanel` y `MobileBookingBar` | modules/packages/components/booking-panel.tsx, modules/packages/components/mobile-booking-bar.tsx | T2 | A | AC15, AC16 | done |
| T7 | `DetailSkeleton` | modules/packages/components/detail-skeleton.tsx | - | A | AC22 | done |
| T8 | `PackageDetail` (migas, Suspense, notFound, metadata), `index.ts` del módulo y la ruta delgada | modules/packages/components/package-detail.tsx, modules/packages/index.ts, app/(public)/paquetes/[slug]/page.tsx | T3, T4, T5, T6, T7 | B | AC1, AC10, AC18, AC19 | done |

### Phase 3 — Datos de ejemplo para más paquetes (condicional a Q1)
Entrega: 4 paquetes más con galería, itinerario e inclusiones, para probar el detalle sin secciones vacías. **No arranca sin respuesta a Q1.**

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T9 | Detalle de seed de 4 paquetes (galería con `SEED_IMAGES` y su crédito, 3–4 días, inclusiones) y actualizar los totales del test de seed y del anexo | lib/db/seed/data/package-details.ts, lib/db/seed/seed-data.test.ts, docs/specs/shared/database-foundation-seed-data.md | - | A | AC1 | done |

### Verificación (orquestador, tras T8; no es tarea de developer)
Con `.env.local` (DB sembrada + claves de Clerk): `npm run build && npm start`; Playwright a 390×844 y 1280×800 sobre las URLs de *Tests*. Más `npm run test:db`. Resultado y capturas van al PR; no se commitea código de Playwright. Reviewer al cierre de cada fase: `tsc`, `lint`, `build`, `test`.

## Notas de implementación
Ajustes menores respecto de los contratos de arriba, todos aditivos (no cambian criterios ni el plan):
- `package-detail.ts` exporta además `isValidSlug`, `resolveBooking` (salida elegida + viajeros acotados, compartida por panel, barra móvil y página), `formatDepartureTime`, `formatStartTime` y `formatPackageDuration`. `formatDepartureChip` devuelve también `month` ("nov").
- `PackageGallery` recibe `children` (título y resumen) para superponerlos sobre la foto sin volverlos cliente; `CancellationNotice` vive en `package-inclusions.tsx`.
- Datos clave: para `day_tour` con `start_time` la cuarta tarjeta es "Hora de salida".
- Phase 3 (T9) quedó con 4 paquetes: 13 fotos, 18 días y 43 inclusiones en total (anexo del seed actualizado). Los días sin foto propia dejan `image_url` nulo.
- Miga actualizada por la spec 011 (`docs/specs/destinations/destination-page.md`, D4/AC24): D7, Q2 y AC10 de esta spec ("Inicio / Paquetes / …") quedan reemplazados por "Inicio / <Destino> / <título>", con el destino enlazado a `/destinos/<slug>` y sin el nivel "Paquetes". No cambian los demás criterios ni el `Status`.
- Verificación: Playwright a 1280 y 390 px sobre `/paquetes/machu-picchu-magico`, `/paquetes/cusco-valle-sagrado` y `/paquetes/montana-de-colores`; `?salida=zzz&viajeros=99`; slug inexistente. `/paquetes/no-existe` muestra la página 404 de Next con status HTTP 200 (límite conocido de D5).

## Open questions
- **Q1 (resuelta: se hizo la Phase 3 con contenido de ejemplo):** el artefacto de diseño trae galería, itinerario e inclusiones **solo** para Machu Picchu Mágico, que el seed ya tiene completo (el anexo del seed lo dice: "los demás paquetes no llevan galería, itinerario ni inclusiones"). No hay datos del artefacto para extender. Opciones: (a) Phase 3 con contenido de ejemplo escrito a partir de las descripciones y fotos que ya están en el repo (`cusco-valle-sagrado`, `titicaca-islas-uros`, `canon-del-colca`, `lima-sabores-y-cultura`), marcado como ficticio como el resto del seed; (b) no hacerla y probar solo con Machu Picchu y los casos vacíos. Recomiendo (a) cuando se pueda revisar el contenido; las fases 1–2 no dependen de esto.
- **Q2 (resuelta: se acepta "Inicio / Paquetes / …"):** la miga del diseño apunta al destino ("Inicio / Cusco / …"). Aquí va "Inicio / Paquetes / …" hasta que exista `/destinos/[slug]` (011). ¿Se acepta?
- **Q3 (resuelta: los tests db se corren con `.env`, no existe `.env.local`):** `.env.local` no existe en este worktree (solo `.env`), y `npm run test:db` lo necesita. ¿Se copia desde el checkout principal para correr los tests de integración?
