# 013 — price-stripe-client

- Spec: `docs/specs/payments/price-and-stripe-client.md`
- Rama: `013-price-stripe-client`

## Qué se hizo
Cliente de Stripe de solo servidor (`lib/stripe`) y service de monto `getBookingAmount` en `modules/payments`: precio × pax − oferta en soles, luego PEN→USD con `PEN_PER_USD`, redondeado al centavo con enteros. La oferta se valida en el servidor por `offerId`. Sin UI ni rutas nuevas; deja el contrato listo para la 014 (`/pago`).

## Cambios
- `package.json`, `package-lock.json` — dependencia nueva `stripe` (`^23.0.1`).
- `.env.example` — documenta `STRIPE_SECRET_KEY` y `PEN_PER_USD`.
- `lib/stripe.ts` (+test) — `getStripe()` singleton perezoso, sin `apiVersion`, no lee el entorno al importar.
- `modules/offers/pricing.ts` — entrada pura que re-exporta `calculateOffer` sin `lib/db`.
- `modules/payments/utils/currency.ts` (+test) — validación de `PEN_PER_USD` y `penToUsdCents` exacto en enteros.
- `modules/payments/utils/booking-amount.ts` (+test) — `assertValidPax` y `computeBookingAmount` puros.
- `modules/payments/services/amount-service.ts` (+test db) — `getBookingAmount`: paquete publicado, oferta válida, sin caché.
- `modules/payments/types/payment.ts`, `utils/payment-error.ts`, `index.ts` — tipos, `PaymentAmountError` y API pública.
- `docs/specs/payments/price-and-stripe-client.md`, `changelog/013-price-stripe-client.md`, `docs/prs/013-price-stripe-client.md` — spec, changelog y PR.

## Criterios de aceptación
- [ ] AC1: `tsc`, `lint` y `npm test` en verde ✓; `package.json` solo gana `stripe` ✓; `npm run build` sin las variables **no se corrió**.
- [x] AC2: `getStripe()` perezoso, falla con el nombre de la variable y es singleton (5 tests).
- [x] AC3: `parsePenPerUsd` / `getPenPerUsd` aceptan y rechazan según la tabla de la spec.
- [x] AC4: `penToUsdCents` con redondeo mitad hacia arriba, empates y oráculo del seed.
- [x] AC5: `computeBookingAmount` con los seis casos fijos y el invariante `total = unit × pax − descuento`.
- [x] AC6: `pax` inválido lanza `invalid_pax`.
- [x] AC7: `getBookingAmount` sin oferta y con oferta válida (db, 20/20 corrido por el developer contra Neon de desarrollo).
- [x] AC8: paquete inexistente o `draft` da `package_not_found` (db, ídem).
- [x] AC9: `offerId` inexistente, de otro paquete, inactivo o vencido da `offer_invalid` (db, ídem). Nota: con `packageId` en `draft` sale `package_not_found`, según el contrato.
- [x] AC10: `pax` o `PEN_PER_USD` inválidos fallan antes de tocar la DB (db, ídem).
- [x] AC11: arquitectura verificada con `grep` por el reviewer (Stripe solo en `lib/stripe`, sin `use cache`/`use client`, `payments` importa de `offers` solo `pricing`, sin precio del cliente, `.env.example` documentado).

## Cómo probar
1. `npm ci && npx next typegen`.
2. `npx tsc --noEmit && npm run lint && npm test` (los tests db se omiten sin `DATABASE_URL`).
3. Con `DATABASE_URL` en `.env`: `node --env-file=.env ./node_modules/vitest/vitest.mjs run modules/payments/services/amount-service.test.ts` (inserta y borra fixtures con ids propios `00000000-0000-4000-8000-0000001300xx`).
4. Sin UI: no hay pantalla que abrir.

## Revisión
- Reviewer: APPROVED (T1–T5)
- lint ✓ · tsc ✓ · Playwright: n.a. (sin rutas ni UI)
