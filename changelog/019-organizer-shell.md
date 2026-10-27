# 019 — organizer-shell

- Fecha: 2026-10-26
- Spec: `docs/specs/organizers/organizer-shell.md`
- PR: `docs/prs/019-organizer-shell.md`

## Resumen
Shell del panel del operador: sidebar lateral en escritorio y barra superior con drawer en móvil. La página `/operador` muestra el perfil de la empresa en solo lectura (razón social, RUC, WhatsApp y estado). Un aviso aparece en todo el panel cuando el estado es `pending` o `suspended`, sin bloquear nada. Un operador sin fila en `organizers` ve un estado vacío.

## Cambios
- `app/(organizer)/layout.tsx` — reemplaza el stub: `OrganizerShell` con `<Suspense><OrganizerStatusNotice/></Suspense>` y `children`.
- `app/(organizer)/operador/page.tsx` — página del perfil (`metadata.title = "Panel del operador"`).
- `modules/organizers/` — módulo nuevo: tipos, `getOrganizerByClerkId`, `getCurrentOrganizer` (`React.cache` + `requireRole`), `getOrganizerNotice`, `ORGANIZER_NAV_LINKS` e `isActiveNavLink`, y los componentes `OrganizerShell`, `OrganizerNav` (client), `OrganizerStatusNotice` y `OrganizerProfileCard`.
- `components/ui/sheet.tsx` — `npx shadcn@latest add sheet` (base-ui); `button.tsx` no se tocó.
- `docs/specs/organizers/organizer-shell.md` — spec aprobada.

## Pendiente
- El sidebar tiene un solo link ("Perfil"): hoy no existen `/operador/paquetes`, `salidas`, `reservas` ni `ofertas`. Cada tarjeta de esas páginas suma su línea en `ORGANIZER_NAV_LINKS`.
- El perfil es solo lectura; la edición no está en la tarjeta.
- La fila de `organizers` la crea la tarjeta 030 (activar operadores); acá no se crea.
- Un `admin` sin fila en `organizers` que entra a `/operador` ve el estado vacío en lugar de ser redirigido.
- `#A9BAB7` (texto del sidebar) está fijo en `organizer-nav.tsx`; extraer a token si `(admin)` necesita un shell oscuro.
- `OrganizerNavSectionLabel` vive en un archivo `"use client"`; impacto despreciable.
