# 027 — admin-packages-offers

- Fecha: 2026-10-29
- Spec: `docs/specs/admin/admin-packages-offers.md`
- PR: `docs/prs/027-admin-packages-offers.md`

## Resumen
`admin` y `super_admin` ven, editan, publican/despublican y borran los paquetes de todos los operadores en `/admin/paquetes`, y gestionan las ofertas de todos en `/admin/ofertas`. Reusa los services, schemas y formularios de 021 y 024 con alcance global (`PackageScope = OrganizerScope | "all"`); el alcance `"all"` lo fija el servidor en `withAdmin` (`requireRole("admin")`), nunca el cliente. El admin no se bloquea por el estado del operador. Sin migraciones ni dependencias nuevas.

## Cambios
- `modules/packages/types/package-manage.ts`, `services/package-manage-service.ts`, `services/own-package-service.ts` — `PackageScope`; update/status/delete/list/edit aceptan `"all"` (sin filtro de dueño ni `getWriteBlock`); la lista suma `organizerName`.
- `modules/packages/actions/{with-admin,run-package-action,admin-package-actions}.ts` (+tests) — guard de admin, helper compartido de invalidación de caché y actions de admin; `package-actions.ts` usa el helper.
- `modules/packages/components/{package-row,admin-packages-list,admin-package-editor}.tsx` — fila extraída de `own-packages-list.tsx` y vistas de admin; `package-form.tsx` y `package-row-actions.tsx` reciben `panel` (default `"organizer"`).
- `modules/offers/actions/{run-offer-action,admin-offer-actions}.ts` (+test) — helper y actions de admin; `offer-actions.ts` usa el helper.
- `modules/offers/components/{admin-offers-page,own-offers-page,own-offer-form,own-offer-row}.tsx`, `services/offer-list-service.ts`, `types/offer-manage.ts` — `organizerName`, prop `panel` y cuerpo de la página extraído para reusarlo.
- `modules/admin/components/admin-nav-links.ts` (+test) — links "Paquetes" y "Ofertas".
- `modules/packages/index.ts`, `modules/offers/index.ts` — exports nuevos al final.
- `app/(admin)/admin/paquetes/page.tsx`, `paquetes/[id]/editar/page.tsx`, `ofertas/page.tsx` — rutas de admin.
- `docs/specs/admin/admin-packages-offers.md`, `changelog/027-admin-packages-offers.md`, `docs/prs/027-admin-packages-offers.md` — spec (aprobada, T1–T8 `done`), changelog y PR.

## Pendiente
- Verificado en navegador con sesión admin (escritorio y 390 px): listas, editar y guardar, publicar/despublicar, crear y borrar una oferta, drawer móvil y `id` inválido (404). `/operador/*` no se abrió en el navegador (la sesión de prueba es admin); su no regresión se apoya en el reviewer y en los tests de 021/024.
- En `/admin/ofertas` el error de campo del paquete dice "Elige un paquete tuyo.", texto pensado para el operador. Se dejó igual para no cambiar los textos de `/operador`; pasarlo a neutro afecta a ambos paneles.
- "Valle Sagrado completo" (seed) no tiene itinerario y el schema de 021 lo exige: no se puede guardar sin agregar un día. Es la regla de 021, no de 027.
- Solo existe un operador en el seed: el listado con varios operadores se cubre con los tests de BD, no en pantalla.
- Los tests con BD se corrieron contra Neon de desarrollo; `AC15` de 021 agotó el timeout de 5 s en una corrida y pasó con 60 s (latencia remota). Los dos tests nuevos de AC3/AC4 tienen timeout de 30 s.
- Al mergear junto con 026: ambos agregan un link a `ADMIN_NAV_LINKS`; si hay conflicto, conservar los dos.
- Fuera de alcance: crear paquetes desde admin (requiere elegir operador dueño; tarjeta aparte), salidas y guías ajenas, filtros y paginación.
