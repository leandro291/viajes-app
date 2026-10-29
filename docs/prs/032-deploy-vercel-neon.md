# 032 — deploy-vercel-neon

- Spec: n.a.
- Rama: `032-deploy-vercel-neon`

## Qué se hizo
Script `vercel-build` que corre las migraciones de Drizzle antes del build en producción. Los previews solo hacen build, porque comparten base con producción.

## Cambios
- `package.json` — script `vercel-build` (`drizzle-kit migrate` solo si `VERCEL_ENV=production`, luego `next build`).
- `docs/SYSTEM-DESIGN.md` — nota de migraciones en §Entornos.

## Criterios de aceptación
- [x] Proyecto en Vercel con preview por PR y producción desde `main` (ya existía, verificado con la CLI)
- [ ] Env vars cargadas (faltan `NEXT_PUBLIC_APP_URL` y `STRIPE_WEBHOOK_SECRET`)
- [ ] Rama Neon por preview (hoy una sola base)
- [x] Migraciones en el deploy (solo producción)
- [ ] Webhooks de Clerk y Stripe a producción (Clerk por confirmar; Stripe en ticket 015)

## Cómo probar
1. Mergear a `main`: el deploy de producción debe mostrar `drizzle-kit migrate` en el log de build.
2. Abrir un PR: el preview debe hacer build sin migrar.

## Revisión
- Reviewer: n.a. (BUILD directo)
- lint ✓ · tsc ✓ · build (`VERCEL_ENV=preview npm run vercel-build`) ✓ · Playwright: no revisado, el cambio no toca UI
