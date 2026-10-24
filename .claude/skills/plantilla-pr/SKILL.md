---
name: plantilla-pr
description: Usar cuando se va a abrir un pull request y hay que generar su descripción numerada.
---

# Plantilla PR

Crear `docs/prs/NNN-<nombre>.md`. NNN y `<nombre>` igual que en `changelog` (viene de `entregar`, o se calcula igual). Usar datos reales: `git diff --stat`, veredicto del `reviewer`. Sin campos vacíos: `n.a.`.

```md
# NNN — <nombre>

- Spec: `docs/specs/<module>/<feature>.md` | n.a.
- Rama: `NNN-<nombre>`

## Qué se hizo
<1–3 líneas>

## Cambios
- `path` — qué cambia

## Criterios de aceptación
- [x] AC1: ... (marcar solo los verificados)

## Cómo probar
1. ...

## Revisión
- Reviewer: APPROVED | CHANGES_REQUESTED
- lint ✓/✗ · tsc ✓/✗ · Playwright: rutas probadas
```

Abrir el PR (`gh pr create --body-file ...`) solo con confirmación.
