# 044 — tours-filter-design

- Spec: `docs/specs/packages/tours.md`
- Rama: `044-tours-filter-design`

## Qué se hizo
El filtro de `/tours` copia el diseño del tablero: tarjeta en escritorio; en móvil, barra pegada arriba con riel de ciudades y cajas Fecha/Ordenar. Fecha y orden se aplican al cambiar, sin "Aplicar".

## Cambios
- `modules/packages/components/tour-filter-bar.tsx` — barra rediseñada, chips como links.
- `modules/packages/components/tour-filter-fields.tsx` — nuevo componente cliente para fecha y orden.

## Criterios de aceptación
- [x] Escritorio: tarjeta blanca, ciudades a la izquierda, Fecha y Ordenar a la derecha, sin "Aplicar".
- [x] Móvil 390 px: barra sticky arriba, riel de chips que se desliza, dos cajas de 168 px, sin scroll horizontal.
- [x] Cambiar fecha, orden o ciudad deja URLs limpias (`/tours?ciudad=cusco&fecha=2026-11-05&orden=precio-asc`) y conserva el resto; borrar un valor quita el parámetro.
- [x] Spec `tours.md` (D11, AC14, AC15, AC21) re-aprobada en la PR 045-specs-reapproval.

## Cómo probar
1. `npm ci` y `npm run dev`.
2. Abrir `/tours` a 1280 px: comparar con el tablero del diseño.
3. Elegir ciudad, fecha y orden; la URL cambia sin botón.
4. Repetir a 390 px: bajar y ver la barra pegada arriba.

## Revisión
- Reviewer: n.a. (sin agente reviewer; revisado en navegador)
- lint ✓ · tsc ✓ · tests ✓ (1242) · Playwright: `/tours` a 1280 y 390 px
