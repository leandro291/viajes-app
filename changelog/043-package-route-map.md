# 043 — package-route-map

- Fecha: 2026-10-29
- Spec: `docs/specs/packages/package-detail.md`
- PR: `docs/prs/043-package-route-map.md`

## Resumen
El detalle de paquete no mostraba mapa (el AC20 de la spec lo dejó fuera) aunque el diseño lo trae. Ahora `/paquetes/[slug]` muestra "Tu recorrido en el mapa" con un pin por día, una línea de ruta y una tarjeta con foto al tocar un pin; si el paquete no tiene itinerario con coordenadas (los tours de un día), muestra el mapa del punto de encuentro. El pin es el del tablero (gota lisa, 40×50 en escritorio y 26×33 en móvil, etiqueta solo en escritorio) y se aplica también al mapa de Destino. El seed ahora da itinerario, inclusiones y punto de encuentro a los 20 paquetes.

## Cambios
- `modules/destinations/components/destination-map-canvas.tsx` — pin en gota, etiquetas, pines agrupados por distancia en píxeles, ruta opcional, `zoom` y tarjeta del popup con foto.
- `modules/destinations/components/destination-map.tsx` — pasa `label`, `route` y `zoom` al canvas.
- `modules/destinations/utils/destination-page.ts` — `MapPin` gana `card` (`PinCard`) opcional; `mapPins` lo conserva.
- `modules/destinations/components/destination-page.tsx` — el mapa de Destino pasa la tarjeta del lugar (foto).
- `modules/destinations/index.ts` — exporta `DestinationMap` y `mapPins` para `packages`.
- `modules/packages/components/package-detail.tsx` — sección del mapa de ruta o del punto de encuentro; "Itinerario del día" en tours.
- `modules/packages/services/package-detail-service.ts`, `modules/packages/types/package.ts` — `lat`/`lng` de cada día y `meetingLat`/`meetingLng` del paquete.
- `lib/db/seed/data/package-details.ts` — itinerario, galería e inclusiones para los 15 paquetes que faltaban (5 paquetes y 10 tours de un día).
- `lib/db/seed/data/packages.ts` — punto de encuentro por destino (antes solo Cusco).
- `lib/db/seed/index.ts` — el seed actualiza el punto de encuentro de paquetes ya sembrados.
- `lib/db/seed/seed-data.test.ts` — conteos nuevos (47 días, 137 inclusiones) y comprobaciones de punto de encuentro y de un día por tour.

## Pendiente
- El AC20 de `docs/specs/packages/package-detail.md` ("no hay Leaflet ni mapa") quedó desactualizado; se corrige y re-aprueba en la PR 045-specs-reapproval.
- Sin línea de ruta por tramo ni leyenda Bus/Tren del diseño: `transportLeg` es texto libre.
- El texto de los itinerarios nuevos es contenido de ejemplo, no del artefacto.
- Sin test automatizado de los `.tsx` (SETUP §3).
- Al sembrar una base que ya tenía esos paquetes sembrados con otros ids, las tablas `package_images` y `package_inclusions` (sin restricción única) quedan con filas repetidas.
