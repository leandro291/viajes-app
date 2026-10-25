# 036 — design-frame

- Spec: `docs/specs/shared/design-fidelity.md` (T0)
- Rama: `036-design-frame`

## Qué se hizo
Tarea T0 de la spec de fidelidad: el marco compartido (header superpuesto, nav, pie, `PageHero`, textos de sesión y `PackageCard` con variantes). Es la base para T0b, T1, T2 y T3.

## Cambios
- `components/shared/site-header.tsx`, `site-nav.tsx` (nuevo), `site-footer.tsx`, `page-hero.tsx` (nuevo)
- `app/(public)/layout.tsx`, `app/layout.tsx`, `app/globals.css`
- `modules/packages/components/package-card.tsx`
- `components/shared/wayra-logo.tsx` (Owns ampliado en la spec, aprobado por el usuario)
- `docs/DESIGN-SYSTEM.md`
- `changelog/036-design-frame.md`, `docs/prs/036-design-frame.md`

## Criterios de aceptación
- [x] Textos "Iniciar sesión" y "Registrarse" en el header y en la localización de Clerk (visto en `/paquetes`)
- [x] Nav con enlace activo subrayado en `/paquetes` (visto a 1280 y 390 px)
- [x] Pie de tres bloques (visto a 1280 px)
- [x] `PackageCard` en variante `grid`: foto 4:5, chips de tipo y duración, título y precio (visto a 1280 y 390 px)
- [x] Controles del header sin saltos de línea a 390 px (se corrigió con `whitespace-nowrap`)
- [ ] Header superpuesto sobre un hero: sin verificar, ninguna pantalla usa `PageHero` todavía
- [ ] Logo de 34 px/28 px en el header y 32 px en el pie: aplicado en código, sin medir en pantalla
- [ ] Medidas finas, foco y contraste: sin medir

## Cómo probar
1. `npm run dev` y abrir `/paquetes` a 1280 y a 390 px.
2. Revisar header, enlace activo "Paquetes", tarjetas y pie.

## Notas
- Desvíos del agente: gradiente `.62` del tablero en lugar del `.55` de AC4; export extra `SiteNavPlain` como fallback de `Suspense`.
- `/paquetes/no-existe-xyz` muestra el 404 por defecto de Next (ya era así antes de esta tarea).

## Revisión
- Reviewer: n.a. (no se corrió el agente `reviewer`)
- lint ✓ · tsc ✓ · tests ✓ (128) · Playwright: `/paquetes` (1280 y 390) y 404 a 390 px

🤖 Generated with [Claude Code](https://claude.com/claude-code)
