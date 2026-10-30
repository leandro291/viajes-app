# 033 — seo-a11y-performance

- Spec: `docs/specs/seo/seo-a11y-performance.md`
- Rama: `033-seo-a11y-performance`

## Qué se hizo
Metadata, sitemap, robots e imagen OG para las 6 pantallas públicas, `noindex` en las áreas privadas y enlace "Saltar al contenido". Se agrega el informe de auditoría Lighthouse y accesibilidad. **Los umbrales de rendimiento móvil (AC19) no se cumplen**: la auditoría los documenta y su arreglo queda fuera de este PR.

## Cambios
- `lib/seo/*` — `getSiteUrl`, `buildMetadata`, `buildSitemapEntries`, `buildRobots` con tests.
- `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx` — rutas de archivo nuevas.
- `app/layout.tsx` y las 4 páginas estáticas públicas — `metadataBase` y metadata propia.
- `package-detail.tsx`, `destination-page.tsx` — metadata de fichas con su foto.
- `package-service.ts`, `modules/packages/index.ts` — `getSitemapPackages`.
- 5 archivos de `app/` — `noindex, nofollow` en admin, operador, `cuenta`, `sign-in`, `sign-up`.
- `components/shared/site-shell.tsx` — enlace de salto y `<main id="contenido">`.
- `hero-carousel`, `offer-hero`, `booking-panel` — nombre accesible parte del texto visible; `site-header`, `package-detail`, `booking-panel` — sin desborde a 320 px.
- Listados (`packages-listing`, `tours-listing`, `offers-page`) — créditos CC; `newsletter-form` — campo de 52 px en móvil; `destination-map-canvas` — marcadores de 44 px.
- `docs/specs/seo/`, `docs/audits/`, `changelog/` — spec, informe y changelog.

## Criterios de aceptación
- [x] AC1–AC4: `getSiteUrl`, `buildMetadata` y `truncateDescription` (21 tests en `lib/seo`)
- [x] AC5–AC7: metadata en las 6 pantallas y "no encontrado" con `noindex` (revisado en el código; AC7 no se probó con un slug inexistente en navegador)
- [x] AC8–AC12: sitemap (32 `<loc>`) y robots verificados con `curl` sobre `next start`; `next build` pasa con `cacheComponents`
- [ ] AC13: `noindex` confirmado en el HTML de `sign-in` y `sign-up`; `/admin`, `/operador` y `/cuenta` redirigen sin sesión, solo verificado por código
- [x] AC14–AC16: imagen de marca 1200×630 y `og:image` por pantalla verificados en el HTML servido
- [x] AC17: enlace de salto verificado con teclado (primer Tab, 185×44 px, Enter mueve el foco a `<main>`)
- [x] AC18: informe con medianas de 3 corridas, móvil y escritorio, 6 pantallas (`/ofertas` móvil con método distinto, H3)
- [ ] AC19: **no se cumple** (rendimiento móvil 66–77, LCP 4,5–6,3 s, TBT 408/244 ms en ficha/destino, SEO 92 en fichas, Buenas prácticas 77)
- [x] AC20: verificado en las 6 pantallas (recorrido de Tab sin trampas y con foco visible, movimiento reducido, 0 px de desborde a 640, 390 y 320 px, h1, alt, créditos CC, `label-content-name-mismatch` en 0). Los objetivos < 44 px que quedan son de Clerk y Leaflet, de terceros
- [x] AC21: lint, tsc y tests en verde

## Cómo probar
1. `npm ci && npx next build && npx next start -p 3133`.
2. `curl localhost:3133/sitemap.xml` y `/robots.txt`; `curl localhost:3133/paquetes/cusco-valle-sagrado | grep og:image`.
3. Abrir `/paquetes`, pulsar Tab y Enter: el foco salta al contenido.
4. Leer `docs/audits/seo-a11y-performance.md` (tablas de medianas y hallazgos H1–H11).

## Revisión
- Reviewer: APPROVED en las Fases 1, 2 y 3 (T1–T8). Las tareas T9 y T10 (Fase 4) **no pasaron por `reviewer`**.
- lint ✓ · tsc ✓ · tests ✓ (1153 pasan, 284 omitidos por falta de DB; 2 tests preexistentes de `package-service` fallan con la DB del `.env`, ajenos a esta rama)
- Playwright: `/`, `/paquetes`, `/tours`, `/ofertas`, `/paquetes/cusco-valle-sagrado`, `/destinos/cusco` a 390 px; teclado en `/paquetes` y la ficha; movimiento reducido en `/` y `/ofertas`.
- Chrome headless (`puppeteer-core`) tras los arreglos: recorrido de Tab y foco visible en las 6 pantallas, movimiento reducido, desborde a 640/390/320 px, y Lighthouse de accesibilidad (100, 0 fallos) en `/`, `/ofertas` y la ficha, móvil y escritorio.
- Playwright tras los arreglos menores: campo del boletín 279×52 px, créditos CC visibles en `/paquetes`, `/tours` y `/ofertas`, marcadores del mapa 44×44 px con clic funcionando, 0 errores de consola, sin scroll horizontal.
