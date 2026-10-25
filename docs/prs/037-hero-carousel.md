# 037 — hero-carousel

- Spec: `docs/specs/shared/design-fidelity.md` (T0b)
- Rama: `037-hero-carousel`

## Qué se hizo
Se extrae el carrusel del hero a un componente compartido y genérico, reutilizable por Inicio y Paquetes.

## Cambios
- `components/shared/hero-carousel.tsx` — nuevo
- `changelog/037-hero-carousel.md`, `docs/prs/037-hero-carousel.md`

## Criterios de aceptación
- [x] Header superpuesto sobre el hero a 1280 px (visto con una página temporal, ya borrada)
- [x] Pestañas con barra, tarjeta "Siguiente" y controles de pausa, anterior y siguiente (1280 px)
- [x] A 390 px las pestañas ocupan una fila y los controles otra; el clic en "siguiente" cambia de slide
- [x] No importa nada de `@/modules/*`
- [ ] Autoavance, pausa por hover/foco, `prefers-reduced-motion` y swipe: sin probar en navegador
- [ ] Medidas, foco y contraste: sin medir

## Cómo probar
1. Montar `<HeroCarousel>` en una ruta temporal con 5 slides y abrirla a 1280 y 390 px.
2. Pulsar siguiente, anterior y pausa.

## Notas
- Sin tests: no hay lógica pura extraída (spec no los pide).
- Pestañas sin navegación con flechas, recorte frente al patrón completo de WAI-ARIA.

## Revisión
- Reviewer: n.a. (no se corrió el agente `reviewer`)
- lint ✓ · tsc ✓ · tests ✓ (128) · Playwright: página temporal a 1280 y 390 px

🤖 Generated with [Claude Code](https://claude.com/claude-code)
