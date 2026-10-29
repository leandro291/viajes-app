# 031 — admin-settings

- Spec: `docs/specs/admin/admin-settings.md`
- Rama: `031-admin-settings`

## Qué se hizo
Solo `super_admin` da de alta y de baja administradores (rol en Clerk, reflejado en `users.role`) en `/admin/administradores` y guarda sus preferencias de notificación en `/admin/configuracion`. La v1 solo guarda: no envía correos ni mensajes. Sin migración.

## Cambios
- `lib/auth/clerk-role.ts` — buscar usuario por correo, leer y fijar rol en Clerk.
- `modules/users/{types,utils,schemas,services,actions}` — lógica de administradores y de preferencias, con tests.
- `modules/users/components/*` — pantallas, formulario de alta, baja con confirmación y switches.
- `app/(admin)/admin/administradores`, `app/(admin)/admin/configuracion` — rutas nuevas.
- `proxy.ts` — `super_admin` obligatorio en las dos rutas.
- `modules/admin/components/admin-nav-links.ts`, `admin-shell.tsx` — links solo para `super_admin`.
- `docs/ARCHITECTURE.md`, `docs/specs/admin/admin-settings.md` — rutas y spec.

## Criterios de aceptación
- [x] AC1: lista de administradores con `super_admin` primero; "Quitar acceso" solo en `admin`.
- [ ] AC2: formulario de alta; probado el correo inexistente, no el alta exitosa.
- [x] AC3: correo sin cuenta devuelve `EMAIL_NOT_FOUND` y no escribe.
- [ ] AC4–AC7: reglas de alta/baja, `PROTECTED` y `CLERK_FAILED`; solo por tests unitarios, no en navegador.
- [x] AC8: actions con `requireRole("super_admin")`, Zod y `UNKNOWN` con log fijo (tests).
- [x] AC9: sin ser `super_admin` las rutas redirigen a `/`; links solo para `super_admin`.
- [x] AC10: tres switches con defaults, persistencia al recargar y aviso de que solo se guardan.
- [x] AC11: guarda al instante con "Guardado"; no se probó el error simulado.
- [x] AC12: dueño desde la sesión, `INVALID_INPUT`/`NOT_FOUND`/`UNKNOWN` (tests).
- [x] AC13: 390 px sin scroll horizontal, botones con nombre accesible.
- [x] AC14: `tsc`, lint, tests y build en verde.

## Cómo probar
1. Con un usuario `super_admin`, abrir `/admin/administradores`: ver la lista y probar un correo sin cuenta.
2. Abrir `/admin/configuracion`, activar "Resumen semanal", recargar y comprobar que persiste.
3. Con un `admin`, pedir ambas rutas: redirige a `/` y no aparecen los links.
4. Sin sesión, pedir ambas rutas: redirige a `/`.

## Revisión
- Reviewer: APPROVED (primera ronda, todas las fases)
- lint ✓ · tsc ✓ · tests ✓ (1242 pasan, 299 saltados sin `DATABASE_URL`) · build ✓
- Playwright: `/admin/administradores`, `/admin/configuracion` (escritorio y 390 px), diálogo de baja; sin probar `PROTECTED` por UI, alta exitosa ni baja confirmada.
