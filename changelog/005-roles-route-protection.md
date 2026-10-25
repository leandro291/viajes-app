# 005 — roles-route-protection

- Fecha: 2026-10-25
- Spec: n.a. (BUILD, 4 archivos, sin contratos nuevos de datos)
- PR: `docs/prs/005-roles-route-protection.md`

## Resumen
Roles y protección de rutas. El rol sale de `publicMetadata.role` (vía claim `metadata` del token; sin rol = `customer`). `proxy.ts` protege por grupo y `requireRole()` valida en Server Actions y route handlers. Jerarquía lineal: customer < organizer < admin < super_admin.

## Cambios
- `lib/auth/roles.ts` — tipo `Role` (del enum `user_role`), `roleFromClaims()` y `hasRole()`.
- `lib/auth/roles.test.ts` — tests de default a customer, rol inválido y jerarquía.
- `lib/auth/require-role.ts` — `requireRole(min)` y `AuthError` (`UNAUTHENTICATED` | `FORBIDDEN`).
- `proxy.ts` — `/pago`, `/confirmacion`, `/mis-reservas`, `/cuenta` (customer), `/operador` (organizer), `/admin` (admin). Sin sesión va a `/sign-in`; sin rol va a `/`.

## Pendiente
- Manual en Clerk (Sessions → Customize session token): agregar `{"metadata": "{{user.public_metadata}}"}`. Sin esto todos quedan como `customer`.
- Verificación en vivo con claves de Clerk: el repo principal no tiene `.env.local`.
- Sincronizar el rol a `users.role` es la 006 (webhook).
