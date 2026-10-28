# 021 — crud-paquetes

- Fecha: 2026-10-27
- Spec: `docs/specs/packages/package-crud.md`
- PR: `docs/prs/021-crud-paquetes.md`

## Resumen
El operador crea, edita, publica, despublica y borra sus paquetes y tours desde `/operador/paquetes`, con itinerario, inclusiones, portada, galería y categorías, y gestiona sus guías en `/operador/guias` (las usará 022, salidas). Todo filtra por `organizer_id`; un operador `pending` no puede publicar y uno `suspended` no puede escribir. Al cambiar algo visible en el catálogo se invalida la caché con `updateTag(CACHE_TAGS.packages)`.

## Cambios
- `modules/packages/schemas/package-schema.ts` (+ test), `guide-schema.ts` (+ test) — validación Zod compartida por cliente y servidor; borrador y publicado exigen los mismos campos.
- `modules/packages/services/package-manage-service.ts` (+ test BD) — crear, editar, cambiar estado y borrar en transacción; slug automático con sufijo ante colisión; bloqueo de borrado por reservas, salidas u ofertas.
- `modules/packages/services/own-package-service.ts` (+ test BD) — lecturas del operador (lista, edición, opciones de destinos y categorías).
- `modules/packages/services/guide-service.ts` (+ test BD) — CRUD de guías del operador.
- `modules/packages/actions/package-actions.ts`, `guide-actions.ts` (+ tests) — Server Actions con `requireRole`, revalidación con Zod y `updateTag` solo si cambió el catálogo.
- `modules/packages/utils/` — `package-write`, `package-form`, `manage-gate` (`getWriteBlock`, `manageFail`) y `field-errors`, con tests.
- `modules/packages/types/package-manage.ts` — tipos de gestión.
- `modules/packages/components/` — `PackageForm`, `PackageEditor`, secciones del formulario (básicas, inclusiones, itinerario, media), `ImageUploadField`, `OwnPackagesList`, `PackageRowActions`, `GuidesPage`, `GuideManager`, `FormSection`.
- `app/(organizer)/operador/paquetes/` (lista, `nuevo`, `[id]/editar`) y `operador/guias/` — rutas del panel.
- `components/ui/alert-dialog.tsx`, `textarea.tsx` — componentes shadcn nuevos.
- `components/shared/confirm-action-dialog.tsx`, `page-skeleton.tsx` — diálogo de confirmación y esqueleto de página compartidos.
- `lib/slug.ts`, `lib/money.ts` (+ tests) — `slugify`, `parseSolesToCents`, `centsToSolesInput`.
- `modules/packages/index.ts`, `modules/organizers/index.ts` — exports nuevos (`getCurrentOrganizer`, `OwnPackagesList`, `PackageEditor`, `GuidesPage`).
- `modules/organizers/components/organizer-nav-links.ts` (+ test) — links "Paquetes" y "Guías".
- `modules/organizers/components/organizer-shell.tsx` — `Suspense` alrededor de la navegación (`usePathname` en rutas con segmento dinámico rompía `npm run build`).
- `docs/specs/packages/package-crud.md` — spec aprobada.

## Pendiente
- Los tests con base de datos (guías, lecturas y escrituras de paquetes, 19 archivos) no se ejecutaron: solo se revisaron a mano. Correrlos contra una rama de Neon de pruebas antes del merge.
- El test de guías de F1 corrió una vez contra la base del `.env`; no se verificó que no quedaran filas residuales con ids `…2100xx`.
- Flujo completo (crear, publicar, ver en `/paquetes/<slug>`, despublicar, borrar) sin probar con operador, Clerk y Blob reales. En el navegador solo se vio el estado vacío "Aún no tienes un perfil de operador" (desktop y 390 px).
- Sin confirmar: el cambio en `organizer-shell.tsx` (archivo de 019), con el sidebar sin links hasta resolver el `Suspense` en rutas dinámicas.
- Un paquete ajeno o inexistente muestra la pantalla de "no encontrado" con HTTP 200 (límite de `notFound()` con `cacheComponents`); AC23 dice 404.
- Enter dentro de un input del formulario no guarda (botones `type="button"`).
- Deuda menor: tarjeta "Aún no tienes un perfil de operador" copiada en 6 sitios; `run` e `invalid` duplicados entre acciones de guías y paquetes; `NativeSelect` sin alinear con `Input`.
