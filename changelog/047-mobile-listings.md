# 047 — mobile-listings

- Fecha: 2026-10-29
- Spec: `docs/specs/packages/package-listing.md`, `docs/specs/packages/tours.md`
- PR: `docs/prs/047-mobile-listings.md`

## Resumen
Tanda 2 de la fidelidad móvil. En 390 px, Paquetes y Tours tienen la barra de filtros pegada arriba como el diseño, el contador chico y las tarjetas nuevas (paquete con foto arriba y "Ver detalle"; tour horizontal con la duración sobre la foto). Desde 768 px nada cambia.

## Cambios
- `modules/packages/components/package-filters.tsx` — barra móvil: riel de chips y cajas Duración y Ordenar.
- `modules/packages/components/package-filter-select.tsx` — nuevo, cliente: caja con `<select>` que aplica al cambiar.
- `modules/packages/components/package-card.tsx`, `package-card-list.tsx` — tarjeta blanca móvil con "Ver detalle" y menos espacio entre tarjetas.
- `modules/packages/components/tour-card.tsx` — tarjeta horizontal móvil como el diseño.
- `modules/packages/components/packages-listing.tsx`, `tours-listing.tsx`, `tour-filter-bar.tsx` — espaciado de 16 px, contador de 15 px y orden de escritorio oculto en móvil.
- `docs/specs/packages/package-listing.md`, `tours.md` — AC14, AC18, AC20 y AC23.

## Pendiente
- Depende de las PR 043-tours-filter-design (#43) y 046-mobile-header-hero (#45); esta rama las incluye por merge.
- En móvil no hay "Limpiar" (el diseño no lo trae); se limpia eligiendo "Todos" y "Cualquiera".
- La tarjeta de grilla también se ve en Destino ("Paquetes en <destino>"); el diseño ahí usa minitarjetas, va en la tanda 4.
- Detalle (3), Inicio/Ofertas/Destino (4), Pago/Confirmación (5).
