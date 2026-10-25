# 004 — clerk-auth

- Fecha: 2026-10-25
- Spec: n.a. (BUILD, instalación con el CLI de Clerk)
- PR: `docs/prs/004-clerk-auth.md`

## Resumen
Clerk instalado en la app: proveedor, `proxy.ts`, páginas de ingreso y registro, y controles de sesión en el encabezado. En español y con el tema shadcn de Clerk. Sin roles ni protección de rutas todavía.

## Cambios
- `proxy.ts` — `clerkMiddleware` (Next 16). Todas las rutas siguen públicas.
- `app/layout.tsx` — `ClerkProvider` con `esES`, tema shadcn y campos en blanco.
- `app/sign-in/`, `app/sign-up/` — páginas de Clerk.
- `components/shared/site-header.tsx` — Ingresar, Crear cuenta y `UserButton` dentro de `<Suspense>`.
- `app/globals.css` — CSS del tema shadcn de Clerk.
- `.env.example` — variables de Clerk (solo nombres).
- Dependencias: `@clerk/nextjs`, `@clerk/ui`, `@clerk/localizations`.

## Pendiente
- Spec de roles: `publicMetadata.role`, webhook `user.*` hacia `users`, guards `requireRole` y protección por grupo de rutas.
- Producción de Clerk sin configurar (solo instancia de desarrollo).
