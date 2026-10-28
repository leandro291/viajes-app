# 022 — operator-departures

- Spec: `docs/specs/packages/operator-departures.md`
- Rama: `022-operator-departures`

## Qué se hizo
CRUD de salidas del operador en `/operador/salidas`: fecha y hora (Lima), capacidad, guía opcional y estado, con los cupos vendidos de cada salida. El service filtra por el operador dueño del paquete, usa guarda optimista (`STALE`) y bloquea cancelar, reprogramar o borrar con cupos vendidos. Sin migraciones ni dependencias nuevas.

## Cambios
- `app/(organizer)/operador/salidas/page.tsx` — ruta `/operador/salidas`.
- `modules/packages/components/departures-page.tsx`, `departure-form.tsx`, `departure-row.tsx` — lista Próximas/Historial, alta y edición en línea, borrado confirmado.
- `modules/packages/actions/with-organizer.ts` — `withOrganizer` extraído; `guide-actions.ts` y `package-actions.ts` migrados (tests sin cambios).
- `modules/packages/actions/departure-actions.ts` — create/update/delete; invalida `departures` solo si el paquete está publicado.
- `modules/packages/services/own-departure-service.ts`, `departure-manage-service.ts` — lecturas y escrituras aisladas por operador.
- `modules/packages/schemas/departure-schema.ts` — schemas de alta y edición.
- `modules/packages/utils/departure-time.ts`, `departure-rules.ts` — conversión Lima ↔ instante y reglas de estado/cupos.
- `modules/packages/utils/manage-gate.ts`, `types/package-manage.ts` — cinco códigos de error nuevos y mensajes.
- `modules/organizers/components/organizer-nav-links.ts` — link "Salidas" en el nav.
- `modules/packages/index.ts` — export de `DeparturesPage`.
- `docs/specs/packages/operator-departures.md`, `changelog/022-operator-departures.md`, `docs/prs/022-operator-departures.md` — spec, changelog y PR.

## Criterios de aceptación
Marcados solo los verificados por tests o en el navegador.
- [x] AC1–AC6: schemas, conversión Lima ↔ instante, transiciones y reglas con cupos vendidos (tests unitarios)
- [x] AC7–AC12: services con aislamiento por operador, errores de campo, `STALE`, borrado bloqueado con reservas y `catalogChanged` (tests con BD)
- [x] AC13–AC14: actions y `withOrganizer` compartido (tests)
- [x] AC15: ruta `/operador/salidas` y link "Salidas" en el nav (navegador)
- [ ] AC16–AC19, AC21: filas, formulario, edición en línea, borrado con diálogo y alertas (sin probar en navegador: falta una cuenta con perfil de operador)
- [ ] AC20: estados de pantalla (solo se vio "Aún no tienes un perfil de operador"; faltan sin paquetes, sin salidas y operador suspendido)

## Cómo probar
1. Con una cuenta de operador con paquetes, abrir `/operador/salidas`.
2. Crear una salida (paquete, fecha futura, hora, capacidad, guía opcional) y verla en Próximas y en `/paquetes/<slug>` si el paquete está publicado.
3. Editarla, pasarla a en ruta y completarla; comprobar que `completed` ya no se edita.
4. Cancelar una salida sin cupos; intentar borrar una con reserva y ver el mensaje en el diálogo.
5. Repetir en móvil (390×844).

## Revisión
- Reviewer: APPROVED (F1–F2 y F3; una ronda de corrección, `DepartureStatus` deduplicado)
- lint ✓ · tsc ✓ · tests ✓ (798 pasan, 176 omitidos por BD) · Playwright: `/operador/salidas` solo en estado sin perfil de operador, escritorio y móvil, sin errores de consola ni 4xx/5xx
- Pendiente: corregir AC11 (`23001`, no `23503`) y posible mismo bug en `package-manage-service.ts:194`; detalle en `changelog/022-operator-departures.md`
