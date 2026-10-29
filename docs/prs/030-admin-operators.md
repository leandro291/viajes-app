# 030 — admin-operators

- Spec: `docs/specs/organizers/admin-operators.md`
- Rama: `030-admin-operators`

## Qué se hizo
Nueva pantalla `/admin/operadores` para activar, suspender o rechazar operadores. Al activar se asegura el rol `organizer` en Clerk antes de guardar `organizers.status`.

## Cambios
- `lib/auth/clerk-role.ts` — `ensureClerkRole` (único uso de `clerkClient`; lo reutilizará 031).
- `modules/organizers/` — tipos, transiciones, schema Zod, `operator-service`, Server Action y componentes de lista, fila y acciones (con tests).
- `modules/organizers/components/organizer-profile-card.tsx` — usa el mapa de badges compartido, sin cambio visual.
- `modules/admin/components/admin-nav-links.ts` (+ test) — link "Operadores".
- `app/(admin)/admin/operadores/page.tsx` — página.
- `docs/specs/organizers/admin-operators.md`, `changelog/030-admin-operators.md`, `docs/prs/030-admin-operators.md` — spec, changelog y esta descripción.

## Criterios de aceptación
- [x] AC1: lista con datos del operador, pendientes primero (Playwright + test de BD).
- [x] AC2: acciones y confirmación por estado (diálogo de Suspender verificado en Playwright; el resto por código y review).
- [x] AC3: activar va Clerk primero, luego BD; `CLERK_FAILED` y `PARTIAL` (test de BD con Clerk mockeado).
- [x] AC4: suspender solo toca la BD (test de BD).
- [x] AC5: `ensureClerkRole` no baja el rol ni pisa metadata (7 tests).
- [x] AC6: mismo estado es no-op; `id` inexistente da `NOT_FOUND` (test de BD).
- [x] AC7: la action exige `admin`+ y valida con Zod (8 tests).
- [x] AC8: link "Operadores" al final del nav, activo en su ruta.
- [x] AC9: `OrganizerProfileCard` sin cambio visual; sus tests pasan.
- [x] AC10: diseño y 390 px sin scroll horizontal (Playwright); accesibilidad revisada por código.
- [x] AC11: tsc, lint, tests y build en verde.

## Cómo probar
1. Con sesión `admin`, abrir `/admin/operadores`: se ve la lista y el link activo en el menú.
2. Pulsar "Suspender" en un operador activo: abre confirmación con el nombre de la empresa; "Cancelar" no cambia nada.
3. Con un operador `pending` cuyo usuario exista en Clerk, "Aprobar": pasa a Activo y el usuario recibe el rol `organizer` (su sesión lo ve en ~60 s).
4. Con un operador sembrado (`clerk_id` `seed_*`), "Reactivar" muestra el error de Clerk dentro del diálogo y la fila no cambia.

## Revisión
- Reviewer: APPROVED (T1–T7)
- lint ✓ · tsc ✓ · tests ✓ (incluye 8 de BD de `operator-service`) · build ✓ · Playwright: `/admin/operadores` en escritorio y 390 px (suspender/reactivar real no probado, ver changelog)
