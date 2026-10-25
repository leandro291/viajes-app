# 009 — package-detail

- Fecha: 2026-10-25
- Spec: `docs/specs/packages/package-detail.md`
- PR: `docs/prs/009-package-detail.md`

## Resumen
Detalle público de un paquete (`/paquetes/[slug]`): galería con créditos de foto, datos clave, itinerario día a día, incluye / no incluye y un panel de reserva con las próximas salidas (con cupo) y viajeros. La salida y los viajeros viajan por la URL (`?salida=`, `?viajeros=`) y el CTA "Reservar ahora" lleva a `/pago?salida=…&viajeros=…`. Las tarjetas de `/paquetes` y del Inicio ya no dan 404. Cuatro paquetes más del seed tienen galería, itinerario e inclusiones de ejemplo.

## Cambios
- `app/(public)/paquetes/[slug]/page.tsx` — ruta delgada con `generateMetadata`; delega en `PackageDetail`.
- `modules/packages/services/package-detail-service.ts` (+test db) — `getPackageBySlug` (caché `hours`, solo `published`) y `getDepartures` (caché `minutes`, `scheduled` y futuras, máximo 8, con `seatsLeft`).
- `modules/packages/utils/package-detail.ts` (+test) — `parseDetailParams` (zod), `buildDetailHref`, `buildCheckoutHref`, `resolveBooking`, cupo, `clampTravelers` y formatos de fecha y hora en `America/Lima`.
- `modules/packages/types/package.ts` — `PackageDetailDto`, `DepartureDto`, `PackageImageDto`, `ItineraryDayDto`, `DetailParams`.
- `modules/packages/components/package-detail.tsx` — migas, `<Suspense>` con `await params` dentro de la frontera, `notFound()` y metadata.
- `modules/packages/components/package-gallery.tsx` — único `"use client"`: carrusel con miniaturas, flechas, contador, swipe y crédito de la foto activa; recibe título y resumen como `children`.
- `modules/packages/components/package-facts.tsx`, `package-itinerary.tsx`, `package-inclusions.tsx` — datos clave, acordeón nativo `<details name>` y listas incluye / no incluye con el aviso de cancelación.
- `modules/packages/components/booking-panel.tsx`, `mobile-booking-bar.tsx` — salidas y viajeros como links, total y CTA; barra fija solo en móvil.
- `modules/packages/components/detail-skeleton.tsx` — skeleton del detalle.
- `modules/packages/services/package-service.ts` — exporta `isPublished` (antes privado).
- `modules/packages/index.ts`, `lib/cache-tags.ts` — exports nuevos y clave `departures`.
- `lib/db/seed/data/package-details.ts`, `lib/db/seed/seed-data.test.ts`, `docs/specs/shared/database-foundation-seed-data.md` — detalle de ejemplo (ficticio) para `cusco-valle-sagrado`, `titicaca-islas-uros`, `canon-del-colca` y `lima-sabores-y-cultura`; conteos nuevos: 13 fotos, 18 días, 43 inclusiones.

## Pendiente
- Un slug inexistente muestra la página 404 de Next pero con status HTTP 200 (límite de `notFound()` dentro de `<Suspense>`, D5 de la spec). Si importa el 404 real, agregar `generateStaticParams` + `dynamicParams`.
- El cupo mostrado puede estar desfasado hasta ~1 min (caché `minutes`); 014 debe revalidarlo antes de cobrar.
- `/pago` (tarjeta 014) no existe: el CTA da 404 hasta entonces.
- Falta `metadataBase` en el layout raíz: Next avisa en consola al resolver la imagen `openGraph` de la portada.
- Sin mapa de la ruta (Leaflet) ni insignia "Confirmación inmediata" del diseño; la miga es "Inicio / Paquetes / <título>" porque `/destinos/[slug]` no existe (011).
- No probado en navegador: foco con teclado en la galería, swipe, acordeón exclusivo con clic, la salida "Agotado", `prefers-reduced-motion` y el skeleton con red lenta.
- Los tests de base se omiten sin `DATABASE_URL`; correr con `npm run test:db` (necesita `.env.local`).
- Invalidación de caché (`updateTag`/`revalidateTag`) la agregan las specs de CRUD y pagos.
