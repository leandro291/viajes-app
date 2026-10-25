# 034 — design-type-scale

- Spec: n.a. (BUILD)
- Rama: `034-design-type-scale`

## Qué se hizo
Se corrige la escala tipográfica global para que coincida con el artefacto de diseño y se agrega `SectionHeading`. Es la base que usa la spec de fidelidad de diseño (035).

## Cambios
- `app/globals.css` — `h1` base `clamp(42px, 6.5vw, 84px)` y `h2` base `clamp(32px, 4vw, 48px)`, peso 800.
- `docs/DESIGN-SYSTEM.md` — nueva tabla de tipografía con la escala del artefacto.
- `components/shared/section-heading.tsx` — nuevo componente (etiqueta naranja + `h2` + slot de acciones).
- `modules/home/components/whatsapp-cta.tsx` — `text-2xl` para no cambiar el tamaño de su `h2`.
- `changelog/034-design-type-scale.md`, `docs/prs/034-design-type-scale.md`

## Criterios de aceptación
- [x] `h1` y `h2` renderizan en peso 800 (comprobado en `/paquetes`: h1 y h2 con peso 800; el `h1` del inicio medía 400 antes del cambio)
- [x] El `h2` de la sección de WhatsApp mantiene su tamaño anterior
- [x] `npm test` pasa (128 tests)
- [ ] Revisión en móvil (390 px): no se pudo, Playwright estaba ocupado por otra sesión

## Cómo probar
1. `npm run dev` y abrir `/paquetes`: los títulos se ven en peso 800.
2. Abrir `/`: el bloque "¿Quieres un viaje a tu medida?" se ve igual que antes.

## Notas
- `SectionHeading` no tiene usos todavía; los trae la spec 035.
- Los títulos de las pantallas existentes no cambian de tamaño porque llevan clases propias.

## Revisión
- Reviewer: n.a. (BUILD)
- lint ✓ · tsc ✓ (tras `next typegen`) · tests ✓ (128) · Playwright: `/paquetes` en escritorio; móvil no revisado

🤖 Generated with [Claude Code](https://claude.com/claude-code)
