# 044 — tours-filter-design

- Fecha: 2026-10-29
- Spec: `docs/specs/packages/tours.md`
- PR: `docs/prs/044-tours-filter-design.md`

## Resumen
El filtro de `/tours` pasa a verse como el del tablero "Tours de un día": tarjeta blanca en escritorio y barra pegada arriba con riel de chips y dos cajas en móvil. Fecha y orden se aplican al cambiar; se quita el botón "Aplicar".

## Cambios
- `modules/packages/components/tour-filter-bar.tsx` — barra rediseñada (escritorio y móvil), chips de ciudad como links.
- `modules/packages/components/tour-filter-fields.tsx` — nuevo, cliente: Fecha y Ordenar aplican al cambiar.

## Pendiente
- La spec `tours.md` (D11, AC14, AC15, AC21) se actualiza en la PR 045-specs-reapproval.
- Sin JS, fecha y orden no aplican (los chips sí).
- Etiquetas de orden en móvil del tablero son más cortas; aquí se usa la misma lista de escritorio.
