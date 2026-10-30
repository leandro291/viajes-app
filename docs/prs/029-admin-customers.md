# 029 — admin-customers

- Spec: n.a.
- Rama: `029-admin-customers`

## Qué se hizo
Página `/admin/clientes` para admin: lista de clientes con cantidad de reservas, gasto total y fecha de la última reserva, sobre reservas confirmadas. Solo lectura, sin cambios de BD.

## Cambios
- `modules/admin/services/customer-list-service.ts` — consulta con `LEFT JOIN` a `bookings` confirmadas y agregados; tope de 100.
- `modules/admin/utils/customer-row.ts` (+ test) — DTO de fila y nombre completo.
- `modules/admin/components/admin-customers-page.tsx` — página de servidor con `requireRole("admin")`, tabla y estado vacío.
- `modules/admin/index.ts` — export de la página.
- `app/(admin)/admin/clientes/page.tsx` — ruta.
- `modules/admin/components/admin-nav-links.ts` (+ test) — link «Clientes».
- `changelog/029-admin-customers.md`, `docs/prs/029-admin-customers.md` — documentación.

## Criterios de aceptación
Sin spec; criterios de la tarjeta 029:
- [x] Lista de clientes
- [x] Cantidad de reservas
- [x] Gasto total
- [x] Fecha de la última reserva

## Cómo probar
1. `npm run dev -- -p 3029` e iniciar sesión como `admin`.
2. Abrir `/admin/clientes`: tabla con los clientes, los de reservas confirmadas primero (más reciente arriba) y los de 0 reservas al final con S/ 0 y «—».
3. Comprobar el link «Clientes» activo en el menú lateral.
4. Con un `organizer` o `customer`: la ruta debe rechazarlo (no probado).

## Revisión
- Reviewer: n.a. (BUILD, sin spec ni agente reviewer)
- lint ✓ · tsc ✓ · tests de `modules/admin` ✓ (13) · Playwright: `/admin/clientes` en escritorio y 390 px, sin errores de consola ni 4xx/5xx
