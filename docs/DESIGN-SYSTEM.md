# DESIGN-SYSTEM

Reglas, colores y tokens de Wayra, tomados del artefacto de diseño. Leer al **construir o cambiar UI**: componentes, estilos, `globals.css`.
Reglas de componentes (shadcn primero): [SETUP.md](SETUP.md#componentes-shadcn-primero).

## Color

| Token             | Valor     | Uso                                                       |
| ----------------- | --------- | --------------------------------------------------------- |
| `primary`         | `#0F5257` | Teal de marca: enlaces, foco de campo, switches activos, barras |
| `primary-soft`    | `#E3EFEE` | Fondos de aviso y chips informativos                      |
| `primary-mid`     | `#8FBDB8` | Íconos sobre oscuro, estación "mixta" del clima           |
| `accent`          | `#C2410C` | Terracota: botón principal (CTA), paso actual, mes actual |
| `accent-hover`    | `#9A3412` | Hover del CTA                                             |
| `accent-soft`     | `#FFD9C2` | Hover del botón claro, enlaces sobre oscuro               |
| `focus`           | `#F59E6B` | Anillo de foco (`outline 3px`, offset 3px)                |
| `ink`             | `#17211F` | Texto principal, botones oscuros                          |
| `ink-muted`       | `#55615E` | Texto secundario                                          |
| `dark`            | `#0B1513` | Encabezado y pie                                          |
| `bg`              | `#FBF9F5` | Fondo de página                                           |
| `surface`         | `#FFFFFF` | Tarjetas y campos                                         |
| `sand`            | `#F6F2EA` | Bloques de dato dentro de tarjetas                        |
| `sand-deep`       | `#EDE7DB` | Estación "lluvias", fondos neutros                        |
| `border`          | `#E4DED2` | Bordes de tarjeta y chips                                 |
| `border-field`    | `#DDD6C8` | Borde de campos de formulario                             |
| `border-strong`   | `#D9D2C3` | Switches apagados, separadores punteados                  |
| `row-divider`     | `#EEE8DD` | Separador de filas de tablas y listas                     |

Estados de reserva (par texto / fondo):

| Estado      | Texto     | Fondo     |
| ----------- | --------- | --------- |
| Confirmada  | `#166534` | `#DCFCE7` |
| Pendiente   | `#854D0E` | `#FEF3C7` |
| Cancelada   | `#991B1B` | `#FEE2E2` |
| Neutro (borrador, todas) | `#17211F` | `#F4F1EA` |

Los estados siempre llevan **ícono + texto**, no solo color.

## Tipografía

| Rol       | Familia                | Pesos         | Notas                                            |
| --------- | ---------------------- | ------------- | ------------------------------------------------ |
| Títulos   | Bricolage Grotesque    | 500, 700, 800 | Tracking −0.02em (h2) a −0.045em (h1); interlineado 0.95–1.05 en títulos grandes |
| Cuerpo    | DM Sans                | 400, 500, 700 | 16 px base; 18 px en subtítulos                  |

| Estilo   | Tamaño                       |
| -------- | ---------------------------- |
| h1       | `clamp(36px, 5vw, 58px)`     |
| h2       | 24 px                        |
| Dinero grande | 34 px, peso 800         |
| Etiqueta | 12–14 px, peso 700, mayúsculas con 0.06em en metadatos |

Fuentes por Google Fonts (`next/font/google` al implementar).

## Forma y espacio

| Token         | Valor                                                              |
| ------------- | ------------------------------------------------------------------ |
| Radio campo / bloque | 14 px                                                       |
| Radio tarjeta chica | 18 px                                                        |
| Radio tarjeta | 28 px                                                              |
| Radio botón / chip | 999 px (pill)                                                 |
| Sombra tarjeta | `0 1px 2px rgba(11,21,19,.05), 0 12px 32px rgba(11,21,19,.05)`    |
| Sombra destacada (resumen) | `0 30px 70px rgba(11,21,19,.14), 0 2px 6px rgba(11,21,19,.06)` |
| Ancho máximo  | 1240 px, gutter 24 px                                              |
| Breakpoints   | móvil 390 px, escritorio 1280 px; el contenido fluye entre ambos   |
| Movimiento    | transiciones 0.15 s; entrada `translateY(10px)` en 0.4 s           |

## Reglas

- **Un solo CTA por vista**, en `accent`. Texto blanco sobre `accent` (contraste ≥ 4.5:1).
- **Objetivos táctiles ≥ 44 px**; campos de 52 px de alto.
- **Foco siempre visible** en `a`, `button`, `select`, `input` (`focus-visible`, anillo `focus`).
- **Respetar `prefers-reduced-motion`**: sin animaciones ni transiciones.
- **Campos:** etiqueta visible (`<label>`), 16 px mínimo (evita zoom en iOS), borde 1.5 px; en foco, borde `primary` y halo `0 0 0 4px rgba(15,82,87,.12)`.
- **Semántica real:** `button`, `a href`, `input` + `label`; nunca `div` clicable. Íconos solo decorativos llevan `aria-hidden`.
- **Íconos:** `lucide-react`, trazo 2–2.8. Sin emoji.
- **Imágenes:** siempre con `alt`; fotos con licencia CC muestran su crédito en el pie.
- **Dinero:** `S/ 1 290` (espacio fino como separador de miles); el catálogo siempre en soles. En el paso de pago se muestra además el total a cobrar en dólares (`US$ 345.00`), antes del botón de pagar.
- **Gráficos:** barras en `primary`, el mes actual en `accent`; al pasar el cursor, el resto baja a 40 % de opacidad. Toda gráfica tiene vista de tabla equivalente.
- **Responsive:** en móvil los menús se apilan, las barras de herramientas envuelven y las tablas anchas hacen scroll interno.

## Componentes

| Componente            | Notas                                                                        |
| --------------------- | ---------------------------------------------------------------------------- |
| Encabezado / pie      | Fondo `dark`, logo Wayra (círculo `accent` + montaña), selector `PEN · S/`   |
| Botón principal       | Pill `accent`, 17 px/700, ícono opcional; secundario: blanco o contorno      |
| Tarjeta de paquete    | Foto, destino, duración, "Desde S/ …"; radio 28                              |
| Chip de filtro        | Pill; activo `ink` con texto blanco, inactivo blanco con borde `border`      |
| Stepper de reserva    | 3 pasos con barra de 4 px: completado `primary`, actual `accent`, pendiente `#E4DED2` |
| Selector de método de pago | Tarjetas radio con borde 2 px; seleccionada `accent` sobre `#FFF6F0`    |
| Badge de estado       | Ícono + texto con par de color de la tabla de estados                        |
| Switch                | Encendido `primary`, apagado `border-strong`                                 |
| Tabla del admin       | Filas con avatar de iniciales (`#E3EFEE/#0F5257` y `#FFEDD5/#9A3412`)        |
| Tarjeta de indicador  | Etiqueta, valor grande, variación con flecha                                 |
| Resumen del pedido    | Sticky, sombra destacada, total en 34 px                                     |

Antes de crear uno: revisar shadcn (`npx shadcn@latest add <name>`) y [SETUP.md](SETUP.md).

## Implementación (Tailwind 4 + shadcn `base-nova`)

Los tokens se declaran una vez en `app/globals.css` con `@theme` y se usan como utilidades (`bg-accent`, `text-ink-muted`, `rounded-card`). Las variables de shadcn (`--primary`, `--ring`, `--radius`…) se mapean a estos tokens: `--primary` → `primary`, `--ring` → `focus`, `--background` → `bg`.

```css
@theme {
  --color-primary: #0F5257;
  --color-accent: #C2410C;
  --color-accent-hover: #9A3412;
  --color-focus: #F59E6B;
  --color-ink: #17211F;
  --color-ink-muted: #55615E;
  --color-dark: #0B1513;
  --color-bg: #FBF9F5;
  --color-sand: #F6F2EA;
  --color-border: #E4DED2;
  --radius-card: 28px;
  --font-display: "Bricolage Grotesque", sans-serif;
  --font-sans: "DM Sans", system-ui, sans-serif;
}
```

Este documento define el diseño; `globals.css` se actualiza al implementar la primera pantalla.
