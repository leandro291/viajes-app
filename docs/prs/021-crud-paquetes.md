# 021 — crud-paquetes

- Spec: `docs/specs/packages/package-crud.md`
- Rama: `021-crud-paquetes`

## Qué se hizo
CRUD de paquetes y tours del operador en `/operador/paquetes` (lista, nuevo, editar) y CRUD de sus guías en `/operador/guias`. Todo filtra por `organizer_id`; un operador `pending` no puede publicar y uno `suspended` no puede escribir. Publicar, editar uno ya publicado, despublicar y borrar uno publicado invalidan la caché del catálogo con `updateTag(CACHE_TAGS.packages)`.

## Cambios
- `modules/packages/schemas/` — schemas Zod de paquete y guía, compartidos por cliente y servidor.
- `modules/packages/services/` — `package-manage-service` (escrituras en transacción), `own-package-service` (lecturas) y `guide-service`.
- `modules/packages/actions/` — Server Actions de paquetes y guías, con `requireRole`, revalidación y `updateTag`.
- `modules/packages/utils/` y `types/` — `package-write`, `package-form`, `manage-gate`, `field-errors` y tipos de gestión.
- `modules/packages/components/` — formulario de paquete (4 secciones), `ImageUploadField`, lista, acciones por fila y gestor de guías.
- `app/(organizer)/operador/paquetes/` y `operador/guias/` — rutas del panel.
- `components/ui/alert-dialog.tsx`, `textarea.tsx`; `components/shared/confirm-action-dialog.tsx`, `page-skeleton.tsx` — piezas de UI nuevas.
- `lib/slug.ts`, `lib/money.ts` — `slugify`, `parseSolesToCents`, `centsToSolesInput`.
- `modules/organizers/` — links "Paquetes" y "Guías", export de `getCurrentOrganizer` y `Suspense` alrededor de la navegación en `organizer-shell.tsx`.

## Criterios de aceptación
Marcados solo los cubiertos por tests unitarios que corrieron; los demás quedan sin marcar.
- [x] AC2: validación de guía
- [x] AC5: `getWriteBlock` por estado del operador
- [x] AC6–AC12: schema de paquete, errores por campo, `parseSolesToCents`
- [x] AC20–AC22: actions (guard de rol, revalidación, `updateTag` una sola vez y solo si cambió el catálogo), con mocks
- [x] AC32: links del sidebar (test del nav)
- [x] AC34: `tsc`, `lint` y `npm test` en verde
- [ ] AC1, AC3, AC4, AC13–AC19: servicios con base de datos; tests escritos y revisados a mano, **no ejecutados**
- [ ] AC23–AC31, AC33: UI; sin probar con un operador real (solo se vio el estado vacío)

## Cómo probar
1. `npm ci` y `npx next typegen`.
2. `npm run lint`, `npx tsc --noEmit` y `npm test` (los tests con BD se saltan sin `DATABASE_URL`).
3. Con una rama de Neon de pruebas: exportar su `DATABASE_URL` y `DATABASE_URL_UNPOOLED` y correr `npm test`; deben pasar los 19 archivos saltados.
4. Con un operador `active` en esa rama: crear un paquete, verlo en `/operador/paquetes`, publicarlo y comprobar que aparece en `/paquetes/<slug>`; despublicarlo y borrarlo.
5. Con un operador `pending`: "Publicar" deshabilitado. Con uno `suspended`: todo en solo lectura.
6. Borrar un paquete con reservas, salidas u ofertas: el diálogo queda abierto con el mensaje.
7. Revisar a 390 px: sin scroll horizontal, foco atrapado y Esc en el diálogo.

## Revisión
- Reviewer: APPROVED por fase (F1, F2, F3 en la ronda 1; F4 y F5 en la ronda 2)
- lint ✓ · tsc ✓ · `npm test` ✓ (686 pasan, 141 saltados por falta de BD) · `npm run build` ✓
- Playwright: `/operador/paquetes`, `/nuevo` y `/[id]/editar` en desktop y 390 px, con un usuario sin fila en `organizers`: solo se vio el estado vacío, sin errores de consola. Flujo con datos reales: no revisado.
