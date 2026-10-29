# Reservas del admin (/admin/reservas)

- Module: bookings
- Status: approved
- Approved by: leandro291 (2026-10-29)
- Mode: SDD

## Goal
Tarjeta Trello 026 (Fase 5 · Panel admin). `admin` y `super_admin` ven en `/admin/reservas` todas las reservas de la plataforma (tabla, filtro por estado, orden y paginación de 023, más la columna Operador) y pueden **cancelar** una reserva `pending` o `confirmed` (liberando cupo y reembolsando por Stripe si estaba pagada). Reusa la tabla de 023 sin el filtro por operador.

## Scope
- In:
  - Ruta `/admin/reservas` + link "Reservas" en `ADMIN_NAV_LINKS`.
  - `AdminBookingsPage` (servidor): `requireRole("admin")` + `listBookings({ all: true }, query)`.
  - Reuso de `BookingsTable` / `BookingsStatusFilter` / `BookingsPagination` / `parseBookingListParams` / `buildBookingsHref` con `basePath = /admin/reservas`.
  - Parametrizar `BookingsTable`: columna opcional "Operador" y columna opcional de acciones por fila (D6).
  - Extraer de `OperatorBookingsPage` la vista común "filtro + tabla/vacío + paginación" (`BookingsListView`) para no duplicarla (D7).
  - `organizerName` en `BookingRowDto` (join a `organizers`).
  - **Cambio de estado = cancelar** (D1): `cancelBookingAsAdmin` (servicio), `cancelBookingAsAdminAction` (Server Action, valida con Zod y rol en servidor) y botón con diálogo de confirmación en la fila.
  - Núcleo de cancelación compartido con la cancelación del cliente (017): se extrae, no se copia (D4).
- Out:
  - Cualquier otra transición: `pending -> confirmed` manual, reabrir `cancelled`, `confirmed -> pending`, editar monto/pax/viajeros/contacto (D1, preguntas abiertas).
  - Reembolsos parciales o con monto retenido; reembolso de pagos fuera de Stripe (`cash`/Yape/Plin no existen en v1).
  - Filtro/búsqueda por operador, cliente, código, paquete o fechas; exportar; vista de detalle de pagos.
  - Auditoría de quién canceló (no hay tabla ni columna; ver preguntas) y notificaciones al cliente (la v1 no envía correo ni WhatsApp, SYSTEM-DESIGN).
  - Cambios al webhook de Stripe, al schema de BD, migraciones, dependencias npm y componentes shadcn nuevos (`table` y `alert-dialog` ya están instalados).
  - Cancelación en lote.

## Decisiones a aprobar
- **D1. "Cambio de estado" = cancelar.** `booking_status` = `pending | confirmed | cancelled`. Las únicas transiciones del admin son `pending -> cancelled` y `confirmed -> cancelled`. `cancelled` es terminal. `pending -> confirmed` no se ofrece: la confirmación es del webhook (pago, cupo y estado en una transacción) y confirmar a mano rompería el invariante "confirmed implica pago `succeeded` y cupo descontado". `confirmed -> pending` no tiene sentido.
- **D2. Reglas del admin (`adminCancelBlock`, función pura).** Cancelable si `pending` (cualquier estado de salida), o `confirmed` con salida `scheduled` o `cancelled` (caso típico: el operador canceló la salida y hay que devolver el dinero). Salida `en_route`/`completed` -> `not_cancellable`. **Sin ventana de 48 h**: el admin puede cancelar y reembolsar después (el cliente no, 017 D1). Reembolso **total** siempre (no hay dato de monto retenido, igual que 017 D1).
- **D3. Efectos por transición** (una transacción con `SELECT … FOR UPDATE` sobre la reserva, mismo patrón que `cancellation-service` y el webhook):
  - `pending -> cancelled`: `status = cancelled`, `cancelled_at = now()`. **No toca `booked_seats`** (el cupo se descuenta al confirmar, `booking-service` D6). Los `payments` en `pending` pasan a `failed`. Después del commit, `expireCheckoutSession(session)` (mejor esfuerzo, ya no lanza) para cada pago que estaba `pending`, así el cliente no puede pagar una reserva cancelada. No hay reembolso.
  - `confirmed -> cancelled`: exactamente lo de `cancelBooking` (017 D3/D6/D8): `booked_seats = GREATEST(booked_seats - pax, 0)`, `status = cancelled`, último pago con `pi_…` en `refunded` con `refunded_cents = amount_cents`, y `refundPaymentIntent(pi, "refund-cancel:" + payment.id)` como último paso (si lanza, rollback total y `refund_failed`). Sin pago refundable -> `no_refundable_payment`, sin escrituras.
- **D4. Núcleo compartido (DRY).** `cancellation-service.ts` se refactoriza: una función interna `cancelWhere(filter, policy, now)` con el cuerpo de la transacción; `cancelBooking(code, customerId, now)` (cliente: `WHERE code AND customer_id`, `cancelBlock` con ventana 48 h, solo `confirmed`) y `cancelBookingAsAdmin(code)` (`WHERE code`, `adminCancelBlock`, `pending` o `confirmed`) son dos envoltorios finos. El comportamiento y los tests de 017 no cambian (AC9). La misma `idempotencyKey` por pago hace que cliente y admin compitiendo den un solo reembolso; el candado de fila serializa: el segundo ve `cancelled` -> `alreadyCancelled`.
- **D5. Idempotencia con el webhook de Stripe (sin cambiar el webhook).**
  - `checkout.session.completed` llega después de que el admin canceló una `pending`: `onCompleted` ve la reserva `cancelled` (el pago quedó `failed`, no está en `succeeded/refunded`) y entra al camino "sin cupo o booking cancelado": `markPaymentRefundedInFull` + reembolso total con `refund-no-seat:<payment.id>`. Dinero devuelto, cupo intacto.
  - `charge.refunded` tras el reembolso del admin: `onChargeRefunded` usa `max(refunded_cents, min(amount_refunded, amount))`; como D3 ya dejó `refunded_cents = amount_cents`, no hay cambio (mismo análisis que 017 D5).
  - `checkout.session.expired` (por el `expire` de D3): `onExpired` ve la reserva no `pending` y retorna.
  - Webhook confirmando mientras el admin cancela: ambos piden el candado de la reserva; el que llega segundo ve el estado ya cambiado y toma su camino idempotente (el admin pasa por `confirmed` y reembolsa).
- **D6. Parametrizar `BookingsTable`, no duplicarla.** Dos props opcionales, sin lógica de rol dentro: `showOrganizer?: boolean` (columna "Operador" después de "Paquete", muestra `organizerName`) y `renderActions?: (row: BookingRowDto) => ReactNode` (columna "Acciones" al final, con `th` sr-only o "Acciones"). Sin las props, la tabla del operador sale idéntica (AC16). `renderActions` es una función: no puede pasarse de un Server Component a uno cliente, por eso `AdminBookingsTable` es un wrapper `"use client"` que la define y renderiza `BookingsTable` (cliente -> cliente, permitido). La tabla sigue sin importar sesión, `organizers` ni acciones de servidor.
- **D7. `BookingsListView` (servidor).** Hoy `OperatorBookingsPage` contiene el flujo: estado vacío global -> filtro -> (vacío por filtro | tabla + paginación) y un `EmptyCard`. Se extrae a `BookingsListView({ result, query, basePath, emptyTitle, emptyText, table })` donde `table` es un `ReactNode` ya armado por quien llama (el operador pasa `<BookingsTable>`, el admin `<AdminBookingsTable>`). `OperatorBookingsPage` queda con el caso "sin perfil de operador", la consulta y esta vista; comportamiento sin cambios (AC13).
- **D8. `organizerName` en el DTO.** `BookingRowDto.organizerName: string` = `organizers.business_name` del paquete (`packages.organizer_id`, FK no nula, `innerJoin`). Se une siempre (también para el operador, que lo ignora): un solo `listBookings`, sin variantes por alcance. El mapper `toBookingRowDto` y `BookingRow` ganan el campo.
- **D9. Autorización en tres capas, sin confiar en el cliente.**
  1. `proxy.ts` ya exige `admin` o superior en `/admin(.*)` (redirige a `/`). `customer` y `organizer` nunca llegan.
  2. `AdminBookingsPage` hace `await requireRole("admin")` **antes** de leer nada (D6 de 025: el layout no bloquea). `super_admin` pasa por la jerarquía de `lib/auth/roles.ts`.
  3. `cancelBookingAsAdminAction` hace `requireRole("admin")` en el servidor; el rol sale del token, nunca de un argumento. Un `customer`/`organizer` que invoque la acción directamente recibe `FORBIDDEN` -> mensaje de permiso, sin llamar al servicio.
  - **El alcance `{ all: true }` es un literal en `AdminBookingsPage`**, nunca derivado de `searchParams`: `parseBookingListParams` solo lee `estado/orden/dir/pagina` y descarta cualquier otra clave (`?organizerId=`, `?all=`). Y la página solo se monta detrás de `requireRole`.
- **D10. Datos personales.** La tabla muestra `doc_number` completo, email y teléfono (ERM: `admin`/`super_admin` tienen RU sobre `bookings`/`booking_travelers` y R sobre `payments`). Página dinámica sin `"use cache"`; no se loguean viajeros ni contacto; los `console.error` de la acción llevan solo el código `WY-####` (como 017).
- **D11. Invalidación.** Tras cancelar con éxito: `revalidatePath("/admin/reservas")`, `revalidatePath("/mis-reservas")`, `revalidatePath("/confirmacion/<code>")` y `updateTag(CACHE_TAGS.departures)` (el cupo cambió), igual que la acción del cliente. `/admin` (KPIs) es dinámico y no requiere invalidación.
- **D12. Copy admin.** Los mensajes de error de `cancelErrorMessage` hablan al cliente ("Escríbenos…", "gratis"). El admin usa `adminCancelErrorMessage` propio. Textos en la sección Contracts.

## Reuse
- Reuse: `modules/bookings` — `listBookings` (rama `{ all: true }` ya implementada y probada en 023, AC7), `BookingsStatusFilter`, `BookingsPagination`, `parseBookingListParams`, `buildBookingsHref`, `BOOKING_STATUS_FILTERS`, `PAYMENT_BADGE`, `DOC_TYPE_LABELS`.
- Reuse: `modules/payments` — `refundPaymentIntent` (idempotente) y `expireCheckoutSession`; ya exportados por su `index.ts`. El webhook no cambia.
- Reuse: `lib/auth/require-role.ts` (`requireRole`, `AuthError`) y `lib/auth/roles.ts`; `proxy.ts` ya protege `/admin(.*)`.
- Reuse: `components/shared/confirm-action-dialog.tsx` (`pendingLabel`/`dismissLabel` ya existen, 017), `components/shared/status-badge.tsx`, `components/shared/page-skeleton.tsx`, `components/ui/{table,alert-dialog,button}`; `AdminShell` y `ADMIN_NAV_LINKS` de 025.
- Reuse (patrón): `actions/cancel-booking-action.ts` (+ test) — Zod con `BOOKING_CODE_PATTERN`, `ActionResult`, revalidación, log mínimo; `components/cancel-booking-button.tsx` — disparador del diálogo.
- Extend: `modules/bookings/services/cancellation-service.ts` — núcleo `cancelWhere` + `cancelBookingAsAdmin` (D4).
- Extend: `modules/bookings/utils/cancellation.ts` — `adminCancelBlock`, `adminCancelErrorMessage` (junto a `cancelBlock`/`cancelErrorMessage`).
- Extend: `modules/bookings/components/bookings-table.tsx` — props `showOrganizer`, `renderActions` (D6).
- Extend: `modules/bookings/components/operator-bookings-page.tsx` — pasa a usar `BookingsListView` (D7).
- Extend: `modules/bookings/types/booking-list.ts`, `utils/booking-list-view.ts`, `services/booking-list-service.ts` — `organizerName` (D8).
- Extend: `modules/admin/components/admin-nav-links.ts` — link "Reservas"; `modules/bookings/index.ts` — exports `AdminBookingsPage`.
- New: `modules/bookings/components/bookings-list-view.tsx` — la lógica común vive hoy dentro de `OperatorBookingsPage`; sin extraerla habría que copiarla.
- New: `modules/bookings/components/admin-bookings-table.tsx`, `admin-cancel-booking-button.tsx`, `admin-bookings-page.tsx` — piezas específicas del admin; no encajan en `modules/admin` porque el dominio es reservas (el módulo `admin` solo compone el shell, 025).
- New: `modules/bookings/actions/admin-cancel-booking-action.ts` — la acción del cliente exige rol `customer` y resuelve `customer_id`; no sirve.
- New: `app/(admin)/admin/reservas/page.tsx` — ruta (solo routing).
- No se reutiliza: `cancelBlock` (ventana 48 h solo `confirmed + scheduled`), `cancelBookingAction` (rol `customer`), `cancelPendingBooking` de `booking-service` (no reembolsa ni expira la sesión de Stripe; es la compensación del checkout).

## Acceptance criteria

### Utilidades puras
- AC1: `adminCancelBlock({ status, departureStatus })` devuelve `null` para `pending` con cualquier `departureStatus`, y para `confirmed` con `scheduled` o `cancelled`; devuelve `"not_cancellable"` para `confirmed` con `en_route`/`completed` y para `cancelled`. No depende de la hora (sin ventana de 48 h).
- AC2: `adminCancelErrorMessage(code)` devuelve un texto no vacío, sin tuteo al cliente ni "gratis", para `not_found`, `not_cancellable`, `no_refundable_payment` y `refund_failed`.

### Servicio (`cancelBookingAsAdmin(code, now?)`)
- AC3: reserva `confirmed` con salida `scheduled` y pago `succeeded` con `pi_…` de **cualquier cliente y operador**: queda `cancelled` con `cancelled_at`, `booked_seats` baja `pax_count` (nunca bajo 0), el pago queda `refunded` con `refunded_cents = amount_cents`, y `refundPaymentIntent` se llama una vez con `("pi_…", "refund-cancel:<payment.id>")`. Funciona a menos de 48 h de la salida.
- AC4: `confirmed` con salida `cancelled` también cancela y reembolsa (AC3); con salida `en_route`/`completed` devuelve `not_cancellable` sin escrituras ni Stripe.
- AC5: `pending`: queda `cancelled` con `cancelled_at`; `booked_seats` no cambia; sus `payments` en `pending` pasan a `failed`; no se llama `refundPaymentIntent`; tras el commit se llama `expireCheckoutSession` una vez por cada pago que estaba `pending` (no se llama si el commit falla). Sin pagos: cancela igual.
- AC6: reserva ya `cancelled` -> `{ ok: true, alreadyCancelled: true, refundedUsdCents: 0 }` sin Stripe ni cambio de cupo. Dos llamadas simultáneas (o admin + cliente) a una `confirmed` producen un solo reembolso y un solo descuento de cupo.
- AC7: `confirmed` sin pago refundable (ninguno con `pi_…`, o el último con `pi_…` en `pending`/`failed`/`partially_refunded`) -> `no_refundable_payment` sin escrituras. Si `refundPaymentIntent` lanza -> rollback total y `refund_failed`; un reintento posterior cancela. Pago ya `refunded` (el webhook ganó) -> cancela y libera cupo sin llamar a Stripe.
- AC8: código inexistente o mal formado -> `not_found`.
- AC9: `cancelBooking(code, customerId, now)` (cliente) conserva su contrato: solo su `customer_id` (reserva ajena = `not_found`), solo `confirmed + scheduled`, ventana de 48 h, y los tests actuales de `cancellation-service.test.ts` y `cancel-booking-action.test.ts` siguen en verde sin cambios de aserciones.

### Acción
- AC10: `cancelBookingAsAdminAction(code)` valida el código con Zod (`BOOKING_CODE_PATTERN`) antes de cualquier otra cosa (inválido -> `{ ok:false, message }` sin llamar a `requireRole` ni al servicio); llama `requireRole("admin")`; `AuthError("UNAUTHENTICATED")` -> mensaje de sesión; `AuthError("FORBIDDEN")` -> "No tienes permiso para esta acción."; ambos sin llamar al servicio ni revalidar. La acción no recibe ni acepta rol, alcance ni id de cliente desde el cliente.
- AC11: éxito -> `{ ok: true }` y revalida `/admin/reservas`, `/mis-reservas`, `/confirmacion/<code>` y `updateTag(departures)`. `alreadyCancelled` también es `{ ok: true }` (misma revalidación). Falla del servicio -> `{ ok:false, message: adminCancelErrorMessage(code) }` sin revalidar. Excepción inesperada -> mensaje genérico y `console.error` solo con el código `WY-####`.

### Listado
- AC12: `listBookings` (ambos alcances) devuelve `organizerName` = `organizers.business_name` del paquete; `toBookingRowDto` lo copia. Filtros, orden, paginación y aislamiento de 023 (AC6–AC12 de `operator-bookings`) siguen verdes; con `{ all: true }` aparecen filas de al menos dos operadores con su propio `organizerName`.
- AC13: `OperatorBookingsPage` se comporta igual tras extraer `BookingsListView` (mensaje sin perfil, vacío global, vacío por filtro con "Ver todas", tabla + paginación, mismos textos).

### Ruta, página y navegación
- AC14: `/admin/reservas` existe (`metadata.title` "Reservas", `h1` "Reservas", `Suspense` con `PageSkeleton`) dentro del layout `(admin)`; `ADMIN_NAV_LINKS` queda `Resumen, Reservas` (`ClipboardList`), "Reservas" se marca activa (`aria-current="page"`) en esa ruta y "Resumen" no.
- AC15: `AdminBookingsPage` hace `await requireRole("admin")` antes de cualquier lectura, parsea `searchParams` con `parseBookingListParams` y llama `listBookings({ all: true }, query)` con el literal. `?organizerId=…`, `?all=…` o cualquier clave ajena no cambian el alcance ni el resultado. Como `customer`/`organizer`, `/admin/reservas` redirige a `/` (proxy); la página no emite datos si `requireRole` lanza.

### Tabla y acciones
- AC16: `BookingsTable` sin `showOrganizer` ni `renderActions` renderiza las mismas columnas que hoy (la tabla del operador no cambia). Con `showOrganizer` agrega "Operador" tras "Paquete"; con `renderActions` agrega "Acciones" al final, con el contenido que devuelve la función por fila; la fila expandible usa `colSpan` = total de columnas.
- AC17: en `/admin/reservas` las filas `pending` y `confirmed` muestran botón "Cancelar" (`aria-label="Cancelar reserva WY-####"`, objetivo ≥ 44 px) que abre `ConfirmActionDialog`: título "¿Cancelar la reserva WY-####?"; descripción según estado (`confirmed`: libera los lugares y reembolsa el pago completo al cliente; `pending`: no hay cobro que reembolsar y se cierra el pago pendiente); "Esta acción no se puede deshacer". Fila `cancelled`: sin botón. Éxito: el diálogo cierra y la fila pasa a "Cancelada" tras el refresco; error: el mensaje se muestra en el diálogo y no se cierra.
- AC18: el filtro de estado, el orden por columna y la paginación funcionan con `basePath = /admin/reservas` y conservan `estado/orden/dir`. Vacíos: "Aún no hay reservas" (sin ninguna) y "No hay reservas con este estado" + "Ver todas".
- AC19: accesibilidad: foco visible, badges con ícono + texto, objetivos ≥ 44 px, scroll horizontal interno en móvil (tabla más ancha por Operador y Acciones), sin animaciones nuevas.

### Verificación manual (fase 2, con `DATABASE_URL` y Stripe de prueba)
- AC20: (a) como `admin` y como `super_admin` se ven reservas de varios operadores; como `organizer` y `customer` `/admin/reservas` redirige a `/`. (b) Cancelar una `confirmed` pagada con tarjeta de prueba: el cupo de la salida sube, el Dashboard de Stripe muestra el reembolso total una sola vez y `/mis-reservas` del cliente la muestra cancelada y reembolsada. (c) Cancelar una `pending` con la sesión de Checkout abierta: la sesión queda expirada y no se puede pagar; si se simula un `checkout.session.completed` tardío, el webhook reembolsa y la reserva sigue cancelada. (d) Doble clic / segunda pestaña: un solo reembolso. (e) Revisar a 390 px.

## Contracts

### Estructura de archivos
```
modules/bookings/
  types/booking-list.ts                          (extiende: organizerName)
  utils/cancellation.ts (+ .test.ts)             (extiende: adminCancelBlock, adminCancelErrorMessage)
  utils/booking-list-view.ts (+ .test.ts)        (extiende: organizerName)
  services/cancellation-service.ts (+ .test.ts)  (refactor cancelWhere + cancelBookingAsAdmin)
  services/booking-list-service.ts (+ .test.ts)  (extiende: join organizers)
  actions/admin-cancel-booking-action.ts (+ .test.ts)
  components/bookings-table.tsx                  (extiende: showOrganizer, renderActions)
  components/bookings-list-view.tsx              (nuevo, servidor)
  components/operator-bookings-page.tsx          (usa BookingsListView)
  components/admin-cancel-booking-button.tsx     (nuevo, cliente)
  components/admin-bookings-table.tsx            (nuevo, cliente)
  components/admin-bookings-page.tsx             (nuevo, servidor)
  index.ts                                       (extiende)
modules/admin/components/admin-nav-links.ts      (link Reservas)
app/(admin)/admin/reservas/page.tsx
```

### `types/booking-list.ts`
```ts
export type BookingRowDto = {
  /* …campos actuales… */
  organizerName: string; // organizers.business_name del paquete
};
```
`utils/booking-list-view.ts`: `BookingRow` agrega `organizerName: string`; `toBookingRowDto` lo copia.

### `utils/cancellation.ts`
```ts
export type AdminCancelBlock = "not_cancellable";
// D2. null = se puede cancelar. Sin reloj: no hay ventana de 48 h para el admin.
export function adminCancelBlock(i: {
  status: BookingStatus;
  departureStatus: DepartureStatus;
}): AdminCancelBlock | null;

// D12. No incluye "too_late": el admin no tiene ventana.
export function adminCancelErrorMessage(code: Exclude<CancelErrorCode, "too_late">): string;
// not_found:             "No encontramos esta reserva."
// not_cancellable:       "Esta reserva no se puede cancelar (la salida ya está en curso o finalizó)."
// no_refundable_payment: "La reserva no tiene un pago de Stripe que reembolsar. Revísala en el panel de Stripe."
// refund_failed:         "Stripe no pudo procesar el reembolso. No se canceló nada; intenta de nuevo en unos minutos."
```

### `services/cancellation-service.ts`
```ts
type CancelPolicy = {
  block: (i: { status; departureStatus; startsAt }) => CancelErrorCode | null; // cliente: cancelBlock(…, now); admin: adminCancelBlock
};
// interno (no exportado por el index): cuerpo de la transacción D3 compartido.
async function cancelWhere(filter: SQL, policy: CancelPolicy): Promise<CancelResult>;

export function cancelBooking(code: string, customerId: string, now?: Date): Promise<CancelResult>;   // sin cambios de contrato
export function cancelBookingAsAdmin(code: string): Promise<CancelResult>;                           // nuevo
```
- Comportamiento por `status` dentro de `cancelWhere`: `cancelled` -> `alreadyCancelled`; `pending` -> rama D3 (solo si la política lo permite: el cliente la bloquea con `not_cancellable`); `confirmed` -> rama D3 con reembolso.
- `expireCheckoutSession` (de `@/modules/payments`) se llama **fuera** de la transacción, solo si hizo commit.
- `CancelResult` / `CancelErrorCode` no cambian (`types/cancellation.ts` intacto).

### `actions/admin-cancel-booking-action.ts`
```ts
"use server";
type ActionResult = { ok: true } | { ok: false; message: string };
export async function cancelBookingAsAdminAction(code: string): Promise<ActionResult>;
```
Orden: `codeSchema.safeParse` -> `requireRole("admin")` -> `cancelBookingAsAdmin(code)` -> revalidar (D11). Mensajes propios: sesión "Tu sesión venció. Recarga la página.", permiso "No tienes permiso para esta acción.", inesperado "Algo salió mal. Intenta de nuevo.".

### `components/bookings-table.tsx`
```ts
type BookingsTableProps = {
  rows: BookingRowDto[];
  query: BookingListQuery;
  basePath: string;
  showOrganizer?: boolean;                          // columna "Operador" tras "Paquete"
  renderActions?: (row: BookingRowDto) => ReactNode; // columna "Acciones" al final
};
```

### `components/bookings-list-view.tsx` (servidor)
```ts
type BookingsListViewProps = {
  result: BookingListResult;
  query: BookingListQuery;
  basePath: string;
  emptyTitle: string;      // sin ninguna reserva (operador: "Aún no tienes reservas"; admin: "Aún no hay reservas")
  emptyText: string;
  table: ReactNode;        // <BookingsTable …/> o <AdminBookingsTable …/>, armado por el caller con result.rows
};
```
Si `result.total === 0 && !query.estado` -> `EmptyCard`; si no: `BookingsStatusFilter` + (`total === 0` -> "No hay reservas con este estado" + "Ver todas" | `table` + `BookingsPagination`).

### `components/admin-*.tsx`
```ts
// admin-cancel-booking-button.tsx ("use client")
export function AdminCancelBookingButton(props: { code: string; status: "pending" | "confirmed" }): JSX.Element;
// admin-bookings-table.tsx ("use client"): <BookingsTable showOrganizer renderActions={…} …/>
export function AdminBookingsTable(props: { rows: BookingRowDto[]; query: BookingListQuery; basePath: string }): JSX.Element;
// admin-bookings-page.tsx (servidor, async)
export async function AdminBookingsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element>;
// 1) await requireRole("admin")  2) parseBookingListParams  3) listBookings({ all: true }, query)  4) <BookingsListView basePath="/admin/reservas" …/>
```

### Ruta y nav
| Ruta | Contenido |
| ---- | --------- |
| `/admin/reservas` | `h1` "Reservas" + `<Suspense fallback={<PageSkeleton/>}><AdminBookingsPage searchParams={searchParams}/></Suspense>` |

`ADMIN_NAV_LINKS` agrega `{ label: "Reservas", href: "/admin/reservas", icon: ClipboardList }` después de Resumen.

### `modules/bookings/index.ts` agrega
`export { AdminBookingsPage } from "./components/admin-bookings-page";` (la acción y el servicio admin se consumen dentro del módulo; no se exportan: YAGNI).

## Edge cases
- Cancelar una `confirmed` cuyo último pago no tiene `pi_…` o no está `succeeded`/`refunded`: `no_refundable_payment`, nada cambia; el admin lo resuelve en Stripe (sin reembolso manual en v1).
- Varios pagos (reintentos): se usa el último con `pi_…` (017 D6); los `pending` más viejos de una reserva `pending` también pasan a `failed` y su sesión se expira.
- `pending` cuya sesión ya expiró o ya no existe en Stripe: `expireCheckoutSession` solo registra el error y sigue (no revierte la cancelación).
- Webhook `checkout.session.completed` tardío tras cancelar una `pending`: reembolso total por el camino existente (D5). Cubierto por los tests de `stripe-webhook-service` ("booking ya cancelado") y la verificación manual AC20(c).
- Admin y cliente cancelando a la vez, o doble clic: candado de fila + clave de idempotencia -> un solo reembolso y un solo descuento de cupo; el segundo recibe `ok` con `alreadyCancelled`.
- Salida `cancelled` con reservas `confirmed` (el operador canceló la salida): el admin las cancela y devuelve el dinero; el cupo se libera con `GREATEST` (sin violar el check).
- Salida ya `completed` con reserva `pending` abandonada: se puede cancelar (limpieza), sin reembolso.
- Tabla más ancha en móvil (Operador + Acciones): scroll horizontal interno, sin columnas ocultas.
- `?pagina=999`, `?estado=foo`, `?organizerId=…`: se normalizan o se ignoran (AC15).
- Techo conocido: el reembolso (red) ocurre con la fila bloqueada, igual que 017 (`// ponytail:` ya anotado en el servicio); `offset` + `count` por consulta como en 023.

## Tests
Runner: Vitest ya configurado (`**/*.test.ts`); los `.tsx` no se testean (SETUP §3).
- `utils/cancellation.test.ts` (extiende) — AC1, AC2: tabla de combinaciones `status × departureStatus` de `adminCancelBlock`; sin dependencia del reloj; mensajes cubren los 4 códigos.
- `utils/booking-list-view.test.ts` (extiende) — AC12: `organizerName` se copia al DTO.
- `services/booking-list-service.test.ts` (BD, `describe.skipIf(!process.env.DATABASE_URL)`, extiende) — AC12: `organizerName` correcto con dos operadores bajo `{ all: true }` y `{ organizerId }`; aserciones previas intactas.
- `services/cancellation-service.test.ts` (BD, `refundPaymentIntent` y `expireCheckoutSession` mockeados, extiende) — AC3–AC8 (admin cancela reserva ajena; sin ventana a 1 h; salida `cancelled`; `en_route`/`completed` bloquean; `pending` sin tocar cupo, pagos `failed`, `expire` llamado tras commit y no llamado si falla; idempotencia y paralelismo; sin pago refundable; Stripe lanza -> rollback + reintento; pago ya `refunded`) y AC9 (las pruebas actuales del cliente sin cambios).
- `actions/admin-cancel-booking-action.test.ts` (mocks de `next/cache`, `requireRole`, servicio; mismo molde que `cancel-booking-action.test.ts`) — AC10, AC11: código inválido sin llamadas; `UNAUTHENTICATED` y `FORBIDDEN`; `requireRole` llamado con `"admin"`; éxito y `alreadyCancelled` revalidan las 4; falla del servicio con mensaje admin sin revalidar; excepción inesperada con log solo del código.
- Sin tests de UI: AC13–AC19 por revisión y AC20 manual al cerrar la fase 2.

## Plan
Dos fases; cada una deja `lint + tsc + test` en verde y la app funcionando. La fase 1 no cambia la UI (lógica, servicio, acción y DTO); la fase 2 entrega `/admin/reservas`.

### Phase 1 — Cancelación admin y `organizerName` (sin UI nueva)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `adminCancelBlock` + `adminCancelErrorMessage` con tests | modules/bookings/utils/cancellation.ts, modules/bookings/utils/cancellation.test.ts | - | A | AC1, AC2 | done |
| T2 | `organizerName` en DTO, mapper y `listBookings` (join `organizers`) con tests | modules/bookings/types/booking-list.ts, modules/bookings/utils/booking-list-view.ts, modules/bookings/utils/booking-list-view.test.ts, modules/bookings/services/booking-list-service.ts, modules/bookings/services/booking-list-service.test.ts | - | A | AC12 | done |
| T3 | Refactor `cancelWhere` + `cancelBookingAsAdmin` (pending y confirmed, `expireCheckoutSession` post-commit) con tests de BD; `cancelBooking` sin cambios de contrato | modules/bookings/services/cancellation-service.ts, modules/bookings/services/cancellation-service.test.ts | T1 | B | AC3, AC4, AC5, AC6, AC7, AC8, AC9 | done |
| T4 | `cancelBookingAsAdminAction` (Zod, `requireRole("admin")`, revalidación) con tests | modules/bookings/actions/admin-cancel-booking-action.ts, modules/bookings/actions/admin-cancel-booking-action.test.ts | T3 | - | AC10, AC11 | done |

### Phase 2 — Tabla parametrizada y ruta `/admin/reservas`
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | setup: link "Reservas" en `ADMIN_NAV_LINKS` (sin dependencias ni `shadcn add`: `table` y `alert-dialog` ya existen) | modules/admin/components/admin-nav-links.ts | T4 | - | AC14 | done |
| T6 | `BookingsTable`: props `showOrganizer` y `renderActions` (operador sin cambios) | modules/bookings/components/bookings-table.tsx | T5 | A | AC16, AC19 | done |
| T7 | Extraer `BookingsListView` y refactorizar `OperatorBookingsPage` (sin cambio de comportamiento) | modules/bookings/components/bookings-list-view.tsx, modules/bookings/components/operator-bookings-page.tsx | T5 | A | AC13, AC18 | done |
| T8 | `AdminCancelBookingButton` (diálogo) y `AdminBookingsTable` (cliente, usa T6) | modules/bookings/components/admin-cancel-booking-button.tsx, modules/bookings/components/admin-bookings-table.tsx | T4, T6 | - | AC16, AC17, AC19 | done |
| T9 | `AdminBookingsPage` (servidor, `requireRole` + `{ all: true }`), ruta y export del módulo | modules/bookings/components/admin-bookings-page.tsx, modules/bookings/index.ts, app/(admin)/admin/reservas/page.tsx | T7, T8 | - | AC14, AC15, AC18 | done |

Notas de ejecución:
- Fase 1: T1 y T2 son independientes (grupo A, sin archivos en común). T3 espera a T1 (importa `adminCancelBlock`); T2 y T3 no comparten archivos, así que T3 puede correr en paralelo con T2. T4 espera a T3 por la firma de `cancelBookingAsAdmin`. El test de BD solo corre con `DATABASE_URL`; correrlo localmente antes de cerrar la fase (AC3–AC9, AC12).
- Fase 2: T6 y T7 en paralelo (grupo A, archivos distintos). `modules/bookings/index.ts` lo toca solo T9, al final (sin exports colgantes en fases intermedias). El link de T5 aparece antes de la página: aceptable porque la fase se entrega completa (mismo criterio que 023 T5).
- T6 cambia una tabla ya usada por el operador: tras T6 y T7 verificar `/operador/reservas` sin diferencias visuales (AC13, AC16).
- Verificación manual de la fase 2: AC20.

## Open questions
Cada una trae un valor por defecto (el que asume esta spec) para que se pueda aprobar sin responder todas.
1. **Alcance de "cambio de estado" (D1).** La tarjeta dice "cambio de estado"; la spec lo reduce a *cancelar*. ¿Se necesita además marcar `pending -> confirmed` a mano (p. ej. pago por Yape/efectivo fuera de Stripe)? **Por defecto: no** (rompe el invariante pago+cupo; sería otra tarjeta con registro de pago manual).
2. **Reembolso total sin ventana (D2).** ¿El admin puede cancelar una `confirmed` a menos de 48 h o ya iniciada la salida y devolver el 100 %? El ERM dice que después de 48 h se retiene el costo de entradas ya emitidas, pero no existe ese monto en los datos. **Por defecto: sí, 100 %, con la salida `scheduled` o `cancelled`; bloqueada si `en_route`/`completed`**. Alternativa: exigir la misma ventana de 48 h que al cliente salvo salida cancelada.
3. **Confirmada sin pago de Stripe (D3).** Si no hay pago refundable, ¿bloquear (`no_refundable_payment`) o permitir cancelar sin reembolso y liberar el cupo? **Por defecto: bloquear**, para no dejar dinero cobrado sin devolver; se resuelve en Stripe.
4. **Reabrir una cancelada.** ¿Hace falta? **Por defecto: no** (terminal; el cupo ya se liberó y podría estar ocupado).
5. **Auditoría.** ¿Hay que registrar quién canceló y cuándo (hoy solo `cancelled_at`, sin actor)? **Por defecto: no**; agregarlo implica columna/tabla y migración (fuera de esta tarjeta).
6. **`admin` vs `super_admin`.** ¿Mismos permisos de cancelar? **Por defecto: sí** (ERM da RU a ambos sobre `bookings`; `requireRole("admin")` incluye a `super_admin`).
7. **Columna "Operador" (D6/D8).** La tarjeta dice "sin el filtro por operador"; se agrega una columna de solo lectura con el nombre del operador porque el admin ve todos. ¿Se quiere, o se omite? **Por defecto: sí, sin filtro**.
8. **Aviso al cliente.** La v1 no envía correo/WhatsApp (SYSTEM-DESIGN); el cliente se entera al ver `/mis-reservas` y el correo del reembolso de Stripe. **Por defecto: sin aviso propio.**
