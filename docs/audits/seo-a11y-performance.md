# Auditoría de SEO, accesibilidad y rendimiento

- Spec: `docs/specs/seo/seo-a11y-performance.md` (tarea T10; AC18, AC19, AC20, AC21)
- Fecha: 2026-10-29
- Rama: `033-seo-a11y-performance` (con T1 a T9 aplicadas, sin commitear)
- Alcance: solo medición. No se tocó código.

## 1. Método

| Dato | Valor |
| --- | --- |
| Build | `npx next build` (Next 16.3.6, `cacheComponents: true`), sin advertencias; `/sitemap.xml`, `/robots.txt` y `/opengraph-image` aparecen como rutas |
| Servidor | `npx next start -p 3058`, BD sembrada, sesión cerrada (sin cookies) |
| Lighthouse | 13.6.0 vía `npx lighthouse`, Chrome 156.0.8078.47 (`/usr/bin/google-chrome`), `--chrome-flags="--headless=new --no-sandbox"`, categorías performance, accessibility, best-practices, seo |
| Móvil | Emulación por defecto (Moto G Power, 4x CPU, slow 4G simulado) |
| Escritorio | `--preset=desktop` |
| Corridas | 3 por pantalla y modo (36 en total); la tabla informa la **mediana** de cada métrica. En la columna "Perf por corrida" se ven las 3 puntuaciones crudas |
| Pantallas | `/`, `/paquetes`, `/tours`, `/ofertas`, `/paquetes/cusco-valle-sagrado`, `/destinos/cusco` |
| Entorno | `.env` local: Clerk de **desarrollo** (`fluent-phoenix-1512.clerk.accounts.dev`) y `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Por eso `canonical` y `og:url` salen con `http://localhost:3000` mientras el servidor corre en `:3058` (esperado, no es un fallo) |

### Desviación de método: `/ofertas` en móvil

Con la configuración por defecto (throttling `simulate`), Lighthouse **no logra medir `/ofertas` en móvil**: la página no llega a estado ocioso ("The page loaded too slowly to finish within the time limit") y la corrida termina con `Protocol error (Page.enable): Session closed`. Se reprodujo 6 veces seguidas, con y sin `--disable-gpu`, `--disable-dev-shm-usage` y `--max-wait-for-load=120000`. En escritorio la misma pantalla se mide bien.

Las 3 corridas de `/ofertas` móvil de abajo se hicieron con `--throttling-method=devtools` (misma emulación de dispositivo, throttling aplicado por Chrome). Son una medida **no comparable** con las otras cinco filas (ver hallazgo H3). El HTML se descarga en `~25 ms` con `curl`, así que el problema no es el servidor.

## 2. Resultados Lighthouse (AC18)

Umbrales de AC19: Accesibilidad 100, SEO 100, Buenas prácticas >= 90, Rendimiento >= 80 móvil / >= 90 escritorio, y en móvil LCP <= 2,5 s, CLS <= 0,1, TBT <= 200 ms.

### 2.1 Móvil

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT | Perf por corrida |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | **74** ✗ | 100 ✓ | **77** ✗ (H4) | 100 ✓ | **6,01 s** ✗ | 0,000 ✓ | 114 ms ✓ | 85 / 66 / 74 |
| `/paquetes` | **73** ✗ | 100 ✓ | **77** ✗ (H4) | 100 ✓ | **5,05 s** ✗ | 0,000 ✓ | 177 ms ✓ | 71 / 73 / 84 |
| `/tours` | **77** ✗ | 100 ✓ | **77** ✗ (H4) | 100 ✓ | **5,01 s** ✗ | 0,000 ✓ | 163 ms ✓ | 78 / 73 / 77 |
| `/ofertas` (*) | **73** ✗ | 100 ✓ | **77** ✗ (H4) | 100 ✓ | **4,45 s** ✗ | 0,009 ✓ | 167 ms ✓ | 73 / 74 / 70 |
| `/paquetes/cusco-valle-sagrado` | **66** ✗ | 100 ✓ (H7) | **77** ✗ (H4) | **92** ✗ (H5) | **5,65 s** ✗ | 0,000 ✓ | **408 ms** ✗ | 68 / 66 / 64 |
| `/destinos/cusco` | **69** ✗ | **97** ✗ (H6) | **77** ✗ (H4) | **92** ✗ (H5) | **6,31 s** ✗ | 0,000 ✓ | **244 ms** ✗ | 70 / 69 / 49 |

(*) Medida con `--throttling-method=devtools` (ver 1.1).

### 2.2 Escritorio

| Pantalla | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT | Perf por corrida |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 99 ✓ | 100 ✓ (H7) | **77** ✗ (H4) | 100 ✓ | 0,97 s | 0,003 | 0 ms | 96 / 99 / 99 |
| `/paquetes` | 96 ✓ | 100 ✓ | **77** ✗ (H4) | 100 ✓ | 1,28 s | 0,003 | 0 ms | 96 / 97 / 94 |
| `/tours` | 98 ✓ | 100 ✓ | **77** ✗ (H4) | 100 ✓ | 0,95 s | 0,003 | 0 ms | 99 / 98 / 98 |
| `/ofertas` | 97 ✓ | 100 ✓ (H7) | **77** ✗ (H4) | 100 ✓ | 1,13 s | 0,003 | 0 ms | 99 / 97 / 97 |
| `/paquetes/cusco-valle-sagrado` | 96 ✓ | 100 ✓ (H7) | **77** ✗ (H4) | **92** ✗ (H5) | 1,32 s | 0,003 | 0 ms | 97 / 96 / 96 |
| `/destinos/cusco` | 96 ✓ | **97** ✗ (H6) | **77** ✗ (H4) | **92** ✗ (H5) | 1,29 s | 0,003 | 0 ms | 97 / 95 / 96 |

En escritorio no se exigen LCP, CLS ni TBT; se listan solo como referencia.

### 2.3 Auditorías fallidas por celda

Lista de auditorías con puntaje < 1 en las 3 corridas (falló 3/3 en todos los casos).

| Auditoría | Categoría | Dónde falla | Peso | Hallazgo |
| --- | --- | --- | --- | --- |
| `third-party-cookies` ("Uses third-party cookies") | Buenas prácticas | 12 de 12 celdas | 5 | H4 |
| `inspector-issues` (problemas de cookies en DevTools) | Buenas prácticas | 12 de 12 celdas | 1 | H4 |
| `meta-description` | SEO | `/paquetes/[slug]` y `/destinos/[slug]`, móvil y escritorio | 1 | H5 |
| `target-size` | Accesibilidad | `/destinos/cusco`, móvil y escritorio | 7 | H6 |
| `label-content-name-mismatch` | Accesibilidad (peso 0, grupo oculto; **no baja el puntaje**, pero es un fallo real de WCAG 2.5.3) | `/` (solo escritorio, 1 nodo), `/ofertas` (solo escritorio, 4 nodos), `/paquetes/[slug]` (móvil y escritorio, 2 nodos) | 0 | H7 |

`/paquetes`, `/tours` y `/ofertas` (móvil) no tienen otra auditoría fallida fuera de H4. Rendimiento: ver el análisis en H1, H2 y H3.

## 3. Checklist AC20

Verificado sobre el HTML servido (`curl` a `next start`) y la salida de Lighthouse. Las filas que requieren navegador real **no se midieron** y quedan como "pendiente de verificación manual".

### 3.1 Verificado sin navegador

| Ítem | `/` | `/paquetes` | `/tours` | `/ofertas` | `/paquetes/[slug]` | `/destinos/[slug]` |
| --- | --- | --- | --- | --- | --- | --- |
| (b) Un único `<h1>` | ✓ (1) | ✓ (1) | ✓ (1) | ✓ (1) | ✓ (1) | ✓ (1) |
| (b) Jerarquía sin saltos (h1 > h2 > h3) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| (c) Toda `<img>` con atributo `alt` | ✓ (28 imgs, 0 sin `alt`) | ✓ (26, 0) | ✓ (15, 0) | ✓ (10, 0) | ✓ (10, 0) | ✓ (13, 0) |
| (c) `alt=""` decorativas | 14, carrusel del hero y tarjetas con título adyacente | 6, tarjetas | 5, tarjetas | 10, carrusel y tarjetas | 7, galería y miniaturas | 7, hero y carriles |
| (c) Créditos CC visibles | ✓ (`PhotoCredits`, texto genérico "Fotos: Wikimedia Commons, licencias CC") | **✗ ninguno** (H8) | **✗ ninguno** (H8) | **✗ ninguno** (H8) | ✓ ("Foto: <autor>, CC BY-SA 4.0" por foto de la galería) | ✓ (`PhotoCredits`) |
| (g) Un solo CTA `accent` | ✓ (excepción nombrada: "Ver paquete" + "Buscar") | ✓ (0) | ✓ (1: "Ver paquetes") | **? 2 en el HTML**: "Aprovechar oferta" (hero) y "Suscribirme" (newsletter). Hay que ver en navegador si coinciden en pantalla (H9) | ✓ (1: "Reservar ahora" en el panel; "Reservar" en la barra móvil, alterna por breakpoint, a confirmar) | ✓ (1: "Ver paquetes en Cusco") |
| (AC17) Enlace "Saltar al contenido" en el HTML, antes del encabezado | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| (AC17) `<main id="contenido">` presente | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Notas:
- El conteo de `h1` se hizo sobre el HTML sin `<script>`. En Inicio el `h1` es el título de la diapositiva activa del carrusel ("Islas Ballestas"); no se verificó el cambio de `h1` al rotar (ver 3.2).
- Los CTA `accent` se contaron por la clase exacta `bg-accent` en `<a>`/`<button>` (se excluyeron `hover:bg-accent*` y `bg-accent-soft`). Los botones del encabezado ("Registrarse", "Iniciar sesión") no son `accent`.
- La ausencia de `<img>` sin `alt` es solo de sintaxis. La calidad del texto alternativo de las imágenes con contenido no se evaluó.

### 3.2 Verificado en navegador (Chrome headless, 2026-10-29)

Sobre `next start` (build de producción). Teclado, movimiento reducido y reflujo se midieron con `puppeteer-core` sobre Chrome; los chequeos de objetivos táctiles, del enlace de salto y de los marcadores del mapa se hicieron además con Playwright. Consola: 0 errores.

| Ítem AC20 | Resultado | Evidencia |
| --- | --- | --- |
| (a) Teclado: primer foco y salto al contenido | **OK** | El primer Tab cae en "Saltar al contenido" (185×44 px, `bg-dark`, anillo visible). Enter deja el foco en `<main id="contenido">` y la URL en `#contenido` |
| (a) Recorrido completo de Tab, sin trampas | **OK** en las 6 pantallas | Paradas hasta salir de la página: `/` 56, `/paquetes` 52, `/tours` 42, `/ofertas` 31, ficha 28, destino 37. Ningún elemento retiene el foco, salvo el `<input type="date">` nativo, que reparte día, mes, año y calendario en 4 Tab (comportamiento del navegador). Shift+Tab vuelve al elemento anterior |
| (a) Foco visible en todo elemento interactivo | **OK** en las 6 pantallas | 0 elementos sin `outline` ni `box-shadow` al recibir foco. Los dos campos de fecha lo muestran una vez terminada la transición de 150 ms |
| (d) `prefers-reduced-motion: reduce` | **OK** en las 6 pantallas | 0 animaciones en curso y 0 elementos con transición o animación mayor a 10 ms. En destino, 40 elementos con movimiento sin la preferencia y 0 con ella. El carrusel de Inicio no rota con la preferencia y sí sin ella |
| (e) Zoom 200 % (640 px) y reflujo a 320 px | **OK** tras corregir H12 | 0 px de scroll horizontal a 640 px, a 390 px y a 320 px en las 6 pantallas |
| (f) Objetivos táctiles >= 44 px (a 390 px) | **OK en elementos propios**; quedan solo los de terceros | Ver la tabla siguiente |
| `h1` del carrusel de Inicio | **Rota con la diapositiva** | Sigue habiendo un solo `h1`, pero su texto cambia cada pocos segundos. Falta decidir si se anuncia a lectores de pantalla |
| (g) Un solo CTA `accent` por vista | **OK** | En `/ofertas`, "Aprovechar oferta" y "Suscribirme" están a unos 1900 px de distancia: nunca coinciden en un viewport. En la ficha, "Reservar ahora" (panel) y "Reservar" (barra móvil) alternan por breakpoint |

Objetivos táctiles menores de 44 px (a 390 px) que quedan:

| Pantalla | Elementos | Origen |
| --- | --- | --- |
| Todas las que muestran la sesión | Botón "Abrir menú de usuario" 28×28 | Tercero (`UserButton` de Clerk) |
| `/destinos/[slug]` | Controles de zoom 30×30 y enlaces de atribución 51×14 y 85×14 | Tercero (Leaflet) |

Los marcadores del mapa (H6, antes 32×32) miden ahora 44×44 con el círculo visible de 32×32, y el campo del boletín (H11, antes 30 px de alto) mide 52 px.

## 4. Hallazgos

Severidad: **Alta** = incumple un umbral de AC19 por causa propia, afecta a varias pantallas; **Media** = incumple un umbral de AC19 o AC20 en una o dos pantallas, o es una excepción de terceros sin resolver; **Baja** = no incumple umbral numérico, pero sí un criterio de AC20 o WCAG.

| ID | Severidad | Pantallas | Hallazgo | Umbral AC19/AC20 | Causa y evidencia | ¿Excepción de terceros? | Siguiente paso |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | **Alta** | 6 de 6 (móvil) | Rendimiento móvil 66-77 (< 80) y LCP 4,45-6,31 s (> 2,5 s). En escritorio todas las pantallas pasan (96-99) | Rendimiento >= 80 móvil; LCP <= 2,5 s | Lighthouse (corrida mediana por pantalla): FCP simulado ~2,3 s con **CSS que bloquea el render** (`render-blocking-insight`: ~450 ms + ~150 ms de dos hojas de estilo); la imagen LCP es la foto del hero, **sobredimensionada** (`image-delivery-insight`: 100-400 KiB de ahorro estimado; el `src` de respaldo de `next/image` apunta a `w=3840`), y el preload de la imagen no lleva `fetchpriority=high` (`lcp-discovery-insight`). La varianza entre corridas es grande (p. ej. Inicio 66 a 85; LCP 3,9 a 8,4 s). El LCP **no** lo causa un tercero: el elemento es una imagen propia, descubrible en el HTML inicial, y Clerk carga aparte (<= 90 ms de hilo principal en 5 de 6 pantallas) | No | Fase 5: reducir CSS bloqueante, afinar `sizes`/prioridad de la imagen del hero y reducir tamaño de las imágenes |
| H2 | **Alta** | `/paquetes/[slug]`, `/destinos/[slug]` (móvil) | TBT 408 ms y 244 ms (> 200 ms) | TBT <= 200 ms | El script principal de la app (`0-4srap-ffvu1.js`, 465-577 ms de scripting) y tareas largas (8-10 por página, de 82 a 277 ms) dominan el TBT. Clerk aporta ~65-90 ms de hilo principal en estas pantallas. Los listados y Inicio pasan (114-177 ms) | Parcial: Clerk suma, pero no explica el exceso | Fase 5: revisar qué se hidrata en las fichas (calendario, mapa, galería) y diferir lo que no se ve al cargar |
| H3 | Media | `/ofertas` (móvil) | Lighthouse no mide la pantalla con la configuración por defecto: la página no llega a ocioso y la corrida aborta (6 de 6 intentos). Con `devtools` throttling da Perf 73, LCP 4,45 s, TTFB simulado ~1,7 s | AC18: mediana de 3 corridas con configuración por defecto | Se ven 79 peticiones; entre ellas, `client.protect.clerk.com` en puertos 992, 2082, 8443 y 18443, y 11 peticiones a `/sign-in` por prefetch de los enlaces "Aprovechar oferta" (redirigen 307 desde `/pago`). **Causa sin confirmar**: la hipótesis es que Clerk Protect y el prefetch mantienen la página activa | Posible (Clerk), sin confirmar | Fase 5: confirmar la causa (por ejemplo, medir con Clerk de producción o `prefetch={false}` en los enlaces a `/pago`) y repetir la medición |
| H4 | Media | 6 de 6, móvil y escritorio | Buenas prácticas 77 (< 90). Fallan `third-party-cookies` (peso 5) e `inspector-issues` (peso 1) | Buenas prácticas >= 90 | Ambas auditorías señalan solo cookies de `fluent-phoenix-1512.clerk.accounts.dev` (`/v1/client`, `/v1/environment`, `__clerk_db_jwt`). Es la instancia de **desarrollo** de Clerk, servida desde un dominio de terceros | **Sí: Clerk (instancia de desarrollo)**. Excepción propuesta para aprobación | Volver a medir contra un despliegue con claves de producción de Clerk (dominio propio) para confirmar que el puntaje sube a >= 90 |
| H5 | Media | `/paquetes/[slug]`, `/destinos/[slug]` | SEO 92 (< 100): `meta-description` falla, aunque la etiqueta existe en el HTML | SEO = 100 | `generateMetadata` se difiere a petición y Next 16 **inserta las etiquetas en `<body>`** (`</head>` en el byte 2122, `<meta name="description">` en el 153246). Lo confirma la documentación de Next ("Streaming metadata") y `curl`. Con `User-Agent: facebookexternalhit` las mismas páginas devuelven la metadata en `<head>` (descripción en 2466, `og:image` en 3023, `</head>` en 3861). Lighthouse (que usa el DOM) no la ve en el `head`. Según la documentación, Googlebot ejecuta JS e interpreta bien este caso | No | Fase 5: evaluar prerenderizar los slugs (`generateStaticParams`) o forzar `htmlLimitedBots`, sabiendo que esto último puede alargar el TTFB. La documentación no garantiza que lo primero baste con `cacheComponents`; probar contra Lighthouse |
| H6 | Media | `/destinos/cusco` | Accesibilidad 97 (< 100): `target-size` falla en los marcadores del mapa (`leaflet-marker-icon`, `tabindex="0"`, `role="button"`, 32x32 px) | Accesibilidad = 100; AC20(f) >= 44 px | El tamaño de 32 px lo define el código propio (estilo en línea del marcador); no es un defecto de la librería de mapas | No (el tamaño es propio, aunque el contenedor sea Leaflet) | Resuelto: marcador con área táctil de 44×44 px (círculo visible de 32 px). Medido con puppeteer. |
| H7 | Baja | `/` (escritorio), `/ofertas` (escritorio), `/paquetes/[slug]` (móvil y escritorio) | `label-content-name-mismatch` (WCAG 2.5.3 Label in Name). El puntaje de Accesibilidad no baja (peso 0), pero la auditoría falla | Accesibilidad = 100 "o cada auditoría fallida listada con justificación aprobada" | Nombre accesible distinto del texto visible: botón "Siguiente destino: Amazonía en Tambopata" frente a "SIGUIENTE ..." (Inicio); pestañas `aria-label="Ver Islas Ballestas"` frente a "-25% ..." (/ofertas, 4 nodos); enlaces de fecha `aria-label="jueves 5 de noviembre"` frente a "JUE 5 NOV" (ficha, 2 nodos). Quien usa control por voz dice el texto visible y no coincide | No | Resuelto: el nombre accesible parte del texto visible (botón "Siguiente" sin `aria-label`, pestañas de ofertas `Ver <badge> <título>`, enlaces de fecha con el nombre del contenido más la fecha completa en `sr-only`). Lighthouse: Accesibilidad 100 y 0 auditorías fallidas en `/`, `/ofertas` y la ficha, en móvil y escritorio. |
| H8 | Media | `/paquetes`, `/tours`, `/ofertas` | No hay créditos CC visibles, aunque las tarjetas muestran fotos de Wikimedia Commons (`/seed/*.jpg`) | AC20(c): créditos CC visibles | Inicio y destino montan `PhotoCredits`; la ficha de paquete muestra el crédito por foto. Los tres listados no montan nada | No | Resuelto: `PhotoCredits` montado en `/paquetes`, `/tours` y `/ofertas`. Medido: visible en las tres. |
| H9 | Descartado | `/ofertas` | Dos botones `bg-accent` en el HTML | AC20(g) | Verificado en navegador: están a unos 1900 px de distancia, no coinciden en un viewport | No | Ninguno |
| H11 | Baja | `/ofertas` | El campo de correo del boletín mide 279×30 px (< 44 px) a 390 px | AC20(f) | Medido con Playwright. Es código propio. El botón de usuario de Clerk (28×28) y los controles de Leaflet son de terceros | Parcial | Resuelto: `flex-1` en columna colapsaba el `h-[52px]` del campo a 30 px; ahora `sm:flex-1`. Medido: 294×52 a 390 px. |
| H12 | Media | Todas | Desborde horizontal a 320 px (WCAG 1.4.10 Reflow): 49 px en las 6 pantallas por la cabecera (moneda + "Iniciar sesión" + "Registrarse" sin poder envolverse) y 4 px más en la ficha por el panel de reserva (`min-w-[300px]` fijo y fila de precio) | AC20(e) | Medido con `puppeteer-core`. Cabecera con `flex-wrap` y moneda oculta bajo 360 px; ficha con `grid-cols-[minmax(0,1fr)]`, `min-w-0` y `max-sm:flex-wrap` en el precio | No | Resuelto: 0 px de desborde a 320 px en las 6 pantallas; la ficha de escritorio conserva su diseño |
| H10 | Info | Todas | `canonical`, `og:url` y `og:image` salen con `http://localhost:3000` | AC1/AC2 | `NEXT_PUBLIC_APP_URL=http://localhost:3000` en el `.env` local mientras se sirve en `:3058`. No es un defecto del código. Lighthouse `canonical` y `hreflang` pasan | No | Ninguno; confirmar con un dominio real al desplegar |

### 4.1 Resumen frente a los umbrales de AC19

| Umbral | Estado |
| --- | --- |
| Accesibilidad = 100 | **No cumple** en `/destinos/cusco` (97, H6). Las demás dan 100, con `label-content-name-mismatch` fallida y sin justificación aprobada (H7) |
| SEO = 100 | **No cumple** en `/paquetes/[slug]` y `/destinos/[slug]` (92, H5) |
| Buenas prácticas >= 90 | **No cumple** en las 12 celdas (77, H4). Causa única: cookies de Clerk de desarrollo; excepción de terceros propuesta |
| Rendimiento >= 90 escritorio | **Cumple** en las 6 (96 a 99) |
| Rendimiento >= 80 móvil | **No cumple** en las 6 (66 a 77, H1) |
| LCP <= 2,5 s móvil | **No cumple** en las 6 (4,45 a 6,31 s, H1) |
| CLS <= 0,1 móvil | **Cumple** en las 6 (0,000 a 0,009) |
| TBT <= 200 ms móvil | **No cumple** en `/paquetes/[slug]` (408) y `/destinos/[slug]` (244) (H2). Cumple en las otras 4 |

### 4.2 Pendientes de decisión para el orquestador

1. Aprobar o rechazar la excepción de terceros de H4 (Clerk, instancia de desarrollo) y decidir si se mide un preview/producción con claves de producción.
2. Definir el alcance de la Fase 5: H1, H2, H5 y H8 son tareas propias; H3 requiere diagnóstico previo; H6, H7 y H9 son cambios chicos.
3. Las filas de la sección 3.2 siguen **pendientes de verificación manual**; el AC20 no está completo hasta cubrirlas.

## 5. AC21 (cierre de fase)

| Comando | Resultado |
| --- | --- |
| `npm run lint` | ✓ sin errores |
| `npx tsc --noEmit` | ✓ sin errores |
| `npm test` | ✓ 87 archivos pasan (1153 tests); 33 archivos / 284 tests omitidos (`skipped`) por el propio runner |
| `npx next build` | ✓ sin advertencias de `metadataBase` |
