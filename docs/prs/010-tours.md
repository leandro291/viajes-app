# 010 — tours

- Spec: `docs/specs/packages/tours.md`
- Rama: `010-tours`

## Qué se hizo
Ruta pública `/tours` con los tours de un día publicados, hero carrusel de los 4 más reservados y filtros por ciudad, fecha y orden en la URL (links y un `<form method="get">`, sin JS de cliente). La tarjeta muestra horas, hora de salida y próxima salida con cupo. El resultado se cachea por combinación de filtros con Cache Components.

## Cambios
- `app/(public)/tours/page.tsx` — ruta delgada con `metadata.title = "Tours de un día"`.
- `modules/packages/services/tour-service.ts` (+test) — `getTours(filters)` cacheado, con próxima salida con cupo.
- `modules/packages/utils/tour-filters.ts` (+test) — parseo, hora de Lima, `maxFecha`, resolución, hrefs y ciudades.
- `modules/packages/utils/tour-view.ts` (+test) — textos de la tarjeta y del contador.
- `modules/packages/components/` — `tours-listing.tsx`, `tour-card.tsx`, `tour-filter-bar.tsx`, `tours-skeleton.tsx` (nuevos); `listing-hero.tsx` (extraído de `packages-listing.tsx`, sin cambio visual).
- `modules/packages/services/package-service.ts`, `types/package.ts`, `index.ts` — `isDayTourRow` exportado, tipos y exports nuevos.
- `docs/specs/packages/tours.md`, `changelog/010-tours.md`, `docs/prs/010-tours.md` — spec (`done`), changelog y este PR.

## Criterios de aceptación
- [x] AC1: `tsc`, `lint`, `build` y `npm test` en verde; `/tours` sale como `◐ Partial Prerender` en `next build`.
- [x] AC2: `parseTourParams` descarta valores inválidos, toma el primero de un array y no lanza (test).
- [x] AC3: `resolveTourFilters` y `limaToday` (test, incluye el cambio de día Lima/UTC).
- [x] AC4: `buildTourHref` con claves en orden fijo (test).
- [x] AC5: `citiesFromTours` (test).
- [x] AC6: textos de `tour-view` (test).
- [x] AC7–AC11: `getTours` contra la base real (conjunto, ciudad, fecha, próxima salida y orden); tests db corridos por el developer de T4, 104 ✓ en `modules/packages`. No los volví a correr tras el último cambio (solo mueve `maxFecha`).
- [x] AC12: `cacheLife` y `cacheTag(packages, departures)` en `getTours` (test); `getPackages` sigue pasando sus tests.
- [x] AC13: hero a 1280, 768 y 390 px: un `h1` (texto de escritorio o móvil), migas con `aria-current="page"`, etiquetas "tour" y carrusel operado con clic real (siguiente, anterior y pestaña).
- [x] AC14: ciudad, fecha y orden por URL; el formulario con clic real conserva la ciudad; objetivos táctiles medidos ≥ 44 px a 390, 768 y 1280 px; el primer `Tab` cae en "Todas" con outline sólido de 2,4 px (no recorrí todos los controles con teclado).
- [x] AC15: contador `aria-live="polite"` con singular/plural y "Quitar fecha" que elimina solo `fecha`.
- [x] AC16: 4 columnas a 1280 px, 2 a 768 px y 1 a 390 px con tarjeta horizontal; sin scroll horizontal; un link por tarjeta e imágenes con `alt`.
- [x] AC17: `?ciudad=cusco` (4), `?fecha=2026-11-05` (10), `?ciudad=lima&fecha=2026-11-05&orden=mas-cortos` (1) y `?ciudad=atlantida&fecha=2020-01-01&orden=x` (se ignora, 10 tours) sin 404 ni 500.
- [x] AC18: estado vacío con "No hay tours con esos filtros" y "Quitar filtros" en `?ciudad=lima&fecha=2026-10-27`. El skeleton con red lenta no se probó.
- [x] AC19: CTA "¿Varios días en la misma ciudad?" → `/paquetes`, también con el estado vacío.
- [x] AC20: tokens vistos a simple vista; con `prefers-reduced-motion: reduce` el carrusel arranca pausado y no avanza en 12 s.
- [x] AC21: `/paquetes` igual tras extraer `listing-hero.tsx` (hero y 20 paquetes vistos después del cambio, sin captura "antes"); sin dependencias ni `"use client"` nuevos.
- [x] AC22: título "Tours de un día · Wayra".

## Cómo probar
1. `npm ci`, copiar `.env.local` y `npm run dev -- -p 3010`.
2. Abrir `/tours`: 10 tours, "Todas" y "Recomendados" activos, y en cada tarjeta horas, "Sale…" y próxima salida.
3. Elegir "Cusco" (4 tours) y "Precio menor a mayor"; probar "Más cortos primero".
4. Elegir una fecha con salida (p. ej. `?fecha=2026-11-05`) con "Aplicar": se conserva la ciudad; "Quitar fecha" la elimina.
5. Abrir `/tours?ciudad=lima&fecha=2026-10-27`: estado vacío; "Quitar filtros" vuelve a `/tours`.
6. Abrir `/tours?ciudad=atlantida&fecha=2020-01-01&orden=x`: valores inválidos ignorados, 10 tours.
7. Repetir a 390 px (tarjetas horizontales, un solo `h1` "Sales temprano, vuelves con historias") y revisar que `/paquetes` no cambió.
8. `npm run test:db` para los tests de base (contra la base real: ver Pendiente del changelog).

## Revisión
- Reviewer: APPROVED (3 hallazgos menores: `maxFecha` duplicado, corregido; tests que alteran temporalmente el seed, documentado; `getTours({})` llamado dos veces, intencional)
- lint ✓ · tsc ✓ · tests 299 ✓ (74 de base omitidos sin `DATABASE_URL`) · build ✓ · Playwright: `/tours` a 1280, 768 y 390 px (columnas, objetivos ≥ 44 px, overflow, carrusel, foco y movimiento reducido), `?ciudad=cusco`, formulario de fecha con clic real y `/paquetes`; el resto de las URLs se verificó leyendo el HTML renderizado
