# 038 — home-fidelity

- Spec: `docs/specs/shared/design-fidelity.md` (T1)
- Rama: `038-home-fidelity`

## Qué se hizo
Se rehace la presentación del Inicio para parecerse al tablero `Main.dc.html`, usando el marco (T0), el carrusel compartido (T0b) y la escala tipográfica (034).

## Cambios
- `modules/home/components/`: `home-page`, `search-form`, `trust-strip`, `package-rail`, `destination-bento`, `why-wayra`, `whatsapp-cta`, `photo-credits`; se elimina `hero-carousel`
- `changelog/038-home-fidelity.md`, `docs/prs/038-home-fidelity.md`

## Criterios de aceptación
- [x] Hero a todo el ancho con el header superpuesto, chip de región, título grande, botón terracota, botón fantasma y tarjeta "Siguiente" (1280 px)
- [x] Buscador de 4 campos montado sobre el hero y franja de ✓ debajo (1280 px)
- [x] Rail de paquetes, bento con flechas y collage en "Por qué Wayra" (1280 px)
- [x] A 390 px el hero, las pestañas y el buscador se apilan sin desbordes
- [ ] Hover del bento, selectores nativos, autoavance y movimiento reducido: sin probar
- [ ] Contraste sobre foto, foco y medidas finas: sin medir
- [ ] `npm run build`: no se corrió

## Cómo probar
1. `npm run dev` y abrir `/` a 1280 y 390 px.
2. Pasar el carrusel con "Siguiente" y probar el buscador (envía a `/paquetes`).

## Notas
- Enlaces del bento: van a `/paquetes?destino=<slug>` porque `/destinos/<slug>` aún no existe.
- Texto de WhatsApp: se quitó "Te respondemos el mismo día" por no poder verificarse.
- En una carga se vio un aviso de hidratación por `caret-color` en el input de fecha; no se reprodujo en la segunda carga y parece de la extensión o del navegador, sin confirmar.
- Algunas fotos tardaron en cargar en dev (el optimizador atiende en frío); las URL responden 200 al pedirlas directo.

## Revisión
- Reviewer: n.a. (no se corrió el agente `reviewer`)
- lint ✓ · tsc ✓ · tests ✓ (128) · Playwright: `/` a 1280 y 390 px

🤖 Generated with [Claude Code](https://claude.com/claude-code)
