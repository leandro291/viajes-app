# Shell del panel admin y Resumen con KPIs (/admin)

- Module: admin
- Status: approved
- Approved by: leandro291 (2026-10-28)
- Mode: SDD

## Goal
Tarjeta Trello 025. Dar al grupo `(admin)` un layout con navegación lateral (drawer en móvil) y la página `/admin` con cuatro KPIs derivados de `bookings`, `packages`, `destinations` y `departures` (sin tablas nuevas): ingresos del mes, ticket promedio, % de cancelaciones, destinos más vendidos y salidas de hoy. Es la base de las tarjetas 026–030, que suman sus links al nav.

## Scope
- In:
  - Layout de `app/(admin)/layout.tsx` (hoy stub): sidebar oscuro en escritorio, barra superior + `Sheet` en móvil, un único link "Resumen" (D1).
  - Página `app/(admin)/admin/page.tsx` con: 3 tarjetas KPI (ingresos, ticket promedio, cancelaciones), tarjeta "Salidas de hoy" (salidas + viajeros), lista "Destinos más vendidos" y lista corta de las salidas del día.
  - Extraer el shell del operador a `components/shared` (nav + barra móvil + shell, parametrizados por links) y usarlo desde `OrganizerShell` y `AdminShell` (D2). El operador no cambia.
  - Lecturas agregadas en los módulos dueños, expuestas por su `index.ts`: `getBookingKpis` (`bookings`), `getTopDestinations` (`destinations`), `getTodayDepartures` (`packages`).
  - Helper de rangos `America/Lima` (`limaDayRange`, `limaMonthRange`) en `lib/` (D3).
  - Lógica pura testeada: ingresos, ticket promedio, % cancelaciones (división por cero), ranking de destinos (orden, desempate, límite), resumen de salidas, rangos de "hoy" y "mes".
- Out:
  - Tablas de reservas/clientes/paquetes/operadores/ofertas del admin (026–030; 026 reusa la tabla de 023). Aquí no se diseña ninguna tabla de reservas.
  - Filtros por rango, selector de mes, comparación contra el mes anterior ("variación con flecha" del indicador), gráficos de series, exportes.
  - Vista por operador, vistas solo `super_admin` (administradores, aprobación de operadores, configuración).
  - Cambios de schema, migraciones, dependencias npm, componentes shadcn nuevos.
  - Caché: todo es dinámico (paneles sin caché compartida, SYSTEM-DESIGN §Datos).
  - Notificaciones, buscador y campana del artefacto.

## Decisiones a aprobar
- **D1. Nav con solo páginas que existen.** `ADMIN_NAV_LINKS` arranca con `[Resumen -> /admin]` (mismo criterio que D1 de `organizer-shell`). Cada tarjeta 026–030 agrega su línea. `ls app/(admin)` hoy: solo `layout.tsx`.
- **D2. Shell compartido en `components/shared` (extracción, no copia).** `OrganizerShell`/`OrganizerNav` (≈130 líneas) son exactamente lo que `(admin)` necesita; `organizer-shell.md` D2 dejó dicho que se subiría a `shared` cuando `(admin)` lo necesitara. Se crea `PanelShell`/`PanelNav`/`PanelMobileBar` parametrizados por `links`, `rootHref`, `navLabel` y `menuTitle`. **Restricción técnica:** los links llevan íconos (`LucideIcon`, una función): no se pueden pasar de un Server Component a un Client Component como prop. Por eso `OrganizerShell` y `AdminShell` pasan a ser archivos `"use client"` finos que importan su constante de links y renderizan `PanelShell` (cliente → cliente); `children` sigue pasando como slot, así que `OrganizerStatusNotice` (async, servidor) no cambia. Alternativa descartada: duplicar el shell en `modules/admin` (DRY, SETUP §2). Riesgo: regresión visual del operador -> AC12.
- **D3. Zona horaria `America/Lima` (UTC-5, fija, sin horario de verano), no Buenos Aires.** El brief proponía Buenos Aires salvo que los docs definieran otra; el código ya la define: `modules/packages/utils/departure-time.ts` ("Zona horaria fija America/Lima"), `limaToday` en `tour-filters.ts`, `limaDate` del seed, y las specs 009/010/012/016/022 lo fijan. Es un producto peruano (`PEN`). "Mes" = mes calendario en curso en Lima; "hoy" = día calendario en curso en Lima. Rangos semiabiertos `[from, to)`. Como `departure-time.ts` y `tour-filters.ts` son internos de `packages`, `bookings` y `destinations` no pueden importarlos (ARCHITECTURE §1.6): el helper nuevo vive en `lib/lima-time.ts`. No se refactorizan los dos existentes (fuera de alcance; follow-up).
- **D4. Qué cuenta cada KPI (ERM §Derivado).** Período de una reserva = `bookings.created_at` (no hay `confirmed_at`; ver pregunta 3).
  - Ingresos del mes = `sum(total_cents)` de reservas `confirmed` del mes (`currency` es siempre `PEN`).
  - Ticket promedio = `round(ingresos / nº de reservas confirmed)`, en céntimos; `null` si no hay confirmadas.
  - % de cancelaciones = `cancelled / total` del mes (total = `pending` + `confirmed` + `cancelled`) × 100, 1 decimal; `null` si `total = 0`.
  - Destinos más vendidos = reservas `confirmed` del mes agrupadas por `bookings → packages → destinations`; orden por nº de reservas desc, luego ingresos desc, luego nombre asc; solo destinos con ≥ 1 venta; top 5.
  - Salidas de hoy = `departures` con `starts_at` en el día de Lima y `status <> 'cancelled'`; "viajeros" = `sum(booked_seats)`. La lista muestra las primeras 8 por hora; los totales cuentan todas.
- **D5. Alcance global.** `admin` y `super_admin` ven los mismos KPIs de toda la plataforma (sin filtro por operador ni por rol). No hay filtros por rango (v1).
- **D6. Autorización.** `proxy.ts` ya exige `admin` o superior en `/admin(.*)` (redirige a `/`). `AdminDashboard` llama `requireRole("admin")` en servidor (defensa en profundidad, SYSTEM-DESIGN §Autenticación). Cada página futura de `(admin)` debe hacer lo mismo; el layout no bloquea.
- **D7. Diseño.** Pantalla 9 "Panel administrador" del artefacto Wayra (URL en `docs/DESIGN-SYSTEM.md`/memoria) manda en estructura del escritorio: shell (aside `bg-dark`, texto `#A9BAB7`, link activo `white/8` con barra de 3 px y ícono `focus`, etiqueta "Gestión") y "Tarjeta de indicador" (etiqueta, valor grande 34 px/800). El tablero Móvil-Admin tiene el estilo viejo y **no se copia**: el móvil se rediseña con los tokens vigentes de `DESIGN-SYSTEM.md` (`bg-background`, `rounded-card` + `shadow-card`, objetivos ≥ 44 px, 1 columna a 390 px, sin scroll horizontal). El artefacto no se pudo abrir desde aquí: el developer y el reviewer lo comparan y listan desvíos (DESIGN-SYSTEM §Fidelidad); lo que la pantalla 9 tenga además (gráficos, tablas de reservas/clientes) queda fuera por Scope.
- **D8. Next 16 con Cache Components** (`cacheComponents: true`, `next.config.ts`). Leer sesión y la base es dato de request: `AdminDashboard` va dentro de `<Suspense fallback={<PageSkeleton/>}>`. `new Date()` se evalúa **después** de `await requireRole(...)` (API de request); si `npm run build` lo marca como "current time before request data", anteponer `await connection()` de `next/server`. Fuente: `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` §"Random values and timestamps" y `.../04-functions/connection.md`.

## Reuse
- Reuse: `lib/auth/require-role.ts` — guard y rol desde el token.
- Reuse: `components/shared/wayra-logo.tsx`, `user-menu.tsx`, `page-skeleton.tsx`, `components/ui/{sheet,button}.tsx` (ya instalados) — shell y fallback.
- Reuse: `lib/money.ts` (`formatPen`) — dinero `S/ 1 290`.
- Reuse: `formatDepartureTime` de `@/modules/packages` (ya exportado por su `index.ts`) — hora Lima en la lista de salidas.
- Reuse (patrón): `modules/packages/services/own-departure-service.ts` y `modules/bookings/services/voucher-service.ts` — select de Drizzle con joins, import desde `@/lib/db`, `mapWith`; y `voucher-service.test.ts` — `describe.skipIf(!process.env.DATABASE_URL)` con import dinámico.
- Reuse (patrón): `modules/organizers/components/organizer-status-notice.tsx` — tonos con tokens `status-*`.
- Extend: `modules/organizers/components/organizer-shell.tsx` — pasa a wrapper `"use client"` fino sobre `PanelShell` (mismo markup, mismos textos: AC12).
- Extend: `modules/bookings/index.ts`, `modules/destinations/index.ts`, `modules/packages/index.ts` — solo líneas de export nuevas (API pública, ARCHITECTURE §1.6).
- New: `components/shared/panel-shell.tsx`, `panel-nav.tsx`, `panel-nav-links.ts` — generalización de `organizer-nav.tsx`/`organizer-nav-links.ts` (D2). Se **borra** `organizer-nav.tsx` (nadie más lo importa; verificado con grep).
- New: `lib/lima-time.ts` — ningún helper compartido de rangos Lima existe (D3).
- New: servicios `booking-kpi-service.ts`, `destination-sales-service.ts`, `today-departure-service.ts` y sus utils puros — las agregaciones no existen; `booking-service.ts`/`destination-service.ts` son de escritura/catálogo y no se mezclan.
- New: `modules/admin/**` — el módulo no existe (solo compone).
- No se reutiliza: `components/ui/table` (no instalado; y no hay tablas aquí), `StatusBadge` (los KPIs no son estados de reserva).
- Nota deliberada: `modules/organizers/components/organizer-nav-links.ts` (y su test) **no se tocan** (023/024 les agregan links). Su `isActiveNavLink` queda sin uso en producción tras D2; limpiarlo (delegar en `isActivePanelLink`) es follow-up después de mergear 023/024.

## Acceptance criteria
- AC1: `/admin` con rol `admin` o `super_admin` muestra el shell: sidebar con logo Wayra, etiqueta "Gestión", el link "Resumen" con `aria-current="page"` y `UserMenu`; `<nav aria-label="Panel de administración">`. `ADMIN_NAV_LINKS` solo tiene links a páginas existentes (hoy "Resumen").
- AC2: Escritorio (`md`+): sidebar fijo de 264 px. Móvil: se oculta; barra superior con logo y botón "Abrir menú" abre un `Sheet` lateral con la misma navegación, elegir un link lo cierra, foco atrapado, `Esc` cierra. Comportamiento idéntico al del operador.
- AC3: Acceso: sin sesión -> sign-in; `organizer` y `customer` -> redirigidos a `/` (ya lo hace `proxy.ts`, no se modifica). `AdminDashboard` llama `requireRole("admin")`; `admin` y `super_admin` ven los mismos datos.
- AC4: "Ingresos del mes" = suma de `total_cents` de reservas `confirmed` con `created_at` dentro del mes calendario en curso en Lima, mostrada con `formatPen`; sin ventas muestra `S/ 0`.
- AC5: "Ticket promedio" = `round(ingresos / confirmadas)` con `formatPen`; sin confirmadas muestra "—" (nunca `NaN`, `Infinity` ni `S/ 0`).
- AC6: "Cancelaciones" = `cancelled / total` del mes × 100 con 1 decimal (formato `8.3 %`, `12 %`, sin `.0`); con `total = 0` muestra "—". Bajo el valor: "X de Y reservas".
- AC7: "Destinos más vendidos": hasta 5 destinos con ≥ 1 reserva `confirmed` en el mes, ordenados por reservas desc, ingresos desc, nombre asc (determinista); cada fila muestra nombre, nº de reservas e ingresos en texto (la barra proporcional es decorativa, `aria-hidden`: la lista es la vista equivalente). Sin ventas: mensaje "Aún no hay ventas este mes".
- AC8: "Salidas de hoy": nº de salidas y de viajeros (`sum(booked_seats)`) con `starts_at` dentro del día de Lima, excluyendo `cancelled`; lista de hasta 8 por hora asc con hora (Lima, `formatDepartureTime`), título del paquete y `booked_seats/capacity`. Sin salidas: "No hay salidas hoy". Los totales cuentan todas, no solo las 8 de la lista.
- AC9: `limaDayRange(now)` y `limaMonthRange(now)` devuelven `[from, to)` en instantes UTC que corresponden a 00:00 Lima: p. ej. `2026-10-28T12:00Z` -> mes `[2026-10-01T05:00Z, 2026-11-01T05:00Z)`, día `[2026-10-28T05:00Z, 2026-10-29T05:00Z)`; `2026-11-01T04:59:59Z` aún es octubre y `…05:00:00Z` ya es noviembre; `2026-10-28T04:59Z` es el día 27 en Lima; diciembre pasa a enero del año siguiente; febrero bisiesto tiene 29 días.
- AC10: Las lecturas son globales (sin filtro por operador), sin `"use cache"`, y no importan nada de `@/modules/*` ajeno (ARCHITECTURE §1.6). `modules/admin` no importa `@/lib/db` ni Drizzle: solo compone la API pública de otros módulos.
- AC11: Estados vacíos coherentes: mes sin reservas -> ingresos `S/ 0`, ticket "—", cancelaciones "—", destinos vacío, sin error ni `NaN`.
- AC12: Sin regresión del operador: `/operador/*` mantiene `aria-label="Panel del operador"`, los links de `ORGANIZER_NAV_LINKS` (lista y orden sin cambios), la etiqueta "Gestión", el `Sheet` ("Menú del panel del operador"), el aviso de estado sobre el contenido y el activo exacto de "Perfil". Los tests de `organizer-nav-links` pasan sin editarse.
- AC13: Diseño y accesibilidad (móvil rediseñado con tokens vigentes): `h1` "Resumen" del panel sin hero; tarjetas `bg-surface rounded-card shadow-card`; valor grande 34 px/800; a 390 px una columna de KPIs y sin scroll horizontal (2 columnas desde ~480 px y 4 en escritorio ancho); objetivos ≥ 44 px, foco visible (`focus` dentro de `bg-dark`, `accent` en claro), íconos decorativos `aria-hidden`, sin `div` clicables, `prefers-reduced-motion` respetado, un solo CTA `accent` por vista (aquí ninguno). Cada KPI usa `<dl>`/`<dt>`/`<dd>` o equivalente semántico.
- AC14: `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde.

## Contracts
```ts
// lib/lima-time.ts  (UTC-5 fijo; mismo criterio que modules/packages/utils/departure-time.ts)
export type DateRange = { from: Date; to: Date }; // semiabierto [from, to)
export function limaDayRange(now: Date): DateRange;   // día calendario de Lima que contiene `now`
export function limaMonthRange(now: Date): DateRange; // mes calendario de Lima que contiene `now`

// modules/bookings/types/booking-kpis.ts
export type BookingKpiTotals = {
  confirmedCount: number;
  revenueCents: number;     // sum(total_cents) de confirmed
  cancelledCount: number;
  totalCount: number;       // pending + confirmed + cancelled
};
export type BookingKpis = BookingKpiTotals & {
  averageTicketCents: number | null; // Math.round(revenue / confirmed); null si confirmed = 0
  cancellationRate: number | null;   // 0-100, 1 decimal (Math.round(x * 1000) / 10); null si total = 0
};

// modules/bookings/utils/booking-kpis.ts  (puro)
export function toBookingKpis(totals: BookingKpiTotals): BookingKpis;

// modules/bookings/services/booking-kpi-service.ts
// una consulta: count(*), count(*) filter (status='confirmed'|'cancelled'),
// coalesce(sum(total_cents) filter (status='confirmed'), 0) from bookings where created_at >= from and created_at < to
export function getBookingKpis(range: DateRange): Promise<BookingKpis>;

// modules/destinations/types/destination-sales.ts
export type DestinationSalesRow = { id: string; slug: string; name: string; bookingsCount: number; revenueCents: number };
export type TopDestinationDto = DestinationSalesRow;

// modules/destinations/utils/top-destinations.ts  (puro)
export const TOP_DESTINATIONS_LIMIT = 5;
export function rankTopDestinations(rows: DestinationSalesRow[], limit?: number): TopDestinationDto[];
// descarta bookingsCount <= 0; orden: bookingsCount desc, revenueCents desc, name asc (localeCompare "es"); slice(0, limit); no muta la entrada

// modules/destinations/services/destination-sales-service.ts
// bookings (confirmed, created_at en range) inner join packages inner join destinations, group by destination -> rankTopDestinations
export function getTopDestinations(range: DateRange, limit?: number): Promise<TopDestinationDto[]>;

// modules/packages/types/departure-today.ts
export type TodayDepartureRow = {
  id: string; packageTitle: string; startsAt: Date; capacity: number; bookedSeats: number;
  status: "scheduled" | "en_route" | "completed";
};
export type TodayDeparturesDto = { departuresCount: number; travelersCount: number; items: TodayDepartureRow[] };

// modules/packages/utils/today-departures.ts  (puro)
export const TODAY_DEPARTURES_LIST_LIMIT = 8;
export function summarizeDepartures(rows: TodayDepartureRow[], limit?: number): TodayDeparturesDto;
// departuresCount = rows.length; travelersCount = sum(bookedSeats); items = orden startsAt asc, luego packageTitle asc, slice(0, limit); no muta

// modules/packages/services/today-departure-service.ts
// departures inner join packages where starts_at in range and status <> 'cancelled'
export function getTodayDepartures(range: DateRange): Promise<TodayDeparturesDto>;

// components/shared/panel-nav-links.ts
import type { LucideIcon } from "lucide-react";
export type PanelNavLink = { label: string; href: string; icon: LucideIcon };
export function isActivePanelLink(pathname: string | null, href: string, rootHref: string): boolean;
// href === rootHref -> solo ruta exacta; los demás: ruta o subrutas (mismo comportamiento que isActiveNavLink)

// components/shared/panel-nav.tsx  ("use client")
export function PanelNavSectionLabel(): JSX.Element;                       // "Gestión"
export function PanelNav(p: { links: ReadonlyArray<PanelNavLink>; rootHref: string; navLabel: string; onNavigate?: () => void }): JSX.Element;
export function PanelMobileBar(p: { links: ReadonlyArray<PanelNavLink>; rootHref: string; navLabel: string; menuTitle: string }): JSX.Element;

// components/shared/panel-shell.tsx  ("use client"; mismo markup que el OrganizerShell actual, con Suspense para usePathname)
export function PanelShell(p: { links: ReadonlyArray<PanelNavLink>; rootHref: string; navLabel: string; menuTitle: string; children: ReactNode }): JSX.Element;

// modules/organizers/components/organizer-shell.tsx  ("use client", wrapper fino)
// <PanelShell links={ORGANIZER_NAV_LINKS} rootHref="/operador" navLabel="Panel del operador" menuTitle="Menú del panel del operador">

// modules/admin/components/admin-nav-links.ts
export const ADMIN_NAV_LINKS: ReadonlyArray<PanelNavLink>; // hoy: [{ label: "Resumen", href: "/admin", icon: LayoutDashboard }]

// modules/admin/utils/kpi-format.ts  (puro)
export function formatRate(rate: number | null): string;   // null -> "—"; 8.3 -> "8.3 %"; 12 -> "12 %"
export function formatMoneyOrDash(cents: number | null): string; // null -> "—"; si no, formatPen

// modules/admin/components/admin-shell.tsx   ("use client") <PanelShell links={ADMIN_NAV_LINKS} rootHref="/admin" navLabel="Panel de administración" menuTitle="Menú del panel de administración">
// modules/admin/components/admin-dashboard.tsx  (async server)
//   await requireRole("admin"); const now = new Date(); month = limaMonthRange(now); day = limaDayRange(now);
//   Promise.all([getBookingKpis(month), getTopDestinations(month), getTodayDepartures(day)])
// kpi-card.tsx / top-destinations-card.tsx / today-departures-card.tsx: presentacionales (props mínimas, sin lógica de datos)

// modules/admin/index.ts
export { AdminShell } from "./components/admin-shell";
export { AdminDashboard } from "./components/admin-dashboard";

// Exports nuevos de módulos ajenos (solo líneas agregadas)
// modules/bookings/index.ts:      export { getBookingKpis } from "./services/booking-kpi-service"; export type { BookingKpis } from "./types/booking-kpis";
// modules/destinations/index.ts:  export { getTopDestinations } from "./services/destination-sales-service"; export type { TopDestinationDto } from "./types/destination-sales";
// modules/packages/index.ts:      export { getTodayDepartures } from "./services/today-departure-service"; export type { TodayDeparturesDto, TodayDepartureRow } from "./types/departure-today";
```
Rutas: `app/(admin)/layout.tsx` -> `<AdminShell>{children}</AdminShell>`. `app/(admin)/admin/page.tsx` (`metadata.title = "Resumen"`) -> `h1` + `<Suspense fallback={<PageSkeleton />}><AdminDashboard /></Suspense>`. Sin endpoints, schemas Zod ni Server Actions (solo lectura, sin entrada del usuario).

## Edge cases
- División por cero: `confirmed = 0` -> ticket `null`; `total = 0` -> tasa `null`; ambos se renderizan "—".
- Redondeo: ticket entero en céntimos (`Math.round`); tasa a 1 decimal (`1/3` -> `33.3`, `2/3` -> `66.7`, `0` -> `0` -> "0 %", `1` -> `100` -> "100 %").
- Límites de período: `created_at`/`starts_at` exactamente en `from` entran; exactamente en `to` no (semiabierto). Cambio de mes/día se calcula en Lima, no en UTC (una reserva a las `2026-11-01T02:00Z` es del 31 de octubre en Lima).
- `sum` de Postgres devuelve `bigint` como `string`: `mapWith(Number)`; `coalesce(…, 0)` para mes vacío.
- Empate de destinos: orden total determinista (reservas, ingresos, nombre); destino con 0 ventas no aparece aunque haya < 5 con ventas.
- Una salida `completed` hoy cuenta; una `cancelled` no. Un día sin salidas: `departuresCount = 0`, `travelersCount = 0`, `items = []`.
- Nuevo valor de `departure_status`: `TodayDepartureRow.status` excluye `cancelled` a nivel de tipo; tsc avisa si se agrega otro valor.
- Rol insuficiente que llega al componente: `requireRole` lanza `AuthError`; el `proxy.ts` ya redirige antes, queda al error boundary (igual que el operador).
- Viewport 390 px: valores largos (`S/ 125 400`) no desbordan (`break-words`/`min-w-0`); nombre de paquete largo se trunca en 2 líneas.
- `usePathname` suspende bajo rutas con params dinámicos: el `Suspense` del shell se conserva (comentario ya existente en `organizer-shell.tsx`).

## Tests
- `lib/lima-time.test.ts` — AC9: los ejemplos de AC9 (mes y día), límites `04:59:59Z`/`05:00:00Z`, diciembre -> enero, febrero bisiesto, `to` de un rango = `from` del siguiente.
- `modules/bookings/utils/booking-kpis.test.ts` — AC4, AC5, AC6, AC11: ticket `round(10 / 3)`; `confirmed = 0` -> `averageTicketCents null`; `total = 0` -> `cancellationRate null` y revenue 0; `1/3 -> 33.3`, `2/3 -> 66.7`, `0 -> 0`, `total = cancelled -> 100`; conserva los totales de entrada.
- `modules/bookings/services/booking-kpi-service.test.ts` — AC4–AC6, AC10: `describe.skipIf(!process.env.DATABASE_URL)` con import dinámico: un rango en el pasado lejano da ceros y `null`; un rango amplio coincide con una consulta independiente (suma de `confirmed`, conteos por estado) y respeta `[from, to)`. Sin fijar números del seed.
- `modules/destinations/utils/top-destinations.test.ts` — AC7: orden por reservas, desempate por ingresos y luego nombre (acentos, `localeCompare "es"`), descarta `bookingsCount = 0`, límite por defecto 5 y personalizado, lista vacía, no muta la entrada.
- `modules/destinations/services/destination-sales-service.test.ts` — AC7: DB condicionada; rango vacío -> `[]`; rango amplio: ≤ 5 filas, orden no creciente por reservas, solo reservas `confirmed`.
- `modules/packages/utils/today-departures.test.ts` — AC8: totales sobre todas las filas aunque la lista se limite a 8; orden por `startsAt` y desempate por título; viajeros = suma de `bookedSeats`; vacío; no muta.
- `modules/packages/services/today-departure-service.test.ts` — AC8: DB condicionada; rango vacío -> ceros; excluye `cancelled`; solo `starts_at` dentro del rango.
- `components/shared/panel-nav-links.test.ts` — AC2, AC12: raíz exacta activa; subruta no activa la raíz; subruta de un link no raíz activa ese link; `null` -> `false`; prefijo parecido (`/administradores`, `/operadores`) no activa.
- `modules/admin/utils/kpi-format.test.ts` — AC5, AC6, AC11: `formatRate` (`null`, `0`, `8.3`, `12`, `100`), `formatMoneyOrDash` (`null` -> "—", `0` -> `S/ 0`).
- UI (AC1–3, AC12, AC13): sin tests unitarios (markup que solo compone); verificación manual descrita en la revisión (1280 y 390 px, admin y super_admin, operador sin regresión).
- AC10: verificable con `grep` (sin `@/lib/db` en `modules/admin`).

## Plan

Coordinación con 023 (worktree abierto, toca `modules/bookings`): esta spec **solo agrega archivos nuevos** en `modules/bookings` (`booking-kpis*`, `booking-kpi-service*`) y no edita ninguno de `booking-list-*` ni `organizer-nav-links*`. La única edición compartida son las líneas de export de `modules/bookings/index.ts` y `modules/packages/index.ts` (T9, solo se agregan líneas al final). Si 023 mergea primero, rebasar antes de T9 y conservar ambos bloques de export; si mergea después, el conflicto es de añadidos adyacentes y se resuelve manteniendo ambas listas. Las fases 1–3 son independientes entre sí a nivel de archivos y pueden ejecutarse en cualquier orden o en paralelo; la fase 4 depende de las tres.

### Phase 1 — Rangos Lima y KPIs de reservas (solo lógica; la app no cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `lib/lima-time.ts` (`DateRange`, `limaDayRange`, `limaMonthRange`) + test | lib/lima-time.ts, lib/lima-time.test.ts | - | A | AC9 | done |
| T2 | Tipos y `toBookingKpis` (puro) + test | modules/bookings/types/booking-kpis.ts, modules/bookings/utils/booking-kpis.ts, modules/bookings/utils/booking-kpis.test.ts | - | A | AC4, AC5, AC6, AC11 | done |
| T3 | `getBookingKpis` + test con BD | modules/bookings/services/booking-kpi-service.ts, modules/bookings/services/booking-kpi-service.test.ts | T1, T2 | - | AC4, AC5, AC6, AC10 | done |

### Phase 2 — Destinos más vendidos y salidas de hoy (solo lógica; la app no cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | Tipos, `rankTopDestinations`, `getTopDestinations` + tests | modules/destinations/types/destination-sales.ts, modules/destinations/utils/top-destinations.ts, modules/destinations/utils/top-destinations.test.ts, modules/destinations/services/destination-sales-service.ts, modules/destinations/services/destination-sales-service.test.ts | T1 | A | AC7, AC10 | done |
| T5 | Tipos, `summarizeDepartures`, `getTodayDepartures` + tests | modules/packages/types/departure-today.ts, modules/packages/utils/today-departures.ts, modules/packages/utils/today-departures.test.ts, modules/packages/services/today-departure-service.ts, modules/packages/services/today-departure-service.test.ts | T1 | A | AC8, AC10 | done |

### Phase 3 — Shell compartido (el operador queda igual)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T6 | `PanelNavLink` e `isActivePanelLink` + test | components/shared/panel-nav-links.ts, components/shared/panel-nav-links.test.ts | - | - | AC2, AC12 | done |
| T7 | `PanelNav`, `PanelMobileBar`, `PanelShell` (extraídos de `organizer-nav.tsx`/`organizer-shell.tsx`, parametrizados) | components/shared/panel-nav.tsx, components/shared/panel-shell.tsx | T6 | - | AC2, AC12, AC13 | done |
| T8 | `OrganizerShell` como wrapper `"use client"` sobre `PanelShell`; borrar `organizer-nav.tsx` | modules/organizers/components/organizer-shell.tsx, modules/organizers/components/organizer-nav.tsx (delete) | T7 | - | AC12 | done |

### Phase 4 — Componentes del Resumen (sin ruta todavía)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T9 | setup: exports en los `index.ts` de `bookings`, `destinations` y `packages` (solo líneas agregadas, ver coordinación con 023) | modules/bookings/index.ts, modules/destinations/index.ts, modules/packages/index.ts | T3, T4, T5 | - | AC10 | done |
| T10 | `formatRate` y `formatMoneyOrDash` + test | modules/admin/utils/kpi-format.ts, modules/admin/utils/kpi-format.test.ts | T9 | A | AC5, AC6, AC11 | done |
| T11 | `KpiCard`, `TopDestinationsCard`, `TodayDeparturesCard` (presentacionales, 1 col a 390 px) | modules/admin/components/kpi-card.tsx, modules/admin/components/top-destinations-card.tsx, modules/admin/components/today-departures-card.tsx | T9 | A | AC7, AC8, AC11, AC13 | done |
| T12 | `AdminDashboard` (guard, rangos, `Promise.all`, composición) | modules/admin/components/admin-dashboard.tsx | T10, T11 | - | AC3, AC4–AC8, AC10, AC11 | done |

### Phase 5 — Shell admin y ruta (la app cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T13 | `ADMIN_NAV_LINKS` y `AdminShell` (wrapper `"use client"` sobre `PanelShell`) | modules/admin/components/admin-nav-links.ts, modules/admin/components/admin-shell.tsx | T7 | - | AC1, AC2 | done |
| T14 | `index.ts` del módulo, layout y página `/admin` | modules/admin/index.ts, app/(admin)/layout.tsx, app/(admin)/admin/page.tsx | T12, T13 | - | AC1, AC3, AC13, AC14 | done |

Notas de paralelismo: dentro de cada fase, solo T1/T2 (fase 1), T4/T5 (fase 2) y T10/T11 (fase 4) comparten `Group` (sin archivos en común). Ninguna tarea comparte `Owns` con otra de su misma fase. Cada fase termina con lint + tsc + tests en verde y la app funcionando; la fase 5 además exige `npm run build`.

## Resolved questions
Aprobado con los defaults propuestos (2026-10-28): 1) America/Lima; 2) denominador = todas las reservas del mes; 3) `bookings.created_at`; 4) destinos por reservas `confirmed` del mes; 5) sin variación vs. mes anterior (fuera de alcance); 6) sin bloques extra de la pantalla 9 (van a 026+); 7) salidas de hoy excluye `cancelled`; 8) se extrae el shell a `components/shared`.
