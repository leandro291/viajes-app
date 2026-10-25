# 003 — design-foundation

- Spec: `docs/specs/shared/design-foundation.md`
- Rama: `003-design-foundation`

## Qué se hizo
Tokens de `docs/DESIGN-SYSTEM.md` en `globals.css`, fuentes, `SiteHeader`/`SiteFooter`, route groups por rol y componentes base (CTA, badge de estado, switch, campo). Sin pantallas de negocio.

## Cambios
- `app/globals.css`, `app/layout.tsx`, `app/(public|customer|organizer|admin)/`
- `components/shared/`, `components/ui/`
- `docs/DESIGN-SYSTEM.md` (foco D6), `docs/specs/shared/design-foundation.md`
- `changelog/003-design-foundation.md`, `docs/prs/003-design-foundation.md`

## Decisiones
- Foco: anillo terracota sobre fondo claro y `#F59E6B` solo sobre `bg-dark`. El color del diseño da ~2:1 sobre claro (WCAG pide 3:1).
- `accent` es el terracota de Wayra; se elimina el tema oscuro.
- Sin dependencias nuevas.

## Criterios de aceptación
- [x] AC1, AC2, AC13, AC14: tsc, lint, build, tests (55) y estructura de rutas
- [x] AC3–AC12: verificados con Playwright a 1280 y 390 px (fuentes, CTA, badges, switch, input, header/footer, foco, movimiento reducido, sin scroll horizontal)
- [ ] Comparación visual contra el artefacto de diseño

## Cómo probar
1. `npm run build && npm start`, abrir `/` en 390 y 1280 px.
2. Tab por la página: el anillo de foco debe verse siempre.

## Notas
- Los 3 errores de consola son prefetch a `/paquetes`, `/tours`, `/ofertas` (404 esperado hasta sus specs).
- Chromium redondea `1.5px` a `0.8px` en este entorno; el CSS es correcto.

## Revisión
- Reviewer: APPROVED en las 3 fases (solo hallazgos menores)
- lint ✓ · tsc ✓ · tests ✓ (55) · Playwright ✓

🤖 Generated with [Claude Code](https://claude.com/claude-code)
