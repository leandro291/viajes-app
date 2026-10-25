# 009 — package-detail

- Spec: `docs/specs/packages/package-detail.md`
- Rama: `009-package-detail`

## Qué se hizo
Ruta pública `/paquetes/[slug]` con galería y créditos de foto, datos clave, itinerario, incluye / no incluye y un panel de reserva con salidas con cupo y viajeros por URL. El CTA lleva a `/pago?salida=…&viajeros=…` (tarjeta 014). Además, cuatro paquetes del seed ganan contenido de ejemplo para probar el detalle sin secciones vacías.

## Cambios
- `app/(public)/paquetes/[slug]/page.tsx` — ruta delgada con metadata.
- `modules/packages/services/package-detail-service.ts` (+test) — `getPackageBySlug` y `getDepartures` cacheados.
- `modules/packages/utils/package-detail.ts` (+test) — parseo de `salida` y `viajeros`, hrefs, cupo, fechas en Lima.
- `modules/packages/components/` — `package-detail`, `package-gallery` (cliente), `package-facts`, `package-itinerary`, `package-inclusions`, `booking-panel`, `mobile-booking-bar`, `detail-skeleton` (nuevos).
- `modules/packages/types/package.ts`, `modules/packages/index.ts`, `modules/packages/services/package-service.ts`, `lib/cache-tags.ts` — tipos, exports, `isPublished` exportado y clave `departures`.
- `lib/db/seed/` y `docs/specs/shared/database-foundation-seed-data.md` — detalle de ejemplo para 4 paquetes y conteos actualizados.
- `docs/specs/packages/package-detail.md`, `changelog/009-package-detail.md`, `docs/prs/009-package-detail.md` — spec (aprobada), changelog y este PR.

## Criterios de aceptación
- [x] AC1: `tsc`, `lint`, `build` y `npm test` en verde; `/paquetes/[slug]` sale como `◐ Partial Prerender`.
- [x] AC2: `parseDetailParams` descarta uuid y viajeros inválidos y toma el primero de un array (test).
- [x] AC3: `buildDetailHref` y `buildCheckoutHref` (test); en la página real el CTA es `/pago?salida=<id>&viajeros=2`.
- [x] AC4: cupo, textos "Agotado / Queda 1 cupo / Quedan N cupos" y `clampTravelers` (test).
- [x] AC5: fechas y chips en `America/Lima`, idiomas (test).
- [x] AC6: `getPackageBySlug` devuelve el detalle completo de `machu-picchu-magico`; slug inexistente o `draft` → `null` (test db).
- [x] AC7: un paquete sin filas hijas devuelve listas vacías (test db y página real de `montana-de-colores`).
- [x] AC8: `getDepartures` excluye pasadas y canceladas, ordena y calcula `seatsLeft` (test db).
- [x] AC9: `cacheLife` y `cacheTag` de ambos services (test).
- [x] AC10: un solo `h1`, migas y las secciones del detalle; las tarjetas ya no dan 404.
- [ ] AC11: galería verificada con clic en "Foto siguiente" (contador 2 / 6, crédito visible); teclado y swipe no probados.
- [x] AC12: cuatro tarjetas de datos clave.
- [ ] AC13: descripción e itinerario con el día 1 abierto y los demás cerrados; el acordeón exclusivo con clic no se probó.
- [x] AC14: incluye / no incluye, y solo una lista o ninguna cuando faltan datos (`montana-de-colores`).
- [ ] AC15: panel con salidas como links y `aria-current`, viajeros, total y CTA; sin salidas y "Agotado" solo cubiertos por test del service, no vistos en el navegador.
- [x] AC16: dos columnas con panel pegajoso a 1280 px; una columna y barra inferior fija a 390 px; sin scroll horizontal.
- [x] AC17: aviso de cancelación.
- [ ] AC18: slug inexistente y slug inválido muestran la página 404, pero con status HTTP 200 (límite conocido, D5).
- [ ] AC19: título "<título> · Wayra" y "Paquete no encontrado" verificados; descripción y `openGraph` no revisados.
- [x] AC20: `PackageGallery` es el único `"use client"` de `modules/packages`; `package.json` sin dependencias nuevas; sin mapa.
- [ ] AC21: tokens y objetivos táctiles a simple vista; `prefers-reduced-motion` y contraste no medidos.
- [ ] AC22: no probado (skeleton con red lenta).

## Cómo probar
1. `npm ci`, copiar `.env` y `npm run dev -- -p 3009`. Si la base no tiene el detalle nuevo: `npx tsx --env-file=.env lib/db/seed/index.ts` (solo agrega filas).
2. Abrir `/paquetes/machu-picchu-magico`: 6 fotos con crédito, itinerario de 4 días, incluye (6) y no incluye (4), y salidas del 5, 12, 19 y 26 de noviembre.
3. Cambiar de salida y de viajeros (`−` / `+`): la URL cambia sin saltar el scroll y el total se recalcula; "Reservar ahora" apunta a `/pago?salida=…&viajeros=…`.
4. Abrir `/paquetes/cusco-valle-sagrado` (5 días) y `/paquetes/montana-de-colores` (sin galería ni itinerario: usa la portada y omite las secciones).
5. Abrir `?salida=zzz&viajeros=99`: los valores inválidos se ignoran, sin error.
6. Abrir `/paquetes/no-existe`: página 404.
7. Repetir a 390 px: una columna y barra inferior con total y "Reservar".
8. `npm run test:db` (con `DATABASE_URL`) para los tests de base.

## Revisión
- Reviewer: no corrido (verificación propia contra la spec).
- lint ✓ · tsc ✓ · tests 156 ✓ (los de base corridos con `.env`) · Playwright: `/paquetes/machu-picchu-magico` a 1280 y 390 px, `/paquetes/cusco-valle-sagrado` a 390 px, `/paquetes/montana-de-colores`, `?salida=zzz&viajeros=99` y `/paquetes/no-existe`
