# 039 — packages-fidelity

- Spec: `docs/specs/shared/design-fidelity.md` (T2)
- Rama: `039-packages-fidelity`

## Qué se hizo
Se rehace la presentación de `/paquetes` para parecerse al tablero `Explorar.dc.html`: hero con carrusel de destacados, filtros laterales, orden en un selector y grilla de tarjetas 4:5.

## Cambios
- `modules/packages/components/`: `packages-listing`, `package-filters`, `package-grid`, `listing-skeleton`, `package-sort` (nuevo)
- `changelog/039-packages-fidelity.md`, `docs/prs/039-packages-fidelity.md`

## Criterios de aceptación
- [x] Hero a todo ancho con el header superpuesto, miga, h1 y tarjeta "Destacado" (1280 y 390 px)
- [x] Carrusel con pestañas, pausa, anterior y siguiente (1280 y 390 px)
- [x] Aside de filtros a la izquierda y grilla de tarjetas 4:5 con descripción y precio (1280 px)
- [x] A 390 px el hero se apila sin desbordes
- [ ] Cambiar el orden con el nuevo `<select>` y conservar los filtros: sin probar
- [ ] Autoavance, movimiento reducido, foco, contraste y medidas finas: sin medir
- [ ] `npm run build`: no se corrió

## Cómo probar
1. `npm run dev` y abrir `/paquetes` a 1280 y 390 px.
2. Elegir filtros y cambiar "Ordenar por"; la URL conserva los filtros.

## Notas
- Etiquetas de pestaña con el título completo porque el DTO no trae nombre corto.
- Se anula localmente el `min-h-[340px]` de `HeroCarousel` con una clase; lo limpio sería una prop en el componente compartido.
- Varias tarjetas se ven sin foto: son paquetes del seed sin portada, no un error de esta tarea.

## Revisión
- Reviewer: n.a. (no se corrió el agente `reviewer`)
- lint ✓ · tsc ✓ · tests ✓ (128) · Playwright: `/paquetes` a 1280 y 390 px

🤖 Generated with [Claude Code](https://claude.com/claude-code)
