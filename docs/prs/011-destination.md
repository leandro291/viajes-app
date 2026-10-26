# 011 — destination

- Spec: `docs/specs/destinations/destination-page.md`
- Rama: `011-destination`

## Qué se hizo
Pantalla pública de Destino (`/destinos/[slug]`) con hero, "Lo imperdible" (carrusel y mapa Leaflet), paquetes, clima por mes y "Antes de ir". Migración aditiva y seed completo de los 8 destinos. El bento de Inicio y la miga del detalle de paquete apuntan ahora a `/destinos/<slug>`.

## Cambios
- `app/(public)/destinos/[slug]/page.tsx` — ruta delgada con metadata.
- `lib/db/schema/destinations.ts`, `lib/db/migrations/0001_destination_detail.sql` — 4 columnas nullable: `how_to_get_text`, `tips_text`, `lat`, `lng`.
- `lib/db/seed/` — seed de los 8 destinos (96 meses de clima, 15 lugares, 24 preguntas); upsert en `destinations` y `destination_sights`.
- `modules/destinations/services/` — `getDestinationBySlug` (cacheado) y `getDestinationPage` (compone con `getPackages`; `null` si no hay paquetes publicados).
- `modules/destinations/utils/destination-page.ts` — utilidades puras (altitud, título, pines, etiquetas).
- `modules/destinations/components/` — página, hero, carrusel, mapa (solo cliente), clima, "Antes de ir", skeleton.
- `hooks/use-scroll-rail.ts`, `modules/home/components/package-rail.tsx` — hook extraído de `PackageRail`.
- `modules/packages/components/package-card-list.tsx`, `package-grid.tsx` — `PackageCardList` extraído de `PackageGrid`.
- `lib/slug.ts` — `isValidSlug` promovido desde `packages` y re-exportado.
- `components/shared/photo-credits.tsx` — `PhotoCredits` compartido (movido desde `home`).
- `modules/home/components/destination-bento.tsx`, `modules/packages/components/package-detail.tsx` — enlaces y miga reconectados.
- `package.json`, `package-lock.json` — `leaflet`, `react-leaflet`, `@types/leaflet` (dev).
- `docs/`, `changelog/011-destination.md` — ERM, spec, anexo del seed y changelog.

## Criterios de aceptación
- [x] AC1: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` en verde (302 tests pasan, 72 de BD se omiten sin `DATABASE_URL`)
- [x] AC2: `package.json` solo gana `leaflet`, `react-leaflet` y `@types/leaflet`
- [x] AC3: columnas nuevas nullable y migración con 4 `ADD COLUMN`
- [x] AC4: migración aplicada a la Neon de desarrollo; las 4 columnas existen y los conteos previos no cambiaron
- [x] AC5: conteos del seed 8 / 96 / 15 / 24
- [x] AC6: reglas de calidad del seed (test)
- [x] AC11: `isValidSlug` en `lib/slug.ts` (test)
- [x] AC12: utilidades puras (test)
- [x] AC13: `PackageGrid` y `/paquetes` sin cambio de comportamiento (tests existentes en verde)
- [x] AC14: hero de Cusco (escritorio)
- [x] AC15: franja de datos de Cusco
- [x] AC18: 6 tarjetas de paquetes de Cusco
- [x] AC19: clima en escritorio y 12 columnas en una fila a 390 px
- [x] AC20: "Antes de ir" de Cusco
- [x] AC24: bento de Inicio (8 enlaces `/destinos/<slug>`) y miga "Inicio / Cusco / Machu Picchu Mágico"

No marcados (sin verificar en esta entrega): AC7 (solo se comprobó que los conteos no cambian al sembrar dos veces), AC8 a AC10 (pasan los tests de lectura; los `[write]` no se corrieron), AC16, AC17 (pines, atribución y tiles sí se vieron; faltan teclado, rueda y reduced motion), AC21, AC22 (solo slug inexistente), AC23, AC25, AC26, AC27, AC28 y AC29.

## Cómo probar
1. `npm ci`, tener `DATABASE_URL` y `DATABASE_URL_UNPOOLED` en `.env.local`, luego `npm run db:migrate` y `npm run db:seed`.
2. `npm run dev` y abrir `/destinos/cusco` a 1280 px y a 390 px: hero, carrusel, mapa con 5 pines, paquetes, clima y "Antes de ir".
3. `/destinos/puno` (1 pin), `/destinos/lima` (sin "Desde Lima") y `/destinos/no-existe` (página de no encontrado).
4. En Inicio, clic en una tarjeta del bento; en `/paquetes/machu-picchu-magico`, la miga.

## Revisión
- Reviewer: APPROVED. T1–T6 aprobadas; T7–T13 pidieron cambios (1 bloqueante y 3 menores), corregidos por el autor y re-revisados; T14, el cambio de tiles y el control final de entrega aprobados en la revisión final (sin bloqueantes)
- Ciclo de imports tolerado: `destinations/index → destination-page-service → packages/index → packages-listing → destinations/index`. Lo toleran el build y los tests porque ningún módulo usa los exports en el nivel superior, solo dentro de funciones o JSX. La spec (D5) dice "no hay ciclo"; es inexacto y no se reabre. Cortarlo obligaría a tocar `packages-listing` (009) o a importar un interno de otro módulo.
- AC23 sin test: en el navegador se verificó el `<title>` de `/destinos/cusco`, `/puno` y `/lima` ("<Nombre> · Wayra") y de `/destinos/no-existe` ("Destino no encontrado · Wayra"); `description` y `openGraph` no se verificaron.
- lint ✓ · tsc ✓ · build ✓ · tests ✓ · Playwright: `/destinos/cusco` (1280 y 390), `/destinos/puno`, `/destinos/lima`, `/destinos/no-existe`, `/` y `/paquetes/machu-picchu-magico`
- Los textos, altitudes, tiempos y coordenadas de los 7 destinos nuevos son ilustrativos: revisión humana pendiente.
- Tiles de OpenStreetMap (CARTO exige API key); cambiar `TILE_URL` si crece el tráfico.
