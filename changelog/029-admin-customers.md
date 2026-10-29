# 029 — admin-customers

- Fecha: 2026-10-29
- Spec: n.a. (BUILD, sin spec)
- PR: `docs/prs/029-admin-customers.md`

## Resumen
Nueva página `/admin/clientes`: `admin` y `super_admin` ven los clientes con cantidad de reservas, gasto total y fecha de la última reserva. Los tres datos cuentan solo reservas confirmadas (ERM §Derivado); un cliente sin ninguna sale con 0, S/ 0 y «—». Orden por última reserva, la más reciente primero.

## Cambios
- `modules/admin/services/customer-list-service.ts` — `listCustomers()`: `users` (rol `customer`) con `LEFT JOIN` a `bookings` confirmadas y agregados; tope de 100.
- `modules/admin/utils/customer-row.ts` (+ test) — `toCustomerRowDto`: une nombre y apellido, `null` si no hay.
- `modules/admin/components/admin-customers-page.tsx` — página de servidor: `requireRole("admin")`, tabla y estado vacío.
- `modules/admin/index.ts` — export de `AdminCustomersPage`.
- `app/(admin)/admin/clientes/page.tsx` — ruta.
- `modules/admin/components/admin-nav-links.ts` (+ test) — link «Clientes» tras «Reservas».

## Pendiente
- Sin paginación ni orden por columna: la lista se corta en 100 clientes (`ponytail:` en el servicio). Hoy hay 9.
- No probado: el rechazo de `organizer` y `customer` en la ruta (solo hubo sesión de admin) ni el estado vacío.
- En móvil la columna «Última reserva» queda tras el scroll horizontal de la tabla, igual que en `/admin/reservas`.
- El servicio no tiene test con BD; se comprobó a mano contra la Neon de `.env` (solo lectura).
