# 025 — admin-shell-kpis

- Fecha: 2026-10-28
- Spec: `docs/specs/admin/admin-dashboard.md`
- PR: `docs/prs/025-admin-shell-kpis.md`

## Resumen
Shell del panel `(admin)` y página `/admin` con los KPIs del mes en Lima: ingresos, ticket promedio, % de cancelaciones, destinos más vendidos y salidas de hoy. Las lecturas agregadas viven en `bookings`, `destinations` y `packages`; `modules/admin` solo compone. El shell del operador se extrajo a `components/shared` y ahora lo usan ambos paneles.

## Cambios
- `lib/lima-time.ts` (+test) — `limaDayRange` y `limaMonthRange`, rangos semiabiertos `[from, to)` en UTC-5 fijo.
- `components/shared/panel-nav-links.ts` (+test), `panel-nav.tsx`, `panel-shell.tsx` — `PanelShell`, `PanelNav` y `PanelMobileBar` parametrizados por links, extraídos del shell del operador.
- `modules/organizers/components/organizer-shell.tsx` — pasa a wrapper `"use client"` sobre `PanelShell`; `organizer-nav.tsx` borrado. El operador queda igual.
- `modules/bookings/` — `getBookingKpis(range)`, `toBookingKpis` puro (ticket y tasa `null` sin datos) y tipos, con tests; exports agregados al final de `index.ts`.
- `modules/destinations/` — `getTopDestinations(range)` y `rankTopDestinations` (reservas, ingresos, nombre; top 5), con tests y exports.
- `modules/packages/` — `getTodayDepartures(range)` y `summarizeDepartures` (excluye `cancelled`, lista de 8, totales sobre todas), con tests y exports.
- `modules/admin/` — `AdminShell`, `ADMIN_NAV_LINKS`, `AdminDashboard`, `KpiCard`, `TopDestinationsCard`, `TodayDeparturesCard` y `kpi-format` (+test); `index.ts` expone `AdminShell` y `AdminDashboard`.
- `app/(admin)/layout.tsx`, `app/(admin)/admin/page.tsx` — layout con `AdminShell` y página `/admin` con `AdminDashboard` en `Suspense`.
- `docs/specs/admin/admin-dashboard.md`, `changelog/025-admin-shell-kpis.md`, `docs/prs/025-admin-shell-kpis.md` — spec (aprobada, T1–T14 `done`), changelog y PR.

## Pendiente
- Verificado en navegador (escritorio, 390 px, drawer móvil y `/operador` sin cambios) y con `lint`, `tsc` y `build`. No se comparó contra la pantalla 9 del artefacto Wayra (no se pudo abrir); el tablero Móvil-Admin sigue con el estilo viejo en el artefacto.
- La lista con filas de "Salidas de hoy" no se vio en pantalla: no hay salidas hoy en la BD de desarrollo (solo el estado vacío).
- Los tests de servicio con BD quedan omitidos sin `DATABASE_URL`; se corrieron con `.env` contra Neon de desarrollo.
- `formatPen` no agrupa miles en cifras de 4 dígitos ("S/ 1932.73" frente a "S/ 28 991"); comportamiento previo.
- Al mergear junto con 023: solo líneas añadidas al final de `modules/bookings/index.ts` y `modules/packages/index.ts`; si hay conflicto, conservar ambos bloques.
- Fuera de alcance: variación contra el mes anterior, bloques extra de la pantalla 9 y filtros por rango (026 y siguientes). Las tarjetas 026–030 suman sus links a `ADMIN_NAV_LINKS`.
