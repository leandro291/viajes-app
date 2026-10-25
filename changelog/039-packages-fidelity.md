# 039 — packages-fidelity

- Fecha: 2026-10-25
- Spec: `docs/specs/shared/design-fidelity.md` (tarea T2)
- PR: `docs/prs/039-packages-fidelity.md`

## Resumen
La pantalla de Paquetes se acerca al tablero: hero con carrusel de hasta 5 destacados y el header encima, filtros laterales fijos, selector de orden en la cabecera de resultados y grilla de tarjetas 4:5 con descripción. Sin cambios de datos, services ni rutas.

## Cambios
- `modules/packages/components/packages-listing.tsx` — hero con `HeroCarousel` compartido (miga, h1 y subtítulo), cabecera de resultados con conteo y orden, sección con su propio contenedor.
- `modules/packages/components/package-filters.tsx` — aside de ancho 230–290 px, radio 24, "Limpiar" siempre visible en escritorio; se quita el grupo "Ordenar".
- `modules/packages/components/package-sort.tsx` — nuevo `<select>` pill de orden.
- `modules/packages/components/package-grid.tsx` — grilla `auto-fill minmax(270px)` con `PackageCard` variante `grid`; estado vacío rediseñado.
- `modules/packages/components/listing-skeleton.tsx` — esqueleto con aside, cabecera y 6 tarjetas.

## Pendiente
- Etiquetas de pestaña con el título completo: el DTO no trae nombre corto (el tablero usa "Huacachina", "Titicaca").
- Parche local sobre `HeroCarousel` (`[&>div]:min-h-0`): conviene una prop `slideMinHeight` en el componente compartido.
- Fecha y Viajeros del buscador del Inicio siguen sin filtrar aquí (spec aparte).
- Tarjeta "¿No sabes qué elegir?" del aside, fuera de alcance.
