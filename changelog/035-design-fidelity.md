# 035 — design-fidelity

- Fecha: 2026-10-25
- Spec: `docs/specs/shared/design-fidelity.md`
- PR: `docs/prs/035-design-fidelity.md`

## Resumen
Spec aprobada para acercar Inicio, Paquetes y Detalle al artefacto de diseño: encabezado superpuesto sobre un hero a todo el ancho, carrusel compartido, buscador de 4 campos, tarjetas 4:5 y panel de reserva fijo. Solo documentación; el código llega con sus tareas.

## Cambios
- `docs/specs/shared/design-fidelity.md` — spec con 35 criterios de aceptación, 5 tareas en 2 fases (T0 marco, T0b carrusel compartido, T1 Inicio, T2 Paquetes, T3 Detalle) y criterio de fidelidad reutilizable (F1–F8).
- `changelog/035-design-fidelity.md`, `docs/prs/035-design-fidelity.md`

## Pendiente
- Desarrollo de T0, T0b, T1, T2 y T3 (orden de merge: T0 → T0b → T1/T2/T3; T3 solo necesita T0).
- Specs aparte: filtros reales de fecha y viajeros en `/paquetes`, copia de ajuste móvil, mapa Leaflet, tarjeta promo del aside, rutas `/destinos`, `/tours` y `/ofertas`.
