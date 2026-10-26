# 018 — mi-cuenta

- Spec: n.a. (BUILD)
- Rama: `018-mi-cuenta`

## Qué se hizo
Página `/cuenta` con el `UserProfile` de Clerk (datos y seguridad) y una opción "Mi cuenta" en el menú del usuario del encabezado.

## Cambios
- `app/(customer)/cuenta/page.tsx` — `<UserProfile routing="hash" />` con la apariencia global de `ClerkProvider`.
- `components/shared/user-menu.tsx` — `UserButton` con el enlace "Mi cuenta" → `/cuenta` (client component).
- `components/shared/site-header.tsx` — usa `<UserMenu />`.
- `changelog/018-mi-cuenta.md`, `docs/prs/018-mi-cuenta.md`

## Decisiones
- `routing="hash"`: las pestañas internas (Perfil, Seguridad) no necesitan ruta catch-all.
- Sin diseño propio: el artefacto aprobado no tiene pantalla de Cuenta; se usa el componente de Clerk con el tema ya configurado.
- Fuera de alcance: `notification_preferences`. El ERM no da acceso al `customer` y la tarjeta solo pide `UserProfile`.
- Los cambios hechos en `UserProfile` llegan a la tabla `users` por el webhook de Clerk (006); no hay código de sincronización nuevo.

## Criterios de aceptación
- [x] Sin sesión, `/cuenta` redirige a `/sign-in` (Playwright)
- [x] Con sesión `customer`, `/cuenta` muestra `UserProfile` con Perfil y Seguridad (Playwright)
- [x] El menú del usuario muestra "Mi cuenta" y lleva a `/cuenta` (Playwright, desde `/ofertas`)
- [x] Vista móvil 390×844 sin desborde horizontal (Playwright)
- [ ] Editar datos en `/cuenta` y verlos reflejados en `users` (depende del webhook de Clerk; sin túnel público)

## Cómo probar
1. `npm run dev -- -p 3018`.
2. Sin sesión, abrir `/cuenta`: va a `/sign-in`.
3. Iniciar sesión, abrir el menú del usuario → "Mi cuenta": se ve el perfil con Perfil y Seguridad.
4. Repetir en un ancho de 390 px.

## Notas
- El menú conserva "Administrar cuenta" de Clerk (modal con lo mismo que `/cuenta`).
- Clerk avisa en consola que se usan claves de desarrollo; no es un error.

## Revisión
- Reviewer: n.a. (BUILD)
- lint ✓ · tsc ✓ · tests: n.a. (sin lógica de negocio) · Playwright: `/cuenta` sin y con sesión, escritorio y móvil

🤖 Generated with [Claude Code](https://claude.com/claude-code)
