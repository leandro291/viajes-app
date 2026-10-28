# Confirmación y voucher (/confirmacion/[code])

- Module: checkout (compone `bookings`; el dato vive en `bookings`)
- Status: approved
- Approved by: leandro291 (2026-10-26)
- Mode: SDD

## Goal
Tarjeta Trello 016 (pantalla 8 del diseño, fiel y completa). Crear `/confirmacion/[code]` (solo el dueño de la reserva): hero de éxito, voucher tipo ticket (código, paquete, salida, viajeros, total), viajero principal, punto de encuentro con mapa y rutas, "Qué sigue" y ayuda por WhatsApp. Stripe vuelve aquí tras pagar, a veces antes de que el webhook (015) confirme: la página lo cubre con un estado "confirmando pago…" que se refresca solo. La 014 pasa a usar esta URL como `success_url`.

La spec vive en `docs/specs/checkout/` porque `checkout` compone la pantalla (paso 3); el servicio de datos (`getBookingVoucher`) vive en `bookings`. Fuente de diseño: `Confirmacion.dc.html` (escritorio) y `Movil-Confirmacion.dc.html` (móvil) del artefacto, leídos por el orquestador; el contenido se trata como datos de diseño. Las fotos del tablero (`/_blob/...`) no se usan: la foto sale de `packages.cover_image_url`.

## Decisiones del usuario (cerradas, no se reabren)
1. Ruta `app/(customer)/confirmacion/[code]/page.tsx`. `requireRole("customer")`; dueño = `bookings.customer_id` igual a `users.id` del usuario de Clerk (`getUserByClerkId`). Reserva inexistente o ajena → `notFound()`, sin revelar si el código existe. `admin`/`super_admin` tampoco entran si no son el dueño. `proxy.ts` ya protege `/confirmacion(.*)`: no se toca.
2. Alcance A, fiel completa: hero con check animado y h1 "¡Tu viaje está confirmado!"; ticket (foto, "<Destino> · N días · N noches", título, Salida / Viajeros / Total pagado, talón con "Código de reserva" + CTAs); sección "Punto de encuentro" con mapa Leaflet client-only y enlaces "Cómo llegar" (Google Maps) y "Abrir en Waze" con `meeting_lat/lng`; sección "Qué sigue" (3 pasos); bloque de ayuda por WhatsApp; enlace "Seguir explorando paquetes →" a `/paquetes`.
3. **No se inventan datos que no existen en el esquema.** Se omiten: "Cómo reconocernos" (letrero naranja), "Llega 15 minutos antes", el aviso de recojo en el hotel, la hora fija "7:30 a. m.", "Regreso", "Agregar al calendario", "Pagado", horario de atención del móvil y el sub-texto "Frente a la puerta principal…". La hora sale de `departures.starts_at` (Lima). Sin `meeting_lat/lng` → sin mapa y sin enlaces de ruta (solo el texto). `meeting_point` nulo → "Por confirmar" (Q4). "Qué sigue" no promete correo ni WhatsApp (v1 no envía nada).
4. "Descargar voucher" = botón `window.print()` (client mínimo) + CSS de impresión (`print:`): oculta hero/encabezado/pie/mapa/ayuda y deja el ticket. Subtítulo del hero: "Guarda tu voucher, lo necesitarás el día de la salida." "Ver detalles" del talón enlaza a `/paquetes/<slug>`. El "Libro de reclamaciones" del pie es del footer global: fuera.
5. Estados: `pending` → "confirmando pago…" con refresco automático; `cancelled` → aviso; el hero de éxito y el voucher solo aparecen en `confirmed`.
6. Viajeros del ticket con `formatTravelers` ("2 viajeros"; no hay "adultos" en el esquema). Nombre + documento del viajero principal van en una sección propia junto al ticket (el tablero no la tiene); documento enmascarado (D9), solo para el dueño.
7. `success_url` de 014: de `/confirmacion?reserva=<code>` a `/confirmacion/<code>` (ARCHITECTURE §4).
8. `modules/bookings` gana `getBookingVoucher(code, customerId)` + DTO (`types/`), exportados por `index.ts`. `app/` solo enruta.
9. Fuera: PDF, envío por WhatsApp/correo, agregar al calendario, `/mis-reservas` (017), cancelación/reembolso, completar datos del resto de viajeros, "Libro de reclamaciones".

## Scope
- In:
  - Ruta delgada y `ConfirmationPage` en `modules/checkout`; vistas `confirmed` (hero + ticket + viajeros + punto de encuentro + qué sigue + ayuda + enlace), `pending` (espera con refresco), `cancelled` (aviso).
  - `getBookingVoucher` + DTO + mapper puro + validación del código en `modules/bookings`.
  - Layout `(customer)` con encabezado superpuesto sobre hero (extrae `SiteShell` compartido con `(public)`), keyframe `wy-pop`.
  - Mapa Leaflet del punto de encuentro (client-only), enlaces de ruta, botón de impresión, `lib/whatsapp.ts` (movido de `home`), `formatDepartureShortDate`.
  - Cambio de `success_url` y ajuste de sus tests.
- Out: ver decisión 9. Además: caché, cambios de schema/migraciones, dependencias nuevas (`leaflet` y `react-leaflet` ya están), `generateStaticParams`, tocar `proxy.ts`, reescribir specs/PRs/changelogs anteriores, crédito de la foto de portada (no hay dato por foto de portada; ver Edge cases).

## Decisiones a aprobar
- **D1. Un solo query con control de dueño.** `WHERE bookings.code = $code AND bookings.customer_id = $customerId`: ajena e inexistente son indistinguibles (`null`). El `customerId` sale del token (`requireRole` → `getUserByClerkId`), nunca de la URL.
- **D2. Código validado antes de la DB.** `isBookingCode(code)` = `^WY-\d{4}$`. Cualquier otra cosa → `null` sin consultar. Sin normalizar mayúsculas.
- **D3. Todo `AuthError` o falta de usuario → `notFound()`.** El proxy ya manda a ingresar a quien no tiene sesión; dentro de la página, `AuthError` o `getUserByClerkId` nulo terminan igual que una reserva ajena. Sin `redirect`.
- **D4. `notFound()` dentro de `<Suspense>` responde 200 con `noindex`** (con `cacheComponents` el shell se envía antes; `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`). Se acepta: página privada, `robots.index = false`, ajena/inexistente dan lo mismo.
- **D5. `params` es `Promise`** (Next 16): se espera dentro de `ConfirmationPage`, bajo `<Suspense>`; `page.tsx` no lo espera.
- **D6. Refresco del `pending` con `router.refresh()` cada 3 s, tope 20 intentos (≈ 60 s).** Un componente cliente con `setInterval`; `refresh()` re-renderiza el Server Component sin recarga completa y conserva el estado cliente (el contador sobrevive; `use-router.md`). Descartado `<meta http-equiv="refresh">` (recarga entera, sin tope, parpadea) y polling a un endpoint (más superficie). Al pasar a `confirmed`/`cancelled` el servidor ya no renderiza el refresher (se desmonta y limpia el intervalo). Tras el tope: se detiene, el aviso cambia a "tarda más de lo normal" y aparece "Actualizar" (refresh manual). Techo: si el webhook no llega, la reserva queda `pending` hasta que 015 la cancele con `checkout.session.expired` (≤ ~31 min).
- **D7. Estado accesible:** el bloque `pending` usa `role="status"`; el cambio a voucher es un re-render del servidor.
- **D8. Solo lectura, sin caché** (`"use cache"` ausente): estado y cupo cambian por webhook. Sin escrituras.
- **D9. Documento enmascarado** (tipo + `****` + últimos 4) del viajero principal, solo para el dueño. La máscara se aplica en `toVoucherDto` (servidor): el número completo nunca llega al cliente ni a la impresión. El titular ya conoce su documento y lo presenta en la entrada; el voucher solo confirma cuál se registró. Nunca se loguea (Q2 cerrada).
- **D10. Cobro en USD opcional:** `chargedUsdCents` = `amount_cents` del último `payment` si es `succeeded`/`partially_refunded`; si no, `null` y la línea (bajo el total, `formatUsd`, 13 px `ink-muted`) se omite. `paymentStatus` sirve al aviso de reembolso del `cancelled`.
- **D11. Componentes de la pantalla en `checkout`** (hero, ticket, meeting, steps, help, refresher). Reutilizan `formatTravelers` y los helpers de fecha. Si 017 necesita el ticket, se sube entonces.
- **D12. `success_url` = `${appUrl}/confirmacion/${booking.code}`** (el código `WY-\d{4}` no necesita escape). La spec de 014 (aprobada) ya anticipa en su D9 que solo cambia `successUrl`; no se reescribe, esta spec lo registra. `docs/prs/014-*` y `changelog/014-*` son históricos.
- **D13. Layout `(customer)` con hero superpuesto vía `SiteShell` compartido.** El `(public)` ya resuelve el tablero (hero full-bleed + encabezado transparente `absolute` + `main` sin `max-width`) con `group/shell` + `has-[[data-page-hero]]`, y `SiteHeader` depende de ese ancestro. En vez de copiar el marcado, se extrae `components/shared/site-shell.tsx` (`SiteHeader` + `<main>` + `SiteFooter` con las clases actuales de `(public)`), y ambos layouts lo usan (DRY, 2 usos). `/pago` y `/cuenta` no tienen `[data-page-hero]`, así que no cambian. En el shell, encabezado y pie van envueltos en `<div className="contents print:hidden">` (no altera el layout; oculta al imprimir, D15) sin tocar `SiteHeader`/`SiteFooter`. Solo `confirmed` pinta `PageHero`; `pending`/`cancelled` quedan en el flujo normal, con encabezado sólido.
- **D14. Hero con `PageHero`** (`components/shared/page-hero.tsx`): `min-h-[440px] sm:min-h-[560px]` (440 móvil / 560 escritorio del tablero), foto de portada como `background` (`object-position: center 35%`), `contentClassName` para centrar (`items-center justify-center text-center`, `pb-[90px] sm:pb-[150px]`, ancho máx. 880). Sin `cover_image_url` → fondo `bg-dark` liso. Desvío: se mantiene el degradado único de `PageHero` (el del tablero es `to top .92/.55/.35`, apenas distinto) para no ramificar el componente compartido; el encabezado superpuesto ya queda legible con el degradado superior de `PageHero`.
- **D15. Impresión con `print:` de Tailwind** (sin CSS global): hero (`print:hidden` en el `PageHero`), encabezado y pie (D13), mapa, botones de ruta, "Qué sigue", ayuda y enlace final (`print:hidden`). Quedan el ticket (sin sombra, sin solapa `print:mt-0`, sin los dos botones del talón), el viajero principal y el texto del punto de encuentro. `print-color-adjust: exact` en el ticket para conservar el color del total. `PrintVoucherButton` es el único cliente nuevo del ticket y llama `window.print()`.
- **D16. Mapa del punto de encuentro: componente nuevo en `checkout`**, mismo patrón que el de Destino (`dynamic(..., { ssr: false })` + canvas `"use client"` con `react-leaflet`, mismas constantes de tiles OSM y atribución, misma lectura de `prefers-reduced-motion`). No se reutiliza `DestinationMap`: está acoplado a pines numerados y bounds (`MapPin`, "Mapa de lugares imperdibles") y es interno de `destinations` (ARCHITECTURE §1.6). *ponytail: las dos constantes de tiles quedan duplicadas; si aparece un tercer mapa, extraer `components/shared/` (y migrar Destino).* Centro = `[meeting_lat, meeting_lng]`, zoom 16, un marcador (divIcon con el pin del tablero: SVG 40×50 `accent` con trazo blanco) y `Tooltip` permanente "Te esperamos aquí · <hora de salida>" (hora de `starts_at`, Lima). Zoom con el control de Leaflet agrandado a 44 px (la regla de objetivos gana al tablero de 40/36 px); `scrollWheelZoom={false}`; `role="region"` + `aria-label="Mapa del punto de encuentro: <meeting_point>"`. Sin el "ping" decorativo (animación infinita, desvío por reduced-motion y simplicidad).
- **D17. Enlaces de ruta** (función pura `buildMapLinks(lat, lng)`): Google Maps `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` y Waze `https://waze.com/ul?ll=<lat>,<lng>&navigate=yes`, ambos `target="_blank" rel="noopener noreferrer"`. Devuelve `null` si falta alguna coordenada o no es finita; entonces no se pintan mapa ni botones.
- **D18. WhatsApp: `buildWhatsAppUrl` pasa a `lib/whatsapp.ts`** (hoy en `modules/home/utils/whatsapp.ts`): lo usan `home` y `checkout`, y un módulo no importa internos de otro (el `index.ts` de `home` solo exporta `HomePage`). Mover con su test; `home-page.tsx` cambia su import. Número = `NEXT_PUBLIC_WHATSAPP_NUMBER`; mensaje `Hola Wayra, necesito ayuda con mi reserva <code>.` Sin número válido → `null` → no se renderiza el bloque de ayuda.
- **D19. Fecha corta de la salida:** `formatDepartureShortDate(d)` nuevo en `modules/packages` ("Jue 5 nov 2026", Lima, mismo `Intl` que los otros helpers). `formatDepartureChip` no sirve (sin año, sin formato de una línea). La sección "Cuándo" usa el existente `formatDepartureDate` + `formatDepartureTime` ("jueves 5 de noviembre · 7:30 a. m."; el tablero dice "Jueves 5 de noviembre", se capitaliza la primera letra).
- **D20. Copy propio (a aprobar).** Lo que el tablero promete y v1 no cumple se reescribe; todo lo demás se copia literal.
  - Subtítulo del hero: "Guarda tu voucher, lo necesitarás el día de la salida."
  - "Qué sigue" (eyebrow "Antes de salir"), pasos:
    1. **Guarda tu voucher** — "Descárgalo o guarda esta página: tiene tu código de reserva, la fecha y el punto de encuentro."
    2. **Lleva tu documento** — "Lleva el documento con el que reservaste. En Machu Picchu es obligatorio para ingresar."
    3. **Preséntate en el punto de encuentro** — "Llega a la hora indicada y muestra tu código de reserva."
  - Ayuda: título "¿Necesitas ayuda con tu reserva?"; texto "Escríbenos por WhatsApp con tu código."; botón "Abrir WhatsApp".
  - `pending`: `h1` "Estamos confirmando tu pago"; texto "Esto toma unos segundos. Esta página se actualiza sola." Tras el tope: "Está tardando más de lo normal. Si ya pagaste, tu reserva se confirmará en cuanto recibamos el aviso del pago; puedes actualizar la página." + botón "Actualizar".
  - `cancelled`: título "Esta reserva fue cancelada"; texto "No se confirmó tu lugar en esta salida." y, si el último pago está `refunded`/`partially_refunded`, "Te reembolsamos el pago." Acción "Ver paquetes" → `/paquetes`.

## Fidelidad (tablero → implementación)
Medidas en px a 1280 (escritorio) / 390 (móvil). Estructura, textos, íconos y medidas del tablero se copian salvo lo listado como desvío.

| Elemento | Tablero | Implementación / desvío |
| -------- | ------- | ----------------------- |
| Hero | `section` relativa, `min-height:560` (móvil `height:440`), foto `object-fit:cover; object-position:center 35%` (móvil 40%), degradado `to top .92/.55/.35` | `PageHero` `min-h-[560px]`/`[440px]`, `cover_image_url`; degradado de `PageHero` (D14) |
| Encabezado | superpuesto, transparente, logo + nav + sesión (móvil: Ingresar + hamburguesa) | `SiteHeader` existente vía `SiteShell` (D13); sin cambios al encabezado |
| Contenido del hero | columna centrada máx. 880, padding `24 24 150` (móvil `0 20 90`, alineado abajo), gap 20 | `items-center justify-center text-center`, `pb-[150px]`; móvil `pb-[90px]`, **desvío:** centrado en móvil también (el tablero móvil alinea a la izquierda abajo, con copy distinto); se sigue el escritorio |
| Check | círculo 84, `accent`, anillo `0 0 0 10px rgba(194,65,12,.25)`, `Check` 42 trazo 2.8, `wy-pop .7s` (móvil: 64, `primary`, borde blanco 3, `Check` 30 trazo 3) | `Check` de `lucide-react`; 84/`accent`/anillo desde `sm`, 64/`primary`/borde blanco debajo; `aria-hidden`; animación `motion-safe:animate-[wy-pop_.7s_cubic-bezier(.2,.7,.2,1)_both]` |
| `h1` | "¡Tu viaje está confirmado!" `clamp(44px,7vw,88px)`, 800, lh .92, tracking −0.045em, `text-wrap:balance`, `wy-up` delay .15 s (móvil: "¡Listo! Te vas a Machu Picchu", 40 px) | Texto del escritorio en ambos anchos (el del móvil fija el paquete); `clamp(40px,7vw,88px)` (mínimo 40 para igualar el móvil; desde 391 px sube con `7vw`); `text-balance`; `motion-safe:animate-[wy-up…]` |
| Subtítulo | `clamp(17px,1.6vw,20px)`, lh 1.5, blanco 90 %, máx. 540 | Misma medida; texto D20 |
| Solapa | `main` máx. 1000, `margin:-110px auto 0` (móvil `-64px`, `margin 0 16px`), `z-index:4`, padding `0 24 104`, gap 72 | `mx-auto max-w-[1000px] -mt-16 sm:-mt-[110px] px-4 sm:px-6 pb-[104px]`, `flex-col gap-[72px]`, `relative z-[4]` |
| Ticket (tarjeta) | blanco, radio 30 (móvil 22), sombra `0 30px 70px rgba(11,21,19,.18), 0 2px 6px …`, `wy-up` delay .35 s, `flex-wrap` | Igual; `shadow-raised` (es `.14`: se escribe literal `.18` como valor arbitrario) |
| Foto del ticket | `flex:1 1 200`, `min-height:220`, radio `30 0 0 30` | `next/image fill` con `cover_image_url`; sin foto, `bg-sand` |
| Detalle | `flex:2 1 280`, padding 28, gap 20 | Igual |
| Eyebrow | "Cusco · 4 días · 3 noches" 13/700, .06em, mayúsculas, `primary` | `<destinationName> · formatDuration(durationDays) · N noche(s)` (omite noches si 0, como el resumen de /pago) |
| Título | `h2` 30/800, −0.025em, lh 1.05 | Igual (`aria-labelledby` de la sección) |
| `dl` | grid `auto-fit minmax(min(120px,100%),1fr)`, gap 16; `dt` 12/700 .08em mayúsculas `ink-muted`; `dd` 17/700 | Igual. **Salida** = `formatDepartureShortDate`; **Viajeros** = `formatTravelers(pax)`; **Total pagado** = `formatPen(total)` en `accent`, y debajo `chargedUsd` si hay (D10) |
| Talón | `flex:1 1 220`, `border-left:2px dashed #E4DED2`, padding 28, gap 16; muescas 28 px (`left:-15; top/bottom:-14`, color de fondo); `<860px`: sin muescas, `border-top` punteado | Igual (breakpoint 860 con `min-[860px]:`); muescas `bg-background` `aria-hidden` |
| Código | "Código de reserva" 12/700 .08em; código 26/800 .02em (móvil 30, .04em) | Código en `font-display` 26/800; **no** se copia el "Pagado" del móvil |
| "Descargar voucher" | `accent`, pill, `Download` 18 trazo 2.2, padding 14×20 (móvil: botón `ink`, sin ícono) | `PrintVoucherButton` (D15): igual al tablero por ancho: desde `sm` `Button variant="cta"` (`accent`) con `Download`; debajo de `sm` botón `ink` sin ícono. Sin "Agregar al calendario" |
| "Ver detalles" | pill contorno `ink` 1.5, hover `ink` con texto blanco | `Link` a `/paquetes/<slug>`, mismo estilo |
| Viajeros (nuevo) | no existe | Tarjeta blanca radio 30 (como el ticket), `h2` de panel 22–26 "Viajeros", fila por viajero: "Nombre Apellido", `DNI`/`Pasaporte`/`Carné de extranjería` + número, etiqueta "Principal" en `primary-soft`; debajo del ticket, mismo ancho |
| Punto de encuentro | eyebrow "El día de la salida" 13/700 .1em `accent`; `h2` `clamp(30px,3.6vw,42px)` lh 1 −0.035em (móvil 26); tarjeta blanca radio 30 (móvil 24) borde `#EAE4D9`, `overflow:hidden` | `SectionHeading` si encaja con esa medida (revisar), si no, clases propias; tarjeta igual |
| Mapa | `flex:3 1 420`, `min-height:400` (móvil 270), SVG ilustrativo, pin `accent` 40×50, tooltip `ink` "Te esperamos aquí · 7:30 a. m.", zoom propio 40 px, atribución | Leaflet real (D16); tooltip con la hora de `starts_at`; zoom 44 px; atribución de Leaflet/OSM |
| Panel de datos | `flex:2 1 300`, padding 32 (móvil 20), gap 22; ítems con ícono 40×40 radio 12 `sand`, ícono `accent` 20 trazo 2 | Igual: **Dónde** (`MapPin`) = `meeting_point` o "Por confirmar" (17/700, sin sub-texto); **Cuándo** (`Clock`) = `formatDepartureDate · formatDepartureTime` (sin sub-texto) |
| Omitidos | "Cómo reconocernos", aviso del hotel (`primary-soft`), "Llega 15 minutos antes" | Fuera por datos inexistentes (decisión 3) |
| Botones de ruta | "Cómo llegar" `accent` con `Navigation` 18; "Abrir en Waze" contorno `ink`; `flex:1 1 auto`, padding 13×20 | Igual; solo con coordenadas (D17). "Cómo llegar" `accent` y "Descargar voucher" `accent` (escritorio) no comparten viewport; en móvil la descarga es `ink` |
| Qué sigue | eyebrow "Antes de salir"; `h2` igual al de arriba; `ol` grid `auto-fit minmax(min(240px,100%),1fr)` gap 20; círculo 44 `ink` con número 18/800 + guion punteado `repeating-linear-gradient`; título `font-display` 21/700; texto 16 `ink-muted` lh 1.6. Móvil: tarjetas blancas radio 18 con círculo 36 `sand` | Escritorio-primero con `ol` real; el móvil usa la misma estructura (círculo 44) — **desvío menor** (no se replica la variante de tarjetas del móvil); copy D20 |
| Ayuda | tarjeta radio 30 (móvil 24) `min-height:240`, foto de fondo + degradado a la derecha, `h2` `clamp(26px,3vw,34px)`, texto 90 % blanco, botón contorno blanco "Abrir WhatsApp" con ícono `MessageCircle` | Patrón de `modules/home/components/whatsapp-cta.tsx` (foto `/seed/l69.jpg`, degradado, botón); botón contorno blanco como el tablero (el `cta` accent del home no aplica); copy D20; sin bloque si no hay número |
| Enlace final | "Seguir explorando paquetes →" `primary` 17/700, centrado, padding 10 | `Link` a `/paquetes` (móvil lo reemplaza por "Volver al inicio": se sigue el escritorio) |
| Pie | © + "Libro de reclamaciones" + créditos de fotos | `SiteFooter` global; sin cambios (decisión 9) |
| Movimiento | `wy-pop`, `wy-up` con delays .15/.25/.35 s, `ping` infinito; `prefers-reduced-motion: none` | `motion-safe:`; keyframe `wy-pop` en `globals.css`; sin `ping` |
| Foco | `outline:3px solid #F59E6B` | Tokens del sistema: `accent` en claro, `focus` dentro de `bg-dark` (DESIGN-SYSTEM) |

## Reuse
- Reuse: `lib/auth/require-role.ts` (`requireRole`, `AuthError`); `modules/users` `getUserByClerkId`; `lib/db` (`bookings`, `bookingTravelers`, `payments`, `departures`, `packages`, `destinations`); `lib/money.ts` `formatPen` / `formatUsd`.
- Reuse: `modules/packages` — `formatDepartureDate`, `formatDepartureTime` (Lima), `formatDuration`; `modules/checkout` — `formatTravelers`, `CheckoutNotice` (aviso `cancelled`), `CheckoutSkeleton` (fallback).
- Reuse: `components/shared/page-hero.tsx` (`PageHero`, `data-page-hero`) y el mecanismo `group/shell` del layout `(public)` + `SiteHeader`; `components/shared/status-badge.tsx` (`pending` en el estado de espera); `SectionHeading`; `components/ui/{button,alert}`; tokens de `globals.css`; `lucide-react` (`Check`, `Download`, `MapPin`, `Clock`, `Navigation`, `MessageCircle`); `next/image`, `next/link`.
- Reuse: `leaflet` y `react-leaflet` (ya instalados) con el patrón de `modules/destinations/components/destination-map.tsx` + `destination-map-canvas.tsx` (`dynamic ssr:false`, tiles OSM, atribución, reduced-motion).
- Reuse: patrón de `modules/home/components/whatsapp-cta.tsx` y `buildWhatsAppUrl`; `NEXT_PUBLIC_WHATSAPP_NUMBER` (ya en `.env.example`).
- Reuse: `proxy.ts`; patrón de `CheckoutPage` (shell + `<Suspense>` + sesión) y de tests `describe.skipIf(!process.env.DATABASE_URL)` + `await import()`.
- Extend: `modules/bookings` (servicio, DTO, `index.ts`); `modules/checkout` (`ConfirmationPage`, `index.ts`, `success_url`); `modules/packages` (`formatDepartureShortDate` + export); `app/globals.css` (`@keyframes wy-pop`); layouts `(public)` y `(customer)` (usan `SiteShell`).
- Move: `modules/home/utils/whatsapp.ts` (+ test) → `lib/whatsapp.ts` (D18).
- New: `components/shared/site-shell.tsx` (extracción de `(public)/layout.tsx`, D13); `modules/checkout/components/meeting-point-map*.tsx` (D16: Destino no sirve); `confirmation-refresher.tsx`; `print-voucher-button.tsx`; `buildMapLinks`; `BookingVoucher`, `ConfirmationHero`, `ConfirmationMeeting`, `ConfirmationNextSteps`, `ConfirmationHelp` (no hay equivalentes).
- Sin dependencias nuevas ni `shadcn add`.

## Acceptance criteria
*(auto)* = `npm test` / comando con mocks; *(db)* = `npm run test:db` (omitido sin `DATABASE_URL`); *(visual)* = Playwright a 390 px y 1280 px con base sembrada y claves de prueba, contra `Confirmacion` / `Movil-Confirmacion`.

### Piezas compartidas
- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde al cierre de cada fase. `build` no falla sin `STRIPE_*`, `NEXT_PUBLIC_APP_URL` ni `NEXT_PUBLIC_WHATSAPP_NUMBER`; la ruta no es bloqueante (shell estático + contenido en `<Suspense>`). `package.json` sin dependencias nuevas.
- AC2 *(auto)*: `isBookingCode` acepta `WY-4822`, `WY-0001`; rechaza `wy-4822`, `WY-482`, `WY-48222`, `WY-48a2`, `""`, `WY-4822 `, `../x`, `WY-4822%00`.
- AC3 *(auto)*: `toVoucherDto(row, travelers, payment)` devuelve el DTO del contrato: `startsAt` `Date`; `meetingPoint`, `meetingLat` y `meetingLng` nulos se conservan; viajeros con el principal primero y `docNumberMasked` = `****` + últimos 4 (documentos de ≤4 caracteres → `****`); el DTO no contiene el número completo; `chargedUsdCents` = monto si el último pago es `succeeded`/`partially_refunded`, `null` si es `pending`/`failed`/`refunded`/ausente; no incluye `customerId`, `contactEmail` ni `contactPhone`.
- AC4 *(auto)*: `buildMapLinks(-13.5163, -71.9785)` → `{ google: "https://www.google.com/maps/search/?api=1&query=-13.5163,-71.9785", waze: "https://waze.com/ul?ll=-13.5163,-71.9785&navigate=yes" }`; `null` si falta una coordenada (`null`/`undefined`) o no es finita (`NaN`, `Infinity`); no redondea ni altera los decimales.
- AC5 *(auto)*: `formatDepartureShortDate(new Date("2026-11-05T12:30:00Z"))` → `Jue 5 nov 2026`; una salida a las 02:00 UTC del 6 nov (21:00 del 5 en Lima) da `Jue 5 nov 2026` (zona Lima, no UTC); el test fija también la abreviatura real que da `Intl` para setiembre (puede ser `set` o `sept`) y la usa de valor esperado.
- AC6 *(auto)*: `lib/whatsapp.test.ts` conserva los casos actuales de `buildWhatsAppUrl`; `home-page.tsx` importa de `@/lib/whatsapp`; no queda `modules/home/utils/whatsapp*`.

### Datos
- AC7 *(db)*: `getBookingVoucher(code, customerId)` del dueño devuelve el DTO con código, `status`, `paxCount`, `totalCents`, paquete (`title`, `slug`, `coverImageUrl`, `durationDays`, `nights`, `meetingPoint`, `meetingLat`, `meetingLng`, `destinationName`), `startsAt`, viajeros (nombre, documento, tipo) y cobro; otro `customerId` (incluido un admin con otro id) → `null`; código bien formado inexistente → `null`; la respuesta ajena e inexistente es idéntica.
- AC8 *(db)*: código con formato inválido (`wy-4822`, `""`, `WY-1`, texto largo) → `null` sin lanzar y sin consultar.
- AC9 *(db)*: refleja el estado real: `pending`, `confirmed` y `cancelled` devuelven su `status`; con varios `payments` usa el más reciente (`created_at`); sin `payments` → `chargedUsdCents: null`; sin coordenadas → `meetingLat/Lng: null`. Sin escrituras.

### Checkout
- AC10 *(auto)*: `createCheckout` pasa `successUrl` `${appUrl}/confirmacion/WY-4822` (sin `?reserva=`); `cancelUrl` no cambia. Los fixtures de `successUrl` de `checkout-session.test.ts` y `checkout-session-service.test.ts` usan la URL nueva y siguen en verde.

### UI
- AC11 *(visual)*: `confirmed`, escritorio: encabezado superpuesto y transparente sobre el hero; check 84 `accent` con anillo; `h1` "¡Tu viaje está confirmado!" con la medida del tablero; subtítulo D20; ticket solapado ~110 px sobre el hero, con foto, eyebrow "<Destino> · N días · N noches", título, Salida (`Jue 5 nov 2026`), Viajeros (`2 viajeros`), Total pagado (`S/ 2 580`), talón con "Código de reserva" `WY-####`, "Descargar voucher" y "Ver detalles" (enlace a `/paquetes/<slug>`); muescas visibles. Medidas dentro de ±1 px respecto de la tabla "Fidelidad".
- AC12 *(visual)*: móvil 390 px: hero 440, solapa 64, ticket apilado (talón con borde superior punteado y sin muescas), sin scroll horizontal; ningún dato inventado (sin "Regreso", "Pagado", "Agregar al calendario").
- AC13 *(visual)*: sección "Viajeros": nombre completo, tipo y documento enmascarado (`DNI ****5678`) del viajero principal y la etiqueta "Principal"; ubicada tras el ticket y antes del punto de encuentro; un viajero (el principal) al pagar.
- AC14 *(visual)*: "Punto de encuentro" con `meeting_point` y coordenadas: mapa Leaflet real centrado en el punto con marcador y tooltip "Te esperamos aquí · <hora de salida en Lima>", zoom con botones de 44 px, atribución visible; "Dónde" = `meeting_point`; "Cuándo" = fecha larga + hora; "Cómo llegar" abre Google Maps y "Abrir en Waze" abre Waze con `lat,lng` exactos, ambos en pestaña nueva con `rel="noopener noreferrer"`. Sin `meeting_lat/lng`: sin mapa y sin botones (solo el texto). `meeting_point` nulo: "Por confirmar". No aparecen "Cómo reconocernos", "Llega 15 minutos antes", ni el aviso del hotel.
- AC15 *(visual)*: "Qué sigue" con los 3 pasos del copy D20 (sin promesa de correo ni WhatsApp), ayuda por WhatsApp con enlace `wa.me/<número>?text=…<código>` (con `NEXT_PUBLIC_WHATSAPP_NUMBER` válido; sin número, el bloque no aparece) y "Seguir explorando paquetes →" a `/paquetes`.
- AC16 *(visual)*: "Descargar voucher" abre el diálogo de impresión; en la vista previa se ven solo el ticket (con el código, sin los dos botones, sin sombra ni solapa), el viajero principal y el texto del punto de encuentro; no se ven encabezado, pie, hero, mapa, botones de ruta, "Qué sigue" ni ayuda; el total conserva el color.
- AC17 *(visual)*: reserva ajena, inexistente o código mal formado → la 404 de la app, idéntica en los tres casos; sin sesión, redirige a ingresar (proxy) y vuelve; un admin que no es dueño recibe 404.
- AC18 *(visual)*: `pending`: sin hero ni voucher; encabezado sólido; `h1` "Estamos confirmando tu pago" + `StatusBadge` pendiente (`role="status"`); al pasar la reserva a `confirmed` (webhook o `UPDATE` manual) aparece el voucher en ≤ 3 s sin intervención; ~1 request RSC cada 3 s, se detiene tras 20; tras el tope aparece el texto de demora + "Actualizar"; al salir de la página no quedan intervalos.
- AC19 *(visual)*: `cancelled`: aviso `CheckoutNotice` con el copy D20 y "Ver paquetes"; si el último `payment` es `refunded`/`partially_refunded` agrega "Te reembolsamos el pago."; sin hero, ticket, viajeros ni mapa.
- AC20 *(visual)*: el cambio de layout no rompe nada: `/`, `/paquetes`, `/ofertas` conservan encabezado superpuesto/sólido como antes; `/pago` y `/cuenta` siguen con encabezado sólido y contenido a 1240/24.
- AC21 *(visual)*: 390 px y 1280 px: sin scroll horizontal; objetivos ≥ 44 px (incluye zoom del mapa); foco visible; con `prefers-reduced-motion` no hay `wy-pop` ni `wy-up` ni transiciones; contraste AA (texto blanco sobre el hero con degradado; tooltip y botones); el mapa es operable con teclado; un `h1` por vista.
- AC22 *(visual)*: recorrido real (claves de prueba, `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, tarjeta `4242 4242 4242 4242`): pagar en `/pago` → Stripe → `/confirmacion/WY-…` → `pending` breve y luego voucher completo; la URL vieja `/confirmacion?reserva=WY-…` da 404.

### Arquitectura
- AC23 *(auto)*: revisión/`grep`: (a) `"use client"` solo en `confirmation-refresher.tsx`, `print-voucher-button.tsx`, `meeting-point-map.tsx` y `meeting-point-map-canvas.tsx`; (b) `page.tsx` delgada, `params` esperado dentro de `ConfirmationPage`; (c) sin `"use cache"` en lo nuevo; (d) `checkout` solo importa de `@/modules/bookings`, `@/modules/packages`, `@/modules/users` por su `index.ts`, y de `@/lib/whatsapp`; ningún módulo importa de `modules/home/utils`; (e) `lib/db` no se importa desde `checkout`; (f) `proxy.ts` sin cambios; (g) `package.json` sin cambios; (h) ningún `console.*` imprime documento, correo ni teléfono; (i) `(public)/layout.tsx` y `(customer)/layout.tsx` usan `SiteShell`.

## Contracts

### URL
```
/confirmacion/<code>           code = ^WY-\d{4}$
success_url: ${NEXT_PUBLIC_APP_URL}/confirmacion/WY-####
```

### `lib/whatsapp.ts` (movido, sin cambios de firma)
```ts
export function buildWhatsAppUrl(number: string | undefined, message: string): string | null;
```

### `components/shared/site-shell.tsx`
```tsx
// Server Component. Contenido actual de app/(public)/layout.tsx:
// <div className="group/shell relative flex flex-1 flex-col">
//   <div className="contents print:hidden"><SiteHeader /></div>
//   <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 group-has-[[data-page-hero]]/shell:max-w-none group-has-[[data-page-hero]]/shell:px-0">{children}</main>
//   <div className="contents print:hidden"><SiteFooter /></div>
// </div>
export function SiteShell({ children }: { children: React.ReactNode }): JSX.Element;
// app/(public)/layout.tsx y app/(customer)/layout.tsx: `return <SiteShell>{children}</SiteShell>;`
```

### `app/globals.css` (agrega)
```css
@keyframes wy-pop { 0% { opacity: 0; transform: scale(.6); } 60% { opacity: 1; transform: scale(1.08); } 100% { transform: scale(1); } }
```

### `modules/packages` (extiende)
```ts
// utils/package-detail.ts
export function formatDepartureShortDate(d: Date): string; // "Jue 5 nov 2026" (Lima)
// index.ts: export { formatDepartureShortDate } junto a formatDepartureDate/Time.
```

### `modules/bookings` (extiende)
```ts
// types/voucher.ts
import type { bookingStatus, docType, paymentStatus } from "@/lib/db/schema/enums";

export type BookingVoucherDto = {
  id: string;
  code: string; // WY-####
  status: (typeof bookingStatus.enumValues)[number]; // pending | confirmed | cancelled
  paxCount: number;
  totalCents: number; // PEN
  startsAt: Date; // departures.starts_at
  package: {
    slug: string; title: string; coverImageUrl: string | null;
    durationDays: number; nights: number;
    meetingPoint: string | null;
    meetingLat: number | null; meetingLng: number | null;
    destinationName: string;
  };
  travelers: {
    firstName: string; lastName: string;
    docType: (typeof docType.enumValues)[number]; docNumberMasked: string; // ****5678 (últimos 4), nunca el número completo
    isPrimary: boolean;
  }[]; // principal primero
  chargedUsdCents: number | null; // D10
  paymentStatus: (typeof paymentStatus.enumValues)[number] | null; // último payment
};

// utils/voucher.ts (puras; no importan lib/db)
export const BOOKING_CODE_PATTERN = /^WY-\d{4}$/;
export function isBookingCode(code: string): boolean;
export type VoucherRow = { /* columnas del join booking+package+destination+departure */ };
export function toVoucherDto(
  row: VoucherRow,
  travelers: VoucherTravelerRow[], // filas crudas (con docNumber): la máscara D9 se aplica aquí dentro
  payment: { status: BookingVoucherDto["paymentStatus"]; amountCents: number } | null,
): BookingVoucherDto;

// services/voucher-service.ts  (sin caché, solo lectura)
// 1) isBookingCode -> si no, null. 2) SELECT bookings JOIN packages JOIN destinations JOIN departures
//    WHERE bookings.code = $code AND bookings.customer_id = $customerId LIMIT 1 (D1).
// 3) travelers (ORDER BY is_primary DESC) y último payment (ORDER BY created_at DESC LIMIT 1) en paralelo.
export async function getBookingVoucher(code: string, customerId: string): Promise<BookingVoucherDto | null>;

// index.ts (agrega)
export { getBookingVoucher } from "./services/voucher-service";
export type { BookingVoucherDto } from "./types/voucher";
```

### `modules/checkout` (extiende)
```ts
// utils/meeting-links.ts (puras)
export function buildMapLinks(
  lat: number | null | undefined, lng: number | null | undefined,
): { google: string; waze: string } | null; // D17
```
```tsx
// components/confirmation-page.tsx  (Server Component)
// Shell: <Suspense fallback={<CheckoutSkeleton/>}>; dentro: await params, requireRole("customer")
// (AuthError -> notFound()), getUserByClerkId (null -> notFound()), getBookingVoucher (null -> notFound()).
// confirmed -> <ConfirmationHero/> + <main-like container> [BookingVoucher, ConfirmationMeeting,
//   ConfirmationNextSteps, ConfirmationHelp, enlace "Seguir explorando paquetes →"]
// pending   -> contenedor normal: h1 + StatusBadge + texto + <ConfirmationRefresher/>
// cancelled -> contenedor normal: <CheckoutNotice/> (D20)
export function ConfirmationPage({ params }: { params: Promise<{ code: string }> }): JSX.Element;

// components/confirmation-hero.tsx   (presentacional; <PageHero> con foto, check, h1, subtítulo)
export function ConfirmationHero({ coverImageUrl }: { coverImageUrl: string | null }): JSX.Element;

// components/booking-voucher.tsx     (presentacional: ticket + sección "Viajeros")
export function BookingVoucher({ voucher }: { voucher: BookingVoucherDto }): JSX.Element;

// components/print-voucher-button.tsx ("use client"): <Button variant="cta"> + Download; onClick = window.print()
export function PrintVoucherButton(): JSX.Element;

// components/confirmation-meeting.tsx (presentacional: "Punto de encuentro", datos + botones; usa MeetingPointMap)
export function ConfirmationMeeting(props: {
  meetingPoint: string | null; lat: number | null; lng: number | null; startsAt: Date;
}): JSX.Element;

// components/meeting-point-map.tsx   ("use client"; dynamic ssr:false con placeholder del mismo alto)
// components/meeting-point-map-canvas.tsx ("use client"; react-leaflet)
export function MeetingPointMap(props: { lat: number; lng: number; label: string; time: string }): JSX.Element;

// components/confirmation-next-steps.tsx (estático; copy D20)
export function ConfirmationNextSteps(): JSX.Element;

// components/confirmation-help.tsx (estático; recibe el href ya construido)
export function ConfirmationHelp({ href }: { href: string }): JSX.Element;

// components/confirmation-refresher.tsx  ("use client")
// setInterval 3000 ms -> router.refresh(); tope 20 intentos (D6); luego muestra el texto de demora + "Actualizar".
export function ConfirmationRefresher(): JSX.Element;

// index.ts (agrega)
export { ConfirmationPage } from "./components/confirmation-page";
```
`ConfirmationPage` calcula `buildWhatsAppUrl(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, "Hola Wayra, necesito ayuda con mi reserva <code>.")` y renderiza `ConfirmationHelp` solo si no es `null`.

### Ruta
```tsx
// app/(customer)/confirmacion/[code]/page.tsx  (delgada)
export const metadata = { title: "Reserva confirmada", robots: { index: false } };
export default function Page({ params }: { params: Promise<{ code: string }> }) {
  return <ConfirmationPage params={params} />;
}
```

### `success_url` (`modules/checkout/services/checkout-service.ts`)
```ts
successUrl: `${appUrl}/confirmacion/${booking.code}`,   // antes: `${appUrl}/confirmacion?reserva=${booking.code}`
```

## Edge cases
- **Webhook antes/después del redirect:** Stripe redirige al `success_url` y el webhook llega en segundos; `pending` → refresco (D6). Sin cupo, 015 cancela y reembolsa; la página lo muestra (AC19).
- **Otro usuario con el código:** `WY-####` es adivinable; D1 lo bloquea en el query. Ajena/inexistente/mal formada dan lo mismo. Admin sin ser dueño → 404.
- **Usuario sin fila en `users`:** 404 (D3); casi imposible tras haber pagado.
- **`pending` abandonado:** la URL de una reserva `pending` vieja muestra el estado de espera ≤ 60 s y luego el aviso de demora; 015 la cancela al vencer la Session.
- **Pestaña en segundo plano:** el navegador puede frenar el intervalo; el tope cuenta intentos, no reloj. "Actualizar" siempre disponible tras el tope.
- **Sin `cover_image_url`:** hero `bg-dark` liso y foto del ticket `bg-sand`; el texto sigue legible.
- **`meeting_point` nulo / coordenadas nulas:** "Por confirmar"; sin mapa ni botones de ruta. Coordenadas con solo una de las dos: se tratan como ausentes (`buildMapLinks` → `null`).
- **Coordenadas fuera de rango:** se pasan tal cual a Leaflet (el dato lo valida el operador); no se corrige.
- **Mapa sin JS / cargando:** placeholder `bg-sand` del mismo alto (sin CLS); los botones de ruta y el texto no dependen de Leaflet.
- **Salida pasada:** igual se muestra el voucher.
- **Otros viajeros:** al pagar solo existe el principal; la sección muestra solo a quien existe y no avisa de datos faltantes (completarlos es otra tarjeta; Q6).
- **Impresión:** `print:` oculta lo no esencial; el mapa no se imprime (Leaflet no renderiza bien en impresión).
- **Datos personales:** documento enmascarado (últimos 4) y visible solo para el dueño; no se loguea ni se devuelve en errores.
- **Zona horaria:** fecha y hora en Lima aunque el servidor esté en UTC.
- **Crédito de fotos:** el pie global conserva el crédito general de las fotos del seed; no hay crédito por foto de portada (D12 de 014/home sigue pendiente de `package_images.credit`).
- **Compatibilidad:** quien tenga abierta la URL vieja `/confirmacion?reserva=…` de un pago iniciado antes del deploy recibe 404 (ventana ≤ 31 min por Session; aceptado).
- **Idioma:** español con tildes; dinero con `formatPen`/`formatUsd`.

## Tests
Vitest ya instalado (`include: **/*.test.ts`; los componentes `.tsx` no se testean, SETUP §3). Los *(auto)* corren con `npm test`; los *(db)* con `npm run test:db`, omitidos sin `DATABASE_URL` (`describe.skipIf`, `await import()` dentro del bloque, fixtures con ids propios borradas en `afterAll`, FKs en orden: payments → travelers → bookings → departures). Usuarios de prueba: `seed_customer_01` y un segundo usuario insertado en el test (o un admin del seed). AC11–AC22 son manuales con Playwright a cargo del orquestador.

- `modules/bookings/utils/voucher.test.ts` — AC2, AC3.
- `modules/bookings/services/voucher-service.test.ts` *(db)* — AC7, AC8, AC9 (dueño / otro usuario / admin ajeno / inexistente; formatos inválidos; estados, último payment, sin payment, sin coordenadas).
- `modules/checkout/utils/meeting-links.test.ts` — AC4.
- `modules/packages/utils/package-detail.test.ts` — AC5 (se agregan casos de `formatDepartureShortDate`).
- `lib/whatsapp.test.ts` — AC6 (movido de `modules/home/utils/whatsapp.test.ts`, mismos casos).
- `modules/checkout/services/checkout-service.test.ts` — AC10 (expectativa de `successUrl`).
- `modules/payments/utils/checkout-session.test.ts` y `modules/payments/services/checkout-session-service.test.ts` — AC10 (solo los fixtures de `successUrl`).
- AC1 y AC23 los verifica el reviewer con `tsc`, `lint`, `test`, `build`, `git diff proxy.ts package.json` y `grep`.

## Plan
Cada fase deja `tsc` + `lint` + `test` en verde y la app funcionando. Los archivos compartidos (`index.ts` de módulo, `globals.css`, layouts, `components/shared`, `lib/*`) van en tareas *setup* al inicio de su fase. Tareas de una misma fase no comparten archivos. La fase 5 (cambio de `success_url`) va al final para no apuntar a una ruta inexistente.

### Phase 1 — Datos del voucher (`bookings`)
Entrega: `getBookingVoucher` con control de dueño, DTO, mapper y validación del código, exportados por `bookings`.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `BookingVoucherDto`, `isBookingCode`, `toVoucherDto` + test | modules/bookings/types/voucher.ts, modules/bookings/utils/voucher.ts, modules/bookings/utils/voucher.test.ts | - | A | AC2, AC3 | todo |
| T2 | `getBookingVoucher` (query con dueño) + test *(db)* + exports del módulo | modules/bookings/services/voucher-service.ts, modules/bookings/services/voucher-service.test.ts, modules/bookings/index.ts | T1 | B | AC1, AC7, AC8, AC9 | todo |

### Phase 2 — Piezas compartidas (layout, WhatsApp, fecha corta)
Entrega: layout `(customer)` listo para hero superpuesto, `buildWhatsAppUrl` en `lib`, `formatDepartureShortDate`, keyframe `wy-pop`. Sin cambios visibles en las pantallas existentes. (~13 archivos: sobre el tope; son cambios mecánicos e independientes.)

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T3 | setup: `SiteShell` + ambos layouts + keyframe `wy-pop` | components/shared/site-shell.tsx, app/(public)/layout.tsx, app/(customer)/layout.tsx, app/globals.css | - | A | AC1, AC20, AC23 | todo |
| T4 | setup: mover `buildWhatsAppUrl` a `lib/whatsapp.ts` (con su test) y actualizar `home-page.tsx` | lib/whatsapp.ts, lib/whatsapp.test.ts, modules/home/utils/whatsapp.ts, modules/home/utils/whatsapp.test.ts, modules/home/components/home-page.tsx | - | A | AC1, AC6 | todo |
| T5 | setup: `formatDepartureShortDate` + test + export de `packages` | modules/packages/utils/package-detail.ts, modules/packages/utils/package-detail.test.ts, modules/packages/index.ts | - | A | AC1, AC5 | todo |

(`modules/home/utils/whatsapp*.ts` se borran/mueven: figuran en `Owns` de T4.)

### Phase 3 — Componentes de la pantalla
Entrega: hero, ticket + viajeros, mapa y punto de encuentro, "Qué sigue" y ayuda, enlaces de ruta, todo testeado donde hay lógica y listo para componer.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T6 | `buildMapLinks` + test | modules/checkout/utils/meeting-links.ts, modules/checkout/utils/meeting-links.test.ts | - | A | AC4 | todo |
| T7 | `MeetingPointMap` (wrapper `dynamic ssr:false`) y canvas Leaflet | modules/checkout/components/meeting-point-map.tsx, modules/checkout/components/meeting-point-map-canvas.tsx | - | A | AC14, AC21 | todo |
| T8 | `BookingVoucher` (ticket + viajeros) y `PrintVoucherButton` | modules/checkout/components/booking-voucher.tsx, modules/checkout/components/print-voucher-button.tsx | T2, T3, T5 | A | AC11, AC12, AC13, AC16, AC21 | todo |
| T9 | `ConfirmationHero`, `ConfirmationNextSteps`, `ConfirmationHelp` | modules/checkout/components/confirmation-hero.tsx, modules/checkout/components/confirmation-next-steps.tsx, modules/checkout/components/confirmation-help.tsx | T3, T4 | A | AC11, AC15, AC16, AC21 | todo |
| T10 | `ConfirmationMeeting` (datos, mapa, botones de ruta) | modules/checkout/components/confirmation-meeting.tsx | T5, T6, T7 | B | AC14, AC16, AC21 | todo |

### Phase 4 — Ruta `/confirmacion/[code]`
Entrega: la página completa con dueño, estados y refresco, conectada a todo lo anterior.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T11 | `ConfirmationRefresher` (cliente, 3 s, tope 20, "Actualizar") | modules/checkout/components/confirmation-refresher.tsx | - | A | AC18, AC21, AC23 | todo |
| T12 | `ConfirmationPage` (shell, Suspense, dueño, estados), export en `index.ts` y ruta delgada | modules/checkout/components/confirmation-page.tsx, modules/checkout/index.ts, app/(customer)/confirmacion/[code]/page.tsx | T2, T8, T9, T10, T11 | B | AC1, AC11, AC17, AC18, AC19, AC23 | todo |

### Phase 5 — `success_url` hacia la nueva ruta
Entrega: Stripe vuelve a `/confirmacion/<code>`.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T13 | `success_url` `/confirmacion/${code}` + ajustar test y fixtures | modules/checkout/services/checkout-service.ts, modules/checkout/services/checkout-service.test.ts, modules/payments/utils/checkout-session.test.ts, modules/payments/services/checkout-session-service.test.ts | T12 | A | AC1, AC10, AC22 | todo |

### Verificación (orquestador, tras T12 y T13; no es tarea de developer)
Con `.env.local` (DB sembrada, Clerk, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` de prueba, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `PEN_PER_USD=3.75`): `npm run build && npm start`; reservas propias en cada estado (`pending`, `confirmed`, `cancelled`; con y sin `meeting_point`/coordenadas; payment `succeeded` y `refunded`); Playwright a 390×844 y 1280×800 sobre AC11–AC21 con tabla "elemento | tablero | antes | después" para el PR; comprobar a mano `/`, `/paquetes`, `/pago`, `/cuenta` (AC20); vista previa de impresión (AC16); recorrido AC22 con `stripe listen`; `npm run test:db`. Capturas y resultado al PR.

## Open questions
Q1 (fidelidad del tablero) quedó cerrada con las decisiones 2–6 y la tabla "Fidelidad". Siguen con su default; el humano puede cambiarlas al aprobar.
- **Q2 (cerrada).** Documento enmascarado (`****5678`) en el servidor; ver D9.
- **Q3 (default: 3 s, tope 20 intentos ≈ 60 s, luego "Actualizar").** Ajustable por constantes en `confirmation-refresher.tsx`.
- **Q4 (default: "Por confirmar").** `packages.meeting_point` es nullable; el texto de reemplazo es propio (el tablero no lo cubre).
- **Q5 (default: sin enlace a `/mis-reservas`).** La ruta es de la 017; un enlace hoy sería muerto. "Seguir explorando paquetes →" va a `/paquetes`.
- **Q6 (default: sin aviso de datos faltantes de otros viajeros).** Con `pax_count` > viajeros registrados la sección solo lista a quien existe; avisar "faltan datos de N viajeros" sin una acción que los complete sería un callejón sin salida (se agrega con la tarjeta que los completa).
