# 001 — project-docs

- Fecha: 2026-10-24
- Spec: n.a.
- PR: `docs/prs/001-project-docs.md`

## Resumen
Documentación base de Wayra a partir del artefacto de diseño: modelo de datos, arquitectura técnica, sistema de diseño y estructura de carpetas. `SETUP.md` queda corto y enlaza a cada documento, que se lee solo cuando la tarea lo necesita.

## Cambios
- `docs/ERM.md` — entidades, enums, reglas de datos, matriz rol × entidad y trazabilidad pantalla → entidades.
- `docs/SYSTEM-DESIGN.md` — stack, Clerk, flujo de reserva y pago con Stripe, webhooks, entornos y preguntas abiertas.
- `docs/DESIGN-SYSTEM.md` — colores, tipografía, forma, reglas y componentes, con mapeo a Tailwind 4.
- `docs/ARCHITECTURE.md` — recibe SETUP §1; agrega módulos de dominio y rutas por rol.
- `docs/SETUP.md` — §1 pasa a stub; tabla "qué documento leer y cuándo".
- `CLAUDE.md` — tabla de lectura bajo demanda y roles.

## Pendiente
- Stripe y soles: confirmar país de la cuenta y moneda de liquidación.
- Proveedor de correo y WhatsApp para el voucher.
- Yape, Plin y PagoEfectivo quedan fuera de v1.
