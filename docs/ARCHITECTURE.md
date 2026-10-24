# ARCHITECTURE

Estructura de carpetas, módulos y rutas de Wayra. Leer al **crear o mover archivos**, o al decidir dónde va algo.
Reglas de código: [SETUP.md](SETUP.md). Datos: [ERM.md](ERM.md). Infra y flujos: [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md).

---

## 1. Reglas

1. **Todo se organiza por módulo de dominio**, no por tipo técnico. Un módulo agrupa todo lo de un dominio (`packages`, `bookings`, `payments`).
2. **Nombres en inglés**, siempre (carpetas, archivos, variables, tipos).
3. **Naming de TypeScript:**

   | Elemento                         | Convención                       | Ejemplo                    |
   | -------------------------------- | -------------------------------- | -------------------------- |
   | Archivos y carpetas              | `kebab-case`                     | `package-card.tsx`         |
   | Componentes, tipos, interfaces   | `PascalCase`                     | `PackageCard`, `PackageDto`|
   | Funciones, variables, hooks      | `camelCase` (hooks con `use`)    | `getPackages`, `usePackageList` |
   | Constantes globales              | `UPPER_SNAKE_CASE`               | `API_BASE_URL`             |
   | Schemas Zod                      | `camelCase` + sufijo `Schema`    | `createBookingSchema`      |
   | Stores Zustand                   | `use` + nombre + `Store`         | `usePackageFilterStore`    |
   | Tests                            | mismo nombre + `.test.ts(x)`     | `booking-service.test.ts`  |

4. **App Router:** `app/` contiene **solo routing** (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`). Las páginas son delgadas: importan y componen desde `modules/`. Nada de lógica de negocio ni componentes de dominio dentro de `app/`.
5. **Server Components por defecto.** `"use client"` solo en el archivo que lo necesite (interactividad, hooks de estado/efecto, TanStack Query, Zustand), lo más abajo posible en el árbol.
6. **Un módulo no importa los internos de otro.** Lo compartido se expone desde su `index.ts` o se sube a `components/shared`, `hooks` o `lib`.
7. **Solo se crean las subcarpetas que el módulo necesita** (YAGNI).

## 2. Estructura base

```
app/                          # routing only (App Router)
  (public)/                   # sin sesión: inicio, paquetes, tours, ofertas, destinos
  (customer)/                 # rol customer: pago, confirmación, mis reservas
  (organizer)/                # rol organizer: panel del operador
  (admin)/                    # roles admin y super_admin: panel de administración
  api/webhooks/               # route handlers de Clerk y Stripe
  layout.tsx
  globals.css

modules/                      # dominio: una carpeta por módulo
  <module>/
    components/               # UI del dominio
    hooks/                    # queries y mutations (TanStack Query)
    services/                 # acceso a datos (Drizzle, Stripe, Clerk), sin React
    schemas/                  # validación Zod + tipos inferidos
    store/                    # estado cliente (Zustand), solo si hace falta
    types/
    index.ts                  # API pública del módulo

components/
  ui/                         # shadcn/ui (generado)
  shared/                     # reutilizables entre módulos
hooks/                        # hooks reutilizables entre módulos
lib/                          # transversal: cn, db (Drizzle), stripe, auth (guards de rol)
docs/                         # documentación
```

## 3. Módulos de dominio

| Módulo         | Responsabilidad                                                    | Tablas (ver ERM)                                           |
| -------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `destinations` | Destinos, clima, lugares imperdibles, preguntas frecuentes         | `destinations`, `destination_*`                            |
| `packages`     | Paquetes y tours: catálogo, detalle, itinerario, filtros, CRUD del operador | `packages`, `package_*`, `categories`, `guides`, `departures` |
| `offers`       | Ofertas y descuentos                                               | `offers`                                                   |
| `bookings`     | Reserva, viajeros, estados, cancelación, "Mis reservas"            | `bookings`, `booking_travelers`                            |
| `payments`     | Stripe Checkout, webhooks, reembolsos                              | `payments`, `stripe_events`                                |
| `checkout`     | Flujo de pago de 3 pasos (orquesta `bookings` y `payments`)        | —                                                          |
| `users`        | Perfil y sincronización con Clerk                                  | `users`, `notification_preferences`                        |
| `organizers`   | Perfil del operador (razón social, RUC)                            | `organizers`                                               |
| `admin`        | Resumen, KPIs, reportes, clientes (lecturas agregadas)             | derivado, sin tablas propias                               |
| `newsletter`   | Suscripción a ofertas                                              | `newsletter_subscribers`                                   |

`checkout` y `admin` solo componen: llaman a la API pública (`index.ts`) de otros módulos.

## 4. Rutas por rol

| Grupo         | Ejemplo de rutas                                                                    | Roles permitidos                    |
| ------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| `(public)`    | `/`, `/paquetes`, `/paquetes/[slug]`, `/tours`, `/ofertas`, `/destinos/[slug]`      | todos                               |
| `(customer)`  | `/pago`, `/confirmacion/[code]`, `/mis-reservas`, `/cuenta`                         | `customer` (y roles superiores)     |
| `(organizer)` | `/operador`, `/operador/paquetes`, `/operador/salidas`, `/operador/reservas`, `/operador/ofertas` | `organizer`           |
| `(admin)`     | `/admin`, `/admin/reservas`, `/admin/paquetes`, `/admin/clientes`, `/admin/ofertas`, `/admin/operadores` | `admin`, `super_admin` |

Solo `super_admin` ve: gestión de administradores, aprobación de operadores y configuración del sitio.
Los slugs de URL van en español (producto); carpetas y código, en inglés. La autorización se explica en [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md#autenticación-y-autorización).

## 5. Capas

`service` (datos, sin React) → `hook` (orquesta, TanStack Query) → `componente` (renderiza).
Server Components y Server Actions llaman al `service` directo; los componentes cliente usan hooks.
`lib/db`, `lib/stripe` y `lib/auth` son los únicos lugares que instancian Drizzle, Stripe y Clerk.

## 6. Ejemplo

```ts
// modules/packages/services/package-service.ts
import { db } from "@/lib/db";

export const getPublishedPackages = () =>
  db.query.packages.findMany({ where: (p, { eq }) => eq(p.status, "published") });
```

```ts
// modules/packages/index.ts  (lo único que ven los demás módulos y app/)
export { PackageGrid } from "./components/package-grid";
export type { Package } from "./types/package";
```

```tsx
// app/(public)/paquetes/page.tsx  (delgada: solo compone)
import { PackageGrid } from "@/modules/packages";

export default function PackagesPage() {
  return <PackageGrid />;
}
```
