# Administradores y configuración (solo super_admin)

- Module: users
- Status: approved
- Approved by: leandro291 (2026-10-29)
- Mode: SDD

## Goal
Tarjeta Trello 031. Solo el `super_admin` puede (a) dar de alta y de baja administradores (rol `admin` en `publicMetadata.role` de Clerk) en `/admin/administradores` y (b) guardar sus preferencias de notificación (`new_booking`, `cancellations`, `weekly_summary`) en `/admin/configuracion`. La v1 solo guarda las preferencias: no envía correo ni WhatsApp (SYSTEM-DESIGN decisión 3).

## Scope
- In:
  - `/admin/administradores`: lista de `admin` y `super_admin`; formulario "Agregar administrador" por correo (la cuenta ya debe existir en Clerk); acción "Quitar acceso" por cada `admin` con diálogo de confirmación.
  - `/admin/configuracion`: tres switches de notificación del propio `super_admin`, guardado inmediato por switch, sobre `notification_preferences` (PK `user_id`+`key`).
  - Extender `lib/auth/clerk-role.ts` (único acceso a `clerkClient`, ARCHITECTURE §5) con buscar usuario por correo, leer rol y fijar rol.
  - Server Actions con `requireRole("super_admin")`; reglas de protección de `super_admin`.
  - Guardia de borde: `proxy.ts` exige `super_admin` en `/admin/administradores` y `/admin/configuracion`. Nav: los dos links solo se ven para `super_admin`.
- Out:
  - **Configuración del sitio** (datos de contacto, textos, etc.): por decisión del usuario, "configuración" = solo las preferencias de notificación. Sin tabla nueva ni migración.
  - Enviar correo, WhatsApp o el resumen semanal (v1 solo guarda).
  - Invitar o crear cuentas nuevas en Clerk (el alta exige que la persona ya se haya registrado), alta/baja de `super_admin`, cambiar el rol de operadores (030).
  - Preferencias de `admin`, `organizer` o `customer` (ERM las permite "propio", pero ninguna pantalla las pide en esta tarjeta).
  - Auditoría/historial de cambios de rol, búsqueda, paginación (tope 100).
  - Dependencias npm, componentes shadcn nuevos (`switch`, `field`, `alert`, `input`, `button` ya instalados), cambios de schema.

## Decisiones a aprobar
- **D1. Módulo `modules/users`** (ERM/ARCHITECTURE: dueño de `users` y `notification_preferences`). Las pantallas viven ahí y se exportan por `index.ts`; las rutas de `app/` solo componen. `modules/users/index.ts` hoy solo exporta server code (`handleClerkEvent`, `getUserByClerkId`): se agregan `AdminUsersPage` y `NotificationSettingsPage` (ambos server components).
- **D2. Rol: Clerk primero, espejo en `users.role` después.** Alta/baja llama a Clerk (`updateUserMetadata`, merge) y luego `update users set role`. Esto **difiere de 030 D2** (solo el webhook escribe): aquí la lista sale de `users.role` y debe mostrar el cambio al instante, sin esperar al webhook. Es idempotente con el webhook `user.updated` (mismo valor). Si el espejo falla tras éxito de Clerk, se loguea (texto fijo) y se devuelve `ok`: Clerk es la verdad y el webhook converge. Sin estado `PARTIAL`. Si el usuario aún no existe en `users` (0 filas), no pasa nada: el webhook lo creará con el rol.
- **D3. El rol que decide es el de Clerk, no `users.role`.** Antes de escribir se lee el rol actual en Clerk (`getUser`), por si el espejo está desfasado.
- **D4. Reglas de protección (función pura `getAdminChange`).**
  - Objetivo `super_admin` (otro o uno mismo) -> `PROTECTED` en alta y en baja, sin escribir. Cubre "no quitarse a uno mismo el rol" porque quien actúa siempre es `super_admin`; no hace falta un código `SELF`.
  - Alta: objetivo `admin` -> no-op `ok`; `customer`/`organizer` -> pasa a `admin` (sube en la jerarquía lineal; un operador conserva su fila en `organizers`).
  - Baja: objetivo `admin` -> pasa a `customer`; `customer`/`organizer` -> no-op `ok` (ya no es admin; nunca se rebaja a un `organizer`).
  - Baja deja el rol en `customer` aunque tenga fila en `organizers`; ver Q1.
- **D5. Alta por correo de cuenta existente.** `getUserList({ emailAddress: [email] })` hace coincidencia parcial: se filtra por coincidencia exacta (sin distinguir mayúsculas) contra los correos del usuario. Sin coincidencia -> `EMAIL_NOT_FOUND` con texto "No encontramos una cuenta con ese correo. La persona debe registrarse primero." (sin invitaciones: YAGNI).
- **D6. Baja por `users.id` (uuid), no por `clerk_id` del cliente.** El servidor resuelve el `clerk_id` desde `users`; `id` desconocido -> `NOT_FOUND`.
- **D7. Preferencias: el dueño sale de la sesión.** La action usa `requireRole("super_admin")` -> `userId` de Clerk -> `getUserByClerkId` -> `users.id`. El cliente solo manda `key` y `enabled`. Sin fila local -> `NOT_FOUND`.
- **D8. Valores por defecto sin fila:** `new_booking` activo, `cancellations` activo, `weekly_summary` inactivo (igual que el seed). No se insertan filas al leer; solo se escribe al cambiar un switch (upsert `onConflictDoUpdate`).
- **D9. Resultados.** Admins: `AdminResult` propio (necesita `PROTECTED` y `CLERK_FAILED`; ampliar `CatalogResult` tocaría otras tarjetas, mismo criterio que 030 D8). Preferencias: se reutiliza `CatalogResult`/`catalogFail` de `lib/catalog-result` (`NOT_FOUND`, `INVALID_INPUT`, `UNKNOWN` ya existen). `ponytail:` los wrappers de guard siguen repetidos (ver 030 D8); unificar es otra tarjeta.
- **D10. Sesión.** El token cambia al refrescar (hasta ~60 s o al volver a entrar): un admin recién quitado conserva acceso ese tiempo. Limitación conocida de Clerk (igual que 030 D10); la confirmación lo avisa.
- **D11. Nav por rol sin tocar el layout.** `AdminShell` (client) lee `useUser().user.publicMetadata` para decidir si agrega los links de `super_admin`. Solo cosmético: la seguridad real son `proxy.ts` + guardia en página y action. `ponytail:` hay un instante sin los links hasta que carga el usuario; aceptable.
- **D12. Guardado inmediato por switch** (sin botón "Guardar"): un solo campo por llamada, menos estado. Si falla, el switch vuelve a su valor anterior y se muestra el error.

## Reuse
- Reuse: `lib/auth/require-role.ts` (`requireRole`, `AuthError`), `lib/auth/roles.ts` (`roleFromClaims`, `hasRole`, `Role`) — guard y comparación de roles.
- Reuse: `modules/users/services/user-service.ts` `getUserByClerkId` — resolver el `users.id` de la sesión.
- Reuse: `lib/db/schema/users.ts` (`users`, `notificationPreferences`), `lib/db/schema/enums.ts` (`notificationKey.enumValues` para Zod y tipo, `userRole`).
- Reuse: `lib/catalog-result.ts` — resultado de las preferencias.
- Reuse: `components/shared/confirm-action-dialog.tsx` (baja con error en línea), `components/shared/page-skeleton.tsx`, `components/shared/status-badge.tsx` o `components/ui/badge.tsx` (rol), `components/ui/{switch,field,input,button,alert,label}.tsx`.
- Reuse (patrón): `modules/organizers/actions/operator-actions.ts` + `operator-actions.test.ts` (guard fuera del `try`, `safeParse`, log fijo, mock de `requireRole`); `modules/organizers/components/operator-status-actions.tsx` y `admin-operators-page.tsx` (diálogo + `router.refresh`); `app/(admin)/admin/operadores/page.tsx` (página con `h1` + `Suspense`); `modules/users/services/clerk-sync-service.test.ts` (`describe.skipIf(!DATABASE_URL)`, import dinámico, limpieza); `modules/admin/components/admin-nav-links.ts` (+test).
- Reuse: `@clerk/nextjs/server` `clerkClient` (`users.getUser`, `users.getUserList`, `users.updateUserMetadata`; ya instalado).
- Extend: `lib/auth/clerk-role.ts` (+ test) — se agregan `findClerkUserByEmail`, `getClerkRole`, `setClerkRole`; `ensureClerkRole` no cambia. No hay otro lugar con `clerkClient`.
- Extend: `modules/admin/components/admin-nav-links.ts` (+test) y `admin-shell.tsx` — links de `super_admin` y filtro por rol; `proxy.ts` — dos rutas con `super_admin`; `modules/users/index.ts` — dos exports; `docs/ARCHITECTURE.md` §4 — listar las dos rutas.
- New: `modules/users/{types,schemas,utils,services,actions,components}` — hoy `users` solo tiene sync de Clerk y una lectura; no hay lista de admins ni preferencias.
- Verificado y descartado: `components/ui/table` (pocas filas, patrón `<ul>` de 030), dependencias nuevas, tabla `site_settings`, `ensureClerkRole` para la baja (nunca baja el rol), reusar `runAdminAction` (exige `admin`, no `super_admin`).

## Acceptance criteria
- AC1: Con rol `super_admin`, `/admin/administradores` lista a los usuarios con `users.role` `admin` o `super_admin` (nombre o solo correo, correo, rol con texto, fecha de alta), `super_admin` primero y luego por `created_at` descendente (tope 100). Las filas `admin` tienen "Quitar acceso"; las `super_admin` no tienen acciones. Sin filas: "Aún no hay administradores". La página llama `requireRole("super_admin")` antes de leer.
- AC2: El formulario "Agregar administrador" (correo) llama a la action; con éxito la lista se refresca, el campo se limpia y se muestra confirmación. Un correo mal formado muestra error en el campo sin llamar a Clerk (Zod en servidor; validación `type="email"` en cliente como ayuda).
- AC3: Alta de un correo sin cuenta en Clerk (sin coincidencia exacta) devuelve `EMAIL_NOT_FOUND` y no escribe nada. La búsqueda ignora mayúsculas y no acepta coincidencias parciales (`ana@x.com` no promueve a `diana@x.com`).
- AC4: Alta de un `customer` u `organizer` fija `publicMetadata.role = "admin"` en Clerk (merge, sin pisar otras claves) y luego `users.role = 'admin'`. Alta de quien ya es `admin` devuelve `ok` sin escribir (idempotente).
- AC5: Alta o baja cuyo objetivo es `super_admin` (otro o la propia persona) devuelve `PROTECTED` y no escribe en Clerk ni en la base.
- AC6: Baja de un `admin` fija `publicMetadata.role = "customer"` en Clerk y luego `users.role = 'customer'`. Baja de quien ya no es admin devuelve `ok` sin escribir. `id` inexistente devuelve `NOT_FOUND`. El diálogo de confirmación nombra a la persona y avisa que el acceso puede tardar hasta un minuto en cerrarse (D10).
- AC7: Si Clerk falla (lectura o escritura) -> `CLERK_FAILED`, nada cambió y se puede reintentar. Si el espejo en `users` falla tras éxito de Clerk -> `ok` con log de texto fijo (D2).
- AC8: `grantAdminAction` y `revokeAdminAction` lanzan `AuthError` (no se captura) a quien no sea `super_admin`, incluido un `admin`; validan con Zod en servidor (`INVALID_INPUT`); nunca leen rol, correo de actor ni alcance del cliente; un fallo inesperado devuelve `UNKNOWN` con log de texto fijo (sin datos del input).
- AC9: `proxy.ts` redirige a `/` a un `admin` que pida `/admin/administradores` o `/admin/configuracion` (y subrutas) y deja pasar a `super_admin`; las demás rutas `/admin/*` siguen exigiendo `admin`. Los links "Administradores" y "Configuración" aparecen en el nav solo con `super_admin`, y quedan con `aria-current="page"` en su ruta.
- AC10: `/admin/configuracion` muestra tres switches con etiqueta y descripción ("Nueva reserva", "Cancelaciones", "Resumen semanal"); estado inicial = fila guardada del propio usuario o, sin fila, el default de D8. Tras recargar, el estado persiste. Un texto visible aclara que por ahora solo se guardan y que aún no se envían correos ni mensajes.
- AC11: Cambiar un switch llama `setNotificationPreferenceAction(key, enabled)`: guarda al instante (upsert por `user_id`+`key`), indica "Guardado" en una región `aria-live` y, si falla, restaura el switch anterior y muestra el error. Durante el guardado el switch queda deshabilitado.
- AC12: `setNotificationPreferenceAction` exige `super_admin` (lanza `AuthError` si no); valida `key` (enum `notification_key`) y `enabled` (boolean) con Zod -> `INVALID_INPUT`; resuelve `users.id` desde la sesión y nunca de un parámetro; sin fila en `users` -> `NOT_FOUND`; repetir la misma llamada deja el mismo estado; no modifica filas de otros usuarios; fallo inesperado -> `UNKNOWN` con log fijo.
- AC13: Diseño y accesibilidad: `rounded-card bg-surface shadow-card`, objetivos >= 44 px, foco visible, íconos `aria-hidden`, sin CTA `accent`; botones y switches con nombre accesible (el botón "Quitar acceso" incluye el nombre/correo en `aria-label`); correos largos con `break-words`; a 390 px sin scroll horizontal; el error del formulario enlazado con `aria-describedby`/`FieldError`.
- AC14: `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde.

## Contracts
```ts
// lib/auth/clerk-role.ts  (se agregan; ensureClerkRole queda igual; único acceso a clerkClient)
export async function findClerkUserByEmail(email: string): Promise<{ id: string; role: Role } | null>;
// getUserList({ emailAddress: [email], limit: 20 }); se queda con el usuario cuyo algún correo coincide exacto (toLowerCase); role = roleFromClaims({ metadata: publicMetadata })
export async function getClerkRole(clerkId: string): Promise<Role>;          // getUser + roleFromClaims; errores se propagan
export async function setClerkRole(clerkId: string, role: Role): Promise<void>; // updateUserMetadata(clerkId, { publicMetadata: { role } }) (merge)

// modules/users/types/admin-manage.ts  (puro; lo importan también componentes cliente)
export type AdminItem = {
  id: string; email: string; name: string | null;   // "Nombre Apellido" o null
  role: "admin" | "super_admin"; createdAt: Date;
};
export type AdminErrorCode = "NOT_FOUND" | "EMAIL_NOT_FOUND" | "INVALID_INPUT" | "PROTECTED" | "CLERK_FAILED" | "UNKNOWN";
export type AdminResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: AdminErrorCode; message: string; fieldErrors?: Record<string, string> };
export const ADMIN_MESSAGES: Record<AdminErrorCode, string>;
export function adminFail(code: AdminErrorCode, fieldErrors?: Record<string, string>): Extract<AdminResult, { ok: false }>;

// modules/users/utils/admin-change.ts  (puro)
export type AdminChange = { kind: "noop" } | { kind: "protected" } | { kind: "change"; to: Role };
export function getAdminChange(op: "grant" | "revoke", current: Role): AdminChange;
// grant:  super_admin -> protected; admin -> noop; customer|organizer -> change to "admin"
// revoke: super_admin -> protected; admin -> change to "customer"; customer|organizer -> noop

// modules/users/schemas/admin-schema.ts
export const grantAdminSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) });
export const revokeAdminSchema = z.object({ id: z.uuid() });

// modules/users/services/admin-service.ts  (sin guard: el llamador autoriza)
export function listAdmins(): Promise<AdminItem[]>;                  // users.role in (admin, super_admin); super_admin primero, created_at desc; limit 100
export function grantAdmin(email: string): Promise<AdminResult>;     // findClerkUserByEmail -> EMAIL_NOT_FOUND | getAdminChange -> setClerkRole -> update users.role where clerk_id
export function revokeAdmin(id: string): Promise<AdminResult>;       // select clerk_id by id -> NOT_FOUND | getClerkRole -> getAdminChange -> setClerkRole(customer) -> update users.role where id
// Errores de Clerk -> CLERK_FAILED (log fijo); fallo del espejo -> log fijo y ok (D2)

// modules/users/actions/admin-actions.ts  ("use server")
export async function grantAdminAction(email: unknown): Promise<AdminResult>;
export async function revokeAdminAction(id: unknown): Promise<AdminResult>;
// requireRole("super_admin") fuera del try; safeParse; service; catch -> UNKNOWN (log fijo)

// modules/users/utils/notification-options.ts  (puro)
export type NotificationKey = (typeof notificationKey.enumValues)[number];
export const NOTIFICATION_OPTIONS: ReadonlyArray<{ key: NotificationKey; label: string; description: string; defaultEnabled: boolean }>;
// new_booking "Nueva reserva" true; cancellations "Cancelaciones" true; weekly_summary "Resumen semanal" false (orden fijo)
export function mergePreferences(rows: { key: NotificationKey; enabled: boolean }[]): Record<NotificationKey, boolean>;
// fila guardada gana al default; claves ajenas se ignoran

// modules/users/schemas/notification-schema.ts
export const notificationPreferenceSchema = z.object({ key: z.enum(notificationKey.enumValues), enabled: z.boolean() });

// modules/users/services/notification-preference-service.ts  (sin guard)
export function getNotificationPreferences(userId: string): Promise<Record<NotificationKey, boolean>>;
export function setNotificationPreference(userId: string, key: NotificationKey, enabled: boolean): Promise<void>;
// insert ... onConflictDoUpdate target [userId, key] set { enabled }

// modules/users/actions/notification-actions.ts  ("use server")
export async function setNotificationPreferenceAction(key: unknown, enabled: unknown): Promise<CatalogResult>;
// const { userId } = await requireRole("super_admin") (fuera del try) -> safeParse -> getUserByClerkId(userId) -> NOT_FOUND | setNotificationPreference

// Componentes
// admin-users-page.tsx          (async server)  sin props: requireRole("super_admin") + listAdmins; lista <ul> + <GrantAdminForm />
// grant-admin-form.tsx          (client)        sin props
// revoke-admin-button.tsx       (client)        props: { id: string; label: string }   // label = nombre o correo
// notification-settings-page.tsx(async server)  sin props: requireRole("super_admin") + getUserByClerkId + getNotificationPreferences
// notification-switches.tsx     (client)        props: { initial: Record<NotificationKey, boolean> }

// modules/admin/components/admin-nav-links.ts (se agrega)
export const SUPER_ADMIN_NAV_LINKS: ReadonlyArray<PanelNavLink>;   // Administradores (/admin/administradores), Configuración (/admin/configuracion)
export function getAdminNavLinks(role: Role): ReadonlyArray<PanelNavLink>;  // super_admin -> ADMIN_NAV_LINKS + SUPER_ADMIN_NAV_LINKS; resto -> ADMIN_NAV_LINKS

// modules/users/index.ts (se agrega)
export { AdminUsersPage } from "./components/admin-users-page";
export { NotificationSettingsPage } from "./components/notification-settings-page";

// proxy.ts: [createRouteMatcher(["/admin/administradores(.*)", "/admin/configuracion(.*)"]), "super_admin"] ANTES de la regla "/admin(.*)" (gana la primera que coincide)
```
Mensajes (`ADMIN_MESSAGES`): `EMAIL_NOT_FOUND` (alta) "No encontramos una cuenta con ese correo. La persona debe registrarse primero."; `NOT_FOUND` (baja) "No encontramos a ese usuario."; `INVALID_INPUT` "Revisa los datos e inténtalo de nuevo."; `PROTECTED` "No se puede modificar a un super administrador."; `CLERK_FAILED` "No pudimos actualizar el rol en Clerk. No se cambió nada; inténtalo de nuevo."; `UNKNOWN` "No pudimos guardar los cambios. Inténtalo de nuevo.".
Rutas: `app/(admin)/admin/administradores/page.tsx` (`metadata.title = "Administradores"`) y `app/(admin)/admin/configuracion/page.tsx` (`"Configuración"`): `h1` + `<Suspense fallback={<PageSkeleton />}>` con la página del módulo.

## Edge cases
- Quitarse a uno mismo / tocar a otro `super_admin`: `PROTECTED` en alta y baja (D4). Hay siempre al menos un `super_admin` porque nunca se baja a ninguno desde la app.
- Doble clic, dos `super_admin` a la vez o reintento tras error: alta/baja son idempotentes (no-op si ya está en el estado pedido). Gana la última escritura.
- Correo sin cuenta, con otro caso (`Ana@X.com`), con espacios o parcial: se normaliza (`trim` + minúsculas) y solo cuenta la coincidencia exacta (AC3).
- Usuario con varios correos en Clerk: coincide si alguno es exacto.
- Cuenta en Clerk que aún no está en `users` (webhook pendiente): el alta funciona y el espejo actualiza 0 filas; no aparece en la lista hasta que llegue el webhook (que ya trae el rol).
- Baja de un `admin` cuyo `clerk_id` ya no existe en Clerk (p. ej. seed `seed_admin`): `getClerkRole` falla -> `CLERK_FAILED`; en desarrollo con datos sembrados es esperado.
- Un `organizer` promovido a `admin` y luego dado de baja queda `customer` (D4/Q1); su fila en `organizers` no se toca.
- Persona con sesión abierta: ve el cambio de rol al refrescar el token (D10).
- Usuario `super_admin` sin fila en `users`: `/admin/configuracion` muestra un estado vacío "No encontramos tu perfil todavía" en vez de switches, y la action devuelve `NOT_FOUND` (D7).
- Fila de preferencias ausente: se usa el default (D8); un `key` ajeno en BD se ignora.
- Fallo al guardar un switch: vuelve al valor anterior y muestra el mensaje; los demás switches no se afectan.
- Correos largos: `break-words`, sin desbordar a 390 px.
- `AuthError` en la action: sube al framework (el `proxy.ts` ya redirige antes en el uso normal).

## Tests
- `lib/auth/clerk-role.test.ts` (extender) — mock de `@clerk/nextjs/server`: `findClerkUserByEmail` devuelve `null` sin resultados, descarta coincidencias parciales y no distingue mayúsculas, devuelve `{ id, role }` con `roleFromClaims`; `getClerkRole` mapea `publicMetadata` y propaga errores; `setClerkRole` llama `updateUserMetadata(id, { publicMetadata: { role } })`; los tests existentes de `ensureClerkRole` siguen pasando.
- `modules/users/utils/admin-change.test.ts` — AC4, AC5, AC6: matriz completa 4 roles x {grant, revoke}.
- `modules/users/schemas/admin-schema.test.ts` — AC2, AC8: correo válido/ con espacios y mayúsculas (normaliza)/ inválido/ vacío; `id` uuid válido e inválido.
- `modules/users/utils/notification-options.test.ts` — AC10: defaults (true, true, false), orden fijo, `mergePreferences` con filas parciales, vacías y con claves ajenas.
- `modules/users/schemas/notification-schema.test.ts` — AC12: `key` válidas, ajena rechazada, `enabled` no boolean rechazado.
- `modules/users/services/admin-service.test.ts` — AC1, AC3-AC7 (`vi.mock("@/lib/auth/clerk-role")`; los casos que no tocan la base —correo inexistente, `PROTECTED`, `CLERK_FAILED` en alta— corren sin `DATABASE_URL` mockeando `@/lib/db`; los que sí la usan van en `describe.skipIf(!process.env.DATABASE_URL)` con import dinámico, `RUN` único y limpieza): `listAdmins` ordena `super_admin` primero; alta de `customer` llama `setClerkRole(id, "admin")` y actualiza `users.role`; alta de `admin` no escribe; `super_admin` -> `PROTECTED` sin escribir; baja de `admin` fija `customer`; baja de `customer` no escribe; `id` inexistente -> `NOT_FOUND`; Clerk rechaza -> `CLERK_FAILED` y la fila no cambia; fallo del espejo tras Clerk ok -> `ok` y log.
- `modules/users/services/notification-preference-service.test.ts` — AC10-AC12 (`describe.skipIf(!process.env.DATABASE_URL)`): sin filas -> defaults; `set` inserta; `set` repetido actualiza sin duplicar (PK); no toca otro usuario.
- `modules/users/actions/admin-actions.test.ts` — AC8: mock de `requireRole` y del service; `AuthError` `UNAUTHENTICATED`/`FORBIDDEN` suben sin llamar al service (incluye rol `admin`); `super_admin` pasa; correo/`id` inválidos -> `INVALID_INPUT` sin llamar al service; error inesperado -> `UNKNOWN` y log de texto fijo.
- `modules/users/actions/notification-actions.test.ts` — AC12: mismo patrón; `userId` del mock de `requireRole` -> `getUserByClerkId` -> service con ese `users.id` (nunca de los argumentos); sin usuario local -> `NOT_FOUND` sin escribir; `key`/`enabled` inválidos -> `INVALID_INPUT`; error inesperado -> `UNKNOWN`.
- `modules/admin/components/admin-nav-links.test.ts` (extender) — AC9: `getAdminNavLinks("admin")` = `ADMIN_NAV_LINKS`; `getAdminNavLinks("super_admin")` agrega "Administradores" y "Configuración" al final con su `href`; los hrefs existentes no cambian.
- UI y `proxy.ts` (AC1, AC2, AC9, AC10, AC11, AC13): sin tests unitarios (markup que solo compone; `proxy.ts` no tiene runner de integración). Verificación manual en navegador (escritorio y 390 px): con `admin`, `/admin/administradores` y `/admin/configuracion` redirigen a `/` y no hay links; con `super_admin`, alta de correo existente, inexistente y de otro `super_admin`, baja de un `admin`, switches con recarga y con error simulado.

## Plan

### Phase 1 — Clerk, lógica y servicio de administradores (verificable con tests; la app no cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `findClerkUserByEmail`, `getClerkRole`, `setClerkRole` + test | lib/auth/clerk-role.ts, lib/auth/clerk-role.test.ts | - | A | AC3, AC4, AC6 | done |
| T2 | Tipos/resultado, `getAdminChange`, schemas Zod + tests | modules/users/types/admin-manage.ts, modules/users/utils/admin-change.ts, modules/users/utils/admin-change.test.ts, modules/users/schemas/admin-schema.ts, modules/users/schemas/admin-schema.test.ts | - | A | AC2, AC4, AC5, AC6, AC8 | done |
| T3 | `listAdmins`, `grantAdmin`, `revokeAdmin` + test | modules/users/services/admin-service.ts, modules/users/services/admin-service.test.ts | T1, T2 | - | AC1, AC3, AC4, AC5, AC6, AC7 | done |

Nota: sin tarea setup (no hay `npm i` ni `shadcn add`). T1 y T2 no comparten archivos y corren en paralelo.

### Phase 2 — Action, UI y cableado de /admin/administradores
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | Server Actions `grantAdminAction` / `revokeAdminAction` + test | modules/users/actions/admin-actions.ts, modules/users/actions/admin-actions.test.ts | T3 | B | AC8 | done |
| T5 | UI: `AdminUsersPage`, `GrantAdminForm` (client), `RevokeAdminButton` (client) | modules/users/components/admin-users-page.tsx, modules/users/components/grant-admin-form.tsx, modules/users/components/revoke-admin-button.tsx | T4 | - | AC1, AC2, AC6, AC13 | done |
| T6 | Export, ruta, borde y nav por rol | modules/users/index.ts, app/(admin)/admin/administradores/page.tsx, proxy.ts, modules/admin/components/admin-nav-links.ts, modules/admin/components/admin-nav-links.test.ts, modules/admin/components/admin-shell.tsx, docs/ARCHITECTURE.md | T5 | - | AC9, AC14 | done |

Nota: en esta fase `SUPER_ADMIN_NAV_LINKS` solo trae "Administradores" (solo páginas existentes); la Phase 4 agrega "Configuración". T6 toca 7 archivos; T4 y T5 son secuenciales porque T5 importa las actions.

### Phase 3 — Preferencias de notificación: lógica y action (la app no cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T7 | Opciones/defaults, schema Zod y servicio de preferencias + tests | modules/users/utils/notification-options.ts, modules/users/utils/notification-options.test.ts, modules/users/schemas/notification-schema.ts, modules/users/schemas/notification-schema.test.ts, modules/users/services/notification-preference-service.ts, modules/users/services/notification-preference-service.test.ts | - | A | AC10, AC11, AC12 | done |
| T8 | Server Action `setNotificationPreferenceAction` + test | modules/users/actions/notification-actions.ts, modules/users/actions/notification-actions.test.ts | T7 | - | AC12 | done |

### Phase 4 — UI y ruta de /admin/configuracion
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T9 | UI: `NotificationSettingsPage` + `NotificationSwitches` (client) | modules/users/components/notification-settings-page.tsx, modules/users/components/notification-switches.tsx | T8 | - | AC10, AC11, AC13 | done |
| T10 | Export, ruta y link de nav | modules/users/index.ts, app/(admin)/admin/configuracion/page.tsx, modules/admin/components/admin-nav-links.ts, modules/admin/components/admin-nav-links.test.ts, docs/ARCHITECTURE.md | T9 | - | AC9, AC14 | done |

Nota: la Phase 3 puede correr en paralelo con la Phase 2 (sin archivos en común) si el orquestador lo prefiere; la Phase 4 espera a ambas por `index.ts`, `admin-nav-links.ts` y `ARCHITECTURE.md`.

## Open questions
Requieren decisión humana al aprobar (cada una con su default, que es lo que describe la spec):
1. **Q1. Al quitar admin a alguien con fila en `organizers`, ¿vuelve a `organizer` o a `customer`?** Default: `customer` (más simple, sin lectura extra). Si se prefiere `organizer` cuando tenga un operador `active`, la baja necesita leer `organizers` y `getAdminChange` recibe ese dato.
2. **Q2. ¿Escribir `users.role` desde la action (D2) o dejarlo solo al webhook como en 030?** Default: escribir, para que la lista se actualice al instante; si el webhook no está configurado en un entorno, solo así queda el espejo correcto.
3. **Q3. ¿El alta puede invitar por correo a quien aún no tiene cuenta?** Default: no; exige cuenta existente (D5). Invitar suma `clerkClient.invitations` y un flujo de aceptación, fuera de esta tarjeta.
4. **Q4. Códigos de "no encontrado" separados.** Default: `EMAIL_NOT_FOUND` (alta por correo) y `NOT_FOUND` (baja por id), cada uno con su mensaje. Si se prefiere uno solo, se unifica sin tocar otros módulos.
5. **Q5. ARCHITECTURE §4 dice que solo `super_admin` ve "aprobación de operadores" pero 030 (aprobada) la dio a `admin`+.** No se toca en esta tarjeta; solo se agregan las rutas nuevas a la tabla.
