# 008 — packages-listing

- Spec: `docs/specs/packages/package-listing.md`
- Rama: `008-packages-listing`

## Qué se hizo
Ruta pública `/paquetes` con la grilla de paquetes publicados, filtros por categoría y duración, filtro por destino (el que manda el buscador del Inicio) y orden por precio. Los filtros viven en la URL y son links, sin JS de cliente. El resultado se cachea por combinación de filtros con Cache Components.

## Cambios
- `app/(public)/paquetes/page.tsx` — ruta delgada con `metadata.title = "Paquetes"`.
- `modules/packages/services/package-service.ts` (+test) — `getPackages(filters)` cacheado; `getFeaturedPackages` conserva su comportamiento.
- `modules/packages/utils/package-filters.ts` (+test) — parseo y validación de `searchParams` (zod), resolución contra categorías y destinos reales, armado de links.
- `modules/packages/types/package.ts`, `modules/packages/index.ts` — tipos de filtros y exports nuevos.
- `modules/packages/components/` — `packages-listing.tsx`, `package-filters.tsx`, `package-grid.tsx`, `listing-skeleton.tsx` (nuevos); `package-card.tsx` con `className` y `sizes` opcionales.
- `modules/home/components/package-rail.tsx` — pasa a `PackageCard` el ancho y el snap de siempre (el rail queda igual).
- `docs/specs/packages/package-listing.md`, `changelog/008-packages-listing.md`, `docs/prs/008-packages-listing.md` — spec (`done`), changelog y este PR.

## Criterios de aceptación
- [x] AC1: `tsc`, `lint`, `build` y `npm test` en verde; `/paquetes` sale como `◐ Partial Prerender` en `next build`.
- [x] AC2: `parseListingParams` descarta valores inválidos, toma el primero de un array y no lanza (test).
- [x] AC3: `resolveFilters` descarta categorías y destinos inexistentes (test).
- [x] AC4: `buildListingHref` sin filtros da `/paquetes`, conserva el resto y ordena las claves (test).
- [x] AC5: `getPackages({})` devuelve los 20 `published` del seed y ningún `draft` (test db).
- [x] AC6: `duracion` `1` / `2-3` / `4-mas` dan 10 / 4 / 6, disjuntos (test db y página real).
- [x] AC7: `categoria`, `destino` y sus combinaciones (AND) filtran bien; sin coincidencias, `[]` (test db y página real).
- [x] AC8: orden por defecto = ranking de más reservados; `precio-asc` / `precio-desc` ordenan por precio (test db y página real).
- [x] AC9: `getPackages` llama a `cacheLife` y `cacheTag(CACHE_TAGS.packages)` (test).
- [x] AC10: un solo `h1`, migas, panel y grilla; 1 columna a 390 px y 3 a 1280 px. (No probé las 2 columnas de 768 px.)
- [x] AC11: filtros como links con `aria-current`, objetivos ≥ 44 px, foco visible y sin salto de scroll al cambiar de filtro.
- [x] AC12: contador singular/plural y chip "Destino: Cusco" con su "×" de 44 px y `aria-label` (se verificó el marcado y el tamaño; el clic en la "×" no se probó en el navegador).
- [x] AC13: estado vacío con "No hay paquetes con esos filtros" y "Quitar filtros" que lleva a `/paquetes`.
- [x] AC14: chips con scroll propio en móvil, aside pegajoso en escritorio y sin scroll horizontal de página a 390 y 1280 px.
- [ ] AC15: chip activo `ink` e inactivo blanco con borde verificados a simple vista; `prefers-reduced-motion` no probado.
- [ ] AC16: sin params quedan activos "Todos", "Cualquiera" y "Recomendados"; el skeleton con red lenta no se probó.
- [x] AC17: el rail del Inicio conserva las mismas clases en sus 12 tarjetas; `package.json` sin dependencias nuevas.
- [x] AC18: ningún `"use client"` nuevo ni import de runtime de `@/modules/packages` desde cliente (revisión del reviewer).
- [x] AC19: título "Paquetes · Wayra".

## Cómo probar
1. `npm ci`, copiar `.env.local` y `npm run dev -- -p 3008`.
2. Abrir `/paquetes`: 20 paquetes y "Todos / Cualquiera / Recomendados" activos.
3. Elegir "Un día" (10 paquetes), "2 a 3 días" (4) y "4 días o más" (6); probar una categoría y "Precio: menor a mayor".
4. Abrir `/paquetes?destino=cusco`: 6 paquetes y chip "Destino: Cusco"; quitarlo con la "×".
5. Abrir `/paquetes?duracion=1&categoria=playas`: estado vacío; "Quitar filtros" vuelve a `/paquetes`.
6. Abrir `/paquetes?duracion=7&orden=x&destino=atlantida`: valores inválidos ignorados, 20 paquetes.
7. Repetir a 390 px (chips con scroll horizontal, sin scroll de página) y revisar que el rail del Inicio (`/`) no cambió.
8. `npm run test:db` para los tests de base.

## Revisión
- Reviewer: APPROVED (fase 1; fase 2 en segunda vuelta, tras corregir el foco visible de los chips móviles)
- lint ✓ · tsc ✓ · tests 108 ✓ (22 de base omitidos sin `DATABASE_URL`; 18 corridos aparte, ✓) · Playwright: `/paquetes`, `?destino=cusco`, `?destino=cusco&orden=precio-desc`, `?duracion=1&categoria=playas`, `?categoria=cultura&orden=precio-asc` a 1280 y 390 px
