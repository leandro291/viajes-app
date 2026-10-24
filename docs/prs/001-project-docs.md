# 001 — project-docs

- Spec: n.a. (BUILD, solo documentación)
- Rama: `001-project-docs`

## Qué se hizo
Cuatro documentos nuevos (ERM, SYSTEM-DESIGN, DESIGN-SYSTEM, ARCHITECTURE) derivados del artefacto de diseño de Wayra. SETUP.md deja de repetir la estructura de carpetas y enlaza a cada documento para leerlos bajo demanda.

## Cambios
- `docs/ERM.md`, `docs/SYSTEM-DESIGN.md`, `docs/DESIGN-SYSTEM.md`, `docs/ARCHITECTURE.md` — nuevos
- `docs/SETUP.md` — §1 a stub, tabla de lectura
- `CLAUDE.md` — tabla de lectura y roles
- `changelog/001-project-docs.md`, `docs/prs/001-project-docs.md`

## Criterios de aceptación
- [x] Todos los enlaces `.md` entre documentos resuelven
- [x] Cada hex de DESIGN-SYSTEM existe en el artefacto
- [x] Las referencias "SETUP §1" del reviewer siguen resolviendo (stub)
- [ ] Diagramas Mermaid se ven en GitHub (revisar tras el push)

## Cómo probar
1. Abrir `docs/ERM.md` y `docs/SYSTEM-DESIGN.md` en GitHub y ver los diagramas.
2. Seguir los enlaces de `docs/SETUP.md`.

## Revisión
- Reviewer: n.a. (solo documentación)
- lint n.a. · tsc n.a. · Playwright n.a.
