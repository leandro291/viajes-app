# Webhook de Stripe

- Module: payments
- Status: approved
- Approved by: leandro291 (2026-10-26)
- Mode: SDD

## Goal
Tarjeta Trello 015. `POST /api/webhooks/stripe`: verifica la firma con el cuerpo crudo, es idempotente vía `stripe_events` y refleja en la base lo que pasó en Stripe: pago confirmado (`checkout.session.completed`, descuenta cupo o reembolsa si no hay), sesión vencida (`checkout.session.expired`) y reembolsos (`charge.refunded`). Cierra el ciclo de la 014, que dejó booking y payment en `pending` sin tocar el cupo.

## Scope
- In:
  - Ruta fina `app/api/webhooks/stripe/route.ts` (patrón de `app/api/webhooks/clerk/route.ts`).
  - `modules/payments`: verificación de firma (`parseStripeEvent`), handler transaccional (`handleStripeEvent`) y capa de consultas de la transacción (`stripe-webhook-repository`).
  - `STRIPE_WEBHOOK_SECRET` en `.env.example`; tipos de evento reexportados desde `lib/stripe.ts`.
  - Tests Vitest con BD y Stripe mockeados; un test *(db)* opcional del repositorio (se omite sin `DATABASE_URL`).
- Out:
  - Cancelación por el cliente/operador, devolución de cupo y cancelación del booking al reembolsar (`charge.refunded` solo actualiza `payments`; el flujo de cancelación es otro ticket).
  - Barrido de `pending` huérfanos (Q5 de la 014), `/confirmacion`, correos/notificaciones, métodos distintos de tarjeta, `checkout.session.async_payment_*`.
  - Registrar el endpoint en el Dashboard de Stripe / `stripe listen` (paso manual, ver Edge cases).
  - Cambios de schema o migraciones.

## Decisiones (ya aprobadas por el usuario salvo D9-D11)
- **D1. Idempotencia en la misma transacción.** El primer paso de la transacción es `insert into stripe_events (id, type) … on conflict do nothing returning id`. Si no devuelve fila, el evento ya se procesó (o lo está procesando otra entrega, que bloquea el insert hasta su commit) → se ignora y se responde 200. Cualquier fallo → rollback completo (el evento queda sin registrar) y 500 para que Stripe reintente.
- **D2. `completed` sin cupo = reembolso + cancelación.** Si el `UPDATE departures … WHERE booked_seats + pax <= capacity` no afecta filas: `payments` → `refunded` con `refunded_cents = amount_cents` (y `stripe_payment_intent_id`, `paid_at`), `bookings` → `cancelled` + `cancelled_at`, y se pide el reembolso total a Stripe. El `charge.refunded` posterior recalcula desde `amount_refunded` (D6), así que no duplica.
- **D3. `completed` sobre un booking ya `cancelled`**: mismo camino de reembolso que D2 (sin intentar el cupo).
- **D4. `expired` solo actúa sobre `pending`.** Booking `pending` → `cancelled` + `cancelled_at`; su payment (por `stripe_checkout_session_id`) `pending` → `failed`. Si el booking ya está `confirmed` o `cancelled`, se ignora. No toca el cupo (nunca se descontó).
- **D5. `completed` con `payment_status != 'paid'` se ignora** (el evento se registra, no se modifica nada).
- **D6. `charge.refunded` recalcula, no suma.** Busca el payment por `stripe_payment_intent_id`; `refunded_cents = max(actual, min(charge.amount_refunded, amount_cents))` (el `max` evita retroceder con eventos fuera de orden; el `min` respeta `payments_refunded_cents_check`). Estado: `refunded` si `refunded_cents >= amount_cents`, `partially_refunded` si `> 0` y menor; con `amount_refunded = 0` no cambia nada. No devuelve cupo ni cancela el booking.
- **D7. Fallo del reembolso en Stripe → 500.** `refunds.create` corre **dentro** de la transacción, después de las escrituras y antes del commit: si lanza, hace rollback (incluido `stripe_events`) y Stripe reintenta el webhook. `idempotencyKey = "refund-no-seat:<payments.id>"` evita reembolsar dos veces si el commit falla tras crear el reembolso. *ponytail: la clave de Stripe vive 24 h y los reintentos del webhook hasta 3 días; una transacción abierta durante una llamada HTTP es aceptable al volumen de v1. Si molesta, pasar a un outbox.*
- **D8. Quién es el booking.** Se usa `metadata.booking_id` (fallback `client_reference_id`) para ubicar el booking, y la Session (`payments.stripe_checkout_session_id`, único) para ubicar el payment. Sin `booking_id` → se registra el evento, se loguea y se responde 200 (reintentar no lo arregla).
- **D9. `completed` sin fila de `payments` → lanza (500, reintento).** La 014 inserta el payment tras crear la Session; si el webhook llegara antes, el reintento lo encuentra. Si nunca aparece, Stripe reintenta ~3 días y queda en logs con el `event.id`. Alternativa: ignorar con log (pierde el pago). Ver Q1.
- **D10. `charge.refunded` sin payment con ese `payment_intent` → lanza (500, reintento).** Caso real: el reembolso de D2 dispara `charge.refunded` y puede llegar antes del commit que guarda el `payment_intent_id`; el reintento ya lo encuentra. Ver Q1.
- **D11. Bloqueo de fila.** `completed` y `expired` leen el booking con `SELECT … FOR UPDATE` para serializar entregas concurrentes sobre la misma reserva. Dos reservas distintas por la misma plaza se resuelven con el `UPDATE` guardado de `departures` (una gana, la otra reembolsa).
- **D12. Escrituras cruzadas en una transacción.** Cupo, booking y payment se confirman en **una** transacción (ERM, Reglas de datos). `modules/bookings` no acepta un `tx` (`cancelPendingBooking` usa el `db` global), así que `payments` escribe `bookings` y `departures` desde su repositorio dentro de la transacción. *ponytail: acoplamiento aceptado; si `bookings` expone funciones con `tx`, moverlas allá.*
- **D13. Firma con cuerpo crudo.** La ruta lee `await req.text()` (sin parsear JSON antes) y el header `stripe-signature`; `getStripe().webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)` (tolerancia por defecto de 5 min). Firma ausente/ inválida → 400. Falta de `STRIPE_WEBHOOK_SECRET` o `STRIPE_SECRET_KEY` → error de configuración → 500 (no 400: no es culpa del llamador).
- **D14. Eventos no manejados** (cualquier otro `type`): 200 sin registrar nada.
- **D15. `proxy.ts` ya deja pública la ruta.** `clerkMiddleware` solo protege `/pago`, `/confirmacion`, `/mis-reservas`, `/cuenta`, `/operador`, `/admin`; `/api/webhooks/stripe` cae fuera (el matcher incluye `/api`, pero el callback retorna sin exigir sesión). Igual que `/api/webhooks/clerk`. No se edita `proxy.ts`.
- **D16. Sin caché ni runtime especial.** Handler `POST` dinámico, runtime Node por defecto (el SDK usa `crypto` de Node), sin `"use cache"`.

## Reuse
- Reuse: `lib/stripe.ts` `getStripe()` — `webhooks.constructEvent` y `refunds.create`; nadie más instancia Stripe (ARCHITECTURE §5).
- Reuse: `lib/db` (`db`, `payments`, `stripeEvents`, `bookings`, `departures`), `drizzle-orm` (`eq`, `and`, `sql`), `db.transaction` como en `modules/bookings/services/booking-service.ts`.
- Reuse: patrón de `app/api/webhooks/clerk/route.ts` (ruta fina: verifica → delega → 400/500) y de `modules/users/services/clerk-sync-service.ts` (idempotente, log con prefijo).
- Reuse: `getStripe` mockeado con `vi.mock("@/lib/stripe", …)` como en `modules/payments/services/checkout-session-service.test.ts`; `describe.skipIf(!process.env.DATABASE_URL)` + `await import()` como en `payment-service.test.ts`.
- Reuse: `metadata.booking_id`/`client_reference_id` que ya escribe `modules/payments/utils/checkout-session.ts`.
- Extend: `lib/stripe.ts` — reexporta solo tipos (`StripeEvent`, `StripeCheckoutSession`, `StripeCharge`) para que ningún otro archivo importe `"stripe"`.
- Extend: `modules/payments/index.ts` — exporta `parseStripeEvent`, `handleStripeEvent`, `StripeSignatureError`.
- Extend: `.env.example` — `STRIPE_WEBHOOK_SECRET`.
- No se reutiliza `cancelPendingBooking` (`bookings`): usa `db`, no el `tx` de la transacción (D12).
- New: `modules/payments/services/stripe-event-service.ts` (firma), `stripe-webhook-service.ts` (handler) y `stripe-webhook-repository.ts` (consultas sobre `tx`, separadas para testear la orquestación con mocks simples y el SQL con el test *(db)*).
- New: `app/api/webhooks/stripe/route.ts` — ruta distinta de la de Clerk.
- No hay dependencias nuevas ni UI.

## Acceptance criteria
*(auto)* = `npm test` / comando; *(db)* = `npm run test:db`.

### Ruta y firma
- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint` y `npm test` en verde al cierre; `npm run build` no falla sin `STRIPE_WEBHOOK_SECRET` (nada se lee al importar).
- AC2 *(auto)*: `parseStripeEvent(rawBody, signature)` llama `getStripe().webhooks.constructEvent(rawBody, signature, secret)` con el cuerpo **tal cual** (string) y devuelve el evento. Firma `null`/vacía o `constructEvent` lanzando → `StripeSignatureError`. `STRIPE_WEBHOOK_SECRET` ausente/vacío/solo espacios, o `getStripe()` lanzando → `Error` normal (no `StripeSignatureError`) con el nombre de la variable, sin su valor.
- AC3 *(auto)*: la ruta (con `@/modules/payments` mockeado) lee el cuerpo con `req.text()` y el header `stripe-signature`; `StripeSignatureError` → 400 sin llamar a `handleStripeEvent`; otro error al verificar → 500; `handleStripeEvent` lanzando → 500 y se loguea el `event.id`; éxito → 200. Importa solo de `@/modules/payments`.
- AC4 *(auto)*: `proxy.ts` queda sin cambios y `/api/webhooks/stripe` no coincide con ningún matcher protegido (D15); `STRIPE_WEBHOOK_SECRET` documentado en `.env.example` con comentario.

### Idempotencia y eventos ignorados
- AC5 *(auto)*: `handleStripeEvent` abre **una** transacción por evento manejado; lo primero es `claimEvent(tx, event.id, event.type)`. Si devuelve `false` (ya existía) no hace ninguna otra consulta ni llamada a Stripe y resuelve sin error. Mismo evento dos veces → la segunda es no-op.
- AC6 *(auto)*: un `type` fuera de los tres (p. ej. `payment_intent.created`) no abre transacción ni escribe (D14).
- AC7 *(auto)*: si cualquier paso de la transacción lanza (incluido `refunds.create`), `handleStripeEvent` propaga el error (la transacción hace rollback; con el mock, `claimEvent` queda sin commit).

### checkout.session.completed
- AC8 *(auto)*: pending + cupo → `reserveSeats(tx, departureId, paxCount)` devuelve `true`: payment `succeeded` con `stripe_payment_intent_id` (id de `session.payment_intent`, string u objeto) y `paid_at`, booking `confirmed`; no hay llamada a `refunds.create`.
- AC9 *(auto)*: pending sin cupo (`reserveSeats` → `false`): payment `refunded` con `refunded_cents = amount_cents` y `stripe_payment_intent_id`, booking `cancelled` + `cancelled_at`, y `refunds.create({ payment_intent }, { idempotencyKey: "refund-no-seat:<payment.id>" })` exactamente una vez (D2, D7).
- AC10 *(auto)*: booking ya `cancelled` → mismo resultado que AC9 **sin** llamar a `reserveSeats` (D3). Booking `confirmed`, o payment ya `succeeded`/`refunded`/`partially_refunded` → no cambia nada ni reembolsa.
- AC11 *(auto)*: `payment_status != 'paid'` (`unpaid`, `no_payment_required`) → solo registra el evento (D5). Sin `booking_id` ni `client_reference_id` → registra, loguea y no escribe (D8). Payment inexistente para esa Session → lanza (D9). `payment_intent` nulo cuando hay que reembolsar → lanza.

### checkout.session.expired
- AC12 *(auto)*: booking `pending` → `cancelled` + `cancelled_at` y payment (por Session) `pending` → `failed`; booking `confirmed`/`cancelled` → no escribe; en ningún caso llama a `reserveSeats` (D4). Si no existe payment pero sí booking `pending`, igual lo cancela.

### charge.refunded
- AC13 *(auto)*: `amount_refunded == amount_cents` → payment `refunded`, `refunded_cents = amount_cents`; `0 < amount_refunded < amount_cents` → `partially_refunded` con ese valor; `amount_refunded = 0` → sin cambios. Un evento más viejo con `amount_refunded` menor al ya guardado no lo baja (D6). Un `amount_refunded` > `amount_cents` se acota a `amount_cents`.
- AC14 *(auto)*: no toca `departures` ni `bookings`. `payment_intent` como string u objeto expandido. Sin payment con ese `payment_intent` → lanza (D10).
- AC15 *(auto)*: secuencia D2 → `charge.refunded` por el reembolso total: el payment ya está `refunded` con `refunded_cents = amount_cents` y el handler no lo cambia (idempotente, no duplica).

### Repositorio (SQL real)
- AC16 *(db, opcional)*: `claimEvent` devuelve `true` la primera vez y `false` la segunda con el mismo id; `reserveSeats` suma `pax` si `booked_seats + pax <= capacity`, devuelve `false` y no cambia nada si no entra (cupo exacto entra; `capacity + 1` no), con fixtures propios borrados en `afterAll`.

### Arquitectura
- AC17 *(auto)*: `grep` de `from "stripe"` solo en `lib/stripe.ts` (y su test); `app/api/webhooks/stripe/route.ts` no importa `lib/db` ni `stripe`; `modules/payments` sin `"use cache"` ni `"use client"`; ningún log imprime correo, teléfono, documento ni el secreto (solo `event.id`, `event.type`, ids de Session/payment).

## Contracts

### Entorno
`.env.example` gana:
```
# Stripe: signing secret del endpoint /api/webhooks/stripe (Dashboard > Developers > Webhooks, o `stripe listen`)
STRIPE_WEBHOOK_SECRET=
```

### `lib/stripe.ts` (solo se agregan tipos)
```ts
export type StripeEvent = Stripe.Event;
export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeCharge = Stripe.Charge;
```

### `app/api/webhooks/stripe/route.ts`
```ts
export async function POST(req: NextRequest): Promise<Response>;
// body = await req.text(); sig = req.headers.get("stripe-signature")
// parseStripeEvent -> StripeSignatureError => 400 | otro error => 500
// handleStripeEvent -> error => 500 (log con event.id) | ok => 200
```

### `modules/payments/services/stripe-event-service.ts`
```ts
export class StripeSignatureError extends Error {}

// Síncrona. Lee STRIPE_WEBHOOK_SECRET en cada llamada (no al importar).
export function parseStripeEvent(rawBody: string, signature: string | null): StripeEvent;
```

### `modules/payments/services/stripe-webhook-repository.ts`
Todas reciben el `tx` de `db.transaction` (`export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]`). Firma orientativa; el developer puede ajustar nombres sin cambiar el comportamiento.
```ts
claimEvent(tx, id: string, type: string): Promise<boolean>;            // insert … on conflict do nothing returning
lockBooking(tx, bookingId: string): Promise<{ id; status; departureId; paxCount } | undefined>; // FOR UPDATE
findPaymentBySession(tx, sessionId: string): Promise<PaymentRow | undefined>;
findPaymentByIntent(tx, paymentIntentId: string): Promise<PaymentRow | undefined>;
reserveSeats(tx, departureId: string, pax: number): Promise<boolean>; // update … where booked_seats + pax <= capacity returning
confirmBooking(tx, bookingId: string): Promise<void>;                  // status = confirmed
cancelBooking(tx, bookingId: string): Promise<void>;                   // status = cancelled, cancelled_at = now()
markPaymentSucceeded(tx, paymentId: string, paymentIntentId: string): Promise<void>; // + paid_at
markPaymentRefundedInFull(tx, paymentId: string, paymentIntentId: string): Promise<void>; // refunded, refunded_cents = amount_cents, paid_at
markPaymentFailed(tx, paymentId: string): Promise<void>;
setPaymentRefunded(tx, paymentId: string, refundedCents: number, status: "refunded" | "partially_refunded"): Promise<void>;
```
`PaymentRow` = `{ id, bookingId, status, amountCents, refundedCents }`. Los `where` de las escrituras de estado son por `id`; `reserveSeats` es el único con guarda de cupo.

### `modules/payments/services/stripe-webhook-service.ts`
```ts
// Un evento = una transacción: claimEvent -> lógica del tipo -> (refund) -> commit. Lanza => rollback.
export async function handleStripeEvent(event: StripeEvent): Promise<void>;
```
Pseudocódigo del `completed` (referencia, no código final):
```
if payment_status != 'paid' -> (solo claim) return
bookingId = metadata.booking_id ?? client_reference_id ; sin él -> log, return
booking = lockBooking ; payment = findPaymentBySession(session.id) ; sin payment -> throw
if payment.status in (succeeded, refunded, partially_refunded) -> return
pi = id de session.payment_intent ; if booking.status == 'pending' && reserveSeats(...) -> confirmar
else if booking.status in ('pending','cancelled') -> markPaymentRefundedInFull ; cancelBooking (si pending) ; refunds.create(...)
else -> return
```

### `modules/payments/index.ts` (agrega)
```ts
export { parseStripeEvent, StripeSignatureError } from "./services/stripe-event-service";
export { handleStripeEvent } from "./services/stripe-webhook-service";
```

## Edge cases
- **Entrega duplicada o concurrente**: D1 (el segundo insert espera al primero; si éste hizo rollback, el segundo procesa).
- **Eventos fuera de orden**: `charge.refunded` antes de `completed` ya commiteado → lanza y reintenta (D10); `refunded_cents` nunca retrocede (D6).
- **Carrera por la última plaza** entre dos pagos: gana el que ejecuta primero el `UPDATE` guardado; el otro termina en D2 (reembolso total, booking `cancelled`). El cliente cobrado no queda sin reembolso.
- **Reembolso OK en Stripe pero commit falla**: el reintento repite D2 con la misma `idempotencyKey`; Stripe devuelve el reembolso original (D7).
- **Clave de idempotencia caducada (>24 h)** con reintentos aún activos: podría duplicar el reembolso. *ponytail: poco probable (el primer intento falla rápido); si preocupa, consultar `refunds.list({ payment_intent })` antes de crear.*
- **Salida cancelada o pasada al pagar**: no se valida `departures.status`/`starts_at` en el webhook; el pago ya se hizo y el cupo es lo que decide. *ponytail: agregar `status = 'scheduled'` al `UPDATE` si se quiere reembolsar en ese caso.*
- **Moneda/monto**: `amount_refunded` y `payments.amount_cents` están ambos en centavos de USD; no se convierte.
- **Reembolsos manuales desde el Dashboard**: `charge.refunded` los refleja en `payments` (D6) sin tocar booking ni cupo; quien reembolsa a mano cancela la reserva por el flujo de cancelación.
- **Session sin `payments`** (compensación fallida de la 014, Q5): `expired` cancela el booking por `metadata.booking_id` (AC12); `completed` lanza (D9).
- **Config**: sin `STRIPE_WEBHOOK_SECRET` toda entrega da 500 (visible en logs). Registrar el endpoint (producción: Dashboard con los tres eventos; local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`) es un paso manual, fuera del alcance de código.
- **Secretos y datos personales**: no se loguean; los errores incluyen `event.id`/`event.type`.
- **Respuesta rápida**: una transacción con 4-6 consultas (+ un reembolso en D2); suficiente para el timeout de Stripe.

## Tests
Vitest ya instalado. Los *(auto)* corren con `npm test` sin `DATABASE_URL`: mockean `@/lib/db` (`db.transaction: (fn) => fn({})`) y `./stripe-webhook-repository` con `vi.fn()` por función, y `@/lib/stripe` (`getStripe: () => ({ webhooks: { constructEvent }, refunds: { create } })`), con `vi.mock` hoisteado y import estático del módulo bajo prueba (patrón de `checkout-session-service.test.ts`). Eventos de prueba como objetos mínimos casteados a `StripeEvent`.

- `modules/payments/services/stripe-event-service.test.ts` — AC2 (cuerpo crudo y secreto pasados a `constructEvent`; firma null/vacía; `constructEvent` lanza → `StripeSignatureError`; sin secreto → `Error` plano; `vi.stubEnv`/`unstubAllEnvs`).
- `modules/payments/services/stripe-webhook-service.test.ts` — AC5-AC15 (duplicado, tipo ignorado, rollback por error de reembolso; `completed`: confirma, sin cupo, booking cancelado, ya procesado, no pagado, sin booking_id, sin payment, `payment_intent` string/objeto/nulo; `expired`: pending/confirmed/cancelled/sin payment; `charge.refunded`: total, parcial, cero, evento viejo, acotado, sin payment, sin tocar bookings/departures; secuencia D2 → `charge.refunded`).
- `app/api/webhooks/stripe/route.test.ts` — AC3 (400 firma inválida, 500 config, 500 handler, 200 ok; mock de `@/modules/payments`; `Request` real con cuerpo string). `vitest.config.ts` ya incluye `**/*.test.ts`.
- `modules/payments/services/stripe-webhook-repository.test.ts` *(db, opcional, Q2)* — AC16.
- AC1, AC4 y AC17 los verifica el reviewer con `tsc`, `lint`, `test`, `build`, `git diff proxy.ts` y `grep`.

## Plan
Una sola fase: es una feature chica y el incremento (ruta + handler) solo tiene sentido completo. Deja `tsc` + `lint` + `test` en verde y la app funcionando.

### Phase 1 — Webhook de Stripe de punta a punta
Entrega: `/api/webhooks/stripe` verificando firma, idempotente, con los tres eventos y tests.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `STRIPE_WEBHOOK_SECRET` en `.env.example`; tipos `StripeEvent`/`StripeCheckoutSession`/`StripeCharge` en `lib/stripe.ts` | .env.example, lib/stripe.ts | - | A | AC4, AC17 | todo |
| T2 | `StripeSignatureError` + `parseStripeEvent` + test | modules/payments/services/stripe-event-service.ts, modules/payments/services/stripe-event-service.test.ts | T1 | B | AC2 | todo |
| T3 | repositorio de consultas sobre `tx` + `handleStripeEvent` (completed / expired / charge.refunded, reembolso D2/D7) + tests (mock) + test *(db)* del repositorio | modules/payments/services/stripe-webhook-repository.ts, modules/payments/services/stripe-webhook-service.ts, modules/payments/services/stripe-webhook-service.test.ts, modules/payments/services/stripe-webhook-repository.test.ts | T1 | B | AC5-AC16 | todo |
| T4 | ruta fina + exports de `payments` + test de la ruta | app/api/webhooks/stripe/route.ts, app/api/webhooks/stripe/route.test.ts, modules/payments/index.ts | T2, T3 | C | AC1, AC3, AC17 | todo |

T2 y T3 corren en paralelo (Group B, sin archivos en común). Si el developer prefiere partir T3 en repositorio y servicio, que lo haga dentro de la misma tarea.

## Open questions
- **Q1 (default: D9 y D10 lanzan).** Payment inexistente en `completed` o `charge.refunded` hace que Stripe reintente (hasta ~3 días, con ruido en logs si el payment nunca existe, p. ej. un cargo de otro producto en la misma cuenta). Alternativa: ignorar con log y perder el caso de la carrera. ¿Se mantiene lanzar?
- **Q2 (default: se incluye el test *(db)* de AC16).** Cubre el SQL real del cupo y de `claimEvent`, que los mocks no ejercitan; se omite sin `DATABASE_URL`, no afecta `npm test`. El usuario pidió "BD mockeada" para los unitarios; ¿se quita este test opcional?
- **Q3 (no bloqueante).** El reembolso va dentro de la transacción (D7) para no perder el reembolso si falla; alternativa descartada: reembolsar después del commit (un fallo dejaría el evento registrado y sin reembolso).
