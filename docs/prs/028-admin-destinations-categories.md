# 028 — admin-destinations-categories

- Spec: `docs/specs/destinations/admin-destinations-categories.md`
- Rama: `028-admin-destinations-categories`

## Qué se hizo
Panel admin para gestionar el catálogo: CRUD de destinos con clima de 12 meses, lugares imperdibles y preguntas frecuentes (`/admin/destinos`) y CRUD de categorías (`/admin/categorias`). Usa la subida de imágenes de 020 e invalida la caché del catálogo en cada escritura. Acceso para `admin` y `super_admin`.

## Cambios
- `lib/catalog-result.ts`, `lib/catalog-action.ts`, `lib/field-errors.ts` — resultado tipado, `runAdminAction` (guard `requireRole("admin")`) y `toFieldErrors` movido a `lib/`
- `lib/blob/image-url.ts`, `lib/db/pg-errors.ts`, `lib/slug.ts` — `isAllowedImageUrl`, helpers de errores de Postgres y `hasSlugChars` (los de `packages` los re-exportan)
- `components/shared/form-section.tsx`, `components/shared/image-upload-field.tsx` — movidos desde `packages` sin cambios de contenido; imports actualizados en 4 secciones del formulario de paquetes
- `modules/packages/{schemas,services,actions,components}/` — categorías: schema, service, actions, gestor en línea y página; bloqueo de borrado si hay paquetes
- `modules/destinations/{schemas,services,actions,utils,types,components}/` — destinos: schema, servicios de escritura y lectura, actions, formulario por secciones, lista y editor
- `app/(admin)/admin/categorias/`, `app/(admin)/admin/destinos/**` — 4 rutas delgadas
- `modules/admin/components/admin-nav-links.ts`, `modules/packages/index.ts`, `modules/destinations/index.ts` — links "Categorías" y "Destinos" y exports (posible conflicto con 026/027)
- `docs/specs/destinations/admin-destinations-categories.md`, `changelog/028-admin-destinations-categories.md`, `docs/prs/028-admin-destinations-categories.md` — spec, changelog y PR

## Criterios de aceptación
- [x] AC1–AC4: `isAllowedImageUrl`, `hasSlugChars`, `runAdminAction` y `categoryInputSchema` (tests unitarios)
- [x] AC5–AC8: service de categorías (tests con BD, corridos una vez contra Neon de desarrollo)
- [x] AC9: actions de categorías (guard, revalidación con Zod, `updateTag` solo en `ok`)
- [x] AC10–AC13: `destinationInputSchema` (portada obligatoria, clima todo o nada, topes de 12 y 20, claves por path)
- [x] AC18–AC19: actions de destinos (guard, Zod, `updateTag` ×2 solo en `ok`)
- [ ] AC14–AC17: services de destinos — tests con BD escritos pero omitidos (sin `DATABASE_URL`)
- [ ] AC20–AC25: pantallas de destinos y categorías — sin probar con sesión admin
- [ ] AC26–AC28: nav, guard de rol por página y accesibilidad — revisado por código; sin verificar en navegador
- [ ] AC29: `tsc`, `lint` y `test` en verde; `npm run build` sin correr

## Cómo probar
1. Con `DATABASE_URL`, Clerk y Blob en `.env.local`: `npm run dev -- -p 3028` e iniciar sesión como `admin`.
2. `/admin/categorias`: agregar una categoría, renombrarla, repetir el nombre (error en el campo) y borrar una con paquetes (diálogo con el motivo).
3. `/admin/destinos/nuevo`: crear un destino con portada, 12 meses de clima, 2 lugares con foto y 2 preguntas. Probar con clima incompleto (error).
4. Añadirle un paquete publicado y abrir `/destinos/<slug>`. Renombrar el destino y ver el cambio en la tarjeta del paquete sin esperar la caché.
5. Intentar borrar un destino con paquetes (bloqueado) y uno sin paquetes (se borra).
6. Repetir con `super_admin`; con `organizer` debe redirigir. Revisar a 390 px.
7. Con BD: `npm test` corre los 257 tests de integración hoy omitidos.

## Revisión
- Reviewer: APPROVED (fases 1–6; la Fase 5 con 2 bloqueadores de cliente/servidor, corregidos y verificados)
- lint ✓ · tsc ✓ · tests ✓ (1048 pasan, 257 omitidos) · Playwright: no revisado con sesión admin; solo se comprobó que las 4 rutas compilan y redirigen a `/sign-in` sin sesión

🤖 Generated with [Claude Code](https://claude.com/claude-code)
