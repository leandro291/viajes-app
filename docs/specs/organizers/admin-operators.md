# Operadores del admin (/admin/operadores)

- Module: organizers
- Status: approved
- Approved by: leandro291 (2026-10-29)
- Mode: SDD

## Goal
Tarjeta Trello 030. `admin` y `super_admin` ven los operadores en `/admin/operadores` y pasan su estado (`organizers.status`) entre `pending`, `active` y `suspended`. Al activar, se garantiza el rol `organizer` en Clerk (`publicMetadata.role`) antes de guardar en la base. La tarjeta 031 (alta/baja de admins) reutilizará el helper de Clerk.

## Scope
- In:
  - `/admin/operadores`: lista de todos los operadores (pendientes primero) con razón social, RUC, WhatsApp, correo y nombre del usuario, fecha de alta y estado (`StatusBadge`).
  - Acciones por fila: **Aprobar** y **Rechazar** (si `pending`), **Suspender** (si `active`), **Reactivar** (si `suspended`), cada una con diálogo de confirmación.
  - `lib/auth/clerk-role.ts`: único lugar que llama a `clerkClient` (ARCHITECTURE §5). `ensureClerkRole(clerkId, min)`.
  - Servicio `setOperatorStatus` con orden de escritura Clerk -> BD y manejo de fallo parcial (D3).
  - Server Action `setOperatorStatusAction` con `requireRole("admin")` y validación Zod.
  - Link "Operadores" en `ADMIN_NAV_LINKS`.
- Out:
  - **Crear la fila de `organizers`** (razón social, RUC, WhatsApp son `NOT NULL`; hace falta un alta: formulario "Quiero ser operador" o alta por admin). `organizer-shell.md` la atribuía a 030, pero la tarjeta no la pide. Ver Open questions Q2.
  - Editar datos de la empresa, borrar operadores, búsqueda, filtros, paginación (lista sin paginar, tope 500, igual que ofertas).
  - Quitar el rol a un operador (no se hace al suspender, D4) y asignar/quitar `admin`/`super_admin` (031).
  - Ocultar o despublicar los paquetes de un operador suspendido (Q3).
  - Avisos por correo o WhatsApp (fuera de v1, SYSTEM-DESIGN decisión 3).
  - Cambios de schema, migraciones, dependencias npm, componentes shadcn nuevos. Pantalla del artefacto Wayra: no existe para operadores (019 D5 ya lo verificó); se sigue `DESIGN-SYSTEM.md` y los patrones de 027/028.

## Decisiones a aprobar
- **D1. Permisos: `admin` y `super_admin` (guard `requireRole("admin")`).** Sigue SYSTEM-DESIGN ("un `admin` activa operadores"), la matriz de ERM (`organizers`: admin CRU, super_admin CRUD) y el pedido de la tarjeta. Contradice la frase de ARCHITECTURE §4 ("solo `super_admin` ve ... aprobación de operadores"); ver Q1. Doble defensa: `proxy.ts` ya exige `admin` en `/admin(.*)`; la página y la action vuelven a llamar `requireRole("admin")`.
- **D2. Rol en Clerk = fuente de verdad; `users.role` lo escribe solo el webhook.** `ensureClerkRole` actualiza `publicMetadata.role` y el webhook `user.updated` refleja `users.role` (`mapClerkUser`). No se escribe `users.role` desde la action: un solo escritor, sin carreras ni drift (YAGNI). Nada autoriza con `users.role` (grep: solo `mapClerkUser` lo lee/escribe).
- **D3. Orden de escritura: Clerk primero, BD después, solo al activar.**
  1. Transición a `active` (desde `pending` o `suspended`): `ensureClerkRole(clerkId, "organizer")`. Si falla -> `CLERK_FAILED`, **nada cambió**, se puede reintentar.
  2. `update organizers set status`. Si falla tras éxito de Clerk -> `PARTIAL` ("el rol se asignó, pero no se guardó el estado; inténtalo de nuevo"). El estado intermedio (rol `organizer` + `status` `pending`/`suspended`) es **seguro**: 019/021 ya modelan que un organizer `pending` entra al panel con aviso y sin poder publicar, y un `suspended` no puede escribir (`getWriteBlock`). Reintentar es idempotente (`ensureClerkRole` no escribe si ya cumple). No hay compensación (revertir el rol sería peor que el estado intermedio).
  3. Orden inverso descartado: BD `active` con Clerk `customer` deja a un operador "activo" que `proxy.ts` redirige a `/` sin explicación.
  4. `ensureClerkRole` **nunca baja** el rol: lee el rol actual de Clerk (`getUser` + `roleFromClaims`) y solo escribe si es menor a `min` (un `admin` o `super_admin` con perfil de operador conserva su rol). Escribe con `updateUserMetadata` (merge: no pisa otras claves de `publicMetadata`).
- **D4. Suspender no toca Clerk.** Un `suspended` conserva el rol `organizer` para que `/operador` siga mostrando el aviso de cuenta suspendida (019 AC5) y `getWriteBlock` bloquee sus escrituras. Quitar el rol lo mandaría a `/` sin explicación. `suspended` y `pending` son solo BD; únicamente `-> active` llama a Clerk.
- **D5. Transiciones permitidas.** Destino solo `active` o `suspended` (nunca se vuelve a `pending`). Cualquier estado actual es válido como origen. Mismo estado = no-op `ok` sin llamar a Clerk (idempotencia ante doble clic). Lógica pura en `getStatusChange(current, target)`, testeable sin BD. `pending -> suspended` se muestra como "Rechazar".
- **D6. Sin concurrencia optimista.** Dos admins a la vez: gana la última escritura (igual que 021/024/027). `ponytail:` agregar `where status = :current` si aparece como problema.
- **D7. Sin caché pública.** `organizers` no alimenta el catálogo cacheado, así que no hay `updateTag`. La lista del panel es dinámica (`Suspense`, `cacheComponents`). Tras la action, la fila hace `router.refresh()` (patrón de `PackageRowActions`).
- **D8. Resultado propio `OperatorResult`**, no `ManageResult` ni `CatalogResult`: ninguno tiene `CLERK_FAILED`/`PARTIAL` y ampliarlos tocaría archivos de otras tarjetas. Wrapper del guard dentro del archivo de la action (no exportado): `requireRole("admin")` fuera del `try` (el `AuthError` sube), cuerpo dentro con texto fijo de log -> `UNKNOWN`. `ponytail:` es el 4º wrapper del mismo patrón (`withOrganizer`, `withAdmin`, `runAdminAction`); unificarlos es una tarjeta de refactor, no de esta.
- **D9. Lista con `<ul>` de filas** (patrón de `AdminDestinationsList` / `PackageRow`), no tabla: pocas filas, sin ordenar ni paginar; `BookingsTable` es específica de reservas y `components/ui/table` no aporta sin columnas ordenables.
- **D10. Sesión del operador.** Clerk emite el token con el rol nuevo al refrescar la sesión (hasta ~60 s o al volver a entrar). Limitación conocida de Clerk; el texto de éxito de "Aprobar" lo avisa a quien aprueba, no hay lógica extra.

## Reuse
- Reuse: `lib/auth/require-role.ts` (`requireRole`, `AuthError`), `lib/auth/roles.ts` (`roleFromClaims`, `hasRole`, `Role`) — guard y comparación de roles.
- Reuse: `@clerk/nextjs/server` `clerkClient` (ya instalado, `@clerk/backend` 7: `users.getUser`, `users.updateUserMetadata`). No hay otro uso en el repo.
- Reuse: `components/shared/confirm-action-dialog.tsx` — confirmación con error en línea (se pasa `pendingLabel`), `components/shared/status-badge.tsx`, `components/shared/page-skeleton.tsx`, `components/ui/button.tsx`.
- Reuse: `modules/organizers/types/organizer.ts` (`OrganizerStatus`), `lib/db` (`organizers`, `users`), `lib/db/schema/enums.ts` (`organizerStatus.enumValues` para Zod).
- Reuse (patrón): `modules/packages/actions/with-admin.ts` y `admin-package-actions.ts` (guard + `safeParse` + texto fijo de log); `modules/destinations/components/admin-destinations-list.tsx` (lista de panel); `modules/packages/components/package-row-actions.tsx` (acciones de fila con `router.refresh`); `modules/users/services/clerk-sync-service.test.ts` (`describe.skipIf(!DATABASE_URL)` con import dinámico y limpieza); `modules/packages/actions/with-admin.test.ts` (mock de `requireRole`).
- Extend: `modules/organizers/components/organizer-profile-card.tsx` — el mapa `STATUS_BADGE` pasa a `utils/organizer-status-badge.ts` (2º consumidor real: perfil y lista; DRY), sin cambio visual.
- Extend: `modules/organizers/index.ts` — export `AdminOperatorsPage`; `modules/admin/components/admin-nav-links.ts` (+test) — un link.
- New: `lib/auth/clerk-role.ts` — no existe ningún acceso a Clerk Backend API; 031 lo reutiliza.
- New: servicio, schema, action y tres componentes en `modules/organizers/` — hoy el módulo solo tiene lecturas del propio operador (`getOrganizerByClerkId`); ninguna lista ni escribe.
- Verificado y descartado: `listOwnPackages`-style scopes (aquí no hay alcance por dueño), `components/ui/table`, dependencias nuevas (Clerk ya cubre todo).
- Nota: otras ramas de admin también agregan un link a `ADMIN_NAV_LINKS`; si hay conflicto, conservar todos.

## Acceptance criteria
- AC1: Con rol `admin` o `super_admin`, `/admin/operadores` lista todos los operadores con razón social, RUC, WhatsApp, correo y nombre del usuario (o solo correo si no hay nombre), fecha de alta y estado con ícono + texto. Orden: `pending` primero, luego por `created_at` descendente. Sin operadores: "Aún no hay operadores". `organizer` y `customer` no llegan (`proxy.ts`); la página además llama `requireRole("admin")`.
- AC2: Las acciones por fila dependen del estado: `pending` -> "Aprobar" y "Rechazar"; `active` -> "Suspender"; `suspended` -> "Reactivar". Cada una abre un diálogo de confirmación con el nombre de la empresa; el error de la action se muestra dentro del diálogo y la lista se refresca al tener éxito.
- AC3: Aprobar o reactivar (`-> active`) primero asegura el rol `organizer` en Clerk y luego guarda `status = 'active'`. Si Clerk falla, devuelve `CLERK_FAILED` y la fila **no** cambia. Si Clerk funciona y la BD falla, devuelve `PARTIAL` y reintentar lo completa (D3).
- AC4: Suspender o rechazar (`-> suspended`) solo actualiza `organizers.status`; no llama a Clerk (D4).
- AC5: `ensureClerkRole(clerkId, "organizer")` escribe `publicMetadata.role = "organizer"` solo si el rol actual (vía `roleFromClaims`) es menor; un usuario ya `organizer`, `admin` o `super_admin` no se modifica ni se baja; no pisa otras claves de `publicMetadata`. Un error de Clerk se propaga.
- AC6: Pedir el mismo estado que ya tiene el operador devuelve `ok` sin llamar a Clerk ni escribir; un `id` inexistente devuelve `NOT_FOUND`.
- AC7: `setOperatorStatusAction` rechaza (lanza `AuthError`, no se captura) a quien no sea `admin`+; valida `id` (uuid) y `status` (`active` | `suspended`) con Zod en servidor -> `INVALID_INPUT`; nunca lee rol ni alcance del cliente; un fallo inesperado devuelve `UNKNOWN` con texto fijo en el log (sin datos del input).
- AC8: `ADMIN_NAV_LINKS` incluye "Operadores" (`/admin/operadores`) al final; el link activo lleva `aria-current="page"` en esa ruta.
- AC9: `OrganizerProfileCard` (019) se ve igual tras extraer el mapa de badges; sus tests y los de `organizer-nav-links` pasan sin editar su intención.
- AC10: Diseño y accesibilidad: `rounded-card bg-surface shadow-card`, objetivos >= 44 px, foco visible, íconos `aria-hidden`, sin CTA `accent` (todas las acciones `outline`; una confirmación destructiva usa el estilo del diálogo existente); a 390 px sin scroll horizontal; razón social y correo con `break-words`; los botones de la fila llevan `aria-label` con el nombre de la empresa.
- AC11: `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde.

## Contracts
```ts
// lib/auth/clerk-role.ts  (único acceso a clerkClient; sin "use server")
export async function ensureClerkRole(clerkId: string, min: Role): Promise<"updated" | "unchanged">;
// getUser(clerkId) -> roleFromClaims({ metadata: user.publicMetadata }); si hasRole(actual, min) -> "unchanged";
// si no -> updateUserMetadata(clerkId, { publicMetadata: { role: min } }) -> "updated". Errores se propagan.

// modules/organizers/types/organizer-manage.ts
export type OperatorTarget = "active" | "suspended";
export type OperatorItem = {
  id: string; businessName: string; ruc: string; whatsapp: string;
  status: OrganizerStatus; createdAt: Date;
  email: string; userName: string | null;           // "Nombre Apellido" o null
};
export type OperatorErrorCode = "NOT_FOUND" | "INVALID_INPUT" | "CLERK_FAILED" | "PARTIAL" | "UNKNOWN";
export type OperatorResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: OperatorErrorCode; message: string; fieldErrors?: Record<string, string> };
export const OPERATOR_MESSAGES: Record<OperatorErrorCode, string>;
export function operatorFail(code: OperatorErrorCode, fieldErrors?: Record<string, string>): Extract<OperatorResult, { ok: false }>;
// Parte pura: la importan también los componentes cliente (sin Clerk ni BD).

// modules/organizers/utils/status-change.ts  (puro)
export type StatusChange = { kind: "noop" } | { kind: "change"; ensureRole: boolean };
export function getStatusChange(current: OrganizerStatus, target: OperatorTarget): StatusChange;
// current === target -> noop; target "active" -> { change, ensureRole: true }; target "suspended" -> { change, ensureRole: false }

// modules/organizers/utils/organizer-status-badge.ts
export const ORGANIZER_STATUS_BADGE: Record<OrganizerStatus, { status: BookingStatusKey; label: string }>;
// active -> confirmed "Activo", pending -> pending "Pendiente", suspended -> cancelled "Suspendido"

// modules/organizers/schemas/operator-schema.ts
export const operatorStatusSchema = z.object({ id: z.uuid(), status: z.enum(["active", "suspended"]) });
export type OperatorStatusInput = z.infer<typeof operatorStatusSchema>;

// modules/organizers/services/operator-service.ts  (sin guard: el llamador autoriza)
export function listOperators(): Promise<OperatorItem[]>;            // organizers join users, pending primero, created_at desc, limit 500
export function setOperatorStatus(id: string, target: OperatorTarget): Promise<OperatorResult<{ status: OrganizerStatus }>>;
// 1 select organizer+clerk_id -> NOT_FOUND | getStatusChange -> noop: ok
// 2 ensureRole -> ensureClerkRole(clerkId, "organizer") (catch -> CLERK_FAILED, log fijo)
// 3 update organizers set status where id (catch -> PARTIAL si hubo paso 2, UNKNOWN si no)

// modules/organizers/actions/operator-actions.ts  ("use server")
export async function setOperatorStatusAction(id: string, status: unknown): Promise<OperatorResult<{ status: OrganizerStatus }>>;
// requireRole("admin") fuera del try; safeParse({ id, status }); setOperatorStatus; catch -> UNKNOWN

// Componentes
// operator-status-actions.tsx  (client)  props: { id: string; businessName: string; status: OrganizerStatus }
// operator-row.tsx             (server)  props: { item: OperatorItem }
// admin-operators-page.tsx     (async server) sin props: requireRole("admin") + listOperators + <ul>

// modules/organizers/index.ts (se agrega)
export { AdminOperatorsPage } from "./components/admin-operators-page";
```
Mensajes (`OPERATOR_MESSAGES`): `NOT_FOUND` "No encontramos a ese operador."; `INVALID_INPUT` "Revisa los datos e inténtalo de nuevo."; `CLERK_FAILED` "No pudimos asignar el rol en Clerk. No se cambió nada; inténtalo de nuevo."; `PARTIAL` "El rol se asignó, pero no se guardó el estado. Inténtalo de nuevo."; `UNKNOWN` "No pudimos guardar los cambios. Inténtalo de nuevo.".
Ruta: `app/(admin)/admin/operadores/page.tsx` (`metadata.title = "Operadores"`): `h1` + `<Suspense fallback={<PageSkeleton />}><AdminOperatorsPage /></Suspense>`.

## Edge cases
- Usuario de Clerk borrado o `clerk_id` inexistente (p. ej. operadores del seed, cuyos `clerk_id` son `seed_*`): `getUser` falla -> `CLERK_FAILED` al activar/reactivar; suspender sigue funcionando (no usa Clerk). Aceptado: en desarrollo, reactivar un operador sembrado falla salvo que su `clerk_id` exista en Clerk.
- Doble clic o dos admins con el mismo destino: el segundo ve no-op `ok`.
- Operador que es también `admin`/`super_admin`: se puede suspender su perfil de operador sin afectar su rol; aprobarlo no lo baja (AC5).
- Operador con sesión abierta: ve el rol nuevo al refrescar el token (D10); un `suspended` ve el aviso 019 en la siguiente carga.
- Fallo parcial: ver D3/AC3; el mensaje `PARTIAL` indica reintentar.
- Razón social o correo largos: `break-words`, sin desbordar a 390 px.
- Nuevo valor de `organizer_status`: `ORGANIZER_STATUS_BADGE` es `Record<OrganizerStatus, ...>` y tsc avisa.
- `AuthError` en la action: sube al framework (el `proxy.ts` ya redirige antes en el uso normal).

## Tests
- `lib/auth/clerk-role.test.ts` — AC5: mock de `@clerk/nextjs/server`; sin rol y `customer` -> `updateUserMetadata(clerkId, { publicMetadata: { role: "organizer" } })` y `"updated"`; `organizer`, `admin`, `super_admin` -> `"unchanged"` sin escribir; `getUser` o `updateUserMetadata` que rechazan se propagan.
- `modules/organizers/utils/status-change.test.ts` — D5, AC3, AC4, AC6: las 3x2 combinaciones de origen/destino (`noop` si igual; `ensureRole` solo con destino `active`).
- `modules/organizers/schemas/operator-schema.test.ts` — AC7: uuid válido/ inválido, `active`/`suspended` válidos, `pending` y valores ajenos rechazados.
- `modules/organizers/types/organizer-manage.test.ts` — `operatorFail` devuelve el mensaje del código y `fieldErrors` solo si se pasa (opcional, 1 caso; omitir si queda trivial).
- `modules/organizers/services/operator-service.test.ts` — AC1, AC3, AC4, AC6 (`describe.skipIf(!process.env.DATABASE_URL)`, import dinámico, `vi.mock("@/lib/auth/clerk-role")`, datos con `RUN` único y limpieza): `listOperators` ordena `pending` primero y trae correo/nombre; `pending -> active` llama `ensureClerkRole(clerkId, "organizer")` y guarda; si `ensureClerkRole` rechaza -> `CLERK_FAILED` y la fila sigue `pending`; `active -> suspended` no llama a Clerk; mismo estado -> `ok` sin Clerk; `id` inexistente -> `NOT_FOUND`; fallo de BD tras Clerk ok -> `PARTIAL` (simulado con `id` válido y `vi.spyOn(db, "update")` que rechaza; si es frágil, cubrir con una prueba de la rama aislada).
- `modules/organizers/actions/operator-actions.test.ts` — AC7: mock de `requireRole` y del service; `AuthError` `UNAUTHENTICATED`/`FORBIDDEN` suben sin llamar al service; `admin` y `super_admin` pasan; `id` no uuid o `status: "pending"` -> `INVALID_INPUT` sin llamar al service; error inesperado -> `UNKNOWN` y log de texto fijo.
- `modules/admin/components/admin-nav-links.test.ts` (extender) — AC8: "Operadores" al final con su `href`; activo en `/admin/operadores`.
- UI (AC1, AC2, AC9, AC10): sin tests unitarios (markup que solo compone); verificación manual en navegador (escritorio y 390 px) con rol `admin`: aprobar, rechazar, suspender, reactivar, error de Clerk (clave inválida) y `/operador` de un operador suspendido.

## Plan

### Phase 1 — Clerk, lógica y servicio (verificable con tests; la app no cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `ensureClerkRole` (único uso de `clerkClient`) + test | lib/auth/clerk-role.ts, lib/auth/clerk-role.test.ts | - | A | AC5 | todo |
| T2 | Tipos/resultado, `getStatusChange`, `ORGANIZER_STATUS_BADGE`, `operatorStatusSchema` + tests | modules/organizers/types/organizer-manage.ts, modules/organizers/utils/status-change.ts, modules/organizers/utils/status-change.test.ts, modules/organizers/utils/organizer-status-badge.ts, modules/organizers/schemas/operator-schema.ts, modules/organizers/schemas/operator-schema.test.ts | - | A | AC3, AC4, AC6, AC7 | todo |
| T3 | `listOperators` + `setOperatorStatus` + test condicionado a DB | modules/organizers/services/operator-service.ts, modules/organizers/services/operator-service.test.ts | T1, T2 | - | AC1, AC3, AC4, AC6 | todo |

Nota: sin tarea setup (no hay `npm i` ni `shadcn add`). T1 y T2 no comparten archivos y corren en paralelo.

### Phase 2 — Action, UI y cableado
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | Server Action `setOperatorStatusAction` + test | modules/organizers/actions/operator-actions.ts, modules/organizers/actions/operator-actions.test.ts | T3 | B | AC7 | todo |
| T5 | `OrganizerProfileCard` usa `ORGANIZER_STATUS_BADGE` (sin cambio visual) | modules/organizers/components/organizer-profile-card.tsx | T2 | B | AC9 | todo |
| T6 | UI: `OperatorStatusActions` (client), `OperatorRow`, `AdminOperatorsPage` | modules/organizers/components/operator-status-actions.tsx, modules/organizers/components/operator-row.tsx, modules/organizers/components/admin-operators-page.tsx | T3, T4, T5 | - | AC1, AC2, AC10 | todo |
| T7 | Export, página y nav | modules/organizers/index.ts, modules/admin/components/admin-nav-links.ts, modules/admin/components/admin-nav-links.test.ts, app/(admin)/admin/operadores/page.tsx | T6 | - | AC1, AC8, AC11 | todo |

## Open questions
Requieren decisión humana al aprobar (cada una con su default, que es lo que describe la spec):
1. **Q1. ¿Quién aprueba operadores: `admin` + `super_admin` o solo `super_admin`?** Default: ambos (SYSTEM-DESIGN, ERM y la tarjeta). ARCHITECTURE §4 dice "solo `super_admin` ve ... aprobación de operadores y configuración del sitio" y quedaría desactualizada: habría que corregir esa frase (o, si se prefiere solo `super_admin`, cambiar el guard a `requireRole("super_admin")` y ocultar el link para `admin`, lo que exige un nav por rol que hoy no existe).
2. **Q2. ¿Cómo nace la fila de `organizers`?** Hoy nada la crea salvo el seed, así que esta pantalla solo gestiona filas ya existentes. `organizer-shell.md` decía "la crea la tarjeta 030"; la tarjeta solo habla de activar/suspender. Opciones: (a) tarjeta aparte con formulario "Quiero ser operador" (cliente, crea `pending`) — default, o (b) botón "Nuevo operador" en esta pantalla (admin elige usuario por correo + razón social/RUC/WhatsApp, crea `active` y asigna rol): suma un formulario, schema y servicio a 030.
3. **Q3. ¿Suspender debe ocultar los paquetes publicados del operador?** Default: no. Hoy el catálogo público no filtra por `organizers.status`; suspender solo bloquea escrituras del operador (`getWriteBlock`) y muestra el aviso. Ocultarlos exige filtrar las consultas públicas y su caché (tarjeta aparte).
4. **Q4. ¿Suspender debe quitar el rol `organizer` en Clerk?** Default: no (D4), para conservar el aviso de cuenta suspendida y evitar una redirección sin explicación.
5. **Q5. ¿`users.role` se escribe también desde la action?** Default: no, solo el webhook (D2). Si el webhook de Clerk no está configurado en un entorno, `users.role` no se actualizará ahí.
