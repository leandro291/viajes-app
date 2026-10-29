# 046 — mobile-header-hero

- Spec: `docs/specs/shared/design-fidelity.md`
- Rama: `046-mobile-header-hero`

## Qué se hizo
Primera tanda de fidelidad móvil contra el artefacto: encabezado de una fila con menú y hero corto sin controles de carrusel. Escritorio no cambia.

## Cambios
- `components/shared/site-header.tsx` — fila móvil con "Ingresar" y menú.
- `components/shared/mobile-menu.tsx` — nuevo panel bajo el header con links, "Iniciar sesión" y "Registrarse".
- `components/shared/page-hero.tsx` — padding y espacio superior móviles.
- `components/shared/hero-carousel.tsx` — sin pausa ni flechas en móvil.
- `modules/packages/components/listing-hero.tsx` — eyebrow, h1 de 40 px y tarjeta destacada móvil (sin miniatura, "Desde", flecha en círculo).
- `modules/packages/components/tours-listing.tsx` (también agrega "sale hh:mm" al eyebrow), `packages-listing.tsx`, `modules/offers/components/offer-hero.tsx`, `modules/home/components/home-page.tsx` — alturas de hero.
- `docs/specs/shared/design-fidelity.md` — AC2 y AC4 móviles; aprobada por leandro291 (2026-10-29).

## Criterios de aceptación
- [x] 390 px: header de 72 px con logo, menú de 44 px y sin scroll horizontal (Tours, Paquetes, Inicio, Ofertas, Destino).
- [x] El menú abre un panel con Paquetes, Tours de un día y Ofertas (la sección actual en terracota) y, sin sesión, "Iniciar sesión" y "Registrarse"; cierra con Escape, al tocar fuera o al elegir un link.
- [x] Hero de 540 px en Paquetes y Tours, 660 en Inicio, 600 en Destino; sin pausa ni flechas.
- [x] Escritorio sin cambios (header y hero desde 768 px iguales).

## Cómo probar
1. `npm ci` y `npm run dev`.
2. A 390 px abrir `/`, `/paquetes`, `/tours`, `/ofertas`, `/destinos/cusco`: header en una fila, hero corto.
3. Tocar el botón de menú y elegir "Ofertas".
4. A 1280 px comprobar que nada cambió.

## Revisión
- Reviewer: n.a. (sin agente reviewer; revisado en navegador)
- lint ✓ · tsc ✓ · tests ✓ (1242) · Playwright: 5 rutas a 390 px y menú
