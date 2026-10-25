# 034 — design-type-scale

- Fecha: 2026-10-25
- Spec: n.a. (BUILD, 4 archivos de código y docs)
- PR: `docs/prs/034-design-type-scale.md`

## Resumen
La escala tipográfica global pasa a la del artefacto: `h1` base `clamp(42px, 6.5vw, 84px)` y `h2` base `clamp(32px, 4vw, 48px)`, ambos en peso 800. Se agrega `SectionHeading` (etiqueta naranja + `h2` + acciones) para reusar en las pantallas.

## Cambios
- `app/globals.css` — `h1` y `h2` base con la escala del artefacto y peso 800 (antes caía a 400 por el reset de Tailwind).
- `docs/DESIGN-SYSTEM.md` — tabla de tipografía con h1 base, h1 grande por pantalla, h1 compacto, h2 de sección y de bloque, títulos de tarjeta y etiqueta de sección.
- `components/shared/section-heading.tsx` — nuevo `SectionHeading`; todavía sin usos.
- `modules/home/components/whatsapp-cta.tsx` — `text-2xl` en el `h2` para conservar su tamaño actual.

## Pendiente
- Las pantallas existentes (Inicio, Paquetes, Detalle) aún usan tamaños propios; se alinean con la spec `design-fidelity` (035).
- Revisión en móvil sin hacer (Playwright ocupado por otra sesión).
