# 031 — admin-settings

- Fecha: 2026-10-29
- Spec: `docs/specs/admin/admin-settings.md`
- PR: `docs/prs/031-admin-settings.md`

## Resumen
Solo `super_admin` gestiona administradores en `/admin/administradores` (alta por correo y baja, con el rol en `publicMetadata.role` de Clerk) y guarda sus preferencias de notificación en `/admin/configuracion`. La v1 solo guarda las preferencias: no envía correos ni mensajes. Sin tabla nueva ni migración.

## Cambios
- `lib/auth/clerk-role.ts` — `findClerkUserByEmail`, `getClerkRole` y `setClerkRole` (único acceso a `clerkClient`); test extendido.
- `modules/users/types/admin-manage.ts`, `utils/admin-change.ts`, `schemas/admin-schema.ts` — resultado de administradores, reglas de alta/baja (`super_admin` protegido) y validación Zod.
- `modules/users/services/admin-service.ts` — `listAdmins`, `grantAdmin`, `revokeAdmin` (Clerk primero, espejo en `users.role` después).
- `modules/users/actions/admin-actions.ts` — Server Actions de alta y baja con `requireRole("super_admin")`.
- `modules/users/components/{admin-users-page,grant-admin-form,revoke-admin-button}.tsx` — pantalla de administradores, formulario de alta y baja con diálogo de confirmación.
- `modules/users/utils/notification-options.ts`, `schemas/notification-schema.ts`, `services/notification-preference-service.ts` — opciones y defaults, validación y upsert sobre `notification_preferences`.
- `modules/users/actions/notification-actions.ts` — `setNotificationPreferenceAction`; el dueño sale de la sesión, nunca del cliente.
- `modules/users/components/{notification-settings-page,notification-switches}.tsx` — pantalla de configuración con guardado inmediato por switch.
- `modules/users/index.ts` — exporta `AdminUsersPage` y `NotificationSettingsPage`.
- `app/(admin)/admin/administradores/page.tsx`, `app/(admin)/admin/configuracion/page.tsx` — rutas nuevas.
- `proxy.ts` — exige `super_admin` en las dos rutas, antes de la regla `/admin`.
- `modules/admin/components/admin-nav-links.ts`, `admin-shell.tsx` — links "Administradores" y "Configuración" solo para `super_admin`; test extendido.
- `docs/ARCHITECTURE.md` — §4 lista las rutas nuevas.
- `docs/specs/admin/admin-settings.md` — spec aprobada.

## Pendiente
- Sin probar en navegador: caso `PROTECTED` por UI, alta exitosa, baja confirmada y error simulado de un switch (cubiertos por tests unitarios).
- Los tests con base de datos no corren en CI sin `DATABASE_URL`; se corrieron una vez en local (16/16 en `admin-service`).
- `docs/ARCHITECTURE.md` §4 dice que solo `super_admin` aprueba operadores, pero 030 lo dejó para `admin`. No se tocó en esta tarea.
