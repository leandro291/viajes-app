# 002 — database-foundation

- Fecha: 2026-10-24
- Spec: `docs/specs/shared/database-foundation.md`
- PR: `docs/prs/002-database-foundation.md`

## Resumen
Base de datos de Wayra: schema Drizzle sobre Neon (21 tablas, 14 enums, secuencia de códigos `WY-####`), migración inicial y seed idempotente con los datos del artefacto (fotos incluidas en `public/seed/`).

## Cambios
- `lib/db/schema/*` — schema completo según `docs/ERM.md`, con checks y únicos parciales.
- `lib/db/index.ts` — cliente `neon-serverless` (Pool) con `casing: "snake_case"`.
- `lib/db/migrations/0000_init.sql` — migración inicial generada por drizzle-kit.
- `lib/db/seed/*` — helpers (ids uuid v5 deterministas, ofertas, conversión a USD), datos y runner en una transacción con `onConflictDoNothing`; se niega a correr con `NODE_ENV`/`VERCEL_ENV` = production.
- `public/seed/*.jpg` — 18 fotos del artefacto (Wikimedia, licencias CC).
- `drizzle.config.ts`, `vitest.config.ts`, `.env.example`, scripts `db:generate`, `db:migrate`, `db:seed`, `test`.
- Dependencias: drizzle-orm, @neondatabase/serverless, drizzle-kit, tsx, vitest 5.

## Pendiente
- Verificar contra Neon real (migrar y sembrar dos veces); requiere `DATABASE_URL` y `DATABASE_URL_UNPOOLED` en `.env.local`.
- Mostrar el crédito CC de `package_images.credit` en la UI.
- Warning de Vite por `vitest.config.ts` (ESM en repo CJS); sin efecto.
- `npm audit` reporta 14 vulnerabilidades, sin tocar; npm no aprobó scripts de esbuild ni unrs-resolver.
