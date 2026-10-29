# 025 — admin-shell-kpis

- Spec: `docs/specs/admin/admin-dashboard.md`
- Rama: `025-admin-shell-kpis`

## Qué se hizo
Shell del panel `(admin)` y página `/admin` con los KPIs del mes en Lima (ingresos, ticket promedio, % de cancelaciones, destinos más vendidos y salidas de hoy). Las lecturas agregadas viven en `bookings`, `destinations` y `packages`; `modules/admin` solo compone. El shell del operador se extrajo a `components/shared` y lo usan ambos paneles.

## Cambios
- `lib/lima-time.ts` — rangos de día y mes en Lima, semiabiertos `[from, to)`.
- `components/shared/panel-{nav-links,nav,shell}` — shell de panel parametrizado, extraído del operador.
- `modules/organizers/components/organizer-shell.tsx` — wrapper fino sobre `PanelShell`; `organizer-nav.tsx` borrado.
- `modules/bookings`, `modules/destinations`, `modules/packages` — `getBookingKpis`, `getTopDestinations`, `getTodayDepartures` con su lógica pura y tests; exports solo agregados al final de cada `index.ts`.
- `modules/admin` — `AdminShell`, `AdminDashboard`, tarjetas de KPIs y formato.
- `app/(admin)/layout.tsx`, `app/(admin)/admin/page.tsx` — layout y ruta `/admin`.
- `docs/specs/admin/admin-dashboard.md`, `changelog/025-admin-shell-kpis.md`, `docs/prs/025-admin-shell-kpis.md`.

## Criterios de aceptación
- [x] AC2: sidebar en escritorio; en móvil el botón "Abrir menú" abre el drawer (no se probó `Esc` ni el cierre al elegir link)
- [x] AC3: sin sesión, `/admin` redirige a sign-in (307); con admin carga (no se probaron `organizer` ni `customer`)
- [x] AC4: ingresos del mes (S/ 28 991 con datos reales; lógica cubierta por tests con BD)
- [x] AC5: ticket promedio, con "—" sin confirmadas (tests)
- [x] AC6: cancelaciones con 1 decimal y "X de Y reservas"; "—" con `total = 0`
- [x] AC7: top 5 de destinos con orden determinista
- [x] AC8: salidas de hoy y totales sobre todas las filas (en pantalla solo se vio el estado vacío)
- [x] AC9: rangos Lima, límites `04:59:59Z`/`05:00:00Z`, diciembre y bisiesto
- [x] AC10: lecturas globales; `grep` sin `@/lib/db` en `modules/admin`
- [x] AC11: estados vacíos sin `NaN`
- [x] AC12: `/operador` sin cambios (reviewer y navegador)
- [x] AC14: `tsc`, `lint`, `npm test` y `npm run build` en verde
- [ ] AC1: shell con link "Resumen" y `UserMenu` se vio; `aria-current` sin verificar
- [ ] AC13: 390 px en una columna y sin scroll horizontal verificado; foco, contraste y comparación con la pantalla 9 del artefacto sin verificar

## Cómo probar
1. `npm run dev` y entrar con un usuario `admin` o `super_admin`.
2. Abrir `/admin`: ver 4 KPIs, "Destinos más vendidos" y "Salidas de hoy".
3. Reducir a 390 px: una columna y "Abrir menú" abre el drawer.
4. Abrir `/operador`: el panel se ve igual que antes.
5. Sin sesión, `/admin` redirige a `/sign-in`.

## Revisión
- Reviewer: APPROVED (4 hallazgos menores; se aplicaron 2: `ADMIN_NAV_LINKS` fuera del `index.ts` y tipado de solo lectura)
- lint ✓ · tsc ✓ · test ✓ (836 pasan, 184 omitidos sin BD) · build ✓ · Playwright: `/admin` en escritorio y 390 px, drawer móvil, `/operador`
