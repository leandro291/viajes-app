# 010 — tours

- Fecha: 2026-10-25
- Spec: `docs/specs/packages/tours.md`
- PR: `docs/prs/010-tours.md`

## Resumen
Ruta pública `/tours` con los tours de un día publicados (`isDayTour`), hero carrusel con los 4 más reservados y filtros por ciudad, fecha y orden guardados en la URL (`ciudad`, `fecha`, `orden`). Cada tarjeta muestra duración en horas, hora de salida y la próxima salida con cupo (o "Sin salidas próximas"). El resultado se cachea por combinación de filtros con Cache Components.

## Cambios
- `app/(public)/tours/page.tsx` — ruta delgada con `metadata.title = "Tours de un día"`.
- `modules/packages/services/tour-service.ts` (+test) — `getTours(filters)` cacheado (`packages` y `departures`); dos consultas: ranking de reservas y próxima salida con cupo (`selectDistinctOn`).
- `modules/packages/utils/tour-filters.ts` (+test) — parseo (zod), `limaToday`, `maxFecha`, resolución contra ciudades reales, `dayRange` (día de Lima), ciudades con tours y hrefs.
- `modules/packages/utils/tour-view.ts` (+test) — textos de tarjeta: duración, salida, próxima salida y contador.
- `modules/packages/components/` — `tours-listing.tsx`, `tour-card.tsx`, `tour-filter-bar.tsx`, `tours-skeleton.tsx` (nuevos); `listing-hero.tsx` extrae `HeroIntro` y `HeroFeatureLink` de `packages-listing.tsx` sin cambio visual en `/paquetes`.
- `modules/packages/services/package-service.ts` — exporta `isDayTourRow` y `getPackages` lo usa (mismo comportamiento).
- `modules/packages/types/package.ts`, `modules/packages/index.ts` — tipos y exports de tours.
- `docs/specs/packages/tours.md`, `changelog/010-tours.md`, `docs/prs/010-tours.md` — spec (`done`), changelog y PR.

## Pendiente
- El seed solo trae salidas hasta el 2026-11-19: después de esa fecha todas las tarjetas dirán "Sin salidas próximas". Falta una tarjeta que genere salidas recurrentes en `lib/db/seed/data/schedule.ts`.
- `tour-service.test.ts` vacía temporalmente un tour del seed para probar el caso "sin horas ni salidas" y lo restaura en `finally`; otros archivos db en paralelo pueden verlo alterado y, si el proceso muere, hay que correr `npm run db:seed`.
- Sin filtro de categoría (no está en el diseño; replicar el `EXISTS` de 008 no era gratis).
- Sin paginación ni `LIMIT` (el seed tiene 10 tours).
- Aviso de LCP en consola por la imagen del hero (`HeroCarousel` compartido; igual en `/paquetes`) y la miga queda pegada al header en móvil (`PageHero` compartido). No se tocaron.
- `index.ts` de `modules/packages` es el archivo con más riesgo de conflicto de merge con 011, 014 y 020.
