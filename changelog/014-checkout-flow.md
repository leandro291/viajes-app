# 014 — checkout-flow

- Fecha: 2026-10-25
- Spec: `docs/specs/checkout/checkout-flow.md`
- PR: `docs/prs/014-checkout-flow.md`

## Resumen
Ruta `/pago` (requiere sesión): datos del viajero principal, términos y resumen en soles y USD. Una Server Action verifica cupo, crea el booking `pending` con su viajero, crea la Checkout Session de Stripe (solo tarjeta) y el payment `pending`, y redirige a Stripe. El CTA de `/ofertas` ahora enlaza a `/pago` con la oferta.

## Cambios
- `app/(customer)/pago/page.tsx` — ruta delgada que delega en `CheckoutPage`.
- `modules/checkout/` — módulo nuevo: schema Zod, params de URL, `getAppUrl`, etiquetas, `getCheckoutQuote` / `createCheckout` (con compensación), Server Action `startCheckout` y componentes (pasos, formulario, resumen, avisos, esqueleto, página).
- `modules/bookings/` — módulo nuevo: `createPendingBooking` (verifica cupo, transacción booking + viajero, sin descontar cupo) y `cancelPendingBooking`.
- `modules/payments/` — `buildCheckoutSessionParams`, `createCheckoutSession`, `expireCheckoutSession` y `createPendingPayment`; exports nuevos.
- `modules/packages/` — `getBookableDeparture` (sin caché) y `buildCheckoutHref` con `oferta`.
- `modules/users/` — `getUserByClerkId`.
- `modules/offers/` — `package.id` en `OfferDto`, `getOfferHrefs` y hero, grilla y tarjetas con enlace a `/pago`.
- `lib/money.ts`, `lib/stripe.ts` — `formatUsd` y tipo `CheckoutSessionParams`.
- `components/ui/checkbox.tsx`, `components/ui/alert.tsx` — shadcn.
- `.env.example` — documenta `NEXT_PUBLIC_APP_URL`.
- `docs/specs/checkout/checkout-flow.md`, `changelog/014-checkout-flow.md`, `docs/prs/014-checkout-flow.md` — spec, changelog y PR.

## Pendiente
- `/confirmacion` no existe (otra tarjeta): el `success_url` da 404 hasta entonces. Esa página debe comprobar que la reserva sea del usuario, porque el código `WY-####` es adivinable.
- Webhook de Stripe (015): hasta entonces el booking queda `pending` y no se descuenta cupo ni se limpian los `pending` huérfanos.
- Usuario sin fila en `users`: la página muestra "Estamos preparando tu perfil" en vez del formulario con el correo vacío que dice la spec. Alinear spec o código.
- El aviso de enlace inválido repite el mismo texto en título y mensaje.
- La spec no lista `modules/offers/utils/offer-view.test.ts` en el `Owns` de T17; se tocó por el tipo `package.id`.
- Sin verificar en navegador: estados "sin cupo", "oferta vencida" y "total bajo el mínimo" (cubiertos por tests), y el pago completo con la tarjeta 4242.
