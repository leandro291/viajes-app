# 046 — mobile-header-hero

- Fecha: 2026-10-29
- Spec: `docs/specs/shared/design-fidelity.md`
- PR: `docs/prs/046-mobile-header-hero.md`

## Resumen
Tanda 1 de la fidelidad móvil. El encabezado a menos de 768 px pasa a una fila de 72 px (logo, "Ingresar" y botón de menú con panel). El hero móvil es más corto, sin controles de pausa ni flechas y con eyebrow en Paquetes y Tours.

## Cambios
- `components/shared/site-header.tsx` — fila móvil con "Ingresar" y menú; nav y botones de escritorio desde md.
- `components/shared/mobile-menu.tsx` — nuevo: panel bajo el header con links, "Iniciar sesión" y "Registrarse".
- `components/shared/page-hero.tsx` — padding lateral 20 px y espacio superior 88 px en móvil.
- `components/shared/hero-carousel.tsx` — sin pausa ni flechas ni alto mínimo del slide en móvil.
- `modules/packages/components/listing-hero.tsx` — eyebrow, h1 de 40 px y tarjeta destacada móvil (sin miniatura, "Desde", flecha en círculo).
- `modules/packages/components/tours-listing.tsx` (también agrega "sale hh:mm" al eyebrow), `packages-listing.tsx`, `modules/offers/components/offer-hero.tsx`, `modules/home/components/home-page.tsx` — alturas de hero móvil.
- `docs/specs/shared/design-fidelity.md` — AC2 y AC4 con el diseño móvil.

## Pendiente
- Tamaño del h1 móvil de Inicio (48 px, diseño 52), Destino (64, diseño 84) y Ofertas; va con la tanda de cada pantalla.
- Filtros y tarjetas (tanda 2), detalle (3), Inicio/Ofertas/Destino (4), Pago/Confirmación (5).
