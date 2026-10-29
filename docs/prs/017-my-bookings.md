# 017 — my-bookings

- Spec: `docs/specs/bookings/my-bookings-cancellation.md`
- Rama: `017-my-bookings`

## Qué se hizo
Pantalla `/mis-reservas` con las reservas del cliente y su estado, y cancelación gratis hasta 48 h antes de la salida con reembolso por la API de Stripe. La cancelación es una sola transacción: libera el cupo, pasa la reserva a `cancelled`, deja el pago `refunded` y llama a Stripe al final (si falla, rollback total).

## Cambios
- `app/(customer)/mis-reservas/page.tsx` — ruta fina que delega en `MyBookingsPage`
- `modules/payments/` — `refundPaymentIntent` (reembolso total idempotente) y su export
- `modules/bookings/` — regla de 48 h, `cancelBooking` transaccional, Server Action `cancelBookingAction`, `getMyBookings` y su DTO, tarjeta, página y botón de cancelar; tests junto a cada archivo
- `components/shared/confirm-action-dialog.tsx` — props opcionales `pendingLabel` y `dismissLabel` (sin cambios para los usos existentes)
- `docs/specs/bookings/my-bookings-cancellation.md`, `changelog/017-my-bookings.md` — spec y changelog

## Criterios de aceptación
- [x] AC1: `tsc`, `lint`, `test` (829 pasan) y `build` en verde; `package.json` y `lib/db/migrations` sin cambios
- [x] AC2–AC5: tests unitarios (regla de 48 h con frontera exacta y −1 ms, mensajes, mapper y partición)
- [x] AC3: `refundPaymentIntent` sin `amount`, con `idempotencyKey`, y `charge_already_refunded` como éxito
- [x] AC6–AC12: `cancellation-service.test.ts` (db) corrido contra Neon de desarrollo, 12 tests: reembolso, idempotencia con `Promise.all`, 47 h 59 min, reserva ajena, estados no cancelables, rollback si Stripe falla y pago ya reembolsado
- [x] AC13: `stripe-webhook-*` sin cambios en el diff y sus tests en verde
- [x] AC14: `cancelBookingAction` (11 tests con mocks)
- [x] AC15: `my-bookings-service.test.ts` (db) corrido contra Neon de desarrollo, 8 tests
- [x] AC16: `/mis-reservas` con 5 reservas reales: un `h1`, "Próximas" y "Anteriores y canceladas", tarjetas con foto, destino, título enlazado, código, fecha y hora, viajeros, total en soles, `StatusBadge` (Pendiente, Confirmada, Cancelada + "Reembolsado") y enlaces "Ver estado" / "Ver voucher"
- [x] AC17: con más de 48 h, "Cancelación gratis hasta el Mar 17 nov 2026 a las 8:00 a. m." y botón "Cancelar reserva" (contorno, no `accent`); el diálogo muestra US$ 440.00; Esc cierra sin cambios y el foco vuelve al botón; al confirmar la tarjeta pasa sola a "Anteriores y canceladas" con "Cancelada" y "Reembolsado". Con menos de 48 h (WY-4848): sin botón y con el aviso. `pending` y `cancelled`: sin botón
- [x] AC18: con el diálogo abierto se adelantó la salida a 40 h: el servidor respondió `too_late`, el diálogo siguió abierto con "Ya no se puede cancelar gratis esta reserva." en un `Alert`, no cambió nada (reserva, cupo, pago, 0 reembolsos) y el reintento tras restaurar la fecha canceló bien
- [x] AC19 (parcial): sin sesión, `/mis-reservas` redirige a `/sign-in` (307); la lista solo trae las reservas del cliente con sesión (las del seed de otros clientes no aparecen); `/confirmacion/WY-4939` dice "Te reembolsamos el pago."
- [x] AC20 (parcial): 390 y 1280 px sin scroll horizontal, objetivos ≥ 44 px (incluido el enlace del título), título de tarjeta en peso 700, un solo `h1`, consola sin errores; en el diálogo, Esc y foco inicial en "Mantener reserva"
- [x] AC21: recorrido real con Stripe de prueba y `stripe listen`: pago de US$ 440.00 → WY-4939 `confirmed` por el webhook → cancelar → **un** reembolso por 44 000 centavos en Stripe (`succeeded`), base con `cancelled`, cupo devuelto a 0 y pago `refunded` con `refunded_cents = 44000`; `charge.refunded` respondió 200 y no cambió nada; tras recargar no hay botón de cancelar
- [x] AC22: auditoría del reviewer (`"use client"`, imports por `index.ts`, sin `from "stripe"` nuevo, sin `console.*` con datos personales)
- [ ] AC19 (resto): estado vacío "Todavía no tienes reservas" (el cliente de prueba ya tiene reservas)
- [ ] AC17 (resto): enlace "Escríbenos por WhatsApp" (falta `NEXT_PUBLIC_WHATSAPP_NUMBER` en el `.env` local)
- [ ] AC20 (resto): diálogo a 390 px, foco atrapado con Tab y `prefers-reduced-motion` (no quedó ninguna reserva cancelable para abrirlo en móvil)

## Cómo probar
1. `npm test` y, con `DATABASE_URL`, `node --env-file=.env ./node_modules/vitest/vitest.mjs run modules/bookings/services/cancellation-service.test.ts modules/bookings/services/my-bookings-service.test.ts`.
2. `npm run dev -- -p 3017` y `stripe listen --forward-to localhost:3017/api/webhooks/stripe` (con el `STRIPE_WEBHOOK_SECRET` de esa misma cuenta).
3. Iniciar sesión como cliente, pagar en `/pago` con `4242 4242 4242 4242` y abrir `/mis-reservas`: la reserva sale en "Próximas" con "Cancelación gratis hasta…".
4. Pulsar "Cancelar reserva" y confirmar: pasa a "Cancelada" con "Reembolsado"; en el dashboard de Stripe (modo prueba) aparece **un** reembolso por el total y `/confirmacion/<code>` dice "Te reembolsamos el pago.".
5. Con una salida a menos de 48 h: sin botón, con el aviso y el enlace a WhatsApp.

## Revisión
- Reviewer: APPROVED en T1–T8 (T7 tras una vuelta de cambios por el peso del título de la tarjeta)
- lint ✓ · tsc ✓ · tests ✓ (893) · build ✓ · Playwright: `/mis-reservas` a 1280 y 390 px, diálogo de cancelación, error `too_late` y cancelación real con reembolso; consola sin errores (solo avisos de Clerk dev y LCP)
- Datos de prueba que quedan: la reserva WY-4939 (cancelada y reembolsada, con su cobro de prueba en Stripe) del usuario de desarrollo. La fecha de su salida se restauró a la original
