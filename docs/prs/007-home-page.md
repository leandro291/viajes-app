# 007 — home-page

- Spec: `docs/specs/packages/home.md`
- Rama: `007-home-page`

## Qué se hizo
Pantalla Inicio (`/`) de Wayra con hero carrusel, buscador, paquetes más reservados con chips, bento de destinos y "Por qué Wayra". Primeros services de catálogo (solo `published`) cacheados con Cache Components (`cacheComponents: true`, `use cache` + `cacheTag`), reutilizables por 008 y 011.

## Cambios
- `next.config.ts` — `cacheComponents: true`.
- `app/(public)/page.tsx` — delgada, usa `HomePage`; se retira la muestra D4.
- `app/sign-in`, `app/sign-up` — `<SignIn/>` y `<SignUp/>` dentro de `<Suspense>` (lo exige `cacheComponents`).
- `lib/cache-tags.ts`, `lib/money.ts` — `CACHE_TAGS` y `formatPen`.
- `modules/packages` — `getFeaturedPackages` (más reservados), `getCategories`, `PackageCard`, utilidades.
- `modules/destinations` — `getDestinations` (con precio mínimo, solo con paquetes publicados).
- `modules/home` (nuevo, solo compone) — hero, buscador, rail, bento, franja de confianza, "Por qué Wayra", CTA de WhatsApp y créditos de fotos.
- `components/ui/native-select.tsx`, `app/globals.css` — select nativo (shadcn) y keyframe `wy-fill`.
- `vitest.config.ts`, `package.json`, `.env.example`, `docs/ARCHITECTURE.md` — alias `@`, script `test:db`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, fila `home`.
- `docs/specs/packages/home.md`, `changelog/007-home-page.md`, `docs/prs/007-home-page.md`.

## Decisiones
- Destacados = más reservados (reservas `confirmed`, desempate por `id`); alimenta también los 5 slides del hero.
- Texto veraz: "Paga con tarjeta" y "Voucher en la página de confirmación" (v1 sin Yape/Plin ni envío por correo/WhatsApp).
- Un solo botón terracota principal: hero y "Buscar" en `cta`; WhatsApp en `secondary`.
- Sin `NEXT_PUBLIC_WHATSAPP_NUMBER` la banda de WhatsApp no se muestra (AC16).
- En móvil el hero oculta las flechas (no caben con los puntos); desde `md` se muestran.

## Criterios de aceptación
- [x] AC1: `tsc`, `lint`, `npm test`, `test:db` (94/94) y `build` en verde
- [x] AC2: `cacheComponents: true` y build sin errores de ruta bloqueante (`/` en prerender parcial)
- [x] AC3–AC4: `formatPen`, `isDayTour` y `formatDuration`
- [x] AC5–AC7: services contra la base sembrada (solo publicados, orden por reservas, categorías y destinos)
- [x] AC8–AC10: tags/`cacheLife`, chips y URL de WhatsApp
- [x] AC11–AC15: hero, buscador GET a `/paquetes`, chips (incl. "Un día") y bento, vistos en 1280 y 390 px
- [x] AC16: "Por qué Wayra" y CTA (con un número de prueba el enlace abre `wa.me` en pestaña nueva; sin número no se muestra)
- [ ] AC17: sin scroll horizontal en 390 y 1280 px verificado; foco visible no probado
- [x] AC18–AC19: sin dependencias nuevas; sin imports de runtime de módulos en componentes cliente

## Cómo probar
1. `.env.local` con `DATABASE_URL` y `DATABASE_URL_UNPOOLED`; `npm run db:migrate && npm run db:seed`.
2. `npm run dev` y abrir `/`: cambiar de slide, filtrar con los chips y usar el buscador.
3. Opcional: `NEXT_PUBLIC_WHATSAPP_NUMBER=51987654321` para ver la banda de WhatsApp.
4. `npm test`, `npm run test:db` y `npm run build`.

## Revisión
- Reviewer: CHANGES_REQUESTED en la ronda 1 (T1–T11), corregido; sin segunda pasada del reviewer sobre las correcciones y T12 (`HomePage`) no pasó por el reviewer
- lint ✓ · tsc ✓ · Playwright: `/` en 1280 y 390 px (carrusel, chips, buscador, consola y red)

## Notas
- `DATABASE_URL` pasa a ser obligatoria también en `npm run build`.
- `/paquetes`, `/paquetes/[slug]` y `/destinos/[slug]` dan 404 hasta sus tarjetas.
- Sin secretos en el diff.
