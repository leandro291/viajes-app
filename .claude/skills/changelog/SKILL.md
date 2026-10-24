---
name: changelog
description: Usar cuando se terminó una implementación y hay que dejar su resumen en la carpeta changelog/.
---

# Changelog

Crear `changelog/NNN-<nombre>.md`. Si se usa suelta, NNN = siguiente número (3 dígitos, desde 001) de `changelog/` y `docs/prs/`; dentro de `entregar` ya viene calculado. `<nombre>` = feature de la spec.

```md
# NNN — <nombre>

- Fecha: YYYY-MM-DD
- Spec: `docs/specs/<module>/<feature>.md` | n.a.
- PR: `docs/prs/NNN-<nombre>.md` | n.a.

## Resumen
<2–4 líneas>

## Cambios
- `path` — qué cambió (de `git diff --stat`)

## Pendiente
- <deuda o `ninguno`>
```

Una entrada nueva por implementación; no editar las viejas.
