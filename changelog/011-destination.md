# 011 — destination

- Fecha: 2026-10-25
- Spec: `docs/specs/destinations/destination-page.md`
- PR: `docs/prs/011-destination.md`

## Resumen
Pantalla pública de Destino (`/destinos/[slug]`): hero con datos clave, "Lo imperdible" (carrusel y mapa Leaflet con pines numerados), paquetes del destino, clima por mes con tabla equivalente para lectores de pantalla y "Antes de ir" (cómo llegar, aclimatación y preguntas frecuentes). Los 8 destinos del seed tienen contenido completo. El bento de Inicio vuelve a apuntar a `/destinos/<slug>` y la miga del detalle de paquete pasa a "Inicio / <Destino> / <título>".

## Cambios
- `app/(public)/destinos/[slug]/page.tsx` — ruta delgada con metadata; delega en `DestinationPage`.
- `lib/db/schema/destinations.ts`, `lib/db/migrations/0001_destination_detail.sql` (+ snapshot y journal) — columnas nuevas y nullable: `destinations.how_to_get_text`, `destinations.tips_text`, `destination_sights.lat`, `destination_sights.lng`.
- `lib/db/seed/data/destinations.ts`, `lib/db/seed/index.ts`, `lib/db/seed/seed-data.test.ts` — seed completo de los 8 destinos (96 meses de clima, 15 lugares con coordenadas, 24 preguntas); `destinations` y `destination_sights` pasan a upsert para que un re-seed actualice lo ya sembrado.
- `modules/destinations/services/destination-detail-service.ts` (+test db) — `getDestinationBySlug` (caché `hours`, tag `destinations`): destino, clima, lugares y preguntas.
- `modules/destinations/services/destination-page-service.ts` (+test db) — `getDestinationPage`: compone el destino con `getPackages({ destino })`; devuelve `null` si el slug es inválido, no existe o no tiene paquetes publicados.
- `modules/destinations/utils/destination-page.ts` (+test) — `formatAltitude`, `sightsHeading`, `beforeYouGo`, `mapPins` y etiquetas de estación y mes.
- `modules/destinations/types/destination.ts`, `modules/destinations/index.ts` — tipos y exports nuevos.
- `modules/destinations/components/` — `destination-page`, `destination-hero`, `sights-rail` (cliente), `destination-map` y `destination-map-canvas` (cliente, `ssr:false`, único archivo que importa Leaflet), `climate-chart`, `before-you-go`, `destination-skeleton`.
- `hooks/use-scroll-rail.ts` — scroll por páginas con respeto a `prefers-reduced-motion`, extraído de `PackageRail`.
- `modules/home/components/package-rail.tsx` — usa `useScrollRail`; mismo comportamiento.
- `modules/packages/components/package-card-list.tsx`, `package-grid.tsx`, `modules/packages/index.ts` — `PackageCardList` extraído de `PackageGrid`.
- `lib/slug.ts` (+test), `modules/packages/utils/package-detail.ts` — `isValidSlug` promovido a `lib/` y re-exportado.
- `components/shared/photo-credits.tsx` (movido desde `modules/home/components/`), `modules/home/components/home-page.tsx` — `PhotoCredits` compartido.
- `modules/home/components/destination-bento.tsx`, `modules/packages/components/package-detail.tsx` — enlaces reconectados a `/destinos/<slug>`.
- `package.json`, `package-lock.json` — `leaflet`, `react-leaflet` y `@types/leaflet` (dev).
- `docs/ERM.md`, `docs/specs/destinations/destination-page.md`, `docs/specs/packages/package-detail.md`, `docs/specs/shared/database-foundation-seed-data.md` — documentación y spec; nota de la miga en la spec de 009.

## Pendiente
- Los tiles son de OpenStreetMap: CARTO pasó a exigir API key. La política de OSM limita el uso intensivo; si crece el tráfico, cambiar `TILE_URL` en `destination-map-canvas.tsx` a un proveedor con clave.
- Los textos, altitudes, tiempos de viaje y coordenadas de los 7 destinos nuevos son ilustrativos: revisión humana en el PR.
- Un slug inexistente muestra la página de no encontrado con status HTTP 200 (límite de `notFound()` dentro de `<Suspense>`, igual que 009).
- Los tests `[write]` de `getDestinationBySlug` y `getDestinationPage` (insertan y borran fixtures) no se corrieron contra la Neon compartida.
- `crumbLink` (hero y `package-detail.tsx`) y `roundControl` (`sights-rail.tsx` y `package-rail.tsx`) están duplicados; unificarlos obliga a tocar 009 y Inicio.
- `/destinos` (índice) no existe: "Destinos" en la miga va como texto sin enlace.
