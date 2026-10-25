# 038 — home-fidelity

- Fecha: 2026-10-25
- Spec: `docs/specs/shared/design-fidelity.md` (tarea T1)
- PR: `docs/prs/038-home-fidelity.md`

## Resumen
El Inicio se acerca al tablero: hero a todo el ancho con el header encima y el carrusel compartido, buscador de 4 campos que se monta sobre el hero, franja de ✓, rail de paquetes con tarjetas 4:5, bento de destinos con flechas, collage en "Por qué Wayra" y botón de WhatsApp en terracota. Sin cambios de datos, services ni rutas.

## Cambios
- `modules/home/components/home-page.tsx` — hero con `HeroCarousel` compartido (h1 real por slide) y orden de secciones.
- `modules/home/components/hero-carousel.tsx` — eliminado; lo reemplaza `components/shared/hero-carousel.tsx`.
- `modules/home/components/search-form.tsx` — destino, fecha, viajeros y Buscar sobre el hero (Fecha y Viajeros se envían por GET; `/paquetes` los ignora por ahora).
- `modules/home/components/trust-strip.tsx` — franja de 4 ✓ (sin Yape ni Plin).
- `modules/home/components/package-rail.tsx` — `SectionHeading`, chips, scroll-snap y `PackageCard` variante rail.
- `modules/home/components/destination-bento.tsx` — bento de 4 columnas con círculo de flecha; enlaces a `/paquetes?destino=<slug>`.
- `modules/home/components/why-wayra.tsx` — collage de 2 fotos y 4 beneficios.
- `modules/home/components/whatsapp-cta.tsx` — tarjeta sobre foto y botón en terracota; conserva su enlace.
- `modules/home/components/photo-credits.tsx` — contenedor de 1240 px.

## Pendiente
- Cuando exista la ruta de Destino (tarjeta 011), los enlaces del bento vuelven a `/destinos/<slug>`.
- Fecha y Viajeros no filtran (spec aparte).
- Sin destacados con portada el hero cae a un `PageHero` estático: no está en la spec, se puede quitar.
- Colores literales del tablero sin token (`#2E4A48`, `#1B2A27`).
