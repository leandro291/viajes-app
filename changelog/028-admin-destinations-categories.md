# 028 — admin-destinations-categories

- Fecha: 2026-10-29
- Spec: `docs/specs/destinations/admin-destinations-categories.md`
- PR: `docs/prs/028-admin-destinations-categories.md`

## Resumen
Panel admin para gestionar el catálogo: CRUD de destinos con clima de 12 meses, lugares imperdibles y preguntas frecuentes (`/admin/destinos`, `/nuevo`, `/[id]/editar`, un solo formulario) y CRUD de categorías en línea (`/admin/categorias`). Las fotos usan `uploadImage` (020) y cada escritura exitosa invalida las etiquetas de caché del catálogo con `updateTag`. Acceso para `admin` y `super_admin`. Un destino o categoría con paquetes asociados no se puede borrar, y un nombre repetido da error en el campo.

## Cambios
- `lib/catalog-result.ts`, `lib/catalog-action.ts` (+test) — resultado tipado `CatalogResult`, mensajes y `runAdminAction` (guard `requireRole("admin")` + `UNKNOWN` con log de texto fijo). La parte pura vive aparte para que la importen componentes cliente.
- `lib/field-errors.ts` — `toFieldErrors` movido desde `packages` (que lo re-exporta) para usarlo desde el cliente sin importar el barrel.
- `lib/blob/image-url.ts` (+test), `lib/db/pg-errors.ts` (+test), `lib/slug.ts` (+test) — `isAllowedImageUrl`, helpers de errores de Postgres y `hasSlugChars`, extraídos por segundo uso real; `package-schema.ts` y `package-write.ts` los re-exportan.
- `components/shared/form-section.tsx`, `components/shared/image-upload-field.tsx` — movidos desde `modules/packages/components` (sin cambios de contenido); se actualizan imports en 4 secciones del formulario de paquetes.
- `modules/packages/{schemas,services,actions}/category-*` (+tests) — schema, service (listar con uso, crear, renombrar, borrar con bloqueo `HAS_PACKAGES`) y Server Actions de categorías.
- `modules/packages/components/{admin-categories-page,category-manager}.tsx`, `app/(admin)/admin/categorias/page.tsx` — gestor en línea y ruta.
- `modules/destinations/schemas/destination-schema.ts` (+test) — `destinationInputSchema` (portada obligatoria, clima todo o nada, tope de 12 lugares y 20 preguntas) e id uuid.
- `modules/destinations/services/destination-manage-service.ts`, `destination-admin-service.ts`, `utils/destination-write.ts`, `types/destination-manage.ts` (+tests) — crear, editar (reemplaza hijas) y borrar en transacción; lecturas del panel sin caché con conteos.
- `modules/destinations/actions/destination-actions.ts` (+test) — tres Server Actions con `updateTag` de `destinations` y `packages` solo en `ok`.
- `modules/destinations/utils/destination-form.ts` (+test), `components/destination-form*.tsx`, `destination-editor.tsx` — formulario por secciones (básicos, clima, lugares, preguntas), validación con el mismo schema en cliente y servidor.
- `modules/destinations/components/{admin-destinations-list,destination-row-actions}.tsx`, `app/(admin)/admin/destinos/**` — lista, nuevo y editar.
- `modules/admin/components/admin-nav-links.ts`, `modules/packages/index.ts`, `modules/destinations/index.ts` — links "Categorías" y "Destinos" y exports.
- `docs/specs/destinations/admin-destinations-categories.md`, `changelog/028-admin-destinations-categories.md`, `docs/prs/028-admin-destinations-categories.md` — spec (aprobada, T1–T19 `done`), changelog y PR.

## Pendiente
- Sin verificar en navegador con sesión admin: solo se comprobó que las 4 rutas compilan y redirigen a `/sign-in` sin sesión. Falta crear, editar y borrar de verdad, subir fotos, los roles `admin`, `super_admin` y `organizer`, 390 px y foco.
- `npm run build` no se corrió (necesita la base).
- Los 257 tests de integración con BD (services de categorías y destinos) están omitidos sin `DATABASE_URL`. Solo los de `category-manage-service` se corrieron una vez contra Neon de desarrollo, con limpieza.
- Conflictos probables con 026 y 027 en `admin-nav-links.ts` y en los `index.ts`: conservar las líneas de ambos lados.
- Texto de 14 px en los botones "Quitar" y "Agregar" (viene del `Button` base; AC28 pide 16 px).
- `db:seed` hace upsert y pisa lo que se edite en los 8 destinos sembrados; aceptable por ser dev/demo.
- Hallazgos menores del reviewer sin aplicar: test con `localeCompare` en `destination-admin-service.test.ts`, falta test de la rama `23503` del borrado por carrera, y `role="alert"` repetido en el `Alert` del formulario.
