# 024 — operator-offers

- Spec: `docs/specs/offers/operator-offers.md`
- Rama: `024-operator-offers`

## Qué se hizo
CRUD de ofertas del operador en `/operador/ofertas`: alta, edición en línea, activar/desactivar y borrado, con estado Activa / Vencida / Inactiva. El service filtra por el operador dueño del paquete (alcance como parámetro, listo para el admin de 027) e invalida la caché de ofertas al escribir sobre un paquete publicado. Sin migraciones ni dependencias nuevas.

## Cambios
- `app/(organizer)/operador/ofertas/page.tsx` — ruta `/operador/ofertas`.
- `modules/offers/components/own-offers-page.tsx`, `own-offer-form.tsx`, `own-offer-row.tsx` — lista, formulario de alta/edición y fila con borrado confirmado.
- `modules/offers/actions/offer-actions.ts` (+test) — create/update/delete con `withOrganizer` y `updateTag(offers)` condicional.
- `modules/offers/services/offer-list-service.ts`, `offer-manage-service.ts` (+tests db) — lecturas y escrituras con alcance, vigencia futura, mínimo ≤ máximo del paquete y `catalogChanged`.
- `modules/offers/schemas/offer-schema.ts`, `utils/offer-rules.ts`, `types/offer-manage.ts` (+tests) — validación, estado y textos de la oferta.
- `lib/lima-time.ts` (+test) — `departure-time.ts` movido desde `packages`; solo cambia el import en `departure-schema.ts` y `departure-form.tsx`.
- `modules/packages/index.ts` — exports del kit de escritura (`withOrganizer`, `manageFail`, `getWriteBlock`, `MANAGE_MESSAGES`, `toFieldErrors`, tipos).
- `modules/organizers/components/organizer-nav-links.ts` (+test) — link "Ofertas" en el nav.
- `docs/specs/offers/operator-offers.md`, `changelog/024-operator-offers.md`, `docs/prs/024-operator-offers.md` — spec, changelog y PR.

## Criterios de aceptación
- [x] AC1: `lib/lima-time.ts` movido sin cambio de comportamiento; tests de 022 siguen en verde.
- [x] AC2–AC4: `offerInputSchema`, `offerUpdateSchema` y `offerIdSchema` (tests, 40).
- [x] AC5–AC7: estado, `checkOffer` y textos de la oferta (tests, 23).
- [x] AC8–AC13: lecturas y escrituras del service, aislamiento entre operadores, `"all"`, `NOT_FOUND` en ofertas ajenas, reserva que queda con `offer_id` nulo y `catalogChanged` (tests con BD, pasan 3 de 3 corridas).
- [x] AC14–AC15: actions (alcance de la sesión, `organizerId` del input ignorado, `updateTag` solo con `catalogChanged`; tests, 31).
- [x] AC16: ruta, `h1`, `Suspense` y link activo en el nav (navegador y test).
- [x] AC13/AC15: una oferta 2x1 activa sobre un paquete publicado subió `/ofertas` de 6 a 7 ofertas sin esperar la revalidación, y al desactivarla bajó a 6 (navegador, contra la base de desarrollo; la oferta de prueba se borró y la base quedó con las 8 de antes).
- [x] AC17: fila con paquete, tipo, descuento, mínimo, "Hasta el 31 de diciembre de 2026" / "Sin vencimiento" y estado (navegador). No se vio en navegador el aviso de paquete en borrador (los dos paquetes del operador de prueba están publicados).
- [x] AC18: formulario con campos condicionales; porcentaje 101 da error de campo (navegador).
- [x] AC19: editar precarga los valores y deja el paquete de solo lectura (navegador, oferta inactiva). Vencida no probada en navegador.
- [x] AC20: borrar con diálogo de confirmación (navegador). El caso de error con el diálogo abierto no se probó.
- [ ] AC21: verificado en navegador solo el estado "sin ofertas". Sin perfil, sin paquetes y operador suspendido no se probaron.
- [x] AC22: `Alert` con `role="alert"` y controles deshabilitados durante la acción; vista móvil a 390 px sin scroll horizontal (navegador).

## Cómo probar
1. `npm run dev -- -p 3024`, entrar como operador y abrir `/operador/ofertas`.
2. Crear una oferta de 25 % sobre un paquete, desmarcando "Oferta activa" (si queda activa y el paquete está publicado, aparece en `/ofertas`). Debe aparecer "Inactiva".
3. Editar: porcentaje 101 muestra error de campo; una fecha pasada en "Vigente hasta" muestra "Elige una fecha de hoy o futura.".
4. Marcarla activa en un paquete publicado y comprobar que aparece en `/ofertas` sin esperar la revalidación; vencerla o desactivarla y comprobar que desaparece.
5. Eliminar con el diálogo; con un operador suspendido, comprobar que los controles quedan deshabilitados.
6. `npx vitest run modules/offers lib` (los tests con BD necesitan `DATABASE_URL`).

## Revisión
- Reviewer: APPROVED (ronda 2; la ronda 1 pidió cambios y se corrigieron)
- lint ✓ · tsc ✓ · tests ✓ (894 pasan, 199 omitidos sin BD) · build ✓
- Playwright: `/operador/ofertas` a 1280 y 390 px — alta, edición con errores de campo, guardado y borrado; 0 errores de consola.
- Observado en dev, fuera de este ticket: tras invalidar la caché, `/ofertas` registra en consola "Next.js encountered uncached data during prerendering" en `OffersPage` (tarjeta 012). La página muestra bien los datos; falta confirmar si ocurre también en `main` tras cualquier invalidación.
- La suite con BD falla en tests preexistentes de `packages` y `destinations`, con o sin este cambio (la base compartida no contiene solo el seed).
