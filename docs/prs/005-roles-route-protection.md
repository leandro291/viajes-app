# 005 — roles-route-protection

- Spec: n.a. (BUILD)
- Rama: `005-roles-route-protection`

## Qué se hizo
Guard `requireRole()` en `lib/auth` y protección por grupo de rutas en `proxy.ts`. El rol sale de `publicMetadata.role` (claim `metadata` del token); sin rol = `customer`.

## Cambios
- `lib/auth/roles.ts` — tipo `Role`, `roleFromClaims()`, `hasRole()` (jerarquía lineal).
- `lib/auth/roles.test.ts` — 10 tests.
- `lib/auth/require-role.ts` — `requireRole(min)` y `AuthError` para Server Actions y route handlers.
- `proxy.ts` — protege `/pago`, `/confirmacion`, `/mis-reservas`, `/cuenta` (customer), `/operador` (organizer) y `/admin` (admin).
- `changelog/005-roles-route-protection.md`, `docs/prs/005-roles-route-protection.md`

## Decisiones
- Jerarquía lineal: customer < organizer < admin < super_admin. Un admin entra a `/operador` y `/cuenta`; un organizer no entra a `/admin`.
- Sin sesión: redirige a `/sign-in`. Sin rol suficiente: redirige a `/`.
- `requireRole()` lanza `AuthError` (`UNAUTHENTICATED` | `FORBIDDEN`), no redirige.
- Sin páginas placeholder: los grupos aún no tienen rutas reales.

## Criterios de aceptación
- [x] Sin rol en el token = `customer` (test)
- [x] Rol desconocido o de tipo inválido = `customer` (test)
- [x] Jerarquía de `hasRole` (test)
- [x] Sin sesión, las rutas protegidas redirigen a `/sign-in?redirect_url=...` (curl, 8 rutas)
- [x] Usuario `admin` entra a `/admin`, `/operador` y `/cuenta` sin redirección (probado por el dueño)
- [x] Al quitarle el rol de admin, `/admin` y `/operador` redirigen a `/` (probado por el dueño)
- [ ] `requireRole()` en una Server Action real (todavía no hay ninguna)

## Cómo probar
1. Clerk Dashboard → Sessions → Customize session token: `{"metadata": "{{user.public_metadata}}"}`.
2. Poner `publicMetadata.role` (`organizer`, `admin`, `super_admin`) en un usuario de prueba.
3. Con `.env.local`, `npm run dev`: sin sesión, `/cuenta`, `/operador` y `/admin` van a `/sign-in`; con `customer`, `/operador` y `/admin` van a `/`.

## Notas
- El claim `metadata` ya está configurado en la instancia de desarrollo; falta repetirlo en producción.
- Sin el claim `metadata` en el dashboard, todos los usuarios quedan como `customer`.
- Sincronizar el rol a `users.role` es la 006.

## Revisión
- Reviewer: n.a. (BUILD)
- lint ✓ · tsc ✓ (tras `next typegen`) · tests ✓ (10) · redirecciones probadas en vivo con Clerk de desarrollo (curl y navegador del dueño)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
