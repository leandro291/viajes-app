# Tours de un día (/tours)

- Module: packages
- Status: approved
- Approved by: leandro291 (2026-10-29)
- Mode: SDD

## Goal
Crear la ruta pública `/tours` (tarjeta Trello 010): listado de tours de un día publicados, con hero carrusel de los 4 más reservados, filtros por ciudad, fecha y orden guardados en la URL, y en cada tarjeta duración en horas, hora de salida y próxima salida con cupo. Reutiliza `HeroCarousel`, la caché de Next 16 y la regla `isDayTour` que dejó 008.

## Scope
- In:
  - Ruta `app/(public)/tours/page.tsx` (delgada, el menú ya apunta a `/tours`) y componente `ToursListing` en `modules/packages`.
  - Service `getTours(filters)` cacheado (`use cache`, `cacheTag`), solo `published` y `isDayTour`, con filtros `ciudad`, `fecha` y orden `orden`; devuelve por tour la próxima salida con cupo.
  - Parseo/validación de `searchParams`, cálculo de ciudades con tours y armado de links (funciones puras).
  - Hero: migas "Inicio / Tours de un día", `h1`, subtítulo y `HeroCarousel` con los 4 tours más reservados.
  - Barra de filtros: chips de ciudad (links), fecha (`<form method="get">` con `<input type="date">`, sin JS de cliente) y orden (links).
  - Contador, grilla (4 columnas en escritorio, tarjetas horizontales en móvil), estado vacío, skeleton y CTA final "¿Varios días en la misma ciudad?" → `/paquetes`.
  - Extraer de `packages-listing.tsx` el bloque de migas+`h1`+subtítulo y la tarjeta de slide a un archivo compartido del módulo (DRY con 008).
- Out:
  - Filtro de categoría (ver D5).
  - Paginación (el seed tiene 10 tours; techo conocido en Edge cases).
  - Invalidación de caché por escrituras (la dejan las specs de CRUD/pagos).
  - Departures recurrentes o más fechas en el seed (ver D8 y Open questions).
  - Cambios de schema, migraciones y nuevas dependencias.
  - Selector de fecha propio (calendario custom): se usa el nativo.
  - La página de detalle `/paquetes/[slug]` (ya existe, 009; las tarjetas apuntan a ella).

## Decisiones a aprobar
- **D1. Alcance "tour" = `isDayTour`** (`kind = day_tour` **o** `duration_days = 1`), igual que `duracion=1` de 008, así `/tours` y `/paquetes?duracion=1` listan el mismo conjunto. La regla en SQL se exporta una sola vez desde `package-service.ts` (junto a `isPublished`) y la usan `getPackages` y `getTours`.
- **D2. "Salidas próximas" = filtro por fecha + próxima salida en la tarjeta** (confirmado por el usuario).
  - Filtro `fecha=YYYY-MM-DD` (día de Lima): tours con al menos una `departure` ese día con `status = scheduled`, `starts_at > now()` y `booked_seats < capacity`.
  - La tarjeta muestra "Próxima salida: sáb 31 oct · 6 cupos" = la primera salida futura `scheduled` con cupo; si hay `fecha`, la primera de ese día. **Desvío consciente del diseño**, que no muestra la salida en la tarjeta (sí "Sale 4:00 a. m." = `start_time`, que se mantiene).
  - Sin salidas con cupo la tarjeta sigue en el listado (sin `fecha`) con "Sin salidas próximas" en gris (ver Q1).
- **D3. Ciudad = destino.** `?ciudad=<slug de destino>`, chips como `<Link scroll={false}>` (sin JS, como 008). Chips = "Todas" + destinos con al menos un tour publicado, **derivados de `getTours({})`** (ya cacheado y compartido con el hero; cero consultas nuevas). No se usa `getDestinations()`: incluye destinos que solo tienen paquetes y daría chips vacíos. Orden: más tours primero, luego nombre.
- **D4. Orden** `?orden=`: ausente = Recomendados (más reservas `confirmed` desc, `created_at` desc, `id`; mismo ranking que 008/007); `precio-asc` (precio, `id`); `mas-cortos` (`duration_hours` asc, precio, `id`; los `NULL` van al final, que es el comportamiento por defecto de `ASC` en Postgres). No hay "precio-desc": el diseño no lo pide.
- **D5. Sin filtro de categoría.** No está en el diseño y el reuso no es gratis: `getPackages` lo resuelve con un `EXISTS` sobre `package_categories` y habría que replicarlo en `getTours` más un chip por categoría. Se deja fuera (YAGNI); si se pide, es un `EXISTS` más en `getTours`.
- **D6. Valores desconocidos se descartan** (como D6 de 008): `ciudad` solo vale si existe en las ciudades con tours; `fecha` solo si es una fecha de calendario válida y está entre hoy (Lima) y hoy + 365 días. Así las claves de caché quedan acotadas (ciudades × ≤366 fechas × 3 órdenes) y no hay entrada por cada string que llegue. Un valor válido sin resultados muestra el estado vacío.
- **D7. Tarjeta nueva `TourCard`, no se toca `PackageCard`.** El diseño pide otra composición (horizontal en móvil, vertical desde `md`; chips de duración en horas y de hora de salida; línea de próxima salida) que no cabe en las variantes `rail`/`grid` sin más `if`. Además `PackageCard` es compartido con 011 y otras worktrees abiertas. Reusa los mismos tokens (`rounded-[22px]`, chips, `bg-sand`).
- **D8. Datos: `getTours` hace dos consultas** (tours agrupados por reservas; luego `selectDistinctOn(departures.packageId)` para la próxima salida de los ids obtenidos), no un join con `departures`, que multiplicaría filas y rompería el `count(bookings)` del ranking. Caché `cacheLife("minutes")` con tags `packages` y `departures`: el cupo cambia con cada reserva (misma lógica que `getDepartures`).
- **D9. Hero.** Se reutiliza `components/shared/hero-carousel.tsx` tal cual (props `labels`, `className`, `contentClassName`), como hace `PackagesHero`. Slides = los 4 primeros de `getTours({})` con portada (mismo orden "más reservados"; comparte caché con el listado sin filtros). Cada slide: eyebrow "Ciudad · 14 h" y título "Nombre · desde S/ 120". Sin tours con portada, hero estático sin carrusel (como 008).
- **D10. `h1` con dos textos.** Escritorio "Tours de un día"; móvil "Sales temprano, vuelves con historias" (diseño). Un solo `<h1>` con dos `<span>` y `max-md:hidden` / `md:hidden` (el oculto sale del árbol de accesibilidad).
- **D11. Fecha y orden al cambiar.** `TourFilterFields` (`"use client"`) aplica `fecha` y `orden` con `router.push` al cambiar, igual que el tablero del diseño; sin botón "Aplicar". Sin JS solo funcionan los chips de ciudad (son `<a>`).

## Reuse
- Reuse: `components/shared/hero-carousel.tsx`, `components/shared/page-hero.tsx` — carrusel y hero ya genéricos (props `labels`, `className`).
- Reuse: `modules/packages/services/package-service.ts` — `isPublished`; patrón de `getPackages` (join con `bookings`, ranking, `use cache`); `CACHE_TAGS` de `lib/cache-tags.ts` (ya trae `departures`).
- Reuse: `modules/packages/utils/package-detail.ts` — `formatStartTime` ("04:00:00" → "4:00 a. m."), `formatDepartureChip` (día de la semana/día/mes en Lima); `modules/packages/utils/package-utils.ts` — `formatDuration` (fallback "1 día" si no hay `duration_hours`).
- Reuse: `lib/money.ts` (`formatPen`), `components/ui/{button,input,badge}.tsx`, `lucide-react`, `next/link`, `cn`, `zod` v4 (ya instalado), tokens de `globals.css` (`rounded-card`, `shadow-card`, `bg-sand`, `text-ink-muted`, `font-display`, keyframe `wy-up`).
- Reuse: `app/(public)/layout.tsx` y `SITE_LINKS` (ya apunta a `/tours`) sin cambios.
- Reuse: `modules/packages/components/listing-skeleton.tsx` como referencia visual del skeleton (no se importa: la forma de la tarjeta cambia).
- Reuse (patrón): `parseListingParams`/`buildListingHref` de 008. No se reutilizan tal cual: el vocabulario (`ciudad`, `fecha`, `orden` distinto) y la ruta base (`/tours`) son otros; se escriben equivalentes de la misma forma (zod, claves en orden fijo) en un archivo aparte, sin tocar el de 008.
- Extend: `modules/packages/services/package-service.ts` — exporta `isDayTourRow` y `getPackages` lo usa en `duracion = "1"` (cambio de 2 líneas, sin cambio de comportamiento; cubierto por los tests db existentes de 008).
- Extend: `modules/packages/types/package.ts` — `TourFilters`, `TourSort`, `TourCardDto`, `TourCityDto` (solo se agregan).
- Extend: `modules/packages/components/packages-listing.tsx` — `HeroIntro` y el contenido del slide pasan a `listing-hero.tsx`; el resultado visual de `/paquetes` no cambia.
- Extend: `modules/packages/index.ts` — exports de `getTours`, `ToursListing` y tipos.
- New: `modules/packages/services/tour-service.ts` — `getTours`; no cabe en `getPackages` (otro DTO, filtro por salidas, otro orden, otra TTL).
- New: `modules/packages/utils/tour-filters.ts`, `tour-view.ts` — funciones puras testeables (parseo, ciudades, fechas Lima, textos de tarjeta).
- New: `modules/packages/components/{listing-hero,tour-card,tour-filter-bar,tours-skeleton,tours-listing}.tsx` — ver D7; el rail y el grid de 008 no sirven para este diseño.
- Sin dependencias ni componentes shadcn nuevos (`input` y `button` ya existen).

## Aviso de archivos compartidos (worktrees 011, 014, 020 abiertas)
Esta spec toca archivos compartidos de `modules/packages`: `package-service.ts` (T1, +2 líneas), `types/package.ts` (T1, solo agrega), `packages-listing.tsx` (T5, refactor interno) e `index.ts` (T8, solo agrega exports). Todos son cambios aditivos o internos; conflictos de merge esperables solo si otra rama edita las mismas líneas (`index.ts` es el más probable). El resto de archivos son nuevos. Si se quiere cero solapamiento con `packages-listing.tsx`, se puede omitir T5 y duplicar ~40 líneas de hero en `tours-listing.tsx` (menos DRY; no recomendado).

## Datos del seed (verificado en `lib/db/seed/data`)
- 10 tours (`kind = day_tour`, todos con `duration_hours` 2–16 y `start_time`): Cusco 4 (`montana-de-colores`, `machu-picchu-en-un-dia`, `valle-sagrado-completo`, `city-tour-sacsayhuaman`), Ica-Paracas 2, Arequipa 2, Puno 1, Lima 1. Coincide con los 10 de `duracion=1` en 008. Chips: Todas + 5 ciudades.
- Departures `scheduled` futuras (con la fecha de hoy, 2026-10-25): todo tour tiene jueves 2026-11-05 y 2026-11-19 (capacidad 30, `booked_seats` 0 salvo casos sueltos); además 2026-10-27 (`machu-picchu-en-un-dia`), 2026-10-30 (`islas-ballestas`) y 2026-11-02 (`montana-de-colores`). Las del 2026-10-24 ya pasaron o están `en_route`. Ninguna salida está llena.
- **Falta de data a señalar:** no hay salidas recurrentes ni después de 2026-11-19. Pasada esa fecha ningún tour tiene "próxima salida" y el filtro por fecha solo encuentra los jueves sembrados y los pocos días sueltos. No bloquea la implementación (no se cambia el seed aquí; ver Q2). Los tests db no dependen de esas fechas: crean sus propias salidas relativas a `now()`.

## Acceptance criteria
*(auto)* = comando/test; *(db)* = test de integración con `DATABASE_URL` (`npm run test:db`); *(visual)* = Playwright a 390 px y 1280 px sobre `/tours` con la base sembrada, comparando con el diseño (pantalla 3, Tours de un día).

- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` terminan en verde al cierre de cada fase. `next build` incluye `/tours` como ruta parcialmente prerenderizada (shell estático + resultados en streaming), sin errores de caché.
- AC2 *(auto)*: `parseTourParams(raw)` devuelve `{ ciudad?, fecha?, orden? }`. Descarta sin lanzar: `orden` fuera de `precio-asc`/`mas-cortos`; `ciudad` vacía o de más de 60 caracteres; `fecha` que no sea `YYYY-MM-DD` o no exista en el calendario (`2026-02-31`, `2026-13-01`, `26-11-05`); valores repetidos (arrays: se toma el primero).
- AC3 *(auto)*: `resolveTourFilters(parsed, cities, today)` conserva `ciudad` solo si el slug está en `cities`, y `fecha` solo si `today <= fecha <= today + 365 días`; deja `orden` como llegó. `limaToday(now)` devuelve la fecha de Lima aunque en UTC ya sea el día siguiente (p. ej. `2026-11-06T03:00:00Z` → `2026-11-05`).
- AC4 *(auto)*: `buildTourHref(current, change)` devuelve `/tours` sin `?` cuando no queda filtro, omite claves vacías, conserva el resto al cambiar una, y genera siempre el mismo string para el mismo conjunto (claves en orden fijo `ciudad`, `fecha`, `orden`).
- AC5 *(auto)*: `citiesFromTours(tours)` devuelve ciudades únicas con su cantidad de tours, ordenadas por cantidad desc y luego nombre; `[]` si no hay tours.
- AC6 *(auto)*: `tour-view`: `formatTourDuration` → "14 h" con `durationHours` ("1 día" si es `null`); `formatTourStart("04:00:00")` → "Sale 4:00 a. m."; `formatNextDeparture` → "Próxima salida: sáb 31 oct · 6 cupos" (día en Lima; "1 cupo" en singular); `formatTourCount` → "1 tour disponible" / "N tours disponibles".
- AC7 *(db)*: `getTours({})` devuelve exactamente los `published` con `isDayTour` del seed (10, calculados desde `seedPackages`), ninguno `draft` ni `kind = package` con más de un día (un `draft` y un `package` insertados por el test no aparecen). Cada ítem trae destino, `durationHours` y `startTime` con la forma de `TourCardDto`.
- AC8 *(db)*: `ciudad` devuelve solo los tours de ese destino (`cusco` → 4); combinaciones sin coincidencias devuelven `[]`.
- AC9 *(db)*: `fecha`: con una salida de prueba `scheduled` con cupo mañana (Lima) para el tour A, `getTours({ fecha })` incluye a A y no a los demás; **excluye** un tour cuya única salida ese día está llena (`booked_seats = capacity`), una `cancelled`, y una cuya hora ya pasó (hoy, antes de `now()`). Con `fecha`, `nextDeparture` es la de ese día.
- AC10 *(db)*: `nextDeparture` sin `fecha` es la primera salida futura `scheduled` con cupo (omite llenas, canceladas y pasadas) con `seatsLeft = capacity - bookedSeats`; `null` si el tour no tiene ninguna (el tour sigue en la lista).
- AC11 *(db)*: sin `orden`, el orden es el de más reservados (mismo conjunto/orden que los 4 primeros de `getPackages({ duracion: "1" })`); `precio-asc` ordena por `priceCents` con empate por `id`; `mas-cortos` ordena por `durationHours` asc con empate por precio e `id`, y un tour con `durationHours` `NULL` queda al final.
- AC12 *(auto)*: `getTours` llama a `cacheLife` y a `cacheTag` con `CACHE_TAGS.packages` y `CACHE_TAGS.departures` (test con `next/cache` mockeado). `getPackages` sigue pasando sus tests de 008 tras extraer `isDayTourRow`.
- AC13 *(visual)*: Hero. Migas "Inicio / Tours de un día" (la última con `aria-current="page"`), un único `h1` ("Tours de un día" en ≥ 768 px; "Sales temprano, vuelves con historias" en 390 px), subtítulo "Sales por la mañana y vuelves para cenar. Recojo en tu hotel y guía local incluidos.", y carrusel de 4 slides (pestañas, flechas, pausa) con eyebrow "Ciudad · 14 h" y título "Nombre · desde S/ 120" enlazando a `/paquetes/<slug>`. Etiquetas accesibles de pestañas/flechas hablan de "tour", no de "destino".
- AC14 *(visual)*: Filtros como en el diseño. Escritorio: tarjeta blanca con chips de ciudad ("Todas" + las 5 del seed) a la izquierda y Fecha (`<input type="date">`, `min` hoy, `max` hoy + 365) y Ordenar (Recomendados / Precio menor a mayor / Más cortos primero) a la derecha. Móvil: barra pegada arriba, riel de chips que se desliza y dos cajas Fecha/Ordenar. Chips son `<a>` reales (`scroll={false}`, `aria-current="true"` en el activo; "Todas" y "Recomendados" quitan su parámetro); fecha y orden se aplican al cambiar y conservan el resto; la URL es compartible. Sin botón "Aplicar". Objetivos táctiles ≥ 44 px, foco visible.
- AC15 *(visual)*: Contador `aria-live="polite"` "N tours disponibles" (singular "1 tour disponible"). Fecha se quita borrando el campo; "Quitar filtros" solo en el estado vacío.
- AC16 *(visual)*: Grilla y tarjeta. 4 columnas a 1280 px, 2 a 768 px; a 390 px tarjetas horizontales (foto a la izquierda) de una columna. Cada tarjeta es un solo link a `/paquetes/<slug>` con imagen (`alt` no vacío), badge de ciudad, chip de duración ("14 h"), chip "Sale 4:00 a. m." (si hay `start_time`), título (`h3`, bajo un `h2` "Resultados" oculto), blurb, "Desde S/ X" y la línea de próxima salida o "Sin salidas próximas". Sin scroll horizontal de página a 390 y 1280 px.
- AC17 *(visual)*: `/tours?ciudad=cusco` muestra los 4 tours de Cusco con "Cusco" activo; `/tours?fecha=2026-11-05` (mientras la fecha sea futura) muestra todos los tours con la salida de ese día en la tarjeta; `/tours?ciudad=lima&fecha=2026-11-05&orden=mas-cortos` combina los tres. `/tours?ciudad=atlantida&fecha=2020-01-01&orden=x` se ignora entero (todo el listado, filtros por defecto activos) sin 500 ni 404.
- AC18 *(visual)*: Estado vacío ("No hay tours con esos filtros", "Prueba con otra ciudad o fecha." y botón "Quitar filtros" hacia `/tours`) cuando no hay coincidencias; nunca grilla vacía sin mensaje. Cambiar de filtro con red lenta muestra el skeleton (no blanco) y el hero no parpadea.
- AC19 *(visual)*: CTA final "¿Varios días en la misma ciudad?" con botón "Ver paquetes" → `/paquetes`, visible tras la grilla y el estado vacío.
- AC20 *(visual)*: Tokens del sistema de diseño (chip activo `ink` con texto blanco, inactivo blanco con borde, radio de tarjeta, `font-display`), sin transiciones nuevas con `prefers-reduced-motion`; el carrusel respeta reduced motion (ya lo hace).
- AC21 *(auto)*: `/paquetes` no cambia (refactor de T5 solo mueve código; capturas antes/después del hero de `/paquetes`). `package.json` no gana dependencias. Único `"use client"` nuevo: `tour-filter-fields.tsx` (fecha y orden al cambiar).
- AC22 *(auto)*: `metadata.title` de la ruta es "Tours de un día" (la plantilla raíz produce "Tours de un día · Wayra").

## Contracts

### URL
```
/tours?ciudad=<slug de destino>&fecha=YYYY-MM-DD&orden=precio-asc|mas-cortos
```
Todos opcionales. Clave ausente = sin filtro. `orden` ausente = Recomendados (D4).

### `modules/packages/types/package.ts` (se agrega)
```ts
export type TourSort = "precio-asc" | "mas-cortos";

export type TourFilters = {
  ciudad?: string;
  fecha?: string; // YYYY-MM-DD, día de Lima
  orden?: TourSort;
};

export type TourCardDto = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  priceCents: number; // por persona, PEN
  coverImageUrl: string | null;
  durationHours: number | null;
  startTime: string | null; // "04:00:00" tal cual la BD
  destination: { slug: string; name: string; region: string };
  nextDeparture: { startsAt: Date; seatsLeft: number } | null; // D2
};

export type TourCityDto = { slug: string; name: string; count: number };
```

### `modules/packages/services/package-service.ts` (cambio mínimo)
```ts
export const isDayTourRow = or(eq(packages.kind, "day_tour"), eq(packages.durationDays, 1))!; // D1
// getPackages usa isDayTourRow en duracion === "1"
```

### `modules/packages/services/tour-service.ts`
```ts
export async function getTours(filters: TourFilters): Promise<TourCardDto[]>;
```
`"use cache"`, `cacheLife("minutes")`, `cacheTag(CACHE_TAGS.packages, CACHE_TAGS.departures)`. Argumento: objeto plano de strings.
1. Tours: `packages ⨝ destinations`, `LEFT JOIN bookings ON package_id AND status = 'confirmed'`, `WHERE isPublished AND isDayTourRow` más, si vienen:
   - `ciudad` → `destinations.slug = $`;
   - `fecha` → `EXISTS (SELECT 1 FROM departures WHERE package_id = packages.id AND status = 'scheduled' AND starts_at > now() AND starts_at >= $from AND starts_at < $to AND booked_seats < capacity)`, con `[from, to)` = día de Lima (`dayRange(fecha)` de `tour-filters.ts`).
   `GROUP BY packages.id, destinations.id`; `ORDER BY` según D4. Sin `LIMIT`.
2. Próxima salida: `selectDistinctOn([departures.packageId])` con `package_id IN (ids)`, `status = 'scheduled'`, `starts_at > now()`, `booked_seats < capacity` (más `[from, to)` si hay `fecha`), `ORDER BY package_id, starts_at`. Mapea `seatsLeft = capacity - bookedSeats`. Sin filas → `nextDeparture: null`.
Lista vacía → no hace la segunda consulta.

### `modules/packages/utils/tour-filters.ts` (puras, sin db)
```ts
export const TOUR_SORT_OPTIONS: { value: TourSort | undefined; label: string }[];
//  undefined → "Recomendados", "precio-asc" → "Precio menor a mayor", "mas-cortos" → "Más cortos primero"
export const MAX_FECHA_DAYS = 365;

export function parseTourParams(raw: Record<string, string | string[] | undefined>): TourFilters; // AC2
export function limaToday(now: Date): string; // "YYYY-MM-DD" en America/Lima (AC3)
export function resolveTourFilters(parsed: TourFilters, cities: { slug: string }[], today: string): TourFilters; // AC3
export function dayRange(fecha: string): { from: Date; to: Date }; // [00:00, +24 h) en -05:00 (Lima no tiene DST)
export function citiesFromTours(tours: Pick<TourCardDto, "destination">[]): TourCityDto[]; // AC5
export function buildTourHref(current: TourFilters, change: Partial<Record<keyof TourFilters, string | undefined>>): string; // AC4
```

### `modules/packages/utils/tour-view.ts` (puras)
```ts
export function formatTourDuration(t: Pick<TourCardDto, "durationHours">): string; // "14 h"; sin horas → formatDuration(1) = "1 día"
export function formatTourStart(startTime: string): string; // "Sale 4:00 a. m." (usa formatStartTime)
export function formatNextDeparture(d: { startsAt: Date; seatsLeft: number }): string; // "Próxima salida: sáb 31 oct · 6 cupos"
export function formatTourCount(n: number): string; // "N tours disponibles"
```
`TourCardDto` no trae `durationDays`: todo tour es de un día (D1), por eso el fallback es `formatDuration(1)`.

### Componentes (todos Server Components salvo el carrusel ya existente)
```tsx
// listing-hero.tsx (extraído de packages-listing.tsx)
HeroIntro({ crumb, title, subtitle, className }: { crumb: string; title: ReactNode; subtitle: string; className?: string })
HeroFeatureLink({ href, imageUrl, eyebrow, title }: { href: string; imageUrl: string; eyebrow: string; title: string })

// tour-card.tsx
TourCard({ tour }: { tour: TourCardDto })  // mapea DTO → textos con formatPen y tour-view; horizontal en móvil, vertical desde md

// tour-filter-bar.tsx
TourFilterBar({ filters, cities, today }: { filters: TourFilters; cities: TourCityDto[]; today: string })
// <nav aria-label="Filtros">: grupo Ciudad (Links), grupo Fecha (<form method="get" action="/tours">), grupo Ordenar (Links); "Limpiar" si hay filtros

// tours-skeleton.tsx
ToursSkeleton()  // barra de filtros + 8 tarjetas esqueleto

// tours-listing.tsx
ToursListing({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> })
// <ToursHero/> (async: getTours({}), 4 con portada, HeroCarousel) estático
// <Suspense fallback={<ToursSkeleton/>}>: await searchParams → parseTourParams;
//    getTours({}) (cacheado) → citiesFromTours; today = limaToday(new Date()); resolveTourFilters;
//    getTours(filters) → <TourFilterBar/> + contador + grilla | estado vacío
// CTA final estático
```

### `modules/packages/index.ts` (se agrega)
```ts
export { getTours } from "./services/tour-service";
export { ToursListing } from "./components/tours-listing";
export type { TourFilters, TourSort, TourCardDto, TourCityDto } from "./types/package";
```

### Ruta
```tsx
// app/(public)/tours/page.tsx
import { ToursListing } from "@/modules/packages";
export const metadata = { title: "Tours de un día" };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ToursListing searchParams={searchParams} />;
}
```

## Edge cases
- **Sin tours publicados / base vacía**: hero estático, sin chips de ciudad (solo "Todas"), estado vacío; nunca "undefined" ni error.
- **Parámetros inválidos o repetidos**: se ignoran / se toma el primero (AC2), sin 500 ni 404.
- **`fecha` pasada, de más de 365 días o `ciudad` inexistente**: se descarta (D6) y se muestra todo.
- **Hoy**: `fecha` = hoy solo cuenta salidas con `starts_at > now()`. La caché de minutos puede mostrar una salida que acaba de salir hasta ~1 min (aceptado).
- **Cupo**: `booked_seats < capacity`; el check de BD impide `booked_seats > capacity`. Una salida llena no cuenta ni para el filtro ni para "próxima salida"; si todas están llenas la tarjeta dice "Sin salidas próximas".
- **Salida `en_route`/`cancelled`**: no cuenta (solo `scheduled`).
- **Tour sin `duration_hours` / sin `start_time`**: chip "1 día" y sin chip de salida (no ocurre en el seed).
- **Tour sin portada**: la tarjeta usa el bloque `bg-sand`; no entra al hero. Menos de 2 slides: sin controles; 0: hero estático (como 008).
- **Zona horaria**: el día de `fecha` y el texto de la salida van en `America/Lima` aunque el servidor esté en UTC; el hoy de `min`/`max` también (`limaToday`).
- **Nombre largo**: `line-clamp` en título y blurb; chip de ciudad con `truncate` a 390 px.
- **Volumen**: sin paginación ni `LIMIT` (seed: 10 tours). Techo conocido: cuando el catálogo pase ~60 tours se agrega `?pagina=` y `getTours` gana `limit`/`offset`.
- **Caché**: hasta que existan productores que invaliden, un tour nuevo publicado tarda ≤ 1 h en aparecer (`cacheLife("minutes")` expira en 1 h); el cupo, ~1 min. Claves acotadas por D6.
- **`DATABASE_URL` ausente**: igual que 007/008, `next build` falla; aceptado.
- **Sin JS**: chips y orden son links; la fecha usa un `<form method="get">`; todo funciona.
- **`prefers-reduced-motion`**: la regla global y el carrusel ya lo manejan; el skeleton no pulsa.
- **Idioma**: español con tildes.

## Tests
`npm test` corre los no-db; los *(db)* con `npm run test:db`, omitidos sin `DATABASE_URL` (patrón de 007/008: `describe.skipIf`, `await import()` dentro del bloque, `next/cache` mockeado).

- `modules/packages/utils/tour-filters.test.ts` — AC2 (válidos, fecha mal formada/inexistente/bisiesto, `orden` inválido, array, slug vacío o > 60), AC3 (`ciudad` existente/inexistente; `fecha` hoy, ayer, +365, +366; `limaToday` con 03:00Z), AC4 (sin filtros → `/tours`, conserva otros, quita clave con `undefined`, orden de claves), AC5 (únicas, conteo, orden, vacío) y `dayRange` (24 h exactas a -05:00).
- `modules/packages/utils/tour-view.test.ts` — AC6 (horas, fallback sin horas, `startTime` → "Sale 4:00 a. m.", próxima salida plural/singular con fecha en Lima y UTC del día siguiente, contador singular/plural).
- `modules/packages/services/tour-service.test.ts` *(db)* — AC7 (conjunto desde `seedPackages`; `draft` y `package` de 3 días insertados y borrados en `afterAll`), AC8, AC9 y AC10 (salidas de prueba relativas a `now()` con un tour de prueba y su limpieza; llena, cancelada, pasada, con cupo), AC11 (ranking vs `getPackages({ duracion: "1" })`, precio con empate, más cortos con `NULL` al final), AC12 (`cacheLife`/`cacheTag`).
- `modules/packages/services/package-service.test.ts` *(db)* — sin cambios; debe seguir en verde tras T1.
- No se testea markup ni componentes (SETUP §3). AC13–AC20 son manuales con Playwright (390×844 y 1280×800), a cargo del orquestador tras la fase 2: capturas, teclado en filtros y en el formulario de fecha, `scrollWidth`, URLs de AC17, comparación con el diseño. AC21: capturas del hero de `/paquetes` antes/después de T5.

## Plan

### Phase 1 — Datos y utilidades
Entrega: `getTours` y las funciones puras testeadas; `getPackages` sin cambio de comportamiento. La app no gana rutas.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: tipos de tours; exportar `isDayTourRow` y usarlo en `getPackages` | modules/packages/types/package.ts, modules/packages/services/package-service.ts | - | A | AC12 | todo |
| T2 | Utilidades de filtros de tours (parseo, `limaToday`, resolución, `dayRange`, ciudades, hrefs, opciones) + test | modules/packages/utils/tour-filters.ts, modules/packages/utils/tour-filters.test.ts | T1 | B | AC2, AC3, AC4, AC5 | todo |
| T3 | Utilidades de vista de tarjeta (duración, salida, próxima salida, contador) + test | modules/packages/utils/tour-view.ts, modules/packages/utils/tour-view.test.ts | T1 | B | AC6 | todo |
| T4 | `getTours` cacheado (dos consultas, D8) + tests de integración | modules/packages/services/tour-service.ts, modules/packages/services/tour-service.test.ts | T1, T2 | C | AC7, AC8, AC9, AC10, AC11, AC12 | todo |

T4 depende de T2 solo por `dayRange`. T2 y T3 corren en paralelo (grupo B); T4 corre luego (grupo C).

### Phase 2 — UI y ruta
Entrega: `/tours` completa con datos reales, filtros por URL, hero, estado vacío, skeleton y CTA.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | setup: extraer `HeroIntro` y `HeroFeatureLink` de `PackagesListing` a un archivo compartido del módulo (sin cambio visual en `/paquetes`) | modules/packages/components/listing-hero.tsx, modules/packages/components/packages-listing.tsx | - | A | AC21 | todo |
| T6 | `TourCard` y `ToursSkeleton` | modules/packages/components/tour-card.tsx, modules/packages/components/tours-skeleton.tsx | T5 | B | AC16, AC18 | todo |
| T7 | `TourFilterBar` (ciudad, fecha con form GET, orden, limpiar) | modules/packages/components/tour-filter-bar.tsx | T5 | B | AC14, AC20 | todo |
| T8 | `ToursListing` (hero, Suspense, contador, grilla/vacío, CTA), exports del módulo y ruta delgada | modules/packages/components/tours-listing.tsx, modules/packages/index.ts, app/(public)/tours/page.tsx | T5, T6, T7 | C | AC1, AC13, AC15, AC17, AC18, AC19, AC21, AC22 | todo |

`index.ts` va en T8 (no en el setup) porque exporta `ToursListing`, que no existe hasta esa tarea; así `tsc` queda en verde al cerrar cada tarea. T6 y T7 no comparten archivos (grupo B).

### Verificación (orquestador, tras T8; no es tarea de developer)
Con `.env.local` (DB sembrada + claves de Clerk): `npm run build && npm start`; Playwright a 390×844 y 1280×800 sobre `/tours`, `/tours?ciudad=cusco`, `/tours?fecha=<jueves sembrado futuro>`, `/tours?ciudad=lima&fecha=<...>&orden=mas-cortos`, una combinación vacía (p. ej. `ciudad=lima&fecha=2026-10-27`) y `/tours?ciudad=atlantida&fecha=2020-01-01&orden=x`; más `/paquetes` (hero sin cambios) y el Inicio. Además `npm run test:db`. Resultado y capturas van al PR; no se commitea código de Playwright. Reviewer por fase: al cerrar cada fase corren `tsc`, `lint`, `build`, `test` (AC1).

## Open questions
- **Q1 (resuelta: se muestra con "Sin salidas próximas"):** un tour sin ninguna salida con cupo, ¿se muestra igual con "Sin salidas próximas" (propuesto, no se esconde catálogo) o se oculta del listado? Ocultarlo es un `EXISTS` más en `getTours` sin `fecha`, pero con el seed actual todos los tours desaparecerían después del 2026-11-19.
- **Q2 (resuelta: se acepta que el demo caduque; seed fuera de alcance):** el seed solo trae salidas hasta el 2026-11-19 (jueves 05/11 y 19/11 + 3 sueltas). ¿Se amplía el seed con salidas recurrentes para tours (otra tarjeta/PR sobre `lib/db/seed/data/schedule.ts`) o se acepta que el demo de "salidas próximas" caduque? Esta spec no toca el seed.
- Sin otras preguntas: alcance `isDayTour`, "salidas próximas", filtro de ciudad, orden y hero ya están decididos por el usuario (D1–D4, D9).
