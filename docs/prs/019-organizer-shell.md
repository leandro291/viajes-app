# 019 — organizer-shell

- Spec: `docs/specs/organizers/organizer-shell.md`
- Rama: `019-organizer-shell`

## Qué se hizo
Shell del panel del operador (`(organizer)`) con navegación lateral, y la página `/operador` con el perfil de la empresa en solo lectura. Aviso en todo el panel si el estado es `pending` o `suspended`.

## Cambios
- `app/(organizer)/layout.tsx` — `OrganizerShell` + aviso en `Suspense` + `children` (antes era un stub).
- `app/(organizer)/operador/page.tsx` — perfil del operador.
- `modules/organizers/**` — módulo nuevo (servicio, utils, componentes, `index.ts`) con tests de `getOrganizerNotice`, `isActiveNavLink` y `getOrganizerByClerkId`.
- `components/ui/sheet.tsx` — componente shadcn para el drawer móvil.
- `docs/specs/organizers/organizer-shell.md` — spec aprobada.

## Criterios de aceptación
- [x] AC1: el shell muestra logo, "Gestión", "Perfil" con `aria-current` y `UserMenu`
- [x] AC2: el sidebar solo enlaza páginas existentes (hoy solo "Perfil")
- [x] AC3: sidebar de 264 px en escritorio; en móvil barra superior + drawer que cierra al elegir un link
- [x] AC4: perfil en solo lectura con razón social, RUC, WhatsApp y `StatusBadge`
- [x] AC5: aviso `pending`/`suspended` en todas las páginas del panel, sin bloquear; `active` sin aviso
- [x] AC6: sin fila en `organizers` hay estado vacío, sin error y sin crear la fila
- [x] AC7: `getOrganizerByClerkId` devuelve el perfil o `null` (test contra la DB real)
- [x] AC8: `getOrganizerNotice(status)`
- [x] AC9: `isActiveNavLink` (`/operador` solo en ruta exacta)
- [x] AC10: accesibilidad (`<nav aria-label>`, objetivos de 44 px, foco visible, íconos `aria-hidden`), revisada por el reviewer
- [x] AC11: tsc, lint y tests en verde

## Cómo probar
1. `npm run dev` e iniciar sesión con un usuario con rol `organizer` (o `admin`) en Clerk.
2. Abrir `/operador`: sidebar con "Perfil" y la tarjeta "Datos de la empresa".
3. Sin fila en `organizers`: estado vacío. Con fila en `pending` o `suspended`: aviso amarillo o rojo; con `active`: sin aviso.
4. Achicar a 390 px: el sidebar pasa a barra superior con botón "Abrir menú"; elegir "Perfil" cierra el drawer.
5. `npm test` (con `DATABASE_URL` para el test de servicio).

## Revisión
- Reviewer: APPROVED (4 hallazgos menores, ninguno bloquea; el de AC7 sin DB se resolvió corriendo el test con la DB real)
- lint ✓ · tsc ✓ · tests ✓ (`modules/organizers`: 12/12 con DB) · Playwright: `/operador` en 1280×800 y 390×844 con estados vacío, `pending`, `suspended` y `active`, 0 errores de consola
