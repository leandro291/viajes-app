# 024 — operator-offers

- Fecha: 2026-10-28
- Spec: `docs/specs/offers/operator-offers.md`
- PR: `docs/prs/024-operator-offers.md`

## Resumen
CRUD de ofertas (`offers`) del operador en `/operador/ofertas`, una sola página con el mismo patrón que `/operador/salidas` (022). El operador define paquete, tipo, descuento (porcentaje o 2x1), mínimo de personas, vigencia (hasta las 23:59 de Lima) y si la oferta está activa; la lista muestra Activa / Vencida / Inactiva. El service recibe el alcance como parámetro (`OrganizerScope | "all"`, para el ticket 027 de admin) y filtra siempre por el operador dueño del paquete. Las escrituras sobre un paquete publicado invalidan `CACHE_TAGS.offers`. Sin migraciones ni dependencias nuevas.

## Cambios
- `app/(organizer)/operador/ofertas/page.tsx` — ruta `/operador/ofertas`.
- `modules/offers/components/own-offers-page.tsx`, `own-offer-form.tsx`, `own-offer-row.tsx` — lista, alta y edición en línea con borrado confirmado; estados sin perfil, sin paquetes, sin ofertas y suspendido.
- `modules/offers/actions/offer-actions.ts` (+test) — create/update/delete con `withOrganizer` y `updateTag(offers)` solo si el paquete está publicado.
- `modules/offers/services/offer-list-service.ts` (+test db) — lectura de ofertas propias y opciones del formulario, con alcance por parámetro.
- `modules/offers/services/offer-manage-service.ts` (+test db) — escrituras con paquete propio, vigencia futura, `min_people <= max_group_size` y `catalogChanged`.
- `modules/offers/schemas/offer-schema.ts` (+test) — `offerInputSchema`, `offerUpdateSchema`, `offerIdSchema`.
- `modules/offers/utils/offer-rules.ts` (+test) — estado de la oferta, textos de descuento y `checkOffer`.
- `modules/offers/types/offer-manage.ts`, `modules/offers/index.ts` — tipos del panel y export de `OwnOffersPage`.
- `lib/lima-time.ts` (+test) — `departure-time.ts` movido desde `modules/packages/utils` con `git mv`, para usarlo sin arrastrar `lib/db`; `departure-schema.ts` y `departure-form.tsx` solo cambian el import.
- `modules/packages/index.ts` — exports de `withOrganizer`, `manageFail`, `getWriteBlock`, `MANAGE_MESSAGES`, `toFieldErrors` y los tipos `ManageResult`, `OrganizerScope`, `ManageErrorCode`.
- `modules/organizers/components/organizer-nav-links.ts` (+test) — link "Ofertas" en el nav del operador.
- `docs/specs/offers/operator-offers.md`, `changelog/024-operator-offers.md`, `docs/prs/024-operator-offers.md` — spec (aprobada, T1–T10 `done`), changelog y PR.

## Pendiente
- Varias ofertas activas por paquete están permitidas y "gana la de mayor descuento" solo ordena la presentación: `/ofertas` muestra todas y el checkout aplica solo la que llega por `offerId`. Si debe ganar siempre la mejor, es otro ticket (checkout y detalle).
- No se probó en el navegador la invalidación de caché contra `/ofertas` pública (exigiría una oferta activa sobre un paquete publicado) ni el operador `suspended`; solo están cubiertos por tests unitarios.
- `own-offer-form.tsx` duplica `toFieldErrors` de `packages` (inevitable: el barrel arrastraría `lib/db` al bundle cliente); `run` de `offer-actions.ts` repite el de `departure-actions.ts`. Extraer si aparece un tercer consumidor.
- La suite de tests con BD falla en tests preexistentes de `packages` y `destinations` (asumen que la base compartida contiene solo el seed), con o sin los de este ticket. Los de `offers/services` pasan 3 de 3 corridas.
- Los tests con BD de T4 y T5 corrieron contra la base Neon compartida: crearon y borraron solo sus filas, pero la reserva de prueba consumió un número de `booking_code_seq` (hueco en `WY-####`).
- Lista sin paginación (tope 500 filas, `ponytail` en el service). `MANAGE_MESSAGES.ORGANIZER_SUSPENDED` dice "no puedes modificar paquetes" y se reutiliza tal cual.
