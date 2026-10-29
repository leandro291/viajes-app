# 033 — seo-a11y-performance

- Fecha: 2026-10-29
- Spec: `docs/specs/seo/seo-a11y-performance.md`
- PR: `docs/prs/033-seo-a11y-performance.md`

## Resumen
Metadata, sitemap, robots e imagen OG para las 6 pantallas públicas, `noindex` en las áreas privadas y un enlace "Saltar al contenido". Incluye el informe de auditoría Lighthouse y accesibilidad (`docs/audits/seo-a11y-performance.md`). La auditoría encontró que el rendimiento móvil no llega a los umbrales de AC19; esos arreglos quedan fuera de este PR.

## Cambios
- `lib/seo/site-url.ts`, `lib/seo/metadata.ts` (+ tests) — `getSiteUrl` (nunca lanza) y `buildMetadata`/`truncateDescription`, con respaldo a la imagen de marca.
- `lib/seo/sitemap.ts`, `lib/seo/robots.ts` (+ tests) — constructores puros; `Disallow: /` en previews de Vercel.
- `app/sitemap.ts`, `app/robots.ts` — rutas que componen servicios y constructores.
- `app/opengraph-image.tsx` — imagen de marca 1200×630 con `next/og`, sin fuentes ni dependencias.
- `app/layout.tsx` — `metadataBase`.
- `app/(public)/page.tsx`, `paquetes/page.tsx`, `tours/page.tsx`, `ofertas/page.tsx` — metadata con `buildMetadata`.
- `modules/packages/components/package-detail.tsx`, `modules/destinations/components/destination-page.tsx` — metadata de fichas con foto como imagen; "no encontrado" con `noindex`; `tagline || description`.
- `modules/packages/services/package-service.ts` (+ test), `modules/packages/index.ts` — `getSitemapPackages` (cacheado, solo publicados).
- `app/(admin)/layout.tsx`, `app/(organizer)/layout.tsx`, `app/(customer)/cuenta/page.tsx`, `app/sign-in/…/page.tsx`, `app/sign-up/…/page.tsx` — `noindex, nofollow`.
- `components/shared/site-shell.tsx` — enlace "Saltar al contenido" y `<main id="contenido">`.
- `modules/packages/components/packages-listing.tsx`, `tours-listing.tsx`, `modules/offers/components/offers-page.tsx` — `PhotoCredits` (créditos CC) en los tres listados (H8).
- `modules/newsletter/components/newsletter-form.tsx` — `sm:flex-1`: en móvil el campo de correo medía 30 px en vez de 52 (H11).
- `modules/destinations/components/destination-map-canvas.tsx` — marcadores con área táctil de 44 px, círculo visible de 32 px (H6).
- `docs/specs/seo/seo-a11y-performance.md`, `docs/audits/seo-a11y-performance.md` — spec aprobada e informe de auditoría.

## Pendiente
- AC19 sin cumplir: rendimiento móvil 66–77 (umbral 80) y LCP 4,5–6,3 s (umbral 2,5 s) en las 6 pantallas (H1); TBT 408 ms en la ficha y 244 ms en destino (H2).
- SEO 92 en `/paquetes/[slug]` y `/destinos/[slug]`: Next 16 inserta la `meta description` en `<body>` por el streaming (H5).
- Buenas prácticas 77 por cookies del Clerk de desarrollo (H4): pendiente aprobar como excepción de terceros y confirmar con claves de producción.
- `/ofertas` en móvil no se pudo medir con la configuración por defecto (H3).
- `label-content-name-mismatch` (H7, peso 0 en el puntaje): el `aria-label` no empieza por el texto visible en el carrusel de Inicio, las pestañas de `/ofertas` y los enlaces de fecha de la ficha.
- AC20 incompleto: sin revisar el orden completo de foco y las trampas de teclado, el zoom 200 % real, ni el movimiento reducido y el foco en 4 y 5 pantallas respectivamente. Los controles de Leaflet y el botón de usuario de Clerk (< 44 px) son de terceros.
- Dos tests de `package-service` (AC5, AC6) fallan contra la DB del `.env` por datos del seed; ajenos a esta rama.
- JSON-LD fuera de alcance (tarjeta aparte).
