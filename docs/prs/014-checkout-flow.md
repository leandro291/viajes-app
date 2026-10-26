# 014 — checkout-flow

- Spec: `docs/specs/checkout/checkout-flow.md`
- Rama: `014-checkout-flow`

## Qué se hizo
Ruta `/pago` con sesión: formulario del viajero principal, términos y resumen en soles y USD. La Server Action verifica cupo, crea el booking `pending` y su viajero, crea la Checkout Session de Stripe (solo tarjeta), registra el payment `pending` y redirige a Stripe. El CTA de `/ofertas` enlaza a `/pago` con `oferta`.

## Cambios
- `app/(customer)/pago/page.tsx` — ruta delgada.
- `modules/checkout/` (nuevo) — schema, params, servicios con compensación, `startCheckout` y componentes de la pantalla.
- `modules/bookings/` (nuevo) — `createPendingBooking` y `cancelPendingBooking`.
- `modules/payments/` — params y servicios de la Checkout Session, `createPendingPayment`.
- `modules/packages/`, `modules/users/` — `getBookableDeparture`, `buildCheckoutHref` con `oferta`, `getUserByClerkId`.
- `modules/offers/` — `package.id`, `getOfferHrefs` y CTA hacia `/pago`.
- `lib/money.ts`, `lib/stripe.ts`, `.env.example` — `formatUsd`, tipo de params y `NEXT_PUBLIC_APP_URL`.
- `components/ui/checkbox.tsx`, `components/ui/alert.tsx` — shadcn.
- `docs/specs/checkout/checkout-flow.md`, `changelog/014-checkout-flow.md`, `docs/prs/014-checkout-flow.md` — spec, changelog y PR.

## Criterios de aceptación
- [x] AC1: `npm run build` pasa sin `NEXT_PUBLIC_APP_URL` ni `STRIPE_SECRET_KEY`; `/pago` sale como Partial Prerender.
- [x] AC2–AC7: `formatUsd`, `buildCheckoutHref` con `oferta`, params de URL y schema Zod, con tests.
- [x] AC8–AC13: `getBookableDeparture`, `getUserByClerkId`, `createPendingBooking`, `cancelPendingBooking` y `createPendingPayment` (db, corridos contra Neon de desarrollo).
- [x] AC14–AC16: parámetros de la Session (`allowed_payment_method_types`, `expires_at` 31 min, `idempotencyKey`), servicios de Stripe y `getAppUrl`.
- [x] AC17–AC21: quote, `createCheckout`, rechazos sin efectos, compensación y Server Action (mocks).
- [x] AC22: pantalla con pasos, resumen y botón "Pagar US$ …" (desktop 1280 y móvil 390).
- [x] AC23: formulario con errores por campo, foco al primero y aviso global.
- [ ] AC24: estados de error. Verificado en navegador solo el enlace inválido; sin cupo, oferta vencida y total bajo el mínimo quedan cubiertos por tests.
- [ ] AC25: recorrido con Stripe. Se llegó a la página de Stripe con 25,33 US$ y el botón "Atrás" vuelve a `/pago` con los mismos params; no se pagó con la tarjeta 4242.
- [x] AC26: sin sesión, `/pago` responde 307 a `/sign-in` con retorno.
- [x] AC27: responsive sin scroll horizontal a 390 px.
- [x] AC28: arquitectura (`app/` solo ruteo, `"use client"` solo en el formulario, sin dependencias nuevas).
- [x] AC29–AC31: `getOfferHrefs`, `suggestedTravelers` y `package.id` en el DTO.
- [x] AC32: los 6 enlaces de `/ofertas` apuntan a `/pago?salida=…&viajeros=…&oferta=…`.

## Cómo probar
1. `npm ci && npx next typegen`.
2. `npx tsc --noEmit && npm run lint && npm test` (los tests db se omiten sin `DATABASE_URL`).
3. Con `DATABASE_URL` en `.env`: `node --env-file=.env ./node_modules/vitest/vitest.mjs run` (los tests insertan y borran fixtures con ids propios).
4. Con `STRIPE_SECRET_KEY` de prueba y `NEXT_PUBLIC_APP_URL=http://localhost:3000`: `npm run dev`, iniciar sesión, abrir `/ofertas`, elegir una oferta, completar el formulario y comprobar la redirección a Stripe. `/confirmacion` da 404 hasta su tarjeta.

## Revisión
- Reviewer: APPROVED (T1–T19), con 4 hallazgos menores; se corrigió el `MAX_TRAVELERS` duplicado.
- lint ✓ · tsc ✓ · tests 462/462 ✓ · Playwright: `/ofertas`, `/pago` (completo, errores de validación, enlace inválido, móvil 390, sin sesión) y redirección a Stripe.
