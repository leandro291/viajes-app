# 012 — offers-newsletter

- Spec: `docs/specs/offers/offers-page.md`
- Rama: `012-offers-newsletter`

## Qué se hizo
Ruta pública `/ofertas` con hero de 4 ofertas destacadas (sobre el `HeroCarousel` compartido), tipos de oferta en la URL y grilla con el descuento calculado (porcentaje o 2x1), más el formulario de newsletter (Server Action + Zod). `calculateOffer` queda reutilizable para la tarjeta 013. Rama mergeada con `main` y adaptada al marco nuevo (`PageHero`, `SectionHeading`, tarjeta del tablero).

## Cambios
- `app/(public)/ofertas/page.tsx` — ruta delgada con `metadata.title = "Ofertas"`.
- `modules/offers/` — tipos, utils puros (`calculateOffer`, `describeOffer`, `parseOfferParams`) con tests, service `getActiveOffers` cacheado (+test db) y componentes (`offers-page`, `offer-hero`, `offer-card`, `offer-grid`, `offer-tabs`, `offers-skeleton`).
- `modules/newsletter/` — schema Zod, service `subscribeEmail` (upsert que reactiva bajas), Server Action, `NewsletterForm` y `NewsletterSignup`, con tests.
- `components/shared/hero-carousel.tsx` — props opcionales `labels` y `aside` por slide; Inicio y Paquetes sin cambio.
- Eliminados `OfferHeroCarousel` y `hooks/use-reduced-motion.ts` (se reutiliza el carrusel compartido).
- `lib/cache-tags.ts` — tag `offers`.
- `docs/specs/offers/offers-page.md`, `changelog/012-offers-newsletter.md`, `docs/prs/012-offers-newsletter.md` — spec (`done`), changelog y este PR.

## Criterios de aceptación
- [x] AC1: `tsc`, `lint`, `build` y `npm test` en verde; `/ofertas` sale como `◐ Partial Prerender` (1h / 1d).
- [x] AC2: `calculateOffer` coincide con `applyOffer` del seed (oráculo) en toda la matriz y lanza `RangeError` con entradas inválidas (test).
- [x] AC3: `describeOffer` reproduce las cifras del diseño (test).
- [x] AC4: `discountRank` y `compareOffers` ordenan 2x1 > 25 > 20, con desempate por vencimiento e `id` (test).
- [x] AC5: `formatValidUntil` usa hora de Lima: "30 de noviembre de 2026" (test).
- [x] AC6: `parseOfferParams` y `buildOffersHref` descartan lo inválido y no lanzan (test); `?tipo=xyz` muestra las 6 ofertas.
- [x] AC7: `getActiveOffers()` devuelve solo ofertas activas, vigentes y de paquetes `published` (test db; la página real muestra 6 de 8).
- [x] AC8: orden por `compareOffers` y forma de `OfferDto` (test db).
- [x] AC9: `getActiveOffers` llama a `cacheLife` y `cacheTag(offers, packages)` (test db; sin `DATABASE_URL` se omite).
- [x] AC10: `subscribeSchema` normaliza y valida el correo con mensajes en español (test).
- [x] AC11: `subscribeEmail` no duplica y reactiva bajas (test db y página real).
- [x] AC12: la Server Action valida, llama al service una vez y devuelve el estado esperado (test).
- [x] AC13: el hero (compartido) muestra 4 slides con badge, tipo, título, precios y nota/"Válido hasta" a 390 y 1280 px. Desvío: se toman las 4 mejores con portada.
- [ ] AC14: probado avance automático (consola limpia tras rotar); pausa, movimiento reducido, swipe y hover/foco vienen del compartido y no se reprobaron aquí. Sin flechas de teclado entre pestañas (solo Tab), por decisión.
- [x] AC15: tipos como links con `aria-current`; `?tipo=groups` da 2 ofertas, `?tipo=last_minute` da "1 oferta activa" y `?tipo=xyz` se ignora.
- [ ] AC16: 2 columnas a 390 px y 4 a 1280 px, sin scroll horizontal; tipos en riel de una fila en móvil. No se probó 1024 px.
- [ ] AC17: estados vacíos no probados en el navegador (el seed no tiene un tipo con 0 ofertas).
- [x] AC18: correo inválido conserva lo escrito con `aria-invalid`; correo nuevo, repetido y tras baja se comportan según spec; sin errores de consola. (Contraste medido del mensaje de error no verificado.)
- [ ] AC19: sin animaciones con movimiento reducido, un único `h1` y jerarquía `h1` > `h2` > `h3` verificados; contraste de texto sobre fotos no medido.
- [x] AC20: `"use client"` solo en el carrusel y el formulario del newsletter (revisión del reviewer).
- [x] AC21: título "Ofertas · Wayra".
- [x] AC22: eliminado (Enmienda 1): el hero del Inicio no se toca; `/` y `/paquetes` cargan sin errores de consola tras rotar.

## Cómo probar
1. `npm ci`, copiar `.env.local` (base sembrada con `npm run db:seed`) y `npm run dev -- -p 3012`.
2. Abrir `/ofertas`: hero con 4 ofertas, contador "6 ofertas" y grilla de 6 tarjetas.
3. Probar el carrusel: pausar, pestañas "Elegir oferta"; esperar a que rote y mirar la consola (sin errores).
4. Abrir `/ofertas?tipo=groups` (2 ofertas), `?tipo=last_minute` (1) y `?tipo=xyz` (6, tipo ignorado).
5. En el newsletter: `malo@` (error y valor conservado), un correo nuevo (mensaje de éxito y campo vacío) y el mismo otra vez (mismo mensaje, sin duplicado en `newsletter_subscribers`).
6. Repetir a 390 px (2 columnas, sin scroll horizontal) y revisar que Inicio (`/`) y Paquetes (`/paquetes`) no cambiaron.
7. `npm run test:db` para los tests de base.

## Revisión
- Reviewer: fase 1–4 APPROVED; fase 5 (adaptación) CHANGES_REQUESTED por la nota del hero sin vencimiento → corregido y verificado por mí en el navegador, sin nueva pasada del reviewer. Hallazgos menores (portada obligatoria, ACs de la spec) anotados en la spec.
- lint ✓ · tsc ✓ · tests 157 ✓ (35 de base omitidos sin `DATABASE_URL`; 36 de offers y newsletter corridos aparte con base, ✓) · build ✓ (`/ofertas` PPR)
- Playwright: `/ofertas` a 1280 y 390 px, `?tipo=last_minute`, `/paquetes`, `/`; newsletter con correo inválido. Pendiente: nuevo/repetido tras la adaptación, 768/1024 px, `?tipo=groups`/`xyz` tras el restyle.
- Decisión abierta Q3: el 2x1 rankea como 50 % y queda siempre primero en el hero.
