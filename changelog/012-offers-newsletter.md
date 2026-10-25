# 012 — offers-newsletter

- Fecha: 2026-10-25
- Spec: `docs/specs/offers/offers-page.md`
- PR: `docs/prs/012-offers-newsletter.md`

## Resumen
Ruta pública `/ofertas` con un hero de 4 ofertas destacadas (el `HeroCarousel` compartido: pausa, hover/foco y swipe), tipos de oferta por URL (`?tipo=`) y grilla de tarjetas con el descuento calculado (porcentaje o 2x1). Incluye el formulario de newsletter (Server Action + Zod) que guarda en `newsletter_subscribers`. La función `calculateOffer` queda lista para la tarjeta 013 (Stripe). Tras entrar 009 y 034–040 a `main`, la rama se mergeó con `main` y la página se adaptó al marco nuevo (`PageHero`, `SectionHeading`, tarjeta y tipos del tablero).

## Cambios
- `app/(public)/ofertas/page.tsx` — ruta delgada con `metadata.title = "Ofertas"`; compone `OffersPage` y `NewsletterSignup`.
- `modules/offers/utils/` — `offer-pricing.ts` (`calculateOffer`, `discountRank`, `compareOffers`), `offer-view.ts` (`describeOffer`, `formatValidUntil` en hora de Lima) y `offer-params.ts` (`?tipo=`), con tests.
- `modules/offers/services/offer-service.ts` (+test) — `getActiveOffers()` cacheado (`use cache`, `cacheLife("hours")`, tags `offers` y `packages`).
- `modules/offers/components/` — `offers-page`, `offer-hero` (sobre `HeroCarousel`/`PageHero`; sin ofertas, `PageHero` con h1 "Ofertas"), `offer-card`, `offer-grid`, `offer-tabs` (riel con scroll en móvil), `offers-skeleton`.
- `components/shared/hero-carousel.tsx` — props opcionales `labels` y `aside` por slide (Inicio y Paquetes sin cambio); `aside` con `key` propia.
- `modules/offers/types/offer.ts`, `modules/offers/index.ts` — tipos y API pública (incluye `calculateOffer` para 013).
- `modules/newsletter/` — `subscribeSchema`, `subscribeEmail` (upsert que reactiva bajas), Server Action `subscribeToNewsletter`, `NewsletterForm` (cliente) y `NewsletterSignup`, con tests.
- Eliminados `OfferHeroCarousel` y `hooks/use-reduced-motion.ts` (sin consumidores: se reutiliza el carrusel compartido); el hero del Inicio no se toca.
- `lib/cache-tags.ts` — agrega el tag `offers` (resuelto el conflicto con `main`).
- `docs/specs/offers/offers-page.md`, `changelog/012-offers-newsletter.md`, `docs/prs/012-offers-newsletter.md` — spec (`done`), changelog y PR.

## Pendiente
- Las tarjetas y el CTA "Aprovechar oferta" llevan a `/paquetes/[slug]` (tarjeta 009): 404 hasta entonces.
- Sin verificar en navegador: estados vacíos de `/ofertas` (AC17, el seed no tiene un tipo con 0 ofertas), swipe táctil, pausa por hover/foco, anchos intermedios (~768 y 1024 px), contraste medido del texto sobre fotos y del mensaje de error del newsletter, y el newsletter con correo nuevo/repetido tras la adaptación (el formulario no cambió; solo se reprobó el correo inválido).
- El carrusel compartido no tiene flechas de teclado entre pestañas (solo Tab): AC14 reducido por decisión (Enmienda 1).
- El LCP del hero (`/seed/bal.jpg`) sigue avisando en consola; es del carrusel compartido y también aplica a Inicio/Paquetes.
- AC9 está marcado `(auto)` en la spec, pero su test vive en el archivo de base de datos y solo corre con `DATABASE_URL` (`npm run test:db`).
- `SubscribeState.email` sigue en el tipo y en la action pero el formulario ya no lo usa (ahora es un input controlado).
- Newsletter v1 sin rate limit, CAPTCHA ni doble opt-in, y sin enlace de baja. Antes del primer envío real hay que resolver confirmación por correo, baja y consentimiento (Ley 29733).
- Techos conocidos (marcados `ponytail` en la spec): 2x1 con `min_people` mayor que 2, ofertas repetidas sobre el mismo paquete sin deduplicar, sin paginación (unas 60 ofertas).
- Una oferta vencida puede verse hasta 1 h por la caché; no hay invalidación hasta que existan las specs de CRUD (`updateTag` sobre `offers`).
- Decisión abierta Q3: el 2x1 rankea como 50 % y queda siempre primero en el hero.
