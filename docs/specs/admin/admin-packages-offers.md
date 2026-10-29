# Paquetes y ofertas del admin (/admin/paquetes, /admin/ofertas)

- Module: admin (código en `packages` y `offers`)
- Status: approved
- Approved by: leandro291 (2026-10-29)
- Mode: SDD

## Goal
Tarjeta Trello 027. `admin` y `super_admin` ven, editan, publican/despublican y borran los paquetes de **todos** los operadores en `/admin/paquetes`, y gestionan las ofertas de todos los operadores en `/admin/ofertas`. Reusa los services, schemas, formularios y filas de 021 y 024 con alcance global; no se duplica ninguna regla de negocio.

## Scope
- In:
  - `/admin/paquetes`: lista de todos los paquetes con el nombre del operador, "Editar", "Ver en el sitio", publicar/pasar a borrador y eliminar.
  - `/admin/paquetes/[id]/editar`: el formulario de 021 sobre cualquier paquete.
  - `/admin/ofertas`: lista de todas las ofertas (con operador), crear, editar y borrar sobre cualquier paquete.
  - Links "Paquetes" y "Ofertas" en `ADMIN_NAV_LINKS`.
  - Services de paquetes con `PackageScope = OrganizerScope | "all"` (mismo patrón que `OfferScope` de 024, D7); los de ofertas ya aceptan `"all"`.
  - Server Actions de admin con `requireRole("admin")`.
- Out:
  - **Crear paquetes desde admin** (hace falta elegir operador dueño; ver Open questions).
  - Salidas, guías y reservas ajenas (026 cubre reservas; salidas/guías no están en la tarjeta).
  - Filtros, búsqueda y paginación (lista sin paginar, igual que 021/024).
  - Cambiar el operador dueño de un paquete; aprobar/suspender operadores (tarjeta de operadores).
  - Schema, migraciones, dependencias npm, componentes shadcn nuevos.

## Decisiones a aprobar
- **D1. Alcance global como parámetro, no servicios nuevos.** `PackageScope = OrganizerScope | "all"` en `updatePackage`, `setPackageStatus`, `deletePackage`, `listOwnPackages` y `getOwnPackageForEdit`. Con `OrganizerScope` todo queda idéntico a hoy (filtra `organizer_id = scope.id` y aplica `getWriteBlock`). Con `"all"` no filtra por dueño ni aplica `getWriteBlock`. `createPackage` sigue recibiendo solo `OrganizerScope` (necesita dueño).
- **D2. Admin no se bloquea por el estado del operador.** Puede editar, publicar y borrar paquetes de un operador `pending` o `suspended` (moderación). Las pantallas reutilizadas reciben `organizerStatus="active"` y los avisos de "cuenta suspendida/pendiente" no aparecen.
- **D3. La autorización vive en la action y en la página (SYSTEM-DESIGN §Autenticación).** `proxy.ts` ya exige `admin` en `/admin(.*)`. Las actions de admin pasan por `withAdmin` (`requireRole("admin")`, sin capturar `AuthError`, como `withOrganizer`); las páginas llaman `requireRole("admin")` (025 D6). El alcance `"all"` nunca sale del cliente.
- **D4. Componentes compartidos con prop `panel: "organizer" | "admin"`**, no copias. `PackageForm`, `PackageRowActions`, `OwnOfferForm` y `OwnOfferRow` son Client Components que importan sus actions; reciben `panel` (default `"organizer"`) y eligen action y rutas con un mapa constante. Alternativa descartada: pasar las actions por props (más superficie y tipos).
- **D5. La fila del paquete se extrae** de `own-packages-list.tsx` a `package-row.tsx` (props: `item`, `panel`, `organizerStatus`) para que la usen `OwnPackagesList` y `AdminPackagesList`. Sin cambio visual del operador.
- **D6. Operador visible.** `OwnPackageListItem` y `OwnOfferItem` ganan `organizerName` (`organizers.business_name`, join). La fila lo muestra solo en `panel="admin"`.
- **D7. Caché.** Las escrituras de admin invalidan `CACHE_TAGS.packages` / `CACHE_TAGS.offers` con la misma regla `catalogChanged` que 021/024. Las lecturas del panel siguen dinámicas.
- **D8. Una acción de lógica compartida.** El `run`+`invalid` de `package-actions.ts` pasa a `actions/run-package-action.ts` (sin `"use server"`, helper) parametrizado por el guard (`withOrganizer` | `withAdmin`); lo mismo para ofertas. Los archivos `"use server"` solo exportan las actions.

## Reuse
- Reuse: `modules/packages/services/package-manage-service.ts`, `schemas/package-schema.ts` — misma validación y reglas (HAS_BOOKINGS, slug inmutable, etc.).
- Reuse: `modules/offers/services/{offer-list,offer-manage}-service.ts` — ya aceptan `"all"` (024 D7).
- Reuse: `package-form*.tsx`, `package-row-actions.tsx`, `own-offer-form.tsx`, `own-offer-row.tsx`, `ConfirmActionDialog`, `StatusBadge`, `PageSkeleton`, `formatPen`.
- Reuse: `lib/auth/require-role.ts`, `modules/packages/actions/with-organizer.ts` (patrón de `withAdmin`).
- Extend: `own-package-service.ts` — scope + `organizerName`; `package-manage-service.ts` — scope en update/status/delete; `package-form.tsx`, `package-row-actions.tsx`, `own-offer-form.tsx`, `own-offer-row.tsx` — prop `panel`; `own-offers-page.tsx` — extrae el cuerpo reutilizable; `modules/admin/components/admin-nav-links.ts` — dos links.
- New: `with-admin.ts`, `run-package-action.ts`, `admin-package-actions.ts`, `package-row.tsx`, `admin-packages-list.tsx`, `admin-package-editor.tsx`; `admin-offer-actions.ts`, `admin-offers-page.tsx`; 3 páginas en `app/(admin)/admin/` — no existe nada equivalente con `"all"`.
- Nota: la rama `026-admin-bookings` también agrega un link a `ADMIN_NAV_LINKS`; si hay conflicto, conservar ambos.

## Acceptance criteria
- AC1: Con rol `admin` o `super_admin`, `/admin/paquetes` lista **todos** los paquetes (borrador y publicados, de cualquier operador) con portada, título, destino, tipo, duración, precio, estado y nombre del operador. Sin paquetes: "Aún no hay paquetes". `organizer` y `customer` no llegan (`proxy.ts`); la página además llama `requireRole("admin")`.
- AC2: "Editar" abre `/admin/paquetes/[id]/editar` con el formulario de 021 precargado; guardar actualiza el paquete (slug y operador dueño no cambian) y vuelve a `/admin/paquetes`. Un `id` inexistente o mal formado -> `notFound()`.
- AC3: Publicar / pasar a borrador y eliminar funcionan sobre paquetes de cualquier operador, incluso con operador `pending` o `suspended` (D2). Las reglas de borrado (HAS_BOOKINGS, HAS_DEPARTURES, HAS_OFFERS) y los mensajes son los de 021.
- AC4: `updatePackage`/`setPackageStatus`/`deletePackage` con `scope = "all"` operan sobre cualquier paquete; con `OrganizerScope` siguen devolviendo `NOT_FOUND` para paquetes ajenos y aplicando `getWriteBlock` (sin regresión de 021).
- AC5: Las actions de admin (`updatePackageAdminAction`, `setPackageStatusAdminAction`, `deletePackageAdminAction`, y las de ofertas) rechazan a quien no sea `admin`+ (lanzan `AuthError`, no se captura) y validan input con los mismos schemas; devuelven `ManageResult` y nunca reciben ni aceptan un scope del cliente.
- AC6: Una escritura de admin sobre un paquete publicado (o que lo era) invalida `CACHE_TAGS.packages`; una sobre una oferta de paquete publicado invalida `CACHE_TAGS.offers`; sobre borradores no invalida.
- AC7: `/admin/ofertas` lista todas las ofertas con paquete, operador, tipo, descuento, vigencia y estado (Activa / Vencida / Inactiva, `offerState` de 024). Sin ofertas: "Aún no hay ofertas". Sin paquetes en la plataforma: aviso de que no hay paquetes (sin CTA de crear).
- AC8: Admin crea, edita y borra ofertas de **cualquier** paquete (el selector lista todos los paquetes con el operador). Reglas de `checkOffer` (vigencia, mínimo de personas ≤ `maxGroupSize`, etc.) y mensajes iguales a 024; sin bloqueo por estado del operador.
- AC9: `ADMIN_NAV_LINKS` incluye "Paquetes" (`/admin/paquetes`) y "Ofertas" (`/admin/ofertas`) tras "Resumen"; el link activo lleva `aria-current="page"` también en `/admin/paquetes/[id]/editar`.
- AC10: `/operador/paquetes` y `/operador/ofertas` no cambian (textos, rutas, avisos de estado ni comportamiento); los tests existentes de 021/024 pasan sin editar su intención.
- AC11: Diseño y accesibilidad: mismos patrones de 021/024 (`rounded-card bg-surface shadow-card`, objetivos ≥ 44 px, foco visible, íconos `aria-hidden`, un solo CTA `accent` por vista); a 390 px sin scroll horizontal; el nombre del operador no rompe la fila (`break-words`).
- AC12: `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde.

## Contracts
```ts
// modules/packages/types/package-manage.ts
export type PackageScope = OrganizerScope | "all"; // "all": admin (027)

// package-manage-service.ts
updatePackage(scope: PackageScope, id, input): Promise<ManageResult<{ id; catalogChanged }>>
setPackageStatus(scope: PackageScope, id, status): Promise<ManageResult<{ catalogChanged }>>
deletePackage(scope: PackageScope, id): Promise<ManageResult<{ catalogChanged }>>
createPackage(scope: OrganizerScope, input): ...            // sin cambios

// own-package-service.ts
listOwnPackages(scope: PackageScope): Promise<OwnPackageListItem[]>   // + organizerName: string
getOwnPackageForEdit(scope: PackageScope, id): Promise<OwnPackageEdit | null>

// actions/with-admin.ts  (sin "use server")
withAdmin<T>(name, body: (scope: "all") => Promise<ManageResult<T>>): Promise<ManageResult<T>>

// actions/admin-package-actions.ts  ("use server")
updatePackageAdminAction(id: string, input: unknown): Promise<ManageResult>
setPackageStatusAdminAction(id: string, status: unknown): Promise<ManageResult>
deletePackageAdminAction(id: string): Promise<ManageResult>

// offers/actions/admin-offer-actions.ts  ("use server")
createOfferAdminAction(input: unknown): Promise<ManageResult<{ id: string }>>
updateOfferAdminAction(id: string, input: unknown): Promise<ManageResult>
deleteOfferAdminAction(id: string): Promise<ManageResult>

// offers/types/offer-manage.ts
OwnOfferItem += { organizerName: string }
OfferFormOptions.packages[] += { organizerName: string }

// Props nuevas (default "organizer")
PackageForm, PackageRowActions, OwnOfferForm, OwnOfferRow: { panel?: "organizer" | "admin" }
PackageRow: { item: OwnPackageListItem; panel: "organizer" | "admin"; organizerStatus: OrganizerScope["status"] }

// Exports nuevos (index.ts, al final)
packages: AdminPackagesList, AdminPackageEditor
offers:   AdminOffersPage
```
Rutas por panel: editar `"/operador/paquetes/${id}/editar"` | `"/admin/paquetes/${id}/editar"`; volver tras guardar `"/operador/paquetes"` | `"/admin/paquetes"`.

## Edge cases
- Paquete borrado por otro admin entre lista y edición -> `NOT_FOUND` -> mensaje de 021.
- `id` con formato inválido en la URL -> `notFound()`; en la action -> `INVALID_INPUT`.
- Admin sin perfil de operador (no existe): las páginas de admin no llaman `getCurrentOrganizer`.
- Operador cuyo paquete tiene `organizerName` largo: `break-words`, sin desbordar a 390 px.
- Dos admins editan a la vez: última escritura gana (igual que 021/024; sin guarda optimista).
- Oferta sobre un paquete que pasó a borrador: `catalogChanged = false`, sin invalidar.
- Tope de 500 filas en ofertas (024) se mantiene; la lista de paquetes no tiene tope (`ponytail:` paginar si crece).

## Tests
- `package-manage-service.test.ts` (extender, `skipIf(!DATABASE_URL)`) — AC3, AC4: `"all"` actualiza/publica/borra paquete de otro operador y de operador `suspended`; `OrganizerScope` sigue dando `NOT_FOUND` en ajenos.
- `own-package-service.test.ts` (extender) — AC1, AC2: `"all"` lista paquetes de dos operadores con `organizerName`; `getOwnPackageForEdit("all", id)` devuelve ajeno; scope de operador no.
- `with-admin.test.ts` — AC5: sin sesión/rol insuficiente lanza `AuthError`; `admin` y `super_admin` pasan; el body recibe `"all"`; error inesperado -> `UNKNOWN`.
- `admin-package-actions.test.ts` — AC5, AC6: input inválido -> `INVALID_INPUT`; invalida `packages` solo si `catalogChanged`; mock de `requireRole` y del service.
- `admin-offer-actions.test.ts` — AC5, AC6, AC8: igual con `offers`; crea sobre paquete ajeno.
- `offer-list-service.test.ts` (extender) — AC7, D6: `organizerName` presente en `listOffers("all")` y en opciones.
- `admin-nav-links.test.ts` — AC9: orden y `href` de los tres links.
- AC1–3, 7–11 además se verifican en navegador (escritorio y 390 px) con rol admin, y `/operador/*` sin regresión (AC10).

## Plan

### Phase 1 — Paquetes del admin (`/admin/paquetes`)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | services: `PackageScope`, scope en update/status/delete/list/edit, `organizerName` | `modules/packages/types/package-manage.ts`, `modules/packages/services/package-manage-service.ts`, `modules/packages/services/own-package-service.ts`, sus `*.test.ts` | - | A | AC1, AC2, AC3, AC4 | done |
| T2 | actions: `with-admin`, `run-package-action`, `admin-package-actions`; `package-actions.ts` usa el helper | `modules/packages/actions/with-admin.ts`, `modules/packages/actions/run-package-action.ts`, `modules/packages/actions/admin-package-actions.ts`, `modules/packages/actions/package-actions.ts`, tests | T1 | B | AC5, AC6, AC10 | done |
| T3 | UI: `package-row`, `AdminPackagesList`, `AdminPackageEditor`, prop `panel` en form y acciones de fila | `modules/packages/components/package-row.tsx`, `own-packages-list.tsx`, `admin-packages-list.tsx`, `admin-package-editor.tsx`, `package-form.tsx`, `package-row-actions.tsx` | T1, T2 | C | AC1, AC2, AC3, AC10, AC11 | done |
| T4 | export + páginas + nav | `modules/packages/index.ts`, `modules/admin/components/admin-nav-links.ts` (+test), `app/(admin)/admin/paquetes/page.tsx`, `app/(admin)/admin/paquetes/[id]/editar/page.tsx` | T3 | D | AC1, AC2, AC9 | done |

### Phase 2 — Ofertas del admin (`/admin/ofertas`)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | services/tipos: `organizerName` en lista y opciones | `modules/offers/types/offer-manage.ts`, `modules/offers/services/offer-list-service.ts`, su test | - | E | AC7 | done |
| T6 | actions: `run-offer-action` + `admin-offer-actions`; `offer-actions.ts` usa el helper | `modules/offers/actions/run-offer-action.ts`, `modules/offers/actions/admin-offer-actions.ts`, `modules/offers/actions/offer-actions.ts`, tests | T2, T5 | F | AC5, AC6, AC8 | done |
| T7 | UI: prop `panel`, `AdminOffersPage` (extrae cuerpo de `own-offers-page`) | `modules/offers/components/own-offer-form.tsx`, `own-offer-row.tsx`, `own-offers-page.tsx`, `admin-offers-page.tsx` | T5, T6 | G | AC7, AC8, AC10, AC11 | done |
| T8 | export + página + nav | `modules/offers/index.ts`, `modules/admin/components/admin-nav-links.ts` (+test), `app/(admin)/admin/ofertas/page.tsx` | T7 | H | AC7, AC9 | done |

## Open questions
Resueltas al aprobar (2026-10-29):
1. Admin **no** crea paquetes en 027 (tarjeta aparte).
2. Admin **sí** edita paquetes de operadores `suspended`/`pending` (D2).
