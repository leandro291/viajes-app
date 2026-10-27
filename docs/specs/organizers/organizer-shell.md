# Shell del panel del operador y perfil

- Module: organizers
- Status: approved
- Approved by: leandro291 (2026-10-26)
- Mode: SDD

## Goal
Tarjeta Trello 019. Dar al grupo `(organizer)` un layout con navegación lateral (drawer en móvil), una página `/operador` con el perfil de solo lectura del operador (razón social, RUC, WhatsApp, estado) y un aviso visible cuando su estado es `pending` o `suspended`.

## Scope
- In:
  - Layout de `app/(organizer)/layout.tsx`: sidebar oscuro en escritorio, barra superior + `Sheet` en móvil, aviso de estado sobre el contenido.
  - Página `app/(organizer)/operador/page.tsx` con el perfil en solo lectura y estado vacío si no hay fila en `organizers`.
  - Service de lectura `getOrganizerByClerkId` + helper por request `getCurrentOrganizer`.
  - Mapeo puro `status -> aviso` y `isActiveNavLink`, con tests.
- Out:
  - Editar el perfil (razón social, RUC, WhatsApp) y crear la fila de `organizers` (la crea la tarjeta 030).
  - Bloquear páginas por estado: `pending`/`suspended` solo muestran aviso.
  - Aprobar/suspender operadores (`admin`, `super_admin`).
  - Las páginas `/operador/paquetes`, `salidas`, `reservas`, `ofertas` y sus links (cada tarjeta suma su link; ver D1).
  - Notificaciones, buscador, KPIs, cambios de schema, migraciones y dependencias npm.

## Decisiones a aprobar
- **D1. Links del sidebar = solo páginas que existen.** `ls app/(organizer)` hoy: solo `layout.tsx`. De los 5 links de ARCHITECTURE §4 (`/operador`, `/operador/paquetes`, `/operador/salidas`, `/operador/reservas`, `/operador/ofertas`) solo `/operador` existe tras esta tarjeta, así que el sidebar arranca con **un único link: "Perfil"**. `ORGANIZER_NAV_LINKS` es un arreglo; cada tarjeta de página agrega su línea. Evita links que dan 404.
- **D2. Mobile con `Sheet` de shadcn** (`@base-ui/react` Dialog). No hay sidebar ni layout reutilizable: `(admin)` y `(customer)` no tienen shell (el de `(customer)` es `SiteHeader`/`SiteFooter`, horizontal y público), así que se crea uno en `modules/organizers`. Cuando `(admin)` necesite el suyo se evaluará subirlo a `components/shared` (YAGNI hoy).
- **D3. Aviso en el layout, no en cada página**, dentro de `Suspense` (`cacheComponents: true`: leer sesión es dato dinámico). `getCurrentOrganizer` va envuelto en `React.cache` para que layout y página hagan una sola consulta por request.
- **D4. Autorización:** el `proxy.ts` ya exige rol `organizer` o superior en `/operador(.*)`. Los componentes de servidor llaman `requireRole("organizer")` (defensa en profundidad y para obtener el `userId` de Clerk). Un `admin` que entra a `/operador` sin fila ve el estado vacío (no se rompe).
- **D5. Diseño.** El artefacto Wayra no tiene pantalla de operador; se toma `Admin.dc.html` solo como referencia del shell (aside `bg-dark`, texto `#A9BAB7`, link activo con fondo `white/8`, barra izquierda de 3 px y ícono en `focus`, etiqueta "Gestión" 11 px/700 mayúsculas, sección "Datos de la empresa"). Todo lo demás sigue `DESIGN-SYSTEM.md`: fondo `bg-background`, tarjeta `rounded-card` con sombra de tarjeta, objetivos ≥ 44 px, foco visible, `h1` del panel sin hero.

## Reuse
- Reuse: `lib/auth/require-role.ts` — guard y `userId` de Clerk.
- Reuse: `components/shared/wayra-logo.tsx`, `components/shared/user-menu.tsx` — logo y menú de cuenta (cierre de sesión) en el sidebar; ambos asumen fondo oscuro.
- Reuse: `components/shared/status-badge.tsx` — badge del estado del operador con `label` propio: `active` -> `confirmed` "Activo", `pending` -> `pending` "Pendiente", `suspended` -> `cancelled` "Suspendido".
- Reuse: `components/ui/alert.tsx` (sobrescribiendo color con tokens `status-pending*`/`status-cancelled*`), `components/ui/button.tsx`, `lib/utils.ts` (`cn`).
- Reuse: patrón de `modules/users/services/user-service.ts` (select de Drizzle) y su test condicionado a `DATABASE_URL`; `lib/db` ya exporta `organizers` y `users`.
- Reuse: patrón de link activo de `components/shared/site-nav.tsx` (`usePathname`, `aria-current="page"`); no se reutiliza el componente porque su estilo es horizontal.
- Extend: `app/(organizer)/layout.tsx` (hoy stub).
- New: `components/ui/sheet.tsx` — `npx shadcn@latest add sheet` (existe en shadcn, no instalado).
- New: `modules/organizers/**` — el módulo no existe aún.
- New: página `app/(organizer)/operador/page.tsx`.

## Acceptance criteria
- AC1: `/operador` (con rol `organizer`) muestra el shell: sidebar con logo Wayra, etiqueta "Gestión", el link "Perfil" con `aria-current="page"` y el menú de cuenta (`UserMenu`).
- AC2: El sidebar solo contiene links a páginas existentes (hoy solo "Perfil", D1); no hay links a `/operador/paquetes|salidas|reservas|ofertas`.
- AC3: En escritorio (`md` y más) el sidebar de 264 px es fijo a la izquierda; en móvil se oculta y una barra superior con logo y botón "Abrir menú" abre un `Sheet` lateral con la misma navegación. Elegir un link cierra el `Sheet`. Foco atrapado y `Esc` cierra (comportamiento del Sheet).
- AC4: El perfil muestra, en solo lectura, razón social (`business_name`), RUC (`ruc`), WhatsApp (`whatsapp`) y el estado con `StatusBadge` (ícono + texto), bajo el título "Datos de la empresa". No hay campos editables ni botón de guardar.
- AC5: Si el operador tiene estado `pending`, todas las páginas del panel muestran arriba un aviso (`role="status"`, ícono + texto) "Tu cuenta está pendiente de aprobación..."; si es `suspended`, un aviso con tono de cancelada "Tu cuenta está suspendida...". Con `active` no hay aviso. El contenido sigue accesible (no se bloquea).
- AC6: Si el usuario no tiene fila en `organizers` (o el webhook de Clerk aún no creó su `users`), `/operador` muestra un estado vacío claro ("Aún no tienes un perfil de operador...") sin error y sin aviso de estado; el sidebar sigue funcionando. No se crea ninguna fila.
- AC7: `getOrganizerByClerkId(clerkId)` devuelve el perfil del operador cuyo `users.clerk_id` coincide, o `null` si no existe.
- AC8: `getOrganizerNotice(status)` devuelve el aviso para `pending` y `suspended`, y `null` para `active` y `null`/ausente.
- AC9: `isActiveNavLink(pathname, href)`: `/operador` solo es activo en la ruta exacta; los demás links, en la ruta o sus subrutas.
- AC10: Accesibilidad: `<nav aria-label="Panel del operador">`, objetivos ≥ 44 px, foco visible con `focus` dentro de `bg-dark`, sin `div` clicables, íconos decorativos `aria-hidden`; el panel respeta `prefers-reduced-motion`.
- AC11: `npx tsc --noEmit`, `npm run lint` y `npm test` en verde.

## Contracts
```ts
// modules/organizers/types/organizer.ts
import type { organizerStatus } from "@/lib/db/schema/enums";
export type OrganizerStatus = (typeof organizerStatus.enumValues)[number];
export type OrganizerProfile = {
  id: string;
  businessName: string;
  ruc: string;
  whatsapp: string;
  status: OrganizerStatus;
};

// modules/organizers/services/organizer-service.ts
export function getOrganizerByClerkId(clerkId: string): Promise<OrganizerProfile | null>;
// select organizers join users on organizers.user_id = users.id where users.clerk_id = $1 limit 1

// modules/organizers/services/current-organizer.ts
export const getCurrentOrganizer: () => Promise<OrganizerProfile | null>;
// cache(async () => getOrganizerByClerkId((await requireRole("organizer")).userId))

// modules/organizers/utils/organizer-status-notice.ts
export type OrganizerNotice = { tone: "pending" | "suspended"; title: string; description: string };
export function getOrganizerNotice(status: OrganizerStatus | null | undefined): OrganizerNotice | null;

// modules/organizers/components/organizer-nav-links.ts
export const ORGANIZER_NAV_LINKS: ReadonlyArray<{ label: string; href: string; icon: LucideIcon }>;
// hoy: [{ label: "Perfil", href: "/operador", icon: Building2 }]
export function isActiveNavLink(pathname: string | null, href: string): boolean;

// modules/organizers/index.ts (API pública; solo componentes)
export { OrganizerShell } from "./components/organizer-shell";               // server: sidebar + barra móvil + children
export { OrganizerStatusNotice } from "./components/organizer-status-notice"; // async server: aviso o null
export { OrganizerProfileCard } from "./components/organizer-profile-card";   // async server: perfil o estado vacío
```
Rutas: `app/(organizer)/layout.tsx` compone `OrganizerShell` + `<Suspense><OrganizerStatusNotice/></Suspense>` + `children`. `app/(organizer)/operador/page.tsx` (`metadata.title = "Panel del operador"`) renderiza `h1` + `<Suspense><OrganizerProfileCard/></Suspense>`.

## Edge cases
- Sesión sin `userId` o con rol insuficiente en un componente: `requireRole` lanza `AuthError` (el `proxy.ts` ya redirige antes); queda a cargo del error boundary del framework, no se captura.
- `admin`/`super_admin` en `/operador` sin fila: estado vacío (AC6).
- Cadenas largas de razón social: `break-words`, sin romper el layout.
- Viewport 390 px: sin scroll horizontal; el drawer ocupa `max-w` ~ 320 px.
- Nuevo valor de `organizer_status`: `getOrganizerNotice` retorna `null` por defecto y `StatusBadge` exige mapeo exhaustivo (`Record<OrganizerStatus, ...>`), tsc avisa.

## Tests
- `modules/organizers/utils/organizer-status-notice.test.ts` — AC8: `pending`, `suspended` devuelven aviso con `tone` correcto y textos no vacíos; `active`, `null` y `undefined` devuelven `null`.
- `modules/organizers/components/organizer-nav-links.test.ts` — AC9: `/operador` exacto activo; `/operador/paquetes` no activa "Perfil"; subruta de un link no raíz activa ese link; `null` -> `false`; `/operadores` no activa `/operador`.
- `modules/organizers/services/organizer-service.test.ts` — AC7: `describe.skipIf(!process.env.DATABASE_URL)` con import dinámico (patrón de `user-service.test.ts`): `clerkId` de un organizer sembrado devuelve el perfil con `status`; `clerkId` de un customer o inexistente devuelve `null`. Verificar los IDs en `lib/db/seed/data/identity.ts`.
- UI (AC1–6, 10): sin tests unitarios (markup que solo compone); verificación manual descrita en la revisión.

## Plan

### Phase 1 — Datos y lógica (verificable solo con tests; la app no cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Tipos, `getOrganizerByClerkId`, `getCurrentOrganizer` y test condicionado a DB | modules/organizers/types/organizer.ts, modules/organizers/services/organizer-service.ts, modules/organizers/services/organizer-service.test.ts, modules/organizers/services/current-organizer.ts | - | A | AC7 | todo |
| T2 | `getOrganizerNotice` y `isActiveNavLink` (+ `ORGANIZER_NAV_LINKS`) con tests | modules/organizers/utils/organizer-status-notice.ts, modules/organizers/utils/organizer-status-notice.test.ts, modules/organizers/components/organizer-nav-links.ts, modules/organizers/components/organizer-nav-links.test.ts | - | A | AC8, AC9, AC2 | todo |

Nota: T2 deriva el tipo de estado de `organizerStatus.enumValues` (`@/lib/db/schema/enums`), no de `types/organizer.ts`, para correr en paralelo con T1.

### Phase 2 — Shell, perfil y cableado
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T3 | setup: `npx shadcn@latest add sheet` | components/ui/sheet.tsx | - | - | AC3 | todo |
| T4 | Sidebar de escritorio, barra móvil + Sheet y `OrganizerShell` (cliente solo para `usePathname`/estado del Sheet) | modules/organizers/components/organizer-nav.tsx, modules/organizers/components/organizer-shell.tsx | T2, T3 | B | AC1, AC2, AC3, AC10 | todo |
| T5 | `OrganizerStatusNotice` y `OrganizerProfileCard` (con estado vacío y `StatusBadge`) | modules/organizers/components/organizer-status-notice.tsx, modules/organizers/components/organizer-profile-card.tsx | T1, T2 | B | AC4, AC5, AC6, AC10 | todo |
| T6 | `index.ts`, layout y página | modules/organizers/index.ts, app/(organizer)/layout.tsx, app/(organizer)/operador/page.tsx | T4, T5 | - | AC1, AC5, AC6, AC11 | todo |

## Open questions
- Ninguna que bloquee. Supuestos a confirmar al aprobar: D1 (arranca con un solo link "Perfil") y D4 (un `admin` sin fila ve el estado vacío en lugar de ser redirigido).
