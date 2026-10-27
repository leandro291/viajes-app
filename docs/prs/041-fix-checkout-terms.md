# 041 — fix-checkout-terms

- Spec: n.a.
- Rama: `041-fix-checkout-terms`

## Qué se hizo
Arregla la casilla de términos de `/pago`: tras un error del servidor quedaba visualmente marcada pero sin enviar `terms`. Se remonta con un `key` tras cada respuesta de la acción.

## Cambios
- `modules/checkout/components/checkout-form.tsx` — `key` de la casilla ligado a cada nuevo `state` de `useActionState`.
- `changelog/041-fix-checkout-terms.md` — entrada de changelog.
- `docs/prs/041-fix-checkout-terms.md` — esta descripción.

## Criterios de aceptación
- [x] Tras un error del servidor la casilla marcada sigue enviando `terms` (FormData lo incluye).
- [x] Un segundo "Pagar" sin tocar la casilla no muestra "Debes aceptar los términos".
- [x] Un solo clic desmarca y "Pagar" muestra "Debes aceptar los términos y condiciones".

## Cómo probar
1. Con sesión iniciada, abrir `/pago?salida=<id>&viajeros=2` y completar el formulario.
2. Forzar un error del servidor (p. ej. sin `NEXT_PUBLIC_APP_URL`, sale "No pudimos iniciar el pago") con la casilla marcada.
3. Pulsar "Pagar" otra vez: no debe pedir los términos.
4. Desmarcar con un clic y pulsar "Pagar": debe pedir los términos.

## Revisión
- Reviewer: n.a. (BUILD, 1 archivo)
- lint ✓ · tsc ✓ · Playwright: `/pago` (build de producción, 3 pasos de arriba)
