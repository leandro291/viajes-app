# 037 — hero-carousel

- Fecha: 2026-10-25
- Spec: `docs/specs/shared/design-fidelity.md` (tarea T0b)
- PR: `docs/prs/037-hero-carousel.md`

## Resumen
`HeroCarousel` compartido sobre `PageHero`: slides con fondo en crossfade, pestañas con barra de progreso, pausa, anterior y siguiente, tarjeta "Siguiente" y swipe. Aún no lo usa ninguna pantalla; T1 (Inicio) y T2 (Paquetes) lo adoptan.

## Cambios
- `components/shared/hero-carousel.tsx` — nuevo componente cliente genérico (`slides`, `label`, `showNext`, `intervalMs`, `className`, `contentClassName`, `children`).

## Pendiente
- T1 migra el hero del Inicio a este componente y borra `modules/home/components/hero-carousel.tsx`; T2 lo usa en Paquetes.
- Pestañas sin navegación con flechas (todas tabulables): se suma si se pide.
- `wy-fill` anima `width` (no `scaleX` como el tablero).
