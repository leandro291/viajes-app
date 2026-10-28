# 041 — fix-checkout-terms

- Fecha: 2026-10-26
- Spec: n.a.
- PR: `docs/prs/041-fix-checkout-terms.md`

## Resumen
En `/pago`, tras una respuesta con error del servidor la casilla de términos se veía marcada pero ya no enviaba `terms`: el siguiente "Pagar" decía "Debes aceptar los términos" y el primer clic para desmarcar no hacía nada. Causa: React 19 resetea el `<form>` tras la acción y el input interno de Base UI queda sin marcar mientras el estado sigue en `true`. Se remonta la casilla con un `key` tras cada respuesta.

## Cambios
- `modules/checkout/components/checkout-form.tsx` — `key` de la casilla de términos que cambia con cada nuevo `state` de la acción.

## Pendiente
- Sin test automatizado: SETUP §3 no pide tests de `.tsx`.
