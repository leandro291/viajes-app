# Ofertas del operador (/operador/ofertas)

- Module: offers
- Status: done
- Approved by: leandro291 (2026-10-28)
- Mode: SDD

## Goal
Tarjeta Trello 024 (Fase 4 · Panel operador). El operador (`organizer`) crea, edita, activa/desactiva y borra las ofertas (`offers`) de sus paquetes y tours desde `/operador/ofertas`: tipo (`kind`), descuento (porcentaje o 2x1), mínimo de personas opcional y vigencia opcional. Cada oferta muestra su estado (Activa / Vencida / Inactiva). Al escribir sobre un paquete publicado se invalida la caché pública de ofertas. El service filtra siempre por el operador dueño del paquete y recibe el alcance como parámetro (el ticket 027 de admin lo reutilizará sobre todos los operadores; aquí no se construye admin).

## Scope
- In:
  - Ruta `/operador/ofertas` (una sola página): lista de ofertas propias, alta, edición en línea, activar/desactivar (campo del formulario) y borrado real. Mismo patrón que `/operador/salidas` (022) y `/operador/guias` (021).
  - Campos: paquete (propio, solo al crear), `kind`, `discount_type` (porcentaje | 2x1), `discount_value` (entero 1–100, solo si porcentaje), `min_people` (opcional), `valid_until` (opcional, `<input type="date">`, se guarda como 23:59 de Lima) e `is_active`.
  - Estado mostrado: **Activa** / **Vencida** / **Inactiva** (ver D3).
  - Reglas puras y testeadas: estado de la oferta, vigencia, mínimo de personas.
  - Regla de escritura por estado del operador (reusa `getWriteBlock`): `pending` puede escribir, `suspended` no.
  - Invalidación de `CACHE_TAGS.offers` desde las Server Actions cuando el paquete de la oferta está publicado.
  - Service con alcance como parámetro: `OfferScope = OrganizerScope | "all"` (D7).
  - Mover `departure-time.ts` a `lib/lima-time.ts` y exponer `withOrganizer` y los helpers de escritura por `modules/packages/index.ts` (D8, D9).
  - Link "Ofertas" en `ORGANIZER_NAV_LINKS` (+ su test).
- Out:
  - Panel admin de ofertas (027), aunque el service ya acepte `"all"`.
  - Envío de avisos (newsletter) al crear una oferta, historial de cambios, estadísticas de uso, paginación (tope de filas).
  - Constraint de unicidad "una oferta activa por paquete", o que `kind` condicione `discount_type` / `min_people`.
  - Elegir automáticamente la "mejor" oferta al reservar (ver hallazgo en D1).
  - Cambios de schema de BD o migraciones; dependencias npm nuevas; componentes shadcn nuevos.
  - Cambiar el paquete de una oferta ya creada.
  - Rediseño del panel: no hay pantalla en el artefacto Wayra, se sigue el patrón visual de `/operador/salidas`.

## Decisiones propuestas (se aprueban con la spec)
Las marcadas *(acordada)* ya las aprobó el usuario; el resto son defaults para lo que el ticket no define.

D1. **Varias ofertas activas por paquete, sin constraint** *(acordada)*. **Hallazgo verificado en código:** "gana la de mayor descuento" solo es cierto como **orden de presentación** (`compareOffers` / `discountRank` ordenan `getActiveOffers`, y el hero toma las primeras). No existe selección automática de precio: `getActiveOffers` devuelve **todas** las activas (cada una es una tarjeta en `/ofertas` con su propio link `?oferta=<id>`), la página de detalle del paquete no aplica ofertas, y el checkout aplica **solo** la oferta que viene por `offerId` (`getBookingAmount` la valida: mismo paquete, `is_active`, `valid_until` nulo o futuro; si no, `offer_invalid`). Consecuencia: con dos ofertas activas el cliente puede elegir cualquiera de las dos tarjetas. Esta spec no cambia ese comportamiento; se documenta y se deja como pregunta (OQ1).
D2. **`kind` es solo una etiqueta** *(acordada)*: no condiciona `discount_type` ni `min_people`.
D3. **Estado mostrado** *(acordada la vencida editable)*: `isActive = false` → **Inactiva** (decisión explícita del operador, tiene prioridad); si no, `valid_until` no nulo y `<= ahora` → **Vencida**; si no → **Activa**. Coincide con el predicado público (`is_active` AND `valid_until` nulo o futuro; `getActiveOffers` y `getBookingAmount`). Una oferta vencida sigue siendo editable para renovarla.
D4. **Paquetes en borrador admiten ofertas** *(acordada)*: el operador las prepara antes de publicar; solo `published` las hace visibles y solo `published` invalida la caché. La fila de una oferta de un borrador muestra el aviso "Paquete en borrador: la oferta no se muestra al público hasta que lo publiques".
D5. **Borrado real** *(acordada)*: `bookings.offer_id` es `onDelete: set null` y precios/descuentos están copiados en `bookings` (snapshot, ERM); no hay otra FK hacia `offers`. No hay bloqueo por reservas.
D6. **Caché**: `getActiveOffers` está etiquetada con `CACHE_TAGS.offers` **y** `CACHE_TAGS.packages` (el tag de packages existe porque la oferta muestra título, precio, portada y visibilidad del paquete). Una entrada con varias etiquetas se expira cuando **cualquiera** coincide, así que estas escrituras (que no cambian el paquete) solo necesitan `updateTag(CACHE_TAGS.offers)`. Cuando el operador publica/despublica un paquete o cambia su precio, `package-actions` ya invalida `packages`, lo que expira también `getActiveOffers`. Se usa `updateTag` (Server Actions: lee tus propias escrituras) igual que 022. `/ofertas` y el hero del inicio usan la misma entrada, así que quedan cubiertos.
D7. **Alcance como parámetro**: `OfferScope = OrganizerScope | "all"`. Con un `OrganizerScope` (sale de `withOrganizer`, o sea de la sesión, nunca del input) toda lectura y escritura filtra por `packages.organizer_id = scope.id` y aplica `getWriteBlock`. Con `"all"` no filtra ni aplica bloqueo (027: la autorización de admin vive en la action de admin). `offers` no tiene `organizer_id`: el dueño es el del paquete, todo acceso hace join con `packages`.
D8. **`withOrganizer` se exporta por `modules/packages/index.ts`** (opción recomendada, ver *Alternativas evaluadas*). Se exponen: `withOrganizer`, `manageFail`, `getWriteBlock` y los tipos `ManageResult`, `OrganizerScope`, `ManageErrorCode`. Los componentes cliente **no** importan el barrel (arrastra `lib/db`): usan solo `import type` (se borra en el build) y mensajes locales.
D9. **Helpers de hora Lima pasan a `lib/lima-time.ts`** (mover `departure-time.ts` + su test con `git mv`). Razón: `departure-schema` de offers es código puro y debe poder testearse sin `DATABASE_URL`, pero el barrel de `packages` importa `lib/db` y lanza al importarse sin esa variable (mismo motivo por el que `modules/offers/pricing.ts` existe aparte). Un módulo no importa internos de otro (ARCHITECTURE regla 6) y `lib/` es transversal. Cambia 2 imports de 022 (`departure-schema.ts`, `departure-form.tsx`). `limaToday` no se mueve: offers calcula el "hoy" con `instantToLimaParts(new Date()).date`.
D10. **`valid_until`** se guarda como `limaToInstant(date, "23:59")` (fin de día en Lima, igual que el seed; ya se muestra con `formatValidUntil`, D14 de `offers-page`). Se edita mostrando `instantToLimaParts(validUntil).date`.
D11. **Vigencia futura**: al crear, `valid_until` (si viene) debe ser futuro. Al editar solo se exige si **cambió** respecto al guardado (comparación de instantes), igual que D5 de 022: así se pueden editar otros campos de una oferta vencida, y renovarla exige elegir una fecha futura. "Hoy" es válido (23:59 Lima > ahora).
D12. **`min_people`**: entero 1–100 (mismo tope que capacidad/`max_group_size` en 021/022). El service además exige `min_people <= packages.max_group_size` del paquete (una oferta inalcanzable no sirve), también solo si cambió. `null` = sin mínimo.
D13. **`discount_value` con 2x1** se ignora y se guarda `null` (el check de BD lo exige); con porcentaje es obligatorio, entero 1–100.
D14. **Sin guarda optimista**: `offers` no tiene contadores; las ediciones concurrentes son "última escritura gana".
D15. **Borrado y edición de oferta ajena = `NOT_FOUND`** (no se revela su existencia). Paquete ajeno al crear = `INVALID_INPUT` con `fieldErrors.packageId`, como 022.
D16. **Orden de la lista**: por título de paquete asc, luego `created_at` desc, luego `id`. Una sola lista (sin secciones). Tope 500 filas.

## Alternativas evaluadas (D8 y D9)
| Opción | Qué implica | Veredicto |
| ------ | ----------- | --------- |
| A. Exportar por `packages/index.ts` | +1 línea de export por símbolo; 0 archivos movidos; offers ya importa ese barrel (`offer-link-service`). | **Recomendada** para el kit de servidor (`withOrganizer`, `manageFail`, `getWriteBlock`, tipos). |
| B. Mover `withOrganizer` + `manage-gate` + `package-manage` + `field-errors` a un lugar compartido (`modules/organizers` o `lib/`) | ~25 archivos de 021/022 cambian imports y tests; `lib/` no puede importar `modules/organizers`. | Descartada ahora (alcance de 3 tarjetas). Si un tercer módulo del operador (reservas) lo necesita, mover entonces a `modules/organizers`. |
| C. Copiar el wrapper en offers | Cuarta copia de la misma lógica de seguridad (sesión → organizer). | Descartada (SETUP §2 DRY). |
| Hora Lima: exportar por barrel | Barrel arrastra `lib/db`: rompe tests puros sin `DATABASE_URL` y el bundle cliente. | Descartada; mover a `lib/lima-time.ts` (D9). |

## Reuse
- Reuse: `modules/packages/actions/with-organizer.ts` (`withOrganizer`), `utils/manage-gate.ts` (`getWriteBlock`, `manageFail`, `MANAGE_MESSAGES`), `types/package-manage.ts` (`OrganizerScope`, `ManageResult`) — vía `modules/packages/index.ts` (D8). Mensajes existentes `NOT_FOUND`, `INVALID_INPUT`, `ORGANIZER_SUSPENDED`, `UNKNOWN`: no hacen falta códigos nuevos.
- Reuse: `getCurrentOrganizer` (`modules/organizers`), `CACHE_TAGS.offers` (`lib/cache-tags.ts`), `OfferKind` / `DiscountType` (`modules/offers/types/offer.ts`), `OFFER_KIND_LABELS` y `formatValidUntil` (`modules/offers/utils/offer-view.ts`).
- Reuse: `components/shared/{confirm-action-dialog,status-badge,page-skeleton}.tsx`; `components/ui/{button,input,field,alert,native-select,checkbox}` (checkbox ya usado en `package-form-basics.tsx`).
- Reuse (patrón, no código): `departures-page.tsx`, `departure-row.tsx`, `departure-form.tsx`, `departure-actions.ts` (`run` con `catalogChanged`), `departure-manage-service.ts`, `own-departure-service.ts`, `departure-schema.ts`, `guide-service.test.ts` (tests con BD).
- Reuse: `offerKind` / `discountType` enums de `lib/db/schema/enums` para el `z.enum`.
- Extend: `modules/packages/index.ts` — exports del kit de escritura (D8). `modules/packages/schemas/departure-schema.ts` y `components/departure-form.tsx` — solo la ruta de import de `limaToInstant` / `instantToLimaParts` (D9). `modules/organizers/components/organizer-nav-links.ts` (+ test). `modules/offers/index.ts` — export de `OwnOffersPage`.
- New (con razón):
  - `lib/lima-time.ts` (+ test) — es `departure-time.ts` movido, sin lógica nueva (D9).
  - `modules/offers/schemas/offer-schema.ts` — no existe validación de ofertas (el seed no valida).
  - `modules/offers/utils/offer-rules.ts` — estado, vigencia y mínimo de personas; `offer-pricing.ts` / `offer-view.ts` son de lectura pública.
  - `modules/offers/services/{offer-list-service,offer-manage-service}.ts` — `offer-service.ts` es lectura pública con caché (`"use cache"`), no se mezcla con el panel dinámico.
  - `modules/offers/actions/offer-actions.ts` y componentes `own-offer-*` — no existen en offers. La función `run` (invalidación condicional) queda duplicada respecto a `departure-actions.ts` (segunda copia; se extrae si aparece una tercera, `// ponytail:`).
- Instalado, no hace falta nada más: sin shadcn nuevo ni npm.

## Acceptance criteria

### Hora Lima compartida
- AC1: `lib/lima-time.ts` exporta `limaToInstant(date, time)` e `instantToLimaParts(d)` con el mismo comportamiento que 022; su test movido sigue en verde y `departure-schema`/`departure-form` solo cambian el import (los tests de 022 pasan sin modificarse). Cerca de medianoche UTC: `instantToLimaParts(new Date("2026-12-01T04:59:00.000Z"))` = `{ date: "2026-11-30", time: "23:59" }`.

### Schemas y reglas puras
- AC2: `offerInputSchema` (alta) acepta `{ packageId: uuid, kind, discountType, discountValue, minPeople, validUntil, isActive }` con `discountValue` / `minPeople` como `number | string | null | undefined` y `validUntil` como `"YYYY-MM-DD" | "" | null | undefined`, y produce `OfferInput` (`discountValue`/`minPeople` `number | null`, `validUntil` `Date | null` = `limaToInstant(date, "23:59")`, `isActive` booleano). `""`, `null` y `undefined` en `minPeople` / `validUntil` → `null`.
- AC3: validaciones con mensaje por campo: `packageId` no uuid; `kind` / `discountType` fuera del enum; `discountType = "percent"` con `discountValue` vacío, no entero o fuera de 1–100 → error en `discountValue`; `discountType = "two_for_one"` → `discountValue = null` aunque venga un valor; `minPeople` no entero o fuera de 1–100 → error en `minPeople`; `validUntil` con formato inválido o fecha inexistente (`2026-02-30` no se "rueda") → error en `validUntil`; `isActive` no booleano → error.
- AC4: `offerUpdateSchema` es el mismo sin `packageId`; `offerIdSchema = z.uuid()`.
- AC5: `offerState(o, now)` devuelve `"inactive"` si `isActive` es `false` (aunque esté vencida), `"expired"` si `validUntil` no es nulo y `<= now`, `"active"` en otro caso; con `validUntil == now` exacto es `"expired"` (predicado público `gt(valid_until, now())`).
- AC6: `checkOffer(current, next, maxGroupSize, now)` devuelve `fieldErrors` (o `null`): `validUntil` si `next.validUntil` es no nulo, `<= now` y (`current` es `null` o difiere de `current.validUntil` por instante); `minPeople` si `next.minPeople > maxGroupSize` y (`current` es `null` o difiere de `current.minPeople`). Ambos errores pueden venir juntos. Sin cambios en esos campos, no valida (D11, D12).
- AC7: `describeOfferTerms({ discountType, discountValue, minPeople })` devuelve `{ discount, min }`: `"25 % de descuento"` / `"2x1 (paga uno)"` y `"Desde 4 personas"` / `"Sin mínimo"`. `OFFER_STATE_LABELS` = Activa / Vencida / Inactiva y `OFFER_STATE_BADGE` = `confirmed` / `cancelled` / `neutral`.

### Service
- AC8: `listOffers(scope)` con `OrganizerScope` devuelve solo ofertas de paquetes de ese operador (nunca ajenas), con título, `status` y `maxGroupSize` del paquete, y todos los campos de la oferta; orden de D16; tope 500. Con `"all"` devuelve las de todos los operadores.
- AC9: `getOfferFormOptions(scope)` devuelve los paquetes del alcance (`id`, `title`, `status`, `maxGroupSize`; cualquier estado; por título). Con `"all"`, todos.
- AC10: `createOffer(scope, input, now?)`: inserta con los campos del input. `INVALID_INPUT` + `fieldErrors.packageId` si el paquete no está en el alcance; aplica `checkOffer(null, …)` (vigencia futura, mínimo ≤ `max_group_size`). `suspended` → `ORGANIZER_SUSPENDED` (sin tocar la BD); `pending` puede crear; `"all"` no se bloquea. **Crear no rechaza** si ya existe otra oferta activa del paquete (D1). Devuelve `{ id, catalogChanged }`.
- AC11: `updateOffer(scope, id, input, now?)`: `NOT_FOUND` si la oferta no es de un paquete del alcance (incluye ajena); aplica `checkOffer(current, …)` con `max_group_size` del paquete; actualiza todos los campos editables sin tocar `package_id` ni `created_at`; una oferta vencida es editable. Devuelve `{ catalogChanged }`.
- AC12: `deleteOffer(scope, id)`: `NOT_FOUND` si no es del alcance; si no, borra la fila; las reservas que la referenciaban conservan sus importes y quedan con `offer_id = null`.
- AC13: toda escritura exitosa devuelve `catalogChanged = (package.status === "published")` (del paquete de la oferta, también al borrar).

### Actions
- AC14: `createOfferAction`, `updateOfferAction`, `deleteOfferAction` siguen el flujo de 021/022 vía `withOrganizer`: `getCurrentOrganizer()` (lanza `AuthError`, no se captura) → `null` = `NO_ORGANIZER` → validar `id` / input con Zod (`INVALID_INPUT` + `fieldErrors` por campo) → service con el `OrganizerScope` de la sesión; error inesperado → `console.error` con texto fijo y `UNKNOWN`. El `organizerId` nunca viene del input (un `organizerId` en el input se ignora).
- AC15: si `ok && catalogChanged` → `updateTag(CACHE_TAGS.offers)` fuera del try/catch del wrapper; en cualquier otro caso (error, paquete en borrador) no se invalida. `catalogChanged` no se devuelve al cliente.

### UI
- AC16: `/operador/ofertas` existe (`metadata.title` "Ofertas", `h1` "Ofertas", `Suspense` con `PageSkeleton`), protegida por el layout `(organizer)`; "Ofertas" aparece en el nav del operador (desktop y móvil) y se marca activa en esa ruta.
- AC17: cada fila muestra paquete, tipo (`OFFER_KIND_LABELS`), descuento y mínimo (`describeOfferTerms`), vigencia ("Hasta el 30 de noviembre de 2026" con `formatValidUntil`, o "Sin vencimiento"), `StatusBadge` del estado (Activa / Vencida / Inactiva) y, si el paquete es borrador, el aviso de D4.
- AC18: el formulario "Nueva oferta" tiene paquete (select), tipo (select), tipo de descuento (Porcentaje / 2x1), porcentaje (visible y requerido solo con Porcentaje), mínimo de personas (opcional, `max` = `max_group_size` del paquete elegido), "Vigente hasta" (`type="date"`, `min` = hoy en Lima, opcional, con texto "Hasta las 23:59 (hora de Lima). Vacío = sin vencimiento") y casilla "Oferta activa" (marcada por defecto). Errores por campo del servidor asociados con `aria-describedby`; al guardar se limpia y la lista se refresca.
- AC19: "Editar" abre el formulario en línea (paquete solo lectura) también para ofertas vencidas e inactivas; "Guardar" aplica y refresca; "Cancelar" cierra sin cambios.
- AC20: "Eliminar" usa `ConfirmActionDialog`; si la action devuelve error el diálogo queda abierto con el mensaje; si `ok`, se cierra y se refresca.
- AC21: estados de pantalla: sin perfil de operador (mensaje como en guías/salidas); sin paquetes (texto + link a `/operador/paquetes/nuevo`, sin formulario); sin ofertas ("Aún no tienes ofertas", con el formulario visible); operador `suspended` → `Alert` con `MANAGE_MESSAGES.ORGANIZER_SUSPENDED` y todos los controles de escritura deshabilitados (lectura sí).
- AC22: los errores generales de acción (`message`) se muestran en un `Alert` `role="alert"`; los controles en curso quedan deshabilitados (`useTransition`); botones y campos con el área táctil estándar del sistema (los de 021/022).

## Contracts

### Estructura de archivos
```
lib/
  lima-time.ts                       (movido de packages/utils/departure-time.ts)  + lima-time.test.ts
modules/packages/
  index.ts                           (+ exports del kit de escritura)
  schemas/departure-schema.ts        (solo import)
  components/departure-form.tsx      (solo import)
modules/offers/
  types/offer-manage.ts              # OfferScope, OwnOfferItem, OfferFormOptions
  schemas/offer-schema.ts            (+ .test.ts)
  utils/offer-rules.ts               (+ .test.ts)
  services/offer-list-service.ts     (+ .test.ts)   # lecturas
  services/offer-manage-service.ts   (+ .test.ts)   # escrituras
  actions/offer-actions.ts           (+ .test.ts)
  components/{own-offers-page,own-offer-row,own-offer-form}.tsx
  index.ts                           (+ export OwnOffersPage)
modules/organizers/components/organizer-nav-links.ts (+ .test.ts)
app/(organizer)/operador/ofertas/page.tsx
```
Tests colocados `*.test.ts` (Vitest incluye solo `**/*.test.ts`); los `.tsx` no se testean (SETUP §3). Los tests con BD usan `describe.skipIf(!process.env.DATABASE_URL)` e import dinámico de `@/lib/db`, como `guide-service.test.ts`. El test de actions mockea `@/modules/packages` (su barrel exige `DATABASE_URL`) y `@/modules/organizers`.

### `lib/lima-time.ts`
```ts
export function limaToInstant(date: string, time: string): Date | null; // null si date/time inexistentes
export function instantToLimaParts(d: Date): { date: string; time: string }; // "YYYY-MM-DD", "HH:MM"
```

### Exports nuevos de `modules/packages/index.ts` (D8)
```ts
export { withOrganizer } from "./actions/with-organizer";
export { manageFail, getWriteBlock } from "./utils/manage-gate";
export type { ManageResult, OrganizerScope, ManageErrorCode } from "./types/package-manage";
```

### `types/offer-manage.ts`
```ts
import type { OrganizerScope } from "@/modules/packages";
import type { DiscountType, OfferKind } from "./offer";

export type OfferScope = OrganizerScope | "all"; // "all": uso futuro de admin (027)

export type OwnOfferItem = {
  id: string;
  packageId: string;
  packageTitle: string;
  packageStatus: "draft" | "published";
  packageMaxGroupSize: number;
  kind: OfferKind;
  discountType: DiscountType;
  discountValue: number | null;
  minPeople: number | null;
  validUntil: Date | null;
  isActive: boolean;
};
export type OfferFormOptions = {
  packages: { id: string; title: string; status: "draft" | "published"; maxGroupSize: number }[];
};
```

### `schemas/offer-schema.ts` (Zod 4)
```ts
export const MAX_OFFER_PERCENT = 100;
export const MAX_OFFER_MIN_PEOPLE = 100;
export type OfferInput = {
  packageId: string; kind: OfferKind; discountType: DiscountType;
  discountValue: number | null; minPeople: number | null;
  validUntil: Date | null; isActive: boolean;
};
export type OfferUpdateInput = Omit<OfferInput, "packageId">;
export const offerInputSchema: z.ZodType<OfferInput, unknown>;       // AC2, AC3
export const offerUpdateSchema: z.ZodType<OfferUpdateInput, unknown>; // AC4
export const offerIdSchema = z.uuid();
// Entrada cruda del cliente: { packageId, kind, discountType, discountValue: number | string,
//   minPeople: number | string, validUntil: string, isActive: boolean }
```
Mensajes: `discountValue`: "Ingresa un porcentaje entero entre 1 y 100"; `minPeople`: "Ingresa un número entero entre 1 y 100"; `validUntil`: "Ingresa una fecha válida"; `packageId`: "Elige un paquete tuyo."; `kind`: "Elige un tipo de oferta"; `discountType`: "Elige un tipo de descuento".

### `utils/offer-rules.ts`
```ts
export type OfferState = "active" | "expired" | "inactive";
export function offerState(o: { isActive: boolean; validUntil: Date | null }, now: Date): OfferState;
export const OFFER_STATE_LABELS: Record<OfferState, string>;     // Activa | Vencida | Inactiva
export const OFFER_STATE_BADGE: Record<OfferState, BookingStatusKey>; // confirmed | cancelled | neutral
export function describeOfferTerms(t: OfferTerms): { discount: string; min: string };
export function checkOffer(
  current: { validUntil: Date | null; minPeople: number | null } | null,
  next: { validUntil: Date | null; minPeople: number | null },
  maxGroupSize: number,
  now: Date,
): Record<string, string> | null;
// validUntil: "Elige una fecha de hoy o futura."
// minPeople:  `El mínimo no puede superar el máximo del paquete (${maxGroupSize}).`
```

### Services
```ts
// services/offer-list-service.ts  (sin "use cache": panel dinámico)
export function listOffers(scope: OfferScope): Promise<OwnOfferItem[]>;
export function getOfferFormOptions(scope: OfferScope): Promise<OfferFormOptions>;

// services/offer-manage-service.ts
export function createOffer(scope: OfferScope, input: OfferInput, now?: Date):
  Promise<ManageResult<{ id: string; catalogChanged: boolean }>>;
export function updateOffer(scope: OfferScope, id: string, input: OfferUpdateInput, now?: Date):
  Promise<ManageResult<{ catalogChanged: boolean }>>;
export function deleteOffer(scope: OfferScope, id: string):
  Promise<ManageResult<{ catalogChanged: boolean }>>;
```
Filtro de dueño: `scope === "all" ? undefined : eq(packages.organizerId, scope.id)` aplicado en todo `where` con join `offers → packages`. Escrituras: `scope !== "all"` → `getWriteBlock(scope.status, { publishing: false })` → `manageFail`. Update: `findOwnOffer` (join) → `checkOffer` → `update … where id = $` (sin guarda optimista, D14).

### Actions (`"use server"`, solo exportan funciones async)
```ts
export function createOfferAction(input: unknown): Promise<ManageResult<{ id: string }>>;
export function updateOfferAction(id: string, input: unknown): Promise<ManageResult>;
export function deleteOfferAction(id: string): Promise<ManageResult>;
```
Internamente `run(name, body)` envuelve `withOrganizer` y hace `updateTag(CACHE_TAGS.offers)` si `catalogChanged` (patrón de `departure-actions.ts`).

### Componentes
```ts
// own-offers-page.tsx (server, async): organizer -> listOffers + getOfferFormOptions;
//   now = new Date() y minDate = instantToLimaParts(now).date DESPUÉS del await dinámico;
//   state = offerState(item, now) por fila (se pasa a la fila).
// own-offer-form.tsx (client)
type OwnOfferFormProps =
  | { mode: "create"; options: OfferFormOptions; minDate: string; disabled: boolean }
  | { mode: "edit"; item: OwnOfferItem; options: OfferFormOptions; minDate: string; disabled: boolean;
      onDone: () => void; onCancel: () => void };
// own-offer-row.tsx (client): props { item: OwnOfferItem; state: OfferState; options: OfferFormOptions;
//   minDate: string; disabled: boolean }
```
Los componentes cliente solo usan `import type` de `@/modules/packages` (ver D8) y el schema/utils de offers.

### Ruta y exports
| Ruta | Contenido |
| ---- | --------- |
| `/operador/ofertas` | `h1` "Ofertas" + `<Suspense fallback={<PageSkeleton/>}><OwnOffersPage/></Suspense>` |

`modules/offers/index.ts` agrega `OwnOffersPage`. `ORGANIZER_NAV_LINKS` agrega `{ label: "Ofertas", href: "/operador/ofertas", icon: Tag }` (lucide-react) y su test se actualiza (orden: Perfil, Paquetes, Salidas, Ofertas, Guías).

## Edge cases
- Oferta vencida: sigue en la lista como "Vencida"; se edita sin exigir fecha futura salvo que cambie `valid_until` (renovar = elegir fecha futura o vaciarla).
- Oferta inactiva y vencida a la vez: se muestra "Inactiva" (D3).
- Dos ofertas activas del mismo paquete: permitido; ambas aparecen en `/ofertas` (ordenadas por mayor descuento) y cada una aplica solo si el cliente llega con su `oferta` (D1).
- `valid_until` guardado con otra hora (no 23:59 Lima): al editar sin tocar la fecha el instante no cambia en la validación; al guardar se normaliza a 23:59 Lima (inocuo).
- Fecha inexistente (`2026-02-30`): error de campo, no se "rueda" (round-trip de `limaToInstant`).
- Paquete pasado a borrador después de crear la oferta: la oferta sigue en el panel y desaparece del sitio público (el filtro `published` ya existe en `getActiveOffers` y en el checkout).
- Paquete con `max_group_size` bajado luego de crear la oferta (`min_people` > nuevo máximo): editar otros campos no falla (solo se valida si cambió `min_people`).
- Borrar una oferta usada en reservas: permitido; las reservas conservan precios y quedan sin `offer_id`. Una oferta borrada mientras un cliente está en el checkout: el pago cae a `offer_invalid` (ya manejado por `checkout-service`).
- Oferta ajena (uuid válido de otro operador): `NOT_FOUND` en editar/borrar; `INVALID_INPUT` en `packageId` al crear.
- Operador `suspended`: ve todo, no escribe (también bloqueado en el service). `pending`: escribe (las ofertas de un paquete aún no publicado no son visibles; si su paquete está publicado también invalidan).
- Desfase de caché pública ya aceptado en `offers-page.md` (D2): una oferta que vence sigue visible hasta que la entrada se revalide; las escrituras de este panel sí la expiran al instante (D6).
- Los `<input type="date">` sin soporte caen a texto: el schema valida el formato.
- Techo conocido: lista sin paginación, tope 500 filas (`// ponytail:` en el service; paginar/filtrar por paquete si un operador lo supera).
- Mensaje `ORGANIZER_SUSPENDED` dice "no puedes modificar paquetes": se reutiliza tal cual (aplica porque las ofertas cuelgan de paquetes); ver OQ4.

## Tests
- `lib/lima-time.test.ts` (movido de `departure-time.test.ts`) — AC1 (conversión, round-trip, fechas inexistentes, cerca de medianoche UTC).
- `modules/offers/utils/offer-rules.test.ts` — AC5, AC6, AC7 (cada estado y precedencia inactiva > vencida; `valid_until == now`; vigencia cambiada/no cambiada/null; mínimo vs `max_group_size`; ambos errores juntos; etiquetas).
- `modules/offers/schemas/offer-schema.test.ts` — AC2, AC3, AC4 (feliz percent y 2x1; `""` → null; `discountValue` ignorado en 2x1; porcentaje vacío/0/101/decimal; `minPeople` inválido; `2026-02-30`; `validUntil` = 23:59 Lima; `isActive`; strings numéricos).
- `modules/offers/services/offer-list-service.test.ts` (BD) — AC8, AC9 (aislamiento entre operadores, `"all"`, orden, borrador incluido).
- `modules/offers/services/offer-manage-service.test.ts` (BD) — AC10–AC13 (paquete ajeno, `suspended` / `pending`, segunda oferta activa del mismo paquete permitida, vigencia pasada al crear, editar vencida sin cambiar fecha, renovar con fecha pasada, `min_people` > máximo, edición/borrado de oferta ajena = `NOT_FOUND`, borrado con reserva que referencia la oferta → `bookings.offer_id` null, `catalogChanged` según estado del paquete, scope `"all"`).
- `modules/offers/actions/offer-actions.test.ts` — AC14, AC15 (mocks: sin organizer, input inválido, id inválido, `organizerId` en el input ignorado, éxito invalida `CACHE_TAGS.offers` solo si `catalogChanged`, error de service no invalida, error inesperado → `UNKNOWN`, `AuthError` se propaga).
- `modules/packages/schemas/departure-schema.test.ts`, `actions/*.test.ts` — sin cambios, siguen en verde (AC1).
- `modules/organizers/components/organizer-nav-links.test.ts` (actualizado) — AC16.

## Plan
Tres fases; cada una deja `lint + tsc + test` en verde y la app funcionando. Las fases 1 y 2 no cambian la UI visible; la 3 entrega `/operador/ofertas`.

### Phase 1 — Base compartida y pura (hora Lima, exports del kit, schema, reglas)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `git mv` de `departure-time.ts` (+ test) a `lib/lima-time.ts`, actualizar imports en `departure-schema.ts` y `departure-form.tsx`; exportar `withOrganizer`, `manageFail`, `getWriteBlock` y tipos por `modules/packages/index.ts` | lib/lima-time.ts, lib/lima-time.test.ts, modules/packages/utils/departure-time.ts, modules/packages/utils/departure-time.test.ts, modules/packages/schemas/departure-schema.ts, modules/packages/components/departure-form.tsx, modules/packages/index.ts | - | - | AC1 | done |
| T2 | `offer-rules` (estado, etiquetas/badges, `describeOfferTerms`, `checkOffer`) con tests | modules/offers/utils/offer-rules.ts, modules/offers/utils/offer-rules.test.ts | T1 | A | AC5, AC6, AC7 | done |
| T3 | `offerInputSchema` / `offerUpdateSchema` / `offerIdSchema` con tests | modules/offers/schemas/offer-schema.ts, modules/offers/schemas/offer-schema.test.ts | T1 | A | AC2, AC3, AC4 | done |

### Phase 2 — Services, actions y revalidación de caché (sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | tipos del panel + lecturas: `OfferScope`, `OwnOfferItem`, `OfferFormOptions`, `listOffers`, `getOfferFormOptions` y test con BD | modules/offers/types/offer-manage.ts, modules/offers/services/offer-list-service.ts, modules/offers/services/offer-list-service.test.ts | T1 | A | AC8, AC9 | done |
| T5 | escrituras: `createOffer`, `updateOffer`, `deleteOffer` (alcance, `getWriteBlock`, `checkOffer`, `catalogChanged`) y test con BD | modules/offers/services/offer-manage-service.ts, modules/offers/services/offer-manage-service.test.ts | T2, T3, T4 | B | AC10, AC11, AC12, AC13 | done |
| T6 | visibilidad/revalidación: 3 actions con `withOrganizer` + `updateTag(CACHE_TAGS.offers)` condicional, y test | modules/offers/actions/offer-actions.ts, modules/offers/actions/offer-actions.test.ts | T3, T5 | C | AC14, AC15 | done |

### Phase 3 — UI y ruta `/operador/ofertas`
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T7 | `OwnOfferForm` (cliente: alta y edición en línea, campos condicionales por tipo de descuento, errores por campo del servidor) | modules/offers/components/own-offer-form.tsx | T6 | - | AC18, AC19, AC22 | done |
| T8 | `OwnOfferRow` (cliente: datos, estado, aviso de borrador, editar, eliminar con `ConfirmActionDialog`) | modules/offers/components/own-offer-row.tsx | T7 | - | AC17, AC19, AC20, AC22 | done |
| T9 | `OwnOffersPage` (server: organizer, estados vacíos/sin perfil/suspendido, lista), export en el módulo y ruta | modules/offers/components/own-offers-page.tsx, modules/offers/index.ts, app/(organizer)/operador/ofertas/page.tsx | T8 | - | AC16, AC17, AC21 | done |
| T10 | link "Ofertas" en el nav del operador y su test (al final, para no dejar un link a una ruta inexistente) | modules/organizers/components/organizer-nav-links.ts, modules/organizers/components/organizer-nav-links.test.ts | T9 | - | AC16 | done |

Notas de ejecución:
- Fase 1: T1 primero (mueve archivos compartidos y toca `packages/index.ts`); T2 y T3 en paralelo (grupo A, sin archivos en común).
- Fase 2: T4 y T5 comparten solo el tipo `OfferScope`, por eso T5 depende de T4 (no hay paralelo entre ellas). T6 depende de T5 por el import del service. Los tests con BD solo corren con `DATABASE_URL`; verificar localmente antes de cerrar la fase.
- Fase 3: T7 → T8 → T9 → T10 son secuenciales por imports; no hay grupo paralelo. `modules/offers/index.ts` lo toca solo T9; `organizer-nav-links.ts` solo T10.
- Verificación manual al cerrar la fase 3 (con `DATABASE_URL`): crear una oferta de porcentaje en un paquete publicado → verla en `/ofertas` sin esperar la revalidación; pasarla a inactiva → desaparece; renovar una vencida; crear una oferta 2x1 en un paquete borrador (no aparece en `/ofertas`, no invalida); borrar una oferta con reserva asociada; comprobar con el operador `suspended` que todo queda deshabilitado.

## Open questions
**Resueltas al aprobar (2026-10-28):** OQ1 se acepta el comportamiento actual (solo se documenta; sin ticket aparte por ahora); OQ2 se acepta `min_people <= max_group_size`; OQ3 se aprueba mover `departure-time.ts` a `lib/lima-time.ts`; OQ4 se reutiliza el mensaje `ORGANIZER_SUSPENDED` tal cual; OQ5 vigencia futura al crear y, al editar, solo si cambia. Texto original abajo.

1. **OQ1 (hallazgo sobre la decisión 1, requiere confirmación).** "Gana la de mayor descuento" hoy solo ordena la presentación (`/ofertas` y el hero); ni el detalle del paquete ni el checkout eligen una oferta: cada tarjeta lleva su `oferta=<id>` y el checkout aplica solo esa. Con varias activas el cliente puede reservar con la menos conveniente para el operador. ¿Se acepta el comportamiento actual (default de esta spec: solo documentarlo), o se abre un ticket aparte para que el checkout/detalle apliquen la mejor oferta vigente?
2. **OQ2.** `min_people <= max_group_size` del paquete (D12), validado solo cuando el campo cambia. ¿Se acepta ese tope o se deja solo 1–100?
3. **OQ3.** D9 toca archivos de 022 ya aprobados (`departure-schema.ts`, `departure-form.tsx`: solo el import) y mueve `departure-time.ts` a `lib/`. ¿Se aprueba, o se prefiere duplicar los helpers en offers (descartado por DRY)?
4. **OQ4.** `MANAGE_MESSAGES.ORGANIZER_SUSPENDED` dice "no puedes modificar paquetes" y se reutiliza para ofertas. ¿Se deja tal cual (default) o se generaliza el texto a "no puedes modificar tu catálogo" (tocaría `manage-gate.ts` y su test)?
5. **OQ5.** Vigencia (D11): al crear se exige `valid_until` futuro, y al editar solo si cambia. ¿Conforme, o se permite crear ofertas ya vencidas?
