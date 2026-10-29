# 017 — my-bookings

- Fecha: 2026-10-28
- Spec: `docs/specs/bookings/my-bookings-cancellation.md`
- PR: `docs/prs/017-my-bookings.md`

## Resumen
Nueva pantalla `/mis-reservas` (solo el cliente dueño): lista sus reservas en "Próximas" y "Anteriores y canceladas", cada una con su `StatusBadge`. Las reservas confirmadas se cancelan gratis hasta 48 h antes de la salida: una sola transacción con candado de fila pasa la reserva a `cancelled`, devuelve el cupo, deja el pago en `refunded` y, como último paso, reembolsa por la API de Stripe (si Stripe falla, rollback total). Pasadas las 48 h el botón no aparece y se ofrece WhatsApp. El webhook `charge.refunded` queda como no-op idempotente y no se tocó.

## Cambios
- `app/(customer)/mis-reservas/page.tsx` — ruta fina que delega en `MyBookingsPage`
- `modules/payments/services/refund-service.ts` (+ test), `modules/payments/index.ts` — `refundPaymentIntent`: reembolso total idempotente por `idempotencyKey`; `charge_already_refunded` cuenta como éxito
- `modules/bookings/utils/cancellation.ts` (+ test), `types/cancellation.ts` — regla de las 48 h (`cancelBlock`, `freeCancelDeadline`) y mensajes de error
- `modules/bookings/services/cancellation-service.ts` (+ test db) — `cancelBooking(code, customerId)`: transacción con `FOR UPDATE`, idempotente, reserva ajena = `not_found`
- `modules/bookings/actions/cancel-booking-action.ts` (+ test) — Server Action con Zod, `requireRole("customer")` y revalidación de `/mis-reservas`, `/confirmacion/<code>` y `departures`
- `modules/bookings/services/my-bookings-service.ts` (+ test db), `utils/my-bookings.ts` (+ test), `types/my-bookings.ts` — `getMyBookings` (2 consultas, sin N+1), DTO sin datos personales y partición por fecha
- `modules/bookings/components/{my-bookings-page,my-booking-card,cancel-booking-button}.tsx` — pantalla, tarjeta y botón con diálogo de confirmación
- `modules/bookings/index.ts` — exporta `MyBookingsPage` y `MyBookingDto`
- `components/shared/confirm-action-dialog.tsx` — props opcionales `pendingLabel` y `dismissLabel` (defaults iguales a los de antes)
- `docs/specs/bookings/my-bookings-cancellation.md` — spec aprobada

## Pendiente
- Verificado en navegador y con Stripe de prueba (AC16–AC18, AC21 y buena parte de AC19–AC20): lista, diálogo, error `too_late` con reintento y cancelación real con **un** reembolso de US$ 440 en Stripe; `charge.refunded` llegó como no-op.
- Sin verificar: estado vacío, enlace de WhatsApp (falta `NEXT_PUBLIC_WHATSAPP_NUMBER`), diálogo a 390 px, foco atrapado con Tab y `prefers-reduced-motion`.
- `NEXT_PUBLIC_APP_URL=http://localhost:3000` en el `.env` local: tras pagar, Stripe devuelve al puerto 3000 aunque se trabaje en otro (en el worktree, entrar a `/confirmacion/<código>` a mano).
- El CLI de Stripe de esta máquina está logueado en otra cuenta que `STRIPE_SECRET_KEY`: `stripe listen` necesita `STRIPE_API_KEY` apuntando a la cuenta de la clave para que su secreto coincida con `STRIPE_WEBHOOK_SECRET`.
- No hay enlace "Mis reservas" en el menú del usuario (decisión de la spec): lo agrega 018 al rebasar sobre esta rama.
- Minors del reviewer aceptados sin cambios:
  - `ORDER BY created_at DESC` sin desempate por `id` en `cancellation-service.ts` y `my-bookings-service.ts` (solo importa con dos pagos de la misma milésima).
  - `catch` de Stripe sin `(error ?? {})` en `cancellation-service.ts` (solo si Stripe rechaza con `null`).
  - La tarjeta calcula "Realizada" con su propio `new Date()`, distinto del `now` de la página (difieren por milisegundos).
  - Cuando `refundableUsdCents` es `null`, el diálogo dice "te devolveremos el pago" sin monto (copy fuera de D14).
  - Tamaños del `h1` y del `h2` replican `confirmation-page.tsx`, fuera de la escala del sistema de diseño; ajustar en ambas pantallas a la vez.
- Fuera de alcance: cancelar reservas `pending`, reembolso parcial después de las 48 h, cancelación por admin u operador y salida cancelada por el operador.
- Una reserva `confirmed` sin pago real (datos sembrados) no se puede cancelar (`no_refundable_payment`).
