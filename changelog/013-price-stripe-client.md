# 013 — price-stripe-client

- Fecha: 2026-10-25
- Spec: `docs/specs/payments/price-and-stripe-client.md`
- PR: `docs/prs/013-price-stripe-client.md`

## Resumen
Base de pago solo de servidor: el cliente de Stripe (`getStripe()`, singleton perezoso) y el service de monto `getBookingAmount`, que calcula precio × pax − oferta en soles y lo convierte a USD con `PEN_PER_USD`, redondeado al centavo con enteros. La oferta se valida en el servidor por `offerId` (activa, vigente y del paquete). Devuelve el snapshot que la tarjeta 014 guarda en `bookings` y `payments`. No hay UI ni rutas nuevas.

## Cambios
- `package.json`, `package-lock.json` — dependencia nueva `stripe` (`^23.0.1`).
- `.env.example` — documenta `STRIPE_SECRET_KEY` y `PEN_PER_USD` (ejemplo `3.75`).
- `lib/stripe.ts` (+test) — `getStripe()`: no lee el entorno al importar, lanza con el nombre de la variable si falta la clave, misma instancia en cada llamada, sin `apiVersion`.
- `modules/offers/pricing.ts` — entrada pura que re-exporta `calculateOffer` y sus tipos sin arrastrar `lib/db`.
- `modules/payments/utils/currency.ts` (+test) — `parsePenPerUsd`, `getPenPerUsd`, `penToUsdCents` (mitad hacia arriba exacta en enteros) y `STRIPE_MIN_AMOUNT_USD_CENTS`.
- `modules/payments/utils/booking-amount.ts` (+test) — `assertValidPax` y `computeBookingAmount`, puros.
- `modules/payments/services/amount-service.ts` (+test db) — `getBookingAmount`: paquete publicado, oferta válida, cálculo y conversión; sin caché.
- `modules/payments/types/payment.ts`, `utils/payment-error.ts`, `index.ts` — tipos, `PaymentAmountError` con `code` y API pública.
- `docs/specs/payments/price-and-stripe-client.md`, `changelog/013-price-stripe-client.md`, `docs/prs/013-price-stripe-client.md` — spec (aprobada, T1–T5 `done`), changelog y PR.

## Pendiente
- Sin verificar en navegador: no hay pantalla ni ruta que probar. Verificado con `tsc`, `lint`, `npm test` (224 pasan, 55 omitidos) y los 20 tests db del service contra Neon de desarrollo. No se corrió `npm run build`.
- La 014 debe validar `packageId` y `offerId` como uuid (`z.uuid()`) en el borde: un id con formato inválido llega a Postgres y lanza el error crudo de la DB.
- La 014 decide qué hacer con un monto USD bajo `STRIPE_MIN_AMOUNT_USD_CENTS` (hoy solo una oferta de 100 %) y con `offer_invalid` (puede reintentar sin `offerId`).
- AC9 de la spec dice `offer_invalid` para una oferta "sobre un paquete no publicado", pero el contrato consulta primero el paquete y devuelve `package_not_found`. El código sigue el contrato; es solo redacción de la spec.
- Techos conocidos (`ponytail` en la spec): sin tope de `pax` en el service (lo pone la validación de cupo de la 014); se asume moneda `PEN`; el cliente elige la oferta por `offerId` y el service no decide cuál es la mejor.
- `STRIPE_WEBHOOK_SECRET`, Checkout Session, creación de reservas y reembolsos quedan para otras tarjetas.
