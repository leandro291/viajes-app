# Design foundation

- Module: shared
- Status: done
- Approved by: leandro291 (delegado a Claude, 2026-10-25)
- Mode: SDD

## Goal
Dejar la base visual de Wayra: tokens de [DESIGN-SYSTEM.md](../../DESIGN-SYSTEM.md) en `globals.css`, fuentes, encabezado y pie, los cuatro grupos de rutas por rol y los componentes base (CTA, badge de estado, switch, campo con etiqueta). Sin pantallas de negocio: el inicio es un placeholder.

## Scope
- In:
  - `app/globals.css`: tokens en `@theme`, mapeo de variables shadcn, foco global, `prefers-reduced-motion`, estilos base de `h1`/`h2`.
  - `app/layout.tsx`: Bricolage Grotesque + DM Sans con `next/font/google`, `lang="es"`, metadata de Wayra.
  - `components/shared`: `wayra-logo`, `site-links`, `site-header`, `site-footer`, `status-badge`.
  - `components/ui`: agregar `badge`, `switch`, `input`, `field` (+ lo que el CLI traiga, p. ej. `label`) y ajustar `button` (variante CTA) a los tokens.
  - Route groups `(public)`, `(customer)`, `(organizer)`, `(admin)` con `layout.tsx`; solo `(public)` tiene `page.tsx` (inicio placeholder).
- Out:
  - Clerk, protección de rutas, guards de rol (otra spec). Ninguna ruta se protege.
  - Pantallas y contenido de negocio, menú hamburguesa, selector de moneda funcional (`PEN · S/` es solo visual), tema oscuro.
  - Tarjeta de paquete, chip, stepper, tabla, indicador, resumen (se crean con su pantalla).
  - Panel lateral del operador/admin (con su spec de panel).
  - Tests unitarios y e2e persistentes, página interna de guía de estilos. La verificación visual es manual con Playwright (ver Plan).

## Decisiones a aprobar
- **D1. `accent` es el terracota de Wayra.** shadcn también usa `accent` como "superficie de hover" (menús, ghost). Se fija `--accent: #C2410C` / `--accent-foreground: #FFFFFF` (utilidad `bg-accent` = CTA, como dice DESIGN-SYSTEM). Los componentes que hoy usamos (`button`, `badge`, `switch`, `input`, `field`) no dependen de `bg-accent` como hover; al agregar menús/select en el futuro se reemplaza ese hover por `bg-muted`/`bg-sand`.
- **D2. Sin tema oscuro.** Se elimina el bloque `.dark` y `@custom-variant dark` del `globals.css` de plantilla (YAGNI; el único "dark" de Wayra es el token de color `dark` del encabezado/pie, utilidad `bg-dark`).
- **D3. Los links del encabezado (`/paquetes`, `/tours`, `/ofertas`) apuntan a rutas que aún no existen** y dan 404 hasta su spec. Es preferible a enlaces muertos `#`.
- **D4. El inicio placeholder muestra un bloque de muestra** (h1, un CTA, los 4 badges de estado, un switch y un campo con etiqueta) para poder verificar visualmente los componentes con Playwright sin crear una página interna. Es descartable: la spec de Inicio lo reemplaza.
- **D5. Campo con etiqueta = `Field` + `FieldLabel` + `Input` de shadcn**, sin componente propio (`npx shadcn@latest search` confirma que `@shadcn/field` existe).
- **D6. Foco accesible.** `#F59E6B` sobre fondo claro da ~2:1 (< 3:1 WCAG 1.4.11). Anillo `accent` (#C2410C, ~5:1) sobre superficies claras y `focus` solo dentro de `bg-dark`. Desvío menor de DESIGN-SYSTEM; al implementar se actualiza esa tabla.
- **D7. Sin botones Ingresar/Crear cuenta en el encabezado**: los trae la spec de Clerk. `(organizer)` y `(admin)` solo devuelven `children` hasta su spec de panel.

## Reuse
- Reuse: `components/ui/button.tsx` (base-nova, `@base-ui/react`, cva) — se extiende con la variante `cta` en vez de crear otro botón.
- Reuse: `lib/utils.ts` (`cn`), `lucide-react` (`Mountain`, íconos de estado), `class-variance-authority`, `next/link`, `next/font/google` — ya instalados.
- Reuse: `app/globals.css` — se conserva `@import "tailwindcss"`, `tw-animate-css`, `shadcn/tailwind.css` y el bloque `@theme inline` de shadcn; se reemplazan los valores neutros por los de Wayra y se corrige `--font-sans: var(--font-sans)` (circular) por `--font-sans: var(--font-dm-sans)`.
- Extend: `app/layout.tsx` — cambia Geist por las dos fuentes de Wayra, `lang`, metadata. `LayoutProps<"/">` ya es el helper de Next 16.
- Extend: `components/ui/button.tsx` — variante `cta` y tamaño táctil >= 44 px; foco según D6.
- New (CLI): `components/ui/{badge,switch,input,field}.tsx` (+ dependientes) con `npx shadcn@latest add` — shadcn los cubre.
- New: `components/shared/*` — encabezado/pie/logo y `StatusBadge` los usan varios módulos; `StatusBadge` agrega ícono + texto sobre `Badge`.
- Borrar: `app/page.tsx` (plantilla de Next; `/` pasa a `app/(public)/page.tsx`, dos `page.tsx` en `/` rompen el build).
- No se agregan dependencias. Playwright no entra al repo (se corre ad hoc, no es parte de `npm test`).

## Acceptance criteria
Etiqueta *(auto)* = comando; *(visual)* = Playwright a 390 px y 1280 px sobre `/`.

- AC1 *(auto)*: `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` terminan en verde al cierre de cada fase.
- AC2 *(auto)*: `globals.css` declara en `@theme` los 18 colores de DESIGN-SYSTEM, los 4 pares de estado, `--radius-card` (28), `--radius-card-sm` (18), `--radius-field` (14), `--shadow-card`, `--shadow-raised`, `--font-display` y `--font-sans`; `build` compila utilidades como `bg-accent`, `bg-dark`, `text-ink-muted`, `rounded-card`, `shadow-card`. Variables shadcn: `--primary` = `#0F5257`, `--ring` = `#F59E6B`, `--background` = `#FBF9F5`, `--radius` = 14 px.
- AC3 *(visual)*: `<html lang="es">`; `document.title` contiene "Wayra"; el `h1` renderiza en Bricolage Grotesque y el cuerpo en DM Sans (`getComputedStyle().fontFamily` y fuentes cargadas por `document.fonts`); no queda referencia a Geist ni a "Create Next App".
- AC4 *(visual)*: Con Tab sobre `a`, `button`, `input` y `switch`, cada uno muestra un anillo de foco de 3 px, offset 3 px (outline o ring equivalente, medido en estilo computado): `#C2410C` (accent) sobre superficies claras y `#F59E6B` (focus) dentro de `bg-dark` (encabezado y pie); nunca `outline: none` sin reemplazo. Ambos con contraste >= 3:1 contra su fondo (D6).
- AC5 *(visual)*: Con `reducedMotion: 'reduce'`, `transition-duration` y `animation-duration` computados son ~0 en los elementos de la página.
- AC6 *(visual)*: El CTA (`variant="cta"`) tiene fondo `#C2410C`, texto blanco (contraste 5.2:1, >= 4.5:1), radio pill, texto 17 px/700, alto >= 44 px; en hover fondo `#9A3412`. Hay exactamente un CTA en la vista.
- AC7 *(visual)*: `StatusBadge` renderiza los 4 estados (`confirmed`, `pending`, `cancelled`, `neutral`) con el par texto/fondo exacto de DESIGN-SYSTEM, un ícono `aria-hidden` y el texto visible (Confirmada, Pendiente, Cancelada, Neutro).
- AC8 *(visual)*: El switch tiene nombre accesible por su etiqueta, encendido `#0F5257`, apagado `#D9D2C3`, y su zona clicable (con etiqueta) >= 44 px de alto; se activa con teclado (Space).
- AC9 *(visual)*: El campo tiene `<label>` visible enlazada al `input` (`for`/`id`), alto 52 px, texto >= 16 px, borde 1.5 px `#DDD6C8`; en foco, borde `#0F5257` y halo `0 0 0 4px rgba(15,82,87,.12)`.
- AC10 *(visual)*: El encabezado tiene fondo `#0B1513`, logo (círculo `accent` con montaña blanca + texto "Wayra") enlazado a `/`, links Paquetes (`/paquetes`), Tours de un día (`/tours`), Ofertas (`/ofertas`) con alto >= 44 px, y `PEN · S/` como elemento no interactivo (no `button`, no foco). A 390 px los links se apilan/envuelven sin cortar texto.
- AC11 *(visual)*: El pie tiene fondo `#0B1513`, logo y los mismos links de navegación (reutiliza `site-links`), con alto >= 44 px y copyright "Wayra". El pie queda al fondo del viewport aunque el contenido sea corto.
- AC12 *(visual)*: Sin scroll horizontal en 390 px y 1280 px (`documentElement.scrollWidth <= clientWidth`); el contenido se centra con ancho máx. 1240 px y gutter 24 px.
- AC13 *(auto)*: `next build` lista solo `/` como ruta de la app (más `_not-found`); existen `app/(public)/layout.tsx`, `(customer)`, `(organizer)` y `(admin)` con su `layout.tsx` y sin `page.tsx`; ninguna ruta usa Clerk ni guard de rol. `app/page.tsx` no existe.
- AC14 *(auto)*: `package.json` no gana dependencias nuevas (solo lo que el CLI de shadcn agregue; si agrega alguna, se anota en la tarea). `globals.css` no contiene `.dark`.

## Contracts

### Tokens (`app/globals.css`)
`@theme` (valores estáticos) para lo propio de Wayra; el `@theme inline` de shadcn se mantiene y `:root` fija sus variables a valores Wayra.

| Utilidad / variable | Valor |
| ------------------- | ----- |
| `--color-primary-soft`, `-mid` | `#E3EFEE`, `#8FBDB8` |
| `--color-accent-hover`, `-soft` | `#9A3412`, `#FFD9C2` |
| `--color-focus` | `#F59E6B` |
| `--color-ink`, `-muted` | `#17211F`, `#55615E` |
| `--color-dark`, `--color-bg`, `--color-surface` | `#0B1513`, `#FBF9F5`, `#FFFFFF` |
| `--color-sand`, `-sand-deep` | `#F6F2EA`, `#EDE7DB` |
| `--color-border-field`, `-border-strong`, `-row-divider` | `#DDD6C8`, `#D9D2C3`, `#EEE8DD` |
| `--color-status-{confirmed,pending,cancelled,neutral}` y `…-bg` | pares de DESIGN-SYSTEM |
| `--radius-card`, `-card-sm`, `-field` | 28 px, 18 px, 14 px |
| `--shadow-card`, `--shadow-raised` | las de DESIGN-SYSTEM |
| `--font-display`, `--font-sans` | `var(--font-bricolage)`, `var(--font-dm-sans)` |

`:root`: `--background` bg, `--foreground` ink, `--primary` `#0F5257` / `--primary-foreground` blanco, `--accent` `#C2410C` / `--accent-foreground` blanco (D1), `--ring` focus, `--border` `#E4DED2`, `--input` `#DDD6C8`, `--muted` sand, `--muted-foreground` ink-muted, `--card`/`--popover` surface, `--radius` 14px. `--chart-*` y `--sidebar-*` se dejan alineados a la paleta (no se usan aún).

`@layer base`: `*:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px }` y `.bg-dark *:focus-visible { outline-color: var(--color-focus) }` (D6); `h1` = `clamp(36px, 5vw, 58px)`, tracking −0.045em, interlineado 1; `h2` = 24 px, tracking −0.02em; `h1,h2,h3` en `font-display`; `@media (prefers-reduced-motion: reduce)` pone `animation-duration`, `transition-duration` y `scroll-behavior` neutros en `*`.

### Fuentes y metadata (`app/layout.tsx`)
Verificado en `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`: fuentes variables no requieren `weight`; `variable` crea la variable CSS; `display: 'swap'` es el default.
```ts
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
export const metadata: Metadata = {
  title: { default: "Wayra · Paquetes y tours en Perú", template: "%s · Wayra" },
  description: "...", // una frase en español
};
// <html lang="es" className={`${bricolage.variable} ${dmSans.variable} h-full antialiased`}>
```
Si 500/700/800 de Bricolage no salen del eje variable, el developer lista `weight` explícito (fuente: docs del `font.md` de Next).

### `components/ui/button.tsx`
Variante nueva `cta`: `rounded-full bg-accent text-accent-foreground hover:bg-accent-hover text-[17px] font-bold h-12 px-6`. Las variantes existentes siguen funcionando. Anillo de foco según D6 (3 px, offset 3 px), no `ring/50`. Uso del link-CTA: `<Button variant="cta" render={<Link href="..." />}>` (patrón `render` de base-ui; el developer lo confirma con `npx shadcn@latest docs button`).

### `components/shared`
```ts
// wayra-logo.tsx
export function WayraLogo(props: { tone?: "light" }): JSX.Element // <Link href="/" aria-label="Wayra, inicio"> círculo accent + <Mountain aria-hidden/> + "Wayra" (font-display 800)
// site-links.ts
export const SITE_LINKS: ReadonlyArray<{ label: string; href: string }> // Paquetes /paquetes, Tours de un día /tours, Ofertas /ofertas
// site-header.tsx  (Server Component)
export function SiteHeader(): JSX.Element // <header> bg-dark: logo, <nav aria-label="Principal"> con SITE_LINKS, <span>PEN · S/</span>
// site-footer.tsx  (Server Component)
export function SiteFooter(): JSX.Element // <footer> bg-dark: logo, <nav aria-label="Pie">, © Wayra
// status-badge.tsx
export type BookingStatusKey = "confirmed" | "pending" | "cancelled" | "neutral";
export function StatusBadge(props: { status: BookingStatusKey; label?: string }): JSX.Element // ícono + texto
```
`BookingStatusKey` coincide con `booking_status` de ERM (`confirmed|pending|cancelled`) más `neutral` (borrador/todas). Íconos de estado: `CircleCheck`, `Clock`, `CircleX`, `Circle` de `lucide-react` (trazo 2–2.8). Sin `"use client"` en nada de esta spec salvo que `switch`/`field` del CLI lo traigan.

### Rutas
```
app/(public)/layout.tsx     # <SiteHeader/> <main>{children}</main> <SiteFooter/>
app/(public)/page.tsx       # placeholder (D4), h1 + subtítulo 18 px + 1 CTA + bloque de muestra
app/(customer)/layout.tsx   # igual que (public) (el pago conserva el chrome del sitio)
app/(organizer)/layout.tsx  # <>{children}</> (sin shell hasta la spec del panel)
app/(admin)/layout.tsx      # <>{children}</> (idem)
```
`<main>` lleva el contenedor `mx-auto w-full max-w-[1240px] px-6 flex-1`. Layouts tipados con `LayoutProps<"/">` o `{ children: React.ReactNode }`. El texto del placeholder es neutro ("Base visual de Wayra"), sin precios, destinos ni paquetes.

## Edge cases
- `bg-accent` de shadcn (hover de menús) colisiona con el terracota: ver D1.
- El foco `#F59E6B` sobre fondo claro tiene ~2:1 de contraste (WCAG 2.2 pide 3:1): por eso D6.
- `outline-none` de los componentes shadcn gana al foco global (capa `utilities` sobre `base`): por eso `button`, `switch` e `input` se ajustan explícitamente.
- Dos `page.tsx` en `/` fallan el build: se borra `app/page.tsx`.
- Grupos `(customer)`, `(organizer)`, `(admin)` sin páginas no producen rutas; sirven solo de ancla para las specs siguientes.
- En 390 px `PEN · S/` y los links no deben forzar ancho: `flex-wrap` y `min-w-0`.
- Íconos solo decorativos con `aria-hidden`; el link del logo lleva `aria-label`.

## Tests
n.a. — no hay lógica de negocio: son estilos, markup y composición (SETUP §3 excluye markup trivial). Las pruebas existentes (`npm test`) deben seguir en verde. La verificación de AC3–AC12 es manual con Playwright (390 y 1280 px).

## Plan

### Phase 1 — Tokens, fuentes y componentes shadcn
Entrega: tokens y fuentes activos, componentes shadcn agregados; la app compila y la home de plantilla sigue sirviendo.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `npx shadcn@latest add badge switch input field` (anotar dependencias nuevas, si las hay) | components/ui/badge.tsx, components/ui/switch.tsx, components/ui/input.tsx, components/ui/field.tsx, components/ui/label.tsx, components/ui/separator.tsx, package.json, package-lock.json | - | A | AC14 | done |
| T2 | `globals.css`: tokens `@theme`, mapeo `:root` shadcn, quitar `.dark`/`custom-variant dark`, foco global, reduced-motion, estilos `h1`/`h2` | app/globals.css | T1 | B | AC2, AC4, AC5, AC14 | done |
| T3 | `layout.tsx`: Bricolage + DM Sans, `lang="es"`, metadata | app/layout.tsx | T1 | B | AC3 | done |

(Si el CLI no genera `label.tsx` o `separator.tsx`, esos paths no se crean.)

### Phase 2 — Componentes base
Entrega: CTA, badge de estado, switch, campo y logo con los tokens finales.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | Ajustar `button` (variante `cta`, foco D6), `switch` (on `primary`, off `border-strong`, zona >= 44 px), `input` (52 px, 1.5 px `border-field`, 16 px, foco `primary` + halo), `field`/`label` si hace falta | components/ui/button.tsx, components/ui/switch.tsx, components/ui/input.tsx, components/ui/field.tsx, components/ui/label.tsx | T2, T3 | A | AC4, AC6, AC8, AC9 | done |
| T5 | `WayraLogo` y `StatusBadge` (ícono + texto, pares de estado) sobre `Badge`; ajustar `badge.tsx` (pill, tokens) | components/shared/wayra-logo.tsx, components/shared/status-badge.tsx, components/ui/badge.tsx | T2, T3 | A | AC7, AC10 | done |

### Phase 3 — Chrome del sitio, route groups y placeholder
Entrega: `/` muestra encabezado, placeholder y pie con la identidad de Wayra; los 4 grupos de rutas existen.

| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T6 | `site-links`, `SiteHeader`, `SiteFooter` | components/shared/site-links.ts, components/shared/site-header.tsx, components/shared/site-footer.tsx | T4, T5 | A | AC10, AC11, AC12 | done |
| T7 | Layouts mínimos de `(organizer)` y `(admin)` | app/(organizer)/layout.tsx, app/(admin)/layout.tsx | T3 | A | AC13 | done |
| T8 | `(public)/layout.tsx`, `(public)/page.tsx` (placeholder D4), `(customer)/layout.tsx`; borrar `app/page.tsx` | app/(public)/layout.tsx, app/(public)/page.tsx, app/(customer)/layout.tsx, app/page.tsx | T6 | B | AC1, AC3, AC12, AC13 | done |

### Verificación (orquestador, tras T8; no es tarea de developer)
Levantar `npm run dev` o `npm run build && npm start`; con Playwright a 390×844 y 1280×800: capturas de `/`, medir AC3–AC12 (estilos computados, Tab, `reducedMotion`, `scrollWidth`), y comparar contra el artefacto de diseño. Resultado y capturas se informan en el PR; no se commitea código de Playwright.

Reviewer por fase: al cerrar cada fase corren `tsc`, `lint`, `build`, `test` (AC1) antes de pasar a la siguiente.

## Notas
- No pude leer el artefacto de diseño (no hay herramienta de lectura de artefactos en este agente): la estructura de encabezado/pie sale solo de DESIGN-SYSTEM (fondo `dark`, logo, `PEN · S/`, navegación). Cualquier otro elemento del artefacto (tagline del pie, redes, contacto) queda fuera hasta confirmarlo.
- Los links del pie y del encabezado vienen de un solo `SITE_LINKS` (DRY).

## Open questions
Ninguna: resueltas en D6 y D7.
