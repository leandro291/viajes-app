# 015 — webhook-stripe

- Fecha: 2026-10-26
- Spec: `docs/specs/payments/stripe-webhook.md`
- PR: `docs/prs/015-webhook-stripe.md`

## Resumen
`POST /api/webhooks/stripe` verifica la firma con el cuerpo crudo y es idempotente vía `stripe_events`. Maneja `checkout.session.completed` (confirma reserva y descuenta cupo; sin cupo reembolsa y cancela), `checkout.session.expired` (cancela la reserva pendiente) y `charge.refunded` (actualiza `refunded_cents`).

## Cambios
- `app/api/webhooks/stripe/route.ts` — ruta fina: 400 firma inválida, 500 error/reintento, 200 ok
- `modules/payments/services/stripe-event-service.ts` — `parseStripeEvent` y `StripeSignatureError`
- `modules/payments/services/stripe-webhook-service.ts` — `handleStripeEvent`: lógica de los 3 eventos en una transacción
- `modules/payments/services/stripe-webhook-repository.ts` — SQL: `claimEvent`, `reserveSeats`, `lockBooking`, pagos
- `modules/payments/index.ts` — exporta la API pública del webhook
- `lib/stripe.ts` — reexporta tipos `StripeEvent`, `StripeCheckoutSession`, `StripeCharge`
- `.env.example` — agrega `STRIPE_WEBHOOK_SECRET`
- `docs/specs/payments/stripe-webhook.md` — spec aprobada
- tests colocados junto a cada servicio y a la ruta

## Pendiente
- `completed` con `booking_id` inexistente lanza (Stripe reintenta); mejor loguear y salir.
- `completed` con booking ya `confirmed` y `payment_intent` nulo lanza en vez de ser no-op (caso muy improbable).
- Cargar `STRIPE_WEBHOOK_SECRET` en Vercel y registrar el webhook en Stripe (tarjeta 032).
