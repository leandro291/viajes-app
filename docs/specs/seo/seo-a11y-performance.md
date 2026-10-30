# SEO, accesibilidad y rendimiento

- Module: shared (transversal; helpers en `lib/seo/`, rutas de archivo en `app/`)
- Status: approved
- Approved by: leandro291 (2026-10-29)
- Mode: SDD

## Goal
Tarjeta Trello 033. Que las pantallas públicas (`/`, `/paquetes`, `/tours`, `/ofertas`, `/paquetes/[slug]`, `/destinos/[slug]`) se indexen y se compartan bien (metadata, sitemap, robots, imagen OG) y que cumplan accesibilidad y rendimiento medidos con Lighthouse sobre un build de producción.

## Scope
- In:
  1. Metadata: helper compartido `buildMetadata` + `getSiteUrl` + `metadataBase` en el layout raíz; metadata única (title, description, canonical, Open Graph, Twitter) en las 6 pantallas públicas.
  2. `app/sitemap.ts` (estáticas + paquetes publicados + destinos con paquetes publicados) y `app/robots.ts`; `noindex` en las áreas privadas (admin, operador, cliente, sign-in/up).
  3. Imagen OG de marca (`app/opengraph-image.tsx`) como respaldo; las fichas de paquete y destino siguen usando su foto.
  4. Auditoría de accesibilidad y Lighthouse sobre las 6 pantallas, con umbrales medibles, informe en `docs/audits/` y el único arreglo ya conocido (enlace "saltar al contenido").
- Out:
  - JSON-LD / datos estructurados (ver Q5).
  - Imagen OG dinámica por paquete/destino con título superpuesto (ver Q3).
  - `twitter-image` propio (Twitter usa `og:image` con `summary_large_image`).
  - `changefreq` / `priority` en el sitemap (Google los ignora) y `generateSitemaps` (muy por debajo de 50 000 URLs).
  - i18n / `hreflang` (sitio solo en español).
  - Arreglos de la auditoría que no sean el enlace de salto: se agregan como Fase 5 tras el informe (ver Q6).
  - Páginas de `(admin)`, `(organizer)`, `(customer)` en la auditoría Lighthouse (no indexables).

## Reuse
- Reuse: `modules/destinations` `getDestinations()` — ya devuelve solo destinos con ≥ 1 paquete publicado (los mismos que no dan 404 en `/destinos/[slug]`), cacheado con tag `destinations`; da los slugs del sitemap sin servicio nuevo.
- Reuse: `modules/packages/services/package-service.ts` `isPublished` — filtro único de visibilidad pública, lo usa el servicio nuevo del sitemap.
- Reuse: `lib/cache-tags.ts` (`CACHE_TAGS`), `cacheLife`/`cacheTag` — el sitemap hereda la invalidación del catálogo.
- Reuse: `lib/slug.ts`, `generateDetailMetadata` y `generateDestinationMetadata` ya existen: se reescriben internamente con `buildMetadata`, sin cambiar su firma ni su export.
- Reuse: metadata ya presente en `(customer)/pago|confirmacion|mis-reservas` (`robots: { index: false }`): no se tocan.
- Reuse: `app/layout.tsx` `title.template "%s · Wayra"` y `lang="es"`; `PageHero`/`SiteHeader` ya tienen `aria-current`, `aria-hidden` en íconos y `prefers-reduced-motion` en `globals.css`.
- Extend: `app/layout.tsx` — agrega `metadataBase`.
- Extend: `modules/packages/services/package-service.ts` + `index.ts` — `getSitemapPackages()`.
- Extend: `components/shared/site-shell.tsx` — enlace "Saltar al contenido" y `id` en `<main>`.
- New: `lib/seo/site-url.ts` — `getAppUrl()` (`modules/checkout/utils/app-url.ts`) lanza si falta `NEXT_PUBLIC_APP_URL` (spec de pagos, "sin fallback"); para SEO un error rompería el build/preview, y un `lib` no puede importar internos de `checkout`. Contrato distinto (nunca lanza), por eso no se reutiliza ni se mueve (el test de `checkout-service` mockea `../utils/app-url`).
- New: `lib/seo/metadata.ts`, `lib/seo/sitemap.ts`, `lib/seo/robots.ts` — funciones puras testeables; no hay equivalente. Van en `lib/` (transversal, igual que `lib/whatsapp.ts`); no hace falta un módulo nuevo porque no hay tablas ni UI de dominio.
- New: `app/opengraph-image.tsx` — convención de archivo de Next; `next/og` ya viene con `next`, sin dependencias nuevas.
- Sin dependencias nuevas. Lighthouse se ejecuta con `npx lighthouse` (no se agrega a `package.json`) y Chrome del sistema (`/usr/bin/google-chrome`).
- Next 16: `app/sitemap.ts`, `app/robots.ts` y `opengraph-image.tsx` son Route Handlers cacheados por defecto; con `cacheComponents: true`, `generateMetadata` que lee DB debe estar cacheado (`'use cache'`, ya lo está vía los servicios). Docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/{sitemap,robots,opengraph-image}.md` y `04-functions/generate-metadata.md` (§With Cache Components, §Merging: `openGraph` se reemplaza entero; la metadata basada en archivo tiene prioridad sobre el objeto).

## Acceptance criteria

### Metadata
- AC1: `getSiteUrl()` devuelve el origen (sin barra final) de `NEXT_PUBLIC_APP_URL` si es una URL http(s) válida; si falta o es inválida, `https://${VERCEL_PROJECT_PRODUCTION_URL}` si existe; si no, `http://localhost:3000`. Nunca lanza.
- AC2: `app/layout.tsx` define `metadataBase: new URL(getSiteUrl())`; `next build` no emite la advertencia de `metadataBase` ausente y las URL relativas (`/seed/*.jpg`) de `og:image` salen absolutas.
- AC3: `buildMetadata({ title?, description?, path, image?, imageAlt?, noIndex? })` devuelve `title`, `description`, `alternates.canonical = path`, `openGraph` (`type: "website"`, `locale: "es_PE"`, `siteName: "Wayra"`, `url: path`, `title` con sufijo " · Wayra", `description`, `images`: la `image` propia si hay; si no, el respaldo de marca `/opengraph-image` 1200×630 con alt = `DEFAULT_TITLE`, ver nota de contrato de T8) y `twitter` (`card: "summary_large_image"`, `title`, `description`, `images` con la misma regla). `noIndex` agrega `robots: { index: false, follow: false }`. Sin `title` (Inicio) no define `title` (hereda el default del layout) y usa `DEFAULT_TITLE` en OG.
- AC4: `truncateDescription(text, 160)` colapsa espacios, no corta a mitad de palabra y agrega "…" solo si recortó; la descripción de todas las páginas pasa por ella (≤ 160 caracteres).
- AC5: las 6 pantallas públicas tienen `<title>` y `<meta name="description">` únicos entre sí, `<link rel="canonical">` con URL absoluta sin query (p. ej. `/paquetes?destino=cusco` canonicaliza a `/paquetes`), `og:title`, `og:description`, `og:url`, `og:type`, `og:site_name`, `og:locale` y `twitter:card=summary_large_image`.
- AC6: Inicio, `/paquetes`, `/tours` y `/ofertas` usan descripciones propias en español (70–160 caracteres); `/paquetes/[slug]` usa `title` + `blurb` del paquete y su `coverImageUrl` como imagen; `/destinos/[slug]` usa `name` + `tagline ?? description` y `heroImageUrl`.
- AC7: slug inexistente o inválido en `/paquetes/[slug]` y `/destinos/[slug]` devuelve metadata `{ title: "… no encontrado", robots: { index: false } }` y la página sigue respondiendo 404.

### Sitemap y robots
- AC8: `GET /sitemap.xml` lista URL absolutas: `/`, `/paquetes`, `/tours`, `/ofertas`; `/paquetes/<slug>` por cada paquete `published`; `/destinos/<slug>` por cada destino con ≥ 1 paquete publicado. No aparecen paquetes en borrador ni rutas privadas, y no hay URL duplicadas.
- AC9: las entradas de paquete llevan `lastModified = updatedAt`; las estáticas y los destinos no llevan `lastModified` (la tabla `destinations` no tiene `updated_at`; no se inventan fechas).
- AC10: `buildSitemapEntries` es pura y está testeada (estáticas, orden, URL absolutas con `baseUrl` con y sin barra final, listas vacías → solo estáticas).
- AC11: `GET /robots.txt` responde `User-Agent: *`, `Allow: /`, `Disallow:` para `/admin`, `/operador`, `/pago`, `/confirmacion`, `/mis-reservas`, `/cuenta`, `/api/`, `/sign-in`, `/sign-up`, y `Sitemap: <baseUrl>/sitemap.xml`.
- AC11b: en despliegues de preview de Vercel (`VERCEL_ENV === "preview"`) `GET /robots.txt` responde solo `User-Agent: *` + `Disallow: /` y no declara `Sitemap`. Producción, `next start` local y desarrollo usan las reglas de AC11 (así Lighthouse SEO local no queda bloqueado por robots).
- AC12: `next build` pasa con `cacheComponents: true`; `sitemap.ts` solo lee datos por servicios cacheados con tag (`packages`, `destinations`), de modo que publicar o editar un paquete (invalidación de tags existente) se refleja en el sitemap sin redeploy.
- AC13: los layouts `(admin)` y `(organizer)`, y las páginas `sign-in` / `sign-up`, emiten `<meta name="robots" content="noindex, nofollow">`; `(customer)/cuenta` también lleva `noindex` (las otras tres páginas del grupo ya lo tienen).

### Imagen OG
- AC14: `GET /opengraph-image` responde 200, `image/png`, 1200×630, con `alt` exportado; el HTML de `/`, `/paquetes`, `/tours` y `/ofertas` incluye `og:image` (absoluta), `og:image:width/height` y `og:image:alt`.
- AC15: `/paquetes/[slug]` y `/destinos/[slug]` incluyen `og:image` = su foto (absoluta vía `metadataBase`); si el paquete/destino no tiene foto, caen a la imagen de marca. Esto se verifica en el HTML servido, no solo en el objeto de metadata (la prioridad entre `opengraph-image` de archivo y `openGraph.images` del objeto se confirma contra Next 16).
- AC16: la imagen de marca respeta los tokens (`dark #0B1513`, `accent #C2410C`, texto blanco ≥ 4.5:1) y no agrega dependencias ni archivos binarios.

### Auditoría de accesibilidad y Lighthouse
- AC17: existe un enlace "Saltar al contenido" como primer elemento enfocable de las páginas con `SiteShell`; es visible solo al recibir foco (anillo `focus` sobre `bg-dark`, objetivo ≥ 44 px) y mueve el foco a `<main id="contenido">`.
- AC18: informe `docs/audits/seo-a11y-performance.md` con Lighthouse (mediana de 3 corridas) de las 6 pantallas en móvil (emulación por defecto) y escritorio (`--preset=desktop`), contra `next build && next start` con la BD sembrada. Cada celda registra puntaje y, cuando falla, la auditoría concreta.
- AC19: umbrales en **móvil y escritorio**: Accesibilidad = 100 o cada auditoría fallida listada con justificación aprobada; SEO = 100; Buenas prácticas ≥ 90. Rendimiento ≥ 80 móvil / ≥ 90 escritorio, con LCP ≤ 2,5 s, CLS ≤ 0,1 y TBT ≤ 200 ms (proxy de INP) en móvil. Un valor bajo el umbral debido a un script de terceros (Clerk, mapas) se documenta como excepción con su causa; el resto abre tarea en la Fase 5.
- AC20: checklist manual registrado en el informe, por pantalla: (a) navegación solo con teclado: orden de foco lógico, foco visible según DESIGN-SYSTEM (`accent` en claro, `focus` en `bg-dark`), sin trampas; (b) un único `h1` y jerarquía de títulos sin saltos; (c) toda `<img>` con `alt` (decorativas `alt=""` justificadas) y créditos CC visibles; (d) `prefers-reduced-motion: reduce` sin animaciones ni transiciones; (e) zoom 200 % y viewport 390 px sin pérdida de contenido ni scroll horizontal; (f) objetivos táctiles ≥ 44 px; (g) un solo CTA `accent` por vista (excepción nombrada: primera pantalla de Inicio).
- AC21: `npm run lint`, `npx tsc --noEmit` y `npm test` en verde al cierre de cada fase.

## Contracts
```ts
// lib/seo/site-url.ts
export function getSiteUrl(): string; // origen sin barra final; nunca lanza (AC1)

// lib/seo/metadata.ts
import type { Metadata } from "next";
export const SITE_NAME = "Wayra";
export const DEFAULT_TITLE = "Wayra · Paquetes y tours en Perú";   // mismo valor que title.default del layout
export const DEFAULT_DESCRIPTION: string;                           // mismo texto que el layout hoy
export function truncateDescription(text: string, max?: number): string; // max = 160
export type SeoInput = {
  title?: string;               // sin sufijo; el template del layout agrega " · Wayra"
  description?: string | null;  // pasa por truncateDescription; default DEFAULT_DESCRIPTION
  path: string;                 // "/paquetes", sin query; se usa como canonical y og:url
  image?: string | null;        // URL absoluta o relativa a metadataBase
  imageAlt?: string;
  noIndex?: boolean;
};
export function buildMetadata(input: SeoInput): Metadata;

// lib/seo/sitemap.ts
import type { MetadataRoute } from "next";
export const SITEMAP_STATIC_PATHS: readonly ["/", "/paquetes", "/tours", "/ofertas"];
export function buildSitemapEntries(input: {
  baseUrl: string;
  packages: { slug: string; updatedAt: Date }[];
  destinations: { slug: string }[];
}): MetadataRoute.Sitemap;

// lib/seo/robots.ts
import type { MetadataRoute } from "next";
export const PRIVATE_PATHS: readonly string[]; // AC11
export function buildRobots(baseUrl: string, opts?: { blockAll?: boolean }): MetadataRoute.Robots; // AC11, AC11b

// modules/packages/services/package-service.ts  (export desde modules/packages/index.ts)
export async function getSitemapPackages(): Promise<{ slug: string; updatedAt: Date }[]>;
// 'use cache', cacheLife("hours"), cacheTag(CACHE_TAGS.packages), where isPublished, orderBy slug

// app/sitemap.ts   -> default async function sitemap(): Promise<MetadataRoute.Sitemap>
//   Promise.all([getSitemapPackages(), getDestinations()]) + buildSitemapEntries({ baseUrl: getSiteUrl(), ... })
// app/robots.ts    -> default function robots(): MetadataRoute.Robots  (buildRobots(getSiteUrl(), { blockAll: process.env.VERCEL_ENV === "preview" }))
// app/opengraph-image.tsx -> export const alt, size = { width: 1200, height: 630 }, contentType = "image/png"; default Image()
```
Notas de contrato:
- Las firmas públicas `generateDetailMetadata(params)` y `generateDestinationMetadata(params)` no cambian.
- `lib/seo/*` se importa por ruta de archivo (`@/lib/seo/metadata`), como el resto de `lib/`; sin barrel.
- Si el HTML no muestra `og:image` de marca en Inicio/listados (AC14/AC15) por la regla de merge de `openGraph`, `buildMetadata` agrega explícitamente `images: ["/opengraph-image"]` como respaldo (único cambio permitido a `lib/seo/metadata.ts` en la tarea T8).

## Edge cases
- Filtros por `searchParams` en `/paquetes`, `/tours`, `/ofertas`: canonical a la ruta base (evita contenido duplicado); la metadata de listados no lee `searchParams` (si lo hiciera, `cacheComponents` la difiere a request time y falla el build).
- `generateMetadata` con acceso a BD solo vía servicios `'use cache'` (ya lo son); nunca consultas directas.
- Paquete con `blurb` largo o con saltos de línea: `truncateDescription` colapsa espacios y recorta en palabra.
- `NEXT_PUBLIC_APP_URL` con barra final, espacios o protocolo inválido: `getSiteUrl` normaliza o cae al fallback; `metadataBase` nunca recibe una URL inválida.
- Sitemap sin paquetes ni destinos (BD vacía): devuelve solo las 4 estáticas.
- Destino sin paquetes publicados: no está en el sitemap (su página da 404).
- Paquete que pasa a borrador: sale del sitemap al invalidarse el tag `packages`.
- Imagen de portada nula: `buildMetadata` no escribe `images`; se aplica el respaldo de marca.
- `robots.txt` con `Disallow` no equivale a `noindex`; por eso las áreas privadas llevan ambos.
- Un navegador sin JS: el enlace de salto es un `<a href="#contenido">` nativo.
- Lighthouse en local mide Clerk y mapas con red de laboratorio; los resultados de terceros se anotan como excepción, no se "arreglan" desactivando Clerk.

## Tests
Runner Vitest ya instalado; solo se prueba lógica (`include: **/*.test.ts`). Rutas `app/*`, `opengraph-image.tsx` y el enlace de salto se verifican con `next build`, `curl` del HTML y Lighthouse, no con tests.
- `lib/seo/site-url.test.ts` — AC1: env válida, con barra final, con espacios, inválida, ausente + `VERCEL_PROJECT_PRODUCTION_URL`, ausente total, protocolo no http(s).
- `lib/seo/metadata.test.ts` — AC3, AC4: canonical = path, sufijo en OG, sin `image` cae al respaldo de marca, con `image` usa la foto, `noIndex`, Inicio sin `title`, truncado en palabra, `description` nula → default, espacios colapsados.
- `lib/seo/sitemap.test.ts` — AC8–AC10: estáticas, paquetes con `lastModified`, destinos sin `lastModified`, `baseUrl` con y sin barra, listas vacías, sin duplicados.
- `lib/seo/robots.test.ts` — AC11, AC11b: `blockAll` → solo `Disallow: /` sin sitemap; reglas, lista de rutas privadas, URL del sitemap con `baseUrl`.
- `modules/packages/services/package-service.test.ts` — extiende el existente: `getSitemapPackages` filtra por publicados (`isPublished`), mapea `slug`/`updatedAt` y ordena por slug (siguiendo el estilo de mocks del archivo).

## Plan

### Phase 1 — Helper SEO y metadata en las 6 pantallas públicas
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `getSiteUrl` y `buildMetadata` + `truncateDescription` con sus tests | lib/seo/site-url.ts, lib/seo/site-url.test.ts, lib/seo/metadata.ts, lib/seo/metadata.test.ts | - | A | AC1, AC3, AC4 | todo |
| T2 | `metadataBase` en el layout raíz y metadata de Inicio, `/paquetes`, `/tours`, `/ofertas` con `buildMetadata` (canonical a la ruta base, descripciones propias) | app/layout.tsx, app/(public)/page.tsx, app/(public)/paquetes/page.tsx, app/(public)/tours/page.tsx, app/(public)/ofertas/page.tsx | T1 | B | AC2, AC5, AC6 | todo |
| T3 | Reescribir `generateDetailMetadata` y `generateDestinationMetadata` con `buildMetadata` (foto como imagen, no encontrado con `noindex`) | modules/packages/components/package-detail.tsx, modules/destinations/components/destination-page.tsx | T1 | B | AC5, AC6, AC7 | todo |

### Phase 2 — Sitemap y robots
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | Constructores puros `buildSitemapEntries` y `buildRobots` con tests | lib/seo/sitemap.ts, lib/seo/sitemap.test.ts, lib/seo/robots.ts, lib/seo/robots.test.ts | - | A | AC8, AC9, AC10, AC11, AC11b | todo |
| T5 | Servicio `getSitemapPackages` (cacheado, solo publicados) + export en el index del módulo | modules/packages/services/package-service.ts, modules/packages/services/package-service.test.ts, modules/packages/index.ts | - | A | AC8, AC9, AC12 | todo |
| T6 | Rutas `app/sitemap.ts` y `app/robots.ts` que componen servicios + constructores; `next build` y `curl` de ambos | app/sitemap.ts, app/robots.ts | T1, T4, T5 | B | AC8, AC11, AC11b, AC12 | todo |

### Phase 3 — Indexación privada e imagen OG
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T7 | `noindex, nofollow` en layouts admin/operador, `cuenta` y páginas sign-in/sign-up | app/(admin)/layout.tsx, app/(organizer)/layout.tsx, app/(customer)/cuenta/page.tsx, app/sign-in/[[...sign-in]]/page.tsx, app/sign-up/[[...sign-up]]/page.tsx | - | A | AC13 | todo |
| T8 | Imagen OG de marca (`next/og`, sin fuentes ni binarios) y verificación del HTML de las 6 pantallas; si hace falta, respaldo explícito en `buildMetadata` | app/opengraph-image.tsx, lib/seo/metadata.ts, lib/seo/metadata.test.ts | T2, T3 | A | AC14, AC15, AC16 | todo |

### Phase 4 — Auditoría de accesibilidad y Lighthouse
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T9 | Enlace "Saltar al contenido" (clases `sr-only focus:not-sr-only`, anillo `focus` sobre `bg-dark`) e `id="contenido"` en `<main>` | components/shared/site-shell.tsx | - | A | AC17 | todo |
| T10 | Auditoría: `next build && next start`, Lighthouse móvil + escritorio (mediana de 3) de las 6 pantallas, checklist manual y tabla de hallazgos con severidad; sin tocar código | docs/audits/seo-a11y-performance.md | T9 | B | AC18, AC19, AC20, AC21 | todo |

### Phase 5 — Arreglos de la auditoría (a definir)
Se redacta después de T10 con las tareas, `Owns` y criterios según los hallazgos que incumplan AC19/AC20. Hallazgos menores (BUILD: 1–3 archivos, sin contratos nuevos) los corrige el orquestador directo, sin reabrir la spec (Q6). Solo los hallazgos grandes o con contratos nuevos cambian el plan: ahí la spec vuelve a `draft` y requiere nueva aprobación humana.

## Decisions
Resueltas por el usuario aceptando las recomendaciones de la spec:
- Q1. `getSiteUrl` usa fallback (`NEXT_PUBLIC_APP_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `http://localhost:3000`), nunca lanza (AC1).
- Q2. Umbrales de AC19 confirmados; se mide en local con `next build && next start` (AC18). Medir además sobre Vercel es opcional y posterior.
- Q3. OG: solo imagen de marca de respaldo + fotos propias en fichas. Sin `opengraph-image.tsx` dinámico por paquete/destino.
- Q4. Previews de Vercel devuelven `Disallow: /` (AC11b).
- Q5. JSON-LD fuera de alcance; tarjeta aparte.
- Q6. Hallazgos menores de la auditoría los corrige el orquestador en BUILD sin nueva spec; los grandes reabren la spec (Fase 5).
