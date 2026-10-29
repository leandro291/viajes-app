# 043 — package-route-map

- Spec: `docs/specs/packages/package-detail.md`
- Rama: `043-package-route-map`

## Qué se hizo
El detalle de paquete muestra el mapa del diseño: ruta del itinerario con pines y tarjeta con foto, o el punto de encuentro cuando no hay itinerario con coordenadas. El pin pasa a ser el del tablero y también se usa en el mapa de Destino. El seed da itinerario, inclusiones y punto de encuentro a los 20 paquetes.

## Cambios
- `modules/destinations/components/destination-map-canvas.tsx` — pin en gota, etiquetas, agrupación por píxeles, ruta, `zoom` y tarjeta del popup.
- `modules/destinations/components/destination-map.tsx` — pasa `label`, `route` y `zoom`.
- `modules/destinations/utils/destination-page.ts` — `MapPin` con `card` opcional.
- `modules/destinations/components/destination-page.tsx` — tarjeta con foto en el mapa de Destino.
- `modules/destinations/index.ts` — exporta `DestinationMap` y `mapPins`.
- `modules/packages/components/package-detail.tsx` — mapa de ruta o de punto de encuentro; "Itinerario del día" en tours.
- `modules/packages/services/package-detail-service.ts`, `modules/packages/types/package.ts` — coordenadas de días y del punto de encuentro.
- `lib/db/seed/data/package-details.ts` — itinerario, galería e inclusiones de 15 paquetes más.
- `lib/db/seed/data/packages.ts` — punto de encuentro por destino.
- `lib/db/seed/index.ts` — upsert del punto de encuentro de paquetes ya sembrados.
- `lib/db/seed/seed-data.test.ts` — conteos y comprobaciones nuevas.

## Criterios de aceptación
- [x] Los 20 paquetes muestran mapa: 10 de ruta y 10 de punto de encuentro.
- [x] Los 10 tours de un día muestran "Itinerario del día", Incluye y No incluye.
- [x] El pin mide 40×50 en escritorio y 26×33 en móvil, sin número; la etiqueta solo aparece en escritorio.
- [x] Tocar un pin abre la tarjeta (foto, "DÍA n · lugar", título, nota) y el pin activo pasa a tinta.
- [x] Pines que se tapan se agrupan ("Aguas Calientes +1") y se separan al acercar.
- [x] Móvil 390 px sin scroll horizontal; consola sin errores del mapa.
- [x] AC20 de la spec ("no hay mapa") se actualiza en la PR 045-specs-reapproval.

## Cómo probar
1. `npm ci` y `npm run db:seed` (base de desarrollo; actualiza el punto de encuentro de los paquetes).
2. `npm run dev` y abrir `/paquetes/machu-picchu-magico`: mapa "Tu recorrido en el mapa" con ruta y pines.
3. Tocar un pin: se abre la tarjeta; el botón de cierre la cierra.
4. Abrir `/paquetes/machu-picchu-en-un-dia`: "Itinerario del día", "Punto de encuentro", Incluye y No incluye.
5. Abrir `/destinos/cusco`: el mapa de lugares usa el mismo pin y tarjeta.
6. Repetir a 390 px de ancho: pin chico y sin etiquetas.

## Revisión
- Reviewer: n.a. (sin agente reviewer; revisado en navegador)
- lint ✓ · tsc ✓ · tests ✓ (1244) · Playwright: `/paquetes/<slug>` de los 20 paquetes, `/destinos/cusco`, 1280 y 390 px
