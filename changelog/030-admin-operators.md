# 030 — admin-operators

- Fecha: 2026-10-29
- Spec: `docs/specs/organizers/admin-operators.md`
- PR: `docs/prs/030-admin-operators.md`

## Resumen
`admin` y `super_admin` ven los operadores en `/admin/operadores` (pendientes primero) y cambian su `organizers.status` con confirmación. Al activar o reactivar se asegura el rol `organizer` en Clerk antes de guardar en la BD; si Clerk falla no cambia nada, y si falla la BD queda un estado intermedio seguro y reintentable. Suspender o rechazar solo toca la BD.

## Cambios
- `lib/auth/clerk-role.ts` — `ensureClerkRole`, único uso de `clerkClient`: sube el rol sin bajarlo ni pisar otra metadata (+ test).
- `modules/organizers/types/organizer-manage.ts` — tipos y mensajes del resultado (`CLERK_FAILED`, `PARTIAL`, `NOT_FOUND`, ...).
- `modules/organizers/utils/status-change.ts` — transiciones puras (+ test).
- `modules/organizers/utils/organizer-status-badge.ts` — mapa de badges extraído de `OrganizerProfileCard`.
- `modules/organizers/schemas/operator-schema.ts` — validación Zod de `id` y `status` (+ test).
- `modules/organizers/services/operator-service.ts` — `listOperators` y `setOperatorStatus`, orden Clerk → BD (+ test de BD).
- `modules/organizers/actions/operator-actions.ts` — Server Action con `requireRole("admin")` (+ test).
- `modules/organizers/components/operator-*.tsx`, `admin-operators-page.tsx` — lista, fila y acciones con `ConfirmActionDialog`.
- `modules/organizers/components/organizer-profile-card.tsx` — usa el mapa de badges compartido, sin cambio visual.
- `modules/organizers/index.ts`, `modules/admin/components/admin-nav-links.ts` (+ test), `app/(admin)/admin/operadores/page.tsx` — export, link "Operadores" y página.

## Pendiente
- Aprobar o reactivar contra Clerk real no se probó en UI: los operadores sembrados tienen `clerk_id` `seed_*` y fallan con `CLERK_FAILED` (suspender sí funciona).
- Nada crea la fila de `organizers` salvo el seed ("Quiero ser operador" va en otra tarjeta).
- Suspender no oculta los paquetes publicados ni quita el rol `organizer` en Clerk.
- `users.role` lo escribe solo el webhook de Clerk, no esta action.
