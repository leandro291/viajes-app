# 008 — packages-listing

- Fecha: 2026-10-25
- Spec: `docs/specs/packages/package-listing.md`
- PR: `docs/prs/008-packages-listing.md`

## Resumen
Listado público de paquetes (`/paquetes`): grilla de paquetes publicados con filtros por categoría y duración, filtro por destino (el que manda el buscador del Inicio) y orden por precio, todo guardado en la URL (`categoria`, `duracion`, `destino`, `orden`). Los filtros son links, sin JS de cliente. Incluye contador de resultados, chip "Destino: X" removible y estado vacío. El resultado se cachea por combinación de filtros con Cache Components (`use cache` + `cacheTag`).

## Cambios
- `app/(public)/paquetes/page.tsx` — ruta delgada con `metadata.title = "Paquetes"`; lee `searchParams` y delega en `PackagesListing`.
- `modules/packages/services/package-service.ts` (+test) — `getPackages(filters)` cacheado (`published`, destino, categoría, duración, orden por reservas o por precio); `cardColumns` y `withCategories` internos compartidos con `getFeaturedPackages` sin cambiar su comportamiento.
- `modules/packages/utils/package-filters.ts` (+test) — `parseListingParams` (zod), `resolveFilters` (descarta categorías y destinos inexistentes para acotar la caché), `buildListingHref`, `DURATION_OPTIONS`, `SORT_OPTIONS`.
- `modules/packages/types/package.ts` — `PackageFilters`, `DurationFilter`, `SortOrder`.
- `modules/packages/components/packages-listing.tsx` — migas y `h1` en el shell estático; resultados dentro de `<Suspense>`.
- `modules/packages/components/package-filters.tsx` — panel de filtros: chips con scroll en móvil, aside pegajoso tipo radio desde `lg`.
- `modules/packages/components/package-grid.tsx`, `listing-skeleton.tsx` — grilla 1/2/3 columnas, estado vacío con "Quitar filtros" y skeleton.
- `modules/packages/components/package-card.tsx` — `className` y `sizes` opcionales; ya no lleva ancho fijo.
- `modules/home/components/package-rail.tsx` — pasa a `PackageCard` el ancho y el snap que antes llevaba dentro (el rail del Inicio queda igual).
- `modules/packages/index.ts` — exports `getPackages`, `PackagesListing`, `buildListingHref` y tipos de filtros.

## Pendiente
- Sin paginación ni `LIMIT` en `getPackages` (el seed tiene 20 paquetes). Techo conocido: ~60 paquetes; entonces agregar `?pagina=` o carga incremental.
- Desvíos del diseño aprobados con la spec: "Un día" solo está en Duración (no repetido en Tipo de experiencia) y los `<select>` móviles son chips. Falta decidir si se mantiene así (Q1).
- La tarjeta no muestra `blurb` ni "Ver detalle" como el diseño; hay que decidir si se agrega también al rail del Inicio (Q2).
- Las tarjetas apuntan a `/paquetes/[slug]` (tarjeta 009) y el menú a `/tours` (010) y `/ofertas` (012): dan 404 hasta entonces, por eso hay 404 de prefetch en consola.
- `ListingSkeleton` ocupa las 3 columnas a todo el ancho; en `lg` hay un pequeño salto de layout al resolver el `Suspense` (la vista real tiene aside de 290 px). Ajustar con un espaciador si molesta.
- Los tests de base (`package-service.test.ts`, AC5–AC9) se omiten sin `DATABASE_URL`; correr con `npm run test:db`.
- Invalidación de caché (`updateTag`/`revalidateTag`) la agregan las specs de CRUD y pagos; mientras tanto el desfase es ≤ 1 h.
