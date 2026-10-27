# 015 — webhook-stripe

- Spec: `docs/specs/payments/stripe-webhook.md`
- Rama: `015-webhook-stripe`

## Qué se hizo
Webhook `POST /api/webhooks/stripe`: verifica la firma con el cuerpo crudo, es idempotente con `stripe_events` y procesa `checkout.session.completed`, `checkout.session.expired` y `charge.refunded` en una transacción.

## Cambios
- `app/api/webhooks/stripe/route.ts` — ruta fina (400 / 500 / 200)
- `modules/payments/services/stripe-event-service.ts` — verificación de firma
- `modules/payments/services/stripe-webhook-service.ts` — lógica de los 3 eventos
- `modules/payments/services/stripe-webhook-repository.ts` — SQL (idempotencia, cupo, locks)
- `modules/payments/index.ts`, `lib/stripe.ts`, `.env.example` — exports, tipos y `STRIPE_WEBHOOK_SECRET`
- `docs/specs/payments/stripe-webhook.md`, `changelog/015-webhook-stripe.md` — spec y changelog

## Criterios de aceptación
- [x] AC1: lint, tsc, tests y build en verde
- [x] AC2: `parseStripeEvent` (firma inválida → `StripeSignatureError`; secreto ausente → error de config)
- [x] AC3: ruta fina con 400 / 500 / 200 (también con `curl`: 400 sin firma y con firma falsa)
- [x] AC4: `proxy.ts` sin cambios; `STRIPE_WEBHOOK_SECRET` en `.env.example`
- [x] AC5–AC7: `claimEvent` primero en la transacción, duplicado = no-op, error = rollback y 500
- [x] AC8–AC11: `completed` con cupo / sin cupo (reembolso) / booking cancelado / casos ignorados
- [x] AC12: `expired` solo sobre `pending`, sin tocar cupo
- [x] AC13–AC15: `charge.refunded` (`refunded` / `partially_refunded`), idempotente
- [x] AC16: test db del SQL real de `claimEvent` y `reserveSeats` (corrido contra Neon de desarrollo)
- [x] AC17: `stripe` solo en `lib/stripe.ts`, sin datos personales en logs

## Cómo probar
1. `npm test` (493 tests; el test db se activa con `DATABASE_URL`).
2. Con `STRIPE_WEBHOOK_SECRET` definido: `curl -X POST localhost:3000/api/webhooks/stripe -d '{}'` → 400.
3. Con Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` y pagar una reserva de prueba.

## Revisión
- Reviewer: APPROVED (2 hallazgos menores, documentados en el changelog)
- lint ✓ · tsc ✓ · Playwright: n.a. (sin UI; ruta probada con `curl`)
