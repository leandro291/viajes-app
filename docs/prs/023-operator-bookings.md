# 023 — operator-bookings

- Spec: `docs/specs/bookings/operator-bookings.md`
- Rama: `023-operator-bookings`

## Qué se hizo
Agrega `/operador/reservas`: tabla de solo lectura con las reservas de los paquetes del operador y sus viajeros (fila expandible). Orden, filtro por estado y paginación son del servidor; la tabla es genérica para que la reuse 026.

## Cambios
- `modules/bookings/` — tipos, utilidades (`booking-list-params`, `booking-list-view`), servicio `listBookings` y componentes (`BookingsTable`, filtro, paginación, `OperatorBookingsPage`), con sus tests.
- `app/(organizer)/operador/reservas/page.tsx` — ruta nueva.
- `modules/organizers/components/organizer-nav-links.ts` (+ test) — link "Reservas" en el sidebar.
- `components/ui/table.tsx` — shadcn `table`.
- `lib/lima-date.ts` (+ test) — formateadores de fecha Lima movidos desde `modules/packages/utils/package-detail.ts`, que los re-exporta; sin cambios de firma.
- `docs/specs/bookings/operator-bookings.md`, `changelog/023-operator-bookings.md`, `docs/prs/023-operator-bookings.md` — spec, changelog y esta descripción.

## Criterios de aceptación
- [x] AC1–AC5: parseo de parámetros, href, `nextSortQuery`, mapper de filas y etiquetas (tests unitarios).
- [x] AC6: un operador solo ve reservas de sus paquetes; en el navegador no aparece la reserva ni el documento de otro operador.
- [x] AC7–AC12: `{ all: true }`, forma de la fila, filtro, orden estable, paginación y sin caché (test de BD del servicio, corrido por el developer de T4; orden, filtro y paginación confirmados además en el navegador).
- [x] AC13: ruta `/operador/reservas` con `h1` "Reservas" y link en el sidebar.
- [x] AC14: sin perfil de operador muestra el aviso y no consulta reservas; con perfil, lista las suyas.
- [x] AC15–AC19: tabla TanStack v9, columnas, headers de orden con `aria-sort`, fila expandible con documentos completos, tabla sin dependencia de `organizers`.
- [x] AC20–AC21: filtro por estado (`aria-current`) y paginación Anterior/Siguiente que conservan `estado`, `orden` y `dir`.
- [ ] AC22: estados vacíos ("Aún no tienes reservas", "No hay reservas con este estado") — sin probar en el navegador.
- [x] AC23: foco visible, targets ≥ 44 px, atributos ARIA y teclado (Enter expande); `prefers-reduced-motion` no se probó.

## Cómo probar
1. `npm ci` y `npm run dev`; entrar con una cuenta de operador activo que tenga reservas.
2. Abrir `/operador/reservas`: comprobar 20 filas por página, "Página X de Y" y Anterior/Siguiente.
3. Ordenar por Código, Salida y Total (ambos sentidos) y filtrar por Pendientes/Confirmadas/Canceladas.
4. Expandir una fila (clic o Enter): viajero principal primero, con documento completo.
5. Probar `?pagina=999` y parámetros inválidos (`?orden=x&estado=y`): cae a defaults.
6. Revisar a 390 px: la tabla hace scroll horizontal dentro de su contenedor, sin scroll de página.
7. `npm test` y `node --env-file=.env.local ./node_modules/vitest/vitest.mjs run modules/bookings` (el test de BD escribe y limpia filas con ids fijos).

## Revisión
- Reviewer: APPROVED (Fase 1, T1–T4; Fase 2, T5–T9)
- lint ✓ · tsc ✓ · build ✓ · Playwright: `/operador/reservas` (orden, filtro, paginación, fila expandible, 390 px, teclado)
