# Flujo de pago (/pago)

- Module: checkout (orquesta `bookings`, `payments`, `packages`, `users`; toca `offers` por el CTA)
- Status: approved
- Approved by: leandro291 (2026-10-25; re-aprobada tras D8/AC14: `allowed_payment_method_types`)
- Mode: SDD

## Goal
Tarjeta Trello 014 (pantalla 7 del diseño). Crear la ruta `/pago` (requiere sesión): datos del viajero principal, aceptación de términos y resumen con el total en soles y en USD. Una Server Action verifica cupo, crea el `booking` `pending` con su viajero, crea la Checkout Session de Stripe (alojada, solo tarjeta), registra el `payment` `pending` y redirige a Stripe. Además, el CTA de `/ofertas` pasa a enlazar a `/pago` con la oferta.

La spec vive en `docs/specs/checkout/` (no en `payments/`) porque el módulo principal es `checkout`; `payments` y `bookings` reciben piezas chicas y propias (sesión de Stripe, `payments` pending, `bookings`).

## Decisiones del usuario (cerradas, no se reabren)
1. Pago = Stripe Checkout alojado, solo tarjeta; sin selector de método ni campos de tarjeta propios; `method = card`.
2. Total en USD < `STRIPE_MIN_AMOUNT_USD_CENTS` (50, p. ej. oferta 100 %): se rechaza con mensaje, sin crear booking ni Session.
3. Oferta inválida o vencida (`PaymentAmountError offer_invalid`): se avisa "La oferta ya no está vigente" y se permite recalcular sin oferta.
4. `offerId` llega por `?oferta=<id>` (opcional). El CTA de `/ofertas` enlaza a `/pago` con `oferta` (contrato en D12).
5. Cupo: solo se verifica (`capacity − booked_seats ≥ pax`, salida `scheduled` y futura); no se reserva ni se descuenta (lo hace el webhook 015). Pueden coexistir varios `pending` por la misma plaza.
6. Reintento: `cancel_url` vuelve a `/pago` con los mismos params; cada envío crea un booking nuevo; la Session usa `expires_at` ≈ 30 min (los `pending` viejos los cancela 015 con `checkout.session.expired`).
7. `success_url` = `${NEXT_PUBLIC_APP_URL}/confirmacion?reserva=<code>`. La página `/confirmacion` es otra tarjeta: hasta entonces da 404 (transitorio, aceptado).
8. Solo viajero principal (`is_primary = true`); los demás se completan después.
9. `contact_email` / `contact_phone` → `bookings.contact_*`; correo precargado desde Clerk (espejo `users.email`). Términos → `terms_accepted_at = now()` del servidor.

## Scope
- In:
  - Ruta `app/(customer)/pago/page.tsx` (delgada) y `CheckoutPage` en `modules/checkout`: pasos, formulario "Viajero principal", bloque informativo de pago con Stripe, términos, resumen (soles y USD), estados de error (enlace inválido, salida no disponible, sin cupo, oferta vencida, total bajo el mínimo).
  - Server Action `startCheckout` + servicios `getCheckoutQuote` / `createCheckout` (orquestación con compensación), schema Zod v4, utils puras.
  - `modules/bookings` (nuevo): `createPendingBooking` (verifica cupo, inserta booking + viajero en una transacción) y `cancelPendingBooking` (compensación).
  - `modules/payments`: `createCheckoutSession`, `expireCheckoutSession`, `createPendingPayment`, parámetros puros de la Session.
  - `modules/packages`: `getBookableDeparture` (sin caché), `buildCheckoutHref` con `oferta`.
  - `modules/users`: `getUserByClerkId`.
  - `modules/offers`: `package.id` en el DTO, hrefs a `/pago` y uso en hero y tarjetas.
  - `formatUsd` en `lib/money.ts`; `NEXT_PUBLIC_APP_URL` en `.env.example`; shadcn `checkbox` y `alert`.
- Out:
  - Webhook de Stripe y descuento de cupo (015), página `/confirmacion` (y su control de dueño de la reserva), cancelación/reembolso, otros métodos de pago.
  - Viajeros adicionales, cuenta de invitado, cupones, páginas de términos y política de cancelación.
  - Limpieza de `pending` huérfanos (ver Q5), ampliar la secuencia `booking_code_seq` (ver Q6), invalidación de caché (no cambia `booked_seats`).
  - Cambios de schema/migraciones y dependencias nuevas.

## Decisiones a aprobar
- **D1. Una Server Action; el contexto viaja en campos ocultos y se re-deriva.** El `<form>` envía `salida`, `viajeros` y (si aplica) `oferta` como `hidden`, más los campos del usuario. Nada de eso es de confianza: se valida con Zod y el servidor recalcula todo desde la DB. El cliente no manda precio, descuento, total, `packageId` ni `customerId` (el `customerId` sale del token de Clerk → `users.id`).
- **D2. El paquete se deriva de la salida.** No existe `paquete` en la URL ni en el form: `departures.package_id` es la fuente, así que el desajuste salida/paquete no puede ocurrir. La oferta que no pertenece a ese paquete cae en `offer_invalid` (013).
- **D3. `getCheckoutQuote` único para página y acción.** Resuelve salida + paquete + cupo + monto (`getBookingAmount`) y devuelve banderas `offerExpired` y `belowMinimum`. La página lo usa para pintar; la acción lo vuelve a llamar (precio y cupo del servidor, nunca los vistos por el cliente).
- **D4. Orden de la acción y compensación.**
  1. `requireRole("customer")` → 2. parseo Zod → 3. config (`getStripe()` y `getAppUrl()`) → 4. usuario por `clerkId` → 5. `getCheckoutQuote` (rechaza `offerExpired`, `belowMinimum`, sin cupo) → 6. `createPendingBooking` (re-verifica cupo y escribe) → 7. `createCheckoutSession` → 8. `createPendingPayment` → 9. `redirect(session.url)`.
  Los pasos 1–5 no escriben nada. Si falla el 7, se cancela el booking (`cancelPendingBooking`). Si falla el 8 (la Session ya existe), se expira la Session (best-effort) y se cancela el booking. Si la propia compensación falla, la acción igual devuelve el error y registra el código de reserva (Q5). `redirect` va **fuera** de `try/catch` (lanza `NEXT_REDIRECT`).
- **D5. Config se valida antes de escribir.** `getStripe()` (clave) y `getAppUrl()` (`NEXT_PUBLIC_APP_URL`) se evalúan en el paso 3, para no dejar un booking huérfano por una variable faltante. `PEN_PER_USD` inválido lo detecta el paso 5 (`invalid_exchange_rate`). Los tres terminan en `payments_unavailable` ("No pudimos iniciar el pago…"); el detalle va a `console.error` sin secretos ni datos personales.
- **D6. Cupo verificado dos veces, sin reservar.** `getCheckoutQuote` lo usa para avisar temprano; `createPendingBooking` lo vuelve a leer justo antes de insertar (fuente: `getBookableDeparture`, un solo predicado: `scheduled`, `starts_at > now()`, paquete `published`, sin caché). No hay `FOR UPDATE` ni descuento: el cupo real lo garantiza el `UPDATE … WHERE booked_seats + :pax <= capacity` de 015 (ERM, Reglas de datos).
- **D7. Booking + viajero en una transacción** (`db.transaction`; el driver Pool de Neon la soporta, ya se usa en el seed). Si el insert del viajero falla, no queda booking. `code` lo genera la secuencia (`WY-####`); `terms_accepted_at = now()` de la DB; `currency = PEN`; el snapshot (`unit_price_cents`, `discount_cents`, `total_cents`, `exchange_rate`, `offer_id`) sale tal cual de `BookingAmount`.
- **D8. Sesión de Stripe.** `mode: "payment"`, `allowed_payment_method_types: ["card"]` (el SDK v23 quitó `payment_method_types` de los params de create), **un solo** `line_item` (`quantity 1`, `currency: "usd"`, `unit_amount = amountUsdCents`, nombre "<título> · N viajero(s)"): el total cobrado coincide al centavo con `payments.amount_cents` y no hay redondeos por línea. `customer_email` = correo de contacto, `client_reference_id = booking.id`, `metadata { booking_id, booking_code }` (015 reconcilia con eso), `locale: "es"`. `expires_at = ahora + 31 min`: Stripe exige entre 30 min y 24 h desde la creación (verificado en `stripe/cjs/resources/Checkout/Sessions.d.ts`), y 30 exactos pueden caer bajo el mínimo por latencia. `idempotencyKey = "checkout-session:<booking.id>"`.
- **D9. URLs de retorno.** `success_url = ${appUrl}/confirmacion?reserva=<code>`; `cancel_url = ${appUrl}` + `buildCheckoutHref(salida, viajeros, oferta?)` (la oferta solo si estaba vigente). `getAppUrl()` lee `NEXT_PUBLIC_APP_URL` en cada llamada, exige `http(s)` válido y devuelve el origen sin barra final; sin valor → error (no hay fallback; ver Q3). Si la tarjeta de confirmación elige `/confirmacion/[code]` (ARCHITECTURE §4 lo lista así), cambia solo `buildSuccessUrl`.
- **D10. Datos del viajero y contacto.**
  - `firstName` / `lastName`: letras Unicode, espacios, `'`, `.` y `-`, 1–60 caracteres, espacios colapsados.
  - `email`: `z.email()`, minúsculas, ≤ 254. Se precarga de `users.email`; se puede editar (es el contacto de la reserva).
  - `phone`: se quitan espacios, guiones y paréntesis; queda `+?` y 7–15 dígitos (placeholder `+51 9XX XXX XXX`).
  - `docType`: `dni | passport | foreign_id` (enum `doc_type`). `docNumber` en mayúsculas sin espacios ni guiones: DNI `^\d{8}$`; pasaporte y carné de extranjería `^[A-Z0-9]{6,12}$` (Q4).
  - Términos: checkbox obligatorio (`terms`); el servidor fija `terms_accepted_at`.
- **D11. Tope de viajeros = 20** (igual que `parseDetailParams`), validado en el schema. Con eso `total_cents` ≤ 20 × `price_cents` cabe en `int4`; un `pax` enorme se rechaza antes de tocar la DB. No se valida `max_group_size` (el cupo de la salida es el límite real; *ponytail: si el operador necesita tope por grupo, agregarlo en `getBookableDeparture`*).
- **D12. Contrato del CTA de `/ofertas` (decisión 4).** Hoy la tarjeta y el CTA del hero "Aprovechar oferta" enlazan a `/paquetes/<slug>` sin salida ni viajeros, y `/pago` exige `salida`. Contrato mínimo: `getOfferHrefs(offers)` devuelve, por oferta, `buildCheckoutHref(salida, viajeros, offer.id)` donde
  - `viajeros` = `two_for_one` → 2; `percent` con `min_people` → `min_people` (tope 20; así la oferta sí aplica); `percent` sin mínimo → 2 (igual que el panel de reserva);
  - `salida` = la primera salida próxima (`getDepartures`, caché `minutes`) con `seatsLeft ≥ viajeros`;
  - sin ninguna salida con cupo → `/paquetes/<slug>` (como hoy).
  Aplica al CTA del hero **y** a las tarjetas (Q1). En `/pago` el viajero puede volver a elegir salida/viajeros con "Cambiar salida o viajeros" (link al detalle del paquete).
- **D13. Roles.** `requireRole("customer")` acepta `customer` y superiores (ARCHITECTURE §4): un `organizer` o `admin` puede reservar. Sin sesión o con sesión vencida, la acción devuelve `unauthenticated` (el proxy ya intercepta antes; esto es defensa en profundidad) y la UI ofrece recargar `/pago` (el proxy redirige a ingresar y vuelve con `returnBackUrl`).
- **D14. Sin caché.** Nada de `"use cache"` en `checkout`, `bookings` ni en los servicios nuevos de `payments`/`packages`: cupo, monto y sesión se evalúan en cada llamada (SYSTEM-DESIGN: reservas y pagos son dinámicos). `/pago` lee `searchParams` y la sesión dentro de `<Suspense>`; encabezado y pasos quedan en el shell estático.
- **D15. Desvíos del diseño (veracidad y accesibilidad, DESIGN-SYSTEM "Fidelidad" 5 y 6).**
  - Sin "Método de pago" con Yape/Plin/PagoEfectivo ni campos de tarjeta: bloque informativo "Pagarás con tarjeta en la página segura de Stripe".
  - Botón "Pagar US$ 688.00" (no S/): se cobra en USD; el resumen muestra el total en soles, el total en USD y el tipo de cambio antes del botón (DESIGN-SYSTEM, Dinero).
  - "Impuestos y tasas: Incluidos" y "Voucher por correo y WhatsApp" se omiten (no hay dato ni envío en v1); el voucher va en la confirmación.
  - "2 adultos" → "2 viajeros" (el modelo no distingue edades). Fecha de salida con hora en Lima (`formatDepartureDate` + `formatDepartureTime`), sin año.
  - Términos y política de cancelación sin enlace (no existen las páginas; sin enlaces muertos) — Q2.
  - Se mantiene el encabezado/pie del layout `(customer)` en vez del encabezado propio del tablero ("Pago seguro y cifrado").
  - Se agrega "Cambiar salida o viajeros" y el aviso de oferta vencida.
- **D16. Mensajes de error genéricos hacia afuera.** La acción devuelve solo `code` + mensaje en español (catálogo en `checkout-labels.ts`); nunca excepciones, mensajes de Stripe/Postgres ni el documento del viajero. Los logs llevan el código de reserva y el `code`, sin correo, teléfono ni documento.

## Reuse
- Reuse: `modules/payments` — `getBookingAmount`, `PaymentAmountError`, `STRIPE_MIN_AMOUNT_USD_CENTS`, tipo `BookingAmount` (013): única fuente del monto; `lib/stripe.ts` `getStripe()`.
- Reuse: `lib/auth/require-role.ts` (`requireRole`, `AuthError`), `proxy.ts` (ya protege `/pago` y `/confirmacion`), `lib/db` (`bookings`, `bookingTravelers`, `payments`, `departures`, `users`, `packages`, `destinations`), `lib/money.ts` `formatPen`.
- Reuse: `modules/packages` — `getDepartures` (CTA de ofertas), `isPublished`, `seatsLeft`, `formatDepartureDate`/`formatDepartureTime`, `buildCheckoutHref` (ya lo usa el panel de reserva).
- Reuse: patrón de `modules/newsletter` (acción con Zod en el borde, `useActionState`, inputs que conservan lo escrito, mensajes genéricos), `components/ui/{button,input,label,field,native-select}`, tokens de `globals.css` (`rounded-card`, `shadow-raised`, `bg-sand`, `font-display`, `text-ink-muted`), `lucide-react`, `next/image`, `next/link`.
- Reuse (tests): `lib/db/seed` (usuario `seed_customer_01`, paquete `machu-picchu-magico`, `seedId`) como datos; patrón `describe.skipIf(!process.env.DATABASE_URL)` + `await import()` y `vi.stubEnv`.
- Extend: `lib/money.ts` (`formatUsd`: el diseño pide `US$ 345.00` y no hay formateo de USD); `lib/stripe.ts` (solo exporta el tipo `CheckoutSessionParams`, para que `payments` no importe `"stripe"`; ARCHITECTURE §5); `modules/packages` (`buildCheckoutHref` con `oferta`, `getBookableDeparture`, exports); `modules/users` (`getUserByClerkId`); `modules/payments` (sesión y payment pending); `modules/offers` (`package.id` en el DTO, hrefs a `/pago`); `.env.example`.
- New: `modules/bookings/**` — módulo previsto en ARCHITECTURE sin código; `modules/checkout/**` — idem.
- New: `components/ui/checkbox.tsx` y `components/ui/alert.tsx` vía `npx shadcn@latest add checkbox alert` (existen en `@shadcn`; el checkbox de Base UI usa `name` y se envía con el form). Selector de documento: `NativeSelect` ya instalado (envía con el form, sin JS extra).
- No se reutiliza `parseDetailParams` de packages: se alcanza solo por el barrel, que arrastra `lib/db` (falla sin `DATABASE_URL` en tests puros; misma razón que 013 D10). `parseCheckoutParams` repite ~6 líneas de Zod.
- No se agrega dependencia: `stripe`, `zod`, `drizzle-orm`, `@clerk/nextjs` ya están.

## Acceptance criteria
*(auto)* = comando/test con mocks (`npm test`); *(db)* = integración con `DATABASE_URL` (`npm run test:db`); *(visual)* = Playwright a 390 px y 1280 px con la base sembrada y claves de prueba de Clerk/Stripe, comparando con `Checkout` / `Movil-Checkout`.

### Piezas compartidas
- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde al cierre de cada fase. `build` no falla sin `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` ni `PEN_PER_USD`; `/pago` no es ruta bloqueante (shell estático + contenido en `<Suspense>`). `package.json` no gana dependencias.
- AC2 *(auto)*: `formatUsd(cents)` → `US$ 345.00` para `34500`, `US$ 1 032.00` para `103200`, `US$ 0.50` para `50`, `US$ 0.05` para `5`, `US$ 0.00` para `0`; U+00A0 tras `US$`, U+202F como separador de miles, siempre 2 decimales.
- AC3 *(auto)*: `buildCheckoutHref(salida, viajeros)` sigue dando `/pago?salida=<id>&viajeros=<n>`; con `oferta` suma `&oferta=<id>` (orden `salida`, `viajeros`, `oferta`); `oferta` `undefined`, `null` o `""` se omite.
- AC4 *(auto)*: `parseCheckoutParams(raw)` devuelve `{ salida?, viajeros?, oferta? }`: `salida` y `oferta` solo uuid válidos; `viajeros` solo entero 1–20; arrays → primer valor; lo demás se descarta sin lanzar (`viajeros` `0`, `21`, `abc`, `2.5`; `salida` `zzz`).

### Validación
- AC5 *(auto)*: `checkoutSchema` acepta una entrada válida y devuelve normalizado: nombres sin espacios sobrantes, correo en minúsculas, teléfono `+51987654321` desde `+51 987-654 321`, `docNumber` `ab123456` → `AB123456`, `viajeros` número, `oferta` `""` → `undefined`.
- AC6 *(auto)*: rechaza con mensaje en español en el campo correcto: nombre/apellido vacío, con dígitos o de más de 60; correo inválido; teléfono con letras, de menos de 7 o más de 15 dígitos; DNI que no sea de 8 dígitos (`1234567`); pasaporte o carné de 5 o 13 caracteres, o con símbolos (el mismo `1234567` sí vale como pasaporte); `docType` desconocido; `terms` ausente ("Debes aceptar los términos y condiciones"); `salida` no uuid; `viajeros` `0`, `21`, `abc`, `1.5`. `parseCheckoutForm(formData)` marca `linkInvalid` cuando fallan `salida`/`viajeros`/`oferta` (campos ocultos) y no solo los del usuario.
- AC7 *(auto)*: campos extra (`total`, `precio`, `packageId`, `customerId`, `amountUsdCents`) no llegan a la salida del schema (se descartan).

### Datos
- AC8 *(db)*: `getBookableDeparture(id)` devuelve la salida con `seatsLeft = capacity − booked_seats` y el resumen del paquete (`id`, `slug`, `title`, `coverImageUrl`, `region`, `durationDays`, `nights`) si es `scheduled`, futura y de paquete `published`; `null` para pasada, `cancelled`, `en_route`, paquete `draft`, uuid inexistente y texto que no es uuid (sin lanzar). Llena → `seatsLeft: 0`. Las fixtures son relativas a `now()` (las fechas del seed caducan) y se borran en `afterAll`.
- AC9 *(db)*: `getUserByClerkId("seed_customer_01")` devuelve `{ id, email }` del usuario sembrado; un `clerkId` desconocido devuelve `null`.
- AC10 *(db)*: `createPendingBooking` crea **un** booking `pending` con `code` `WY-####`, `pax_count`, snapshot (`unit_price_cents`, `discount_cents`, `total_cents`, `exchange_rate`, `offer_id`) igual al `BookingAmount` recibido, `currency PEN`, `contact_email`/`contact_phone`, `terms_accepted_at` no nulo (≈ `now()` de la DB), `package_id` = el de la salida, y **un** viajero `is_primary = true` con nombres y documento. `departures.booked_seats` no cambia. Si el insert del viajero falla (docType inválido forzado), no queda fila de booking (rollback).
- AC11 *(db)*: sin cupo suficiente lanza `BookingError("insufficient_seats")` con `seatsLeft` (salida llena y `pax = seatsLeft + 1`); `pax = seatsLeft` se acepta; salida pasada, `cancelled`, de paquete `draft` o inexistente → `BookingError("departure_unavailable")`; en todos los rechazos no se inserta nada. Dos llamadas seguidas por la misma plaza crean dos `pending` (coexisten).
- AC12 *(db)*: `cancelPendingBooking(id)` pasa un `pending` a `cancelled` con `cancelled_at` y devuelve `true`; sobre uno `confirmed` o ya `cancelled` devuelve `false` y no lo cambia.
- AC13 *(db)*: `createPendingPayment` inserta `provider stripe`, `method card`, `status pending`, `amount_cents`, `currency USD`, `stripe_checkout_session_id`, `refunded_cents 0`; repetir el mismo `session id` lanza (unique).

### Stripe
- AC14 *(auto)*: `buildCheckoutSessionParams` produce `mode "payment"`, `allowed_payment_method_types ["card"]`, un solo `line_item` (`quantity 1`, `price_data.currency "usd"`, `unit_amount` = `amountUsdCents` entero, nombre con el título y "N viajero(s)"), `customer_email`, `client_reference_id` = `bookingId`, `metadata { booking_id, booking_code }`, `success_url`/`cancel_url` tal cual, `locale "es"` y `expires_at = nowSeconds + 31·60`.
- AC15 *(auto)*: `createCheckoutSession` (con `getStripe` mockeado) llama `checkout.sessions.create` una vez con esos params y `{ idempotencyKey: "checkout-session:<bookingId>" }`; devuelve `{ id, url }`; lanza si `url` es `null`; propaga el error de Stripe. `expireCheckoutSession(id)` llama `checkout.sessions.expire(id)` y no lanza si Stripe falla (registra el error sin datos personales).
- AC16 *(auto)*: `getAppUrl()` devuelve `https://wayra.example` para `"https://wayra.example/"` y `" https://wayra.example "`, y `http://localhost:3000` tal cual; ausente, vacío, `wayra.example` (sin esquema), `ftp://x` o texto basura lanzan `Error` en español que nombra `NEXT_PUBLIC_APP_URL`. Se lee en cada llamada (`vi.stubEnv`). `.env.example` documenta `NEXT_PUBLIC_APP_URL`.

### Orquestación (con mocks)
- AC17 *(auto)*: `getCheckoutQuote({ departureId, pax, offerId? })`: toma `packageId` de la salida y llama `getBookingAmount({ packageId, pax, offerId })` (sin precio, descuento ni total); salida `null` → `departure_unavailable`; `seatsLeft < pax` → `insufficient_seats` con `seatsLeft` y `packageSlug`, sin calcular monto; `offer_invalid` con oferta pedida → monto recalculado sin oferta y `offerExpired: true`; `belowMinimum` es `true` con `amountUsdCents` 49 o 0 y `false` con 50; `invalid_exchange_rate` → `payments_unavailable`; una oferta válida que no rebaja (`pax < min_people`) no marca `offerExpired`.
- AC18 *(auto)*: `createCheckout` feliz: orden config → usuario → quote → `createPendingBooking` → `createCheckoutSession` → `createPendingPayment`, y devuelve `{ ok: true, url }`. El booking recibe `customerId` del usuario de Clerk, `paxCount` y el `amount` del quote (nunca del input); la Session recibe `success_url` `${appUrl}/confirmacion?reserva=WY-4822`, `cancel_url` `${appUrl}/pago?salida=…&viajeros=…` (con `&oferta=` solo si estaba vigente), `amountUsdCents` del quote y el correo de contacto; el payment guarda `session.id` y `amountUsdCents`.
- AC19 *(auto)*: sin efectos (no se crea booking ni Session): config ausente (`getStripe` o `getAppUrl` lanzan) → `payments_unavailable`; usuario inexistente → `profile_missing`; salida no disponible / sin cupo → sus códigos; `offerExpired` → `offer_invalid`; `belowMinimum` → `below_minimum`. `BookingError` de `createPendingBooking` (carrera) → `departure_unavailable` / `insufficient_seats`.
- AC20 *(auto)*: compensación. `createCheckoutSession` lanza → `cancelPendingBooking(booking.id)` una vez, sin payment, `payments_unavailable`. `createPendingPayment` lanza → `expireCheckoutSession(session.id)` + `cancelPendingBooking`, `payments_unavailable`. Si la propia compensación lanza, `createCheckout` no lanza, devuelve el error y registra el código de reserva (sin correo, teléfono ni documento).
- AC21 *(auto)*: `startCheckout(prev, formData)`: llama `requireRole("customer")` antes de leer el form; `AuthError` → `{ status: "error", code: "unauthenticated" }` sin llamar al servicio; campos inválidos → `{ code: "invalid_input", fieldErrors, values }` (`values` repite los textos, no `terms`) sin llamar al servicio; salida/viajeros/oferta inválidos → `invalid_link`; válido → `createCheckout` una vez con el `userId` del token y los datos parseados; `{ ok: true, url }` → `redirect(url)` (la excepción `NEXT_REDIRECT` no se captura); `{ ok: false }` → estado de error con el mensaje del catálogo (el de cupo incluye el número); cualquier excepción inesperada → `unexpected` sin propagar. Campos de precio en el `FormData` no cambian lo que llega al servicio.

### UI
- AC22 *(visual)*: `/pago?salida=<id>&viajeros=2` (Machu Picchu Mágico) muestra, como el tablero y con los desvíos de D15: pasos (1 completado, 2 actual `aria-current="step"`, 3 pendiente), `h1` "Ya casi es tuyo." (`clamp(36px,5vw,58px)`), tarjeta "Viajero principal" (nombres, apellidos, correo, celular, documento, número) con la nota del DNI/pasaporte, bloque de pago con Stripe sin selector ni campos de tarjeta, checkbox de términos, y el resumen (foto, "Cusco · 4 días · 3 noches", título, Salida, "2 viajeros", `S/ 1 290 × 2`, `S/ 2 580`, "A cobrar US$ 688.00" con "1 US$ = S/ 3.75", botón "Pagar US$ 688.00", cancelación gratuita hasta 48 h, "Cambiar salida o viajeros"). Con oferta aparece la línea de descuento y el total ya rebajado. Las cifras coinciden con `getBookingAmount` para esa salida y `PEN_PER_USD`.
- AC23 *(visual)*: formulario. Etiquetas visibles; `autocomplete` `given-name`, `family-name`, `email`, `tel`; campos de 52 px y 16 px; correo precargado desde `users.email`; error por campo con `aria-invalid` + `aria-describedby` y foco al primero inválido; tras un error se conserva lo escrito; mientras envía el botón queda `disabled` ("Redirigiendo a Stripe…") y un doble clic no crea dos bookings; error global (cupo, sesión, Stripe) en un `Alert` con `role="alert"`.
- AC24 *(visual)*: estados, sin formulario salvo el último: enlace inválido o sin `salida`/`viajeros` ("Este enlace de reserva no es válido" + "Ver paquetes"); salida pasada/cancelada/paquete `draft`/inexistente ("Esta salida ya no está disponible"); sin cupo ("Solo quedan N cupos" o "Esta salida se agotó" + link al paquete); `payments_unavailable`; total < US$ 0.50 (aviso y botón `aria-disabled` sin enviar); oferta no vigente (aviso "La oferta ya no está vigente" con el precio sin oferta, el form omite `oferta`). Si la oferta vence entre la carga y el envío, la acción devuelve `offer_invalid` y el aviso incluye el link "Continuar sin oferta" a `/pago` sin `oferta`.
- AC25 *(visual)*: recorrido real con tarjeta de prueba `4242 4242 4242 4242`: enviar → `checkout.stripe.com` con total = `amountUsdCents`; en la DB queda 1 booking `pending`, 1 viajero primario y 1 payment `pending` con el `session id`; "volver" de Stripe regresa a `/pago` con los mismos params; pagar redirige a `/confirmacion?reserva=WY-…` (404 hasta que exista la tarjeta de confirmación; es lo esperado).
- AC26 *(visual)*: sin sesión, `/pago?…` redirige a ingresar y vuelve a `/pago` con los mismos params (proxy existente, sin cambios).
- AC27 *(visual)*: 390 px: una columna (resumen después del formulario o antes, como `Movil-Checkout`); 1280 px: dos columnas con resumen `sticky`. Sin scroll horizontal; objetivos ≥ 44 px; foco visible; sin animaciones con `prefers-reduced-motion`; contraste AA; un solo CTA `accent` por vista.

### Arquitectura
- AC28 *(auto)*: `grep`/revisión: (a) `"use client"` solo en `checkout-form.tsx` (más los de `components/ui` de shadcn); (b) ningún módulo importa internos de otro (solo `index.ts` o entradas puras), y `payments` no importa `"stripe"` (usa el tipo de `lib/stripe`); (c) `new Stripe(` / `from "stripe"` solo en `lib/stripe.ts` y su test; (d) los servicios nuevos no tienen `"use cache"`; (e) `/pago` no tiene selector de método ni campos de tarjeta; (f) `app/(customer)/pago/page.tsx` es delgada; (g) `package.json` sin dependencias nuevas.

### CTA de ofertas
- AC29 *(auto)*: `suggestedTravelers(terms)`: `two_for_one` → 2; `percent` con `min_people 4` → 4; `percent` sin mínimo → 2; `min_people 25` → 20. `pickDeparture(departures, travelers)` devuelve la primera con `seatsLeft ≥ travelers` o `null`.
- AC30 *(auto, `@/modules/packages` mockeado)*: `getOfferHrefs(offers)` devuelve `/pago?salida=<primera salida con cupo>&viajeros=<n>&oferta=<offerId>` por oferta; sin salidas o sin cupo suficiente → `/paquetes/<slug>`; `getDepartures` se llama una vez por `package.id` distinto.
- AC31 *(db)*: `getActiveOffers()` incluye `package.id` en cada ítem (`OfferDto`); el resto de los criterios de la spec de ofertas no cambia.
- AC32 *(visual)*: en `/ofertas`, el CTA "Aprovechar oferta" y las tarjetas enlazan a `/pago` con `oferta` (y a `/paquetes/<slug>` si no hay cupo); abrir una oferta `percent` o `two_for_one` muestra en `/pago` la línea de descuento y un total coherente con el precio de la tarjeta (mismo cálculo `calculateOffer`).

## Contracts

### URL
```
/pago?salida=<uuid>&viajeros=<1..20>[&oferta=<uuid>]
success_url: ${NEXT_PUBLIC_APP_URL}/confirmacion?reserva=WY-####
cancel_url:  ${NEXT_PUBLIC_APP_URL}/pago?salida=<uuid>&viajeros=<n>[&oferta=<uuid>]
```

### Entorno (`.env.example`)
```
# URL pública de la app: base de success_url y cancel_url de Stripe (local: http://localhost:3000)
NEXT_PUBLIC_APP_URL=
```
Usadas, ya existentes: `STRIPE_SECRET_KEY`, `PEN_PER_USD`, `DATABASE_URL`, claves de Clerk. `STRIPE_WEBHOOK_SECRET` queda para 015. `NEXT_PUBLIC_` se inlinea en el build: debe estar definida al construir.

### `lib/money.ts` y `lib/stripe.ts`
```ts
export function formatUsd(cents: number): string; // "US$ 1 032.00" (NBSP tras US$, NNBSP en miles, 2 decimales)

// lib/stripe.ts: solo se agrega el tipo; nadie más importa "stripe".
export type CheckoutSessionParams = Stripe.Checkout.SessionCreateParams;
```

### `modules/packages` (extiende)
```ts
// utils/package-detail.ts
export function buildCheckoutHref(departureId: string, travelers: number, offerId?: string | null): string;

// types/package.ts
export type BookableDepartureDto = {
  id: string;
  startsAt: Date;
  seatsLeft: number; // capacity − booked_seats, ≥ 0
  package: {
    id: string; slug: string; title: string; coverImageUrl: string | null;
    region: string; durationDays: number; nights: number;
  };
};

// services/departure-service.ts  (sin caché, D14)
// WHERE departures.id = $ AND status = 'scheduled' AND starts_at > now() AND packages.status = 'published'
export async function getBookableDeparture(departureId: string): Promise<BookableDepartureDto | null>;

// index.ts (agrega)
export { getBookableDeparture } from "./services/departure-service";
export { buildCheckoutHref, formatDepartureDate, formatDepartureTime } from "./utils/package-detail";
export type { BookableDepartureDto } from "./types/package";
```

### `modules/users` (extiende)
```ts
// services/user-service.ts
export async function getUserByClerkId(clerkId: string): Promise<{ id: string; email: string } | null>;
// index.ts: export { getUserByClerkId } from "./services/user-service";
```

### `modules/bookings`
```ts
// types/booking.ts
import type { BookingAmount } from "@/modules/payments";   // solo tipo
import type { docType } from "@/lib/db/schema/enums";

export type DocType = (typeof docType.enumValues)[number];

export type NewBookingInput = {
  customerId: string;           // users.id (del token de Clerk, nunca del cliente)
  departureId: string;
  paxCount: number;
  amount: BookingAmount;        // de getBookingAmount (snapshot)
  contact: { email: string; phone: string };
  traveler: { firstName: string; lastName: string; docType: DocType; docNumber: string };
};
export type CreatedBooking = { id: string; code: string };

export type BookingErrorCode = "departure_unavailable" | "insufficient_seats";
export class BookingError extends Error {
  readonly code: BookingErrorCode;
  readonly seatsLeft?: number;   // solo con insufficient_seats
  constructor(code: BookingErrorCode, seatsLeft?: number);
}

// services/booking-service.ts
// getBookableDeparture -> null: departure_unavailable; seatsLeft < paxCount: insufficient_seats.
// Luego db.transaction: INSERT bookings (status pending, package_id de la salida, terms_accepted_at = now()) + INSERT booking_travelers (is_primary true).
export async function createPendingBooking(input: NewBookingInput): Promise<CreatedBooking>;
// UPDATE bookings SET status='cancelled', cancelled_at=now() WHERE id=$ AND status='pending'. true si actualizó.
export async function cancelPendingBooking(bookingId: string): Promise<boolean>;

// index.ts
export { createPendingBooking, cancelPendingBooking } from "./services/booking-service";
export { BookingError } from "./types/booking";
export type { NewBookingInput, CreatedBooking, BookingErrorCode, DocType } from "./types/booking";
```

### `modules/payments` (extiende)
```ts
// utils/checkout-session.ts (puras)
import type { CheckoutSessionParams } from "@/lib/stripe";
export const CHECKOUT_SESSION_TTL_SECONDS = 31 * 60; // Stripe exige 30 min–24 h (D8)
export function buildCheckoutSessionParams(input: {
  bookingId: string; bookingCode: string;
  amountUsdCents: number;
  productName: string; productDescription?: string;
  customerEmail: string;
  successUrl: string; cancelUrl: string;
  nowSeconds: number;
}): CheckoutSessionParams;

// services/checkout-session-service.ts
export type CreateCheckoutSessionInput = Omit<Parameters<typeof buildCheckoutSessionParams>[0], "nowSeconds">;
export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<{ id: string; url: string }>;
// getStripe().checkout.sessions.create(params, { idempotencyKey: `checkout-session:${bookingId}` }); lanza si url es null.
export async function expireCheckoutSession(sessionId: string): Promise<void>; // best-effort, no lanza

// services/payment-service.ts
export async function createPendingPayment(input: {
  bookingId: string; amountUsdCents: number; stripeCheckoutSessionId: string;
}): Promise<void>; // provider stripe, method card, status pending, currency USD

// index.ts (agrega)
export { createCheckoutSession, expireCheckoutSession } from "./services/checkout-session-service";
export { createPendingPayment } from "./services/payment-service";
```
`createCheckoutSession` pone `nowSeconds = Math.floor(Date.now() / 1000)`.

### `modules/checkout`
```ts
// types/checkout.ts
import type { BookingAmount } from "@/modules/payments";

export type CheckoutErrorCode =
  | "invalid_input" | "invalid_link" | "unauthenticated" | "profile_missing"
  | "departure_unavailable" | "insufficient_seats" | "offer_invalid"
  | "below_minimum" | "payments_unavailable" | "unexpected";

export type CheckoutQuote = {
  departure: { id: string; startsAt: Date; seatsLeft: number };
  package: { id: string; slug: string; title: string; coverImageUrl: string | null;
             region: string; durationDays: number; nights: number };
  pax: number;
  amount: BookingAmount;      // PEN (snapshot) + USD a cobrar
  offerExpired: boolean;      // se pidió oferta y ya no es válida: amount va sin oferta
  belowMinimum: boolean;      // amount.amountUsdCents < STRIPE_MIN_AMOUNT_USD_CENTS
};
export type QuoteResult =
  | { ok: true; quote: CheckoutQuote }
  | { ok: false; code: "departure_unavailable" | "payments_unavailable" }
  | { ok: false; code: "insufficient_seats"; seatsLeft: number; packageSlug: string };

export type CheckoutField =
  | "firstName" | "lastName" | "email" | "phone" | "docType" | "docNumber" | "terms";
export type CheckoutFormState =
  | { status: "idle" }
  | { status: "error"; code: CheckoutErrorCode; message: string;
      fieldErrors?: Partial<Record<CheckoutField, string>>;
      values?: Partial<Record<Exclude<CheckoutField, "terms">, string>> };

// schemas/checkout-schema.ts (Zod v4; no importa lib/db)
export const MAX_TRAVELERS = 20;
export const checkoutSchema: z.ZodType<CheckoutInput>;
export type CheckoutInput = {
  salida: string; viajeros: number; oferta?: string;
  firstName: string; lastName: string; email: string; phone: string;
  docType: "dni" | "passport" | "foreign_id"; docNumber: string; terms: true;
};
export function parseCheckoutForm(formData: FormData):
  | { ok: true; data: CheckoutInput }
  | { ok: false; fieldErrors: Partial<Record<CheckoutField, string>>; linkInvalid: boolean };

// utils/checkout-params.ts (puras)
export type CheckoutParams = { salida?: string; viajeros?: number; oferta?: string };
export function parseCheckoutParams(raw: Record<string, string | string[] | undefined>): CheckoutParams;

// utils/app-url.ts
export function getAppUrl(): string; // origen sin barra final; lanza Error (en español) si NEXT_PUBLIC_APP_URL falta o es inválida

// utils/checkout-labels.ts (puras)
export function formatTravelers(n: number): string; // "1 viajero" | "N viajeros"
export function describeAmount(amount: BookingAmount, pax: number): {
  unitLine: string; subtotal: string; discount: string | null; total: string; charge: string; rate: string;
};
export function checkoutErrorMessage(code: CheckoutErrorCode, extra?: { seatsLeft?: number }): string;

// services/checkout-service.ts
export async function getCheckoutQuote(input: {
  departureId: string; pax: number; offerId?: string;
}): Promise<QuoteResult>;
export async function createCheckout(input: {
  clerkUserId: string; data: CheckoutInput;
}): Promise<{ ok: true; url: string } | { ok: false; code: CheckoutErrorCode; seatsLeft?: number }>;

// actions/start-checkout-action.ts  ("use server")
export async function startCheckout(prev: CheckoutFormState, formData: FormData): Promise<CheckoutFormState>;
// éxito: redirect(url) (fuera de try/catch)

// index.ts
export { CheckoutPage } from "./components/checkout-page";
```

### Componentes (`modules/checkout/components/`)
```tsx
// Server Components salvo checkout-form.tsx
CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> })
  // shell: <CheckoutSteps/> + h1; dentro de <Suspense fallback={<CheckoutSkeleton/>}>: await searchParams,
  // requireRole("customer") (AuthError -> redirect("/sign-in")), getUserByClerkId, getCheckoutQuote, y arma form + resumen o <CheckoutNotice/>.
CheckoutSteps()
CheckoutSummary({ quote, backHref }: { quote: CheckoutQuote; backHref: string })
CheckoutNotice({ title, message, action }: { title: string; message: string; action?: { label: string; href: string } })
CheckoutSkeleton()
// "use client": useActionState(startCheckout), campos controlados o defaultValue desde state.values
CheckoutForm({ salida, viajeros, oferta, email, disabled, continueWithoutOfferHref }:
  { salida: string; viajeros: number; oferta?: string; email: string; disabled: boolean; continueWithoutOfferHref: string })
```

### Ruta
```tsx
// app/(customer)/pago/page.tsx  (delgada)
export const metadata = { title: "Pago", robots: { index: false } };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CheckoutPage searchParams={searchParams} />;
}
```

### `modules/offers` (extiende)
```ts
// types/offer.ts: OfferDto.package gana `id: string`.
// services/offer-service.ts: getActiveOffers() selecciona y devuelve packages.id.

// utils/offer-link.ts (puras)
export function suggestedTravelers(terms: { discountType: "percent" | "two_for_one"; minPeople: number | null }): number; // D12
export function pickDeparture<T extends { id: string; seatsLeft: number }>(departures: T[], travelers: number): T | null;

// services/offer-link-service.ts (sin caché propia; getDepartures ya cachea)
export async function getOfferHrefs(offers: OfferDto[]): Promise<Record<string, string>>; // offer.id -> href (D12)

// components: OfferCard recibe `href: string`; OfferGrid recibe `hrefs: Record<string, string>`;
// OfferHero y OffersCatalog (offers-page.tsx) llaman a getOfferHrefs.
```
`modules/offers/index.ts` no cambia (todo se consume dentro del módulo).

## Edge cases
- **`pax` > cupo**: la página muestra "Solo quedan N cupos" (o "se agotó") sin form (AC24); si la carrera ocurre entre la carga y el envío, `createPendingBooking` lo rechaza (`insufficient_seats`) sin escribir (AC11, AC19).
- **Salida pasada, `cancelled`, `en_route` o de paquete `draft`**: `getBookableDeparture` → `null` → "Esta salida ya no está disponible" (AC8). Lo mismo si cambia entre la carga y el envío.
- **Desajuste salida/paquete**: imposible por D2 (el paquete sale de la salida); una oferta de otro paquete cae en `offer_invalid`.
- **`pax` enorme o no numérico**: el schema acota a 1–20 antes de la DB (D11); `total_cents` cabe en `int4`. `viajeros` manipulado en el form → `invalid_link`.
- **Doble clic / doble envío**: el botón se deshabilita mientras `pending` y Next despacha las acciones una tras otra por cliente (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`). Dos envíos reales (dos pestañas) crean dos `pending` (decisión 6); el sobrante expira con su Session (015). `idempotencyKey` por `booking.id` solo protege reintentos de red del SDK.
- **Sesión expirada o sin sesión al enviar**: `unauthenticated` con aviso y link para recargar `/pago` (el proxy lleva a ingresar y regresa). El `customerId` jamás viene del form.
- **Rol**: se acepta `customer` y superiores (D13); no hay bloqueo extra para `organizer`/`admin`.
- **Usuario sin fila en `users`** (el webhook de Clerk aún no llegó): `profile_missing`, sin escribir nada. La página igual muestra el form con el correo vacío.
- **Falla de Stripe tras crear el booking**: se cancela el booking (D4). Falla del insert de `payments` con la Session creada: se expira la Session y se cancela el booking. Si la compensación también falla queda un `pending` sin `payments` ni Session: 015 no lo ve por `checkout.session.expired` (Q5); se registra el código.
- **`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` o `PEN_PER_USD` ausentes/inválidos**: `payments_unavailable` antes de escribir (D5). La página sigue renderizando (solo `PEN_PER_USD` hace falta para el resumen; sin él muestra el estado `payments_unavailable`). `build` no se rompe (nada se evalúa al importar).
- **Total USD < 0.50** (oferta 100 %): `belowMinimum`; la página bloquea el botón y la acción responde `below_minimum` sin booking ni Session (decisión 2).
- **Oferta no vigente**: al cargar → aviso y resumen sin oferta (el form omite `oferta`); al enviar → `offer_invalid` y link "Continuar sin oferta". Nunca se cobra distinto a lo mostrado sin que el usuario lo vea. Oferta válida con `pax < min_people`: sin descuento y sin aviso (`offerId` nulo, 013 D7).
- **Volver atrás desde Stripe**: `cancel_url` → `/pago` con los mismos params; el booking anterior sigue `pending` hasta que expire su Session. Un nuevo envío crea otro (decisión 6).
- **`/confirmacion` no existe aún**: tras pagar, 404 transitorio (decisión 7). Esa página debe verificar que la reserva sea del usuario: el código `WY-####` es adivinable y va en la URL.
- **`session.url` nulo / Stripe devuelve error**: se trata como falla de Stripe (compensación).
- **Códigos de reserva**: cada envío (aun fallido) consume un `nextval` de `booking_code_seq` (techo 9999, ver schema); abandonar muchos `pending` lo agota (Q6).
- **Datos personales**: documento, correo y teléfono no se loguean; la respuesta de la acción no los devuelve más que como eco de los textos escritos por el propio usuario.
- **Fechas del seed**: caducan; las pruebas visuales y db insertan salidas relativas a `now()`.
- **Tampering de campos**: campos extra en el `FormData` se descartan (AC7); `docNumber` y nombres se normalizan en el servidor; React escapa el texto en el resumen.
- **Idioma**: español, con tildes; todo el dinero en enteros de centavos (013).

## Tests
Vitest instalado. `npm test` corre los no-db; los *(db)* con `npm run test:db`, omitidos sin `DATABASE_URL` (`describe.skipIf`, `await import()` dentro del bloque, fixtures con ids propios borradas en `afterAll`, FKs en orden: payments → travelers → bookings → departures). No se testea markup (SETUP §3); AC22–AC27 y AC32 son manuales con Playwright (390×844 y 1280×800) a cargo del orquestador, más el recorrido AC25 con claves de prueba.

- `lib/money.test.ts` — AC2.
- `modules/packages/utils/package-detail.test.ts` — AC3 (casos con `oferta`, vacío, `null`).
- `modules/packages/services/departure-service.test.ts` *(db)* — AC8.
- `modules/users/services/user-service.test.ts` *(db)* — AC9.
- `modules/bookings/services/booking-service.test.ts` *(db)* — AC10–AC12 (usuario `seed_customer_01`, paquete `machu-picchu-magico`, salidas propias; el rollback se fuerza con un `docType` inválido).
- `modules/payments/utils/checkout-session.test.ts` — AC14.
- `modules/payments/services/checkout-session-service.test.ts` — AC15 (`@/lib/stripe` mockeado).
- `modules/payments/services/payment-service.test.ts` *(db)* — AC13.
- `modules/checkout/schemas/checkout-schema.test.ts` — AC5–AC7.
- `modules/checkout/utils/checkout-params.test.ts` — AC4.
- `modules/checkout/utils/app-url.test.ts` — AC16 (`vi.stubEnv`).
- `modules/checkout/utils/checkout-labels.test.ts` — `describeAmount` con 129000 × 2 a 3.75 (`S/ 1 290 × 2`, `S/ 2 580`, `US$ 688.00`, `1 US$ = S/ 3.75`), con descuento, `formatTravelers`, mensajes (insumo de AC21/AC22).
- `modules/checkout/services/checkout-service.test.ts` — AC17–AC20 (mocks de `@/modules/bookings`, `@/modules/payments`, `@/modules/packages`, `@/modules/users`, `@/lib/stripe` y `../utils/app-url`; `getBookingAmount` real solo en el caso de monto, con `computeBookingAmount`).
- `modules/checkout/actions/start-checkout-action.test.ts` — AC21 (`requireRole`, `redirect` y el servicio mockeados; `redirect` mock lanza `NEXT_REDIRECT`).
- `modules/offers/utils/offer-link.test.ts` — AC29.
- `modules/offers/services/offer-link-service.test.ts` — AC30.
- `modules/offers/services/offer-service.test.ts` *(db)* — AC31 (se ajusta la forma esperada del DTO).
- AC1 y AC28 los verifica el reviewer con `tsc`, `lint`, `test`, `build` y `grep`.

## Plan
Cada fase deja `tsc` + `lint` + `test` en verde y la app funcionando. Las fases 1–5 no agregan rutas; `/pago` aparece en la fase 6 y el CTA de ofertas (fase 7) va al final para no enlazar a una ruta inexistente. Las tareas de una misma fase no comparten archivos.

### Phase 1 — Piezas compartidas y consulta de salida
Entrega: `formatUsd`, `buildCheckoutHref` con `oferta`, tipo de params de Stripe y `getBookableDeparture`.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `NEXT_PUBLIC_APP_URL` en `.env.example`; `formatUsd`; tipo `CheckoutSessionParams` en `lib/stripe.ts`; `buildCheckoutHref(…, offerId?)` + tests | .env.example, lib/money.ts, lib/money.test.ts, lib/stripe.ts, modules/packages/utils/package-detail.ts, modules/packages/utils/package-detail.test.ts | - | A | AC1, AC2, AC3 | todo |
| T2 | `getBookableDeparture` (sin caché) + tipo + exports del módulo + test *(db)* | modules/packages/services/departure-service.ts, modules/packages/services/departure-service.test.ts, modules/packages/types/package.ts, modules/packages/index.ts | T1 | B | AC8 | todo |

### Phase 2 — Usuarios y reservas
Entrega: `getUserByClerkId`, `createPendingBooking` (cupo + transacción) y `cancelPendingBooking`.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T3 | `getUserByClerkId` + test *(db)* + export | modules/users/services/user-service.ts, modules/users/services/user-service.test.ts, modules/users/index.ts | - | A | AC9 | todo |
| T4 | Módulo `bookings`: tipos y `BookingError`, `createPendingBooking`, `cancelPendingBooking`, `index.ts` + test *(db)* | modules/bookings/types/booking.ts, modules/bookings/services/booking-service.ts, modules/bookings/services/booking-service.test.ts, modules/bookings/index.ts | - | A | AC10, AC11, AC12 | todo |

(T4 usa `getBookableDeparture`, que ya existe tras la fase 1.)

### Phase 3 — Stripe Checkout y `payments` pending
Entrega: parámetros puros de la Session, `createCheckoutSession`, `expireCheckoutSession` y `createPendingPayment`, exportados por `payments`.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | `buildCheckoutSessionParams` + `CHECKOUT_SESSION_TTL_SECONDS` + test | modules/payments/utils/checkout-session.ts, modules/payments/utils/checkout-session.test.ts | - | A | AC14 | todo |
| T6 | `createCheckoutSession`, `expireCheckoutSession`, `createPendingPayment` + tests + exports de `payments` | modules/payments/services/checkout-session-service.ts, modules/payments/services/checkout-session-service.test.ts, modules/payments/services/payment-service.ts, modules/payments/services/payment-service.test.ts, modules/payments/index.ts | T5 | B | AC13, AC15 | todo |

### Phase 4 — Tipos, validación y utilidades del checkout
Entrega: schema Zod, params de URL, `getAppUrl` y textos/etiquetas, todo puro y testeado.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T7 | Tipos del checkout y `checkoutSchema` / `parseCheckoutForm` + test | modules/checkout/types/checkout.ts, modules/checkout/schemas/checkout-schema.ts, modules/checkout/schemas/checkout-schema.test.ts | - | A | AC5, AC6, AC7 | todo |
| T8 | `parseCheckoutParams` y `getAppUrl` + tests | modules/checkout/utils/checkout-params.ts, modules/checkout/utils/checkout-params.test.ts, modules/checkout/utils/app-url.ts, modules/checkout/utils/app-url.test.ts | - | A | AC4, AC16 | todo |
| T9 | `formatTravelers`, `describeAmount`, `checkoutErrorMessage` + test | modules/checkout/utils/checkout-labels.ts, modules/checkout/utils/checkout-labels.test.ts | T7 | B | AC21, AC22 | todo |

### Phase 5 — Orquestación y Server Action
Entrega: `getCheckoutQuote`, `createCheckout` (con compensación) y `startCheckout`.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T10 | `getCheckoutQuote` y `createCheckout` + test con mocks | modules/checkout/services/checkout-service.ts, modules/checkout/services/checkout-service.test.ts | T2, T3, T4, T6, T7, T8 | A | AC17, AC18, AC19, AC20 | todo |
| T11 | `startCheckout` (auth → parseo → servicio → `redirect`) + test | modules/checkout/actions/start-checkout-action.ts, modules/checkout/actions/start-checkout-action.test.ts | T10 | B | AC21 | todo |

### Phase 6 — Pantalla `/pago`
Entrega: ruta `/pago` completa (formulario, resumen, estados) conectada a la acción.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T12 | setup: `npx shadcn@latest add checkbox alert` | components/ui/checkbox.tsx, components/ui/alert.tsx | - | A | AC1 | todo |
| T13 | `CheckoutForm` (cliente) | modules/checkout/components/checkout-form.tsx | T11, T12 | B | AC23 | todo |
| T14 | `CheckoutSteps` y `CheckoutSummary` | modules/checkout/components/checkout-steps.tsx, modules/checkout/components/checkout-summary.tsx | T9 | B | AC22, AC27 | todo |
| T15 | `CheckoutNotice` y `CheckoutSkeleton` | modules/checkout/components/checkout-notice.tsx, modules/checkout/components/checkout-skeleton.tsx | T12 | B | AC24 | todo |
| T16 | `CheckoutPage` (shell, Suspense, sesión, quote, estados), `index.ts` y ruta delgada | modules/checkout/components/checkout-page.tsx, modules/checkout/index.ts, app/(customer)/pago/page.tsx | T13, T14, T15 | C | AC1, AC24, AC26, AC28 | todo |

Si `npx shadcn@latest add` toca `package.json` o `package-lock.json`, T12 los incluye en su cambio (no deberían cambiar: `@base-ui/react` ya está).

### Phase 7 — CTA de `/ofertas` hacia `/pago`
Entrega: hero y tarjetas de ofertas enlazan a `/pago` con `oferta`.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T17 | `package.id` en `OfferDto` y en `getActiveOffers` + ajustar test *(db)* | modules/offers/types/offer.ts, modules/offers/services/offer-service.ts, modules/offers/services/offer-service.test.ts | - | A | AC31 | todo |
| T18 | `suggestedTravelers`, `pickDeparture`, `getOfferHrefs` + tests | modules/offers/utils/offer-link.ts, modules/offers/utils/offer-link.test.ts, modules/offers/services/offer-link-service.ts, modules/offers/services/offer-link-service.test.ts | T1, T2, T17 | B | AC29, AC30 | todo |
| T19 | Usar los hrefs en `OfferCard`, `OfferGrid`, `OfferHero` y `OffersCatalog` | modules/offers/components/offer-card.tsx, modules/offers/components/offer-grid.tsx, modules/offers/components/offer-hero.tsx, modules/offers/components/offers-page.tsx | T18 | C | AC32 | todo |

(11 archivos: un poco sobre el tope de ~10; las cuatro piezas de UI deben cambiar juntas porque comparten el tipo de props.)

### Verificación (orquestador, tras T16 y T19; no es tarea de developer)
Con `.env.local` (DB sembrada, Clerk, `STRIPE_SECRET_KEY` de prueba, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `PEN_PER_USD=3.75`): `npm run build && npm start`; salidas propias relativas a `now()`; Playwright a 390×844 y 1280×800 sobre AC22–AC27 y AC32 (estados: `?salida=zzz`, salida pasada, `viajeros` > cupo, oferta vencida, oferta 100 %); recorrido con `4242 4242 4242 4242`; `npm run test:db`. Capturas y resultado al PR. Reviewer al cierre de cada fase: `tsc`, `lint`, `test`, `build`.

## Open questions
Ninguna bloquea el arranque; cada una tiene default y la puede cambiar el humano al aprobar.
- **Q1 (default: hero y tarjetas van a `/pago`).** El pedido habla del "CTA"; las tarjetas hoy son links a `/paquetes/<slug>` sin botón. Con el default ambas anuncian el precio rebajado y la única ruta que aplica el descuento es `/pago` (el detalle de paquete no lleva `oferta`). Costo: un clic en la tarjeta salta la ficha del paquete (queda "Cambiar salida o viajeros"). Alternativa: solo el botón "Aprovechar oferta" del hero.
- **Q2 (default: términos y política sin enlace).** No existen las páginas de términos ni de política de cancelación; el checkbox acepta el texto "términos y condiciones y la política de cancelación (gratis hasta 48 h antes de la salida)" sin link, para no dejar enlaces muertos. ¿Hay textos legales o una ruta prevista?
- **Q3 (default: sin fallback para `NEXT_PUBLIC_APP_URL`).** En previews de Vercel el dominio cambia por despliegue; con un valor fijo, Stripe volvería al dominio configurado. Falla cerrado (`payments_unavailable`). Alternativa: caer en `https://${VERCEL_URL}` si falta.
- **Q4 (default: DNI 8 dígitos; pasaporte y carné 6–12 alfanuméricos).** Reglas de formato de D10; más estrictas (p. ej. carné de 9 dígitos) rechazarían documentos válidos de otros países.
- **Q5 (default: se registra y no se barre).** Si falla Stripe/`payments` y también la cancelación de compensación, queda un `pending` sin Session. Se loguea el código. Un barrido de `pending` sin `payments` y viejos queda para 015 u otra tarjeta.
- **Q6 (default: se acepta el techo).** `booking_code_seq` llega a 9999 (arranca en 4822) y cada envío, aun fallido o abandonado, consume un código. Ampliar formato y `check` (migración) queda aparte.
