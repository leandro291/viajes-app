# 004 — clerk-auth

- Spec: n.a. (BUILD, instalación con el CLI de Clerk)
- Rama: `004-clerk-auth`

## Qué se hizo
`clerk init` sobre el app `viajes-app` del Dashboard, más los controles de sesión en el encabezado, el tema shadcn de Clerk y la localización en español.

## Cambios
- `proxy.ts`, `app/layout.tsx`, `app/sign-in/`, `app/sign-up/`
- `components/shared/site-header.tsx`, `app/globals.css`, `.env.example`
- `package.json` y lockfile (`@clerk/nextjs`, `@clerk/ui`, `@clerk/localizations`)
- `changelog/004-clerk-auth.md`, `docs/prs/004-clerk-auth.md`

## Decisiones
- Campos de Clerk en blanco (`colorInput`): el tema shadcn usaba `--input` como fondo y daba beige oscuro.
- Todas las rutas siguen públicas; la protección llega con la spec de roles.

## Criterios de aceptación
- [x] `clerk doctor`: app vinculado y claves de desarrollo presentes
- [x] `/`, `/sign-in` y `/sign-up` responden 200; el formulario se renderiza en español
- [x] Encabezado con Ingresar y Crear cuenta (44 px de alto)
- [ ] Registro de un usuario real y `UserButton` (lo prueba el dueño en `/sign-up`)

## Cómo probar
1. Copiar `.env.example` a `.env.local` con las claves del Dashboard (no se versionan).
2. `npm run build && npm start`; abrir `/sign-up`, registrarse y ver el `UserButton`.

## Notas
- Sin secretos en el diff; `.env` está ignorado por git.
- npm no aprobó scripts de instalación (`allow-scripts`) y `npm audit` reporta vulnerabilidades preexistentes; sin tocar.

## Revisión
- Reviewer: n.a. (BUILD)
- lint ✓ · tsc ✓ · build ✓ · tests ✓ (55) · Playwright ✓ (ingreso y encabezado)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
