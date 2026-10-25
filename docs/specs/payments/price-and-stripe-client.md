# Cálculo de precio + cliente Stripe

- Module: payments
- Status: approved
- Approved by: leandro291 (2026-10-25)
- Mode: SDD

## Goal
Tarjeta Trello 013. Dejar listo, solo en servidor, (1) el cliente de Stripe en `lib/stripe` y (2) el service de monto de `modules/payments`: precio × pax − oferta, luego PEN → USD con `PEN_PER_USD`, redondeado al centavo. Desbloquea la 014 (`/pago`), que toma el resultado tal cual para el snapshot de la reserva y para la Checkout Session.

## Scope
- In:
  - `lib/stripe.ts`: `getStripe()`, singleton perezoso (no lanza al importar: `next build` sin `STRIPE_SECRET_KEY` no se rompe). Dependencia nueva `stripe`.
  - `modules/payments`: conversión PEN → USD (`penToUsdCents`, lectura y validación de `PEN_PER_USD`), cálculo puro del monto (`computeBookingAmount`, reutiliza `calculateOffer`) y service con DB (`getBookingAmount`: valida paquete publicado y oferta, devuelve el contrato de salida para la 014).
  - Error tipado `PaymentAmountError` con `code`.
  - Tests unitarios (Vitest) de la lógica pura y del cliente; test *(db)* del service.
- Out (tarjeta 014 y otras):
  - Checkout Session, creación de `bookings`/`booking_travelers`/`payments`, validación de cupo, webhook (`/api/webhooks/stripe`, `STRIPE_WEBHOOK_SECRET`), reembolsos, UI de `/pago`.
  - Qué hacer con un monto menor al mínimo de Stripe (ver Q1).
  - Cambios de schema/migraciones, invalidación de caché, formateo de USD para la UI.

## Decisiones a aprobar
- **D1. Oferta por `offerId` validado en servidor** (decisión del usuario). El cliente manda `offerId` opcional; el servidor exige: `offers.is_active`, `valid_until` nulo o futuro (`now()` de la DB), `offers.package_id = packageId` y paquete `published`. `min_people` lo resuelve `calculateOffer` (con `pax < min_people` no hay descuento). El cliente nunca manda precio, descuento ni total: la firma no los acepta.
- **D2. `PEN_PER_USD` sin valor por defecto** (decisión del usuario). Ausente, vacío o que no sea número finito > 0 → `PaymentAmountError("invalid_exchange_rate")`. El `3.75` de `.env.example` es solo un ejemplo. Se lee en cada llamada (no al importar el módulo).
- **D3. Tope de 4 decimales y < 10 000 para el tipo de cambio.** `bookings.exchange_rate` es `numeric(8,4)`: más decimales se redondearían al guardar y el snapshot ya no reproduciría el monto cobrado. Se rechaza también (`invalid_exchange_rate`). Ver Q3.
- **D4. Redondeo exacto en enteros.** `penToUsdCents(total, rate)` = `round-half-up(total / rate)` calculado con enteros: `r = round(rate × 10 000)` (entero exacto por D3) y `floor((2·total·10 000 + r) / (2·r))`. No hay división flotante, así que los empates (`x.5`) suben siempre. Con `3.75` coincide con `penToUsdCents` del seed (`Math.round(total / rate)`; ese helper se usa solo como oráculo en el test y no se importa desde producción). Magnitudes: `total` es `int4` (≤ 2,1·10⁹) → `2·total·10⁴` ≤ 4,3·10¹³ < 2⁵³.
- **D5. Dos capas** (SRP). `computeBookingAmount` es pura (sin DB ni env) y se testea sin `DATABASE_URL`; `getBookingAmount` hace las consultas, lee el tipo de cambio y delega en la pura.
- **D6. Entrada por `packageId` (uuid)**, igual que `bookings.package_id`; si la 014 parte de un slug, lo resuelve ella con `modules/packages`.
- **D7. `offerId` devuelto = oferta efectivamente aplicada.** Si la oferta es válida pero `discountCents === 0` (p. ej. `pax < min_people`), se devuelve `offerId: null` para que `bookings.offer_id` no marque una oferta que no rebajó nada.
- **D8. Oferta inválida → error, no se ignora en silencio** (default; ver Q2). Una sola causa pública (`offer_invalid`) para no revelar por qué (inexistente, de otro paquete, inactiva o vencida).
- **D9. Sin `"server-only"` ni `apiVersion`.** `lib/db` no usa `server-only` y el paquete no está declarado en `package.json` (solo llega transitivo vía Next); el secreto no lleva `NEXT_PUBLIC_`, así que Next no lo expone. `stripe@23.0.1` fija su propia versión de API (`2026-09-30.endive`, verificado en el tarball: `cjs/apiVersion.js`; el README dice que sin `apiVersion` usa la de la versión del SDK y que cada versión de API sale con un major nuevo), por lo que no se pasa `apiVersion` (queda estable dentro del major, sin string que mantener).
- **D10. Pura de ofertas con entrada propia: `modules/offers/pricing.ts`.** `@/modules/offers` (barrel) arrastra `lib/db`, que lanza sin `DATABASE_URL`, y los tests puros no deben necesitar DB (misma razón por la que `offers` no importa el barrel de `packages` en sus utils). `pricing.ts` re-exporta solo `calculateOffer` y sus tipos; el barrel sigue exportando lo mismo. Alternativas descartadas: importar `offers/utils/...` (rompe ARCHITECTURE regla 6) o mockear el barrel (el test dejaría de ejercitar el cálculo real). Ver Q4.
- **D11. El monto no se cachea.** Sin `"use cache"`, sin `cacheTag`: se calcula siempre contra la DB en cada llamada.

## Reuse
- Reuse: `modules/offers/utils/offer-pricing.ts` `calculateOffer` — ya hace precio × pax − oferta (percent, 2x1, `min_people`, `RangeError` con entradas inválidas); su comentario lo reserva para la 013. Se consume vía `modules/offers/pricing.ts` (D10).
- Reuse: `lib/db` (`packages`, `offers`), `drizzle-orm` (`and`, `eq`, `gt`, `isNull`, `or`, `sql`), patrón de `offer-service.ts` (predicado `status = published` repetido en el módulo; `now()` de la DB para la vigencia).
- Reuse: `lib/db/seed` (`seedId`, `seedPackages`, `penToUsdCents`, `SEED_PEN_PER_USD`) solo como oráculo/datos en tests; `vitest.config.ts`, patrón `describe.skipIf(!process.env.DATABASE_URL)` + `await import()` de `offer-service.test.ts`.
- Reuse: `.env.example` ya trae `STRIPE_SECRET_KEY` y `PEN_PER_USD` (cambio sin commitear en el worktree; la T1 lo incluye).
- Extend: `modules/offers` — archivo nuevo `pricing.ts` (re-export de la pura, D10). No cambia `index.ts` ni el cálculo.
- Extend: `package.json` / `package-lock.json` — `npm i stripe` (no hay SDK de Stripe instalado; `fetch` a mano perdería tipos y reintentos).
- New: `lib/stripe.ts` — ARCHITECTURE §5: `lib/stripe` es el único lugar que instancia Stripe.
- New: `modules/payments/**` — módulo previsto en ARCHITECTURE sin código previo.
- No se reutiliza `lib/money.ts` (`formatPen` es solo formato en soles); la conversión PEN → USD tiene un solo consumidor (`payments`) y depende del env, por eso vive en `modules/payments/utils/currency.ts`. Si otro módulo necesita convertir, se sube a `lib/`.
- No hay componentes ni shadcn en esta spec.

## Acceptance criteria
*(auto)* = comando/test; *(db)* = test de integración con `DATABASE_URL` (`npm run test:db`).

### Cliente Stripe
- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint` y `npm test` terminan en verde al cierre de cada fase; `package.json` solo gana `stripe` (y el lockfile). `npm run build` no falla por falta de `STRIPE_SECRET_KEY` ni de `PEN_PER_USD` (nada se evalúa al importar).
- AC2 *(auto)*: importar `lib/stripe` sin `STRIPE_SECRET_KEY` no lanza. `getStripe()` lanza `Error` con mensaje en español que nombra `STRIPE_SECRET_KEY` si la variable falta o es vacía/solo espacios; con una clave de prueba (`sk_test_…`) devuelve una instancia de `Stripe`, y llamadas repetidas devuelven **la misma** instancia (singleton). No se pasa `apiVersion`.

### Tipo de cambio y conversión
- AC3 *(auto)*: `parsePenPerUsd(raw)` devuelve el número para `"3.75"`, `" 3.75 "`, `"4"`, `"0.0001"`; lanza `PaymentAmountError` con `code: "invalid_exchange_rate"` para `undefined`, `""`, `"   "`, `"abc"`, `"0"`, `"-1"`, `"NaN"`, `"Infinity"`, `"3,75"`, `"3.75001"` (> 4 decimales) y `"10000"` (≥ 10⁴). `getPenPerUsd()` aplica lo mismo a `process.env.PEN_PER_USD` leído en cada llamada (test con `vi.stubEnv`).
- AC4 *(auto)*: `penToUsdCents(totalCents, penPerUsd)` devuelve un entero con redondeo de mitad hacia arriba. Con `3.75`: `0→0`, `1→0`, `2→1`, `9500→2533`, `129000→34400`, `165000→44000`, `247600→66027`. Empates exactos: con `4`, `2→1`, `6→2`, `1→0`; con `2`, `1→1`, `3→2`. Contra el oráculo `penToUsdCents` del seed, mismo resultado para `total ∈ {6000, 9500, 52000, 129000, 165000}` × `pax 1..8` (con 3.75 no hay empates, así que la comparación es exacta). `totalCents` negativo o no entero, o `penPerUsd` que no pase D2/D3, lanzan `RangeError`. `STRIPE_MIN_AMOUNT_USD_CENTS` vale `50`.

### Monto (puro)
- AC5 *(auto)*: `computeBookingAmount({ unitCents, pax, offer, penPerUsd })` devuelve `{ offerId, unitPriceCents, discountCents, totalCents, exchangeRate, amountUsdCents }` y siempre cumple `totalCents = unitPriceCents × pax − discountCents` (el check `bookings_total_cents_check`). Con `penPerUsd = 3.75`:
  - sin oferta, 129000 c × 3 → `discount 0`, `total 387000`, `usd 103200`, `offerId null`;
  - `percent 15`, 129000 c × 2 → `discount 38600`, `total 219400`, `usd 58507`;
  - `two_for_one`, 9500 c × 3 → `discount 9500`, `total 19000`, `usd 5067`;
  - `percent 20`, `min_people 4`, 52000 c: pax 3 → sin descuento, `total 156000`, `usd 41600`, `offerId null` (D7); pax 4 → `discount 41600`, `total 166400`, `usd 44373`, `offerId` = id de la oferta;
  - `percent 100` → `total 0`, `usd 0` (no lanza; ver Q1);
  - `exchangeRate` devuelto = `penPerUsd` recibido (el que va al snapshot).
  Todo en enteros de centavos; el resultado es un `Number.isInteger` en cada campo monetario.
- AC6 *(auto)*: `pax` `0`, `-1`, `1.5`, `NaN` o no numérico lanza `PaymentAmountError` con `code: "invalid_pax"` (vía `assertValidPax`, que el service también llama antes de tocar la DB).

### Service con DB
- AC7 *(db)*: `getBookingAmount({ packageId, pax, offerId? })` sin oferta devuelve el monto calculado con `packages.price_cents` del paquete sembrado y el `PEN_PER_USD` del entorno (se fija con `vi.stubEnv("PEN_PER_USD", "3.75")`); con una oferta válida (fixture `percent 10`, sin vencimiento, sobre un paquete publicado) devuelve el descuento esperado y `offerId` = su id. El esperado se calcula en el test con `calculateOffer` + `penToUsdCents`, no con cifras copiadas.
- AC8 *(db)*: paquete inexistente (uuid válido que no existe) y paquete `draft` → `PaymentAmountError` con `code: "package_not_found"`.
- AC9 *(db)*: `offerId` que no existe, de **otro** paquete, con `is_active = false`, vencida (`valid_until` pasado) o sobre un paquete no publicado → `code: "offer_invalid"` (el mismo código en todos los casos). `valid_until` nulo cuenta como vigente.
- AC10 *(db)*: `pax` inválido → `invalid_pax` y `PEN_PER_USD` inválido → `invalid_exchange_rate`, ambos sin lanzar `RangeError` crudo y sin consultar la DB cuando el error se detecta antes (se valida primero `pax`, luego el tipo de cambio).
- AC11 *(auto)*: arquitectura. (a) `grep` de `new Stripe(` / `from "stripe"` solo encuentra `lib/stripe.ts` (y su test); (b) `modules/payments` no contiene `"use cache"` ni `"use client"`; (c) `payments` importa de `offers` solo `@/modules/offers/pricing`; (d) `modules/offers/pricing.ts` no importa `lib/db`; (e) `getBookingAmount` no recibe precio, descuento ni total del cliente (firma de Contracts); (f) `.env.example` documenta `STRIPE_SECRET_KEY` y `PEN_PER_USD`.

## Contracts

### Dependencia y entorno
`npm i stripe` (hoy `23.0.1`, Node ≥ 20). `.env.example` (ya editado en el worktree):
```
STRIPE_SECRET_KEY=          # servidor, nunca al cliente
PEN_PER_USD=3.75            # solo ejemplo; sin valor válido el cálculo falla (D2)
```
`STRIPE_WEBHOOK_SECRET` queda para la tarjeta del webhook.

### `lib/stripe.ts`
```ts
import Stripe from "stripe";

// Singleton perezoso: no lee el entorno al importar. Lanza Error si falta STRIPE_SECRET_KEY.
export function getStripe(): Stripe;
```

### `modules/offers/pricing.ts` (nuevo, puro, sin `lib/db`; D10)
```ts
export { calculateOffer } from "./utils/offer-pricing";
export type { OfferPricing, OfferPricingInput } from "./utils/offer-pricing";
export type { OfferTerms, DiscountType } from "./types/offer";
```

### `modules/payments/types/payment.ts`
```ts
import type { OfferTerms } from "@/modules/offers/pricing";

export type PricedOffer = OfferTerms & { id: string };

export type BookingAmountInput = {
  packageId: string; // uuid de packages.id
  pax: number;       // entero >= 1
  offerId?: string | null;
};

// Snapshot listo para la 014 (bookings.* en PEN, payments.amount_cents en USD).
export type BookingAmount = {
  offerId: string | null;   // oferta efectivamente aplicada (D7)
  unitPriceCents: number;   // packages.price_cents, por persona, PEN  -> bookings.unit_price_cents
  discountCents: number;    // PEN                                      -> bookings.discount_cents
  totalCents: number;       // unit × pax − discount, PEN               -> bookings.total_cents
  exchangeRate: number;     // soles por dólar usado                    -> bookings.exchange_rate
  amountUsdCents: number;   // lo que se envía a Stripe, USD            -> payments.amount_cents
};
```

### `modules/payments/utils/payment-error.ts`
```ts
export type PaymentAmountErrorCode =
  | "invalid_pax"
  | "package_not_found"
  | "offer_invalid"
  | "invalid_exchange_rate";

export class PaymentAmountError extends Error {
  readonly code: PaymentAmountErrorCode;
  constructor(code: PaymentAmountErrorCode, message?: string);
}
```

### `modules/payments/utils/currency.ts` (puras; `getPenPerUsd` lee `process.env`)
```ts
export const STRIPE_MIN_AMOUNT_USD_CENTS = 50; // USD 0.50; la 014 decide qué hacer debajo (Q1)

// D2/D3. Lanza PaymentAmountError("invalid_exchange_rate").
export function parsePenPerUsd(raw: string | undefined): number;
export function getPenPerUsd(): number; // parsePenPerUsd(process.env.PEN_PER_USD), en cada llamada

// D4. Redondeo mitad hacia arriba exacto en enteros. Lanza RangeError con entradas inválidas.
export function penToUsdCents(totalCents: number, penPerUsd: number): number;
```

### `modules/payments/utils/booking-amount.ts` (puras)
```ts
export function assertValidPax(pax: number): void; // PaymentAmountError("invalid_pax")

export function computeBookingAmount(input: {
  unitCents: number;
  pax: number;
  offer: PricedOffer | null;
  penPerUsd: number;
}): BookingAmount;
// calculateOffer({ unitCents, pax, ...offer }) (si offer) -> total -> penToUsdCents.
// offerId = offer.id solo si discountCents > 0 (D7). No lanza por monto 0 ni < mínimo de Stripe.
```

### `modules/payments/services/amount-service.ts`
```ts
// Siempre en servidor, sin caché (D11). Orden: assertValidPax -> getPenPerUsd -> paquete -> oferta -> compute.
export async function getBookingAmount(input: BookingAmountInput): Promise<BookingAmount>;
// paquete:  packages WHERE id = packageId AND status = 'published'   (si no: "package_not_found")
// oferta:   offers  WHERE id = offerId AND package_id = packageId AND is_active
//           AND (valid_until IS NULL OR valid_until > now())          (si no: "offer_invalid")
```

### `modules/payments/index.ts`
```ts
export { getBookingAmount } from "./services/amount-service";
export { computeBookingAmount } from "./utils/booking-amount";
export { getPenPerUsd, penToUsdCents, STRIPE_MIN_AMOUNT_USD_CENTS } from "./utils/currency";
export { PaymentAmountError } from "./utils/payment-error";
export type { PaymentAmountErrorCode } from "./utils/payment-error";
export type { BookingAmount, BookingAmountInput } from "./types/payment";
```
La 014 importa `getStripe` de `@/lib/stripe` (no de `payments`).

## Edge cases
- **`pax` inválido** (0, negativo, decimal, `NaN`, texto): `invalid_pax` antes de consultar la DB (AC6, AC10).
- **Paquete inexistente o `draft`**: `package_not_found`, sin distinguir cuál (AC8).
- **`offerId` de otro paquete, inactiva, vencida o inexistente**: `offer_invalid` (AC9). Cuando el cliente muestra una oferta que venció mientras tanto, la 014 puede reintentar sin `offerId` (Q2). El desfase de caché de `/ofertas` (offers spec, Edge cases) se resuelve aquí: la vigencia se evalúa en cada llamada contra `now()` de la DB.
- **`min_people`**: `pax < min_people` → total sin descuento y `offerId: null` (D7); no es error.
- **Redondeo PEN → USD**: mitad hacia arriba exacta (D4, AC4); con `3.75` nunca hay empates, por eso el test de empates usa otros tipos de cambio.
- **Total 0** (oferta `percent 100`): se devuelve `totalCents 0` y `amountUsdCents 0`; no es error del service. Stripe no acepta 0 ni < USD 0.50 (`STRIPE_MIN_AMOUNT_USD_CENTS`): la 014 debe decidirlo antes de crear la Session (Q1). Con precios reales (≥ S/ 60) solo el 100 % cae bajo el mínimo.
- **Enteros**: todo el dinero es entero de centavos; no hay floats salvo el tipo de cambio, que se escala a entero (D4). `totalCents` debe caber en `int4` (`bookings.total_cents`): el techo real de `pax` lo pone la validación de cupo de la 014 (`departures`), no este service. *ponytail: sin tope de `pax` aquí; si la 014 no valida cupo antes, un `pax` enorme fallaría al insertar.*
- **Moneda del paquete**: se asume `PEN` (`packages.currency` default); el service no la lee. *ponytail: si algún día hay paquetes en otra moneda, hay que convertir o rechazar.*
- **Mismo paquete con varias ofertas activas** (el schema lo permite): el cliente elige una por `offerId`; el service no decide la mejor. *ponytail: la regla de "mejor oferta" va con el CRUD de ofertas.*
- **`PEN_PER_USD` cambia entre reserva y pago**: el `exchangeRate` devuelto es el que la 014 guarda en el snapshot; el webhook no recalcula.
- **Build sin env**: `getStripe()` y `getPenPerUsd()` se evalúan solo al llamarlos. `lib/db` sigue lanzando al importarse sin `DATABASE_URL` (igual que el resto de módulos); por eso la parte pura no importa `lib/db` (D5, D10).
- **Secreto**: `STRIPE_SECRET_KEY` no se loguea; el mensaje de error nombra la variable, no su valor.

## Tests
Vitest ya instalado (`vitest.config.ts`: `**/*.test.ts`, alias `@`). `npm test` corre los no-db; el *(db)* con `npm run test:db`, omitido sin `DATABASE_URL`. Sin tests de markup (no hay UI).

- `lib/stripe.test.ts` — AC2 (con `vi.resetModules` + `vi.stubEnv`/`vi.unstubAllEnvs`: import sin clave no lanza; sin clave/vacía/espacios lanza con `STRIPE_SECRET_KEY` en el mensaje; con `sk_test_…` misma instancia en dos llamadas).
- `modules/payments/utils/currency.test.ts` — AC3 (válidos e inválidos de `parsePenPerUsd`; `getPenPerUsd` con `vi.stubEnv`), AC4 (tabla con 3.75, empates con 4 y 2, oráculo contra el seed, `RangeError`, constante `50`).
- `modules/payments/utils/booking-amount.test.ts` — AC5 (los seis casos con cifras fijas + invariante `total = unit × pax − discount` sobre una matriz de precios × pax × términos, y `Number.isInteger` en los campos), AC6 (`assertValidPax` y `computeBookingAmount` con pax inválido).
- `modules/payments/services/amount-service.test.ts` *(db)* — AC7–AC10 (fixtures con ids fijos insertados en `beforeAll` y borrados en `afterAll`: oferta válida sin vencimiento sobre `package:machu-picchu-magico`; oferta vencida; oferta inactiva; oferta de otro paquete publicado; paquete `draft` con su oferta; el borrado va primero las ofertas y luego el paquete por `onDelete: restrict`).
- AC1 y AC11 los verifica el reviewer con `tsc`, `lint`, `test`, `build` y `grep`.

## Plan
Fase 2 depende de la 1. Cada fase deja `tsc` + `lint` + `test` en verde y la app funcionando (no hay rutas nuevas).

### Phase 1 — Cliente Stripe y conversión de moneda
Entrega: `getStripe()`, lectura/validación de `PEN_PER_USD` y `penToUsdCents`, con tests; tipos, error y entrada pura de `offers` listos para la fase 2.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `npm i stripe`; `.env.example` (ya editado, se incluye); `modules/offers/pricing.ts`; tipos `BookingAmount`/`BookingAmountInput`/`PricedOffer`; `PaymentAmountError` | package.json, package-lock.json, .env.example, modules/offers/pricing.ts, modules/payments/types/payment.ts, modules/payments/utils/payment-error.ts | - | A | AC1, AC11 | done |
| T2 | `getStripe()` singleton perezoso + test | lib/stripe.ts, lib/stripe.test.ts | T1 | B | AC2 | done |
| T3 | `parsePenPerUsd`/`getPenPerUsd`/`penToUsdCents`/`STRIPE_MIN_AMOUNT_USD_CENTS` + test (con oráculo del seed) | modules/payments/utils/currency.ts, modules/payments/utils/currency.test.ts | T1 | B | AC3, AC4 | done |

### Phase 2 — Service de monto
Entrega: `getBookingAmount` y el `index.ts` de `payments`, listos para que la 014 los consuma.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | `assertValidPax` + `computeBookingAmount` puros + test | modules/payments/utils/booking-amount.ts, modules/payments/utils/booking-amount.test.ts | T1, T3 | A | AC5, AC6 | done |
| T5 | `getBookingAmount` (paquete publicado, oferta válida, delega en la pura) + test *(db)* + `index.ts` del módulo | modules/payments/services/amount-service.ts, modules/payments/services/amount-service.test.ts, modules/payments/index.ts | T4 | B | AC7, AC8, AC9, AC10, AC11 | done |

## Open questions
Ninguna bloquea el arranque salvo que se quiera cambiar un default; las tres primeras las puede resolver el humano al aprobar.
- **Q1 (default: el service NO lanza bajo el mínimo de Stripe).** El monto USD < 50 centavos (hoy solo el total 0 por oferta 100 %) lo devuelve tal cual, exporta `STRIPE_MIN_AMOUNT_USD_CENTS` y la 014 decide (rechazar, o saltar Stripe si es 0). Razón: `/pago` también muestra el total en USD antes de redirigir y un `throw` rompería esa vista. Alternativa: lanzar `PaymentAmountError("below_stripe_minimum")` desde el service para que ningún llamador pueda crear una Session inválida. ¿Cuál se prefiere?
- **Q2 (default: oferta inválida lanza `offer_invalid`).** La spec de `/ofertas` (Edge cases) anticipa que "un clic sobre una oferta vencida cae sin descuento". El default de acá es error explícito para que la 014 avise ("la oferta ya no está vigente") y reintente sin `offerId`, en vez de cobrar más de lo que el cliente vio. Alternativa: ignorar la oferta inválida y devolver `offerId: null`. ¿Error o caída silenciosa?
- **Q3 (default: se rechaza un `PEN_PER_USD` con más de 4 decimales o ≥ 10 000).** Va más allá de "número finito > 0" (D3) porque `bookings.exchange_rate` es `numeric(8,4)`. Alternativa: aceptar cualquier valor y redondear el snapshot a 4 decimales (el monto y el snapshot podrían divergir en un centavo).
- **Q4 (no bloqueante).** D10 agrega `modules/offers/pricing.ts` como entrada pura de `offers` para no depender de `lib/db` en los tests. Alternativa sin archivo nuevo: importar el barrel y exigir `DATABASE_URL` (o mockear `@/lib/db`) en todos los tests de `payments`.
