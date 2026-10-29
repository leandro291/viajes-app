# 026 — admin-bookings

- Spec: `docs/specs/bookings/admin-bookings.md`
- Rama: `026-admin-bookings`

## Qué se hizo
Agrega `/admin/reservas`: `admin` y `super_admin` ven todas las reservas (con columna Operador) y pueden cancelar una `pending` o `confirmed`. Cancelar una `confirmed` libera el cupo y reembolsa el 100 % por Stripe; una `pending` se cancela sin tocar cupo y expira su sesión de Checkout. Reutiliza la tabla, el filtro y la paginación de 023 y el núcleo de cancelación de 017.

## Cambios
- `modules/bookings/utils/cancellation.ts` (+ test) — `adminCancelBlock` y `adminCancelErrorMessage`.
- `modules/bookings/services/cancellation-service.ts` (+ test con BD) — `cancelWhere` compartido y `cancelBookingAsAdmin`; `cancelBooking` del cliente sin cambios de contrato.
- `modules/bookings/actions/admin-cancel-booking-action.ts` (+ test) — Server Action con Zod, `requireRole("admin")` y revalidación.
- `modules/bookings/types/booking-list.ts`, `utils/booking-list-view.ts`, `services/booking-list-service.ts` (+ tests) — `organizerName` en el DTO.
- `modules/bookings/components/bookings-table.tsx` — props opcionales `showOrganizer` y `renderActions`.
- `modules/bookings/components/bookings-list-view.tsx`, `operator-bookings-page.tsx` — vista de servidor extraída; el operador se comporta igual.
- `modules/bookings/components/admin-cancel-booking-button.tsx`, `admin-bookings-table.tsx`, `admin-bookings-page.tsx` — botón con diálogo, tabla cliente y página de servidor.
- `modules/bookings/index.ts` — export de `AdminBookingsPage`.
- `app/(admin)/admin/reservas/page.tsx` — ruta nueva.
- `modules/admin/components/admin-nav-links.ts` — link "Reservas".
- `docs/specs/bookings/admin-bookings.md`, `changelog/026-admin-bookings.md`, `docs/prs/026-admin-bookings.md` — spec, changelog y esta descripción.

## Criterios de aceptación
- [x] AC1–AC2: `adminCancelBlock` (todas las combinaciones `status × departureStatus`, sin ventana de 48 h) y mensajes (tests unitarios).
- [x] AC3–AC9: cancelación admin de `pending` y `confirmed`, cupo, reembolso idempotente, `expireCheckoutSession` solo post-commit, sin pago refundable, código inexistente y `cancelBooking` del cliente intacto (27 tests de BD).
- [x] AC10–AC11: acción con Zod, rol en el servidor y revalidación (tests).
- [x] AC12: `organizerName` en ambos alcances (test de mapper y de BD).
- [ ] AC13: `/operador/reservas` sin cambios tras el refactor — verificado solo por revisión de código; sin sesión de operador en el navegador.
- [x] AC14: ruta `/admin/reservas` con `h1` "Reservas" y link en el sidebar (navegador).
- [x] AC15: `requireRole("admin")` antes de leer y `{ all: true }` literal; con `?organizerId=…&all=false&estado=hack&pagina=999` la lista sigue mostrando todas las reservas (navegador).
- [x] AC16–AC17: columnas Operador y Acciones; botón «Cancelar» solo en `pending` y `confirmed`; diálogo según estado y «Mantener reserva» lo cierra sin cambios (navegador, sin confirmar la cancelación).
- [x] AC18: filtro por estado y orden con `basePath` `/admin/reservas` (navegador).
- [x] AC19: sin scroll horizontal de página a 390 px y botones de 95×44 px (navegador).
- [ ] AC20: verificación manual con Stripe de prueba — pendiente (cancelar una `confirmed` pagada, una `pending` con Checkout abierto, doble clic, redirección de `organizer` y `customer`).

## Cómo probar
1. `npm ci` y `npm run dev`; entrar con una cuenta `admin`.
2. Abrir `/admin/reservas`: ver reservas de varios operadores con columna Operador, y filtrar por Pendientes, Confirmadas y Canceladas.
3. Probar `?organizerId=<otro>&all=false&estado=x&pagina=999`: sigue mostrando todas y cae a defaults.
4. Cancelar una reserva `pending` de prueba: el diálogo avisa que no hay cobro; tras confirmar, pasa a Cancelada y el cupo no cambia.
5. Cancelar una `confirmed` pagada con Stripe de prueba: reembolso único, el cupo sube y `/mis-reservas` la muestra cancelada. Repetir con doble clic.
6. Entrar como `organizer` y como `customer`: `/admin/reservas` redirige a `/`.
7. Revisar a 390 px: scroll horizontal solo dentro de la tabla.
8. `node --env-file=.env ./node_modules/vitest/vitest.mjs run modules/bookings --no-file-parallelism` (los tests de BD usan ids fijos: no correr en paralelo).

## Revisión
- Reviewer: APPROVED (Fase 1, T1–T4; Fase 2, T5–T9). Hallazgos menores: se aplicó el renombre de `code`; quedan como deuda la derivación de tipos de `CancelPolicy` y alinear el encabezado de la spec.
- lint ✓ · tsc ✓ · vitest ✓ (169/169, sin paralelismo) · Playwright: `/admin/reservas` (lista, filtro, diálogo de `pending` sin confirmar, URL manipulada, 390 px)
