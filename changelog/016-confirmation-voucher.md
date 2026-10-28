# 016 — confirmation-voucher

- Fecha: 2026-10-27
- Spec: `docs/specs/checkout/confirmation-voucher.md`
- PR: `docs/prs/016-confirmation-voucher.md`

## Resumen
Nueva pantalla `/confirmacion/[code]`: voucher tipo ticket (código, paquete, salida, viajeros, total), viajero principal con documento enmascarado, punto de encuentro con mapa, "Qué sigue" y ayuda por WhatsApp. Solo la ve el dueño de la reserva (sin sesión, código inválido o reserva ajena dan el mismo 404). Si Stripe vuelve antes que el webhook, muestra "Estamos confirmando tu pago" y se refresca sola; también cubre reserva cancelada. El `success_url` de Stripe pasa de `/confirmacion?reserva=WY-####` a `/confirmacion/WY-####`.

## Cambios
- `app/(customer)/confirmacion/[code]/page.tsx` — ruta fina que delega en `ConfirmationPage`
- `modules/bookings/services/voucher-service.ts` — `getBookingVoucher(code, customerId)`: un solo `WHERE code AND customer_id`, solo lectura
- `modules/bookings/utils/voucher.ts` — `isBookingCode`, `toVoucherDto` (enmascara el documento)
- `modules/bookings/types/voucher.ts`, `modules/bookings/index.ts` — DTO y API pública
- `modules/checkout/components/confirmation-*.tsx`, `booking-voucher.tsx`, `print-voucher-button.tsx` — pantalla: héroe, voucher, punto de encuentro, pasos, ayuda y refresco
- `modules/checkout/components/meeting-point-map*.tsx`, `utils/meeting-links.ts` — mapa y enlaces de ruta del punto de encuentro
- `modules/checkout/services/checkout-service.ts` — `successUrl` a `/confirmacion/<code>` (y sus 3 tests)
- `components/shared/site-shell.tsx`, `app/(customer)/layout.tsx`, `app/(public)/layout.tsx`, `app/globals.css` — shell compartido con cabecera y pie
- `lib/whatsapp.ts` (+ test) — movido desde `modules/home/utils/`; `modules/home/components/home-page.tsx` actualiza el import
- `modules/packages/utils/package-detail.ts`, `modules/packages/index.ts` — ajustes para el punto de encuentro (+ test)
- `docs/specs/checkout/confirmation-voucher.md` — spec aprobada
- tests colocados junto al servicio y a las utils nuevas

## Pendiente
- El título de la pestaña dice "Reserva confirmada" también con la reserva pendiente o cancelada (metadata estática).
- Error de hidratación en dev en el `UserButton` de Clerk (`user-menu.tsx`) dentro del `SiteShell`; no se comparó contra `main`.
- Sin probar en navegador: vista de reserva cancelada, "Descargar voucher" (abre impresión) y la ayuda por WhatsApp (requiere `NEXT_PUBLIC_WHATSAPP_NUMBER`).
- El seed no trae `meeting_point`: el voucher muestra "Por confirmar".
- La casilla de términos de `/pago` se desincroniza tras un error de validación; lo corrige `041-fix-checkout-terms` (otro PR).
- `NEXT_PUBLIC_APP_URL` falta en el `.env` local: sin ella `/pago` responde "No pudimos iniciar el pago".
