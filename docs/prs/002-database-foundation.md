# 002 — database-foundation

- Spec: `docs/specs/shared/database-foundation.md`
- Rama: `002-database-foundation`

## Qué se hizo
Schema Drizzle de todo el modelo (`docs/ERM.md`) sobre Neon, migración inicial y seed idempotente con los datos del artefacto (20 paquetes/tours, 52 salidas, 8 reservas con pagos en USD). Sin UI.

## Cambios
- `lib/db/` — schema, cliente, migración `0000_init`, seed y tests
- `public/seed/` — fotos del artefacto
- `drizzle.config.ts`, `vitest.config.ts`, `.env.example`, `package.json`
- `docs/specs/shared/` — spec y anexo de datos
- `changelog/002-database-foundation.md`, `docs/prs/002-database-foundation.md`

## Criterios de aceptación
- [x] AC1–AC4, AC8–AC11, AC15: schema, migración sin diff, helpers y datos (55 tests)
- [x] AC14 (guard de producción) comprobado sin conectar a ninguna base
- [ ] AC5–AC7, AC12–AC13: migrar y sembrar dos veces en Neon (requiere credenciales del dueño)

## Cómo probar
1. Crear proyecto Neon, poner `DATABASE_URL` y `DATABASE_URL_UNPOOLED` en `.env.local`.
2. `npm run db:migrate && npm run db:seed && npm run db:seed` (conteos iguales en ambas).
3. `npm test`

## Notas
- El lockfile subió dependencias transitivas (nanoid, postcss, source-map-js).
- npm no aprobó scripts de esbuild ni unrs-resolver; `npm audit` reporta 14 vulns sin tocar.

## Revisión
- Reviewer: APPROVED en las 4 fases (solo hallazgos menores)
- lint ✓ · tsc ✓ · tests ✓ (55) · Playwright n.a. (sin UI)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
