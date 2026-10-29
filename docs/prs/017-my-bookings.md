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
- [x] AC19 (parcial): sin sesión, `/mis-reservas` responde 307 a `/sign-in` (curl)
- [x] AC22: auditoría del reviewer (`"use client"`, imports por `index.ts`, sin `from "stripe"` nuevo, sin `console.*` con datos personales)
- [ ] AC16–AC18, AC20: sin verificar en navegador
- [ ] AC19 (resto): estado vacío, aislamiento entre clientes en pantalla y `/confirmacion/<code>` de una cancelada
- [ ] AC21: recorrido real con Stripe de prueba (pagar, cancelar, un solo reembolso, `charge.refunded` como no-op)

## Cómo probar
1. `npm test` y, con `DATABASE_URL`, `node --env-file=.env ./node_modules/vitest/vitest.mjs run modules/bookings/services/cancellation-service.test.ts modules/bookings/services/my-bookings-service.test.ts`.
2. `npm run dev -- -p 3017` y `stripe listen --forward-to localhost:3017/api/webhooks/stripe` (con el `STRIPE_WEBHOOK_SECRET` de esa misma cuenta).
3. Iniciar sesión como cliente, pagar en `/pago` con `4242 4242 4242 4242` y abrir `/mis-reservas`: la reserva sale en "Próximas" con "Cancelación gratis hasta…".
4. Pulsar "Cancelar reserva" y confirmar: pasa a "Cancelada" con "Reembolsado"; en el dashboard de Stripe (modo prueba) aparece **un** reembolso por el total y `/confirmacion/<code>` dice "Te reembolsamos el pago.".
5. Con una salida a menos de 48 h: sin botón, con el aviso y el enlace a WhatsApp.

## Revisión
- Reviewer: APPROVED en T1–T8 (T7 tras una vuelta de cambios por el peso del título de la tarjeta)
- lint ✓ · tsc ✓ · Playwright: no revisado (el navegador estaba ocupado por otra sesión); solo `curl` a `/mis-reservas` sin sesión → 307
