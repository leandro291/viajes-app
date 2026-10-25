# 003 — design-foundation

- Fecha: 2026-10-25
- Spec: `docs/specs/shared/design-foundation.md`
- PR: `docs/prs/003-design-foundation.md`

## Resumen
Base visual de Wayra: tokens del sistema de diseño en `globals.css`, fuentes, encabezado y pie, los cuatro grupos de rutas por rol y los componentes base. El inicio es un placeholder con un bloque de muestra descartable.

## Cambios
- `app/globals.css` — tokens `@theme` (colores, radios, sombras, estados), variables shadcn mapeadas, foco global, `prefers-reduced-motion`, sin tema oscuro.
- `app/layout.tsx` — Bricolage Grotesque y DM Sans, `lang="es"`, metadata.
- `components/shared/` — `WayraLogo`, `SiteHeader`, `SiteFooter`, `SITE_LINKS`, `StatusBadge`.
- `components/ui/` — `button` (variante `cta`, objetivos de 44 px), `badge`, `switch`, `input`, `field`, `label`, `separator`.
- `app/(public)`, `(customer)`, `(organizer)`, `(admin)` — layouts; `(public)/page.tsx` placeholder; se borra `app/page.tsx`.
- `docs/DESIGN-SYSTEM.md` — foco accesible (D6).

## Pendiente
- Los links `/paquetes`, `/tours` y `/ofertas` dan 404 hasta sus specs.
- Comparar encabezado y pie con el artefacto de diseño (no se pudo leer al escribir la spec).
- Tamaños `xs`/`sm` de `button` y `sm` de `switch` quedan bajo 44 px; sin uso hasta ahora.
- El bloque de muestra del inicio lo reemplaza la spec de Inicio.
