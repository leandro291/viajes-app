# 016 — confirmation-voucher

- Spec: `docs/specs/checkout/confirmation-voucher.md`
- Rama: `016-confirmation-voucher`

## Qué se hizo
Pantalla `/confirmacion/[code]` con el voucher de la reserva, visible solo para su dueño. Cubre reserva `confirmed`, `pending` (se refresca sola hasta que llega el webhook) y `cancelled`. El `success_url` de Stripe pasa a `/confirmacion/<code>`.

## Cambios
- `app/(customer)/confirmacion/[code]/page.tsx` — ruta fina que delega en `ConfirmationPage`
- `modules/bookings/` — `getBookingVoucher` (un solo `WHERE code AND customer_id`), `toVoucherDto` con documento enmascarado, tipos y tests
- `modules/checkout/components/` — pantalla: héroe, voucher, viajeros, punto de encuentro con mapa, pasos, ayuda, refresco e impresión
- `modules/checkout/services/checkout-service.ts` — `successUrl` a `/confirmacion/<code>` (+ tests de `checkout` y `payments`)
- `components/shared/site-shell.tsx`, `app/(customer)/layout.tsx`, `app/(public)/layout.tsx`, `app/globals.css` — shell compartido
- `lib/whatsapp.ts` — movido desde `modules/home/utils/`
- `modules/packages/utils/package-detail.ts` — ajustes para el punto de encuentro
- `docs/specs/checkout/confirmation-voucher.md`, `changelog/016-confirmation-voucher.md` — spec y changelog

## Criterios de aceptación
- [x] AC1: `tsc`, `lint`, `test` (519) y `build` en verde; `build` sin `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` ni `NEXT_PUBLIC_WHATSAPP_NUMBER`
- [x] AC2–AC6, AC10: tests unitarios en verde (código de reserva, `toVoucherDto`, enlaces de mapa, fecha en zona Lima, `whatsapp`, `successUrl`)
- [x] AC7–AC9: `voucher-service.test.ts` (db) corrido contra Neon de desarrollo, 6 tests
- [x] AC12 (parcial): móvil 390 px apilado y sin scroll horizontal
- [x] AC13: viajero principal con `DNI ****5678` y etiqueta "Principal"
- [x] AC17 (parcial): reserva ajena (admin no dueño) y código mal formado → 404
- [x] AC18: `pending` con "Estamos confirmando tu pago" y estado "tarda más de lo normal" con botón Actualizar; con webhook activo la reserva pasa a `confirmed`
- [x] AC22: recorrido real `/pago` → Stripe (tarjeta `4242…`) → `/confirmacion/WY-4848` con `stripe listen` → voucher confirmado
- [ ] AC11, AC14, AC15, AC16, AC19, AC20, AC21, AC23: sin verificar (mapa, ayuda por WhatsApp, impresión, reserva cancelada, layouts de `/`, `/paquetes`, `/ofertas`, foco y `prefers-reduced-motion`, `grep` de `"use client"`)
- [ ] AC17 (resto): sin sesión → redirige a ingresar; no se probó

## Cómo probar
1. `npm test` y, con `DATABASE_URL`, `npx vitest run modules/bookings/services/voucher-service.test.ts`.
2. `.env` con `NEXT_PUBLIC_APP_URL=http://localhost:3000` y `STRIPE_WEBHOOK_SECRET` de `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (la misma cuenta que `STRIPE_SECRET_KEY`).
3. Pagar en `/pago?salida=<id>&viajeros=2` con `4242 4242 4242 4242` → vuelve a `/confirmacion/WY-####` con el voucher.
4. Abrir `/confirmacion/<código de otra persona>` → 404.

## Revisión
- Reviewer: n.a. (no se corrió el agente `reviewer`)
- lint ✓ · tsc ✓ · Playwright: `/confirmacion/[code]` en `pending`, `confirmed` y 404, escritorio y móvil; consola sin errores (avisos de Clerk dev, LCP y un error de hidratación del `UserButton` en `/pago`)
