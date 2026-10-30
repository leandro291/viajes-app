# 047 — mobile-listings

- Spec: `docs/specs/packages/package-listing.md`, `docs/specs/packages/tours.md`
- Rama: `047-mobile-listings`

## Qué se hizo
Paquetes y Tours en 390 px igual que el diseño: barra de filtros pegada arriba, contador chico y tarjetas nuevas. Escritorio y tablet no cambian. Depende de #43 y #45 (incluidas por merge).

## Cambios
- `modules/packages/components/package-filters.tsx` — barra móvil con riel de chips y cajas Duración y Ordenar.
- `modules/packages/components/package-filter-select.tsx` — nuevo `<select>` en caja que aplica al cambiar.
- `modules/packages/components/package-card.tsx`, `package-card-list.tsx` — tarjeta blanca con "Ver detalle".
- `modules/packages/components/tour-card.tsx` — tarjeta horizontal con la duración sobre la foto.
- `modules/packages/components/packages-listing.tsx`, `tours-listing.tsx`, `tour-filter-bar.tsx` — espaciado y contador.
- `docs/specs/packages/package-listing.md`, `tours.md` — AC14, AC18, AC20, AC23; aprobadas por leandro291 (2026-10-29).

## Criterios de aceptación
- [x] Barra pegada: `position: sticky`, chips de 44 px y dos cajas; elegir Duración u Ordenar cambia la URL y conserva el resto.
- [x] Tarjeta de paquete: foto 224 px, "Ver detalle", sin "/ persona"; tarjeta de tour 156 px de alto.
- [x] 390 px sin scroll horizontal; desde 768 px las tarjetas y el panel lateral no cambian (1280 px comprobado).

## Cómo probar
1. `npm ci` y `npm run dev`.
2. A 390 px abrir `/paquetes` y `/tours`: bajar y ver la barra pegada arriba.
3. Cambiar Duración y Ordenar; comparar tarjetas con el diseño.
4. A 1280 px comprobar que nada cambió.

## Revisión
- Reviewer: n.a. (sin agente reviewer; revisado en navegador)
- lint ✓ · tsc ✓ · tests ✓ (1242) · Playwright: `/paquetes` y `/tours` a 390 y 1280 px
