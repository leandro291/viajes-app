# 018 — mi-cuenta

- Fecha: 2026-10-25
- Spec: n.a. (BUILD, sin contratos nuevos de datos)
- PR: `docs/prs/018-mi-cuenta.md`

## Resumen
Página `/cuenta` del cliente con el `UserProfile` de Clerk (datos y seguridad), usando el tema ya configurado en `ClerkProvider`. El menú del usuario del encabezado tiene una opción "Mi cuenta" que lleva a ella. La ruta ya estaba protegida para `customer` por `proxy.ts` (005).

## Cambios
- `app/(customer)/cuenta/page.tsx` — `<UserProfile routing="hash" />` dentro de `<Suspense>`; el `hash` evita una ruta catch-all.
- `components/shared/user-menu.tsx` — `UserButton` con el enlace "Mi cuenta" → `/cuenta`. Es client component porque `UserButton.MenuItems` y `UserButton.Link` no se acceden desde un Server Component.
- `components/shared/site-header.tsx` — usa `<UserMenu />` en lugar de `<UserButton />`.

## Pendiente
- `notification_preferences` no se hizo acá (el changelog 006 decía que lo crearía `/cuenta`): el ERM no da acceso al `customer` a esa tabla y la tarjeta solo pide `UserProfile`. Queda para otro ticket.
- El menú también conserva "Administrar cuenta" de Clerk (modal con lo mismo que `/cuenta`).
