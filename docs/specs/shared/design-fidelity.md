# Design fidelity (Inicio, Paquetes, Detalle)

- Module: shared
- Status: approved
- Approved by: Leandro Rojas (2026-10-25)
- Mode: SDD
- Enmienda (2026-10-25): `Owns` de T0 ampliado con `components/shared/wayra-logo.tsx` (tamaño del logo en header y pie, AC2/AC3), aprobado por Leandro Rojas.

## Goal
Acercar las tres pantallas ya construidas (Inicio `/`, Paquetes `/paquetes`, Detalle `/paquetes/[slug]`) al artefacto de diseño aprobado de Wayra (https://claude.ai/artifact/GgfxectTG6a6hFmZmc5Xmj): mismo marco (encabezado superpuesto sobre un hero a todo el ancho), mismas medidas, mismas piezas. Sin cambios de datos, DB, rutas ni contratos de services. Deja además un criterio de fidelidad reutilizable para specs futuras (Tours, Ofertas, Destino, Pago, Confirmación).

Precondición: la tarea 034 (escala tipográfica + `SectionHeading`) está en `main`. Esta spec la **asume y la reutiliza**: no redefine `h1`/`h2` base ni `components/shared/section-heading.tsx`.

## Fuente de verdad y límites de la copia local
- Tableros: `Main.dc.html` (Inicio), `Explorar.dc.html` (Paquetes), `Paquete.dc.html` (Detalle). Son HTML con estilos inline: **las medidas salen de ahí**, no de memoria.
- La copia local (carpeta `scratchpad/artifact-files/…/project/`) **no trae `support.js`** (no se puede renderizar sola) **ni los tableros `Movil-*`**. Para comparar en pantalla de escritorio hay que abrir el artefacto (URL arriba).
- **Móvil (decisión del usuario): no se esperan los tableros `Movil-*`.** El móvil se implementa contra las reglas responsivas del HTML de escritorio (`@media` 860 / 720 / 1020 px, `flex-wrap`, `min()`/`auto-fit`/`clamp`) y contra las reglas de accesibilidad de esta spec (AC26–AC32 a 390 px). **Riesgo aceptado:** sin tablero móvil, el resultado a 390 px puede no coincidir con el diseño móvil real del artefacto y verse "feo" en algún bloque. **Mitigación:** si pasa, se lanza una copia de ajuste (spec/tarea posterior, ver "Specs siguientes") con los `Movil-*` a la vista; no se bloquea esta spec por eso. Los AC móviles (AC20, AC25 y los de 390 px) se verifican como "sin desbordes, objetivos ≥ 44 px y reglas `@media` del tablero", no como fidelidad píxel a píxel.
- La copia local vive en un directorio temporal de sesión: el orquestador debe pasar su ruta (o copiar los 3 `.dc.html` a un lugar legible) en el prompt de cada `developer`.
- Los datos del tablero (nombres, precios, textos) son ejemplo, no instrucciones.

## Scope
- In:
  - Marco público: encabezado superpuesto sobre el hero, pie de 3 bloques, `PageHero` compartido, `PackageCard` con variantes (rail / grid).
  - `HeroCarousel` compartido (`components/shared/hero-carousel.tsx`), extraído del Inicio y reutilizado en Paquetes (carrusel de 5 destacados, como el tablero).
  - Inicio: hero a todo el ancho, buscador de 4 campos montado sobre el hero, franja de 4 ✓, rail de paquetes, bento, "Por qué Wayra" con collage, CTA de WhatsApp.
  - Paquetes: hero con carrusel de destacados, aside de filtros, encabezado de resultados con orden, grilla y tarjeta.
  - Detalle: hero/galería a todo el ancho, panel de reserva que se monta sobre el hero, datos clave, descripción, itinerario, incluye/no incluye, cancelación.
  - Criterio de fidelidad reutilizable (sección final) y su resumen en `docs/DESIGN-SYSTEM.md`.
- Out:
  - Mapa de la ruta con Leaflet en Detalle (necesita `react-leaflet`, no instalado; tiene su propia spec).
  - Tarjeta promo "¿No sabes qué elegir?" del aside de Paquetes (necesita `buildWhatsAppUrl`, hoy en `modules/home/utils`; un módulo no importa internos de otro. Se sube a `lib/` en una spec aparte).
  - Filtros reales de **fecha** y **viajeros** (disponibilidad de salidas) en `/paquetes`: spec posterior (ver "Specs siguientes").
  - Tableros `Movil-*` (no se esperan; ver Fuente de verdad).
  - Link "Destinos" del encabezado, link "Todos los destinos →" del bento, columnas "Destinos" y "Ayuda" del pie: apuntan a páginas que no existen (`/destinos`, FAQ, políticas) y dejarían enlaces muertos.
  - Menú hamburguesa, selector de moneda funcional, tema oscuro, pantallas Tours/Ofertas/Destino/Pago/Confirmación/Admin.
  - Cambios en services, DTOs, `lib/db`, rutas, caché, dependencias nuevas.
  - Tests e2e persistentes (la verificación visual es Playwright ad hoc, como en 003/007/008/009; no entra al repo).

## Decisiones a aprobar
- **D1. Hero a todo el ancho (reemplaza D4 de `home.md`).** D4 había encerrado el hero en una tarjeta redondeada para no tocar el layout. Acá se cambia el layout: una página que renderiza `PageHero` marca `data-page-hero`; el layout lo detecta con CSS (`:has()`) y entonces `main` queda sin `max-width` ni `px` (cada sección pone su contenedor `max-w-[1240px] px-6`) y el encabezado pasa de "sólido en flujo" a "transparente `absolute` sobre la foto". Sin `data-page-hero` (404, páginas futuras sin hero) todo queda como hoy: encabezado sólido `bg-dark` y `main` con contenedor. Así cada fase deja la app consistente y no hace falta un `not-found.tsx` nuevo. Sin `100vw`: el ancho completo sale del flujo normal, sin scroll horizontal.
- **D2. `PackageCard` lo toma la tarea de marco (T0), no Paquetes (T2).** Lo usan el rail del Inicio (T1) y la grilla de Paquetes (T2); asignarlo a una sola tarea evita archivos compartidos. Prop nueva `variant: "rail" | "grid"` (default `"rail"`): el rail no cambia de llamada; T2 pasa `variant="grid"` y `blurb`.
- **D3. Un solo `PageHero` presentacional** (`components/shared/page-hero.tsx`) para Inicio, Paquetes y Detalle: foto de fondo (slot), gradiente único, espacio reservado bajo el encabezado, contenedor de 1240/24. Los tres tableros usan el mismo marco; sólo cambian `min-height` (720 / 600 / 660) y el padding inferior. Será la base de Tours/Ofertas/Destino/Confirmación.
- **D4. Copy veraz gana al tablero** (ya resuelto por el usuario en 007 Q1): no se promete Yape/Plin/PagoEfectivo ni correo/WhatsApp automáticos (SYSTEM-DESIGN: fuera de v1). Franja ✓: "Paga con tarjeta" (sin Yape/Plin). "Por qué Wayra" conserva los 4 beneficios actuales; del tablero se toman estructura, eyebrow y título.
- **D5. Una sola acción principal accent por vista, con una excepción deliberada.** Regla (DESIGN-SYSTEM): en cualquier posición de scroll, el viewport no muestra dos botones `accent` con destinos distintos. Un mismo destino repetido (panel "Reservar ahora" + barra móvil "Reservar") cuenta como uno. **Excepción deliberada, decidida por el usuario (Q1), sólo para la primera pantalla del Inicio:** el CTA del hero "Ver paquete" y el "Buscar" del buscador son ambos `accent` (`#C2410C`), exactamente como `Main.dc.html`. Esto reemplaza lo que esta spec proponía en borrador (Buscar en `ink`) y no se extiende a otras pantallas. El resto de las vistas cumple la regla. El CTA de WhatsApp (sección lejana al hero, nunca en el mismo viewport que los otros dos) también es `accent`, como el tablero, y deja sin efecto el "teal no terracota" de 007 Q3.
- **D6. Foco: manda DESIGN-SYSTEM, no el tablero.** El tablero usa `#F59E6B` en todo; sobre claro da ~2:1. Se mantiene `accent` sobre claro y `focus` dentro de `bg-dark`/sobre foto oscura. El encabezado transparente conserva la clase `bg-dark` (anulada con `bg-transparent` en modo hero) para que la regla `.bg-dark *:focus-visible` siga aplicando.
- **D7. Textos del encabezado del tablero (decidido por el usuario, Q4):** "Iniciar sesión" y "Registrarse" (pill blanco). Reemplazan "Ingresar" / "Crear cuenta"; `app/layout.tsx` (localización de Clerk, comentario "mismos textos que el encabezado") se actualiza en la misma tarea.
- **D8. Orden de resultados = `<select>` en el encabezado de la grilla** (como el tablero), con un componente cliente mínimo `PackageSort` (`router.push(buildListingHref(...))`). Reemplaza el grupo "Ordenar" de links del aside. Es el único JS nuevo de Paquetes; sin JS, el orden por URL (`?orden=`) sigue funcionando.
- **D9. Fotos editoriales del Inicio con rutas del seed** (`/seed/par.jpg`, `/seed/uro.jpg` para el collage; `/seed/l69.jpg` para el CTA de WhatsApp), igual que el tablero. Mismo límite que D6 de `home.md`: cuando las fotos pasen a Blob se reubican. `next/image`, `alt` del tablero para las del collage.
- **D10. Pestañas del hero en móvil:** a 390 px las 5 pestañas en la misma fila que los 3 controles quedarían de ~26 px de ancho (< 44 px). En < 640 px la fila de pestañas ocupa todo el ancho y los controles bajan a su propia fila. Desvío mínimo del tablero para cumplir el objetivo táctil.
- **D11. Botón de WhatsApp sobre foto = pill `accent`** como el tablero (D5: no comparte viewport con otros `accent`). Aprobado por el usuario con alcance **solo de estilo**: no se toca su comportamiento, conserva el enlace actual (`WhatsAppCta({ href })`, `NEXT_PUBLIC_WHATSAPP_NUMBER`).
- **D13. Carrusel de destacados también en Paquetes (decidido por el usuario, Q3), con un `HeroCarousel` compartido.** El carrusel del Inicio se extrae a `components/shared/hero-carousel.tsx` (cliente) y lo usan Inicio y Paquetes. Va en una **tarea propia (T0b)**, no en T0 (T0 ya tiene 9 archivos) ni en T1/T2 (sería archivo compartido): T0b lo crea sin tocar el Inicio; T1 migra `home-page.tsx` al componente compartido y borra el viejo `modules/home/components/hero-carousel.tsx`; T2 lo usa en Paquetes. Los tableros difieren en detalles que se resuelven con props, no con dos componentes: Inicio muestra tarjeta "Siguiente" y contenido por slide (chip, título, texto, botones); Paquetes muestra una tarjeta "Destacado" por slide y un bloque estático arriba (miga, `h1`, subtítulo); intervalo 6.5 s (Inicio) vs 6 s (Paquetes). **Desvío de a11y (F5):** Paquetes agrega el botón pausa/reanudar que el tablero no trae (WCAG 2.2.2: contenido que avanza solo debe poder pausarse).
- **D14. Móvil sin tableros `Movil-*` (decisión del usuario).** Ver "Fuente de verdad": se implementa contra las `@media` del HTML de escritorio; si queda mal se lanza una copia de ajuste. Riesgo registrado, no bloquea.
- **D12. Datos que dependen del contenido real se conservan** aunque el tablero (ejemplo con un solo mes) los omita: la línea de mes bajo cada fecha del panel y la miga "Inicio / Paquetes / <título>" (D7 de `package-detail.md`). El precio de la tarjeta de grilla mantiene "/ persona" (el tablero lo omite en la grilla; la unidad no se pierde).

## Reuse
- Reuse: `components/shared/section-heading.tsx` (034) — eyebrow + h2 + acciones en Inicio (rail, bento) y Detalle ("El viaje"). Sólo se consume; si le falta algo, se anota como pregunta, no se edita aquí.
- Reuse: `components/shared/site-links.ts`, `wayra-logo.tsx` — links y logo (el logo ya es círculo `accent` + montaña; sólo se ajusta tamaño a 34 px / texto 28 px si no coincide).
- Reuse: `components/ui/button.tsx` (`cta`, `render={<Link/>}`, `icon-lg` = 48 px), `native-select.tsx`, `lucide-react` (`MapPin`, `ArrowRight`, `ArrowUpRight`, `Check`, `Clock`, `Search`, `CalendarDays`, `Users`), `next/image`, `cn`, `formatPen`, `formatDuration`.
- Reuse: `modules/home/utils/*` (`category-chips`, `whatsapp`) y sus tests — sin cambios.
- Reuse: `modules/packages/utils/package-filters.ts` (`buildListingHref`, `SORT_OPTIONS`, `DURATION_OPTIONS`) y `package-detail.ts` — lógica de URL intacta; sólo cambia la presentación.
- Reuse: `getFeaturedPackages` (export público de `@/modules/packages`) para el hero de Paquetes: dato ya cacheado, sin service nuevo.
- Reuse: keyframe `wy-fill` de `globals.css` (barra de progreso del hero).
- Extend: `components/shared/site-header.tsx`, `site-footer.tsx` — de barra sólida a modo superpuesto + pie de 3 bloques.
- Extend: `modules/packages/components/package-card.tsx` — variantes.
- Extend: `modules/home/components/hero-carousel.tsx` — su lógica (temporizador JS, pausa por hover/foco/usuario, reduced motion, índice) se **mueve** a `components/shared/hero-carousel.tsx` (D13); el archivo viejo lo borra T1 al migrar `home-page.tsx`.
- Extend: `modules/home/components/*`, `modules/packages/components/*` (listados en el Plan) — sólo presentación.
- Extend: `app/globals.css` — keyframe `wy-up` (entrada del texto del hero, `.8s`, 22 px; DESIGN-SYSTEM sólo define una entrada genérica de 10 px / .4 s). Nada más: sin tokens nuevos; los radios del tablero sin token (20, 22, 24, 26, 32) se usan como valor arbitrario `rounded-[22px]` (precedente: `package-itinerary.tsx`).
- New: `components/shared/page-hero.tsx` — ver D3; ningún componente existente envuelve un hero.
- New: `components/shared/hero-carousel.tsx` — dos pantallas lo necesitan (Inicio y Paquetes); hoy vive en `modules/home` y un módulo no importa internos de otro (y `components/shared` no puede importar de módulos), así que se extrae y se hace genérico (D13).
- New: `components/shared/site-nav.tsx` — cliente mínimo (`usePathname`) sólo para `aria-current` + subrayado del link activo; mantiene `SiteHeader` como Server Component.
- New: `modules/packages/components/package-sort.tsx` — ver D8.
- No se agregan dependencias (Playwright se usa ad hoc).

## Acceptance criteria
Todas se verifican con Playwright a **1280×800** y **390×844** (`getComputedStyle` / `getBoundingClientRect`) comparando contra el tablero; tolerancia: ±1 px en medidas fijas, misma fórmula en medidas fluidas (`clamp`), color exacto cuando hay token. "Tablero" = HTML citado en Fuente de verdad.

### Marco (T0)
- AC1: En una página con `[data-page-hero]`, el `<header>` es `position:absolute` arriba, fondo transparente, por encima de la foto (z mayor), y no ocupa espacio en el flujo. En una página sin hero (probar con un slug inexistente → 404) el header es sólido `#0B1513` y está en flujo; `main` conserva su contenedor 1240/24.
- AC2: Contenido del header (1280): logo círculo `accent` 34 px + "Wayra" Bricolage 28 px/800, tracking −0.03em; nav `flex:1` con gap ~30 px; links 16 px/500, alto ≥ 44 px; el link de la sección actual lleva `aria-current="page"`, peso 700 y subrayado inset 2 px color `focus` (Paquetes en `/paquetes` y en `/paquetes/[slug]`); `PEN · S/` no interactivo; "Iniciar sesión" (15 px/700, sin fondo) y "Registrarse" (pill blanco, texto `ink`, 15 px/700, padding 12×22, hover fondo `accent-soft`), ambos ≥ 44 px de alto. A 390 px envuelve (logo, nav, botones) sin cortar texto ni scroll horizontal.
- AC3: Pie: fondo `#0B1513`, texto `#C9D6D4` (contraste ≥ 4.5:1), 3 bloques con wrap (marca + frase "Paquetes y tours por todo el Perú, con operadores locales y soporte en español." / "Explorar" con `SITE_LINKS` / "Medios de pago": "Visa · Mastercard"), padding `64/24/36`, separador `rgba(255,255,255,.12)` y línea legal "© Wayra Perú." Links ≥ 44 px de alto. Sin columnas "Destinos" ni "Ayuda" (Out).
- AC4: `PageHero` renderiza `<section data-page-hero>` a todo el ancho del viewport (`scrollWidth <= clientWidth` a 390 y 1280), `bg-dark`, `overflow-hidden`, con el gradiente del tablero (inferior `.92 → .55 → .08` + superior `.6 → 0` en 180 px), contenido en contenedor 1240/24 alineado abajo y espacio superior que evita que el contenido choque con el header (las cajas de header y de contenido no se intersectan a 390 ni a 1280).
- AC5: `PackageCard` `variant="rail"`: foto `aspect-[4/5]` radio 22; chip de tipo arriba-izquierda (fondo blanco, 13 px/700, padding 7×12, pill) y chip de duración abajo-izquierda (fondo `rgba(11,21,19,.78)`, texto blanco, ícono reloj 14); debajo, sin fondo ni sombra de tarjeta: lugar `primary` 14 px/700, título Bricolage 22 px/700, lh 1.15, tracking −0.015em, precio "Desde **S/ X** / persona" (15 px muted, importe 19 px `ink`); hover: imagen `scale(1.06)` en .5 s. `variant="grid"`: foto `aspect-[4/3.4]` radio 22, mismos chips, más `blurb` (15 px muted, lh 1.5) y fila final con precio + círculo de 40 px con flecha (borde 1.5 `border-strong`; en hover de la tarjeta fondo `accent`, texto blanco). Toda la tarjeta es un solo `<a>`; `alt` de la foto = título.
- AC6: `docs/DESIGN-SYSTEM.md` incluye el criterio de fidelidad (sección final de esta spec, resumido), la escala de radios observada (12/14/16/18/20/22/24/26/28/32) y la regla "encabezado superpuesto + `PageHero`".

### Carrusel compartido (T0b)
- AC35: `components/shared/hero-carousel.tsx` (cliente) sobre `PageHero` implementa, con props y sin lógica de dominio, todo el comportamiento de AC8 (pestañas con barra de progreso, controles pausa/anterior/siguiente de 48 px, tarjeta "Siguiente" opcional, temporizador JS con pausa por hover/foco/usuario, reduced motion en pausa, swipe > 50 px, solapa de 60 px reservada con `contentClassName`, `aria-roledescription="carrusel"`, sólo el slide activo monta su `content`). Acepta `intervalMs` (default 6500). Con 0 slides renderiza `null`; con 1, sin pestañas ni controles ni "Siguiente". No importa nada de `@/modules/*`. Verificable en aislamiento con una página temporal (no versionada) con slides de muestra, a 1280 y 390.

### Inicio (T1)
- AC7 (hero, 1280; usa el `HeroCarousel` compartido de AC35, T1 sólo aporta slides y contenido): sección a todo el ancho, alto ≥ 720 px; un único `<h1>` en la página = título del slide activo (se elimina el `h1` `sr-only` y el `<p>` de título), Bricolage 800, `clamp(48px,8vw,104px)` (≈102 px a 1280, 48 px a 390), lh .92, tracking −0.045em, `text-wrap: balance`; chip de región (pill `rgba(255,255,255,.14)`, borde `rgba(255,255,255,.28)`, ícono `MapPin` 14, 14 px/700 mayúsculas .08em); subtítulo `clamp(17px,1.6vw,20px)`, lh 1.5, `white/90`, máx. 520 px; CTA `accent` "Ver paquete · desde S/ X" con flecha 18 (16 px/700, padding 16×26) y botón fantasma "Todos los paquetes" → `/paquetes` (borde 1.5 `white/70`, 16 px/700, padding 15×24, hover `white/16`). El texto entra con `wy-up` (.8 s; con reduced motion, sin animación).
- AC8 (hero, controles y comportamiento): tarjeta "Siguiente" a la derecha (≥ 861 px; oculta por debajo): miniatura 92×68 radio 12, etiqueta "Siguiente" 12 px/700 mayúsculas, título 19 px/700 Bricolage, radio 20, borde `white/28`, fondo `rgba(8,14,13,.42)` con blur; es un `<button>` que avanza. Pestañas `role="tablist"` (una por slide, `aria-selected`, `aria-label` "Ver <título>"): barra de 3 px `white/30` con relleno (completadas 100 %, activa animada `wy-fill` 6.5 s), etiqueta 14 px (activa 700 blanca, resto 500 `white/72`, `nowrap` + ellipsis; oculta < 720 px). Controles pausa / anterior / siguiente: círculos de 48 px, borde 1.5 `white/60`, hover fondo blanco y texto `ink`, `aria-label` "Pausar/Reanudar carrusel", "Destino anterior", "Destino siguiente". Visibles también a 390 px (D10: pestañas a ancho completo, controles en otra fila). Avance automático cada 6.5 s por temporizador JS (D9 de `home.md`), en pausa con hover/foco/usuario; con `prefers-reduced-motion` arranca en pausa. Swipe horizontal > 50 px cambia de slide (táctil). Con 1 slide: sin pestañas, controles ni "Siguiente".
- AC9 (buscador): contenedor `max-w-[1240px] px-6` con `margin-top:-60px` sobre el hero (z sobre el hero); tarjeta blanca radio 26, padding 12, gap 8, sombra `0 24px 60px rgba(11,21,19,.18), 0 2px 6px rgba(11,21,19,.06)`. 4 controles: "¿A dónde vas?" (`select name="destino"`, "Todo el Perú" + destinos), "Fecha" (`input type="date" name="fecha"`), "Viajeros" (`select name="viajeros"`, "1 adulto"… "4 adultos", por defecto 2) y "Buscar" (submit). Campos: `<label>` envolvente, fondo `sand`, radio 18, padding 12×18, ícono 22 `primary`, caption 12 px/700 mayúsculas .06em `ink-muted`, valor 17 px/500; flex-basis 220 (×2) / 170 / 150 / 140. "Buscar": radio 18, padding 18×24, 17 px/700 con ícono 20, fondo `accent` (hover `accent-hover`) como el tablero: excepción deliberada a la regla de una sola CTA accent, decidida por el usuario (D5, AC30). `GET /paquetes`; sólo `destino` filtra hoy; `fecha` y `viajeros` se envían y `/paquetes` los ignora (decidido, Q2; filtros reales en spec posterior, ver "Specs siguientes").
- AC10 (franja ✓): bajo el buscador, centrada, gap 10×32, padding-top 22, 15 px/500, 4 ítems con `Check` 18 trazo 2.4 `primary`: "Confirmación inmediata", "Cancelación gratis hasta 48 h antes", "Paga con tarjeta", "Soporte en español por WhatsApp" (D4). Reemplaza `TrustStrip` actual.
- AC11 (rail): padding-top 88; `SectionHeading` eyebrow "Lo más reservado" (13 px/700, .1em, `accent`) + h2 "Paquetes para cada viaje"; a la derecha "Ver todos" (`primary`, 700, → `/paquetes`, oculto < 720) y dos círculos de 48 px (borde 1.5 `border-strong`, fondo blanco, hover fondo `ink`/texto blanco); chips de categoría: 15 px/700, padding 11×20, alto ≥ 44, borde 1.5, **activo `ink` con texto blanco** (hoy es `primary`), inactivo blanco con borde `border-strong`; rail con scroll-snap, gap 22, tarjetas `min(290px,76%)`, `PackageCard variant="rail"`, scrollbar oculta.
- AC12 (bento): `SectionHeading` eyebrow "Costa, sierra y selva" + h2 "Elige tu destino"; grilla 4 columnas, gap 16, filas 230 px; 1.º 2×2, 4.º ancho 2; < 720 px: 2 columnas, filas 190, 1.º ancho 2×1. Mosaico radio 24, gradiente inferior `.82 → .25 → 0`, nombre Bricolage 800, lh 1, tracking −0.03em, tamaño 44 / 30 (el ancho) / 26 (resto), "desde S/ X" 14 px `white/88`, círculo blanco de 40 px con `ArrowUpRight` 18 abajo-derecha (`aria-hidden`), padding 20 laterales / 18 abajo; hover: imagen `scale(1.05)` en .6 s. Cada mosaico sigue siendo un solo `<a>`.
- AC13 ("Por qué Wayra"): fila con wrap, gap 56, centrada; izquierda `min-height:520`: foto A (`/seed/par.jpg`) al 78%×82% arriba-izquierda radio 28, foto B (`/seed/uro.jpg`) al 52%×52% abajo-derecha radio 28 con borde 8 px color `bg`; derecha: eyebrow "Por qué Wayra", h2 "Tú eliges la fecha. Del resto nos encargamos." (lh 1.02) y los 4 beneficios actuales en grilla `auto-fit minmax(min(220px,100%),1fr)` gap 26×28: ícono en cuadrado 48 radio 14 `primary-soft`, ícono 24 `primary` trazo 2, título Bricolage 700 20 px, texto `ink-muted` lh 1.55.
- AC14 (CTA WhatsApp): padding 110 arriba / 96 abajo; tarjeta radio 32, `min-height:340`, foto `/seed/l69.jpg` + gradiente horizontal `.9 → .7 (45%) → .15`; contenido máx. 560, padding 56×`clamp(28px,5vw,64px)`, gap 18; h2 `clamp(30px,3.6vw,44px)` 800 lh 1.02 blanco; texto 18 px `white/90`, lh 1.55; botón pill `accent` (hover `accent-hover`) con `MessageCircle` (D11), `target="_blank" rel="noopener noreferrer"`. Sólo se renderiza si hay número de WhatsApp (sin cambios).

### Paquetes (T2)
- AC15 (hero con carrusel, usa el `HeroCarousel` de AC35 con `intervalMs=6000`): alto ≥ 600 px; bloque estático arriba del contenido del slide: miga "Inicio / Paquetes" dentro del hero (14 px, `white/85`, actual blanco 700), `h1` "Paquetes por todo el Perú" con la escala base de 034 (`clamp(42px,6.5vw,84px)`, 800, lh .95) y subtítulo "Traslados, entradas y guía local incluidos. Compara y reserva en minutos." (`clamp(17px,1.6vw,20px)`, máx. 560). Por slide (hasta 5 destacados con portada, `getFeaturedPackages`): tarjeta "Destacado · <región>" que es un link al paquete (miniatura 72×56 radio 12, título 19 px/700 + "· desde S/ X" + flecha 18, radio 20, borde `white/28`, fondo `rgba(8,14,13,.42)` con blur, hover `rgba(8,14,13,.62)`). Debajo, pestañas con barra de progreso (etiqueta = nombre corto del paquete, ellipsis, oculta < 720 px), flechas anterior/siguiente de 48 px y pausa/reanudar (D13). Sin tarjeta "Siguiente". Foto de fondo = portada del slide activo, crossfade y zoom como en el Inicio. Un único `h1` (el estático). Sin destacados: hero `bg-dark` estático sin carrusel.
- AC16 (aside, 1280): `aside`/`nav` "Filtros" `sticky top-6`, ancho `flex 1 1 240` máx. 290 / mín. 230, fondo blanco, radio 24, padding 24, gap 26, `shadow-card`; cabecera "Filtros" Bricolage 800 22 px tracking −0.02em y "Limpiar" (`primary`, 14 px/700, alto ≥ 44) **siempre visible** (deshabilitado visualmente o sin acción si no hay filtros activos: `aria-disabled`, sin `href`); grupos "Tipo de experiencia" y "Duración" con leyenda 13 px/700 mayúsculas .08em `ink-muted`; opciones de alto ≥ 44, padding-x 10, radio 12, hover `sand`, selector circular de 18 px (activo `accent`), texto 16 px (activa 700). "Ordenar" ya no está en el aside (D8).
- AC17 (encabezado de resultados): conteo "N paquetes disponibles" (o "1 paquete disponible") en Bricolage 700 22 px tracking −0.015em, `aria-live="polite"`; a la derecha "Ordenar por" + `<select>` pill (borde 1.5 `border-strong`, fondo blanco, 15 px/700, alto ≥ 44) con Recomendados / Precio: menor a mayor / Precio: mayor a menor; al cambiar navega a la URL equivalente (`?orden=`) sin perder los otros filtros. El chip "Destino: X" con ✕ se conserva.
- AC18 (grilla): `grid-template-columns: repeat(auto-fill, minmax(min(270px,100%),1fr))`, gap 32×24 (tarjetas `variant="grid"`, AC5, con `blurb`); gap aside–contenido 36; sección padding `40/24/96`.
- AC19 (vacío y carga): estado vacío = tarjeta blanca radio 24, padding 56×24, centrado, título Bricolage 800 26 px, texto `ink-muted` y CTA `accent` "Quitar filtros" (alto ≥ 48); `ListingSkeleton` reproduce la grilla y la tarjeta `grid` (misma proporción, sin salto de layout al cargar).
- AC20 (móvil 390; sin tablero `Movil-*`, D14): hero sin desbordes (h1 42 px, miga envuelve, pestañas a ancho completo con controles en otra fila, D10); filtros siguen siendo chips en fila con scroll horizontal (D4 de `package-listing.md`), objetivos ≥ 44 px; grilla de 1 columna; se verifica contra las `@media` de `Explorar.dc.html` y las reglas de accesibilidad; las diferencias visuales que el implementador note se documentan en el PR (insumo de la copia de ajuste).

### Detalle (T3)
- AC21 (hero/galería): `PackageGallery` pasa a hero a todo el ancho con `PageHero` (alto ≥ 660 px, sin tarjeta redondeada); miga dentro del hero ("Inicio / Paquetes / <título>", D12); `h1` Bricolage 800 `clamp(46px,7.5vw,96px)`, lh .92, tracking −0.045em, balance; subtítulo `clamp(17px,1.6vw,20px)` máx. 560; fila inferior: miniaturas 76×56 radio 12 borde 2 (activa blanca, resto `white/25` y opacidad .7, hover `translateY(-2px)`), contador 15 px/700 `min-width:52` y flechas de 48 px (borde 1.5 `white/60`, hover blanco/`ink`). Se conservan crédito de foto, swipe, `aria-roledescription`, y los nombres accesibles actuales. Sin fotos: hero `bg-dark` sin imagen.
- AC22 (cuerpo, 1280): sección padding `48/24/104`, fila con wrap gap 56: columna izquierda `flex 3 1 560` (gap 64) y panel `flex 1 1 340`, máx. 410, mín. 300, `sticky top-6`, z sobre el hero con `margin-top:-140px` sólo ≥ 1021 px (a 1020 o menos, sin solapa). Datos clave: `auto-fit minmax(min(160px,100%),1fr)`, gap 12, tarjetas radio 20, padding 20, sombra `0 1px 2px rgba(11,21,19,.05)`, ícono 24 `accent`, `dt` 12 px/700 mayúsculas .08em, `dd` Bricolage 700 19 px.
- AC23 (secciones): "El viaje" con `SectionHeading` (eyebrow `accent` 13 px/700 .1em); h2 de sección `clamp(30px,3.6vw,42px)`, 800, lh 1, tracking −0.035em ("Qué vas a vivir", "Itinerario día a día", "Incluye" y "No incluye" 26 px/800); párrafo 19 px, lh 1.65, color `#3D4A47`. Itinerario: filas radio 22 con borde 1.5 (abierta `primary`), insignia de día 52 px radio 16, título Bricolage 700 20 px, botón "+" circular 36 px que rota 45° al abrir. Incluye (blanco) / No incluye (arena) radio 24, padding 28, marca en círculo 24; cancelación `primary` radio 24, padding 28, ícono en cuadrado 56 radio 18.
- AC24 (panel de reserva): radio 28, padding 28, gap 22, `shadow-raised`; precio "Desde" + importe Bricolage 800 42 px + "por persona, habitación doble"; insignia "Confirmación inmediata" (`primary-soft`, texto `primary`, 13 px/700, padding 8×12, pill) a la derecha del precio; fechas en grilla de 4, alto ≥ 68, radio 16, borde 1.5 (activa `ink`/blanco), día de semana 12 px/700 y día 22 px/800; viajeros: caja `sand` radio 16 padding 6 con botones de 48 radio 12; desglose con borde punteado, total Bricolage 800 30 px; CTA `accent` "Reservar ahora" + flecha (17 px/700, padding 18×24, pill, ancho completo); nota 13 px `ink-muted` centrada. Misma lógica de URL (`salida`, `viajeros`) y mismos estados (agotado, sin salidas).
- AC25 (móvil 390; sin tablero `Movil-*`, D14, se verifica contra las `@media` de `Paquete.dc.html` y las reglas de accesibilidad): hero sin desbordes; el panel va después de los datos clave (sin solapa sobre el hero); `MobileBookingBar` fija abajo con el mismo destino que el CTA del panel; sin scroll horizontal; objetivos ≥ 44 px.

### Transversales (todas las tareas)
- AC26 (foco): Tab recorre header, hero, controles, filtros, tarjetas y panel; todo foco visible con anillo 3 px offset 3 px (D6: `accent` sobre claro, `focus` sobre foto/`bg-dark`), medido en estilo computado.
- AC27 (objetivos): todo `a`/`button`/`select`/`input` interactivo mide ≥ 44×44 px (excepción documentada: ninguna).
- AC28 (movimiento): con `reducedMotion: 'reduce'`, `wy-up`, `wy-fill`, Ken Burns, crossfades, zoom de hover y transiciones quedan en ~0 ms; el carrusel del Inicio arranca en pausa.
- AC29 (contraste): texto ≥ 4.5:1 y componentes/foco ≥ 3:1 sobre su fondo real, incluidos textos sobre foto (revisar con el gradiente y la foto más clara del seed) y `white/72` de las etiquetas del hero.
- AC30 (una acción principal accent, con excepción): regla general: nunca dos botones `accent` con destinos distintos en un mismo viewport. **Excepción deliberada, decidida por el usuario (Q1, D5): primera pantalla del Inicio, donde "Ver paquete" (hero) y "Buscar" (buscador) son ambos `accent`, igual que `Main.dc.html`.** Fuera de esa pantalla: Inicio más abajo, el CTA de WhatsApp es `accent` (nunca comparte viewport con los otros dos; verificar a 1280×800 y 390×844 en las posiciones de scroll en que aparece); Paquetes: ninguno salvo "Quitar filtros" en el estado vacío (los links del hero y de las tarjetas no son `accent`); Detalle: "Reservar ahora" / barra móvil (mismo destino). El test mide cuántos botones `accent` hay en el viewport por posición de scroll y falla fuera de las excepciones listadas.
- AC31 (semántica): exactamente un `h1` por página; jerarquía `h1 > h2 > h3` sin saltos; landmarks `header`, `nav` con `aria-label`, `main`, `footer`; toda imagen con `alt` (decorativas `alt=""`); íconos decorativos `aria-hidden`; sin `div` clicable.
- AC32 (sin desbordes): `documentElement.scrollWidth <= clientWidth` a 390 y 1280 en las tres pantallas.
- AC33 (alcance): el diff no toca `modules/**/services`, `modules/**/types`, `modules/**/utils` (salvo lectura), `lib/db`, `lib/cache-tags.ts`, rutas ni `package.json`; `npx tsc --noEmit`, `npm run lint`, `npm test` y `npm run build` en verde.
- AC34 (proceso): cada tarea abre su PR con la tabla "elemento | tablero | app antes | app después" y capturas a 1280 y 390 (antes y después) de la pantalla; sólo se corrigen diferencias **medidas**.

## Contracts
Sin cambios de datos, DB, rutas, DTOs ni services. Sólo props de presentación.

```ts
// components/shared/page-hero.tsx (Server Component, sin hooks)
type PageHeroProps = React.ComponentProps<"section"> & {
  background?: React.ReactNode;     // foto(s) absolute inset-0; omitida = fondo bg-dark liso
  contentClassName?: string;        // padding inferior / gap del contenedor interno
};
// className: min-h-[720px] | [600px] | [660px]. Renderiza <section data-page-hero ...>
// + gradiente + <div max-w-[1240px] px-6 flex-1 flex-col justify-end> children </div>.
// Pasa ...props (aria-*, onTouchStart/End, onMouseEnter...) al <section>: lo usan HeroCarousel y PackageGallery (cliente).

// components/shared/site-nav.tsx ("use client")
function SiteNav(props: { links: ReadonlyArray<{ label: string; href: string }> }): JSX.Element;
// aria-current="page" si pathname === href o empieza por `${href}/`.

// modules/packages/components/package-card.tsx
type PackageCardProps = {
  slug: string; title: string; coverImageUrl: string | null;
  regionLabel: string; tag: string | null; durationLabel: string; priceLabel: string;
  variant?: "rail" | "grid";   // default "rail" (no cambia la llamada del rail)
  blurb?: string;              // sólo se muestra en "grid"
  className?: string; sizes?: string;
};

// modules/packages/components/package-sort.tsx ("use client")
function PackageSort(props: { filters: PackageFilters }): JSX.Element;  // <select> -> router.push(buildListingHref(filters, { orden }))

// components/shared/hero-carousel.tsx ("use client"). Reemplaza al HeroCarousel de modules/home (D13).
type HeroCarouselSlide = {
  id: string;
  imageUrl: string;
  label: string;          // etiqueta de pestaña y título de la tarjeta "Siguiente"
  ariaLabel: string;      // "Ver <título>"
  content: ReactNode;     // contenido del slide (Server nodes): sólo el activo se monta
};
type HeroCarouselProps = {
  slides: HeroCarouselSlide[];
  label: string;                 // aria-label de la sección ("Destinos destacados", "Paquetes destacados")
  showNext?: boolean;            // tarjeta "Siguiente" (miniatura = imageUrl del siguiente). Inicio: true
  intervalMs?: number;           // default 6500 (Paquetes pasa 6000)
  className?: string;            // min-h-[720px] | [600px]
  contentClassName?: string;     // padding inferior (112 px en Inicio por la solapa del buscador)
  children?: ReactNode;          // bloque estático sobre el contenido del slide (miga, h1, subtítulo en Paquetes)
};
// Home: slides[].content = chip de región + <h1> + texto + botones (CTA accent + fantasma), showNext.
// Paquetes: children = miga + <h1> + subtítulo; slides[].content = tarjeta "Destacado" (link).

// modules/home/components/*: SearchForm({ destinations }), PackageRail({ cards, chips }),
// DestinationBento({ destinations }), WhyWayra(), WhatsAppCta({ href }): firmas actuales (sin props nuevas).
// HeroSlide (tipo local de home) se conserva sólo para armar los slides en home-page.tsx.
```

- Búsqueda del Inicio: `GET /paquetes?destino=<slug>&fecha=<YYYY-MM-DD>&viajeros=<1..4>`. `parseListingParams` ignora `fecha` y `viajeros` (no se tocan utils); `buildListingHref` los descarta al navegar (ver Q2).
- Exports públicos: `modules/packages/index.ts` y `modules/home/index.ts` sin cambios.
- `docs/DESIGN-SYSTEM.md`: agrega secciones "Encabezado superpuesto y `PageHero`", "Radios" y "Fidelidad al artefacto"; no cambia tokens ni la escala de 034.

## Edge cases
- Inicio sin slides (ningún destacado con portada): `PageHero` estático `bg-dark` con un `h1` "Wayra: paquetes y tours por todo el Perú" (siempre hay un `h1`); el buscador mantiene la solapa.
- Slide con título largo: `h1` con balance, sin desbordar a 390 px; etiqueta de pestaña con ellipsis; "Siguiente" con título truncado a 2 líneas.
- Buscador: `type="date"` sin `min` (calcular "hoy" en un Server Component rompe el prerender con Cache Components); `Fecha` vacía no se envía como parámetro basura (se omite si está vacía).
- Bento con menos de 8 destinos: sin huecos ni errores (se conserva `slice(0, 8)` y el patrón de spans).
- Foto de portada ausente: tarjeta con fondo `sand`; hero de Paquetes sin destacados con portada: `PageHero` `bg-dark` estático (miga, `h1`, subtítulo) sin carrusel; con 1 destacado: sin pestañas ni controles.
- `HeroCarousel` compartido: `content` y `children` son nodos de servidor; un cambio de slide no vuelve a pedir datos. Dos carruseles nunca conviven en la misma página.
- Paquetes: 1 resultado, 0 resultados, destino activo, filtros activos sin resultados; `?orden=` inválido se ignora (como hoy).
- Detalle: sin galería, sin descripción, sin itinerario, sin salidas, todas agotadas, tour de un día (`kind=day_tour`), slug inexistente (404 con header sólido, AC1).
- Header superpuesto sobre fotos claras: el gradiente superior del hero garantiza AC29; verificar con la portada más clara del seed.
- Navegación con teclado dentro del carrusel: foco en un control pausa el avance; al salir se reanuda (comportamiento actual).
- `:has()` no soportado (navegadores muy viejos): cae al modo sólido en flujo y `main` contenido; el hero se ve como hoy (degradación aceptable).

## Tests
- No hay lógica de negocio nueva: **no se agregan tests unitarios** (SETUP §3: no se testea markup). `modules/home/utils/*.test.ts`, `modules/packages/utils/*.test.ts` y services siguen en verde sin cambios (AC33).
- Verificación visual (manual, Playwright ad hoc, no se versiona) por tarea: AC de su sección + transversales AC26–AC32, a 1280×800 y 390×844, con y sin `reducedMotion`, y recorrido con Tab.
- Si T0b extrae lógica del carrusel (p. ej. índice siguiente/anterior o paso a pausa por reduced motion) a una función pura, esa función sí lleva `*.test.ts` colocado.

## Plan
Son **5 tareas** (T0, T0b, T1, T2, T3) en 2 fases. Orden de merge: **034 → T0 → T0b → (T1, T2, T3 en cualquier orden)**. T0b depende de `PageHero` (T0). T1 y T2 dependen de T0 y de T0b (usan `HeroCarousel`); T3 sólo de T0 (puede salir antes que T0b). Entre T1, T2 y T3 no comparten archivos: se mergean en cualquier orden y corren en paralelo, cada una en su propio worktree, desde `main` con sus dependencias ya integradas (o apiladas sobre la rama de la última dependencia).

### Phase 1 — Marco compartido y carrusel (la app queda consistente, sin cambiar pantallas)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T0 | setup: encabezado superpuesto (CSS `:has`), `SiteNav`, pie de 3 bloques, `PageHero`, layout público, keyframe `wy-up`, `PackageCard` con `variant`, textos del header en localización de Clerk, sección de fidelidad en DESIGN-SYSTEM. Primer paso: captura de header/footer vs tablero. Las pantallas siguen funcionando (sin `data-page-hero` el header es sólido y `main` contenido) | components/shared/site-header.tsx, components/shared/site-nav.tsx, components/shared/site-footer.tsx, components/shared/wayra-logo.tsx, components/shared/page-hero.tsx, app/(public)/layout.tsx, app/layout.tsx, app/globals.css, docs/DESIGN-SYSTEM.md, modules/packages/components/package-card.tsx | 034 mergeada | - | AC1, AC2, AC3, AC4, AC5, AC6, AC26, AC27, AC29, AC33, AC34 | todo |
| T0b | setup: `HeroCarousel` compartido y genérico (extraído del de `modules/home`, D13) sobre `PageHero`. No toca el Inicio: el `hero-carousel.tsx` viejo sigue en uso hasta que T1 migre, así la app queda funcionando. Verificación en aislamiento con página temporal no versionada | components/shared/hero-carousel.tsx | T0 | - | AC35, AC8 (comportamiento), AC28, AC26, AC27, AC33, AC34 | todo |

### Phase 2 — Pantallas (tres tareas en paralelo, archivos disjuntos)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Inicio: migra el hero al `HeroCarousel` compartido (T0b; arma slides con chip, `h1` real, texto, CTA accent y fantasma; `showNext`), borra `modules/home/components/hero-carousel.tsx`, buscador de 4 campos con solapa, franja ✓, rail (chips `ink`, `SectionHeading`, "Ver todos"), bento, "Por qué Wayra" con collage, CTA de WhatsApp sobre foto, contenedores en cada sección. Primer paso: captura app vs `Main.dc.html` a 1280 y 390 y tabla de diferencias medidas | modules/home/components/home-page.tsx, modules/home/components/hero-carousel.tsx (se borra), modules/home/components/search-form.tsx, modules/home/components/trust-strip.tsx, modules/home/components/package-rail.tsx, modules/home/components/destination-bento.tsx, modules/home/components/why-wayra.tsx, modules/home/components/whatsapp-cta.tsx, modules/home/components/photo-credits.tsx | T0, T0b | B | AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC26–AC32, AC34 | todo |
| T2 | Paquetes: hero con el `HeroCarousel` compartido (T0b; 5 destacados con `getFeaturedPackages`, tarjeta "Destacado" por slide, bloque estático miga + `h1` + subtítulo), aside de filtros, `PackageSort`, grilla `auto-fill` con `PackageCard variant="grid"` y `blurb`, vacío y skeleton. Primer paso: captura de `/paquetes` (1280 y 390) vs `Explorar.dc.html` y lista de diferencias reales (la lista de "qué verificar" de abajo es un punto de partida, no un hallazgo) | modules/packages/components/packages-listing.tsx, modules/packages/components/package-filters.tsx, modules/packages/components/package-grid.tsx, modules/packages/components/listing-skeleton.tsx, modules/packages/components/package-sort.tsx, app/(public)/paquetes/page.tsx | T0, T0b | B | AC15, AC16, AC17, AC18, AC19, AC20, AC26–AC32, AC34 | todo |
| T3 | Detalle: `PackageGallery` como hero a todo el ancho (`PageHero`), miga dentro del hero, solapa del panel, datos clave, secciones con `SectionHeading`, itinerario, incluye/no incluye, cancelación, panel de reserva (insignia, medidas), barra móvil, skeleton. Primer paso: captura de un `/paquetes/<slug>` (1280 y 390) vs `Paquete.dc.html` y lista de diferencias reales | modules/packages/components/package-detail.tsx, modules/packages/components/package-gallery.tsx, modules/packages/components/package-facts.tsx, modules/packages/components/package-itinerary.tsx, modules/packages/components/package-inclusions.tsx, modules/packages/components/booking-panel.tsx, modules/packages/components/mobile-booking-bar.tsx, modules/packages/components/detail-skeleton.tsx, app/(public)/paquetes/[slug]/page.tsx | T0 | B | AC21, AC22, AC23, AC24, AC25, AC26–AC32, AC34 | todo |

Notas del plan:
- Cada `app/(public)/paquetes/**/page.tsx` está en el `Owns` sólo por si la comparación exige tocarlo (hoy son delgados y se espera dejarlos igual).
- Fase 1: 2 tareas, 10 archivos. Fase 2: 3 tareas, ~24 archivos (ver siguiente nota). Total 5 tareas.
- La fase 2 tiene ~24 archivos en total (límite orientativo ~10 por fase) porque son tres tareas independientes de ≤ 9 archivos cada una; si se prefiere respetar el límite, se ejecutan T1, T2 y T3 en fases separadas sin cambiar nada más.
- Si T1/T2/T3 necesitan algo de `components/shared/*` o `globals.css`, **no lo editan**: lo piden (se agrega a T0 antes de que arranquen) o usan valor arbitrario local.

### Qué verificar por pantalla (punto de partida; confirmar con captura antes de tocar)
Inicio (diferencias ya medidas con captura): header sólido separado y foto en tarjeta inset; título máx. 58 px y es `<p>`; sin chip, sin botón fantasma, sin "Siguiente"; puntos en vez de pestañas con barra; buscador sólo con destino; franja de confianza sin los 4 ✓ del tablero; tarjeta apaisada con cuerpo blanco; chip de categoría activo `primary` (tablero: `ink`); bento con filas 220 (tablero 230) y sin círculo de flecha; "Por qué Wayra" sin collage y con h2 genérico; CTA de WhatsApp teal sin foto (tablero: sobre foto, botón `accent`).
Paquetes (por lectura de código vs tablero; **sin captura aún**): ¿hay hero con foto y carrusel de destacados o sólo miga + h1 en contenedor? (código: sin hero, `text-4xl lg:text-5xl`; tablero: hero 600 px con carrusel, `clamp(42px,6.5vw,84px)`); ancho/radio/padding del aside (tablero 290 / 24 / 24); "Limpiar" condicional; selector de orden dentro del aside vs `<select>` en la grilla; columnas de la grilla (código: 1/2/3 fijas, tablero: `auto-fill 270`); tarjeta 4/3 con cuerpo blanco vs foto 4/3.4 con texto suelto, `blurb` y flecha; skeleton coherente con la tarjeta nueva.
Detalle (por lectura de código vs tablero; **sin captura aún**): ¿hero dentro de tarjeta redondeada inset con miga fuera (código) vs a todo el ancho con miga dentro (tablero)?; `h1` `text-5xl lg:text-7xl` vs `clamp(46px,7.5vw,96px)`; solapa del panel (−140 px) ausente; ancho del panel (código 400 vs tablero máx. 410) y gap de columnas (56); datos clave `grid-cols-2 sm:grid-cols-4` + radio 18 vs `auto-fit minmax(160)` + radio 20; radios de incluye/no incluye/cancelación (18 vs 24); tamaño de los h2 (30/36 vs `clamp(30,3.6vw,42)`); insignia "Confirmación inmediata" ausente (ya anotado en `changelog/009`).

## Fidelity criterion (reusable)
Para cualquier pantalla que se construya o ajuste contra el artefacto:
- **F1. Fuente.** El tablero (HTML con estilos inline) es la fuente de medidas, estructura y textos; no la memoria ni un captura vieja. Si no hay tableros `Movil-*` (caso de esta spec, D14), el móvil se implementa y verifica contra las `@media` del HTML de escritorio y las reglas de accesibilidad, asumiendo el riesgo de que no coincida con el diseño móvil real; si queda mal se abre una tarea de ajuste con los `Movil-*` a la vista.
- **F2. Estructura.** Mismos bloques, mismo orden, mismos textos (copy), mismos íconos. Cada bloque del tablero tiene su contraparte o una desviación listada.
- **F3. Medidas.** Tamaño/peso/interlineado/tracking, radios, padding, gap, tamaño de íconos y controles a 1280 y 390 px: ±1 px en valores fijos, misma fórmula `clamp` en fluidos. Se mide con `getComputedStyle`/`getBoundingClientRect`, no a ojo.
- **F4. Color y tokens.** Token exacto cuando existe; si el tablero usa un valor sin token se usa el literal como valor arbitrario (no se inventa un token para un solo uso). Los radios sin token (20/22/24/26/32) se usan arbitrarios.
- **F5. Gana DESIGN-SYSTEM en accesibilidad.** Foco (`accent` sobre claro / `focus` sobre oscuro), objetivos ≥ 44 px, `prefers-reduced-motion`, contraste (≥ 4.5:1 texto, ≥ 3:1 componentes), una acción principal `accent` por vista (salvo excepciones deliberadas del usuario, registradas por nombre en la spec: hoy sólo la primera pantalla del Inicio, D5). Cada desvío del tablero por esto se lista.
- **F6. Gana el producto en veracidad y en datos.** El copy no promete lo que v1 no cumple; lo que depende del contenido real (meses, cupos, fotos, créditos) se conserva aunque el tablero (con datos de ejemplo) no lo muestre.
- **F7. Sin inventar.** Primer paso de la tarea: capturar la app a 1280 y 390 y compararla con el tablero; sólo se corrige lo medido. El PR trae la tabla "elemento | tablero | antes | después" y la lista de desviaciones con su motivo.
- **F8. Alcance de fidelidad ≠ alcance funcional.** Piezas del tablero que requieren datos/rutas/dependencias que no existen (mapa, `/destinos`, métodos de pago) van a *Out* con su razón, no se simulan con enlaces muertos.

Desviaciones deliberadas de esta spec respecto del tablero: sin link "Destinos" y sin columnas "Destinos"/"Ayuda" (rutas inexistentes, F8); franja ✓ y "Por qué Wayra" con copy veraz (F6, D4); foco `accent` sobre claro (F5, D6); pestañas del hero en dos filas en móvil (F5, D10); botón pausa en el carrusel de Paquetes (F5, D13); línea de mes en las fechas y "/ persona" en la grilla (F6, D12); sin mapa ni tarjeta promo (F8). Ya **no** es desvío: "Buscar" y WhatsApp en `accent` (excepción decidida por el usuario, D5/D11).

## Specs siguientes (trazabilidad)
Quedan fuera de esta spec y deben tener la suya:
- **Filtros reales de fecha y viajeros en `/paquetes`** (disponibilidad de salidas, `parseListingParams`, service y caché). Hoy el buscador del Inicio los envía por GET y `/paquetes` los ignora (decidido, Q2).
- **Copia de ajuste móvil**, si el resultado a 390 px no convence (D14), con los tableros `Movil-*`.
- **Mapa de la ruta con Leaflet** en el Detalle (`react-leaflet`).
- **Tarjeta promo "¿No sabes qué elegir?"** del aside de Paquetes (requiere subir `buildWhatsAppUrl` a `lib/`).
- **Rutas `/destinos`, `/tours`, `/ofertas`** y por tanto el link "Destinos", "Todos los destinos →" y las columnas "Destinos"/"Ayuda" del pie.

## Open questions
Ninguna abierta. Resueltas por el usuario:
- **Q1. Resuelta: "como el diseño original".** Hero "Ver paquete" y "Buscar" en `accent`, igual que `Main.dc.html`; excepción deliberada a "una sola CTA accent por vista" sólo en la primera pantalla del Inicio (D5, AC9, AC30). WhatsApp también `accent` (D11).
- **Q2. Resuelta.** Fecha y Viajeros se muestran como el tablero y se envían por GET; `/paquetes` los ignora por ahora; los filtros reales van en una spec posterior (ver "Specs siguientes").
- **Q3. Resuelta.** Carrusel de 5 destacados también en Paquetes; `HeroCarousel` compartido en tarea propia T0b (D13).
- **Q4. Resuelta.** "Iniciar sesión" / "Registrarse"; cambia también la localización de Clerk en `app/layout.tsx` (D7).
- **Móvil. Resuelta (D14).** Sin tableros `Movil-*`: se implementa contra las `@media` del HTML de escritorio; riesgo aceptado y copia de ajuste si queda feo.
