# Mis reservas y cancelación (/mis-reservas)

- Module: bookings (compone `payments` para el reembolso; el dato vive en `bookings`)
- Status: done
- Approved by: leandro291 (2026-10-28)
- Mode: SDD

## Goal
Tarjeta Trello 017. Crear `/mis-reservas` (solo el cliente dueño): lista de sus reservas con su estado (`StatusBadge`) y, en las confirmadas, un botón "Cancelar reserva" que cancela gratis hasta 48 h antes de la salida y devuelve el pago por la API de Stripe. Al cancelar: la reserva pasa a `cancelled`, se libera el cupo, el pago queda `refunded` y el webhook `charge.refunded` (015) llega como no-op idempotente.

El tablero de diseño aprobado **no tiene pantalla de Mis reservas** (9 páginas, ninguna lo es). Se arma con los tokens de `DESIGN-SYSTEM.md` y el patrón del ticket de `/confirmacion` (no hay fidelidad contra tablero que medir).

## Decisiones cerradas (vienen de ERM / SYSTEM-DESIGN / ARCHITECTURE, no se reabren)
1. Ruta `app/(customer)/mis-reservas/page.tsx` (ARCHITECTURE §4). `proxy.ts` ya protege `/mis-reservas(.*)` con rol `customer`: no se toca.
2. Cancelación gratis hasta 48 h antes de `departures.starts_at`; reembolso con la API de Stripe; al cancelar se devuelve el cupo (ERM "Reglas de datos", SYSTEM-DESIGN "Reserva y pago").
3. `bookings` es el dueño de "cancelación" y "Mis reservas" (ARCHITECTURE §3); `payments` es el dueño de Stripe: nadie fuera de `lib/stripe` + `payments` habla con Stripe.
4. `app/` solo enruta; el `customer_id` sale del token (`requireRole` → `getUserByClerkId`), nunca de la URL ni del cliente.
5. **(usuario, Q1)** Pasadas las 48 h se bloquea la cancelación web, con aviso y enlace a WhatsApp. Sin reembolso parcial ni retención: fuera de alcance (ver D1).
6. **(usuario, Q4)** Confirmada D5: la cancelación deja `payments` en `refunded` dentro de la propia transacción; el webhook `charge.refunded` queda de respaldo/no-op.
7. **(usuario, Q5)** Diseño propio con tokens y patrones existentes (`StatusBadge`, `ConfirmActionDialog`); no se espera tablero.
8. **(usuario, Q6)** 017 **no** toca `components/shared/user-menu.tsx` ni `site-header.tsx`. El enlace "Mis reservas" en el menú lo agrega 018 al rebasar sobre esta rama.

## Scope
- In:
  - Ruta delgada, `MyBookingsPage` (Server Component, `<Suspense>`), tarjetas por reserva con `StatusBadge`, estado vacío, secciones "Próximas" / "Anteriores y canceladas".
  - `getMyBookings(customerId)` + DTO + mapper puro.
  - Regla pura de cancelación (48 h) y servicio transaccional `cancelBooking(code, customerId)` con reembolso.
  - Server Action `cancelBookingAction(code)`, botón cliente con diálogo de confirmación.
  - Envoltorio de reembolso en `payments` (`refundPaymentIntent`).
- Out: cancelación de reservas `pending`; reembolso parcial / retención después de las 48 h (D1); cancelación por admin u operador y salida cancelada por el operador (paneles); paginación o filtros; correo/WhatsApp de aviso (v1 no envía nada); cambio de fecha/viajeros; tocar el webhook (`stripe-webhook-service.ts` queda igual); tocar `app/(customer)/cuenta`, `site-header` ni `user-menu` (los toca 018, que agrega el enlace "Mis reservas" al rebasar; decisión 8).

## Decisiones a aprobar
- **D1. Después de las 48 h no se cancela por la web.** El ERM dice "después, `refunded_cents` retiene el costo de las entradas ya emitidas", pero no hay ningún dato de cuánto se retiene (ni columna ni regla). La tarjeta solo pide "gratis hasta 48 h". v1: pasadas las 48 h el botón no aparece y se muestra "Ya no se puede cancelar gratis" con enlace a WhatsApp (si hay número). Reembolso parcial = otra spec cuando negocio defina el monto. *(Cerrada por el usuario: decisión 5.)*
- **D2. Ventana inclusiva:** se puede cancelar si `starts_at − now >= 48 h` (a las 48 h 0 min exactas, sí; 1 ms menos, no). Zona horaria irrelevante (instantes absolutos). Se recalcula en el servidor dentro de la transacción; la UI solo muestra el estado de la última carga.
- **D3. Una transacción con candado de fila (mismo patrón que el webhook, "un evento = una transacción"):** `db.transaction` → `SELECT … FROM bookings WHERE code AND customer_id FOR UPDATE` → validar → liberar cupo → `bookings.status='cancelled'`, `cancelled_at=now()` → `payments` a `refunded` (`refunded_cents = amount_cents`) → **último paso**, `refundPaymentIntent` en Stripe. Si Stripe lanza, todo hace rollback (la reserva sigue `confirmed`, el cupo intacto, el cliente puede reintentar). Techo (`ponytail:`): llamada de red con la fila bloqueada; aceptable al volumen de v1, igual que el reembolso "sin cupo" del webhook.
- **D4. Reembolso idempotente en dos capas.** (a) `idempotencyKey = "refund-cancel:" + payment.id` en `refunds.create`: un reintento tras fallo de red/commit devuelve el mismo reembolso (Stripe retiene claves 24 h). (b) Si pasado ese plazo Stripe responde `charge_already_refunded`, `refundPaymentIntent` lo trata como éxito (`alreadyRefunded: true`) y la transacción sigue. Reembolso total del cobro en USD (sin `amount`: Stripe devuelve el restante); sin ganancia/pérdida de tipo de cambio para el cliente.
- **D5. Interacción con `charge.refunded` (015): sin cambios al webhook.** `onChargeRefunded` calcula `refundedCents = max(payment.refundedCents, min(charge.amount_refunded, amount))`; como D3 ya dejó `refunded_cents = amount_cents` y `status='refunded'`, el evento resulta en `refundedCents === payment.refundedCents` → `return` (no-op). Si el evento llega **antes** del commit, hace un `UPDATE` con los mismos valores sobre la fila que D3 también actualiza: el estado final es el mismo en cualquier orden (el `UPDATE` de D3 es absoluto, no incremental). `booking.status` y cupo **solo** los toca D3, nunca el webhook. *Divergencia con SYSTEM-DESIGN, confirmada por el usuario (decisión 6)* ("actualiza `refunded_cents` por el webhook"): se actualiza en D3 para que `/confirmacion` y la lista muestren "reembolsado" al instante (patrón ya usado por el reembolso "sin cupo" del webhook); el webhook queda como red de seguridad y fuente para reembolsos hechos desde el dashboard de Stripe.
- **D6. Pago refundable** = el último `payment` de la reserva (por `created_at`) con `stripe_payment_intent_id` no nulo, siempre que su `status ∈ {succeeded, refunded}`; el estado se valida **después** de elegir el último (un `succeeded` viejo con un `pending` más nuevo → `no_refundable_payment`). La lista (AC15) toma el último pago por `created_at` sin exigir `pi_…`: solo difiere de la cancelación si hay un pago más nuevo sin `pi_…` (caso raro aceptado; la lista muestra "sin monto" y la cancelación decide por el último con `pi_…`). `succeeded` → se llama a Stripe; `refunded` (caso: el webhook ganó la carrera y la transacción anterior hizo rollback) → se cancela sin llamar a Stripe. Cualquier otro caso (`pending`, `failed`, `partially_refunded`, sin pago) → `no_refundable_payment`: **no** se cancela, para no dejar al cliente sin reserva y sin reembolso. Una reserva sembrada `confirmed` sin pago real queda no cancelable (aceptado; ver Edge cases).
- **D7. Solo `status='confirmed'` y `departures.status='scheduled'`** son cancelables. `pending` → `not_cancellable`; `cancelled` → éxito idempotente `alreadyCancelled: true` (doble clic / reintento). Salidas `en_route`/`completed`/`cancelled` → `not_cancellable`.
- **D8. Estados resultantes.** `bookings`: `confirmed → cancelled` (+`cancelled_at`). `departures.booked_seats = GREATEST(booked_seats − pax, 0)` (`ponytail:` el `GREATEST` evita violar el check ante datos inconsistentes en vez de abortar). `payments`: `succeeded → refunded`, `refunded_cents = amount_cents`. `/confirmacion/<code>` pasa a la vista `cancelled` con "Te reembolsamos el pago." (ya implementado en 016, sin tocarlo).
- **D9. Lista: orden y secciones.** "Próximas" = no `cancelled` y `starts_at >= now`, por `starts_at` ascendente. "Anteriores y canceladas" = el resto, por `starts_at` descendente. Sin paginación (`ponytail:` techo = todas las reservas del cliente; paginar si pasa de unas decenas). Se muestran **todas** las reservas, incluidas `cancelled` que nunca se pagaron (checkout expirado). *(Default asumido, a confirmar en la aprobación: Q3.)*
- **D10. Insignia.** `StatusBadge` con `confirmed` / `pending` / `cancelled`; una `confirmed` ya realizada (`starts_at < now` o `departures.status = completed`) usa `neutral` con etiqueta "Realizada". `cancelled` con pago `refunded` agrega "Reembolsado" (texto, no otra insignia).
- **D11. Enlaces de la tarjeta.** `confirmed` → "Ver voucher" a `/confirmacion/<code>`; `pending` → "Ver estado" a `/confirmacion/<code>` (muestra "confirmando pago…"); `cancelled` → solo texto; todas → título enlaza a `/paquetes/<slug>`.
- **D12. Cancelación: acción de servidor + diálogo.** `cancelBookingAction(code)` valida con Zod (`^WY-\d{4}$`), `requireRole("customer")`, `getUserByClerkId`, llama a `cancelBooking`, y en éxito `revalidatePath("/mis-reservas")`, `revalidatePath("/confirmacion/<code>")` y `updateTag(CACHE_TAGS.departures)` (el cupo liberado). Devuelve `{ ok: true } | { ok: false; message }` (el contrato de `ConfirmActionDialog`). Los componentes no importan Stripe ni `lib/db`.
- **D13. `ConfirmActionDialog` se extiende, no se duplica.** Hoy tiene fijos "Eliminando…" y "Cancelar" (descartar). Se agregan props opcionales `pendingLabel` y `dismissLabel` con los valores actuales por defecto (los usos existentes no cambian). Aquí: `pendingLabel="Cancelando…"`, `dismissLabel="Mantener reserva"` (un botón "Cancelar" al lado de "Cancelar reserva" confunde).
- **D14. Copy propio (a aprobar).**
  - `h1`: "Mis reservas". Vacío: "Todavía no tienes reservas" + "Explorar paquetes" → `/paquetes`.
  - Con cancelación disponible: "Cancelación gratis hasta el <Jue 5 nov 2026> a las <hora>" (Lima).
  - Ventana cerrada (confirmada, próxima): "Ya no se puede cancelar gratis: faltan menos de 48 horas para la salida." + "Escríbenos por WhatsApp" (mensaje `Hola Wayra, necesito ayuda con mi reserva <code>.`, `buildWhatsAppUrl`; sin número válido, solo el texto).
  - Diálogo: título "¿Cancelar la reserva <code>?"; texto "Es gratis. Te devolveremos US$ <monto> a la tarjeta con la que pagaste; tu banco puede tardar unos días en mostrarlo. Esta acción no se puede deshacer."; confirmar "Sí, cancelar reserva".
  - Errores: `too_late` "Ya no se puede cancelar gratis esta reserva."; `not_cancellable` "Esta reserva no se puede cancelar."; `not_found` "No encontramos esta reserva."; `no_refundable_payment` "No pudimos encontrar el pago para reembolsarlo. Escríbenos y lo resolvemos."; `refund_failed` "No pudimos procesar el reembolso. No se canceló nada; intenta de nuevo en unos minutos."; `unauthenticated` "Tu sesión venció. Recarga la página."; `unexpected` "Algo salió mal. Intenta de nuevo."

## Reuse
- Reuse: `components/shared/status-badge.tsx` (`StatusBadge`: confirmed/pending/cancelled/neutral, ya existe); `components/shared/confirm-action-dialog.tsx` (diálogo con `onConfirm → {ok}|{ok:false,message}`); `components/ui/{button,alert,alert-dialog}`; `components/shared/section-heading.tsx` si encaja; `lucide-react`; `next/image`, `next/link`.
- Reuse: `lib/auth/require-role.ts` (`requireRole`, `AuthError`); `modules/users` `getUserByClerkId`; `lib/db` (`bookings`, `departures`, `packages`, `destinations`, `payments`); `lib/stripe.ts` `getStripe`; `lib/money.ts` `formatPen` / `formatUsd`; `lib/whatsapp.ts` `buildWhatsAppUrl`; `lib/cache-tags.ts` `CACHE_TAGS.departures`.
- Reuse: `modules/packages` — `formatDepartureShortDate`, `formatDepartureTime`, `formatDuration` (vía `index.ts`).
- Reuse: patrón de `ConfirmationPage` (`<Suspense>` + `requireRole` → `getUserByClerkId` → servicio; `AuthError`/null → `notFound()`/vacío), `voucher-service.ts` (query con `customer_id` en el WHERE, últimos pagos), y los tests `describe.skipIf(!process.env.DATABASE_URL)` + `await import()`.
- Reuse: patrón de transacción + `refunds.create` con `idempotencyKey` de `stripe-webhook-service.ts` (`refund-no-seat:`). Sus helpers (`lockBooking`, `markPaymentRefundedInFull`…) son internos de `payments` (ARCHITECTURE §1.6): **no se importan**; la transacción de D3 usa Drizzle directo, como ya hace `voucher-service` con `payments`.
- Extend: `components/shared/confirm-action-dialog.tsx` (D13); `modules/payments/index.ts` y `modules/bookings/index.ts` (exports).
- Sin dependencias nuevas ni `shadcn add` (`alert-dialog` ya está). Sin migraciones: `bookings.cancelled_at`, `payments.refunded_cents` y el enum `refunded` ya existen.
- New (por qué no alcanza lo existente): `refundPaymentIntent` (el webhook inlinea `refunds.create` dentro de su caso; hace falta un export público de `payments` sin exponer sus internos); `cancelBooking` (el único cancelador existente, `cancelPendingBooking`, solo pasa `pending → cancelled` sin pago ni cupo); `getMyBookings` (`getBookingVoucher` trae una reserva con viajeros y documentos; la lista necesita otro DTO liviano, sin documentos); tarjeta, botón y página (no hay equivalentes).

## Acceptance criteria
*(auto)* = `npm test` / comando con mocks; *(db)* = `npm run test:db` (omitido sin `DATABASE_URL`); *(visual)* = Playwright a 390 px y 1280 px con base sembrada y claves de prueba.

### Piezas compartidas
- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde al cierre de cada fase. `build` no falla sin `STRIPE_*` (la ruta es dinámica y todo va en `<Suspense>`). `package.json` y `lib/db/migrations` sin cambios.
- AC2 *(auto)*: `cancelBlock({ status, departureStatus, startsAt }, now)`: `confirmed` + `scheduled` + `startsAt − now` = 48 h exactas → `null`; 48 h − 1 ms → `"too_late"`; 49 h → `null`; salida pasada → `"too_late"`; `status = pending` → `"not_cancellable"`; `status = cancelled` → `"not_cancellable"`; `departureStatus ∈ {en_route, completed, cancelled}` → `"not_cancellable"`. `freeCancelDeadline(startsAt)` = `startsAt − 48 h`.
- AC3 *(auto)*: `refundPaymentIntent("pi_x", "refund-cancel:p1")` llama `refunds.create({ payment_intent: "pi_x" }, { idempotencyKey: "refund-cancel:p1" })` sin `amount` y devuelve `{ alreadyRefunded: false }`; si Stripe lanza un error con `code === "charge_already_refunded"` devuelve `{ alreadyRefunded: true }`; cualquier otro error se relanza; el módulo no importa `stripe` (solo `@/lib/stripe`).
- AC4 *(auto)*: `cancelErrorMessage(code)` devuelve el copy D14 para cada `CancelErrorCode` (tabla completa, sin `undefined`).
- AC5 *(auto)*: `toMyBookingDto(row, payment, now)` conserva campos del contrato; `canCancel` = `cancelBlock(...) === null`; `freeCancelUntil = startsAt − 48 h`; `refundableUsdCents` = monto solo si el último pago es `succeeded`, si no `null`; no incluye `customerId`, `contactEmail`, `contactPhone` ni documentos. `partitionMyBookings(list, now)` respeta D9 (próximas ascendentes; resto descendentes; una `confirmed` cuya salida es `now` exacto cae en "próximas": D9, `startsAt >= now`; resuelto por el usuario el 2026-10-28, gana D9 sobre la redacción anterior de AC5).

### Cancelación (servicio y acción)
- AC6 *(db)*: reserva `confirmed`, salida a +72 h, pago `succeeded` con `pi_…`, `refundPaymentIntent` mockeado → `{ ok: true, alreadyCancelled: false, refundedUsdCents: amount }`; después: `bookings.status='cancelled'` y `cancelled_at` no nulo; `departures.booked_seats` bajó `pax`; `payments.status='refunded'` y `refunded_cents = amount_cents`; `refundPaymentIntent` llamado **una vez** con `("pi_…", "refund-cancel:<payment.id>")`.
- AC7 *(db)*: segunda llamada igual → `{ ok: true, alreadyCancelled: true }` sin nueva llamada a Stripe, cupo sin cambios adicionales. Dos llamadas en paralelo (`Promise.all`) → un solo reembolso y un solo descuento de cupo.
- AC8 *(db)*: salida a +47 h 59 min → `{ ok: false, code: "too_late" }` y **nada** cambia (reserva, cupo, pago, sin llamada a Stripe); a +48 h exactas con `now` inyectado → `ok`.
- AC9 *(db)*: reserva ajena (otro `customerId`, incluido un admin con otro id) e inexistente / código mal formado → el mismo `{ ok: false, code: "not_found" }`, sin escrituras ni Stripe.
- AC10 *(db)*: `pending` → `not_cancellable`; salida `cancelled`/`completed`/`en_route` → `not_cancellable`; `confirmed` sin pago, con pago `pending`/`failed`/`partially_refunded`, o sin `stripe_payment_intent_id` → `no_refundable_payment`; en todos, sin escrituras.
- AC11 *(db)*: `refundPaymentIntent` mockeado para lanzar → `{ ok: false, code: "refund_failed" }` y **rollback total**: reserva `confirmed`, `booked_seats` y pago `succeeded` intactos; un reintento posterior con Stripe ok cancela.
- AC12 *(db)*: pago ya `refunded` (webhook ganó la carrera) con reserva `confirmed` → cancela y libera el cupo **sin** llamar a Stripe. `alreadyRefunded: true` de Stripe → cancela normal.
- AC13 *(auto)*: `charge.refunded` posterior al reembolso de D3: ejecutar `handleStripeEvent` con un payment ya `refunded`/`refunded_cents = amount` no hace `UPDATE` (cubierto por el test existente de no-op; este AC exige que ese test siga en verde y que `stripe-webhook-*` no tenga cambios en el diff).
- AC14 *(auto)*: `cancelBookingAction`: código con formato inválido → `{ ok:false, message }` sin llamar al servicio; sin sesión (`AuthError`) → `unauthenticated`; sin usuario en `users` → `unauthenticated`; éxito → llama `revalidatePath("/mis-reservas")`, `revalidatePath("/confirmacion/WY-4822")` y `updateTag("departures")` y devuelve `{ ok: true }`; resultado `alreadyCancelled` → `{ ok: true }` y también revalida; `ok:false` del servicio → `message = cancelErrorMessage(code)`, sin revalidar; excepción inesperada → `unexpected` y log sin datos personales (solo el código de reserva).

### Lista
- AC15 *(db)*: `getMyBookings(customerId)` devuelve solo las reservas de ese cliente, con paquete (`slug`, `title`, `coverImageUrl`, `destinationName`), `startsAt`, `departureStatus`, `paxCount`, `totalCents`, `status`, `paymentStatus` (último pago por `created_at`) y `refundableUsdCents`; cliente sin reservas → `[]`; sin pagos → `paymentStatus: null`; dos consultas (reservas + pagos de esos ids), sin N+1; sin escrituras ni caché.

### UI
- AC16 *(visual)*: `/mis-reservas` con varias reservas sembradas: `h1` "Mis reservas"; secciones "Próximas" y "Anteriores y canceladas" según D9; cada tarjeta con foto (o `bg-sand`), "<Destino>", título (enlace a `/paquetes/<slug>`), código `WY-####`, fecha `Jue 5 nov 2026` + hora, "Viajeros" (n), total `S/ …`, `StatusBadge` correcto por estado (D10), enlace D11. Sin datos personales de viajeros.
- AC17 *(visual)*: reserva `confirmed` con >48 h: "Cancelación gratis hasta el …" y botón "Cancelar reserva"; abre el diálogo D14 con el monto en USD; "Mantener reserva" cierra sin cambios; confirmar muestra "Cancelando…", y al terminar la tarjeta pasa a `cancelled` + "Reembolsado" sin recargar a mano (cambia de sección). Con <48 h: sin botón, aviso D14 (+ WhatsApp si hay número). `pending` / `cancelled`: sin botón.
- AC18 *(visual)*: error del servidor (p. ej. Stripe caído) → el diálogo queda abierto con el mensaje de D14 en un `Alert` y se puede reintentar; el estado de la reserva no cambia.
- AC19 *(visual)*: estado vacío con CTA "Explorar paquetes"; sin sesión → el proxy redirige a ingresar; un cliente nunca ve reservas de otro; `/confirmacion/<code>` de una cancelada muestra "Te reembolsamos el pago.".
- AC20 *(visual)*: 390 px y 1280 px sin scroll horizontal; objetivos táctiles ≥ 44 px; foco visible; diálogo operable con teclado (Esc cierra, foco atrapado); un `h1`; contraste AA; con `prefers-reduced-motion` sin animaciones nuevas.
- AC21 *(visual, Stripe test)*: recorrido real: pagar en `/pago` con `4242…` → `/mis-reservas` → Cancelar → en el dashboard de Stripe (modo prueba) aparece **un** reembolso por el total del cobro; `stripe listen` entrega `charge.refunded` y la base no cambia (sin errores en logs del webhook); un segundo clic / recarga no genera otro reembolso.

### Arquitectura
- AC22 *(auto)*: revisión/`grep`: (a) `"use client"` solo en `cancel-booking-button.tsx` (y `confirm-action-dialog.tsx`, que ya lo tiene); (b) `page.tsx` delgada; (c) sin `"use cache"` en lo nuevo; (d) `bookings` importa de `@/modules/payments` y `@/modules/packages` solo por su `index.ts`, y nadie importa de `payments/services/stripe-webhook-repository`; (e) solo `payments/services/refund-service.ts` y `lib/stripe.ts` llaman a la API de Stripe (ningún `from "stripe"` nuevo); (f) `proxy.ts`, `stripe-webhook-*`, `lib/db/schema` y `package.json` sin cambios; (g) ningún `console.*` imprime correo, teléfono o documento; (h) `ConfirmActionDialog` conserva su comportamiento por defecto en `guide-manager.tsx` y `package-row-actions.tsx`.

## Contracts

### URL
```
/mis-reservas                 (customer; lista propia)
```

### `modules/payments` (extiende)
```ts
// services/refund-service.ts
// Reembolso total del cobro. Idempotente por `idempotencyKey`; `charge_already_refunded` = éxito.
export async function refundPaymentIntent(
  paymentIntentId: string,
  idempotencyKey: string,
): Promise<{ alreadyRefunded: boolean }>;
// index.ts (agrega): export { refundPaymentIntent } from "./services/refund-service";
```

### `modules/bookings` (extiende)
```ts
// utils/cancellation.ts (puras; no importan lib/db)
export const FREE_CANCELLATION_HOURS = 48;
export function freeCancelDeadline(startsAt: Date): Date; // startsAt − 48 h
export type CancelBlock = "not_cancellable" | "too_late";
export function cancelBlock(
  i: { status: BookingStatus; departureStatus: DepartureStatus; startsAt: Date },
  now: Date,
): CancelBlock | null; // D2, D7
export function cancelErrorMessage(code: CancelErrorCode): string; // D14

// types/cancellation.ts
export type CancelErrorCode =
  | "not_found" | "not_cancellable" | "too_late"
  | "no_refundable_payment" | "refund_failed";
export type CancelResult =
  | { ok: true; alreadyCancelled: boolean; refundedUsdCents: number } // 0 si alreadyCancelled
  | { ok: false; code: CancelErrorCode };

// services/cancellation-service.ts (escritura, sin caché). D3, D4, D6, D7, D8.
// Inválido el formato del código → not_found sin consultar (isBookingCode).
export async function cancelBooking(
  code: string,
  customerId: string,
  now?: Date, // inyectable para tests; por defecto new Date()
): Promise<CancelResult>;

// actions/cancel-booking-action.ts  ("use server")
// Zod: z.string().regex(BOOKING_CODE_PATTERN). Devuelve el contrato de ConfirmActionDialog.
export async function cancelBookingAction(
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }>;

// types/my-bookings.ts
export type MyBookingDto = {
  id: string;
  code: string;                       // WY-####
  status: BookingStatus;              // pending | confirmed | cancelled
  paxCount: number;
  totalCents: number;                 // PEN
  startsAt: Date;
  departureStatus: DepartureStatus;
  package: { slug: string; title: string; coverImageUrl: string | null; destinationName: string };
  paymentStatus: PaymentStatus | null; // último payment
  refundableUsdCents: number | null;   // amount_cents si el último pago es `succeeded`, si no null
  freeCancelUntil: Date;               // startsAt − 48 h
  canCancel: boolean;                  // cancelBlock(...) === null
};

// utils/my-bookings.ts (puras)
export function toMyBookingDto(row: MyBookingRow, payment: { status: PaymentStatus; amountCents: number } | null, now: Date): MyBookingDto;
export function partitionMyBookings(list: MyBookingDto[], now: Date): { upcoming: MyBookingDto[]; past: MyBookingDto[] }; // D9

// services/my-bookings-service.ts (solo lectura, sin caché)
// 1) SELECT bookings JOIN departures JOIN packages JOIN destinations WHERE customer_id = $customerId.
// 2) SELECT payments WHERE booking_id IN (...) ORDER BY created_at DESC; el primero por reserva.
export async function getMyBookings(customerId: string, now?: Date): Promise<MyBookingDto[]>;

// components/my-bookings-page.tsx  (Server Component)
// <Suspense fallback>; dentro: requireRole("customer") (AuthError → notFound()),
// getUserByClerkId (null → notFound()), getMyBookings, partition, render.
export function MyBookingsPage(): JSX.Element;
// components/my-booking-card.tsx    (presentacional; recibe MyBookingDto)
export function MyBookingCard({ booking }: { booking: MyBookingDto }): JSX.Element;
// components/cancel-booking-button.tsx ("use client"): ConfirmActionDialog + cancelBookingAction
export function CancelBookingButton(props: { code: string; refundableUsdCents: number | null }): JSX.Element;

// index.ts (agrega)
export { MyBookingsPage } from "./components/my-bookings-page";
export type { MyBookingDto } from "./types/my-bookings";
```

### `components/shared/confirm-action-dialog.tsx` (extiende, D13)
```ts
type ConfirmActionDialogProps = {
  /* …las actuales… */
  pendingLabel?: string; // default "Eliminando…"
  dismissLabel?: string; // default "Cancelar"
};
```

### Ruta
```tsx
// app/(customer)/mis-reservas/page.tsx
export const metadata = { title: "Mis reservas", robots: { index: false } };
export default function Page() { return <MyBookingsPage />; }
```

## Edge cases
- Doble clic / dos pestañas: el `FOR UPDATE` serializa; la segunda ve `cancelled` → éxito idempotente (AC7), un solo reembolso.
- Fallo de red tras crear el reembolso en Stripe pero antes del commit: rollback; el reintento reusa `idempotencyKey` y recibe el mismo reembolso (D4a). Pasadas 24 h, `charge_already_refunded` = éxito (D4b).
- `charge.refunded` llega antes del commit: ver D5 (mismo valor final) y D6 (rama `refunded` sin Stripe).
- Salida en 47 h 59 min mientras el cliente tiene el diálogo abierto desde hace rato: gana el servidor (`too_late`), el diálogo muestra el mensaje.
- Reserva `confirmed` sin pago real (datos sembrados): `no_refundable_payment`; no se cancela. Para probar en local hay que crearla pagando en Stripe test o sembrar un `payments` con `pi_…` de prueba.
- Salida cancelada por el operador con clientes confirmados: fuera de alcance (necesita reembolso sin ventana de 48 h; spec del panel del operador).
- Reserva `confirmed` cuya salida ya pasó: se lista como "Realizada", sin botón, sin aviso de WhatsApp.
- `STRIPE_SECRET_KEY` ausente: `getStripe()` lanza dentro de la transacción → `refund_failed`, rollback.
- `partially_refunded` (reembolso parcial hecho a mano en el dashboard): `no_refundable_payment`; lo resuelve soporte.
- Cupo ya liberado por datos inconsistentes (`booked_seats < pax`): `GREATEST(…, 0)` evita abortar la cancelación.

## Tests
- `modules/bookings/utils/cancellation.test.ts` — AC2, AC4 (frontera 48 h exacta / −1 ms, estados, tabla de mensajes).
- `modules/payments/services/refund-service.test.ts` — AC3 (mock de `getStripe`: llamada exacta, `charge_already_refunded`, otro error relanzado).
- `modules/bookings/utils/my-bookings.test.ts` — AC5 (mapper, `refundableUsdCents`, partición y orden, frontera `now`).
- `modules/bookings/services/cancellation-service.test.ts` *(db, `describe.skipIf`)* — AC6–AC12 (mock de `@/modules/payments`; fixtures con ids propios y `cleanup()` como `voucher-service.test.ts`; paralelo con `Promise.all`; rollback con mock que lanza).
- `modules/bookings/actions/cancel-booking-action.test.ts` — AC14 (mocks de `requireRole`, `getUserByClerkId`, `cancelBooking`, `next/cache`).
- `modules/bookings/services/my-bookings-service.test.ts` *(db)* — AC15.
- Existente sin cambios: `modules/payments/services/stripe-webhook-service.test.ts` — AC13.
- Sin tests de markup (SETUP §3); AC16–AC21 son verificación visual/E2E con la skill `revisar` (Playwright), en el hilo principal: ni `developer` ni `reviewer` tienen navegador.

## Plan

### Phase 1 — Cancelación con reembolso (backend, sin UI; la app sigue igual)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup + payments: `refundPaymentIntent` y su export | modules/payments/services/refund-service.ts, modules/payments/services/refund-service.test.ts, modules/payments/index.ts | - | A | AC3 | done |
| T2 | reglas puras de cancelación: `FREE_CANCELLATION_HOURS`, `freeCancelDeadline`, `cancelBlock`, `cancelErrorMessage` + tipos `CancelErrorCode`/`CancelResult` | modules/bookings/utils/cancellation.ts, modules/bookings/utils/cancellation.test.ts, modules/bookings/types/cancellation.ts | - | A | AC2, AC4 | done |
| T3 | servicio transaccional `cancelBooking` (D3–D8) | modules/bookings/services/cancellation-service.ts, modules/bookings/services/cancellation-service.test.ts | T1, T2 | B | AC6–AC12 | done |
| T4 | Server Action `cancelBookingAction` | modules/bookings/actions/cancel-booking-action.ts, modules/bookings/actions/cancel-booking-action.test.ts | T2, T3 | C | AC14 | done |

Cierre de fase: `tsc` + `lint` + `test` + `build`; `npm run test:db` con `DATABASE_URL`; `git diff` sin cambios en `stripe-webhook-*` (AC13).

### Phase 2 — Lista /mis-reservas y botón de cancelar
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | setup: `ConfirmActionDialog` con `pendingLabel` / `dismissLabel` opcionales (defaults actuales) | components/shared/confirm-action-dialog.tsx | - | A | AC22 (h) | done |
| T6 | DTO, mapper/partición y servicio de lectura `getMyBookings` | modules/bookings/types/my-bookings.ts, modules/bookings/utils/my-bookings.ts, modules/bookings/utils/my-bookings.test.ts, modules/bookings/services/my-bookings-service.ts, modules/bookings/services/my-bookings-service.test.ts | - | A | AC5, AC15 | done |
| T7 | UI: `MyBookingsPage`, `MyBookingCard`, `CancelBookingButton` (copy D14) | modules/bookings/components/my-bookings-page.tsx, modules/bookings/components/my-booking-card.tsx, modules/bookings/components/cancel-booking-button.tsx | T5, T6 | B | AC16–AC20 | done |
| T8 | ruta + exports públicos | app/(customer)/mis-reservas/page.tsx, modules/bookings/index.ts | T7 | C | AC1, AC21, AC22 | done |

Cierre de fase: gates + recorrido AC21 con Stripe test y `stripe listen`.

## Open questions
Ninguna abierta. Cerradas por el usuario: Q1, Q4, Q5, Q6 (ver Decisiones cerradas 5–8) y, en la aprobación del 2026-10-28:
- **Q2.** Cancelar reservas `pending` desde la lista: **no** (se resuelven solas al expirar la sesión, ≤ ~31 min).
- **Q3.** Ocultar las `cancelled` que nunca se pagaron: **no, se muestran todas** (D9).
