# 023 — operator-bookings

- Fecha: 2026-10-28
- Spec: `docs/specs/bookings/operator-bookings.md`
- PR: `docs/prs/023-operator-bookings.md`

## Resumen
Nueva página `/operador/reservas`: tabla de solo lectura (TanStack Table v9) con las reservas de los paquetes del operador y, al expandir una fila, sus viajeros con documento completo. Orden, filtro por estado y paginación (20 filas) se resuelven en el servidor y viajan en la URL. El alcance es `{ organizerId } | { all: true }`, y el `organizerId` sale siempre de la sesión; la tabla es genérica para que 026 (admin) la reuse. Los formateadores de fecha de Lima suben a `lib/lima-date.ts` porque un componente cliente no puede importar el barrel de `packages`.

## Cambios
- `modules/bookings/types/booking-list.ts` — tipos del listado (query, scope, fila, resultado).
- `modules/bookings/utils/booking-list-params.ts` (+ test) — parseo de `searchParams` que nunca lanza, armado de href y `nextSortQuery`.
- `modules/bookings/utils/booking-list-view.ts` (+ test) — mapper `toBookingRowDto`, etiquetas de documento y pago, filtros de estado.
- `modules/bookings/services/booking-list-service.ts` (+ test con BD) — `listBookings(scope, query)`: alcance por operador, filtro, orden estable, paginación, viajeros y último pago.
- `modules/bookings/components/bookings-table.tsx` — tabla cliente con fila expandible de viajeros y headers de orden como links (columna de expandir llamada "Detalle").
- `modules/bookings/components/bookings-status-filter.tsx`, `bookings-pagination.tsx` — filtro y paginación como links.
- `modules/bookings/components/operator-bookings-page.tsx` — página de servidor con estados vacíos.
- `modules/bookings/index.ts` — exports del feature.
- `app/(organizer)/operador/reservas/page.tsx` — ruta.
- `modules/organizers/components/organizer-nav-links.ts` (+ test) — link "Reservas".
- `components/ui/table.tsx` — componente shadcn `table`.
- `lib/lima-date.ts` (+ test) — formateadores de fecha/hora Lima movidos desde `package-detail.ts`.
- `modules/packages/utils/package-detail.ts` (+ test) — re-exporta los formateadores; firmas idénticas.
- `docs/specs/bookings/operator-bookings.md` — spec (D1–D16, T1–T9).

## Pendiente
- `aria-controls` del botón de expandir apunta a un id que solo existe con la fila abierta (lo pide la spec; hallazgo menor del reviewer).
- `prefers-reduced-motion` (AC23) sin probar; la única animación es el giro del chevron, sin `transition`.
- Sin búsqueda de texto ni exportación (fuera de alcance, YAGNI).
