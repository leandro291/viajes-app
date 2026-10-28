# Salidas del operador (/operador/salidas)

- Module: packages
- Status: done
- Approved by: leandro291 (2026-10-27)
- Mode: SDD

## Goal
Tarjeta Trello 022 (Fase 4 · Panel operador). El operador (`organizer`) crea, edita y borra las salidas (`departures`) de sus paquetes y tours desde `/operador/salidas`: fecha y hora, capacidad, guía opcional y estado (programada, en ruta, completada, cancelada). Cada salida muestra los cupos vendidos (`booked_seats`). Al escribir sobre un paquete publicado se invalida la caché pública de salidas. El service filtra siempre por el operador dueño del paquete.

## Scope
- In:
  - Ruta `/operador/salidas` (una sola página): lista de salidas propias, alta, edición en línea, cambio de estado y borrado. Mismo patrón que `/operador/guias` (021).
  - Lista en dos secciones: **Próximas** (`scheduled`, `en_route`; por fecha ascendente) e **Historial** (`completed`, `cancelled`; por fecha descendente).
  - Asignar guía (de las guías propias, 021) por salida; sin guía por defecto.
  - Reglas de negocio puras y testeadas: transiciones de estado, cupos vendidos, fecha futura (ver *Decisiones propuestas*).
  - Regla de escritura por estado del operador (reusa `getWriteBlock`): `pending` puede escribir (las salidas no se "publican"), `suspended` no.
  - Invalidación de `CACHE_TAGS.departures` desde las Server Actions cuando el paquete de la salida está publicado.
  - Link "Salidas" en `ORGANIZER_NAV_LINKS`.
  - Extraer el wrapper común de las actions (`withOrganizer`) y usarlo también en `guide-actions` y `package-actions` (tercera copia = DRY, SETUP §2).
- Out:
  - Listar o gestionar las reservas de cada salida (ticket de reservas del operador).
  - Cancelar una salida con cupos vendidos, reembolsos y avisos a clientes (no existe el flujo de cancelación/reembolso; ver pregunta 1).
  - Devolver cupo al cancelar una reserva (el flujo de cancelación de reservas no existe aún; `booked_seats` es un contador y esa tarjeta lo decrementará).
  - Salidas recurrentes / alta masiva por rango de fechas, duplicar salidas, calendario visual, filtros y paginación.
  - Vista de admin / `super_admin` sobre salidas ajenas (027), "Salidas de hoy" del panel admin.
  - Cambios de schema de BD o migraciones; dependencias npm nuevas; componentes shadcn nuevos.
  - Cambiar el paquete de una salida ya creada.

## Decisiones propuestas (se aprueban con la spec)
Defaults para lo que el ticket no define; los inciertos están en *Open questions*.
D1. **Cupos vendidos = `departures.booked_seats`** (ERM): contador que se incrementa solo en la transacción que confirma reserva y pago (`reserveSeats`). Las reservas `pending` no reservan cupo. No se recalcula desde `bookings`. Se muestra "N de M cupos vendidos" y los disponibles `max(0, capacity - booked_seats)`.
D2. **Zona horaria fija `America/Lima` (UTC-5)**: el operador carga fecha (`<input type="date">`) y hora (`<input type="time">`); el servidor construye el instante `…T HH:MM:00-05:00`. Se muestra con `formatDepartureShortDate` / `formatDepartureTime` (ya existentes).
D3. **Estados**: al crear siempre `scheduled`. Transiciones permitidas: `scheduled → en_route | cancelled`, `en_route → completed | cancelled`. `completed` y `cancelled` son terminales (la fila queda solo lectura salvo borrar, si no tiene reservas).
D4. **Con cupos vendidos (`booked_seats > 0`)** no se puede: cambiar fecha/hora, cancelar ni bajar la capacidad por debajo de lo vendido. Sí se puede: subir capacidad, cambiar guía, pasar a `en_route` / `completed`.
D5. **Fecha futura**: al crear y al cambiar la fecha, `starts_at > ahora`. No aplica al editar otros campos (una salida del día puede pasar a `en_route` con su hora ya vencida).
D6. **Capacidad**: entero `1..100` (mismo tope que `max_group_size` en el schema de paquete 021). Al elegir paquete en el alta, se precarga con su `max_group_size`; no se acota a él.
D7. **Borrado real** solo sin reservas de ninguna clase (`bookings.departure_id` es `onDelete: restrict`); con reservas se bloquea y se indica "cancélala" (si no tiene cupos vendidos) en vez de borrar.
D8. **Alcance**: `departures` no tiene `organizer_id`; el dueño es `packages.organizer_id`. Todo acceso hace join con `packages` y filtra por el operador de la sesión. El `organizerId` sale siempre de la sesión.
D9. **Concurrencia**: el `update` se hace con guarda optimista (`booked_seats` y `status` leídos); si 0 filas, `STALE` ("recarga e inténtalo de nuevo"). Evita cancelar/reprogramar justo cuando se vende un cupo.
D10. **Paquetes en borrador** admiten salidas (el operador las prepara antes de publicar); solo `published` cuenta para invalidar caché pública.

## Reuse
- Reuse: `modules/packages/utils/manage-gate.ts` (`getWriteBlock`, `manageFail`, `MANAGE_MESSAGES`), `types/package-manage.ts` (`OrganizerScope`, `ManageResult`), `utils/field-errors.ts` (`toFieldErrors`), `utils/package-write.ts` (`isFkViolation`, `isUniqueViolation`) — patrón y errores de 021.
- Reuse: `getCurrentOrganizer` (`modules/organizers`), `listGuides` / `GuideDto` (021) para el selector de guía, `CACHE_TAGS.departures` (`lib/cache-tags.ts`) — el tag ya lo leen `getDepartures` y `getTours`.
- Reuse: `components/shared/confirm-action-dialog.tsx`, `components/shared/status-badge.tsx` (mapeo estado → variante), `components/shared/page-skeleton.tsx`; `components/ui/{button,input,field,alert,native-select}`.
- Reuse: `formatDepartureShortDate`, `formatDepartureTime`, `seatsLeft`, `limaToday` (`utils/package-detail.ts`, `utils/tour-filters.ts`) para mostrar y para el `min` del input de fecha.
- Reuse (patrón, no código): `guide-manager.tsx` (form en línea, `useTransition`, errores por campo, `router.refresh()`), `guides-page.tsx` (estados vacíos/sin perfil), `own-package-service.ts` / `package-manage-service.ts` (lecturas vs escrituras).
- Extend: `types/package-manage.ts` y `utils/manage-gate.ts` — códigos y mensajes nuevos (`SEATS_SOLD`, `DEPARTURE_CLOSED`, `INVALID_TRANSITION`, `DEPARTURE_HAS_BOOKINGS`, `STALE`).
- Extend: `actions/guide-actions.ts` y `actions/package-actions.ts` — pasan a usar `withOrganizer` (comportamiento y tests sin cambios).
- Extend: `modules/organizers/components/organizer-nav-links.ts` (+ test), `modules/packages/index.ts` (export `DeparturesPage`).
- New: `departure-time.ts` — conversión fecha/hora Lima ↔ instante; no existe (el seed tiene `limaDate` pero es de `lib/db/seed`, no se importa desde el módulo; `dayRange` solo hace días).
- New: `departure-rules.ts`, `departure-schema.ts`, `own-departure-service.ts`, `departure-manage-service.ts`, `departure-actions.ts`, componentes. `departure-service.ts` ya existe pero es de lectura pública (`getBookableDeparture`, checkout); no se mezcla con escrituras del operador.
- Instalado, no hace falta nada más: sin shadcn nuevo ni npm.

## Acceptance criteria

### Schemas y reglas puras
- AC1: `departureInputSchema` (alta) acepta `{ packageId: uuid, date: "YYYY-MM-DD", time: "HH:MM", capacity: 1..100 entero, guideId: uuid | "" | null }` y produce `{ packageId, startsAt: Date, capacity, guideId: string | null }` con `startsAt` = fecha y hora de Lima. Rechaza con mensaje por campo: fecha con formato inválido o inexistente (`2026-02-30` no se "rueda" a marzo), hora fuera de `00:00–23:59`, capacidad fuera de rango/no entera, `packageId`/`guideId` no uuid. `""` en `guideId` → `null`.
- AC2: `departureUpdateSchema` es el mismo sin `packageId` y con `status` (enum `departure_status`); el `packageId` no es editable.
- AC3: `limaToInstant("2026-11-05", "07:30")` = `2026-11-05T12:30:00.000Z` y `instantToLimaParts` es su inverso exacto (round-trip), también cerca de medianoche UTC.
- AC4: `allowedNextStatuses` devuelve `scheduled → [en_route, cancelled]`, `en_route → [completed, cancelled]`, `completed → []`, `cancelled → []`.
- AC5: `checkDepartureChange(current, next, now)` devuelve, por este orden: `DEPARTURE_CLOSED` si `current.status` es terminal; `INVALID_TRANSITION` si `next.status` no es el mismo ni está permitido; `INVALID_INPUT` con `fieldErrors.capacity` si `next.capacity < current.bookedSeats`; `SEATS_SOLD` si cambia `startsAt` o pasa a `cancelled` con `bookedSeats > 0`; `INVALID_INPUT` con `fieldErrors.date` si `startsAt` cambia y no es futura. `null` si es válido. Sin cambios de `startsAt` no exige fecha futura (D5).
- AC6: `checkNewDeparture(startsAt, now)` devuelve `INVALID_INPUT` con `fieldErrors.date` si no es futura.

### Service
- AC7: `listOwnDepartures(organizerId)` devuelve solo salidas de paquetes de ese operador (nunca ajenas), con título y estado del paquete, nombre de guía (o null), `capacity`, `bookedSeats`, `status`, `startsAt`; orden: `scheduled`/`en_route` por `starts_at` asc y luego `completed`/`cancelled` por `starts_at` desc; tope 500 filas.
- AC8: `getDepartureFormOptions(organizerId)` devuelve los paquetes propios (`id`, `title`, `maxGroupSize`, por título; cualquier estado) y las guías propias (`listGuides`).
- AC9: `createDeparture(scope, input)` inserta con `status = scheduled`, `booked_seats = 0`. Falla con `INVALID_INPUT` + `fieldErrors.packageId` si el paquete no es del operador, `fieldErrors.guideId` si la guía no es del operador, `fieldErrors.date` si ya existe una salida del mismo paquete en ese instante (unique `departures_package_starts_at_unique`) o si no es futura. `suspended` → `ORGANIZER_SUSPENDED`; `pending` puede crear.
- AC10: `updateDeparture(scope, id, input)`: `NOT_FOUND` si la salida no es de un paquete del operador; aplica `checkDepartureChange`; valida la guía (propia); duplicado de fecha → `fieldErrors.date`; el `update` lleva la guarda de `booked_seats` y `status` leídos y devuelve `STALE` si no afecta filas. No cambia `package_id`.
- AC11: `deleteDeparture(scope, id)`: `NOT_FOUND` si no es del operador; `DEPARTURE_HAS_BOOKINGS` si `booked_seats > 0` o la FK de `bookings` lo impide (`23503`, p. ej. reservas pendientes/canceladas); si no, borra.
- AC12: toda escritura exitosa devuelve `catalogChanged = (package.status === "published")`.

### Actions
- AC13: `createDepartureAction`, `updateDepartureAction`, `deleteDepartureAction` siguen el flujo de 021: `getCurrentOrganizer()` (lanza `AuthError`, no se captura) → `null` = `NO_ORGANIZER` → validar `id`/input con Zod (`INVALID_INPUT` + `fieldErrors` vía `toFieldErrors`) → service; error inesperado de BD → `console.error` con texto fijo y `UNKNOWN`. `organizerId` nunca viene del input. Si `ok && catalogChanged` → `updateTag(CACHE_TAGS.departures)`; en cualquier otro caso no invalida.
- AC14: `withOrganizer` (sesión → organizer → try/catch → `UNKNOWN`) está en un solo archivo y lo usan `guide-actions`, `package-actions` y `departure-actions`; los tests de las dos primeras pasan sin modificarse.

### UI
- AC15: `/operador/salidas` existe (`metadata.title` "Salidas", `h1` "Salidas", `Suspense`), protegida por el layout `(organizer)`; "Salidas" aparece en el nav del operador (desktop y móvil) y se marca activa en esa ruta.
- AC16: cada fila muestra paquete, fecha y hora de Lima (`Jue 5 nov 2026 · 7:30 a. m.`), guía o "Sin guía", `StatusBadge` del estado (Programada / En ruta / Completada / Cancelada), y "N de M cupos vendidos" con "Quedan K" (o "Agotada" si K = 0). Las secciones Próximas e Historial se ocultan si están vacías.
- AC17: el formulario "Nueva salida" tiene paquete (select), fecha (`min` = hoy en Lima), hora, capacidad (precargada con `max_group_size` al elegir paquete) y guía (opcional, "Sin guía"); valida con el schema antes de enviar; errores por campo asociados con `aria-describedby`; al guardar se limpia y la lista se refresca.
- AC18: "Editar" abre el formulario en línea (paquete solo lectura). Fecha/hora quedan deshabilitadas con texto explicativo si hay cupos vendidos; la capacidad tiene `min` = cupos vendidos; el select de estado ofrece solo el actual y sus siguientes permitidos (D3), y "Cancelada" no se ofrece con cupos vendidos. Salidas terminales no muestran "Editar".
- AC19: "Eliminar" usa `ConfirmActionDialog`; si la action devuelve error (p. ej. `DEPARTURE_HAS_BOOKINGS`) el diálogo queda abierto con el mensaje; si `ok`, se cierra y se refresca.
- AC20: estados de pantalla: sin perfil de operador (mensaje como en guías); sin paquetes (texto + link a `/operador/paquetes/nuevo`, sin formulario); sin salidas ("Aún no tienes salidas"); sin guías (el selector solo tiene "Sin guía" y un link a `/operador/guias`); operador `suspended` → aviso y todos los controles de escritura deshabilitados.
- AC21: los errores generales de acción (`message`) se muestran en un `Alert` `role="alert"`; los controles de acción en curso quedan deshabilitados (`useTransition`); botones y campos con área táctil estándar del sistema (los de 021).

## Contracts

### Estructura de archivos
```
modules/packages/
  types/package-manage.ts            (extiende códigos)
  utils/manage-gate.ts               (+ mensajes)  + manage-gate.test.ts
  utils/departure-time.ts            (+ .test.ts)
  utils/departure-rules.ts           (+ .test.ts)
  schemas/departure-schema.ts        (+ .test.ts)
  services/own-departure-service.ts  (+ .test.ts)   # lecturas del operador
  services/departure-manage-service.ts (+ .test.ts) # escrituras
  actions/with-organizer.ts
  actions/departure-actions.ts       (+ .test.ts)
  components/{departures-page,departure-row,departure-form}.tsx
app/(organizer)/operador/salidas/page.tsx
```
Tests colocados `*.test.ts` (Vitest incluye solo `**/*.test.ts`); los `.tsx` no se testean (SETUP §3). Los tests con BD usan `describe.skipIf(!process.env.DATABASE_URL)` e import dinámico de `@/lib/db`, como `guide-service.test.ts`.

### Errores (extiende `ManageErrorCode` y `MANAGE_MESSAGES`)
```ts
| "SEATS_SOLD" | "DEPARTURE_CLOSED" | "INVALID_TRANSITION" | "DEPARTURE_HAS_BOOKINGS" | "STALE"
// SEATS_SOLD:             "Esta salida ya tiene cupos vendidos: no puedes cambiar su fecha ni cancelarla."
// DEPARTURE_CLOSED:       "Una salida completada o cancelada ya no se puede modificar."
// INVALID_TRANSITION:     "No puedes pasar la salida a ese estado desde el actual."
// DEPARTURE_HAS_BOOKINGS: "Esta salida tiene reservas, no se puede eliminar."
// STALE:                  "Los cupos cambiaron mientras editabas. Recarga e inténtalo de nuevo."
```
Mensajes de campo (en `fieldErrors`): `date`: "Elige una fecha futura." / "Ya tienes una salida de este paquete a esa hora."; `capacity`: "La capacidad no puede ser menor a los cupos vendidos (N)."; `packageId`: "Elige un paquete tuyo."; `guideId`: "Elige una guía tuya."

### `utils/departure-time.ts`
```ts
export function limaToInstant(date: string, time: string): Date | null; // null si date/time inexistentes (round-trip)
export function instantToLimaParts(d: Date): { date: string; time: string }; // "YYYY-MM-DD", "HH:MM"
```

### `utils/departure-rules.ts`
```ts
import type { departureStatus } from "@/lib/db/schema/enums";
export type DepartureStatus = (typeof departureStatus.enumValues)[number];

export function allowedNextStatuses(from: DepartureStatus): DepartureStatus[];
export const isTerminalStatus: (s: DepartureStatus) => boolean;
export const DEPARTURE_STATUS_LABELS: Record<DepartureStatus, string>; // Programada | En ruta | Completada | Cancelada
export const DEPARTURE_STATUS_BADGE: Record<DepartureStatus, BookingStatusKey>;
//   scheduled -> neutral, en_route -> pending, completed -> confirmed, cancelled -> cancelled
export function soldLabel(booked: number, capacity: number): { sold: string; left: string };
//   { sold: "12 de 20 cupos vendidos", left: "Quedan 8" | "Agotada" }

export type RuleError =
  | { code: "DEPARTURE_CLOSED" | "INVALID_TRANSITION" | "SEATS_SOLD" }
  | { code: "INVALID_INPUT"; fieldErrors: Record<string, string> };
export function checkNewDeparture(startsAt: Date, now: Date): RuleError | null;
export function checkDepartureChange(
  current: { startsAt: Date; capacity: number; bookedSeats: number; status: DepartureStatus },
  next: { startsAt: Date; capacity: number; status: DepartureStatus },
  now: Date,
): RuleError | null;
```

### `schemas/departure-schema.ts` (Zod 4)
```ts
export const MAX_DEPARTURE_CAPACITY = 100;
export const departureInputSchema: z.ZodType<DepartureInput, unknown>;   // AC1
export const departureUpdateSchema: z.ZodType<DepartureUpdateInput, unknown>; // AC2
export const departureIdSchema = z.uuid();
export type DepartureInput = { packageId: string; startsAt: Date; capacity: number; guideId: string | null };
export type DepartureUpdateInput = Omit<DepartureInput, "packageId"> & { status: DepartureStatus };
// Entrada cruda del cliente: { packageId, date, time, capacity: number | string, guideId } (capacity coerce desde string del input).
```

### Services
```ts
// services/own-departure-service.ts  (sin "use cache": panel dinámico)
export type OwnDepartureItem = {
  id: string; packageId: string; packageTitle: string; packageStatus: "draft" | "published";
  startsAt: Date; capacity: number; bookedSeats: number; status: DepartureStatus;
  guideId: string | null; guideName: string | null;
};
export type DepartureFormOptions = {
  packages: { id: string; title: string; maxGroupSize: number }[];
  guides: GuideDto[];
};
export function listOwnDepartures(organizerId: string): Promise<OwnDepartureItem[]>;
export function getDepartureFormOptions(organizerId: string): Promise<DepartureFormOptions>;

// services/departure-manage-service.ts
export function createDeparture(scope: OrganizerScope, input: DepartureInput, now?: Date):
  Promise<ManageResult<{ id: string; catalogChanged: boolean }>>;
export function updateDeparture(scope: OrganizerScope, id: string, input: DepartureUpdateInput, now?: Date):
  Promise<ManageResult<{ catalogChanged: boolean }>>;
export function deleteDeparture(scope: OrganizerScope, id: string):
  Promise<ManageResult<{ catalogChanged: boolean }>>;
```
Escrituras: `getWriteBlock(scope.status, { publishing: false })` → `manageFail`. Dueño verificado con join `departures → packages` y `packages.organizer_id = scope.id`. Update: `where id = $ and booked_seats = $leído and status = $leído` + `returning`. Errores de BD: `isUniqueViolation(e, "departures_package_starts_at_unique")` → `fieldErrors.date`; `isFkViolation` en delete → `DEPARTURE_HAS_BOOKINGS`.

### Actions (`"use server"`, solo exportan funciones async)
```ts
// actions/with-organizer.ts  (sin "use server": helper interno)
export async function withOrganizer<T>(name: string,
  body: (scope: OrganizerScope) => Promise<ManageResult<T>>): Promise<ManageResult<T>>;

// actions/departure-actions.ts
export function createDepartureAction(input: unknown): Promise<ManageResult<{ id: string }>>;
export function updateDepartureAction(id: string, input: unknown): Promise<ManageResult>;
export function deleteDepartureAction(id: string): Promise<ManageResult>;
```
`catalogChanged` no sale al cliente: lo consume la action para `updateTag(CACHE_TAGS.departures)` y se omite del resultado devuelto.

### Componentes
```ts
// departures-page.tsx (server, async): organizer -> listOwnDepartures + getDepartureFormOptions + today = limaToday(new Date()) (después del await dinámico)
// departure-form.tsx (client)
type DepartureFormProps =
  | { mode: "create"; options: DepartureFormOptions; minDate: string; disabled: boolean }
  | { mode: "edit"; item: OwnDepartureItem; options: DepartureFormOptions; minDate: string; disabled: boolean;
      onDone: () => void; onCancel: () => void };
// departure-row.tsx (client): props { item: OwnDepartureItem; options: DepartureFormOptions; minDate: string; disabled: boolean }
```

### Ruta
| Ruta | Contenido |
| ---- | --------- |
| `/operador/salidas` | `h1` "Salidas" + `<Suspense fallback={<PageSkeleton/>}><DeparturesPage/></Suspense>` |

### Exports / nav
`modules/packages/index.ts` agrega `DeparturesPage`. `ORGANIZER_NAV_LINKS` agrega `{ label: "Salidas", href: "/operador/salidas", icon: CalendarDays }` (lucide-react) y su test se actualiza (orden: Perfil, Paquetes, Salidas, Guías).

## Edge cases
- Fecha con día inexistente (`2026-02-30`) o hora `24:00`: error de campo, no se "rueda" (`new Date` de V8 rueda febrero; se compara el round-trip).
- Dos salidas del mismo paquete a la misma hora: unique de BD → error en `date`. Mismo instante en otro paquete: permitido.
- Salida del día con hora ya vencida: se puede pasar a `en_route`/`completed`; no se puede reprogramar a una fecha pasada.
- Venta concurrente al editar/cancelar: guarda optimista → `STALE`; la lista se refresca al mostrar el error.
- Capacidad = cupos vendidos: válido (queda "Agotada"); el check de BD `booked_seats <= capacity` es la red de seguridad.
- Salida con reservas `pending`/`cancelled` y `booked_seats = 0`: no se puede borrar (FK), sí cancelar.
- Guía borrada (`ON DELETE SET NULL`): la salida aparece "Sin guía".
- Paquete pasado a borrador/despublicado: sus salidas siguen visibles en el panel; el sitio público ya las oculta por el filtro `published`.
- Operador `suspended`: ve todo, no escribe (también bloqueado en el service). `pending`: escribe.
- Inputs `type="date"/"time"` sin soporte en navegadores viejos caen a texto: el schema valida el formato.
- Techo conocido: lista sin paginación, tope 500 filas (`// ponytail:` en el service; paginar/filtrar por paquete si un operador lo supera).
- Referencia en el panel de paquetes: la chip "Sin salidas" (021) no cambia; enlazarla a `/operador/salidas` queda fuera.

## Tests
- `utils/departure-time.test.ts` — AC3 (conversión, round-trip, fechas inexistentes, cerca de medianoche UTC).
- `utils/departure-rules.test.ts` — AC4, AC5, AC6 (cada transición, terminales, capacidad vs vendidos, fecha cambiada con/sin cupos, cancelar con cupos, `soldLabel`, mapa de badges).
- `schemas/departure-schema.test.ts` — AC1, AC2 (feliz; fecha/hora/capacidad inválidas; `""` → null; `startsAt` correcto; capacidad desde string).
- `utils/manage-gate.test.ts` (actualizado) — nuevos códigos con mensaje no vacío.
- `services/own-departure-service.test.ts` (BD) — AC7, AC8 (aislamiento entre operadores, orden de secciones, guía null).
- `services/departure-manage-service.test.ts` (BD) — AC9–AC12 (propiedad de paquete y guía, duplicado, `suspended`/`pending`, STALE por cambio de `booked_seats`, borrado con reserva, `catalogChanged` según estado del paquete).
- `actions/departure-actions.test.ts` — AC13 (mocks: sin organizer, input inválido, éxito invalida tag solo si `catalogChanged`, error inesperado → `UNKNOWN`, `AuthError` se propaga).
- `actions/guide-actions.test.ts`, `actions/package-actions.test.ts` — AC14 (sin cambios, siguen en verde).
- `modules/organizers/components/organizer-nav-links.test.ts` (actualizado) — AC15.

## Plan
Tres fases; cada una deja `lint + tsc + test` en verde y la app funcionando. Las fases 1 y 2 no cambian la UI; la 3 entrega `/operador/salidas`.

### Phase 1 — Base pura (errores, tiempo, reglas, schema; sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: nuevos `ManageErrorCode` y mensajes; actualizar test de mensajes | modules/packages/types/package-manage.ts, modules/packages/utils/manage-gate.ts, modules/packages/utils/manage-gate.test.ts | - | - | AC5 | done |
| T2 | `departure-time` y `departureInputSchema` / `departureUpdateSchema` con tests | modules/packages/utils/departure-time.ts, modules/packages/utils/departure-time.test.ts, modules/packages/schemas/departure-schema.ts, modules/packages/schemas/departure-schema.test.ts | T1 | A | AC1, AC2, AC3 | done |
| T3 | `departure-rules` (transiciones, `checkNewDeparture`, `checkDepartureChange`, etiquetas/badges/`soldLabel`) con tests | modules/packages/utils/departure-rules.ts, modules/packages/utils/departure-rules.test.ts | T1 | A | AC4, AC5, AC6 | done |

### Phase 2 — Services y actions (sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | `withOrganizer` y migración de `guide-actions` / `package-actions` (tests sin cambios) | modules/packages/actions/with-organizer.ts, modules/packages/actions/guide-actions.ts, modules/packages/actions/package-actions.ts | - | A | AC14 | done |
| T5 | Lecturas: `listOwnDepartures`, `getDepartureFormOptions` y test con BD | modules/packages/services/own-departure-service.ts, modules/packages/services/own-departure-service.test.ts | T2, T3 | A | AC7, AC8 | done |
| T6 | Escrituras: `createDeparture`, `updateDeparture`, `deleteDeparture` (propiedad, reglas, guarda optimista, regla por estado) y test con BD | modules/packages/services/departure-manage-service.ts, modules/packages/services/departure-manage-service.test.ts | T2, T3 | A | AC9, AC10, AC11, AC12 | done |
| T7 | `departure-actions` (3 actions, `updateTag` condicional) y test | modules/packages/actions/departure-actions.ts, modules/packages/actions/departure-actions.test.ts | T4, T6 | B | AC13 | done |

### Phase 3 — UI y ruta `/operador/salidas`
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T8 | setup: link "Salidas" en el nav y su test; export `DeparturesPage` del módulo | modules/organizers/components/organizer-nav-links.ts, modules/organizers/components/organizer-nav-links.test.ts, modules/packages/index.ts | - | - | AC15 | done |
| T9 | `DepartureForm` (cliente: alta y edición en línea, validación con el schema, errores por campo, restricciones por cupos vendidos y estado) | modules/packages/components/departure-form.tsx | T7, T8 | A | AC17, AC18, AC21 | done |
| T10 | `DepartureRow` (cliente: datos, cupos vendidos, badge, editar, eliminar con `ConfirmActionDialog`) | modules/packages/components/departure-row.tsx | T9 | B | AC16, AC18, AC19, AC21 | done |
| T11 | `DeparturesPage` (server: organizer, secciones, estados vacíos/sin perfil/suspendido) y ruta | modules/packages/components/departures-page.tsx, app/(organizer)/operador/salidas/page.tsx | T10 | C | AC15, AC16, AC20 | done |

Notas de ejecución:
- Fase 2: T4, T5 y T6 son independientes (grupo A, sin archivos en común); T7 espera a T4 y T6. Los tests con BD solo corren con `DATABASE_URL`; verificar localmente antes de cerrar la fase.
- Fase 3: T9 → T10 → T11 son secuenciales por imports (cada componente usa el anterior); no hay grupo paralelo. `modules/packages/index.ts` y `organizer-nav-links.ts` los toca solo T8.
- Verificación manual al cerrar la fase 3 (con `DATABASE_URL`): crear → ver en `/paquetes/<slug>` (selector de fecha) → pasar a en ruta → completar → intentar borrar con reserva → cancelar sin cupos; comprobar que el selector público refleja el cambio.

## Open questions
1. **Cancelar con cupos vendidos.** Default de la spec: bloqueado (`SEATS_SOLD`) porque no existe flujo de reembolso ni de aviso al cliente. ¿Se acepta, o se permite cancelar y se deja el reembolso manual (admin) hasta que exista el flujo de cancelación de reservas?
2. **Estados terminales.** Default: `completed` y `cancelled` no se pueden reabrir ni editar. ¿Alcanza, o se permite reabrir una `cancelled` sin cupos vendidos (error de dedo)?
3. **Cambiar fecha/hora con cupos vendidos.** Default: bloqueado (los clientes reservaron esa fecha). ¿Se acepta, o se permite reprogramar y avisar?
4. **Tope de capacidad.** Default: 1–100, precargada con `max_group_size` pero sin acotarse a él (el seed usa `capacity = max_group_size`, pero el ERM no lo impone). ¿Hay que exigir `capacity <= max_group_size`?
5. **Cupos vendidos.** El ERM lo define sin ambigüedad (`booked_seats`, solo reservas confirmadas); se confirma que "vendidos" no incluye reservas `pending`. ¿Se quiere mostrar además las pendientes (requeriría derivar de `bookings`)?
6. **Orden de lista.** Default: Próximas (por fecha asc) e Historial (por fecha desc) por estado, no por fecha calendario: una salida `scheduled` vencida queda en Próximas hasta que el operador la complete o cancele. ¿Conforme?
7. **Refactor `withOrganizer` (T4).** Toca `guide-actions.ts` y `package-actions.ts` (ya aprobados en 021) para evitar una tercera copia. ¿Se acepta o se prefiere copiar el wrapper en `departure-actions.ts` y refactorizar después?
