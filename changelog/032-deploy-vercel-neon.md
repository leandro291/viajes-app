# 032 — deploy-vercel-neon

- Fecha: 2026-10-28
- Spec: n.a.
- PR: `docs/prs/032-deploy-vercel-neon.md`

## Resumen
El proyecto ya estaba desplegado en Vercel. Se agrega el script `vercel-build`, que aplica las migraciones de Drizzle antes de `next build` solo en producción. Los previews no migran porque comparten la base con producción.

## Cambios
- `package.json` — script `vercel-build`: si `VERCEL_ENV=production` corre `drizzle-kit migrate`, luego `next build`.
- `docs/SYSTEM-DESIGN.md` — nota de migraciones en §Entornos.

## Pendiente
- Agregar `NEXT_PUBLIC_APP_URL` en Vercel (el código aún no la usa).
- Confirmar en Clerk que el webhook apunta a `https://viajes.leandrorojas.tech/api/webhooks/clerk`.
- `STRIPE_WEBHOOK_SECRET` y webhook de Stripe: ticket 015.
- Rama Neon por preview: activar "branch per preview" en la integración y quitar la condición de `VERCEL_ENV`.
