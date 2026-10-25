# Inicio (/) y servicios de catálogo

- Module: packages (con `destinations` y `home`)
- Status: approved
- Approved by: leandro291 (2026-10-25)
- Mode: SDD

## Goal
Reemplazar la muestra D4 de `app/(public)/page.tsx` por la pantalla Inicio del diseño (hero, buscador, paquetes más reservados, destinos, "Por qué Wayra", CTA de WhatsApp) y crear los primeros services de catálogo (solo `status = published`) con caché de Next 16 (Cache Components + `cacheTag`), reutilizables por `/paquetes` (008) y `/destinos/[slug]` (011).

## Scope
- In:
  - `next.config.ts`: `cacheComponents: true` y verificación de que el resto de la app (Clerk, encabezado, sign-in/up) sigue compilando; Suspense donde el build lo exija.
  - Services cacheados: `getFeaturedPackages`, `getCategories`, `getDestinations`. DTOs, constantes de tags (`CACHE_TAGS`), `formatPen`.
  - `PackageCard` (módulo `packages`, la reutilizan 008 y 011) y las secciones de Inicio en el módulo nuevo `home`.
  - Hero carrusel de 5 slides (cliente), rail de paquetes con chips de categoría (cliente), buscador GET, franja de confianza, bento de destinos, "Por qué Wayra", CTA de WhatsApp, créditos de fotos.
  - `.env.example`: `NEXT_PUBLIC_WHATSAPP_NUMBER`.
  - `docs/ARCHITECTURE.md`: fila del módulo `home`.
- Out:
  - `/paquetes`, `/paquetes/[slug]`, `/destinos/[slug]`: siguen en 404 (tarjetas 008, 011 y siguientes). Los links del Inicio apuntan a ellas igual (misma decisión que D3 de design-foundation).
  - Fecha y viajeros del buscador (se omiten hasta que 008 los soporte). Link "Todos los destinos →" (el bento ya muestra todos y no existe `/destinos`). Swipe táctil del hero (el rail usa scroll nativo). Animación de entrada `wy-up`.
  - Invalidación real de la caché: no hay aún quien publique/edite paquetes ni confirme reservas. Esta spec deja los tags; las specs de CRUD del operador/admin y de pagos llaman a `updateTag`/`revalidateTag` (ver Contracts).
  - Cambios de schema, migraciones, nuevas dependencias, `remotePatterns` (ver D6).
  - Encabezado y pie (ya existen en `components/shared`).

## Decisiones a aprobar
- **D1. Destacados = más reservados** (ya decidido por el usuario): orden por cantidad de reservas `confirmed` del paquete, desempate por `packages.created_at` desc y, para que sea determinista, por `packages.id`. Sin cambios de schema. Los paquetes sin reservas igual aparecen (después). Alimenta el rail y los 5 slides del hero (primeros 5 con portada).
- **D2. `cacheComponents: true` ahora** (ya decidido). Se activa en una fase propia (Phase 1) antes de escribir código de datos, para aislar el riesgo (ver "Cache Components: riesgo y Suspense").
- **D3. `modules/home` nuevo, solo compone.** El Inicio mezcla `packages` y `destinations`; ARCHITECTURE ya prevé módulos que solo componen (`checkout`, `admin`) y prohíbe que un módulo importe internos de otro. `home` consume únicamente los `index.ts` públicos de `packages` y `destinations` (más `lib/*`). Se agrega su fila a la tabla de ARCHITECTURE.
- **D4. El hero va dentro del contenedor de 1240 px** como tarjeta redondeada (`rounded-card`), no a sangre completa como en el artefacto. El artefacto lo dibuja a sangre porque el encabezado vive dentro del hero; acá el encabezado es una barra aparte y `(public)/layout.tsx` fija el contenedor. Sacarlo del contenedor exige `100vw` (scroll horizontal por la barra de scroll, rompe AC12 de 003) o tocar el layout de todas las rutas públicas. Se evita. Altura mínima 560 px (móvil) / 640 px (escritorio), en vez de los 720 px del artefacto.
- **D5. Chips de categoría filtran en el cliente** sobre los 12 destacados ya cargados (el artefacto filtra igual). Alternativa descartada: `?categoria=` por `searchParams`, que vuelve dinámica la ruta y rompe el prerender estático de Cache Components. Consecuencia: solo se muestran los chips con al menos una tarjeta cargada (nunca hay chip vacío). "Un día" = `isDayTour` (`kind = day_tour` o `duration_days = 1`) y va siempre al final. Las categorías salen ordenadas por nombre (no hay columna de orden; el artefacto las ordena a mano: Aventura, Cultura, Naturaleza…).
- **D6. Imágenes con `next/image` sin tocar `images.remotePatterns`.** Verificado: el seed guarda rutas locales (`/seed/<key>.jpg`, `lib/db/seed/images.ts`; archivos en `public/seed/`), que `next/image` sirve sin configuración. ERM dice que en producción serán URLs de Vercel Blob, pero hoy no hay subida (`BLOB_READ_WRITE_TOKEN` sin uso): cuando exista, esa spec agrega `*.public.blob.vercel-storage.com` a `remotePatterns`. Hasta entonces, una URL absoluta en `cover_image_url` hace fallar `next/image` (ver Edge cases).
- **D7. Services devuelven céntimos, no texto.** El formato (`S/ 1 290`) es de presentación: `formatPen` en `lib/money.ts`, aplicado en componentes. Así los mismos services sirven a 008/011/checkout.
- **D8. "Lugar" de tarjetas y slides = `destinations.region`** (el artefacto muestra "Madre de Dios", "Áncash", "Piura", no el nombre del destino). El título del destino sí se usa en el buscador y el bento.
- **D9. Carrusel con temporizador JS, no `animationend`.** La barra de progreso es solo visual. Si el avance dependiera de la animación CSS, la regla global `prefers-reduced-motion` (animaciones a ~0 ms) lo haría girar sin parar. Con reduced motion el carrusel arranca **en pausa**.
- **D10. Un `h1` por página**: visualmente oculto (`sr-only`, "Wayra: paquetes y tours por todo el Perú"); los títulos de slide son `<p>` con el tamaño de h1 del artefacto. Evita 5 `h1` apilados en el DOM.
- **D11. Los destinos del bento y del buscador son los que tienen al menos un paquete publicado** (el "desde S/" no existe sin paquetes). Orden: más paquetes publicados primero, luego nombre.
- **D12. Créditos de fotos CC**: DESIGN-SYSTEM exige crédito de las fotos con licencia CC "en el pie". El pie compartido no los tiene y el artefacto los pone al final del Inicio. Se agrega una línea estática al final del Inicio (texto del artefacto). Se retira cuando las fotos pasen a Blob con crédito propio (`package_images.credit`).

## Cache Components: riesgo y Suspense
`cacheComponents: true` cambia el modelo de render de **toda** la app: la lectura de datos o APIs de request (`cookies()`, `headers()`, `searchParams`) fuera de un `use cache` queda fuera del shell estático y, sin `<Suspense>` por encima, el build falla ("blocking route"). Revisión de lo existente (verificada en el repo y en `node_modules`):

| Pieza | Estado | Qué hacer |
| ----- | ------ | --------- |
| `ClerkProvider` en `app/layout.tsx` | `@clerk/nextjs` 7.9.20: solo lee headers/cookies si se le pasa `dynamic` (`dist/esm/app-router/server/ClerkProvider.js`); acá no se pasa, así que es estático y no necesita Suspense | Verificar con `next build`. Si el build marca la ruta como bloqueante (p. ej. modo keyless sin claves), envolver el provider/children en `<Suspense>` en `app/layout.tsx` o definir las claves en el entorno de build |
| `SiteHeader` (`Show`, `SignInButton`, `UserButton`) | Ya está dentro de `<Suspense>` | Sin cambios; confirmar en el build |
| `proxy.ts` (`clerkMiddleware`) | Corre antes del render; no afecta el prerender | Sin cambios |
| `app/sign-in`, `app/sign-up` (`<SignIn/>`, `<SignUp/>`) | Componentes cliente de Clerk | Verificar; si el build los marca, envolver en `<Suspense>` |
| `next/font/google` | Se resuelve en build | Sin cambios |
| `lib/db` | Instancia el `Pool` al importarse y **lanza si falta `DATABASE_URL`** | El build del Inicio ejecuta las consultas (prerender): `DATABASE_URL` pasa a ser obligatoria también en `next build` (local y Vercel) |

Reglas para código nuevo bajo Cache Components:
- Cada función cacheada declara `cacheLife` explícito y `cacheTag` (docs `use-cache.md`, `cacheLife.md`). `cacheLife("hours")` = stale 5 min / revalidate 1 h / expire 1 día; `revalidate` ≥ 5 min la deja dentro del prerender. Nunca perfiles `seconds` (quedarían fuera del shell).
- Argumentos y retornos de funciones cacheadas deben ser serializables: DTOs planos, sin `Date`/clases. Los services devuelven solo números, strings y arrays.
- `cacheTag` lanza si se llama fuera de un `use cache`: los tests mockean `next/cache`.
- Un componente cliente nunca importa `@/modules/packages` ni `@/modules/destinations` en runtime (arrastraría `lib/db` y el driver al bundle del cliente): solo `import type`, o utilidades puras por `lib/*`.

## Reuse
- Reuse: `lib/db` (`db`, tablas `packages`, `destinations`, `categories`, `packageCategories`, `bookings`) — el service usa `db.select` de Drizzle con joins/agregados, sin esquema nuevo. Índices existentes cubren las consultas (`packages_status_kind_idx`, `bookings_package_status_idx`, `packages_destination_idx`).
- Reuse: `components/ui/button.tsx` (variante `cta`, link con `render={<Link/>}` y `nativeButton={false}`, patrón ya usado en `(public)/page.tsx`), `badge.tsx`, `field.tsx`, `input.tsx` (estilo del select), `lucide-react`, `next/link`, `next/image`, `cn`.
- Reuse: `(public)/layout.tsx` (header, `<main>` 1240 px, footer) sin cambios; `components/shared/site-links.ts` no se toca.
- Reuse: tokens de `globals.css` (`rounded-card`, `shadow-card`, `bg-accent`, `text-ink-muted`, `font-display`…). Se agrega solo el keyframe `wy-fill` (barra de progreso) a `globals.css`.
- Reuse: vitest ya instalado (`vitest.config.ts`); `lib/db/seed/data/packages.ts` como oráculo en el test de integración.
- Extend: `vitest.config.ts` — falta el alias `@` → raíz (los tests de services importan `@/lib/...`); `include` solo toma `*.test.ts` (los tests de esta spec son `.ts`).
- Extend: `package.json` — script `test:db` (`node --env-file=.env.local ./node_modules/vitest/vitest.mjs run`) para correr los tests de integración con `DATABASE_URL`.
- Extend: `next.config.ts` (flag), `.env.example` (variable), `docs/ARCHITECTURE.md` (módulo `home`), `app/(public)/page.tsx` (reemplaza la muestra D4).
- New (CLI): `components/ui/native-select.tsx` con `npx shadcn@latest add native-select` (confirmado con `search`): el buscador es un `<form method="get">`, un `<select>` nativo funciona sin JS y es accesible; el `select` de base-ui exige cliente y valor controlado.
- New: `lib/money.ts` (`formatPen`) — no existe formateo de dinero (solo `soles()` del seed, que va en sentido contrario); lo usarán 008, 011, checkout y panel. `Intl` no sirve: `es-PE` no agrupa 4 dígitos ("1290") y no usa el separador del sistema de diseño.
- New: `lib/cache-tags.ts` — tags compartidos entre quien lee (services) y quien invalida (futuras specs de CRUD/pagos); un solo lugar evita strings sueltos.
- New: `modules/packages` (types, utils, service, `PackageCard`), `modules/destinations` (types, service), `modules/home` (secciones y composición). No existían (`modules/` no existe aún).
- New: chip de filtro y rail dentro de `home` (no `components/shared`): hoy los usa solo Inicio (YAGNI); 008 los promueve si los necesita.

## Acceptance criteria
*(auto)* = comando/test; *(db)* = test de integración con `DATABASE_URL` (`npm run test:db`); *(visual)* = Playwright a 390 px y 1280 px sobre `/` con la base sembrada (`npm run db:seed`).

- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` terminan en verde al cierre de cada fase (el build requiere `DATABASE_URL` y las claves de Clerk en `.env.local`).
- AC2 *(auto)*: `next.config.ts` tiene `cacheComponents: true`; `next build` termina sin errores de "blocking route"/datos sin caché fuera de `<Suspense>`, y lista `/`, `/sign-in`, `/sign-up` sin degradar a dinámicas por error. *(visual)* El encabezado sigue mostrando "Ingresar"/"Crear cuenta" y `/sign-in` y `/sign-up` cargan el formulario de Clerk.
- AC3 *(auto)*: `formatPen(cents)` devuelve `S/` + espacio duro (U+00A0) + enteros con separador de miles U+202F; sin decimales si los céntimos son 0, con 2 decimales si no (`129000` → `S/ 1 290`, `9500` → `S/ 95`, `12050` → `S/ 120.50`, `0` → `S/ 0`, `165000` → `S/ 1 650`, `100000000` → `S/ 1 000 000`).
- AC4 *(auto)*: `isDayTour` es verdadero si `kind = "day_tour"` o `durationDays = 1`; `formatDuration(1)` = `1 día`, `formatDuration(4)` = `4 días`.
- AC5 *(db)*: `getFeaturedPackages(n)` devuelve como máximo `n` paquetes, **todos** `published`: un paquete `draft` insertado por el test no aparece. Cada ítem trae su destino y sus categorías (ordenadas por nombre).
- AC6 *(db)*: orden por reservas `confirmed` desc: con el seed, los 5 primeros son, como conjunto, `machu-picchu-magico`, `amazonia-tambopata`, `islas-ballestas`, `canon-del-colca` y `machu-picchu-en-un-dia` (1 reserva confirmada cada uno). El orden interno es reservas `confirmed` desc y, en empate, `created_at` desc y luego `packages.id` asc; como el seed no fija `created_at`, el desempate efectivo es `id` asc. El test compara el conjunto y calcula el orden interno con esa regla, sin fijar una secuencia. Los paquetes con solo reservas `pending`/`cancelled` (`montana-de-colores`, `titicaca-islas-uros`, `paracas-huacachina`) no cuentan como más reservados que los de 0 reservas.
- AC7 *(db)*: `getCategories()` devuelve las 5 categorías del seed ordenadas por nombre; `getDestinations()` devuelve solo destinos con ≥ 1 paquete publicado, con `minPriceCents` igual al mínimo de `priceCents` de sus paquetes publicados (calculado en el test desde `seedPackages`) y `packageCount` correcto; orden `packageCount` desc, `name` asc.
- AC8 *(auto)*: cada service llama a `cacheLife` y a `cacheTag` con las constantes de `CACHE_TAGS` (test con `next/cache` mockeado): `getFeaturedPackages` → `packages`; `getCategories` → `categories`; `getDestinations` → `destinations` y `packages` (su precio depende de los paquetes).
- AC9 *(auto)*: `buildCategoryChips(cards)` devuelve `Todos` + las categorías presentes en las tarjetas (por nombre) + `Un día` solo si alguna tarjeta es `isDayTour`; sin chips vacíos. `filterByChip(cards, key)`: `all` → todas; `day` → las `isDayTour`; otro → las que tienen esa categoría.
- AC10 *(auto)*: `buildWhatsAppUrl(number, message)` devuelve `https://wa.me/<solo dígitos>?text=<mensaje codificado>`; devuelve `null` si el número falta o tiene menos de 8 dígitos tras limpiar.
- AC11 *(visual)*: Hero: 5 slides con región (`region`), título, `blurb` y link "Ver paquete · desde S/ X" a `/paquetes/<slug>`; datos = primeros 5 destacados con portada. Autoplay cada 6.5 s; botón pausa/reanudar con nombre accesible cambiante ("Pausar carrusel"/"Reanudar carrusel"); anterior/siguiente; 5 tabs (una por slide) con `aria-label` "Ver <título>" y el slide activo marcado (`aria-current`); la pausa también aplica con el mouse encima o con foco dentro. Con `reducedMotion: 'reduce'` arranca en pausa y la barra de progreso no se anima. Los slides inactivos están fuera del árbol de accesibilidad e inertes. Solo la imagen del primer slide se precarga.
- AC12 *(visual)*: Exactamente un `h1` (oculto visualmente); los `h2` de sección son "Paquetes para cada viaje", "Elige tu destino" y "Por qué Wayra" (y el de la CTA de WhatsApp). Botones: hero "Ver paquete" = `cta`; "Buscar" = `cta`; "Escríbenos por WhatsApp" = variante no terracota (ver Open questions Q3).
- AC13 *(visual)*: Buscador: `<form action="/paquetes" method="get">` con `<label>` visible "¿A dónde vas?" ligada a un `<select name="destino">` nativo de 52 px; opciones "Todo el Perú" (valor vacío) + un `<option value="<slug>">` por destino de `getDestinations()`. Elegir Cusco y enviar navega a `/paquetes?destino=cusco`. No hay campos de fecha ni viajeros. Debajo, la franja de confianza con los 4 textos del artefacto.
- AC14 *(visual)*: Rail de paquetes: chips (`aria-pressed`, alto ≥ 44 px) "Todos", categorías con tarjetas y "Un día"; elegir un chip filtra las tarjetas y vuelve el rail al inicio; botones "Paquetes anteriores"/"Más paquetes" desplazan el rail. Cada tarjeta es un solo link a `/paquetes/<slug>` con imagen (`alt` no vacío), tag (primera categoría), duración (`4 días`), región, título y "Desde S/ X / persona". Máximo 12 tarjetas.
- AC15 *(visual)*: Bento: hasta 8 destinos con imagen, nombre y "desde S/ X" (mínimo de sus paquetes publicados), cada uno un link a `/destinos/<slug>`; el primero ocupa 2×2 y el cuarto 2 columnas en escritorio; en 390 px, 2 columnas y el primero a ancho completo. Texto legible sobre la imagen (degradado oscuro).
- AC16 *(visual)*: "Por qué Wayra": los 4 puntos del artefacto. CTA de WhatsApp: link `https://wa.me/<NEXT_PUBLIC_WHATSAPP_NUMBER>?text=…` que abre en pestaña nueva con `rel="noopener noreferrer"`. Sin la variable (o inválida) la sección CTA no se renderiza y no hay error. Línea de créditos de fotos al final.
- AC17 *(visual)*: Sin scroll horizontal en 390 y 1280 px; foco visible en todos los controles nuevos (hereda el global); sin `outline: none` sin reemplazo; objetivos táctiles ≥ 44 px; toda imagen con `alt` (decorativas con `alt=""`).
- AC18 *(auto)*: `package.json` no gana dependencias (solo el script `test:db` y lo que traiga `shadcn add native-select`, anotado en la tarea). `.env.example` incluye `NEXT_PUBLIC_WHATSAPP_NUMBER=`.
- AC19 *(auto)*: ningún componente cliente (`"use client"`) importa en runtime desde `@/modules/packages` o `@/modules/destinations` (revisión del reviewer con `grep`); solo `import type`.

## Contracts

### Tags y dinero (`lib/`)
```ts
// lib/cache-tags.ts
export const CACHE_TAGS = {
  packages: "packages",
  destinations: "destinations",
  categories: "categories",
} as const;
export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

// lib/money.ts   (catálogo siempre en soles, ver DESIGN-SYSTEM "Dinero")
export function formatPen(cents: number): string; // "S/ 1 290", "S/ 120.50"
```
Quién invalida (no se implementa acá): publicar/editar/despublicar un paquete → `updateTag(CACHE_TAGS.packages)`; crear/editar destino → `updateTag(CACHE_TAGS.destinations)`; crear/editar categoría → `updateTag(CACHE_TAGS.categories)`; confirmar o cancelar una reserva (cambia el ranking de más reservados) → `revalidateTag(CACHE_TAGS.packages, "max")` desde el webhook de Stripe (Route Handler, `updateTag` solo existe en Server Functions). Mientras tanto, `cacheLife("hours")` acota el desfase a ≤ 1 h.

### `modules/packages`
```ts
// types/package.ts
export type CategoryDto = { id: string; slug: string; name: string };
export type PackageCardDto = {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  kind: "package" | "day_tour";
  durationDays: number;
  priceCents: number;            // por persona; el catálogo es siempre PEN
  coverImageUrl: string | null;
  destination: { slug: string; name: string; region: string };
  categories: { slug: string; name: string }[]; // ordenadas por name
};

// utils/package-utils.ts   (puras, sin db)
export function isDayTour(p: Pick<PackageCardDto, "kind" | "durationDays">): boolean;
export function formatDuration(days: number): string; // "1 día" | "N días"

// services/package-service.ts   (server only)
export async function getFeaturedPackages(limit: number): Promise<PackageCardDto[]>;
export async function getCategories(): Promise<CategoryDto[]>;
```
Cada función: `"use cache"` inline al inicio, `cacheLife("hours")`, `cacheTag(...)` de AC8. `getFeaturedPackages`: `packages` (status `published`) ⨝ `destinations`, `LEFT JOIN bookings ON bookings.package_id = packages.id AND bookings.status = 'confirmed'`, `GROUP BY` paquete y destino, `ORDER BY count(bookings.id) DESC, packages.created_at DESC, packages.id`, `LIMIT limit`; después una segunda consulta de `package_categories ⨝ categories` para los ids obtenidos. El filtro `published` vive en una sola constante interna del service (`isPublished = eq(packages.status, "published")`) para que 008/011 lo reutilicen sin repetirlo. `limit` es entero ≥ 1 (se valida; si no, lanza).

```ts
// index.ts  (API pública)
export { getFeaturedPackages, getCategories } from "./services/package-service";
export { isDayTour, formatDuration } from "./utils/package-utils";
export { PackageCard } from "./components/package-card";
export type { PackageCardDto, CategoryDto } from "./types/package";
```
Nota sobre `isDayTour`/`formatDuration`: son puras, pero el `index.ts` mezcla services (db) con utilidades. Un componente cliente no puede importarlas de `@/modules/packages` en runtime (AC19): `HomePage` (servidor) las aplica y pasa a los clientes strings y booleanos ya resueltos (`RailCard`, `HeroSlide`).

`PackageCard` (sin estado, sin `"use client"`): recibe strings ya formateados, no el DTO, para ser presentación pura. Funciona dentro del rail cliente (no importa db) y la reutilizan 008 y 011.
```ts
export function PackageCard(props: {
  slug: string; title: string; coverImageUrl: string | null;
  regionLabel: string; tag: string | null; durationLabel: string; priceLabel: string;
}): JSX.Element
```
Un solo `<Link href="/paquetes/{slug}">` envuelve la tarjeta; imagen con `next/image` (`fill`, `sizes`).

### `modules/destinations`
```ts
// types/destination.ts
export type DestinationDto = {
  id: string; slug: string; name: string; region: string;
  heroImageUrl: string | null;
  packageCount: number;     // paquetes publicados
  minPriceCents: number;    // mínimo de priceCents de sus paquetes publicados
};
// services/destination-service.ts  (server only)
export async function getDestinations(): Promise<DestinationDto[]>; // solo con ≥1 publicado; packageCount desc, name asc
// index.ts
export { getDestinations } from "./services/destination-service";
export type { DestinationDto } from "./types/destination";
```
`getDestinations`: `"use cache"`, `cacheLife("hours")`, `cacheTag(CACHE_TAGS.destinations, CACHE_TAGS.packages)`; `INNER JOIN packages` filtrado por `published` + `GROUP BY` destino con `count`/`min` (convertidos con `Number`). Para 011, `getDestinationBySlug` lo agrega su spec.

### `modules/home`
```ts
// utils/category-chips.ts   (puras, tipos propios; sin db)
export const CHIP_ALL = "all";
export const CHIP_DAY = "day";
export type CategoryChip = { key: string; label: string }; // key: CHIP_ALL | CHIP_DAY | slug de categoría
export type RailCard = {
  slug: string; title: string; coverImageUrl: string | null;
  regionLabel: string; tag: string | null; durationLabel: string; priceLabel: string;
  categorySlugs: string[]; isDayTour: boolean;
};
export function buildCategoryChips(cards: RailCard[], categories: { slug: string; name: string }[]): CategoryChip[];
export function filterByChip(cards: RailCard[], key: string): RailCard[];

// utils/whatsapp.ts
export function buildWhatsAppUrl(number: string | undefined, message: string): string | null;

// components (todo `home` Server Component salvo los marcados "cliente")
HomePage()                              // async: Promise.all(getFeaturedPackages(12), getCategories(), getDestinations()); mapea DTO → RailCard / HeroSlide
HeroCarousel({ slides }: { slides: HeroSlide[] })           // cliente
type HeroSlide = { slug: string; title: string; blurb: string; regionLabel: string; priceLabel: string; coverImageUrl: string };
PackageRail({ cards, chips }: { cards: RailCard[]; chips: CategoryChip[] }) // cliente: estado del chip activo, ref del rail, renderiza <PackageCard/>
SearchForm({ destinations }: { destinations: { slug: string; name: string }[] })
TrustStrip()
DestinationBento({ destinations }: { destinations: DestinationTileData[] }) // type DestinationTileData = { slug; name; heroImageUrl: string | null; priceLabel: string }
WhyWayra()
WhatsAppCta({ href }: { href: string })
PhotoCredits()
// index.ts
export { HomePage } from "./components/home-page";
```
`HomePage` no pasa DTO de `packages` a componentes cliente: arma `RailCard`/`HeroSlide` con strings ya formateados (`formatPen`, `formatDuration`, `isDayTour`), tipos propios de `home` sin dependencia de runtime hacia otros módulos. El número de WhatsApp se lee de `process.env.NEXT_PUBLIC_WHATSAPP_NUMBER` en `HomePage` y se pasa a `buildWhatsAppUrl`; mensaje: "Hola Wayra, quiero planear un viaje a medida.".

Composición del Inicio (orden de secciones, de arriba hacia abajo): `HeroCarousel` → `SearchForm` (solapada ~60 px sobre el hero) → `TrustStrip` → `PackageRail` → `DestinationBento` → `WhyWayra` → `WhatsAppCta` → `PhotoCredits`. Sin datos (`getFeaturedPackages` vacío), `HomePage` omite hero y rail y muestra el resto (ver Edge cases).

### Ruta
```tsx
// app/(public)/page.tsx   (delgada)
import { HomePage } from "@/modules/home";
export default function Page() { return <HomePage />; }
```
`app/(public)/page.tsx` pierde la muestra D4 (badges, switch, campo). `components/ui/{switch,field,input}` y `StatusBadge` siguen existiendo para otras pantallas.

### Carrusel (reglas de comportamiento, `HeroCarousel`)
- Estado: `index`, `paused` (inicial = `matchMedia("(prefers-reduced-motion: reduce)").matches`, resuelto en un efecto), `hovered`/`focused` solo para pausa transitoria.
- `useEffect` con `setTimeout(next, 6500)` reiniciado al cambiar `index` o reanudar; limpieza al desmontar. Avanza de forma circular.
- `section[aria-roledescription="carrusel"][aria-label="Paquetes destacados"]`; el contenedor de texto lleva `aria-live="polite"` solo cuando está en pausa (en reproducción, `off`).
- Slides: todos montados y superpuestos (opacity); los inactivos `aria-hidden` + `inert`. `loading` por defecto (lazy) salvo el primero (`preload`). Techo conocido: las 5 imágenes están en viewport y se piden juntas; si pesa, renderizar solo activo + siguiente.
- Botones de 48 px con `lucide-react` (`Pause`/`Play`, `ChevronLeft`/`ChevronRight`), `aria-label` en español.

### Entorno
`.env.example`: 
```
# WhatsApp de contacto del CTA de Inicio (solo dígitos con código de país, ej. 51999999999)
NEXT_PUBLIC_WHATSAPP_NUMBER=
```

## Edge cases
- **Base vacía o sin paquetes publicados**: `HomePage` no rompe; omite hero/rail/bento vacíos. Nunca texto "undefined".
- **Menos de 5 destacados con portada**: el hero muestra solo los disponibles; con 1 solo slide se ocultan tabs, pausa y prev/next; con 0, no se renderiza el hero.
- **Paquete sin `cover_image_url`**: la tarjeta usa un bloque `bg-sand` en lugar de imagen; se excluye del hero.
- **`cover_image_url` absoluta (p. ej. Blob) antes de configurar `remotePatterns`**: `next/image` lanza. Es un riesgo conocido y acotado por D6; el seed usa rutas locales.
- **Categoría sin paquetes publicados**: no genera chip (D5). **Paquete sin categorías**: tag `null` (no se muestra) y solo aparece en "Todos" o "Un día".
- **`durationDays = 1` con `kind = package`**: cuenta como "Un día" (regla de ERM).
- **Nombre largo** (título de paquete, destino): `line-clamp-2`/`truncate` según el contenedor, sin romper la grilla a 390 px.
- **`DATABASE_URL` ausente**: `lib/db` lanza al importarse; `next build` falla con ese mensaje (no se silencia). Documentado en el riesgo de Cache Components.
- **Build sin red a Neon**: el prerender consulta la base; si no hay conexión el build falla. Aceptado (el catálogo es el contenido de la página).
- **Caché**: los productores aún no invalidan; hasta que existan, un paquete publicado tarda ≤ 1 h en verse (`revalidate` de `hours`); el desfase de "más reservados" también.
- **Draft Mode / entorno de desarrollo**: en `next dev` las funciones cacheadas se re-ejecutan (HMR); no afecta los tests.
- **Precios con decimales** (`12050`): `formatPen` muestra `S/ 120.50`; el seed solo usa enteros de soles.
- **`prefers-reduced-motion`**: sin autoplay inicial, sin barra animada, hover de imágenes sin transición (regla global existente).
- **Idioma**: textos en español; tildes correctas ("Gastronomía", "Amazonía").
- **Texto de confianza / "Por qué" con medios de pago o envíos que v1 no cumple**: ver Open questions Q1.

## Tests
Corren con `npm test` salvo los *(db)*, que corren con `npm run test:db` y se omiten sin `DATABASE_URL` (`describe.skipIf(!process.env.DATABASE_URL)`; importan `@/lib/db` y los services con `await import()` dentro del bloque para no lanzar al cargar el archivo). Todos mockean `next/cache` (`cacheLife`/`cacheTag` como `vi.fn()`), porque fuera del runtime de Next `cacheTag` lanza.

- `lib/money.test.ts` — AC3 (casos de la lista, 0, miles y millón, decimales, separadores exactos U+00A0/U+202F).
- `modules/packages/utils/package-utils.test.ts` — AC4 (`day_tour` con días > 1, `package` con 1 día, `package` con 3 días; `formatDuration` 1/2/10).
- `modules/packages/services/package-service.test.ts` *(db)* — AC5 (inserta un `draft` con ids propios y lo borra en `afterAll`; no debe aparecer), AC6 (los 5 primeros del seed; pending/cancelled no cuentan; `limit` respetado; `limit` inválido lanza), AC7 (`getCategories`), AC8 (`cacheTag` llamado con `CACHE_TAGS.packages` / `categories`, `cacheLife` llamado).
- `modules/destinations/services/destination-service.test.ts` *(db)* — AC7 (mínimos calculados desde `seedPackages`, orden, destinos sin publicados excluidos), AC8 (tags `destinations` y `packages`).
- `modules/home/utils/category-chips.test.ts` — AC9 (sin chips vacíos, "Un día" condicional y al final, orden por nombre, `filterByChip` para los tres tipos, lista vacía → solo "Todos" o nada).
- `modules/home/utils/whatsapp.test.ts` — AC10 (número con `+`, espacios y guiones, número corto, `undefined`, mensaje con tildes y espacios codificado).
- No se testea markup ni los componentes (SETUP §3). La verificación de AC11–AC17 es manual con Playwright (390×844 y 1280×800), a cargo del orquestador tras la fase 5: capturas, teclado (Tab, Space/Enter en chips y pausa), `reducedMotion`, `scrollWidth`, `/paquetes?destino=cusco` desde el buscador.
- Los tests `.test.tsx` no entran en `vitest.config.ts` (`include` es `**/*.test.ts`); no se necesitan.

## Plan

### Phase 1 — Cache Components + tooling
Entrega: `cacheComponents: true` activo, la app existente compila y navega igual; alias, script y shadcn listos. Aísla el riesgo antes de escribir datos.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `cacheComponents: true`; alias `@` en `vitest.config.ts`; script `test:db`; `NEXT_PUBLIC_WHATSAPP_NUMBER` en `.env.example`; `npx shadcn@latest add native-select` (anotar dependencias nuevas si las hay); keyframe `wy-fill` en `globals.css` | next.config.ts, vitest.config.ts, package.json, package-lock.json, .env.example, components/ui/native-select.tsx, app/globals.css | - | A | AC1, AC2, AC18 | done |
| T2 | Correr `npm run build` con el flag y resolver lo que marque (Suspense en layout raíz / encabezado / sign-in / sign-up). Si el build ya pasa, no toca nada y lo informa | app/layout.tsx, components/shared/site-header.tsx, app/sign-in/[[...sign-in]]/page.tsx, app/sign-up/[[...sign-up]]/page.tsx | T1 | B | AC2 | done |

### Phase 2 — Services de paquetes y utilidades base
Entrega: `getFeaturedPackages` y `getCategories` cacheados y testeados; `CACHE_TAGS` y `formatPen`. La app no cambia visualmente.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T3 | setup: `CACHE_TAGS` y `formatPen` + test | lib/cache-tags.ts, lib/money.ts, lib/money.test.ts | T2 | A | AC3 | done |
| T4 | Módulo `packages`: tipos, utils (+test), services (+test db), `index.ts` (sin `PackageCard` todavía) | modules/packages/types/package.ts, modules/packages/utils/package-utils.ts, modules/packages/utils/package-utils.test.ts, modules/packages/services/package-service.ts, modules/packages/services/package-service.test.ts, modules/packages/index.ts | T3 | B | AC4, AC5, AC6, AC7, AC8 | done |
| T5 | Módulo `destinations`: tipos, service (+test db), `index.ts` | modules/destinations/types/destination.ts, modules/destinations/services/destination-service.ts, modules/destinations/services/destination-service.test.ts, modules/destinations/index.ts | T3 | B | AC7, AC8 | done |

### Phase 3 — Piezas de UI y utilidades puras
Entrega: `PackageCard` exportada y utilidades de chips/WhatsApp testeadas; sin cambios en rutas.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T6 | `PackageCard` (presentación, strings ya formateados) y export en el `index.ts` de `packages` | modules/packages/components/package-card.tsx, modules/packages/index.ts | T4 | A | AC14, AC17, AC19 | done |
| T7 | `category-chips` y `whatsapp` con tests | modules/home/utils/category-chips.ts, modules/home/utils/category-chips.test.ts, modules/home/utils/whatsapp.ts, modules/home/utils/whatsapp.test.ts | T3 | A | AC9, AC10 | done |

### Phase 4 — Secciones de Inicio
Entrega: cada sección existe como componente aislado y tipado (sin usarse todavía en la ruta). Verificable con `tsc`/`lint`/`build`.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T8 | `HeroCarousel` (cliente): autoplay con timer, pausa, prev/next, tabs, reduced-motion | modules/home/components/hero-carousel.tsx | T1, T7 | A | AC11, AC12, AC17 | done |
| T9 | `PackageRail` (cliente): chips, filtro, scroll del rail, usa `PackageCard` | modules/home/components/package-rail.tsx | T6, T7 | A | AC14, AC17, AC19 | done |
| T10 | `SearchForm` (native-select, form GET) + `TrustStrip` + `WhyWayra` | modules/home/components/search-form.tsx, modules/home/components/trust-strip.tsx, modules/home/components/why-wayra.tsx | T1 | A | AC12, AC13, AC16, AC17 | done |
| T11 | `DestinationBento` + `WhatsAppCta` + `PhotoCredits` | modules/home/components/destination-bento.tsx, modules/home/components/whatsapp-cta.tsx, modules/home/components/photo-credits.tsx | T1 | A | AC15, AC16, AC17 | done |

### Phase 5 — Composición y ruta
Entrega: `/` muestra el Inicio completo con datos reales; la muestra D4 desaparece.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T12 | `HomePage` (async, mapea DTO → props con strings formateados), `index.ts` de `home`, `app/(public)/page.tsx` delgada, fila `home` en ARCHITECTURE | modules/home/components/home-page.tsx, modules/home/index.ts, app/(public)/page.tsx, docs/ARCHITECTURE.md | T4, T5, T8, T9, T10, T11 | A | AC1, AC2, AC11–AC19 | done |

### Verificación (orquestador, tras T12; no es tarea de developer)
Con `.env.local` (DB sembrada + claves de Clerk): `npm run build && npm start`; Playwright a 390×844 y 1280×800 sobre `/` y a `/sign-in`: medir AC11–AC17, probar el buscador (`/paquetes?destino=cusco`), el filtro de chips, el carrusel con `reducedMotion`, y comparar contra el artefacto. Además `npm run test:db`. Resultado y capturas van al PR; no se commitea código de Playwright.

Reviewer por fase: al cerrar cada fase corren `tsc`, `lint`, `build`, `test` (AC1).

## Open questions
- **Q1. RESUELTA (usuario): texto veraz.** Franja de confianza: "Paga con tarjeta" (sin Yape/Plin) y voucher: "Voucher en la página de confirmación" (sin correo/WhatsApp), porque Stripe/v1 no los soporta. Aplica en T10.
- **Q2. RESUELTA (usuario): se sigue DESIGN-SYSTEM.** Línea estática de créditos CC al final del Inicio (D12).
- **Q3. RESUELTA (usuario): opción A.** Hero "Ver paquete" y "Buscar" = `cta` (terracota); "Escríbenos por WhatsApp" = variante teal, no terracota.
- No bloqueantes: el orden de los chips es alfabético y no el del artefacto (D5); el destino mostrado como "lugar" es la región (D8).
