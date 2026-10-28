# 022 — operator-departures

- Fecha: 2026-10-27
- Spec: `docs/specs/packages/operator-departures.md`
- PR: `docs/prs/022-operator-departures.md`

## Resumen
CRUD de salidas (`departures`) del operador en `/operador/salidas`, una sola página con el mismo patrón que `/operador/guias` (021). El operador define fecha y hora (Lima), capacidad, guía opcional y estado (programada, en ruta, completada, cancelada), y cada salida muestra los cupos vendidos (`booked_seats`). El service filtra siempre por el operador dueño del paquete, usa guarda optimista (`STALE`) y no deja cancelar, reprogramar ni borrar con cupos vendidos. Sin migraciones ni dependencias nuevas.

## Cambios
- `app/(organizer)/operador/salidas/page.tsx` — ruta `/operador/salidas`.
- `modules/packages/components/departures-page.tsx`, `departure-form.tsx`, `departure-row.tsx` — lista Próximas/Historial, alta y edición en línea con borrado confirmado.
- `modules/packages/actions/with-organizer.ts` — `withOrganizer` extraído; `guide-actions.ts` y `package-actions.ts` migrados a usarlo (sus tests no cambiaron).
- `modules/packages/actions/departure-actions.ts` (+test) — create/update/delete con `updateTag(departures)` solo si el paquete está publicado.
- `modules/packages/services/own-departure-service.ts` (+test db) — lectura de salidas propias y opciones del formulario.
- `modules/packages/services/departure-manage-service.ts` (+test db) — escrituras con validación de paquete y guía propios, fecha duplicada y `STALE`.
- `modules/packages/schemas/departure-schema.ts` (+test) — `departureInputSchema` y `departureUpdateSchema`.
- `modules/packages/utils/departure-time.ts`, `departure-rules.ts` (+tests) — conversión Lima ↔ instante, transiciones de estado y reglas con cupos vendidos.
- `modules/packages/utils/manage-gate.ts` (+test), `types/package-manage.ts` — cinco códigos de error nuevos (`SEATS_SOLD`, `DEPARTURE_CLOSED`, `INVALID_TRANSITION`, `DEPARTURE_HAS_BOOKINGS`, `STALE`) y sus mensajes.
- `modules/organizers/components/organizer-nav-links.ts` (+test) — link "Salidas" en el nav del operador.
- `modules/packages/index.ts` — export de `DeparturesPage`.
- `docs/specs/packages/operator-departures.md`, `changelog/022-operator-departures.md`, `docs/prs/022-operator-departures.md` — spec (aprobada, T1–T11 `done`), changelog y PR.

## Pendiente
- Verificación en navegador parcial: `/operador/salidas` carga sin errores en escritorio y móvil, pero solo se vio el estado sin perfil de operador. Falta probar con un operador: crear, editar, pasar a en ruta/completada, cancelar sin cupos, borrar con reserva y ver la salida en `/paquetes/<slug>`.
- Verificado con `tsc`, `lint` y `npm test` (798 pasan, 176 omitidos). Los tests con BD de T5 (6) y T6 (23) los corrió el developer contra la base de desarrollo; no se corrió `npm run build`.
- AC11 de la spec dice que borrar con reservas falla con `23503`, pero `ON DELETE RESTRICT` lanza `23001`. El código usa el helper local `isRestrictViolation`; falta corregir el texto de la spec.
- Probable bug aparte: `package-manage-service.ts:194` (borrar un paquete con reservas) cae en `UNKNOWN` en vez de `HAS_DEPENDENCIES` por el mismo `23001`. Sin confirmar; arreglo posible: ampliar `isFkViolation` a `23503 || 23001`.
- Menores del reviewer sin aplicar: `selectClass` copiado de `checkout-form.tsx`; Editar/Eliminar sin `aria-label` por fila; `departures-page.tsx` reparte Próximas/Historial con literales en vez de `isTerminalStatus`.
