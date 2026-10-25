# Ofertas (/ofertas) y newsletter

- Module: offers (con `newsletter`)
- Status: done
- Approved by: leandro291 (2026-10-25; Enmienda 1 re-aprobada 2026-10-25)
- Mode: SDD

## Enmienda 1 (2026-10-25): adaptación al marco de diseño de `main`
**Motivo.** Después de aprobar esta spec entraron a `main` las tarjetas 034–040 y 009: `PageHero` (encabezado superpuesto sobre un hero a todo el ancho; el layout público quita el contenedor de `main` cuando la página lo usa), `HeroCarousel` compartido (`components/shared/hero-carousel.tsx`), `SectionHeading`, escala tipográfica global (`h1`/`h2`) y la tarjeta nueva (foto `rounded-[22px]`, texto suelto debajo). El PR #11 quedó en conflicto y `OfferHeroCarousel` duplica el carrusel compartido. El merge de `origin/main` a la rama ya está hecho (conflictos: `lib/cache-tags.ts`, con `departures` y `offers`, y `modules/home/components/hero-carousel.tsx`, que `main` movió a `components/shared` y se acepta su eliminación).

**Precedencia.** Donde la Enmienda 1 contradiga el texto de más abajo, manda la Enmienda. No cambian: utils, service, tipos, tests existentes, ni el módulo `newsletter` (schema, service, action, formulario).

- **E1. Se reutiliza el `HeroCarousel` compartido (sustituye D7, T7, T9 y AC22).** Se elimina `OfferHeroCarousel` y `hooks/use-reduced-motion.ts` (sin consumidores: el compartido ya trae su lógica) y se descarta el cambio al hero del Inicio (el archivo ya no existe; esta tarea ya no toca el Inicio). Extensión mínima y retrocompatible del compartido: `labels?: { tabs: string; previous: string; next: string }` (por defecto "Elegir destino", "Destino anterior", "Destino siguiente") y `aside?: ReactNode` en cada slide (bloque a la derecha del slide; si existe, reemplaza a la tarjeta "Siguiente"). Inicio y Paquetes no cambian. **Consecuencia aceptada:** el compartido no maneja flechas/Inicio/Fin ni foco rotativo en las pestañas (cada pestaña es un botón enfocable con Tab); AC14 se reduce a lo que hace el compartido (pausa, hover/foco, swipe, reduced motion, pestañas y flechas con clic). Agregar teclado de pestañas al compartido beneficiaría a Inicio y Paquetes y queda como spec aparte.
- **E2. Hero según el tablero de Ofertas.** `OfferHero` arma los slides (`id`, `imageUrl`, `label` = `badge + título`, `ariaLabel`, `content`, `aside`) y los pasa a `HeroCarousel` con `className="min-h-[640px]"`. `content` = pastilla del tipo (`bg-accent`, 14 px, mayúsculas), título del slide como `<p>` con el tamaño "h1 grande Ofertas" de `DESIGN-SYSTEM` (`clamp(44px,7vw,92px)`, 0.92, −0.045em), fila de precio (final 40 px, tachado 20 px) con CTA "Aprovechar oferta →" (botón `cta`, `ArrowRight`) y "{nota} · Válido hasta {fecha}"; en móvil, además, el círculo de descuento de 96 px (`accent`) arriba del tipo. `aside` = círculo crema de 190 px con el descuento (`hidden md:flex`). Entrada del texto con `wy-up` solo con `motion-safe`. `labels` = "Elegir oferta", "Oferta anterior", "Oferta siguiente". El `h1` sigue oculto (D9) y va en `children` del carrusel. **Sin ofertas:** `PageHero` plano (`min-h-[640px]`) con `h1` visible "Ofertas" y un subtítulo corto, para que la página conserve el marco (sin `PageHero`, el layout devuelve `main` contenido y las secciones con contenedor propio duplicarían el padding).
- **E3. Tarjeta y tipos como en el tablero (sustituye lo visual de D6 y D13).** `OfferCard`: foto `rounded-[22px]` `aspect-[4/3.4]`, círculo de descuento de 64 px rotado −8° arriba a la derecha, chip blanco del tipo abajo a la izquierda, texto suelto debajo (región · días en `text-primary`, título 22 px, tachado, precio final `accent`, "{nota} · hasta {fecha}") y círculo con flecha de 40 px que se llena `accent` al hover. Grilla `repeat(auto-fill, minmax(min(270px,100%),1fr))` con gap 32/24 desde `sm`; a 390 px se mantienen las 2 columnas compactas del tablero móvil. Tipos: siguen siendo links con `aria-current` (sin `role="tablist"`), pero dentro de un contenedor píldora blanco como el tablero. `OffersSkeleton` copia la nueva silueta.
- **E4. Encabezado de sección con `SectionHeading`** (eyebrow "Ofertas", `h2` "Viaja más, paga menos") y el contador ("N ofertas", 20 px display) a la derecha como `children`; el contador conserva `aria-live="polite"`. El encabezado va dentro del `Suspense` para que el contador llegue con los datos; el `fallback` muestra el mismo encabezado sin contador y el skeleton.
- **E5. Contenedores.** Con `PageHero`, `main` no tiene `max-width` ni `px`: la sección de la grilla (`pt-14`) y `NewsletterSignup` (`py-24`) ponen cada una su `mx-auto w-full max-w-[1240px] px-6`, como `packages-listing.tsx`. El bloque del newsletter pasa a `rounded-[32px]`. Se mantienen D11 (fondo sólido, sin foto, sin promesa de día ni frecuencia) y el formulario tal como está. `page.tsx` no cambia.

**Criterios afectados.** AC13 (hero con el compartido, medidas de E2), AC14 (según E1), AC16 (tarjeta y grilla de E3), AC19 (jerarquía `h1` > `h2` > `h3`; sin animaciones con movimiento reducido), AC20 (el único `"use client"` nuevo es el formulario; el carrusel cliente es el compartido), AC22 (se elimina). El resto, igual.

**Notas de implementación (sin cambio de contrato).** (a) Los AC13/14/15 que describen el carrusel propio (`tabIndex` rotativo, flechas ←/→, `inert`) y "N ofertas activas" quedan sustituidos por E1–E4: el compartido usa pestañas con Tab, y el contador dice "N ofertas". (b) El hero toma las 4 mejores ofertas **con portada** (`imageUrl` es obligatorio en el slide, como `PackagesHero`), en vez de un fondo `bg-dark` sin foto. (c) `HeroCarousel` envuelve `aside` en un `Fragment` con `key` propia: sin ella React avisa de hijo sin `key` al rotar el slide. (d) En móvil los tipos son un riel de una fila con scroll horizontal, como `Movil-Ofertas`.

## Goal
Crear la ruta pública `/ofertas` (tarjeta Trello 012): hero con carrusel de las 4 ofertas activas de mayor descuento, grilla de ofertas filtrable por tipo desde la URL y formulario de newsletter ("Recibe las ofertas antes que nadie") con Server Action. Deja además la función pura de cálculo de descuento que reutilizará el pago (tarjeta 013).

## Scope
- In:
  - Ruta `app/(public)/ofertas/page.tsx` (delgada, `metadata.title = "Ofertas"`) que compone `OffersPage` (`modules/offers`) y `NewsletterSignup` (`modules/newsletter`).
  - Módulo `offers`: service `getActiveOffers()` cacheado, `CACHE_TAGS.offers`, utils puras (cálculo de descuento, rótulos/precios de tarjeta, orden, parseo de `?tipo=`, fecha de vigencia), `OfferHeroCarousel` (único `"use client"` del módulo), `OfferCard`, grilla con estado vacío, tabs de tipo (links) y skeleton.
  - Módulo `newsletter`: schema Zod, service de suscripción (upsert en `newsletter_subscribers`), Server Action `subscribeToNewsletter`, formulario cliente con `useActionState`, sección `NewsletterSignup`.
  - `hooks/use-reduced-motion.ts` extraído del hero del Inicio (que pasa a usarlo, sin cambio visual).
- Out:
  - Invalidación de caché por CRUD de ofertas/paquetes (la dejan las specs de CRUD y pagos; ver Edge cases).
  - CRUD de ofertas del panel (`/operador/ofertas`, `/admin/ofertas`).
  - Envío real de correos, doble opt-in, rate limit, desuscripción y enlace de baja (v1).
  - Paginación (techo conocido en Edge cases).
  - `/paquetes/[slug]` (tarjeta 009): las tarjetas y el CTA apuntan a ella y dan 404 hasta entonces (aceptado, igual que 007/008).
  - Aplicar el descuento en reservas/Stripe (tarjeta 013; aquí solo se deja `calculateOffer`).
  - Barra de tipos pegajosa del diseño móvil, foto de fondo del bloque de newsletter (D11), cambios de schema, migraciones y dependencias nuevas.

## Decisiones a aprobar
- **D1. URL `?tipo=last_minute|rainy_season|groups`** (ausente = "Todas"), igual de simple que 008: `zod` en `parseOfferParams`, hrefs puros en `buildOffersHref`. Valor inválido, vacío o repetido (se toma el primero) se descarta sin error. Los tabs son `<Link scroll={false}>` sin JS de cliente.
- **D2. "Activa" = `offers.is_active` AND (`valid_until` nulo o futuro) AND `packages.status = published`.** Un solo `getActiveOffers()` sin argumentos (una sola entrada de caché; el catálogo cabe en memoria) y el filtro por `tipo` se hace en memoria sobre su resultado. El service evalúa "futuro" al llenar la caché: con `cacheLife("hours")` una oferta vencida puede seguir apareciendo hasta que la entrada se revalide (≤ 1 h con tráfico; sin tráfico, hasta que alguien la pida y se refresque en segundo plano). Desfase aceptado y documentado (Edge cases).
- **D3. Destacadas = las 4 activas de mayor descuento.** Rango efectivo (`discountRank`): `percent` → `discount_value`; `two_for_one` → 50 (con 2 personas se paga 1). Desempate determinista: `valid_until` asc (la que vence antes primero; nulo al final) y luego `id` asc. Con el seed de hoy (2026-10-25): Ballestas (2x1), Tambopata (25), Titicaca (20), Paracas y Huacachina (20, mín. 4). La grilla usa el mismo orden. El carrusel ignora `?tipo=` (siempre las 4 globales).
- **D4. `calculateOffer` pura en `modules/offers/utils/offer-pricing.ts`**, contrato idéntico a `applyOffer` del seed (`lib/db/seed/helpers.ts`): `percent` redondeado a soles enteros por unidad (mitad hacia arriba: `floor((unit*(100-p)+5000)/10000)*100`), `two_for_one` paga `ceil(pax/2)`, `min_people` no aplica si `pax < min_people`. Un test la compara contra `applyOffer` como oráculo (no se toca el seed ni se importa el seed desde código de producción). A diferencia del oráculo, valida entradas (`pax` entero ≥ 1, `unitCents` entero ≥ 0, `discountValue` 1–100 en `percent`) y lanza `RangeError`; sobre dominio válido el resultado es idéntico. La tarjeta 013 la importa por `modules/offers` (`index.ts`).
- **D5. Precios de tarjeta/slide** (`describeOffer`), usando `calculateOffer`:
  - `percent`: tachado = precio por persona; final = `discountedUnitCents`; nota `Desde N personas` si hay `min_people`, si no `Por persona`. Se calcula con `pax = min_people ?? 1` para que `min_people` no anule el descuento mostrado.
  - `two_for_one`: tachado = precio de 2 personas (`2 × unit`); final = `totalCents` con `pax = 2` (= `unit`); nota `Por dos personas`.
  - Badge `-N%` / `2x1`; subtítulo del círculo del hero `descuento` / `paga uno`.
- **D6. `OfferCard` propia**, no se infla `PackageCard` (tiene precio "Desde S/ X / persona", sin badge de descuento ni precio tachado, y la comparten el rail del Inicio y `/paquetes`). Las dos son tarjetas-link a `/paquetes/<slug>` con la misma silueta (`rounded-card bg-surface shadow-card`, foto 4:3).
- **D7. Carrusel propio (`OfferHeroCarousel`), no se reutiliza `HeroCarousel` del Inicio.** El del Inicio no tiene swipe, barras de progreso por oferta, tabs ni precio tachado, y su modelo de slide (blurb, precio "desde") no encaja; adaptarlo lo llenaría de `if`. Se reutiliza el patrón: contenedor `rounded-card` dentro de los 1240 px (007 D4), temporizador JS (no `animationend`: la regla global de reduced motion lo haría girar sin parar; 007 D9), arranque en pausa con `prefers-reduced-motion`, pausa por hover/foco, `wy-fill` de `globals.css`. Lo duplicado se extrae: `useReducedMotion()` a `hooks/` y el hero del Inicio pasa a usarlo (refactor sin cambio de comportamiento, T7).
- **D8. Botón Pausar/Reanudar en el carrusel** (el diseño de Ofertas no lo trae). Se agrega por WCAG 2.2.2 (contenido que se mueve solo > 5 s debe poder pausarse), igual que el hero del Inicio. Desvío menor del diseño.
- **D9. Un `h1` por página**, visualmente oculto (`sr-only`, "Ofertas de viaje en Perú"); los títulos de slide son `<p>` con el tamaño de h1 del artefacto (007 D10). El título visible de la grilla es `h2` "Viaja más, paga menos"; los títulos de tarjeta, `h3`.
- **D10. Composición en la ruta, no en `offers`.** `page.tsx` renderiza `<OffersPage/>` y `<NewsletterSignup/>`: sigue siendo una página delgada y `offers` no importa `newsletter` (los módulos quedan desacoplados; ARCHITECTURE regla 6).
- **D11. Newsletter sin foto de fondo.** El diseño usa la foto de Máncora como fondo decorativo; acá el bloque es `bg-dark` sólido con `rounded-card` (sin dependencia entre módulos ni imagen extra). El texto no promete día ni frecuencia ni baja: "Recibe las ofertas antes que nadie" / "Déjanos tu correo y te avisamos cuando haya nuevas ofertas." (el diseño dice "Un correo a la semana…", "Las ofertas salen los jueves": se descartan).
- **D12. Suscripción idempotente y sin filtrar existencia.** `INSERT … ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL WHERE unsubscribed_at IS NOT NULL`. Correo nuevo, repetido o reactivado devuelven el mismo estado de éxito y el mismo texto; `subscribed_at` original se conserva (v1 no guarda historial de re-suscripciones). El correo se normaliza (`trim` + minúsculas) en el schema Zod, en el borde de la Server Action (SYSTEM-DESIGN). Errores de DB → mensaje genérico, sin detalles ni el correo en logs.
- **D13. Tipos de oferta como links, no `role="tablist"`.** El diseño usa botones `role="tab"`, pero aquí cada opción navega a una URL y no hay paneles: se marca con `<nav aria-label="Tipo de oferta">` + `aria-current="true"` (patrón de 008). Visual: chip de filtro del sistema de diseño (activo `ink` con texto blanco, inactivo blanco con borde), fila con scroll horizontal propio en móvil. Desvío menor del contenedor-píldora blanca del diseño de escritorio.
- **D14. Fecha de vigencia** con `Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" })` → "30 de noviembre de 2026". La zona fija es necesaria: el seed guarda `23:59` hora Lima (04:59 UTC del día siguiente) y en UTC daría el día equivocado. `valid_until` nulo oculta la leyenda "Válido hasta".
- **D15. "Lugar" = `destinations.region`** (007 D8): "Madre de Dios", "Áncash", "Piura"…
- **D16. El predicado `status = published` se repite en `offer-service.ts`** (en `packages` es privado y un módulo no importa internos de otro). Es una línea; si aparece un tercer consumidor se sube a `lib/db`.

## Reuse
- Reuse: `modules/packages` por `index.ts` — `formatDuration` (solo componentes de servidor; los utils puros de `offers` no lo importan porque el barrel arrastra `lib/db`, que lanza sin `DATABASE_URL` en los tests). `parseListingParams`/`buildListingHref` como patrón (no se importan).
- Reuse: `lib/db` (`offers`, `packages`, `destinations`, `newsletterSubscribers`), `lib/money.ts` (`formatPen`), `lib/cache-tags.ts`, `components/ui/{button,input,label,badge}.tsx`, `lucide-react`, `next/link`, `next/image`, `cn`, `zod`, `useActionState` de React 19, la clave `wy-fill` de `globals.css`, tokens (`rounded-card`, `shadow-card`, `bg-dark`, `text-ink-muted`, `font-display`).
- Reuse: `(public)/layout.tsx` y `SITE_LINKS` (ya apunta a `/ofertas`) sin cambios; `modules/home/components/hero-carousel.tsx` como referencia de patrón (D7).
- Reuse (solo test): `applyOffer`, `seedOffers`, `seedPackages` de `lib/db/seed` como oráculo/datos esperados.
- Extend: `lib/cache-tags.ts` — agrega `offers: "offers"`.
- Extend: `modules/home/components/hero-carousel.tsx` — reemplaza `subscribeReducedMotion`/`getReducedMotion`/`useSyncExternalStore` locales por `useReducedMotion()`. Sin cambio de comportamiento.
- New: `hooks/use-reduced-motion.ts` — segundo consumidor real (Inicio + Ofertas); SETUP exige extraer a partir de 2.
- New: `modules/offers/**` y `modules/newsletter/**` — módulos previstos en ARCHITECTURE, sin código previo.
- New: `OfferCard`, `OfferHeroCarousel` — D6, D7 (ningún componente existente muestra descuento ni precio tachado). No se agrega ningún componente shadcn (input/label/button ya existen).

## Acceptance criteria
*(auto)* = comando/test; *(db)* = test de integración con `DATABASE_URL` (`npm run test:db`); *(visual)* = Playwright a 390 px y 1280 px sobre `/ofertas` con la base sembrada (`npm run db:seed`), comparando con el diseño (pantallas `Ofertas` / `Movil-Ofertas`).

### Cálculo y utils
- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` terminan en verde al cierre de cada fase. `next build` no marca `/ofertas` como bloqueante: el hero entra en el shell estático y la grilla (lee `searchParams`) va en streaming dentro de `<Suspense>`.
- AC2 *(auto)*: `calculateOffer` devuelve lo mismo que `applyOffer` (oráculo) para toda combinación de `unitCents ∈ {6000, 9500, 52000, 129000, 165000}` × `pax ∈ 1..8` × términos `{percent 10, 15, 20, 25, 30, 100}`, `{two_for_one}` y `min_people ∈ {null, 4}` (campos `discountedUnitCents`, `discountCents`, `totalCents`). Entradas inválidas (`pax` 0, no entero o negativo; `unitCents` negativo o no entero; `percent` con valor fuera de 1–100 o nulo) lanzan `RangeError`.
- AC3 *(auto)*: `describeOffer` reproduce las cifras del diseño (se comparan con `formatPen`, que usa espacios finos): Tambopata 165000 c / 25 % → `-25%`, tachado S/ 1 650, final S/ 1 238, "Por persona"; Machu Picchu Mágico 129000 c / 15 % → final S/ 1 097; Islas Ballestas 9500 c / 2x1 → `2x1`, `paga uno`, tachado S/ 190, final S/ 95, "Por dos personas"; Paracas y Huacachina 52000 c / 20 % / mín. 4 → final S/ 416, "Desde 4 personas". Incluye `validUntilLabel` (null si no hay vencimiento) y `kindLabel` ("Último minuto", "Temporada de lluvias", "Grupos y familias").
- AC4 *(auto)*: `discountRank` y `compareOffers` implementan D3: 2x1 (50) antes que 25, que 20; empate por `valid_until` asc (nulo al final) y luego `id`; el orden es estable e independiente del orden de entrada.
- AC5 *(auto)*: `formatValidUntil("2026-12-01T04:59:00.000Z")` = "30 de noviembre de 2026" (hora Lima, D14).
- AC6 *(auto)*: `parseOfferParams(raw)` devuelve `{ tipo? }`; acepta solo `last_minute|rainy_season|groups`; descarta valores inválidos/vacíos/otro idioma ("ultimo-minuto"), toma el primero de un array y nunca lanza. `buildOffersHref(tipo)` devuelve `/ofertas` sin `?` para `undefined` y `/ofertas?tipo=<tipo>` si no. `OFFER_TABS` lista Todas + los 3 tipos con su rótulo en español.

### Service
- AC7 *(db)*: `getActiveOffers()` devuelve exactamente las ofertas con `is_active` y (`valid_until` nulo o > ahora) cuyo paquete está `published`. El esperado se calcula desde `seedOffers`/`seedPackages` filtrando contra la hora de la ejecución (con el seed, hoy: 6 de 8; Máncora y Colca inactivas). El test inserta y borra en `afterAll`: una oferta vencida sobre un paquete publicado (excluida), una activa con `valid_until` nulo (incluida) y una oferta activa sobre un paquete `draft` (excluida).
- AC8 *(db)*: el resultado viene ordenado por `compareOffers` (D3) y cada ítem trae la forma de `OfferDto`: `package` con `slug`, `title`, `durationDays`, `priceCents`, `coverImageUrl`, `region`; `validUntil` en ISO 8601 o `null`.
- AC9 *(auto)*: `getActiveOffers` llama a `cacheLife` y a `cacheTag(CACHE_TAGS.offers, CACHE_TAGS.packages)` (test con `next/cache` mockeado).

### Newsletter
- AC10 *(auto)*: `subscribeSchema` normaliza `"  Ana@Correo.COM "` → `"ana@correo.com"`; rechaza vacío, sin `@`, sin dominio y más de 254 caracteres, con mensajes en español ("Ingresa tu correo", "Ingresa un correo válido"); campo ausente/no string (FormData sin `email`) también falla sin lanzar.
- AC11 *(db)*: `subscribeEmail(email)` inserta un correo nuevo con `unsubscribed_at` nulo; un segundo llamado con el mismo correo no duplica la fila ni lanza y conserva `subscribed_at`; si la fila tenía `unsubscribed_at`, queda en `null` (reactivada). Los correos de prueba se borran en `afterAll`.
- AC12 *(auto)*: `subscribeToNewsletter(prev, formData)` con el service mockeado: correo inválido → `{ status: "error", message, email }` y el service no se llama; válido → el service se llama una vez con el correo normalizado y el resultado es `{ status: "success", message }`; dos llamadas seguidas con el mismo correo devuelven exactamente el mismo estado de éxito (no se revela si ya existía); si el service lanza, devuelve `{ status: "error" }` con el mensaje genérico y no propaga la excepción.

### UI
- AC13 *(visual)*: **Hero.** Con el seed muestra 4 slides: badge circular `-N%`/`2x1` (más grande desde `md`, 96 px en móvil, ambos visibles), línea "tipo · región" en mayúsculas, título (`<p>` grande), precio final grande con el tachado (`<s>`) al lado, "nota · Válido hasta <fecha>" (sin la parte de fecha si no hay vencimiento) y el CTA "Aprovechar oferta" como link a `/paquetes/<slug>`. Imagen de portada a pantalla completa con degradado; sin portada, fondo `bg-dark`. Altura mínima 560 px (móvil) / 640 px (escritorio) dentro del contenedor de 1240 px (`rounded-card`). Con 0 ofertas activas el hero no se renderiza; con 1 no hay controles.
- AC14 *(visual)*: **Carrusel.** Avanza solo cada 6.5 s con una barra de progreso por oferta (anteriores llenas, activa animándose); se pausa con hover, foco dentro y botón Pausar/Reanudar (`aria-label` cambia). Swipe horizontal > 50 px y mayor que el vertical cambia de slide. Con `prefers-reduced-motion: reduce` arranca en pausa, sin barra animada, y no avanza hasta pulsar Reanudar. Slides inactivos con `inert` + `aria-hidden`; `aria-live="polite"` solo en pausa. Tabs: `role="tablist"` "Elegir oferta" con `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` rotativo (roving: solo el tab activo es tabulable), flechas ←/→, Inicio/Fin; cada slide es un `role="tabpanel"` con `aria-labelledby`. Botones anterior/siguiente (≥ 48 px) visibles desde `md`; objetivos táctiles ≥ 44 px; foco visible (`focus` sobre `bg-dark`).
- AC15 *(visual)*: **Tipos.** `<nav aria-label="Tipo de oferta">` con "Todas", "Último minuto", "Temporada de lluvias", "Grupos y familias" como `<a>` reales; el activo lleva `aria-current="true"`; "Todas" quita el parámetro; navegan sin saltar el scroll y funcionan sin JS. Contador `aria-live="polite"`: "N ofertas activas" / "1 oferta activa" (cuenta las del tipo elegido). `/ofertas?tipo=xyz` se comporta como `/ofertas`. Con el seed hoy: Todas 6, Último minuto 1, Temporada de lluvias 3, Grupos y familias 2.
- AC16 *(visual)*: **Grilla y tarjeta.** 2 columnas a 390 px (tarjetas compactas como `Movil-Ofertas`), 3 a 1024 px y 4 a 1280 px; sin scroll horizontal de página. Cada tarjeta es un solo `<a>` a `/paquetes/<slug>` con: foto (`alt=""`, decorativa: el título está en el link), badge `-N%`/`2x1`, rótulo del tipo, "<región> · <N días>", título (`h3`, `line-clamp-2`), precio tachado, precio final en `accent`, nota y "hasta <fecha>" (oculto si no hay vencimiento). Los precios llevan texto accesible oculto ("Antes", "Con oferta"). Los `h3` cuelgan del `h2` "Viaja más, paga menos". Hover y foco con los tokens del sistema.
- AC17 *(visual)*: **Vacíos.** `?tipo=` válido sin ofertas: "No hay ofertas de este tipo por ahora." + link "Ver todas" a `/ofertas`, sin grilla vacía y con contador "0 ofertas activas". Sin ninguna oferta activa: "Por ahora no hay ofertas activas. Vuelve pronto." + link "Ver paquetes" a `/paquetes`, sin hero.
- AC18 *(visual)*: **Newsletter.** Sección `bg-dark rounded-card` con `h2` "Recibe las ofertas antes que nadie", texto sin día ni frecuencia, `<label>` visible "Tu correo", campo `type="email"` (`autocomplete="email"`, 52 px, 16 px), botón "Suscribirme" (`variant="cta"`) y `noValidate` en el `<form>` para que el error salga siempre en español. Éxito: mensaje en un `role="status"`/`aria-live="polite"` y el campo se vacía. Error de validación: mensaje con `aria-live`, campo con `aria-invalid` y `aria-describedby` al mensaje, el correo escrito se conserva. Mientras envía, botón deshabilitado con "Enviando…". Correo repetido se ve igual que uno nuevo.
- AC19 *(visual)*: Con `prefers-reduced-motion` no hay animaciones nuevas (barras, fade del carrusel, zoom de foto); se agrega un único `h1` (sr-only) y la jerarquía `h1` > `h2` > `h3`; contraste de texto sobre fotos ≥ 4.5:1 gracias al degradado.

### Arquitectura
- AC20 *(auto)*: `"use client"` solo en `modules/offers/components/offer-hero-carousel.tsx` y `modules/newsletter/components/newsletter-form.tsx` (más los que ya existían). El carrusel importa solo **tipos** (`import type`) de `modules/*`; ningún módulo importa internos de otro (`offers` no importa `newsletter` ni a la inversa; `offers` usa `@/modules/packages` solo por `index.ts` y desde componentes de servidor). `package.json` no gana dependencias.
- AC21 *(auto)*: `metadata.title` de la ruta es "Ofertas" (la plantilla raíz produce "Ofertas · Wayra").
- AC22 *(visual)*: El hero del Inicio no cambia tras el refactor a `useReducedMotion()`: mismo avance, pausa y arranque en pausa con reduced motion (capturas antes/después a 390 y 1280 px).

## Contracts

### URL
```
/ofertas?tipo=last_minute|rainy_season|groups     (opcional; ausente = Todas)
```

### `lib/cache-tags.ts`
```ts
export const CACHE_TAGS = {
  packages: "packages",
  destinations: "destinations",
  categories: "categories",
  offers: "offers",
} as const;
```

### `modules/offers/types/offer.ts`
```ts
export type OfferKind = "last_minute" | "rainy_season" | "groups";
export type DiscountType = "percent" | "two_for_one";

export type OfferTerms = {
  discountType: DiscountType;
  discountValue: number | null; // porcentaje 1–100; null si two_for_one
  minPeople: number | null;
};

export type OfferDto = OfferTerms & {
  id: string;
  kind: OfferKind;
  validUntil: string | null; // ISO 8601 (serializable en la caché)
  package: {
    slug: string;
    title: string;
    durationDays: number;
    priceCents: number; // por persona, PEN
    coverImageUrl: string | null;
    region: string; // destinations.region (D15)
  };
};
```

### `modules/offers/utils/offer-pricing.ts` (puras, sin db)
```ts
export type OfferPricingInput = OfferTerms & { unitCents: number; pax: number };
export type OfferPricing = {
  discountedUnitCents: number; // precio por persona con descuento (percent); = unitCents en two_for_one
  discountCents: number;
  totalCents: number;
};

// D4. Mismo resultado que applyOffer de lib/db/seed/helpers.ts en dominio válido.
// Lanza RangeError con entradas inválidas. Es lo que reutilizará la tarjeta 013.
export function calculateOffer(input: OfferPricingInput): OfferPricing;

// D3. percent → discountValue; two_for_one → 50.
export function discountRank(terms: OfferTerms): number;
export function compareOffers(
  a: Pick<OfferDto, "id" | "validUntil"> & OfferTerms,
  b: Pick<OfferDto, "id" | "validUntil"> & OfferTerms,
): number; // sort ascendente = mayor descuento primero, luego vencimiento, luego id
```

### `modules/offers/utils/offer-view.ts` (puras; usa `formatPen` de `lib/money`, nunca `@/modules/packages`)
```ts
export const OFFER_KIND_LABELS: Record<OfferKind, string>;
// last_minute "Último minuto", rainy_season "Temporada de lluvias", groups "Grupos y familias"

export function formatValidUntil(iso: string): string; // D14

export type OfferLabels = {
  kindLabel: string;
  badge: string;          // "-25%" | "2x1"
  badgeSub: string;       // "descuento" | "paga uno"
  wasLabel: string;       // formatPen(...)
  nowLabel: string;       // formatPen(...)
  note: string;           // "Por persona" | "Por dos personas" | "Desde N personas"
  validUntilLabel: string | null; // "30 de noviembre de 2026" | null
};
export function describeOffer(offer: OfferDto): OfferLabels; // D5
```

### `modules/offers/utils/offer-params.ts` (puras)
```ts
export const OFFER_TABS: { value: OfferKind | undefined; label: string }[];
//  undefined → "Todas", last_minute → "Último minuto", rainy_season → "Temporada de lluvias", groups → "Grupos y familias"
export function parseOfferParams(
  raw: Record<string, string | string[] | undefined>,
): { tipo?: OfferKind };
export function buildOffersHref(tipo: OfferKind | undefined): string;
```

### `modules/offers/services/offer-service.ts`
```ts
export async function getActiveOffers(): Promise<OfferDto[]>;
```
`"use cache"`, `cacheLife("hours")`, `cacheTag(CACHE_TAGS.offers, CACHE_TAGS.packages)`, sin argumentos. Consulta: `offers ⨝ packages ⨝ destinations WHERE offers.is_active AND packages.status = 'published' AND (offers.valid_until IS NULL OR offers.valid_until > now)`; mapeo a `OfferDto` (`validUntil` → `toISOString()`); `sort(compareOffers)`. Índice existente `offers_package_active_idx`.

### `modules/offers/components/`
```tsx
// offer-hero-carousel.tsx  ("use client"; recibe solo datos serializables)
export type OfferSlide = {
  slug: string; title: string; coverImageUrl: string | null;
  kindLabel: string; place: string;           // place = región
  badge: string; badgeSub: string;
  wasLabel: string; nowLabel: string; note: string; validUntilLabel: string | null;
};
export function OfferHeroCarousel({ slides }: { slides: OfferSlide[] }): JSX.Element | null;

// offer-hero.tsx  (servidor): getActiveOffers() → primeras 4 → OfferSlide[] (describeOffer + region) → <OfferHeroCarousel/>; null si no hay
export async function OfferHero(): Promise<JSX.Element | null>;

// offer-card.tsx  (servidor)
export function OfferCard({ offer }: { offer: OfferDto }): JSX.Element; // usa describeOffer + formatDuration de @/modules/packages

// offer-grid.tsx  (servidor)
export const OFFERS_GRID_CLASS: string;
export function OfferGrid({ offers, tipo }: { offers: OfferDto[]; tipo?: OfferKind }): JSX.Element; // lista o estado vacío (AC17)

// offer-tabs.tsx  (servidor)
export function OfferTabs({ tipo }: { tipo?: OfferKind }): JSX.Element; // <nav> de <Link scroll={false}>

// offers-skeleton.tsx
export function OffersSkeleton(): JSX.Element;

// offers-page.tsx
export function OffersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): JSX.Element;
// shell estático: <h1 sr-only/> + <OfferHero/> + encabezado de sección ("Ofertas" / "Viaja más, paga menos")
// <Suspense fallback={<OffersSkeleton/>}> OffersCatalog: await searchParams → parseOfferParams → getActiveOffers → filtro por tipo en memoria → contador + <OfferTabs/> + <OfferGrid/>
```

### `modules/offers/index.ts`
```ts
export { OffersPage } from "./components/offers-page";
export { getActiveOffers } from "./services/offer-service";
export { calculateOffer, discountRank } from "./utils/offer-pricing";
export type { OfferPricing, OfferPricingInput } from "./utils/offer-pricing";
export type { OfferDto, OfferKind, OfferTerms, DiscountType } from "./types/offer";
```

### `hooks/use-reduced-motion.ts`
```ts
export function useReducedMotion(): boolean; // useSyncExternalStore sobre (prefers-reduced-motion: reduce); false en el servidor
```

### `modules/newsletter/types/newsletter.ts`
```ts
export type SubscribeState = {
  status: "idle" | "success" | "error";
  message: string;
  email?: string; // eco del correo escrito, solo en error
};
```

### `modules/newsletter/schemas/newsletter-schema.ts`
```ts
export const subscribeSchema: z.ZodType<{ email: string }>; // email: trim → lowercase → email válido, máx. 254; mensajes en español
export type SubscribeInput = z.infer<typeof subscribeSchema>;
```

### `modules/newsletter/services/newsletter-service.ts`
```ts
// Recibe el correo ya normalizado por subscribeSchema (el service no vuelve a normalizar).
export async function subscribeEmail(email: string): Promise<void>;
// db.insert(newsletterSubscribers).values({ email })
//   .onConflictDoUpdate({ target: newsletterSubscribers.email, set: { unsubscribedAt: null }, setWhere: isNotNull(newsletterSubscribers.unsubscribedAt) })
```
Devuelve `void` a propósito: quien llama no puede saber si el correo existía (D12).

### `modules/newsletter/actions/subscribe-action.ts`
```ts
"use server";
export async function subscribeToNewsletter(prev: SubscribeState, formData: FormData): Promise<SubscribeState>;
```
Flujo: `subscribeSchema.safeParse({ email: formData.get("email") })` → error → `{ status: "error", message: <primer mensaje>, email: <valor crudo si es string> }`; ok → `subscribeEmail(data.email)` → `{ status: "success", message: "¡Listo! Te avisaremos cuando haya nuevas ofertas." }`; `catch` → `console.error` (sin el correo) + `{ status: "error", message: "No pudimos suscribirte. Inténtalo de nuevo en unos minutos." }`. Sin sesión ni rol: la matriz de ERM da `C` al público en `newsletter_subscribers`.

### Componentes de `newsletter`
```tsx
// newsletter-form.tsx  ("use client"): useActionState(subscribeToNewsletter, { status: "idle", message: "" }); AC18
export function NewsletterForm(): JSX.Element;
// newsletter-signup.tsx (servidor): <section> bg-dark rounded-card con h2 + texto + <NewsletterForm/>
export function NewsletterSignup(): JSX.Element;
// index.ts
export { NewsletterSignup } from "./components/newsletter-signup";
```

### Ruta
```tsx
// app/(public)/ofertas/page.tsx  (delgada)
import { NewsletterSignup } from "@/modules/newsletter";
import { OffersPage } from "@/modules/offers";
export const metadata = { title: "Ofertas" };
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <OffersPage searchParams={searchParams} />
      <NewsletterSignup />
    </>
  );
}
```

## Edge cases
- **Sin ofertas activas / base vacía**: hero oculto, h1 sr-only y estado vacío (AC17); nunca "undefined" ni error. El seed tiene fechas fijas (la última vence 2026-12-31): pasado ese día, `/ofertas` muestra el vacío hasta que se resiembre o haya CRUD.
- **`?tipo=` inválido, vacío o repetido**: se ignora / toma el primero (AC6), sin 500 ni 404. Un tipo válido sin ofertas muestra el vacío con "Ver todas".
- **Oferta vencida aún en caché** (D2): puede verse hasta que la entrada se revalide (`hours`: obsoleta tras 5 min, revalida a 1 h, expira a 1 día). Hasta que existan productores que invaliden con `updateTag`/`revalidateTag(CACHE_TAGS.offers)`, un cambio en ofertas o precios tarda lo mismo en reflejarse. El CTA lleva a `/paquetes/[slug]`; cuando el pago (013) vuelva a validar la vigencia en el servidor, un clic sobre una oferta vencida cae sin descuento.
- **Hero con < 4 ofertas**: muestra las que haya; con 1 slide no hay controles, barras ni temporizador (`count > 1`).
- **Paquete sin `cover_image_url`**: tarjeta con bloque `bg-sand` y hero con fondo `bg-dark`.
- **`valid_until` nulo**: sin "Válido hasta" ni "hasta <fecha>".
- **Oferta `two_for_one` con `min_people` > 2**: no existe en el seed ni en el diseño y la tarjeta no lo modela (muestra siempre la cuenta de 2 personas). La futura spec de CRUD de ofertas debe impedirla o ampliar `describeOffer`. *ponytail: techo conocido.*
- **`percent` con `min_people`**: el precio mostrado es "desde N personas" (el descuento solo aplica con N o más); la nota lo dice.
- **Mismo paquete con varias ofertas activas** (el schema lo permite): se listan todas. *ponytail: sin deduplicar; cuando el CRUD lo permita se decide una regla (la de mayor descuento).*
- **Volumen**: filtrado y orden en memoria sobre todas las activas, sin paginación. *ponytail: techo ~60 ofertas; después se pasa `tipo` al service y se pagina por `?pagina=`.*
- **Títulos largos / textos en español con tildes**: `line-clamp-2` en tarjeta; `text-balance` en el hero; "Último minuto", "Áncash".
- **Newsletter**: correo con mayúsculas/espacios → normalizado (AC10); dos pestañas enviando a la vez → el `ON CONFLICT` evita el duplicado; correo > 254 → error de validación; DB caída → error genérico (AC12). Sin rate limit ni CAPTCHA: cualquiera puede inscribir correos ajenos o llenar la tabla (`ponytail`: sin doble opt-in ni límites en v1; agregar confirmación por correo y un límite por IP —p. ej. Vercel BotID/Upstash— antes de enviar el primer correo real). Sin enlace de baja: no hay envío todavía, pero la desuscripción (y el consentimiento de la Ley 29733) debe resolverse antes del primer envío.
- **Sin JS**: los tabs de tipo funcionan (links). El formulario usa la Server Action vía `useActionState`, que React hidrata con mejora progresiva; no se promete el estado de error sin JS.
- **Reduced motion**: la regla global ya anula animaciones; el carrusel además arranca en pausa y no avanza (D7).
- **`DATABASE_URL` ausente**: igual que 007/008, `lib/db` lanza al importarse y `next build` falla; aceptado. Los tests no-db no importan `lib/db`.

## Tests
`npm test` corre los no-db; los *(db)* con `npm run test:db`, omitidos sin `DATABASE_URL` (patrón de 007/008: `describe.skipIf`, `await import()` dentro del bloque, `next/cache` mockeado). Vitest solo recoge `**/*.test.ts`: no hay tests de componentes `.tsx` (SETUP §3).

- `modules/offers/utils/offer-pricing.test.ts` — AC2 (oráculo contra `applyOffer`: matriz de precios × pax × términos; `RangeError` en entradas inválidas; redondeo a mitad hacia arriba, p. ej. 129000 c × 15 % = S/ 1 097), AC4 (`discountRank`, `compareOffers`: 2x1 > 25 > 20, empate por vencimiento con nulos al final, luego `id`; invariante al reordenar la entrada).
- `modules/offers/utils/offer-view.test.ts` — AC3 (las cuatro ofertas del diseño; `validUntilLabel` null; notas), AC5 (`formatValidUntil` con 04:59 UTC y con mediodía UTC).
- `modules/offers/utils/offer-params.test.ts` — AC6 (válidos, inválidos, vacío, array, `buildOffersHref` sin `?`, `OFFER_TABS`).
- `modules/offers/services/offer-service.test.ts` *(db)* — AC7 (esperado calculado desde `seedOffers` contra "ahora"; vencida, sin vencimiento y paquete `draft` insertados y borrados en `afterAll`; el borrado de ofertas va antes que el del paquete por `onDelete: restrict`), AC8 (orden y forma del DTO), AC9 (`cacheLife`/`cacheTag`).
- `modules/newsletter/schemas/newsletter-schema.test.ts` — AC10.
- `modules/newsletter/services/newsletter-service.test.ts` *(db)* — AC11 (correos únicos por ejecución, p. ej. `test-<uuid>@wayra.test`, borrados en `afterAll`).
- `modules/newsletter/actions/subscribe-action.test.ts` — AC12 (service mockeado con `vi.mock`; la persistencia real la cubre el test db de AC11, así la action no se acopla a la forma de la consulta de Drizzle).
- No se testea markup ni componentes. AC13–AC19 y AC22 son manuales con Playwright (390×844 y 1280×800), a cargo del orquestador tras la fase 4: capturas, teclado (Tab, flechas en tabs del carrusel, Enter), swipe (emulación táctil), `prefers-reduced-motion`, `scrollWidth`, `?tipo=xyz`, `?tipo=groups`, envío del formulario con correo inválido / nuevo / repetido, y el hero del Inicio antes/después.

## Plan
Las fases 1 y 2 tocan archivos disjuntos: pueden ejecutarse en paralelo. La fase 3 depende de la 1; la 4, de las tres anteriores.

### Phase 1 — Offers: tipos, cálculo y service
Entrega: `getActiveOffers` y todas las utils puras testeadas. La app no gana rutas.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: tag `offers` y tipos del módulo | lib/cache-tags.ts, modules/offers/types/offer.ts | - | A | AC9 | done |
| T2 | Utils puras: `calculateOffer`/`discountRank`/`compareOffers`, `describeOffer`/`formatValidUntil`, `parseOfferParams`/`buildOffersHref` + tests | modules/offers/utils/offer-pricing.ts, modules/offers/utils/offer-pricing.test.ts, modules/offers/utils/offer-view.ts, modules/offers/utils/offer-view.test.ts, modules/offers/utils/offer-params.ts, modules/offers/utils/offer-params.test.ts | T1 | B | AC2, AC3, AC4, AC5, AC6 | done |
| T3 | `getActiveOffers` cacheado + tests de integración | modules/offers/services/offer-service.ts, modules/offers/services/offer-service.test.ts | T1, T2 | C | AC7, AC8, AC9 | done |

### Phase 2 — Newsletter: suscripción
Entrega: formulario funcional dentro de `modules/newsletter`, con Server Action testeada. Sin ruta todavía.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | Tipo `SubscribeState`, schema Zod y service `subscribeEmail` + tests | modules/newsletter/types/newsletter.ts, modules/newsletter/schemas/newsletter-schema.ts, modules/newsletter/schemas/newsletter-schema.test.ts, modules/newsletter/services/newsletter-service.ts, modules/newsletter/services/newsletter-service.test.ts | - | A | AC10, AC11 | done |
| T5 | Server Action `subscribeToNewsletter` + test | modules/newsletter/actions/subscribe-action.ts, modules/newsletter/actions/subscribe-action.test.ts | T4 | B | AC12 | done |
| T6 | `NewsletterForm` (cliente), `NewsletterSignup` e `index.ts` | modules/newsletter/components/newsletter-form.tsx, modules/newsletter/components/newsletter-signup.tsx, modules/newsletter/index.ts | T5 | C | AC18, AC20 | done |

### Phase 3 — Offers: componentes
Entrega: hero, tarjeta, grilla, tabs y skeleton listos para componer; el hook compartido y el Inicio sin cambios visibles.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T7 | setup: `useReducedMotion` y hero del Inicio usándolo | hooks/use-reduced-motion.ts, modules/home/components/hero-carousel.tsx | - | A | AC22 | reemplazada (E1: T12) |
| T8 | `OfferCard`, `OfferGrid` (con estado vacío), `OfferTabs`, `OffersSkeleton` | modules/offers/components/offer-card.tsx, modules/offers/components/offer-grid.tsx, modules/offers/components/offer-tabs.tsx, modules/offers/components/offers-skeleton.tsx | T2 | B | AC15, AC16, AC17, AC19 | hecha; se rehace en T13 (E3) |
| T9 | `OfferHeroCarousel` (cliente) y `OfferHero` (servidor) | modules/offers/components/offer-hero-carousel.tsx, modules/offers/components/offer-hero.tsx | T3, T7 | B | AC13, AC14, AC19, AC20 | reemplazada (E1/E2: T11, T12) |

### Phase 4 — Página y ruta
Entrega: `/ofertas` completa con datos reales, tipos por URL, carrusel y newsletter.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T10 | `OffersPage` (shell, Suspense, contador), `index.ts` del módulo y ruta delgada | modules/offers/components/offers-page.tsx, modules/offers/index.ts, app/(public)/ofertas/page.tsx | T3, T6, T8, T9 | A | AC1, AC13, AC15, AC17, AC20, AC21 | done |

### Phase 5 — Adaptación al marco de `main` (Enmienda 1)
Entrega: `/ofertas` con `PageHero` y `HeroCarousel` compartidos, tarjeta y tipos del tablero, `SectionHeading` y contenedores propios. T11 y T13 tocan archivos disjuntos y corren en paralelo; T12 depende de T11 y T14 de T12 y T13.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T11 | `HeroCarousel` compartido: props opcionales `labels` y `aside` por slide (E1); Inicio y Paquetes sin cambio | components/shared/hero-carousel.tsx | - | A | AC14, AC20 | done |
| T12 | `OfferHero` sobre `HeroCarousel` (E2); eliminar `OfferHeroCarousel` y `hooks/use-reduced-motion.ts` | modules/offers/components/offer-hero.tsx, modules/offers/components/offer-hero-carousel.tsx (eliminar), hooks/use-reduced-motion.ts (eliminar) | T11 | B | AC13, AC14, AC19, AC20 | done |
| T13 | `OfferCard`, `OfferGrid`, `OfferTabs`, `OffersSkeleton` con la silueta del tablero (E3) | modules/offers/components/offer-card.tsx, modules/offers/components/offer-grid.tsx, modules/offers/components/offer-tabs.tsx, modules/offers/components/offers-skeleton.tsx | - | A | AC15, AC16, AC17, AC19 | done |
| T14 | `OffersPage` con `SectionHeading`, contador y contenedor propio (E4/E5); `NewsletterSignup` con su contenedor y `rounded-[32px]` | modules/offers/components/offers-page.tsx, modules/newsletter/components/newsletter-signup.tsx | T12, T13 | C | AC13, AC15, AC16, AC17, AC19 | done |

### Verificación (orquestador, tras T10; no es tarea de developer)
Con `.env.local` (DB sembrada + claves de Clerk): `npm run build && npm start`; `npm run test:db`. Playwright a 390×844 y 1280×800 sobre `/ofertas`, `/ofertas?tipo=groups`, `/ofertas?tipo=xyz` y el Inicio (hero igual que antes); formulario con correo inválido, nuevo y repetido (verificando en la tabla que no se duplica y que `unsubscribed_at` se limpia si se pone a mano). Resultado y capturas van al PR; no se commitea código de Playwright. Reviewer por fase: `tsc`, `lint`, `build`, `test` (AC1).

## Open questions
Ninguna bloquea la aprobación; todas tienen default en la spec.
- **Q1 (no bloqueante, desvío del diseño):** D11 quita la foto de fondo del bloque de newsletter y el texto "Un correo a la semana / jueves". ¿Se mantiene, o se quiere una foto (se pasaría `imageUrl` opcional a `NewsletterSignup` desde la ruta)?
- **Q2 (no bloqueante, desvío del diseño):** D8 agrega el botón Pausar/Reanudar por WCAG 2.2.2, y D13 usa chips-link en vez del contenedor-píldora de tabs. ¿Se acepta?
- **Q3 (no bloqueante):** D3 rankea el 2x1 como 50 %, lo que lo deja siempre primero. ¿Es lo deseado, o se prefiere ordenar solo por porcentaje y dejar el 2x1 al final de los empates?
