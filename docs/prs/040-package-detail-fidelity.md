# 040 — package-detail-fidelity

- Spec: `docs/specs/shared/design-fidelity.md` (T3)
- Rama: `040-package-detail-fidelity`

## Qué se hizo
Se rehace la presentación del Detalle del paquete para parecerse al tablero (`Paquete.dc.html`): hero a todo el ancho, panel de reserva fijo montado sobre él y secciones con la escala tipográfica nueva.

## Cambios
- `modules/packages/components/`: `package-detail`, `package-gallery`, `booking-panel`, `package-facts`, `package-itinerary`, `package-inclusions`, `mobile-booking-bar`, `detail-skeleton`
- `changelog/040-package-detail-fidelity.md`, `docs/prs/040-package-detail-fidelity.md`

## Criterios de aceptación
- [x] Hero a todo el ancho con el header superpuesto, miga y título grande (1280 y 390 px)
- [x] Panel de reserva a la derecha, montado sobre el hero, con fecha, viajeros, total y CTA (1280 px)
- [x] Itinerario, incluye / no incluye y cancelación con el estilo del tablero (1280 y 390 px)
- [x] En 390 px el panel queda tras los datos clave, sin solapa, y aparece la barra móvil
- [ ] Medidas finas, contraste y foco: sin medir
- [ ] Comparación lado a lado con el tablero: solo por código y a ojo
- [ ] `npm run build`: no se corrió

## Cómo probar
1. `npm run dev` y abrir `/paquetes/machu-picchu-magico` a 1280 y 390 px.
2. Cambiar fecha y número de viajeros y comprobar el total.

## Notas
- Desvío: los controles del hero van a la izquierda del panel en escritorio, porque el tablero los deja tapados.
- Copy corregido en la nota del panel ("a las 06:00. Puedes cancelar…").
- Una miniatura (`seed/tren.jpg`) no cargó durante la prueba en dev; es un dato del seed, no del código de esta tarea.

## Revisión
- Reviewer: n.a. (no se corrió el agente `reviewer`)
- lint ✓ · tsc ✓ · tests ✓ (128) · Playwright: `/paquetes/machu-picchu-magico` a 1280 y 390 px

🤖 Generated with [Claude Code](https://claude.com/claude-code)
