# 040 — package-detail-fidelity

- Fecha: 2026-10-25
- Spec: `docs/specs/shared/design-fidelity.md` (tarea T3)
- PR: `docs/prs/040-package-detail-fidelity.md`

## Resumen
El Detalle del paquete se acerca al tablero: hero a todo el ancho con el header encima, miga dentro del hero, título de hasta 96 px, panel de reserva fijo que se monta sobre el hero y secciones con `SectionHeading`. Sin cambios de datos, services ni rutas.

## Cambios
- `modules/packages/components/package-detail.tsx` — `PageHero` a todo el ancho, miga dentro del hero, grilla de dos columnas y secciones con `SectionHeading`.
- `modules/packages/components/package-gallery.tsx` — galería como hero: miniaturas de 76×56, crossfade de .9 s y controles.
- `modules/packages/components/booking-panel.tsx` — panel fijo con solapa, insignia "Confirmación inmediata" y nota corregida.
- `modules/packages/components/package-facts.tsx`, `package-itinerary.tsx`, `package-inclusions.tsx` — radios, sombras y tipografía del tablero; foco del itinerario visible.
- `modules/packages/components/mobile-booking-bar.tsx`, `detail-skeleton.tsx` — barra móvil y esqueleto sobre `PageHero`.

## Pendiente
- Controles del hero a la izquierda del panel en escritorio (desvío F5, el tablero los tapa).
- Distancia etiqueta-título de "El viaje" 10 px frente a 16 px del tablero (no se edita `SectionHeading`).
- Sin medir: contraste, foco y medidas finas; sin tablero móvil.
- La miniatura `seed/tren.jpg` no cargó en la prueba en dev (dato del seed, no de esta tarea).
