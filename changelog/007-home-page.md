# 007 — home-page

- Fecha: 2026-10-25
- Spec: `docs/specs/packages/home.md`
- PR: `docs/prs/007-home-page.md`

## Resumen
Pantalla Inicio (`/`) de Wayra: hero carrusel (flechas solo desde `md`; en móvil se navega con los puntos), buscador, paquetes más reservados con chips de categoría, bento de destinos, "Por qué Wayra" y CTA de WhatsApp (oculto mientras no exista `NEXT_PUBLIC_WHATSAPP_NUMBER`). Primeros services de catálogo (solo `published`) cacheados con Cache Components de Next 16 (`cacheComponents: true`, `use cache` + `cacheTag`).

## Cambios
- `next.config.ts` — `cacheComponents: true`.
- `app/sign-in`, `app/sign-up` — `<SignIn/>` / `<SignUp/>` dentro de `<Suspense>` (el build lo exigía por `usePathname()`).
- `lib/cache-tags.ts`, `lib/money.ts` (+test) — `CACHE_TAGS` y `formatPen` (`S/ 1 290`).
- `modules/packages` — tipos, `isDayTour`/`formatDuration`, `getFeaturedPackages` (orden por reservas `confirmed`, luego `created_at` desc e `id`), `getCategories`, `PackageCard`; tests.
- `modules/destinations` — `getDestinations` (solo con paquetes publicados, `minPriceCents`, `packageCount`); test.
- `modules/home` (nuevo, solo compone) — `HomePage`, `HeroCarousel`, `PackageRail`, `SearchForm`, `TrustStrip`, `DestinationBento`, `WhyWayra`, `WhatsAppCta`, `PhotoCredits`; utilidades `category-chips` y `whatsapp` con tests.
- `app/(public)/page.tsx` — delgada, usa `HomePage`; se retira la muestra D4.
- `components/ui/native-select.tsx` — agregado con shadcn (sin dependencias nuevas); foco global conservado.
- `app/globals.css` — keyframe `wy-fill`.
- `vitest.config.ts` (alias `@`), `package.json` (script `test:db`), `.env.example` (`NEXT_PUBLIC_WHATSAPP_NUMBER`), `docs/ARCHITECTURE.md` (fila `home`).

## Pendiente
- Definir `NEXT_PUBLIC_WHATSAPP_NUMBER` (formato internacional, ej. `51987654321`) en `.env.local` y en Vercel: sin él la banda de WhatsApp no se muestra, por diseño (AC16).
- `DATABASE_URL` pasa a ser obligatoria también en `npm run build` (`cacheComponents` ejecuta las consultas del Inicio al prerenderizar).
- AC6 corregido en la spec y re-aprobado: el seed no fija `created_at`, el desempate efectivo es `id`; el test compara los 5 primeros como conjunto.
- Textos de la franja de confianza y "Por qué Wayra" siguen la decisión Q1 (texto veraz: "Paga con tarjeta", "Voucher en la página de confirmación"); no son literales del artefacto.
- `PackageRail` importa `PackageCard` por ruta directa (el barrel de `packages` arrastra `lib/db` al cliente). Promover `PackageCard` a `components/shared` cuando 008 sea el segundo consumidor.
- Botón de WhatsApp en variante `secondary` (arena) sobre banda teal: no hay variante teal en `button`.
- Los 5 slides del hero están en el DOM dentro de la región `aria-live` y los puntos no usan `role="tab"`: revisar la accesibilidad del carrusel.
- `/paquetes`, `/paquetes/[slug]` y `/destinos/[slug]` dan 404 hasta sus specs.
- Invalidación de caché (`updateTag`/`revalidateTag`) la agregan las specs de CRUD y pagos; mientras tanto el desfase es ≤ 1 h.
