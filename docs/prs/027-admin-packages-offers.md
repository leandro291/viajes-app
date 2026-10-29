# 027 — admin-packages-offers

- Spec: `docs/specs/admin/admin-packages-offers.md`
- Rama: `027-admin-packages-offers`

## Qué se hizo
Paneles `/admin/paquetes` y `/admin/ofertas`: el admin gestiona paquetes y ofertas de todos los operadores reusando los services y formularios de 021 y 024 con alcance `"all"`. La autorización vive en `withAdmin` (`requireRole("admin")`) y en las páginas; el operador no cambia.

## Cambios
- `modules/packages/{types,services}` — `PackageScope` y `organizerName`; update/status/delete/list/edit aceptan `"all"`.
- `modules/packages/actions/*` — `withAdmin`, helper de caché `run-package-action` y actions de admin (+tests).
- `modules/packages/components/*` — `package-row` extraído, `AdminPackagesList`, `AdminPackageEditor` y prop `panel` en form y acciones de fila.
- `modules/offers/{actions,components,services,types}` — helper y actions de admin, `AdminOffersPage`, `organizerName` y prop `panel`.
- `modules/admin/components/admin-nav-links.ts` (+test) — links "Paquetes" y "Ofertas".
- `app/(admin)/admin/{paquetes,paquetes/[id]/editar,ofertas}/page.tsx` — rutas nuevas.
- `docs/specs/admin/admin-packages-offers.md`, `changelog/027-admin-packages-offers.md`, `docs/prs/027-admin-packages-offers.md`.

## Criterios de aceptación
- [x] AC1: `/admin/paquetes` lista todos los paquetes con el operador (probado en navegador)
- [x] AC2: editar precarga el formulario, guarda y vuelve a `/admin/paquetes`; `id` inválido da 404 (navegador)
- [x] AC3: publicar/pasar a borrador funciona en navegador; borrar y operador `suspended` cubiertos por tests con BD
- [x] AC4: `"all"` opera sobre paquetes ajenos y `OrganizerScope` sigue dando `NOT_FOUND` (tests con BD)
- [x] AC5: las actions de admin rechazan a quien no es `admin`+ y no aceptan scope del cliente (tests de `with-admin` y de actions)
- [x] AC6: invalidación de caché solo si `catalogChanged` (tests de actions)
- [x] AC7: `/admin/ofertas` lista todas las ofertas con operador y estado (navegador)
- [x] AC8: crear y borrar oferta de cualquier paquete (navegador); editar cubierto por tests
- [x] AC9: nav con tres links y activo en `/admin/paquetes/[id]/editar` (navegador y test)
- [ ] AC10: `/operador/*` sin cambios — por reviewer y tests; no abierto en el navegador
- [x] AC11: 390 px sin scroll horizontal en paquetes y ofertas, drawer con los tres links
- [x] AC12: `tsc`, lint, `npm test` y `npm run build` en verde

## Cómo probar
1. Entrar con un usuario `admin` y abrir `/admin/paquetes`: debe verse el operador en cada fila.
2. "Editar" en "Machu Picchu Mágico" → "Guardar cambios": vuelve a la lista.
3. "Pasar a borrador" y luego "Publicar" sobre el mismo paquete.
4. `/admin/ofertas`: crear una oferta sobre cualquier paquete y borrarla.
5. `/admin/paquetes/no-es-un-uuid/editar`: debe dar 404. Con rol `organizer`, `/admin/*` redirige a `/`.

## Revisión
- Reviewer: APPROVED (3 observaciones menores, sin cambios de código)
- lint ✓ · tsc ✓ · `npm test` ✓ (1051 pasan; los de BD corridos aparte contra Neon de desarrollo) · build ✓
- Playwright (puerto 3027, sesión admin): `/admin/paquetes`, `/admin/paquetes/[id]/editar`, `/admin/ofertas`, `/admin/paquetes/<id inválido>/editar`; escritorio y 390×844. Sin errores de consola.
