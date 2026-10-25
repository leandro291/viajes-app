# Listado de paquetes (/paquetes)

- Module: packages
- Status: done
- Approved by: leandro291 (2026-10-25)
- Mode: SDD

## Goal
Crear la ruta pública `/paquetes` (tarjeta Trello 008): grilla de paquetes publicados con filtros por categoría y duración, orden por precio y filtro por destino, todos guardados en la URL. Reutiliza `PackageCard`, `formatPen` y la caché de Next 16 que dejó 007, y atiende el link `/paquetes?destino=<slug>` del buscador del Inicio.

## Scope
- In:
  - Ruta `app/(public)/paquetes/page.tsx` (delgada) y componente `PackagesListing` en `modules/packages`.
  - Service `getPackages(filters)` cacheado (`use cache`, `cacheLife("hours")`, `cacheTag(packages)`), solo `status = published`, con filtros `categoria`, `duracion`, `destino` y orden `orden`.
  - Parseo/validación de `searchParams` y armado de links de filtro (funciones puras).
  - Panel de filtros hecho de **links** (sin JS de cliente), contador de resultados, chip removible del destino activo, estado vacío con "Quitar filtros".
  - `PackageCard`: `className` y `sizes` opcionales para usarla en grilla (el rail del Inicio las pasa y queda idéntico).
- Out:
  - Hero carrusel de destacados de la pantalla del diseño (el rail y el hero ya viven en el Inicio; la tarjeta Trello no lo pide).
  - Paginación o "ver más" (ver Edge cases: techo conocido).
  - Fecha y viajeros del buscador del Inicio.
  - Texto `blurb` y "Ver detalle" en la tarjeta del diseño: `PackageCard` no cambia de contenido.
  - Invalidación de caché (la dejan las specs de CRUD/pagos, ver `docs/specs/packages/home.md`).
  - Cambios de schema, migraciones, nuevas dependencias, `/tours` (tarjeta 010) y `/paquetes/[slug]` (tarjeta 009; las tarjetas siguen apuntando a ella y da 404 hasta entonces, igual que en el Inicio).

## Decisiones a aprobar
- **D1. Parámetros de URL en español**, igual que `?destino=` que ya manda el Inicio: `categoria` (slug), `duracion` (`1` | `2-3` | `4-mas`), `destino` (slug), `orden` (`precio-asc` | `precio-desc`; ausente = recomendados). Se evita `4+` porque `+` en una query se decodifica como espacio. Los filtros se combinan con AND.
- **D2. "Tipo de experiencia" = categoría, sin la opción "Un día".** El diseño repite "Un día" en Tipo y en Duración; ambos dan el mismo conjunto (`isDayTour`). Se deja una sola vez, en Duración (`duracion=1`). Así hay dos filtros (categoría y duración) y no tres. Desvío menor del diseño aprobado.
- **D3. "Recomendados" = orden de más reservados de 007** (reservas `confirmed` desc, `created_at` desc, `id` asc). Es el mismo ranking que ya usa el rail, para que ambas pantallas coincidan.
- **D4. Filtros = `<Link>`, sin componente cliente.** Cada opción es un link a la misma ruta con la query nueva (`scroll={false}`); la opción activa lleva `aria-current="true"`. Se descartan los `<select>` móviles del diseño: abajo se resuelve con chips en fila (scroll horizontal), que no necesitan JS ni estado. Un único marcado: chips en móvil y lista tipo radio en el aside de escritorio (`lg:`), vía clases.
- **D5. "Un día" en `duracion=1`** usa la regla de `isDayTour` (`kind = day_tour` **o** `duration_days = 1`). `2-3` y `4-mas` filtran solo por `duration_days`. El listado incluye paquetes y tours de un día (el diseño los muestra juntos); `/tours` (010) los separará.
- **D6. Slugs desconocidos se descartan.** `categoria` y `destino` solo se aceptan si existen en `getCategories()` / `getDestinations()` (ya cacheados). Un valor inventado se ignora (se muestra todo, sin chip activo) en lugar de generar una entrada de caché por cada string que llegue; así la caché queda acotada. Un valor válido sin resultados (p. ej. `duracion=1&categoria=playas`) sí muestra el estado vacío.
- **D7. Los filtros viajan como argumentos planos a la función cacheada** (patrón "Passing runtime values to cached functions" de `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`). La página lee `searchParams` dentro de un `<Suspense>`; el encabezado de página (migas y `h1`) queda en el shell estático.

## Reuse
- Reuse: `modules/packages` — `PackageCard`, `isDayTour`, `formatDuration`, `getCategories`, tipos `PackageCardDto`/`CategoryDto`; `getFeaturedPackages` como oráculo del ranking (D3).
- Reuse: `modules/destinations` — `getDestinations()` para validar `destino` y mostrar el nombre en el chip.
- Reuse: `lib/db` (`packages`, `destinations`, `categories`, `packageCategories`, `bookings`); índices existentes (`packages_status_kind_idx`, `bookings_package_status_idx`, `packages_destination_idx`).
- Reuse: `lib/money.ts` (`formatPen`), `lib/cache-tags.ts` (`CACHE_TAGS`), `components/ui/badge.tsx`/`button.tsx`, `lucide-react`, `next/link`, `cn`, `zod` (ya instalado, v4) para parsear `searchParams`.
- Reuse: `(public)/layout.tsx` (encabezado, `<main>` de 1240 px, pie) sin cambios; `SITE_LINKS` ya apunta a `/paquetes`.
- Reuse: tokens de `globals.css` (`rounded-card`, `shadow-card`, `bg-sand`, `text-ink-muted`, `font-display`).
- Extend: `modules/packages/components/package-card.tsx` — ancho fijo (`w-[280px] shrink-0 snap-start md:w-[300px]`) pasa a `className` opcional; `sizes` opcional. Sin ellos, queda `block` de ancho completo.
- Extend: `modules/home/components/package-rail.tsx` — pasa a `PackageCard` el ancho/snap que antes llevaba dentro (resultado visual idéntico).
- Extend: `modules/packages/services/package-service.ts` — agrega `getPackages`. Reutiliza ahí mismo `isPublished` (privado) y el mapeo de categorías de `getFeaturedPackages`; se extrae una función interna compartida si el mapeo se repite, sin exportarla.
- Extend: `modules/packages/types/package.ts`, `modules/packages/index.ts`.
- New: `modules/packages/utils/package-filters.ts` — parseo de la query y armado de hrefs; son funciones puras sin db (testeables) que el service y los componentes comparten.
- New: `modules/packages/components/{package-filters,package-grid,packages-listing}.tsx` y `listing-skeleton.tsx`. No hay equivalentes: el rail del Inicio filtra en el cliente sobre 12 tarjetas y no sirve para un catálogo completo filtrado por URL.
- No se agrega `native-select` ni ningún componente shadcn nuevo (D4).

## Acceptance criteria
*(auto)* = comando/test; *(db)* = test de integración con `DATABASE_URL` (`npm run test:db`); *(visual)* = Playwright a 390 px y 1280 px sobre `/paquetes` con la base sembrada (`npm run db:seed`), comparando con el diseño (pantalla Paquetes, `Explorar` / `Movil-Explorar`).

- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` terminan en verde al cierre de cada fase. `next build` no marca `/paquetes` como ruta bloqueante y la lista como parcialmente prerenderizada (shell estático + resultados en streaming).
- AC2 *(auto)*: `parseListingParams(raw)` devuelve `{ categoria?, duracion?, destino?, orden? }`. Valores fuera del vocabulario (`duracion=7`, `orden=x`), repetidos (arrays; se toma el primero) o con un slug vacío o de más de 60 caracteres se descartan sin lanzar. `duracion` acepta solo `1`, `2-3`, `4-mas`; `orden` solo `precio-asc`, `precio-desc`.
- AC3 *(auto)*: `resolveFilters(parsed, categories, destinations)` conserva `categoria`/`destino` solo si el slug existe en las listas dadas (D6) y deja `duracion`/`orden` como llegaron.
- AC4 *(auto)*: `buildListingHref(current, change)` devuelve `/paquetes` sin `?` cuando no queda ningún filtro, omite claves vacías, conserva el resto de filtros al cambiar uno, y genera siempre el mismo string para el mismo conjunto (claves en orden fijo `categoria`, `duracion`, `destino`, `orden`).
- AC5 *(db)*: `getPackages({})` devuelve todos los `published` del seed (20) y ninguno `draft` (un `draft` insertado por el test no aparece). Cada ítem trae destino y categorías ordenadas por nombre, con la forma de `PackageCardDto`.
- AC6 *(db)*: `duracion: "1"` devuelve exactamente los paquetes con `isDayTour`; `"2-3"` los de 2 o 3 días; `"4-mas"` los de 4 o más. Con el seed, los tres conjuntos cuentan 10, 4 y 6 y son disjuntos (el test los calcula desde `seedPackages`, no los fija).
- AC7 *(db)*: `categoria` devuelve solo los paquetes con esa categoría (el test compara con `seedPackages`); `destino` devuelve solo los de ese destino (`cusco` incluye `machu-picchu-magico` y no incluye `titicaca-islas-uros`); los filtros combinados son AND y una combinación sin coincidencias devuelve `[]`.
- AC8 *(db)*: sin `orden`, los primeros paquetes siguen el ranking de más reservados (los mismos 5 que `getFeaturedPackages(5)` como conjunto, y el orden interno por la regla de D3). Con `precio-asc`/`precio-desc` la lista queda ordenada por `priceCents` (empate por `id` asc).
- AC9 *(auto)*: `getPackages` llama a `cacheLife` y a `cacheTag(CACHE_TAGS.packages)` (test con `next/cache` mockeado).
- AC10 *(visual)*: `/paquetes` muestra migas "Inicio / Paquetes", un único `h1` ("Paquetes por todo el Perú"), el panel de filtros y la grilla. Grilla: 1 columna a 390 px, 2 a 768 px, 3 a 1280 px (aside + 3 columnas). Cada tarjeta es un solo link a `/paquetes/<slug>` con imagen (`alt` no vacío), categoría, duración, región, título y "Desde S/ X / persona". Los títulos de tarjeta (`h3`) cuelgan de un `h2` "Resultados" visualmente oculto.
- AC11 *(visual)*: Filtros. Grupos "Tipo de experiencia" (Todos + las 5 categorías) y "Duración" (Cualquiera, Un día, 2 a 3 días, 4 días o más) y "Ordenar" (Recomendados, Precio: menor a mayor, Precio: mayor a menor). Elegir una opción navega a la misma ruta con la query nueva sin saltar el scroll (`scroll={false}`) y marca esa opción con `aria-current="true"`. "Todos"/"Cualquiera"/"Recomendados" quitan su parámetro. Son `<a>` reales: funcionan sin JS y la URL es compartible. Objetivos táctiles ≥ 44 px, foco visible.
- AC12 *(visual)*: Contador `aria-live="polite"`: "N paquetes disponibles" (singular "1 paquete disponible"). Con `destino` válido aparece un chip "Destino: <nombre>" con una "×" accesible ("Quitar destino") que elimina solo ese parámetro. `/paquetes?destino=cusco` desde el buscador del Inicio muestra los de Cusco con ese chip.
- AC13 *(visual)*: Estado vacío ("No hay paquetes con esos filtros", "Prueba con otra duración o tipo de experiencia." y botón "Quitar filtros" hacia `/paquetes`) cuando no hay coincidencias; nunca grilla vacía sin mensaje. "Limpiar" del panel (visible si hay algún filtro) hace lo mismo.
- AC14 *(visual)*: Responsive. En 390 px los grupos del panel son filas de chips con scroll horizontal propio (sin scroll horizontal de página); en ≥ 1024 px el panel es un aside pegajoso a la izquierda (lista tipo radio) y la grilla ocupa el resto. Sin scroll horizontal de página a 390 y 1280 px.
- AC15 *(visual)*: Tokens y estados del sistema de diseño: chip activo `ink` con texto blanco, inactivo blanco con borde (`DESIGN-SYSTEM` "Chip de filtro"); tarjeta con radio 28. Con `prefers-reduced-motion` no hay transiciones nuevas.
- AC16 *(visual)*: Cambiar de filtro con una red lenta muestra el skeleton de la grilla (no pantalla en blanco) y el encabezado/migas no parpadean. `/paquetes` sin params sigue mostrando "Todos", "Cualquiera" y "Recomendados" activos.
- AC17 *(auto)*: El Inicio no cambia: las tarjetas del rail mantienen ancho 280/300 px y `snap-start` (diff de `package-rail.tsx` solo traslada clases; revisión visual del rail a 390 y 1280 px). `package.json` no gana dependencias.
- AC18 *(auto)*: Ningún `"use client"` nuevo en esta spec; `modules/home` solo importa `PackageCard` por su ruta directa como ya hacía (no se agrega ningún import de runtime de `@/modules/packages` a código cliente).
- AC19 *(auto)*: `metadata.title` de la ruta es "Paquetes" (la plantilla raíz produce "Paquetes · Wayra").

## Contracts

### URL
```
/paquetes?categoria=<slug>&duracion=1|2-3|4-mas&destino=<slug>&orden=precio-asc|precio-desc
```
Todos opcionales. Clave ausente = sin filtro (D1).

### `modules/packages/types/package.ts`
```ts
export type DurationFilter = "1" | "2-3" | "4-mas";
export type SortOrder = "precio-asc" | "precio-desc"; // ausente = recomendados (D3)

export type PackageFilters = {
  categoria?: string;
  duracion?: DurationFilter;
  destino?: string;
  orden?: SortOrder;
};
```

### `modules/packages/utils/package-filters.ts` (puras, sin db)
```ts
export const DURATION_OPTIONS: { value: DurationFilter | undefined; label: string }[];
//  undefined → "Cualquiera", "1" → "Un día", "2-3" → "2 a 3 días", "4-mas" → "4 días o más"
export const SORT_OPTIONS: { value: SortOrder | undefined; label: string }[];
//  undefined → "Recomendados", "precio-asc" → "Precio: menor a mayor", "precio-desc" → "Precio: mayor a menor"

export function parseListingParams(
  raw: Record<string, string | string[] | undefined>,
): PackageFilters; // zod; descarta lo inválido (AC2). Slug = string no vacío de hasta 60 caracteres; que exista lo valida `resolveFilters`

export function resolveFilters(
  parsed: PackageFilters,
  categories: { slug: string }[],
  destinations: { slug: string }[],
): PackageFilters; // AC3

export function buildListingHref(
  current: PackageFilters,
  change: Partial<Record<keyof PackageFilters, string | undefined>>,
): string; // AC4
```

### `modules/packages/services/package-service.ts`
```ts
export async function getPackages(filters: PackageFilters): Promise<PackageCardDto[]>;
```
`"use cache"` inline, `cacheLife("hours")`, `cacheTag(CACHE_TAGS.packages)`. Argumento: objeto plano de strings (serializable). Consulta: `packages ⨝ destinations`, `LEFT JOIN bookings ON bookings.package_id = packages.id AND bookings.status = 'confirmed'`, `WHERE isPublished` más, si vienen:
- `destino` → `destinations.slug = $`;
- `categoria` → `EXISTS (SELECT 1 FROM package_categories ⨝ categories WHERE package_id = packages.id AND categories.slug = $)`;
- `duracion` → `"1"`: `kind = 'day_tour' OR duration_days = 1`; `"2-3"`: `duration_days BETWEEN 2 AND 3`; `"4-mas"`: `duration_days >= 4` (D5).

`GROUP BY packages.id, destinations.id`; `ORDER BY`: sin `orden`, `count(bookings.id) DESC, packages.created_at DESC, packages.id`; con `precio-asc`/`precio-desc`, `packages.price_cents ASC|DESC, packages.id`. Segunda consulta de categorías para los ids obtenidos (igual que `getFeaturedPackages`; si el mapeo se repite se extrae una función interna no exportada). Sin `LIMIT` (ver Edge cases).

### `modules/packages/components/package-card.tsx` (extendida)
```tsx
export function PackageCard(props: {
  slug: string; title: string; coverImageUrl: string | null;
  regionLabel: string; tag: string | null; durationLabel: string; priceLabel: string;
  className?: string; // por defecto solo "block"; ancho y snap los pone quien la usa
  sizes?: string;     // por defecto el actual del rail
}): JSX.Element
```
`PackageRail` pasa `className="w-[280px] shrink-0 snap-start md:w-[300px]"`. `PackageGrid` pasa `sizes="(min-width: 1024px) 300px, (min-width: 768px) 45vw, 100vw"`.

### Componentes nuevos (todos Server Components, sin `"use client"`)
```tsx
// package-filters.tsx
PackageFilters({ filters, categories }: {
  filters: PackageFilters;
  categories: { slug: string; name: string }[];
})  // <nav aria-label="Filtros"> con tres grupos de <Link scroll={false}>; botón-link "Limpiar" si hay filtros

// package-grid.tsx
PackageGrid({ packages }: { packages: PackageCardDto[] })
// mapea DTO → props de PackageCard (formatPen, formatDuration, tag = primera categoría); vacío → estado vacío (AC13)

// listing-skeleton.tsx
ListingSkeleton()  // 6 tarjetas esqueleto

// packages-listing.tsx
PackagesListing({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> })
// migas + h1 estáticos; <Suspense fallback={<ListingSkeleton/>}> con el contenido que:
//   await searchParams → parseListingParams
//   Promise.all(getCategories(), getDestinations()) → resolveFilters
//   getPackages(filters) → <PackageFilters/> + chip de destino + contador + <PackageGrid/>
```

### `modules/packages/index.ts`
```ts
export { getFeaturedPackages, getCategories, getPackages } from "./services/package-service";
export { PackagesListing } from "./components/packages-listing";
export { buildListingHref } from "./utils/package-filters";
export type { PackageFilters, DurationFilter, SortOrder } from "./types/package";
// + exports actuales sin cambios
```

### Ruta
```tsx
// app/(public)/paquetes/page.tsx  (delgada)
import { PackagesListing } from "@/modules/packages";
export const metadata = { title: "Paquetes" };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PackagesListing searchParams={searchParams} />;
}
```

## Edge cases
- **Sin paquetes publicados / base vacía**: estado vacío (con su link "Quitar filtros" a `/paquetes`, que en ese caso es inocuo); nunca "undefined" ni error.
- **Parámetros inválidos o repetidos** (`?duracion=7`, `?orden=x`, `?categoria=A B`, `?destino=a&destino=b`): se ignoran o se toma el primer valor (AC2), sin 500 ni 404.
- **Slug válido pero inexistente** (`?destino=atlantida`): se descarta (D6) y se muestra todo, sin chip de destino.
- **Combinación sin resultados**: estado vacío (AC13); el contador no se muestra o dice "0 paquetes disponibles" de forma consistente con el vacío (`aria-live` anuncia el cambio).
- **`kind = day_tour` con `duration_days > 1`** (no ocurre en el seed): entraría en `duracion=1` y en `2-3`/`4-mas`; aceptado, es un dato inconsistente (ERM define day_tour como 1 día).
- **Paquete sin `cover_image_url`**: la tarjeta usa el bloque `bg-sand` (ya lo hace `PackageCard`).
- **Paquete sin categorías**: sin badge; aparece solo con "Todos".
- **Nombre largo**: `line-clamp-2` de la tarjeta; chip de destino con `truncate` a 390 px.
- **Volumen**: sin paginación ni `LIMIT` (el seed tiene 20). Techo conocido: cuando el catálogo supere ~60 paquetes se agrega paginación por `?pagina=` o carga incremental; entonces `getPackages` gana `limit`/`offset`.
- **Caché**: hasta que existan productores que invaliden, un paquete publicado tarda ≤ 1 h en aparecer (igual que el Inicio). Claves de caché acotadas por D6 (categorías y destinos reales × 3 duraciones × 3 órdenes).
- **`DATABASE_URL` ausente**: igual que 007, `lib/db` lanza al importarse y `next build` falla; aceptado.
- **Sin JS**: los filtros son links y siguen funcionando.
- **`prefers-reduced-motion`**: la regla global ya anula animaciones; el skeleton no pulsa con reduced motion.
- **Idioma**: español, con tildes ("Gastronomía", "Duración").

## Tests
`npm test` corre los no-db; los *(db)* corren con `npm run test:db` y se omiten sin `DATABASE_URL` (mismo patrón de 007: `describe.skipIf`, `await import()` dentro del bloque, `next/cache` mockeado).

- `modules/packages/utils/package-filters.test.ts` — AC2 (válidos, fuera de vocabulario, array, slug vacío o de más de 60 caracteres, `4-mas` vs `4+`, vacío), AC3 (slug existente/inexistente), AC4 (sin filtros → `/paquetes`, conserva otros filtros, quita clave con `undefined`, orden fijo de claves, codificación).
- `modules/packages/services/package-service.test.ts` *(db)* — se extiende con AC5 (published, `draft` insertado y borrado en `afterAll`), AC6 (tres rangos desde `seedPackages`, 10/4/6 y disjuntos), AC7 (categoría, destino, AND, vacío), AC8 (ranking por defecto vs `getFeaturedPackages`, orden por precio con empate), AC9 (`cacheLife`/`cacheTag`).
- No se testea markup ni componentes (SETUP §3). AC10–AC16 son manuales con Playwright (390×844 y 1280×800), a cargo del orquestador tras la fase 2: capturas, teclado (Tab/Enter en filtros), `scrollWidth`, `/paquetes?destino=cusco` desde el buscador del Inicio, comparación con el diseño. AC17: capturas del rail del Inicio antes/después.

## Plan

### Phase 1 — Datos, filtros y tarjeta reutilizable
Entrega: `getPackages` y las funciones de filtros testeadas; `PackageCard` usable en grilla; el Inicio idéntico. La app no gana rutas.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: tipos de filtros; `PackageCard` con `className`/`sizes`; `PackageRail` le pasa el ancho/snap de siempre | modules/packages/types/package.ts, modules/packages/components/package-card.tsx, modules/home/components/package-rail.tsx | - | A | AC17 | done |
| T2 | Utilidades puras de filtros (parseo con zod, resolución, hrefs, opciones) + test | modules/packages/utils/package-filters.ts, modules/packages/utils/package-filters.test.ts | T1 | B | AC2, AC3, AC4 | done |
| T3 | `getPackages` cacheado + tests de integración | modules/packages/services/package-service.ts, modules/packages/services/package-service.test.ts | T1 | B | AC5, AC6, AC7, AC8, AC9 | done |

### Phase 2 — UI y ruta
Entrega: `/paquetes` completa con datos reales, filtros por URL, estado vacío y skeleton.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | `PackageFilters` (links, chips en móvil / lista en `lg`) | modules/packages/components/package-filters.tsx | T2 | A | AC11, AC14, AC15 | done |
| T5 | `PackageGrid` (DTO → `PackageCard`, estado vacío) y `ListingSkeleton` | modules/packages/components/package-grid.tsx, modules/packages/components/listing-skeleton.tsx | T1 | A | AC10, AC13, AC14, AC16 | done |
| T6 | `PackagesListing` (migas, `h1`, Suspense, chip de destino, contador), `index.ts` del módulo y la ruta delgada | modules/packages/components/packages-listing.tsx, modules/packages/index.ts, app/(public)/paquetes/page.tsx | T3, T4, T5 | B | AC1, AC10, AC12, AC13, AC16, AC18, AC19 | done |

### Verificación (orquestador, tras T6; no es tarea de developer)
Con `.env.local` (DB sembrada + claves de Clerk): `npm run build && npm start`; Playwright a 390×844 y 1280×800 sobre `/paquetes`, `/paquetes?destino=cusco`, `/paquetes?duracion=1&categoria=playas` (vacío), `/paquetes?duracion=7&orden=x` (inválidos) y el Inicio (rail sin cambios). Además `npm run test:db`. Resultado y capturas van al PR; no se commitea código de Playwright.

Reviewer por fase: al cerrar cada fase corren `tsc`, `lint`, `build`, `test` (AC1).

## Open questions
- **Q1 (no bloqueante, desvío del diseño):** D2 quita "Un día" de "Tipo de experiencia" por estar duplicado en Duración, y D4 cambia los `<select>` móviles por chips. ¿Se mantiene así o se prefiere clavar el diseño al pie de la letra (costaría un componente cliente para los selects)?
- **Q2 (no bloqueante):** el diseño muestra `blurb` y "Ver detalle" en la tarjeta de listado. Esta spec reutiliza `PackageCard` tal cual (sin blurb). ¿Se agrega después, también en el rail del Inicio, o se acepta la tarjeta actual?
