# Destino (/destinos/[slug])

- Module: destinations
- Status: approved
- Approved by: leandro291 (2026-10-25)
- Mode: SDD

## Goal
Crear la ruta pública `/destinos/[slug]` (tarjeta Trello 011, pantalla 5 del diseño): hero con datos clave, "Lo imperdible" (carrusel y mapa), paquetes del destino, "Cuándo viajar" (clima por mes), "Antes de ir" (cómo llegar, aclimatación, preguntas frecuentes). Completa el seed de los 8 destinos, reconecta el bento de Inicio y la miga del detalle de paquete, y cierra el 404 de los enlaces a `/destinos/<slug>`.

## Scope
- In:
  - Esquema y migración aditiva: `destinations.how_to_get_text`, `destinations.tips_text`, `destination_sights.lat`, `destination_sights.lng` (todas nullable).
  - Seed completo de los 8 destinos (datos estructurados, clima de 12 meses, 15 lugares con coordenadas, 24 preguntas, textos) y upsert de `destinations` y `destination_sights` para que el re-seed actualice lo ya sembrado.
  - Servicios `getDestinationBySlug` (destino + clima + lugares + preguntas, cacheado) y `getDestinationPage` (compone destino + paquetes de `@/modules/packages`, 404 si no hay paquetes publicados).
  - Utilidades puras (`formatAltitude`, `sightsHeading`, `beforeYouGo`, `mapPins`, etiquetas de estación y mes) y `lib/slug.ts` (`isValidSlug` promovido desde `packages`).
  - UI: hero, carrusel de lugares, mapa Leaflet (solo cliente), lista de paquetes, gráfico de clima con tabla equivalente, "Antes de ir", skeleton, metadata, ruta delgada.
  - Refactors mínimos por DRY: `PackageCardList` (extraído de `PackageGrid`), `useScrollRail` (extraído de `PackageRail`), `PhotoCredits` compartido.
  - Reconexión: bento de Inicio → `/destinos/<slug>`; miga del detalle de paquete → "Inicio / <Destino> / <título>".
  - Dependencias nuevas: `leaflet`, `react-leaflet`, `@types/leaflet` (dev).
- Out:
  - Índice `/destinos` (no existe): la miga muestra "Destinos" como texto sin enlace; "Todos los destinos" sigue fuera.
  - Invalidación de caché (la dejan las specs de CRUD/pagos; ver `docs/specs/packages/home.md`).
  - Foto propia de "Cómo llegar", párrafo largo de clima por destino, tarjeta compacta de paquetes en móvil (ver Q2, Q4, Q5).
  - Resaltar el mes actual en el gráfico (ver D9, Clima).
  - Subir las fotos a Blob y créditos por foto (hoy es el crédito genérico de `PhotoCredits`).
  - `generateStaticParams` (igual que 009).
  - Edición de destinos desde el panel (no existe aún; solo seed).

## Decisiones a aprobar
Las D1 a D4 ya las tomó el usuario; se listan para que queden en la spec aprobada.

- **D1 (decidida). Mapa con `react-leaflet` + tiles OpenStreetMap, solo cliente**, con un pin por lugar imperdible. Agrega `lat`/`lng` a `destination_sights` (migración + seed) e instala `leaflet@^1.9.4`, `react-leaflet@^5.0.0` (peer React 19 compatible) y `@types/leaflet` (dev). Ver Q3. Cambio acordado con el usuario durante la verificación (2026-10-25): CARTO pasó a exigir API key y devuelve un cartel "API KEY REQUIRED", así que se usa OpenStreetMap, sin clave.
- **D2 (decidida). Seed completo para los 8 destinos**: clima de 12 meses, lugares, preguntas, coordenadas y textos para `cusco`, `arequipa`, `puno`, `amazonia`, `ica-paracas`, `huaraz`, `lima`, `mancora`.
- **D3 (decidida). "Cómo llegar" y "Aclimatación" son columnas nuevas** `destinations.how_to_get_text` y `destinations.tips_text` (Drizzle `howToGetText`, `tipsText`, como `fromLimaText` y `bestSeasonText`), con migración y seed. Si un destino no tiene un dato, la sección o el dato se oculta.
- **D4 (decidida). Reconectar enlaces**: el bento de Inicio vuelve a `/destinos/<slug>`; la miga del detalle de paquete (D7/Q2 de 009) pasa a "Inicio / <Destino> / <título>" con el destino enlazado. Se anota en `docs/specs/packages/package-detail.md` (ver riesgo en T13).
- **D5. `getDestinationBySlug(slug)` NO trae paquetes** (cambio respecto de la idea inicial de la tarjeta: "service con paquetes y precio mínimo"). Devuelve destino + clima + lugares + preguntas; los paquetes se obtienen con `getPackages({ destino: slug })` del index público de `packages`, de modo que se reutiliza el filtro `isPublished`, el caché con tag `packages` y no se duplica la consulta. `getDestinationPage(slug)` (sin `use cache`, compone dos funciones cacheadas) devuelve `{ destination, packages, minPriceCents }`, con `minPriceCents` = mínimo de `priceCents` de todos los paquetes devueltos. Devuelve `null` (la página hace `notFound()`) si el slug es inválido, no existe o hay 0 paquetes publicados (el "desde S/" no existe sin paquetes; mismo criterio que D11 de 007). `destinations` puede importar `@/modules/packages` (index); `packages` no importa `destinations`: no hay ciclo.
- **D6. Cache Components, mismo patrón que D5 de 009**: página delgada; `DestinationPage` es síncrono y envuelve todo en `<Suspense fallback={<DestinationSkeleton/>}>`, con `await params` dentro de la frontera. El skeleton incluye `<PageHero className="min-h-[600px] sm:min-h-[640px]">` para que el encabezado superpuesto no salte. El slug se valida con `^[a-z0-9-]{1,100}$` **antes** de tocar la BD (dentro de `getDestinationPage`), para no cachear claves basura en `use cache`. `isValidSlug` hoy vive en `modules/packages/utils/package-detail.ts`: se mueve a `lib/slug.ts` (+ `lib/slug.test.ts`) y `package-detail.ts` hace `export { isValidSlug } from "@/lib/slug"`, de modo que no cambian su test ni su componente. Sin `generateStaticParams`. Límite conocido de 009: HTTP 200 con UI not-found dentro de `<Suspense>` (Next agrega `noindex`).
- **D7. Seed idempotente que actualiza**: `lib/db/seed/index.ts` inserta todo con `onConflictDoNothing()`; con ids determinísticos (`seedId`) un re-seed no actualizaría los destinos y lugares ya sembrados (Cusco ya existe sin las columnas nuevas ni coordenadas). Solo `destinations` y `destination_sights` pasan a `onConflictDoUpdate` (target `id`, `set` con las columnas descriptivas vía ``sql`excluded.<col>` ``); el resto sigue en `DoNothing`. Los ids de lugares y preguntas de Cusco se conservan (`seedId("destination_sight:cusco:N")`, `seedId("destination_faq:cusco:N")`).
- **D8. Migración aditiva sobre la Neon de desarrollo compartida**: `0001_destination_detail.sql` agrega 4 columnas nullable, sin riesgo para los datos existentes. Su reversa (manual, no se commitea) es `ALTER TABLE ... DROP COLUMN` de las mismas 4 columnas (solo se pierde lo nuevo). Aplicarla y sembrar cambia 8 filas de `destinations` y sus hijas (ver Q6). En este worktree solo existe `.env` (no `.env.local`), y los scripts usan `--env-file=.env.local`; la verificación corre con `node --env-file=.env ./node_modules/drizzle-kit/bin.cjs migrate` y `npx tsx --env-file=.env lib/db/seed/index.ts` (como se resolvió en 009 Q3).
- **D9. Decisiones de UI** (justificadas contra `docs/DESIGN-SYSTEM.md`, sección "Fidelidad al artefacto"; las desviaciones del tablero están en la tabla al final de esta sección):
  - **Mapa**: bloque dentro de "Lo imperdible", debajo del carrusel; tarjeta redondeada (`rounded-card`, 28), alto 420 px escritorio / 320 px móvil. Pines = círculos blancos numerados (`L.divIcon`) con el mismo número que la tarjeta del carrusel, sin imágenes de marcador de Leaflet (evita el problema de rutas de assets del bundler). Popup con el nombre (texto como hijo de React, escapado). Con 1 pin: `setView` con zoom 12; con ≥ 2: `fitBounds` con padding. Tiles OpenStreetMap `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, `maxZoom: 19`, atribución visible "© OpenStreetMap contributors". `scrollWheelZoom` desactivado (no secuestrar el scroll de la página). Con `prefers-reduced-motion`: `zoomAnimation`, `fadeAnimation` y `markerZoomAnimation` en `false`. Navegable con teclado (marcadores con `title` y `keyboard`), foco visible. La vista equivalente accesible es el carrusel (misma lista). Se oculta si ningún lugar tiene coordenadas. El contenedor usa `isolate` para que los z-index de Leaflet (hasta 1000) no tapen el encabezado.
  - **Clima**: 12 barras `aria-hidden` + `<table class="sr-only">` equivalente (DESIGN-SYSTEM: "toda gráfica tiene vista de tabla"). La estación no depende solo del color: la altura de la barra también la codifica (seca 150 px, mixta 110 px, lluvias 76 px) y hay leyenda con nombres; a ≥ 640 px además el texto de la estación va dentro de la barra. El "mes actual en accent" del DS **no** se aplica: requeriría `Date` en runtime fuera de caché y el tablero no lo muestra. Sección oculta si no están los 12 meses. Bajo el título: "Mejor época: {best_season_text}." solo si existe (el párrafo largo del tablero es específico de Cusco; ver Q4).
  - **"Antes de ir"**: util pura `beforeYouGo(altitudeM)` → `{ heading, tipsLabel }`: si `altitudeM >= 2000` (`ALTITUDE_THRESHOLD_M`) → "Prepárate para la altura" / "Aclimatación"; si no (o nulo) → "Prepara tu viaje" / "Consejos". Columna izquierda: eyebrow "Antes de ir" + `h2` + tarjeta "Cómo llegar" (si hay `how_to_get_text`) + caja de consejos (si hay `tips_text`, fondo `primary-soft`). Columna derecha: "Preguntas frecuentes" con `<details>` independientes (sin `name`, como el tablero), si hay preguntas. Sin nada a la izquierda, se oculta esa columna y las preguntas pasan a ancho completo (máx. 820 px) con `h2` "Preguntas frecuentes" y el mismo eyebrow; sin nada en total la sección no se renderiza. La tarjeta "Cómo llegar" usa la foto de portada del destino con degradado (el tablero usa la foto del tren solo para Cusco y no hay columna para esa foto; ver Q2); en móvil también se muestra su texto.
  - **Lugares**: `h2` dinámico con `sightsHeading(n)` ("Un lugar que justifica el viaje", "Dos lugares…" hasta nueve; ≥ 10 con dígito); el tablero dice "Cinco lugares que justifican el viaje". Sección y mapa ocultos sin lugares. Tarjetas 4/5 de 380 px (móvil 270×340). Flechas solo ≥ 721 px; scroll nativo con snap; clic = `scrollBy(clientWidth * 0.85)`, respetando reduced motion. Tarjetas con `alt=""` (decorativas: el nombre está en el texto).
  - **Paquetes**: hasta 6 (`MAX_PACKAGES = 6`) con `PackageCardList`; "Ver todos →" a `/paquetes?destino=<slug>` (enlace `primary`, no CTA). Usa la tarjeta `grid` del DS (con `blurb` y flecha), no la simple del tablero; grilla `repeat(auto-fill, minmax(min(300px,100%),1fr))` como el tablero. Un solo CTA `accent` por vista: "Ver paquetes en X"; "Cuándo viajar" (ancla `#cuando`) solo se muestra si hay clima.
  - **Hero**: `PageHero` con foto de fondo (`next/image fill priority`, `sizes="100vw"`, `object-position: center 40%`, `alt=""`), `min-h` 600 px móvil / 640 px escritorio, `h1` con la fórmula `clamp(64px,11vw,148px)`, interlineado .85, tracking −0.055em. Descripción = `description ?? tagline`. Franja de datos: Altitud (`formatAltitude`), Mejor época, Desde Lima, "Paquetes: Desde S/ X"; cada dato opcional se oculta si es nulo; "Paquetes" siempre. En móvil "Desde Lima" se oculta (`max-sm:hidden`), como el tablero móvil.
  - **Créditos de foto**: el DS exige crédito para fotos CC. `PhotoCredits` (`modules/home/components/photo-credits.tsx`, texto genérico) se promueve a `components/shared/photo-credits.tsx`, se borra el del módulo `home`, se actualiza `home-page.tsx` y se usa también al final de la página de destino. Es deuda conocida (se retira cuando las fotos pasen a Blob con crédito, D12 de `home.md`).
  - **Metadata**: `title` = nombre (la plantilla raíz agrega "· Wayra"), `description` = `tagline ?? description`, `openGraph.images` = `heroImageUrl` si existe. Slug inválido o desconocido: `title: "Destino no encontrado"`.
  - **Ruta**: `app/(public)/destinos/[slug]/page.tsx` delgada, igual que la de `/paquetes/[slug]` (tipos `Params` a mano). Miga "Inicio / Destinos / <Nombre>": "Inicio" enlazado, "Destinos" texto sin enlace (no existe `/destinos`; reglas del DS: sin enlaces muertos), nombre con `aria-current="page"`.

### Desviaciones respecto del tablero

| Elemento | Tablero | Implementación | Motivo |
| -------- | ------- | -------------- | ------ |
| Miga "Destinos" | Enlazada | Texto sin enlace | `/destinos` no existe; sin enlaces muertos (DS, fidelidad 8) |
| `h1` en móvil | 84 px (tablero móvil) | `clamp(64px,11vw,148px)` = 64 px a 390 | Misma fórmula del DS en ambos anchos |
| Título de lugares | "Cinco lugares que justifican el viaje" fijo | Dinámico según cantidad | Veracidad: el seed trae 1 a 5 lugares (fidelidad 6) |
| Mapa | No lo trae | Bloque nuevo bajo el carrusel | Decisión D1 del usuario |
| Mes actual en `accent` | DS lo pide; el tablero no lo muestra | No se aplica | Requeriría `Date` fuera de caché |
| Barras de clima en móvil | Solo color + leyenda | Altura codifica la estación; texto solo ≥ 640 px | El color no puede ser la única señal (DS) |
| Tarjeta de paquete | Tarjeta simple (móvil: fila de 96 px) | `PackageCard` variante `grid`; en móvil, una columna de tarjetas | Reutilizar el componente del DS (ver Q5) |
| Foto de "Cómo llegar" | Foto del tren (solo Cusco) | Portada del destino | No hay columna para esa foto (Q2) |
| "Cómo llegar" en móvil | Solo foto | Foto + texto | Veracidad: el dato no se omite |
| Título de "Antes de ir" | "Prepárate para la altura" fijo | Según altitud (`beforeYouGo`) | Veracidad: Lima (154 m) no necesita aclimatación |
| Créditos de foto | Línea con crédito por foto | `PhotoCredits` genérico | Deuda conocida de 007/D12 |
| Flechas del carrusel | Visibles | Solo ≥ 721 px | Como el tablero móvil; en móvil se desliza |

## Reuse
- Reuse: `modules/destinations` (`getDestinations` como patrón de `use cache` + `cacheLife("hours")` + `cacheTag`, `destination-service.test.ts` como patrón de test db con `describe.skipIf(!DATABASE_URL)`, `next/cache` mockeado con `vi.hoisted`).
- Reuse: `modules/packages` — `getPackages({ destino })` (ya filtra por slug, solo publicados, cacheado con tag `packages`), `PackageCardDto`, `PackageCard`, `formatDuration`, `buildListingHref({}, { destino })` para `/paquetes?destino=<slug>`.
- Reuse: `components/shared/page-hero.tsx`, `section-heading.tsx`, `components/ui/button.tsx` (variante `cta`; "Cuándo viajar" con `ghost` + clases de contorno blanco), `lib/money.ts` (`formatPen`, y el mismo `NNBSP`/`NBSP` en `formatAltitude`), `lib/cache-tags.ts` (`CACHE_TAGS.destinations`), `lib/db` (`destinations`, `destinationClimateMonths`, `destinationSights`, `destinationFaqs`), `next/image`, `next/link`, `lucide-react`, `cn`, tokens de `globals.css` (`rounded-card`, `shadow-card`, `bg-sand`, `bg-primary-soft`, `bg-primary-mid`, `bg-sand-deep`, `text-ink-muted`, `font-display`).
- Reuse: `lib/db/seed` (`seedId`, `SEED_IMAGES`, `onConflictDoNothing` del resto), `seed-data.test.ts` (se extiende), `docs/specs/shared/database-foundation-seed-data.md` (anexo, se actualiza).
- Extend: `lib/db/schema/destinations.ts` (4 columnas; `doublePrecision` ya se usa en `package_itinerary_days.lat/lng`).
- Extend: `lib/db/seed/data/destinations.ts` (datos de los 8), `lib/db/seed/index.ts` (upsert de dos tablas), `lib/db/seed/seed-data.test.ts` (totales y reglas), `docs/ERM.md` y el anexo del seed.
- Extend: `modules/packages/components/package-grid.tsx` (usa `PackageCardList`), `modules/packages/index.ts` (exporta `PackageCardList`), `modules/packages/utils/package-detail.ts` (re-exporta `isValidSlug`), `modules/packages/components/package-detail.tsx` (miga), `modules/home/components/package-rail.tsx` (usa `useScrollRail`), `modules/home/components/destination-bento.tsx` (href), `modules/home/components/home-page.tsx` (import de `PhotoCredits`).
- New: `lib/slug.ts` — hoy `isValidSlug` está en un util de `packages` y lo necesitan dos módulos; `lib/` es el lugar transversal.
- New: `hooks/use-scroll-rail.ts` — la lógica de scroll (`matchMedia` reduced motion + `scrollBy`) vive inline en `PackageRail`; 2 usos (PackageRail y SightsRail) = DRY. La carpeta `hooks/` no existe aún: se crea.
- New: `components/shared/photo-credits.tsx` — lo usan `home` y `destinations` (2 módulos).
- New: `modules/packages/components/package-card-list.tsx` — `PackageGrid` mezcla empty state de filtros con la lista; `/paquetes` y `/destinos` comparten solo la lista. No existe export que renderice solo las tarjetas.
- New: componentes de destino (hero, gráfico de clima, carrusel de lugares, mapa, "Antes de ir", skeleton). No hay equivalentes: `HeroCarousel` es de slides del Inicio y `PackageRail` está atado a chips y paquetes; el mapa no existe en el repo.
- New (dependencias): `leaflet`, `react-leaflet`, `@types/leaflet`. No hay mapa instalado; el `<iframe>` de un proveedor no permite pines numerados ni teclado propio. Verificado en npm: `react-leaflet@5` declara peer `react@^19`.

## Acceptance criteria
*(auto)* = comando o test; *(db)* = test de integración con `DATABASE_URL` (`npm run test:db`, con `.env`, ver D8); *(visual)* = Playwright a 390×844 y 1280×800 con la base migrada y sembrada, comparando con `Destino` / `Movil-Destino` del artefacto.

### Transversales
- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` en verde al cierre de cada fase. `next build` no marca `/destinos/[slug]` como ruta bloqueante.
- AC2 *(auto)*: `package.json` solo gana `leaflet`, `react-leaflet` (dependencies) y `@types/leaflet` (devDependencies); ninguna otra dependencia ni script cambia.

### Esquema y migración
- AC3 *(auto)*: `lib/db/schema/destinations.ts` declara `howToGetText: text()` y `tipsText: text()` en `destinations`, y `lat: doublePrecision()` y `lng: doublePrecision()` en `destination_sights`, todas nullable. `0001_destination_detail.sql` contiene exactamente 4 `ALTER TABLE ... ADD COLUMN` (sin `NOT NULL`, sin `DROP` ni cambios a otras columnas); `meta/_journal.json` y `meta/0001_snapshot.json` están actualizados; volver a correr `npx drizzle-kit generate` no produce una migración nueva.
- AC4 *(db)*: tras aplicar la migración a la Neon de desarrollo, `information_schema.columns` muestra las 4 columnas (`text`, `text`, `double precision`, `double precision`, `is_nullable = YES`) y las filas previas siguen intactas (conteos de `destinations`, `destination_sights`, `packages` sin cambio). La reversa manual (D8) está documentada; no se ejecuta.

### Seed
- AC5 *(auto)*: conteos tras el seed: `destinations` 8, `destination_climate_months` 96, `destination_sights` 15, `destination_faqs` 24 (`expectedCounts` y anexo §9 actualizados; los demás conteos no cambian).
- AC6 *(auto)*: reglas de calidad (tests en `seed-data.test.ts`):
  - cada destino tiene los meses 1 a 12 una sola vez, con `season` en `dry|mixed|rainy`, según la tabla de Contracts;
  - cada lugar tiene `lat` en [−19, 0] y `lng` en [−82, −68]; `sort_order` contiguo desde 1 por destino; las 15 `imageUrl` son distintas y salen de `SEED_IMAGES`;
  - los 8 destinos tienen `tagline`, `description`, `altitudeM`, `bestSeasonText`, `howToGetText`, `tipsText` y 3 preguntas; `fromLimaText` es nulo solo en `lima`;
  - ningún texto nuevo está vacío ni es solo espacios; ninguno contiene `garantiz` (sin distinguir mayúsculas) ni un precio (`S/` seguido de dígito); ningún texto de FAQ promete entrada incluida sin "en los paquetes que lo indican" (ver reglas de redacción en Contracts);
  - los valores de altitud, `fromLimaText`, `bestSeasonText`, coordenadas y patrón de clima de cada destino coinciden con la tabla de Contracts (el test importa los `seed*`, no duplica textos largos).
- AC7 *(db)*: el seed es idempotente: sobre la base con Cusco ya sembrado (sin las columnas nuevas), la primera corrida deja `how_to_get_text`, `tips_text`, `lat`, `lng` y los datos de los 8 destinos poblados; una segunda corrida no cambia ningún conteo ni valor (`SELECT count(*)` por tabla y las 4 columnas nuevas antes y después). Los ids de lugares y preguntas de Cusco no cambian.

### Servicios y utilidades
- AC8 *(db)*: `getDestinationBySlug("cusco")` devuelve el destino con todos sus campos (incl. `altitudeM`, `howToGetText`, `tipsText`), 12 meses de clima ordenados por `month`, lugares ordenados por `sortOrder` (con `lat`/`lng`) y preguntas ordenadas por `sortOrder`; los valores se calculan desde las exportaciones `seed*` (no se fijan a mano). Funciona para los 8 slugs del seed. Slug inexistente → `null`. Un destino sin filas hijas (insertado por el test) devuelve `climate: []`, `sights: []`, `faqs: []` sin lanzar.
- AC9 *(db)*: `getDestinationBySlug` llama a `cacheLife("hours")` y `cacheTag(CACHE_TAGS.destinations)` (test con `next/cache` mockeado).
- AC10 *(db)*: `getDestinationPage(slug)`:
  - devuelve `null` sin consultar la BD si el slug no cumple `^[a-z0-9-]{1,100}$` (p. ej. `"Cusco X"`, `""`, 101 caracteres);
  - devuelve `null` para un slug inexistente, para un destino sin paquetes y para un destino cuyo único paquete es `draft` (el test inserta ambos y los borra en `afterAll`);
  - para `cusco` devuelve los paquetes de `getPackages({ destino: "cusco" })` (solo `published`) y `minPriceCents` = mínimo de `priceCents` de los `seedPackages` publicados de Cusco.
- AC11 *(auto)*: `isValidSlug` vive en `lib/slug.ts` (acepta `machu-picchu-magico`, `a`, 100 caracteres; rechaza `Machu Picchu`, `""`, mayúsculas, 101 caracteres, `a_b`); `modules/packages/utils/package-detail.ts` lo re-exporta y su test existente sigue en verde sin cambios.
- AC12 *(auto)*: utilidades puras de `modules/destinations/utils/destination-page.ts`:
  - `formatAltitude(3399)` = `"3 399 m s. n. m."`, `formatAltitude(154)` = `"154 m s. n. m."`, `formatAltitude(4)` = `"4 m s. n. m."`;
  - `sightsHeading(1)` = "Un lugar que justifica el viaje", `(2)` = "Dos lugares que justifican el viaje", `(5)` = "Cinco lugares que justifican el viaje", `(9)` = "Nueve lugares que justifican el viaje", `(10)` = "10 lugares que justifican el viaje"; `n < 1` devuelve "Lugares que justifican el viaje" (no se renderiza);
  - `beforeYouGo(3399)` y `(2000)` = `{ heading: "Prepárate para la altura", tipsLabel: "Aclimatación" }`; `(1999)`, `(154)` y `null` = `{ heading: "Prepara tu viaje", tipsLabel: "Consejos" }`;
  - `mapPins(sights)` devuelve solo los lugares con `lat` y `lng` no nulos, cada uno con `n` = posición (desde 1) en la lista **completa** (un lugar sin coordenadas no renumera a los demás), `name`, `lat`, `lng`; lista vacía → `[]`;
  - `SEASON_LABEL` = `{ dry: "Seca", mixed: "Mixta", rainy: "Lluvias" }`; `MONTH_SHORT` y `MONTH_NAMES` tienen 12 entradas ("Ene" … "Dic", "enero" … "diciembre").
- AC13 *(auto)*: `PackageGrid` y `/paquetes` no cambian de comportamiento: los tests existentes de `packages` siguen en verde y `LISTING_GRID_CLASS` sigue exportado (lo usa `listing-skeleton.tsx`). *(visual)* `/paquetes` y el rail del Inicio se ven y se comportan igual que antes del refactor (flechas, snap, reduced motion).

### Página (visual salvo que se indique)
Todo contra `/destinos/cusco` (completo) salvo donde se nombre otro destino.
- AC14: Hero: foto de portada, migas "Inicio / Destinos / Cusco" ("Destinos" sin enlace, "Cusco" con `aria-current="page"`), único `h1` "Cusco", descripción del destino, CTA "Ver paquetes en Cusco" (→ `/paquetes?destino=cusco`) y botón "Cuándo viajar" (→ `#cuando`). El `h1` mide 64 px a 390 px y la fórmula `clamp(64px,11vw,148px)` a 1280 px (148 px tope); alto mínimo 600/640 px.
- AC15: Franja de datos en Cusco: "Altitud 3 399 m s. n. m.", "Mejor época Mayo a septiembre", "Desde Lima ~1 h 30 en avión", "Paquetes Desde S/ X" (X = mínimo de sus paquetes publicados). En 390 px no aparece "Desde Lima". `/destinos/lima` no muestra "Desde Lima" en ningún ancho (el dato es nulo) y el resto de la franja se ve sin huecos.
- AC16: "Lo imperdible": `h2` "Cinco lugares que justifican el viaje", 5 tarjetas numeradas 1 a 5 (nombre y texto, foto 4/5, `alt=""`), carrusel con scroll nativo y snap; las flechas "Lugares anteriores" / "Más lugares" existen solo a ≥ 721 px y desplazan ~85 % del ancho visible (sin animación con `prefers-reduced-motion`). `/destinos/puno` muestra "Un lugar que justifica el viaje" y 1 tarjeta.
- AC17: Mapa (`/destinos/cusco`): 5 pines blancos numerados 1 a 5 (mismo número que las tarjetas); alto 420 px escritorio / 320 px móvil; atribución "© OpenStreetMap contributors" visible; la rueda del ratón sobre el mapa no hace zoom y la página sigue desplazándose; con teclado se llega a cada pin con Tab y Enter abre el popup con el nombre; el foco es visible. Con 1 lugar (`/destinos/puno`) el mapa muestra 1 pin con zoom 12. Con `prefers-reduced-motion` no hay animación de zoom. El mapa no tapa el encabezado al desplazarse.
- AC18: Paquetes: `h2` "Paquetes en Cusco" (eyebrow "Reserva tu viaje"), máximo 6 tarjetas `grid` (Cusco tiene 7 publicados: aparecen 6), cada una enlaza a `/paquetes/<slug>`; "Ver todos →" enlaza a `/paquetes?destino=cusco`. Las tarjetas son las mismas de `/paquetes` (`PackageCardList`).
- AC19: Clima: sección con `id="cuando"`, `h2` "Cuándo viajar" y "Mejor época: Mayo a septiembre."; 12 barras por mes con alturas 150/110/76 px (seca `#0F5257`, mixta `#8FBDB8`, lluvias `#EDE7DB`) según el patrón de Cusco; leyenda "Seca / Mixta / Lluvias"; las barras son `aria-hidden` y existe una `<table>` `sr-only` con 12 filas (mes, estación) y `caption`; a ≥ 640 px la barra muestra el texto de la estación. Al pasar el cursor sobre una barra las demás bajan a 40 % de opacidad. "Cuándo viajar" (botón del hero) hace scroll a la sección.
- AC20: "Antes de ir" en Cusco: eyebrow "Antes de ir", `h2` "Prepárate para la altura", tarjeta "Cómo llegar" con la portada, el degradado y el texto (también en 390 px), caja "Aclimatación" con fondo `primary-soft`, y "Preguntas frecuentes" con 3 `<details>` independientes (abrir uno no cierra otro; funciona sin JS; resumen ≥ 44 px de alto; foco visible). `/destinos/lima` muestra "Prepara tu viaje" y la caja "Consejos".
- AC21: Secciones ocultas por dato ausente, sin huecos: un destino sin lugares no muestra carrusel ni mapa; sin los 12 meses no hay "Cuándo viajar" ni el botón "Cuándo viajar" del hero; sin `how_to_get_text`, `tips_text` ni preguntas no hay "Antes de ir"; con solo preguntas se muestran a ancho completo (ver D9). Se verifica insertando temporalmente una fila sin hijas (o con el test db + inspección del DTO) y con Lima/Puno.
- AC22: `/destinos/no-existe`, `/destinos/Cusco%20X` (slug inválido), y un destino sin paquetes publicados muestran la página not-found (D6; HTTP 200 con `noindex` es el límite conocido) y no rompen. Los 8 slugs del seed cargan sin error.
- AC23 *(auto)*: `generateDestinationMetadata` devuelve `title` = nombre, `description` = `tagline ?? description`, `openGraph.images` = `[heroImageUrl]` si existe; slug inválido o desconocido → `title: "Destino no encontrado"` (verificable con `next build` + inspección del `<title>`, o test del helper si se extrae).
- AC24: Reconexión: cada tarjeta del bento de Inicio enlaza a `/destinos/<slug>` y ya no queda el comentario "Mientras /destinos/[slug] no exista"; la miga de `/paquetes/<slug>` es "Inicio / <Destino> / <título>" con el destino enlazado a `/destinos/<slug>` (objetivo ≥ 44 px) y sin el segundo nivel "Paquetes". Ningún enlace del sitio apunta a una ruta inexistente (`/destinos` solo aparece como texto).
- AC25: Créditos: `PhotoCredits` vive en `components/shared/photo-credits.tsx`, el de `modules/home/components/` no existe, el Inicio lo sigue mostrando al final y la página de destino lo muestra al final.
- AC26: Accesibilidad: un solo `h1`; jerarquía `h1 > h2 > h3` sin saltos; foco visible en todo control nuevo (`accent` en superficie clara, `focus` dentro del hero oscuro); objetivos táctiles ≥ 44 px (flechas, enlaces de miga, "Ver todos", resúmenes de FAQ); `prefers-reduced-motion` sin transiciones nuevas ni animación de scroll/zoom; contraste AA del texto sobre la foto (degradado del `PageHero`); un solo CTA `accent` por vista.
- AC27: Sin scroll horizontal de página a 390 y 1280 px (`document.documentElement.scrollWidth <= clientWidth`) en `/destinos/cusco`, `/destinos/lima` y `/destinos/puno`; el carrusel desplaza solo su contenedor.
- AC28 *(auto)*: el mapa es solo cliente: `DestinationMap` es el único "use client" que importa `next/dynamic` con `ssr: false`; `leaflet` y `react-leaflet` solo se importan en `destination-map-canvas.tsx`; el HTML servidor de `/destinos/cusco` contiene el placeholder `bg-sand` del mismo alto pero no `leaflet-container`; no hay `window is not defined` en la consola ni en el log del servidor; `.next/server/app/page_client-reference-manifest.js` (Inicio) y el de `/paquetes` no mencionan `leaflet`. Ningún componente cliente importa en runtime desde `@/modules/packages` ni `@/modules/destinations` (solo `import type` o rutas internas presentacionales; `grep`).
- AC29 *(visual)*: con red lenta se ve el skeleton (`PageHero` de 600/640 px) y el encabezado superpuesto no salta al llegar el contenido; con la conexión cortada el mapa muestra el contenedor sin romper el layout.

## Contracts

### Esquema (`lib/db/schema/destinations.ts`)
```ts
// destinations (agrega)
howToGetText: text(),   // "Cómo llegar"
tipsText: text(),       // "Aclimatación" o "Consejos"
// destination_sights (agrega)
lat: doublePrecision(), // import doublePrecision from drizzle-orm/pg-core
lng: doublePrecision(),
```
Migración generada con `npx drizzle-kit generate --name destination_detail` (no necesita conectarse; casing `snake_case`). SQL esperado:
```sql
ALTER TABLE "destinations" ADD COLUMN "how_to_get_text" text;
ALTER TABLE "destinations" ADD COLUMN "tips_text" text;
ALTER TABLE "destination_sights" ADD COLUMN "lat" double precision;
ALTER TABLE "destination_sights" ADD COLUMN "lng" double precision;
```
`docs/ERM.md`: `destinations` agrega `how_to_get_text`, `tips_text`; `destination_sights` agrega `lat`, `lng` (nullable, "pin del mapa de Destino").

### Seed: datos estructurados (aproximados e ilustrativos, como todo el seed; revisión humana en el PR, Q7)

| slug | `altitude_m` | `from_lima_text` | `best_season_text` | clima (ene → dic) |
| ---- | ------------ | ---------------- | ------------------ | ----------------- |
| `cusco` | 3399 | "~1 h 30 en avión" (existente) | "Mayo a septiembre" (existente) | rainy, rainy, rainy, mixed, dry×5, mixed, rainy, rainy |
| `arequipa` | 2335 | "~1 h 45 en avión" | "Abril a diciembre" | rainy, rainy, mixed, dry×8, mixed |
| `puno` | 3827 | "~1 h 50 en avión a Juliaca" | "Mayo a septiembre" | igual que Cusco |
| `amazonia` | 183 | "~1 h 40 en avión a Puerto Maldonado" | "Mayo a octubre" | rainy×3, mixed, dry×6, mixed, rainy |
| `ica-paracas` | 406 | "~4 h en bus" | "Todo el año" | dry×4, mixed×4, dry×4 |
| `huaraz` | 3052 | "~8 h en bus" | "Mayo a septiembre" | igual que Cusco |
| `lima` | 154 | `null` (se oculta: demuestra la regla) | "Diciembre a abril" | dry×4, mixed×7, dry |
| `mancora` | 4 | "~1 h 50 en avión a Talara + 1 h por tierra" | "Diciembre a abril" | dry×4, mixed×7, dry |

Lugares imperdibles (15; `sort_order` 1..n por destino; ids `seedId("destination_sight:<slug>:<n>")`; foto = `SEED_IMAGES[key].path`, sin repetir foto; coordenadas aproximadas a 3 decimales):

| slug | n | lugar | foto | lat | lng |
| ---- | - | ----- | ---- | --- | --- |
| `cusco` | 1 | Machu Picchu | `mp` | −13.163 | −72.545 |
| `cusco` | 2 | Valle Sagrado | `pis` | −13.421 | −71.848 |
| `cusco` | 3 | Sacsayhuamán | `sac` | −13.509 | −71.982 |
| `cusco` | 4 | Vinicunca | `vin` | −13.870 | −71.303 |
| `cusco` | 5 | Aguas Calientes | `agc` | −13.155 | −72.526 |
| `arequipa` | 1 | Plaza de Armas | `are` | −16.399 | −71.537 |
| `arequipa` | 2 | Cañón del Colca | `col` | −15.605 | −71.890 |
| `puno` | 1 | Islas Uros | `uro` | −15.822 | −69.969 |
| `amazonia` | 1 | Reserva Nacional Tambopata | `tam` | −12.900 | −69.400 |
| `ica-paracas` | 1 | Huacachina | `hua` | −14.088 | −75.763 |
| `ica-paracas` | 2 | Islas Ballestas | `bal` | −13.736 | −76.417 |
| `ica-paracas` | 3 | Bahía de Paracas | `par` | −13.834 | −76.251 |
| `huaraz` | 1 | Laguna 69 | `l69` | −9.013 | −77.607 |
| `lima` | 1 | Costa Verde | `lim` | −12.125 | −77.039 |
| `mancora` | 1 | Playa de Máncora | `man` | −4.103 | −81.045 |

Cusco conserva los nombres, fotos y descripciones actuales de sus 5 lugares, y suma `lat`/`lng`. Los 8 destinos conservan su `hero_image_url` actual.

Textos que escribe el developer (en español neutro de Perú, con tildes), por destino: `tagline`, `description`, `how_to_get_text`, `tips_text`, 3 preguntas (24 en total) y la descripción de cada lugar nuevo (10). Reglas de redacción:
- Cusco conserva `tagline`, `description` y sus 3 preguntas actuales; suma `how_to_get_text` = "Vuelo directo desde Lima o bus desde Arequipa y Puno. A Machu Picchu se llega en tren por el valle del Urubamba." y `tips_text` = "Cusco está a más de 3 000 m. Toma el primer día con calma, bebe agua y evita comidas pesadas." (texto del tablero).
- Sin inventar datos que puedan perjudicar al viajero ni prometer resultados: nada de "garantizado", precios, horarios concretos ni cifras de seguridad.
- Consejos de salud solo genéricos (descansar, hidratarse, consultar a un médico si hay condiciones previas); en destinos de altura, coherentes con `altitude_m`.
- Las preguntas solo reafirman datos ya presentes: mejor época coherente con el clima de la tabla, la política de cambio de fecha ("hasta 48 horas antes de la salida y sujeto a disponibilidad", como en Cusco / ERM) y entrada incluida solo "en los paquetes que lo indican".
- `how_to_get_text` coherente con `from_lima_text` cuando existe; `lima` no menciona un viaje desde Lima.
- Una a dos frases por texto, sin saltos de línea.

### Seed: upsert (`lib/db/seed/index.ts`)
```ts
await tx.insert(destinations).values(seedDestinations).onConflictDoUpdate({
  target: destinations.id,
  set: {
    tagline: sql`excluded.tagline`,
    description: sql`excluded.description`,
    altitudeM: sql`excluded.altitude_m`,
    bestSeasonText: sql`excluded.best_season_text`,
    fromLimaText: sql`excluded.from_lima_text`,
    howToGetText: sql`excluded.how_to_get_text`,
    tipsText: sql`excluded.tips_text`,
  },
});
await tx.insert(destinationSights).values(seedDestinationSights).onConflictDoUpdate({
  target: destinationSights.id,
  set: {
    name: sql`excluded.name`,
    description: sql`excluded.description`,
    imageUrl: sql`excluded.image_url`,
    sortOrder: sql`excluded.sort_order`,
    lat: sql`excluded.lat`,
    lng: sql`excluded.lng`,
  },
});
// el resto de las tablas: onConflictDoNothing() sin cambios
```
(Los nombres de columna en `excluded.*` son los reales de Postgres, `snake_case`.)

### `lib/slug.ts`
```ts
export function isValidSlug(slug: string): boolean; // /^[a-z0-9-]{1,100}$/
```

### `modules/destinations/types/destination.ts` (extiende)
```ts
export type Season = "dry" | "mixed" | "rainy";
export type ClimateMonthDto = { month: number; season: Season };           // 1..12
export type SightDto = {
  id: string; name: string; description: string; imageUrl: string;
  sortOrder: number; lat: number | null; lng: number | null;
};
export type FaqDto = { id: string; question: string; answer: string };
export type DestinationDetailDto = {
  id: string; slug: string; name: string; region: string;
  tagline: string | null; description: string | null;
  altitudeM: number | null; bestSeasonText: string | null; fromLimaText: string | null;
  howToGetText: string | null; tipsText: string | null; heroImageUrl: string | null;
  climate: ClimateMonthDto[];  // por month asc; [] si no hay
  sights: SightDto[];          // por sortOrder asc; [] si no hay
  faqs: FaqDto[];              // por sortOrder asc; [] si no hay
};
export type DestinationPageDto = {
  destination: DestinationDetailDto;
  packages: PackageCardDto[];  // import type desde "@/modules/packages"
  minPriceCents: number;       // mínimo de priceCents de `packages` (≥ 1 elemento)
};
// DestinationDto existente no cambia.
```

### `modules/destinations/services/`
```ts
// destination-detail-service.ts
export async function getDestinationBySlug(slug: string): Promise<DestinationDetailDto | null>;
// "use cache", cacheLife("hours"), cacheTag(CACHE_TAGS.destinations). Sin filtro de publicación (destinations no tiene status).
// Retorno serializable: números, strings, arreglos. Sin Date.

// destination-page-service.ts  (sin "use cache": compone dos funciones cacheadas)
export async function getDestinationPage(slug: string): Promise<DestinationPageDto | null>;
// 1) !isValidSlug(slug) → null (sin tocar la BD)  2) Promise.all([getDestinationBySlug(slug), getPackages({ destino: slug })])
// 3) !destination || packages.length === 0 → null  4) minPriceCents = Math.min(...packages.map(p => p.priceCents))
```

### `modules/destinations/utils/destination-page.ts` (puras, sin db)
```ts
export const ALTITUDE_THRESHOLD_M = 2000;
export const SEASON_LABEL: Record<"dry" | "mixed" | "rainy", string>;
export const MONTH_SHORT: readonly string[];  // 12: "Ene" … "Dic"
export const MONTH_NAMES: readonly string[];  // 12: "enero" … "diciembre"
export type MapPin = { n: number; name: string; lat: number; lng: number };
export function formatAltitude(m: number): string;
export function sightsHeading(n: number): string;
export function beforeYouGo(altitudeM: number | null): { heading: string; tipsLabel: string };
export function mapPins(sights: { name: string; lat: number | null; lng: number | null }[]): MapPin[];
```
`Season` no se importa de `types/destination.ts` en este archivo (tipos literales inline) para que su tarea no dependa de la del servicio.

### `hooks/use-scroll-rail.ts`
```ts
export function useScrollRail<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  scrollByPage: (direction: -1 | 1, ratio?: number) => void; // scrollBy(direction * clientWidth * ratio); ratio = 1 por defecto
  scrollToStart: () => void;
};
// "use client". behavior = "auto" si matchMedia("(prefers-reduced-motion: reduce)").matches, si no "smooth".
```
`PackageRail` pasa a usarlo con `ratio` 1 (comportamiento idéntico al actual: prev = −clientWidth, next = +clientWidth, chip → `scrollToStart`). `SightsRail` usa `ratio` 0.85. Sin test: no hay runner de DOM (`vitest` corre en `node`, `include: **/*.test.ts`); se verifica en *visual* (AC13, AC16).

### `modules/packages` (extiende)
```tsx
// components/package-card-list.tsx
export function PackageCardList({ packages, sizes, className }: {
  packages: PackageCardDto[];
  sizes?: string;                // por defecto el actual de PackageGrid
  className?: string;            // reemplaza la grilla (por defecto LISTING_GRID_CLASS)
}): JSX.Element;                 // <ul> con <li><PackageCard variant="grid" .../></li>; sin empty state
// components/package-grid.tsx: conserva el empty state y renderiza <h2 sr-only>Resultados</h2> + <PackageCardList/>; sigue exportando LISTING_GRID_CLASS
// index.ts: + export { PackageCardList } from "./components/package-card-list";
```

### `components/shared/photo-credits.tsx`
```tsx
export function PhotoCredits(): JSX.Element; // mismo texto actual; comentario de deuda D12 se conserva
```

### `modules/destinations/components/`
```tsx
// destination-page.tsx — Server Component
export function DestinationPage({ params }: { params: Promise<{ slug: string }> }): JSX.Element;       // <Suspense fallback={<DestinationSkeleton />}> (D6)
export async function generateDestinationMetadata(params: Promise<{ slug: string }>): Promise<Metadata>; // usa getDestinationPage
// Orden: DestinationHero · sección Lo imperdible (SightsRail + DestinationMap) · Paquetes (PackageCardList, MAX_PACKAGES = 6) · ClimateChart · BeforeYouGo · PhotoCredits

// destination-hero.tsx — Server
DestinationHero({ destination, minPriceCents }: { destination: DestinationDetailDto; minPriceCents: number })
// climate-chart.tsx — Server (id="cuando")
ClimateChart({ name, months, bestSeasonText }: { name: string; months: ClimateMonthDto[]; bestSeasonText: string | null })  // el caller no lo renderiza si months.length !== 12
// sights-rail.tsx — "use client" (usa useScrollRail); importa solo `import type` de types
SightsRail({ sights }: { sights: SightDto[] })   // incluye SectionHeading con sightsHeading(n) y las flechas
// destination-map.tsx — "use client": next/dynamic(() => import("./destination-map-canvas"), { ssr: false, loading: <div className="bg-sand ..."/> })
DestinationMap({ pins }: { pins: MapPin[] })     // el caller no lo renderiza si pins.length === 0
// destination-map-canvas.tsx — "use client": import "leaflet/dist/leaflet.css"; react-leaflet MapContainer/TileLayer/Marker/Popup; L.divIcon
export default function DestinationMapCanvas({ pins }: { pins: MapPin[] })
// before-you-go.tsx — Server
BeforeYouGo({ altitudeM, howToGetText, tipsText, imageUrl, faqs }: { altitudeM: number | null; howToGetText: string | null; tipsText: string | null; imageUrl: string | null; faqs: FaqDto[] })  // null si no hay nada
// destination-skeleton.tsx
DestinationSkeleton()   // PageHero min-h-[600px] sm:min-h-[640px] + bloques bg-sand
```

### `modules/destinations/index.ts` (extiende)
```ts
export { getDestinations } from "./services/destination-service";
export { getDestinationBySlug } from "./services/destination-detail-service";
export { getDestinationPage } from "./services/destination-page-service";
export { DestinationPage, generateDestinationMetadata } from "./components/destination-page";
export type {
  DestinationDto, DestinationDetailDto, DestinationPageDto,
  SightDto, FaqDto, ClimateMonthDto, Season,
} from "./types/destination";
```

### Ruta
```tsx
// app/(public)/destinos/[slug]/page.tsx  (delgada, igual que app/(public)/paquetes/[slug]/page.tsx)
import { DestinationPage, generateDestinationMetadata } from "@/modules/destinations";
type Params = Promise<{ slug: string }>;
export const generateMetadata = ({ params }: { params: Params }) => generateDestinationMetadata(params);
export default function Page({ params }: { params: Params }) {
  return <DestinationPage params={params} />;
}
```

### Mapa: contrato de Leaflet
Tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, `maxZoom={19}`, atribución `© OpenStreetMap contributors`. `MapContainer`: `scrollWheelZoom={false}`, `zoomAnimation`/`fadeAnimation`/`markerZoomAnimation` = `!reducedMotion` (leído con `matchMedia` al montar). Un pin: `center=[lat,lng] zoom={12}`; ≥ 2: `bounds` con `boundsOptions={{ padding: [40, 40] }}`. Marcador: `L.divIcon({ html: "<span>N</span>", className: ..., iconSize: [32, 32] })` (círculo blanco 32 px, número en `ink`, sombra de tarjeta), `title={name}`, `keyboard`; `Popup` con el nombre como texto de React.

## Edge cases
- **Destino sin paquetes publicados**: `getDestinationPage` → `null` → `notFound()` (aunque exista la fila y tenga lugares). Los destinos de Inicio ya excluyen los que no tienen paquetes (D11 de 007), así que no hay enlace roto desde el bento.
- **Datos nulos**: `tagline` y `description` nulos (sin párrafo en el hero); `altitude_m` nulo (sin "Altitud" y títulos de "Prepara tu viaje"); `best_season_text` nulo (sin "Mejor época" ni línea bajo "Cuándo viajar"); `from_lima_text` nulo (sin "Desde Lima"); `hero_image_url` nulo (hero `bg-dark` liso, sin `openGraph.images`; "Cómo llegar" sin foto, solo bloque oscuro).
- **Clima incompleto** (distinto de 12 meses): se omite la sección y el botón "Cuándo viajar".
- **Lugares sin coordenadas**: no tienen pin; los números del carrusel y del mapa siguen siendo los de la lista completa. Ninguno con coordenadas → sin mapa.
- **Más de 9 lugares**: el título usa dígitos; el carrusel sigue siendo scroll nativo.
- **Mapa**: JS desactivado o falla de tiles → queda el carrusel; el placeholder del mismo alto evita CLS; los tiles exponen la IP del visitante al proveedor de tiles (ver Q3). Estilos de Leaflet con z-index altos: el contenedor usa `isolate`.
- **Slug**: se valida antes de consultar (D6); mayúsculas, espacios, `_`, vacío o > 100 caracteres → 404 sin tocar la BD.
- **Muchos paquetes**: se muestran 6; "Ver todos →" lleva al listado filtrado. Con menos de 6, la grilla no deja huecos.
- **Texto largo**: `h1` con `text-wrap: balance`; nombres de lugar y textos con `min-w-0`; sin scroll horizontal.
- **Imágenes**: rutas locales `/seed/*.jpg` hoy (D6 de 007); `next/image` con `sizes` y `priority` solo en la foto del hero.
- **`DATABASE_URL` ausente**: igual que 007 a 009, `lib/db` lanza al importarse y `next build` falla; aceptado. Sin migrar la BD, `getDestinationBySlug` falla (columnas inexistentes): la migración se aplica antes de la Phase 2 (ver Plan, gate).
- **Idioma**: español, con tildes.

## Tests
`npm test` corre los no-db; los *(db)* corren con `npm run test:db` (con `.env`, ver D8) y se omiten sin `DATABASE_URL`, mismo patrón de 007 a 009 (`describe.skipIf`, `await import()` dentro del bloque, `next/cache` mockeado con `vi.hoisted`).

- `lib/db/seed/seed-data.test.ts` (extiende) — AC5, AC6 (conteos nuevos; reglas de calidad; clima por destino; coordenadas; `fromLimaText` nulo solo en `lima`; fotos únicas; sin `garantiz` ni precios).
- `lib/slug.test.ts` — AC11 (válidos, inválidos, límite de 100).
- `modules/packages/utils/package-detail.test.ts` — sin cambios; sigue en verde (AC11).
- `modules/destinations/utils/destination-page.test.ts` — AC12 (altitud con y sin miles; títulos 1, 2, 5, 9, 10 y 0; umbral 2000/1999/null; `mapPins` con huecos conserva la numeración; etiquetas y meses).
- `modules/destinations/services/destination-detail-service.test.ts` *(db)* — AC8, AC9 (los 8 slugs; orden; hijas vacías de un destino insertado; inexistente → `null`; `cacheLife`/`cacheTag`).
- `modules/destinations/services/destination-page-service.test.ts` *(db)* — AC10 (slug inválido sin tocar la BD, inexistente, sin paquetes, solo `draft`, Cusco con `minPriceCents` y solo publicados; inserta y borra sus filas en `afterAll`). Riesgo: importar `@/modules/packages` (barrel) arrastra componentes; si Vitest en entorno `node` falla al cargarlo, el developer lo reporta como `SPEC_ISSUE` (alternativa: mockear solo `next/image`/`next/link`, no los servicios).
- AC4 y AC7 los verifica el orquestador con SQL tras migrar y sembrar (dos veces).
- No se testea markup ni `useScrollRail` (SETUP §3; sin runner de DOM). AC13 a AC29 son manuales con Playwright (ver Verificación).

## Plan
Sesión 1: Phase 1 y Phase 2 (datos y servicios; la app sigue igual, sin UI nueva visible). Sesión 2: Phase 3 y Phase 4 (UI, ruta y reconexión). Las dependencias entre tareas de fases distintas se cumplen porque cada fase termina verde antes de la siguiente.

### Phase 1 — Esquema y datos
Entrega: columnas nuevas, migración `0001`, seed completo de los 8 destinos con upsert. La app sigue funcionando (columnas nullable).

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | schema + migración (`drizzle-kit generate --name destination_detail`) + `docs/ERM.md` | lib/db/schema/destinations.ts, lib/db/migrations/0001_destination_detail.sql, lib/db/migrations/meta/0001_snapshot.json, lib/db/migrations/meta/_journal.json, docs/ERM.md | - | A | AC3, AC4 | todo |
| T2 | seed de los 8 destinos (datos, textos, lugares, coordenadas) + upsert de `destinations` y `destination_sights` + tests + anexo del seed (§3 y §9) | lib/db/seed/data/destinations.ts, lib/db/seed/index.ts, lib/db/seed/seed-data.test.ts, docs/specs/shared/database-foundation-seed-data.md | T1 | B | AC5, AC6, AC7 | todo |

**Gate (orquestador, no es tarea de developer; requiere respuesta a Q6):** aplicar la migración y sembrar la Neon de desarrollo con `.env` (D8), correr dos veces el seed y comprobar AC4 y AC7 con SQL. La Phase 2 *(db)* lo necesita.

### Phase 2 — Servicios, utilidades y piezas compartidas
Entrega: `getDestinationBySlug`, `getDestinationPage`, utilidades puras con test, `isValidSlug` en `lib/`, `PackageCardList`. Sin rutas nuevas; `/paquetes` igual.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T3 | setup: mover `isValidSlug` a `lib/slug.ts` + test; `package-detail.ts` lo re-exporta | lib/slug.ts, lib/slug.test.ts, modules/packages/utils/package-detail.ts | - | A | AC11 | todo |
| T4 | setup: `PackageCardList` extraído de `PackageGrid`; export en el index de packages | modules/packages/components/package-card-list.tsx, modules/packages/components/package-grid.tsx, modules/packages/index.ts | - | A | AC13 | todo |
| T5 | tipos de detalle + `getDestinationBySlug` + test db; `getDestinationPage` + test db | modules/destinations/types/destination.ts, modules/destinations/services/destination-detail-service.ts, modules/destinations/services/destination-detail-service.test.ts, modules/destinations/services/destination-page-service.ts, modules/destinations/services/destination-page-service.test.ts | T1, T3 | B | AC8, AC9, AC10 | todo |
| T6 | utilidades puras de la página + test | modules/destinations/utils/destination-page.ts, modules/destinations/utils/destination-page.test.ts | - | A | AC12 | todo |

T5 depende de T1 (columnas nuevas) y de T3 (`isValidSlug`); `getPackages` ya existe en el index de packages. T3, T4 y T6 corren en paralelo (Group A) y T5 después (Group B).

### Phase 3 — Componentes de UI
Entrega: todos los componentes de la página, probados aislados a mano; nada se monta aún en una ruta (la app sigue igual).

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T7 | setup: `npm i leaflet react-leaflet` + `npm i -D @types/leaflet`; `useScrollRail` | package.json, package-lock.json, hooks/use-scroll-rail.ts | - | A | AC2 | todo |
| T8 | `DestinationHero` + `ClimateChart` | modules/destinations/components/destination-hero.tsx, modules/destinations/components/climate-chart.tsx | T5, T6 | B | AC14, AC15, AC19, AC26 | todo |
| T9 | `SightsRail` + refactor de `PackageRail` para usar `useScrollRail` | modules/destinations/components/sights-rail.tsx, modules/home/components/package-rail.tsx | T5, T6, T7 | B | AC13, AC16, AC26 | todo |
| T10 | `DestinationMap` + `DestinationMapCanvas` | modules/destinations/components/destination-map.tsx, modules/destinations/components/destination-map-canvas.tsx | T6, T7 | B | AC17, AC28 | todo |
| T11 | `BeforeYouGo` + `DestinationSkeleton` | modules/destinations/components/before-you-go.tsx, modules/destinations/components/destination-skeleton.tsx | T5, T6 | B | AC20, AC21, AC29 | todo |

### Phase 4 — Página, ruta y reconexión
Entrega: `/destinos/[slug]` completa con datos reales, enlaces reconectados y créditos compartidos.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T12 | `PhotoCredits` compartido: crear el compartido, borrar el de `home`, actualizar `home-page.tsx` | components/shared/photo-credits.tsx, modules/home/components/photo-credits.tsx, modules/home/components/home-page.tsx | - | A | AC25 | todo |
| T13 | reconexión: href del bento, miga del detalle de paquete, nota en `package-detail.md` | modules/home/components/destination-bento.tsx, modules/packages/components/package-detail.tsx, docs/specs/packages/package-detail.md | - | A | AC24 | todo |
| T14 | `DestinationPage` + `generateDestinationMetadata`, index del módulo y ruta delgada | modules/destinations/components/destination-page.tsx, modules/destinations/index.ts, app/(public)/destinos/[slug]/page.tsx | T4, T5, T8, T9, T10, T11, T12 | B | AC1, AC14 a AC23, AC26 a AC29 | todo |

Notas por tarea:
- **T13 / riesgo de proceso:** `docs/specs/packages/package-detail.md` está aprobada y su D7, Q2 y AC10 dicen "Inicio / Paquetes / …". La nota va en "Notas de implementación" (no se toca el texto de criterios ni el `Status`) y dice que D7/Q2/AC10 quedan reemplazados por AC24 de esta spec. Si el humano prefiere tratarlo como cambio de criterio, esa spec vuelve a `draft` (decisión del orquestador).
- **T9:** el comportamiento de `PackageRail` no cambia (ver AC13); es solo reemplazar `railRef` y `scrollRail` por el hook.
- **T10:** `leaflet` solo se importa en `destination-map-canvas.tsx`; `destination-map.tsx` importa `next/dynamic` y `import type { MapPin }`.
- **T14:** la sección "Lo imperdible" (`<section>` con `SightsRail` y `DestinationMap`), la de Paquetes y el orden viven en `destination-page.tsx`. Las secciones condicionales se omiten en el caller (`sights.length`, `mapPins(...).length`, `climate.length === 12`).

### Verificación (orquestador, tras cada fase; no es tarea de developer)
- Cada fase: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`; tras Phase 2 y 4 también `npm run test:db`.
- Tras Phase 4, con la base migrada y sembrada: `npm run build && npm start` y Playwright a 1280×800 y 390×844 sobre `/destinos/cusco` (completo), `/destinos/lima` (sin "Desde Lima", "Prepara tu viaje"), `/destinos/puno` (1 lugar), `/destinos/no-existe`, `/destinos/Cusco%20X` (slug inválido) y los otros 5 slugs del seed (carga sin error). Teclado en mapa, carrusel y preguntas; `prefers-reduced-motion`; `scrollWidth`; `curl` del HTML servidor (sin `leaflet-container`); consola sin `window is not defined`; `/paquetes`, `/paquetes/machu-picchu-magico` (miga nueva) y Inicio (bento, rail) sin regresión; comparación con el tablero.
- La tabla "elemento | tablero | antes | después" y las desviaciones van al PR. No se commitea código de Playwright. Reviewer al cierre de cada fase.

## Open questions
- **Q1. Lugares escasos.** Con las fotos que hay en `public/seed` solo salen 1 lugar en 5 destinos (puno, amazonia, huaraz, lima, mancora), 2 en arequipa y 3 en ica-paracas (15 en total; Cusco, 5). "Lo imperdible" y el mapa se ven pobres en esos destinos. ¿Se aceptan así o el usuario aporta más fotos (con crédito CC) para sumar lugares? **Default: se aceptan; el título dinámico (`sightsHeading`) y el mapa de 1 pin lo cubren.** Sumar fotos después es solo seed (otra spec o PR).
- **Q2. Foto de "Cómo llegar".** El tablero usa una foto del tren (solo para Cusco). ¿Reutilizar la portada del destino o agregar una columna nueva (`how_to_get_image_url`) con su foto? **Default: reutilizar la portada** (sin columna ni migración extra).
- **Q3 (resuelta: OpenStreetMap). Proveedor de tiles.** CARTO exige API key y sus tiles gratuitos devuelven un cartel "API KEY REQUIRED"; el usuario aprobó usar `tile.openstreetmap.org`, sin clave. La política de OSM limita el uso intensivo y los tiles envían la IP del visitante (a considerar en la política de privacidad). El URL del tile sigue en una constante de `destination-map-canvas.tsx`: si crece el tráfico, se cambia a un proveedor con clave o self-host (verificación previa a producción, no bloquea esta spec).
- **Q4. Párrafo de clima por destino.** El tablero trae un párrafo largo de clima solo para Cusco. ¿Se agrega una columna futura `climate_text`? **Default: no**; solo "Mejor época: {best_season_text}." (columna existente).
- **Q5. Tarjeta compacta de paquetes en móvil.** El tablero móvil muestra una fila de 96 px por paquete. ¿Se agrega una variante `row` a `PackageCard`? **Default: no**; una columna de tarjetas `grid` (reutiliza el componente).
- **Q6. Migración y seed sobre la Neon de desarrollo compartida.** Aplicar `0001` y sembrar con `.env` cambia 8 filas de `destinations` y sus filas hijas (aditivo: 4 columnas nullable y datos nuevos; el seed actualiza solo columnas descriptivas de `destinations` y `destination_sights`). ¿Ok? **Default: sí**; sin esto la Phase 2 *(db)* y la verificación visual no pueden correr.
- **Q7. Revisión humana de contenido ficticio.** Los textos de los 7 destinos nuevos, las 24 preguntas, las altitudes, los tiempos de viaje y las coordenadas (aproximadas a 3 decimales) son ilustrativos, como todo el seed. ¿Se revisan en el PR antes de mergear? **Default: sí**; el developer los marca como ilustrativos en el anexo del seed.
