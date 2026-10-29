# 026 — admin-bookings

- Fecha: 2026-10-29
- Spec: `docs/specs/bookings/admin-bookings.md`
- PR: `docs/prs/026-admin-bookings.md`

## Resumen
Nueva página `/admin/reservas`: `admin` y `super_admin` ven todas las reservas de la plataforma (tabla, filtro por estado, orden y paginación de 023, más la columna Operador) y pueden cancelar una `pending` o `confirmed`. Cancelar es el único cambio de estado. Una `confirmed` libera el cupo y reembolsa el 100 % por Stripe, sin la ventana de 48 h del cliente; una `pending` se cancela sin tocar cupo y expira su sesión de Checkout. La cancelación comparte núcleo (`cancelWhere`) con la del cliente de 017, y la tabla de 023 se reutiliza con dos props opcionales.

## Cambios
- `modules/bookings/utils/cancellation.ts` (+ test) — `adminCancelBlock` y `adminCancelErrorMessage`.
- `modules/bookings/services/cancellation-service.ts` (+ test con BD) — núcleo `cancelWhere` compartido y `cancelBookingAsAdmin`; `cancelBooking` del cliente sin cambios de contrato.
- `modules/bookings/actions/admin-cancel-booking-action.ts` (+ test) — Server Action con Zod, `requireRole("admin")` y revalidación.
- `modules/bookings/types/booking-list.ts`, `utils/booking-list-view.ts` (+ test), `services/booking-list-service.ts` (+ test) — `organizerName` en el DTO, con join a `organizers`.
- `modules/bookings/components/bookings-table.tsx` — props opcionales `showOrganizer` y `renderActions`; sin ellas la tabla del operador no cambia.
- `modules/bookings/components/bookings-list-view.tsx` — vista de servidor extraída de `OperatorBookingsPage` (estados vacíos, filtro, tabla, paginación).
- `modules/bookings/components/operator-bookings-page.tsx` — usa `BookingsListView`, mismo comportamiento.
- `modules/bookings/components/admin-cancel-booking-button.tsx`, `admin-bookings-table.tsx` — botón con diálogo de confirmación y tabla cliente del admin.
- `modules/bookings/components/admin-bookings-page.tsx` — página de servidor: `requireRole("admin")` y `listBookings({ all: true })` como literal.
- `modules/bookings/index.ts` — export de `AdminBookingsPage`.
- `app/(admin)/admin/reservas/page.tsx` — ruta.
- `modules/admin/components/admin-nav-links.ts` — link "Reservas".
- `docs/specs/bookings/admin-bookings.md` — spec (T1–T9, AC1–AC20).

## Pendiente
- AC20 manual con Stripe de prueba sin hacer: cancelar una `confirmed` pagada (reembolso único, cupo, `/mis-reservas`), cancelar una `pending` con Checkout abierto, doble clic o segunda pestaña, y la redirección de `organizer` y `customer`. En el navegador solo se verificó la lista, el filtro, el diálogo de una `pending` (sin confirmar), la URL manipulada y 390 px.
- El botón «Cancelar» se ofrece por `status` sin conocer el estado de la salida: con salida `en_route` o `completed` el servicio rechaza con `not_cancellable` y el error sale en el diálogo. Ocultarlo exige `departureStatus` en el DTO (cambia el contrato de la spec).
- `CancelPolicy` en `cancellation-service.ts` repite a mano las uniones de `status` y `departureStatus` y usa un `!` en `and(...)`; derivarlos de los `enumValues` (hallazgo cosmético del reviewer).
- El encabezado de Servicio de la spec dice `cancelBookingAsAdmin(code, now?)` y Contracts dice `(code)`; la implementación sigue Contracts. Alinear la spec.
- Sin registro de quién canceló (solo `cancelled_at`), sin aviso propio al cliente y sin reabrir canceladas: decisiones por defecto de la spec, fuera de alcance.
- Los tests de BD usan ids fijos sobre la Neon de `.env`: no correr la suite en paralelo (`--no-file-parallelism`).
