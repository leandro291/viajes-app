# Reservas del operador (/operador/reservas)

- Module: bookings
- Status: approved
- Approved by: leandro291 (2026-10-28, re-aprobada con T9/D16)
- Mode: SDD

## Goal
Tarjeta Trello 023 (Fase 4 · Panel operador). El operador (`organizer`) ve en `/operador/reservas` una tabla de solo lectura con las reservas de sus paquetes y, al expandir una fila, los viajeros de cada reserva (nombre, tipo y número de documento). Orden, filtro por estado de reserva y paginación se resuelven en el servidor. La tabla es genérica para que la tarjeta 026 (admin) la reuse sin el filtro por operador.

## Scope
- In:
  - Ruta `/operador/reservas` (una sola página, solo lectura) protegida por el layout `(organizer)`.
  - Tabla con TanStack Table v9 (`useTable`, `rowExpandingFeature`) y fila expandible con los viajeros.
  - Service de lectura `listBookings(scope, query)` con alcance por operador (`packages.organizer_id`) o sin filtro (`{ all: true }`, para 026).
  - Orden por código / fecha de salida / total, filtro por estado de reserva y paginación de 20 filas, todo en el servidor y reflejado en la URL (`?estado=&orden=&dir=&pagina=`).
  - Utilidades puras testeadas: parseo/armado de parámetros, siguiente orden, mapeo de filas y etiquetas.
  - Link "Reservas" en `ORGANIZER_NAV_LINKS` (+ test).
  - Componente shadcn `table` (no existe en `components/ui`).
- Out:
  - Búsqueda de texto (código, cliente, documento): YAGNI; se agrega si el volumen lo pide.
  - Editar/cancelar/reembolsar reservas, completar los datos de los demás viajeros, exportar CSV/PDF, enviar mensajes al cliente.
  - Columna o filtro de operador, y la ruta de admin: son de la tarjeta 026 (la tabla ya queda reusable; el service ya acepta `{ all: true }`).
  - Detalle de pagos (monto en USD, método, reembolsos): solo se muestra el estado del último pago.
  - Filtros por paquete/salida/rango de fechas, selector de tamaño de página, paginación numerada.
  - Cambios de schema de BD o migraciones; dependencias npm nuevas.

## Decisiones (acordadas con el usuario salvo indicación)
- D1. **Columnas**: código `WY-####`, paquete, fecha de salida, cliente (nombre + contacto), n.º de viajeros (`pax_count`), total, estado de reserva, estado de pago.
- D2. **Viajeros en fila expandible**: lista todos los `booking_travelers` de la reserva (hoy solo existe el principal, `is_primary`; el resto se completa después). Muestra nombre, tipo de documento y número. Principal primero.
- D3. **Datos personales completos**: `doc_number`, email y teléfono sin enmascarar. El operador los necesita para la entrada a Machu Picchu y el ERM le da R sobre sus clientes (`bookings`, `booking_travelers`, `payments`: "R (sus paquetes)"). Contraste: el voucher del cliente (016) enmascara el documento; aquí no.
- D4. **Interacción**: orden, filtro por estado y paginación en el servidor, vía parámetros de URL (patrón de `parseOfferParams` / `parseTourParams`: nunca lanza, inválido → default, nombres en español). Sin búsqueda de texto.
- D5. **Todos los estados** (`pending`, `confirmed`, `cancelled`) se listan, cada uno con `StatusBadge`. Las `pending` incluyen checkouts aún no pagados o abandonados.
- D6. **Tabla genérica**: `BookingsTable` recibe `rows`, `query` y `basePath`; no conoce al operador ni importa `modules/organizers`. La página del operador es la que resuelve el alcance.
- D7. **Alcance en el servidor**: el `organizerId` sale siempre de `getCurrentOrganizer()` (sesión), nunca de la URL ni del cliente. El filtro es `packages.organizer_id = $organizerId` (`bookings.package_id` ya lo permite; no hace falta pasar por `departures`).
- D8. **Refinamiento de la firma (a aprobar)**: en vez de un `organizerId?` opcional, el alcance es una unión explícita `BookingScope = { organizerId: string } | { all: true }`. Un `undefined` por descuido no debe convertirse en "todas las reservas de todos los operadores" (fuga de datos personales); `{ all: true }` es una decisión visible en el código que la llama (026).
- D9. **Estado de pago = el último `payments`** de la reserva (por `created_at` desc), igual que el voucher (016). Sin pagos → "Sin pago".
- D10. **Cliente**: nombre = `users.first_name + last_name` (puede ser null → "Sin nombre"); contacto = `bookings.contact_email` y `contact_phone` (snapshot al reservar, no el perfil actual).
- D11. **Orden por defecto**: código descendente (las más nuevas primero; el código sale de una secuencia, equivale a orden de creación). Desempate por `bookings.id` en la misma dirección para que la paginación sea estable. Primer clic en una columna: `codigo` desc, `salida` asc, `total` desc; segundo clic invierte.
- D12. **Página fija de 20 filas**; página fuera de rango se acota a la última (no 404 ni vacío).
- D13. **Lectura dinámica sin caché**: sin `"use cache"` (datos personales, estado cambia por webhook), como `own-departure-service` y `voucher-service`.
- D14. **Operador `pending`/`suspended` puede leer**: es solo lectura, no hay `getWriteBlock`; el aviso de estado ya lo muestra el layout.
- D16. **Formateo de fechas de salida en `lib/` (corrección de plan, acordada con el usuario)**: `BookingsTable` es cliente y no puede importar el barrel `@/modules/packages` (arrastra Clerk y funciones `"use cache"`: `npm run build` falla). Los formateadores de fecha/hora Lima (`limaParts`, `parts`, `formatDepartureDate`, `formatDepartureChip`, `formatDepartureShortDate`, `limaTime`, `formatDepartureTime`, `formatStartTime`) pasan de `modules/packages/utils/package-detail.ts` a `lib/lima-date.ts` (funciones puras, sin dependencias de servidor; mismo precedente que `lib/money.ts`). `package-detail.ts` los re-exporta para que `packages`, `checkout` y sus tests no cambien. Descartado: import profundo a `packages/utils` (rompe ARCHITECTURE §1.6) y formatear en servidor (cambia el contrato de `BookingRowDto`).
- D15. **Montos en soles** con `formatPen` (`bookings.total_cents`, `currency = PEN`); fecha de salida con `formatDepartureShortDate` + `formatDepartureTime` (zona Lima).

## Reuse
- Reuse: `lib/db` (`bookings`, `bookingTravelers`, `payments`, `departures`, `packages`, `users`) y el patrón de `modules/bookings/services/voucher-service.ts` (último pago por `created_at desc`, viajeros con principal primero, tests de BD con `describe.skipIf(!process.env.DATABASE_URL)` e import dinámico).
- Reuse: `getCurrentOrganizer` (`modules/organizers`) — resuelve el operador; `components/shared/status-badge.tsx` (`StatusBadge` con `label` opcional) para estado de reserva y de pago; `components/shared/page-skeleton.tsx`; `components/ui/{button,badge}` (`buttonVariants` para filtros y paginación como links); `lib/money.ts` (`formatPen`); `formatDepartureShortDate` / `formatDepartureTime` (`modules/packages/utils/package-detail.ts`, no exportados por el `index.ts`: ver Extend).
- Reuse (patrón, no código): `modules/offers/utils/offer-params.ts` / `modules/packages/utils/tour-filters.ts` (parseo de `searchParams` que nunca lanza, orden fijo de claves en el href) y `modules/offers/components/offers-page.tsx` (`searchParams` como Promise dentro de `Suspense`); `app/(organizer)/operador/salidas/page.tsx` (título + `Suspense` + componente del módulo).
- Extend: `modules/packages/index.ts` — exportar `formatDepartureShortDate` y `formatDepartureTime` (regla ARCHITECTURE §1.6: un módulo no importa internos de otro). Es la única salida del módulo `packages` que `bookings` necesita; alternativa descartada: duplicar el formateo Lima.
- Extend: `modules/organizers/components/organizer-nav-links.ts` (+ test) — link "Reservas"; `modules/bookings/index.ts` — exports del feature.
- Extend: `components/ui/` — `table` de shadcn (`npx shadcn@latest add table`, verificado en `@shadcn/table`); no existe tabla en el repo.
- Descartado: `@shadcn/pagination` (ui) — son anclas estilizadas para paginación numerada; Anterior/Siguiente con `buttonVariants` + `Link` cubre el caso sin componente nuevo (YAGNI). `OfferTabs` es específico de ofertas y con estilo pill de página pública; el filtro de estado usa `buttonVariants` en un `nav` propio y simple.
- Instalado, sin cablear: `@tanstack/react-table` v9.2.4 (primer uso en el repo; API v9 = `useTable` + `tableFeatures`, no `useReactTable`; ver `node_modules/@tanstack/react-table/skills/getting-started/SKILL.md`). No hace falta `react-query` ni `zustand`.
- New: `booking-list-service.ts` (el único service del módulo con lectura para el operador; `voucher-service` es por cliente y por código, no sirve), utilidades de params y vista, y los componentes. No existe nada equivalente.

## Acceptance criteria

### Utilidades puras
- AC1: `parseBookingListParams(raw)` nunca lanza y devuelve `{ estado?, orden, dir, pagina }`. `estado` ∈ `pending|confirmed|cancelled`; `orden` ∈ `codigo|salida|total` (default `codigo`); `dir` ∈ `asc|desc` (default `desc`); `pagina` entero ≥ 1 (default 1). Valor inválido, vacío o repetido (se toma el primero) → default.
- AC2: `buildBookingsHref(basePath, query)` omite los valores por defecto (query por defecto → `basePath` sin `?`), usa orden fijo de claves `estado, orden, dir, pagina` y es inverso de `parseBookingListParams` (round-trip).
- AC3: `nextSortQuery(query, key)` devuelve la query al hacer clic en una columna: misma columna → invierte `dir`; otra columna → su dirección inicial (D11); siempre `pagina = 1` y conserva `estado`.
- AC4: `toBookingRowDto` (mapper puro): `customerName` = `"nombre apellido"` recortado o `null` si ambos faltan; `paymentStatus` = el del pago más reciente o `null`; viajeros con el principal primero y el resto en su orden; copia `docNumber` completo (D3).
- AC5: mapas de etiquetas: tipo de documento (`dni` → "DNI", `passport` → "Pasaporte", `foreign_id` → "Carné de extranjería"); estado de pago → `{ badge, label }` (`succeeded` → confirmed "Pagado", `pending` → pending "Pendiente", `failed` → cancelled "Fallido", `refunded` → neutral "Reembolsado", `partially_refunded` → neutral "Reembolso parcial"); `null` → sin badge, texto "Sin pago". Cubren todos los valores del enum (el test falla si se agrega uno).

### Service
- AC6: `listBookings({ organizerId }, query)` devuelve solo reservas cuyo `packages.organizer_id` sea ese operador; las de otros operadores y sus viajeros nunca aparecen (incluye reservas de paquetes en borrador y de salidas `cancelled`/`completed`).
- AC7: `listBookings({ all: true }, query)` devuelve reservas de todos los operadores (misma forma de fila).
- AC8: cada fila trae `id`, `code`, `packageTitle`, `departureStartsAt`, `customerName`, `contactEmail`, `contactPhone`, `paxCount`, `totalCents`, `status`, `paymentStatus` y `travelers` (todos los `booking_travelers` de la reserva, principal primero, con `docNumber` completo).
- AC9: `query.estado` filtra por estado de reserva; `total` y `pageCount` reflejan el filtro.
- AC10: `orden`/`dir` ordenan por `bookings.code`, `departures.starts_at` o `bookings.total_cents`; empates se rompen por `bookings.id` en la misma dirección, así que recorrer todas las páginas no repite ni omite filas.
- AC11: tamaño de página 20 (`BOOKINGS_PAGE_SIZE`); `total` es el conteo de filas filtradas; `pageCount = max(1, ceil(total / 20))`; una `pagina` mayor a `pageCount` devuelve la última; el resultado informa la `page` efectivamente usada.
- AC12: el service no usa `"use cache"` y la consulta de viajeros y de pagos se limita a los `id` de reservas ya filtradas por el alcance (no hay ruta para ver viajeros fuera del alcance).

### Ruta y página
- AC13: `/operador/reservas` existe (`metadata.title` "Reservas", `h1` "Reservas", `Suspense` con `PageSkeleton`), protegida por el layout `(organizer)`; "Reservas" aparece en el nav del operador (desktop y móvil), se marca activa en esa ruta y `ORGANIZER_NAV_LINKS` queda en orden Perfil, Paquetes, Salidas, Reservas, Guías.
- AC14: `OperatorBookingsPage` parsea `searchParams` con `parseBookingListParams`, obtiene el operador con `getCurrentOrganizer()` y llama `listBookings({ organizerId: organizer.id }, query)`. Sin fila de operador (`null`): mensaje "Aún no tienes un perfil de operador" y no llama al service. El `organizerId` no se lee de la URL.

### Tabla
- AC15: `BookingsTable` (cliente) usa `useTable` de TanStack v9 con `rowExpandingFeature`; `data` estable por `rows` y `getRowId = row.id`. Render semántico `<table>` con `caption` (sr-only), `th scope="col"`, contenedor con scroll horizontal en móvil.
- AC16: columnas en este orden: expandir, Código (`WY-####`, monoespaciada), Paquete, Salida (`Jue 5 nov 2026 · 7:30 a. m.`), Cliente (nombre o "Sin nombre"; debajo email y teléfono), Viajeros (`paxCount`), Total (`formatPen`), Reserva (`StatusBadge`), Pago (`StatusBadge` o "Sin pago").
- AC17: Código, Salida y Total son links de orden (`buildBookingsHref(basePath, nextSortQuery(...))`) con `aria-sort` en el `th` de la columna activa; el resto de las columnas no ordenan.
- AC18: botón de expandir por fila (área táctil ≥ 44 px, `aria-expanded`, `aria-controls`, etiqueta "Ver viajeros de WY-####"): al abrir muestra debajo una fila con la lista de viajeros (nombre completo, tipo de documento, número de documento, marca "Principal" en el `is_primary`). Sin viajeros: "Sin viajeros registrados". Varias filas pueden estar abiertas a la vez; el estado no sobrevive a navegar a otra página/filtro.
- AC19: `BookingsTable` no importa `modules/organizers` ni lee la sesión: recibe todo por props (`rows`, `query`, `basePath`), de modo que 026 la use tal cual.

### Filtro, paginación y estados
- AC20: `BookingStatusFilter` (`nav` con `aria-label`) ofrece Todas / Pendientes / Confirmadas / Canceladas como links; el activo lleva `aria-current="true"`; cambiar el filtro conserva `orden`/`dir` y vuelve a `pagina = 1`.
- AC21: `BookingsPagination` muestra "Página X de Y" y links Anterior/Siguiente que conservan `estado`, `orden` y `dir`; en la primera/última página el control correspondiente está deshabilitado (no es link, `aria-disabled`). Con `pageCount = 1` no se muestra.
- AC22: estados vacíos: el operador sin ninguna reserva ("Aún no tienes reservas"); filtro sin resultados ("No hay reservas con este estado" + link "Ver todas"). El filtro y la paginación se ocultan cuando el operador no tiene ninguna reserva.
- AC23: accesibilidad: foco visible (los de `buttonVariants`), badges con ícono + texto (nunca solo color), objetivos táctiles ≥ 44 px, `prefers-reduced-motion` respetado (sin animaciones nuevas).

## Contracts

### Estructura de archivos
```
components/ui/table.tsx                                  (shadcn add table)
modules/bookings/
  types/booking-list.ts
  utils/booking-list-params.ts          (+ .test.ts)
  utils/booking-list-view.ts            (+ .test.ts)    # mapper + etiquetas
  services/booking-list-service.ts      (+ .test.ts, BD)
  components/bookings-table.tsx                          # cliente
  components/bookings-status-filter.tsx
  components/bookings-pagination.tsx
  components/operator-bookings-page.tsx                  # servidor
  index.ts                              (extiende exports)
modules/packages/index.ts               (export de formatDepartureShortDate/Time)
modules/organizers/components/organizer-nav-links.ts     (+ test)
app/(organizer)/operador/reservas/page.tsx
```
Tests colocados `*.test.ts` (Vitest incluye solo `**/*.test.ts`); los `.tsx` no se testean (SETUP §3).

### `types/booking-list.ts`
```ts
import type { bookingStatus, docType, paymentStatus } from "@/lib/db/schema/enums";

export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
export type DocType = (typeof docType.enumValues)[number]; // ya existe en types/booking.ts: reusarlo, no duplicar

export type BookingSortKey = "codigo" | "salida" | "total";
export type SortDir = "asc" | "desc";

export type BookingListQuery = {
  estado?: BookingStatus;
  orden: BookingSortKey; // default "codigo"
  dir: SortDir;          // default "desc"
  pagina: number;        // >= 1, default 1
};

export type BookingScope = { organizerId: string } | { all: true };

export type BookingTravelerDto = {
  id: string;
  firstName: string;
  lastName: string;
  docType: DocType;
  docNumber: string;     // completo (D3)
  isPrimary: boolean;
};

export type BookingRowDto = {
  id: string;
  code: string;          // WY-####
  packageTitle: string;
  departureStartsAt: Date;
  customerName: string | null;
  contactEmail: string;
  contactPhone: string;
  paxCount: number;
  totalCents: number;    // PEN
  status: BookingStatus;
  paymentStatus: PaymentStatus | null; // último pago
  travelers: BookingTravelerDto[];     // principal primero
};

export type BookingListResult = {
  rows: BookingRowDto[];
  total: number;         // filas tras el filtro, antes de paginar
  page: number;          // efectiva (acotada)
  pageCount: number;     // >= 1
};
```

### `utils/booking-list-params.ts`
```ts
export const BOOKINGS_PAGE_SIZE = 20;
export const DEFAULT_BOOKING_QUERY: BookingListQuery; // { orden: "codigo", dir: "desc", pagina: 1 }
export function parseBookingListParams(raw: Record<string, string | string[] | undefined>): BookingListQuery; // AC1
export function buildBookingsHref(basePath: string, query: BookingListQuery): string;                         // AC2
export function nextSortQuery(query: BookingListQuery, key: BookingSortKey): BookingListQuery;                // AC3
```
Parámetros de URL: `estado` (`pending|confirmed|cancelled`), `orden` (`codigo|salida|total`), `dir` (`asc|desc`), `pagina` (entero).

### `utils/booking-list-view.ts`
```ts
export type BookingRow = { /* columnas crudas del join, incl. userFirstName/userLastName */ };
export function toBookingRowDto(
  row: BookingRow,
  travelers: BookingTravelerDto[],
  latestPaymentStatus: PaymentStatus | null,
): BookingRowDto;                                                // AC4
export const DOC_TYPE_LABELS: Record<DocType, string>;            // AC5
export const PAYMENT_BADGE: Record<PaymentStatus, { badge: BookingStatusKey; label: string }>; // AC5
export const BOOKING_STATUS_FILTERS: { value: BookingStatus | undefined; label: string }[];    // Todas, Pendientes, Confirmadas, Canceladas
```
El estado de reserva usa `StatusBadge status={row.status}` directo (las claves `confirmed|pending|cancelled` coinciden con `BookingStatusKey`).

### `services/booking-list-service.ts`
```ts
// Sin "use cache" (D13). Tres consultas: (1) count filtrado, (2) página de reservas con joins
// packages/departures/users, (3) viajeros + pagos de los ids de la página (inArray).
export function listBookings(scope: BookingScope, query: BookingListQuery): Promise<BookingListResult>;
```
- `where`: `scope` con `organizerId` → `eq(packages.organizerId, …)`; `{ all: true }` sin condición; `+ estado` si viene.
- `orderBy`: columna por `query.orden` y `query.dir`, luego `bookings.id` en la misma dirección. `limit 20 offset (page-1)*20` con `page = min(query.pagina, pageCount)` (el count va primero).
- Pagos: `select bookingId, status … where bookingId in ids order by created_at desc`; se queda el primero por reserva en memoria. Viajeros: `order by is_primary desc`.

### Componentes
```ts
// bookings-table.tsx ("use client")
type BookingsTableProps = { rows: BookingRowDto[]; query: BookingListQuery; basePath: string };
// bookings-status-filter.tsx
type BookingsStatusFilterProps = { query: BookingListQuery; basePath: string };
// bookings-pagination.tsx
type BookingsPaginationProps = { query: BookingListQuery; basePath: string; page: number; pageCount: number };
// operator-bookings-page.tsx (servidor, async)
export function OperatorBookingsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<JSX.Element>;
```
`index.ts` agrega: `OperatorBookingsPage`, `BookingsTable`, `BookingsStatusFilter`, `BookingsPagination`, `listBookings`, `parseBookingListParams`, `buildBookingsHref`, y los tipos `BookingListQuery`, `BookingListResult`, `BookingRowDto`, `BookingScope` (lo que 026 va a consumir).

### Ruta
| Ruta | Contenido |
| ---- | --------- |
| `/operador/reservas` | `h1` "Reservas" + `<Suspense fallback={<PageSkeleton/>}><OperatorBookingsPage searchParams={searchParams}/></Suspense>` |

### Nav
`ORGANIZER_NAV_LINKS` agrega `{ label: "Reservas", href: "/operador/reservas", icon: ClipboardList }` (lucide-react) entre Salidas y Guías; el test se actualiza.

## Edge cases
- Operador sin fila en `organizers` (`getCurrentOrganizer()` → `null`): mensaje, sin consulta. Un `admin` que entra a `/operador` también cae aquí (el panel de admin es 026).
- `?pagina=999`, `?pagina=abc`, `?pagina=0`, `?estado=foo`, `?orden=precio`: se normalizan a defaults/última página, sin error.
- Reserva sin `payments` (checkout recién creado): "Sin pago". Con varios pagos (reintento): gana el más reciente.
- Reserva con `users.first_name/last_name` null (perfil de Clerk incompleto): "Sin nombre" + contacto.
- Reserva sin viajeros (no ocurre hoy, el principal se escribe en la misma transacción): "Sin viajeros registrados".
- `pax_count` mayor que viajeros registrados (el resto se completa después): la fila muestra el `pax_count` real en la columna y solo los registrados en el detalle; sin aviso extra (YAGNI).
- Paquete pasado a borrador o salida cancelada: las reservas siguen visibles.
- Reservas `pending` abandonadas se ven con "Sin pago"/"Pendiente" hasta que el flujo de checkout las cancele (D5).
- Código con secuencia ≤ 9999: el orden por `code` coincide con el de creación (techo conocido de la secuencia, ya anotado en el schema).
- Tablas anchas: scroll horizontal interno en móvil (DESIGN-SYSTEM, Responsive); sin columnas ocultas.
- Datos personales: la página es dinámica, sin caché compartida ni `searchParams` reflejados fuera del servidor; no se loguea `doc_number`.
- Techo conocido: `offset` + `count` por consulta; si un operador acumula decenas de miles de reservas, paginar por cursor (`// ponytail:` en el service).

## Tests
- `utils/booking-list-params.test.ts` — AC1, AC2, AC3 (defaults; inválidos; repetidos; round-trip; omite defaults; orden de claves; `nextSortQuery` mismo/otro campo, reinicia página, conserva estado).
- `utils/booking-list-view.test.ts` — AC4, AC5 (nombre con/sin apellido y vacío → null; principal primero; pago nulo; mapas cubren todos los valores del enum con `enumValues`).
- `services/booking-list-service.test.ts` (BD, `describe.skipIf(!process.env.DATABASE_URL)`) — AC6–AC12: aislamiento entre dos operadores (incluye viajeros ajenos), `{ all: true }`, filtro de estado y `total`, orden asc/desc con desempate, paginación (20/21 filas, página fuera de rango acotada, recorrido completo sin repetir), último pago, reserva sin pago, viajeros principal primero con `docNumber` completo. Limpieza con ids fijos como `voucher-service.test.ts`.
- `modules/organizers/components/organizer-nav-links.test.ts` (actualizado) — AC13: orden de los links y activo en `/operador/reservas` sin activar Perfil.
- Sin tests de UI (`.tsx`): AC14–AC23 se verifican manualmente en la fase 2 (ver notas).

## Plan
Dos fases; cada una deja `lint + tsc + test` en verde y la app funcionando. La fase 1 no cambia la UI (lógica y service); la fase 2 entrega `/operador/reservas`.

### Phase 1 — Datos y utilidades (sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: tipos del listado (reusando `DocType` de `types/booking.ts`) | modules/bookings/types/booking-list.ts | - | - | - | done |
| T2 | `booking-list-params` (parseo, href, `nextSortQuery`, constantes) con tests | modules/bookings/utils/booking-list-params.ts, modules/bookings/utils/booking-list-params.test.ts | T1 | A | AC1, AC2, AC3 | done |
| T3 | `booking-list-view` (mapper, etiquetas de documento y pago, filtros) con tests | modules/bookings/utils/booking-list-view.ts, modules/bookings/utils/booking-list-view.test.ts | T1 | A | AC4, AC5 | done |
| T4 | `listBookings` (alcance, filtro, orden, paginación, viajeros, último pago) y test con BD | modules/bookings/services/booking-list-service.ts, modules/bookings/services/booking-list-service.test.ts | T1, T2, T3 | B | AC6, AC7, AC8, AC9, AC10, AC11, AC12 | done |

### Phase 2 — Tabla y ruta `/operador/reservas`
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | setup: `npx shadcn@latest add table`; link "Reservas" + test del nav; export de `formatDepartureShortDate`/`formatDepartureTime` en `modules/packages/index.ts` | components/ui/table.tsx, modules/organizers/components/organizer-nav-links.ts, modules/organizers/components/organizer-nav-links.test.ts, modules/packages/index.ts | T4 | - | AC13 | done |
| T6 | `BookingsTable` (cliente: `useTable` v9, columnas, headers de orden, fila expandible de viajeros) | modules/bookings/components/bookings-table.tsx | T5 | A | AC15, AC16, AC17, AC18, AC19, AC23 | done |
| T7 | `BookingsStatusFilter` y `BookingsPagination` (links, sin JS de cliente) | modules/bookings/components/bookings-status-filter.tsx, modules/bookings/components/bookings-pagination.tsx | T5 | A | AC20, AC21, AC23 | done |
| T8 | `OperatorBookingsPage` (servidor: operador, query, estados vacíos), ruta y exports del módulo | modules/bookings/components/operator-bookings-page.tsx, modules/bookings/index.ts, app/(organizer)/operador/reservas/page.tsx | T6, T7 | - | AC13, AC14, AC22 | done |

| T9 | corrección D16: mover los formateadores de fecha Lima a `lib/lima-date.ts` (+ test movido), re-exportarlos desde `package-detail.ts` y hacer que `BookingsTable` importe de `@/lib/lima-date`; `npm run build` debe pasar | lib/lima-date.ts, lib/lima-date.test.ts, modules/packages/utils/package-detail.ts, modules/packages/utils/package-detail.test.ts, modules/bookings/components/bookings-table.tsx | T6, T8 | - | AC16 | done |

Notas de ejecución:
- T9 nace de que `npm run build` falló tras T8 (barrel de `packages` en un componente cliente). T9 no cambia criterios ni contratos de `BookingRowDto`; las firmas de los formateadores son idénticas, solo cambian de archivo. El export en `modules/packages/index.ts` (T5) se mantiene para los consumidores de servidor (`checkout`).
- Fase 1: T2 y T3 son independientes (grupo A, sin archivos en común); T4 espera a ambos porque importa `BOOKINGS_PAGE_SIZE` y `toBookingRowDto`. El test de BD solo corre con `DATABASE_URL`; verificarlo localmente antes de cerrar la fase.
- Fase 2: T6 y T7 corren en paralelo (grupo A, sin archivos en común). `modules/bookings/index.ts` lo toca solo T8, al final, cuando ya existen todos los componentes que exporta (sin exports colgantes en fases intermedias). La ruta `/operador/reservas` y su link aparecen en el mismo cierre de fase (T5 agrega el link antes de que exista la página: aceptable porque la fase se entrega completa; no se mergea T5 solo).
- Verificación manual al cerrar la fase 2 (con `DATABASE_URL` y datos seed): entrar como operador, comprobar que solo aparecen reservas de sus paquetes; ordenar por cada columna en ambos sentidos; filtrar por estado; paginar con más de 20 reservas; expandir una fila y ver el documento completo; revisar a 390 px (scroll horizontal, targets ≥ 44 px) y con teclado (foco, `aria-expanded`).

## Open questions
- Ninguna bloqueante. A confirmar al aprobar: **D8** (alcance como unión `{ organizerId } | { all: true }` en lugar de `organizerId?` opcional, para evitar fugas por un `undefined`) y **D5** (las reservas `pending` abandonadas se listan; si molestan, se puede ocultarlas por defecto sin tocar el schema).
