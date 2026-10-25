# 035 — design-fidelity

- Spec: `docs/specs/shared/design-fidelity.md`
- Rama: `035-design-fidelity`

## Qué se hizo
Se agrega la spec de fidelidad de diseño para Inicio, Paquetes y Detalle, aprobada por Leandro Rojas el 2026-10-25. Solo documentación, sin cambios de código.

## Cambios
- `docs/specs/shared/design-fidelity.md` — spec aprobada: 35 criterios, 5 tareas con `Owns` por archivo, decisiones D1–D14 y criterio de fidelidad reutilizable.
- `changelog/035-design-fidelity.md`, `docs/prs/035-design-fidelity.md`

## Criterios de aceptación
- [x] La spec tiene `Status: approved` y `Approved by` con nombre y fecha
- [x] Decisiones del usuario registradas: Q1 (CTA como el tablero), Q2 (filtros en spec aparte), Q3 (carrusel de 5 destacados), Q4 (textos "Iniciar sesión" y "Registrarse"), WhatsApp solo de estilo
- [x] Cada tarea declara sus archivos y su orden de merge

## Cómo probar
1. Leer `docs/specs/shared/design-fidelity.md`.
2. Verificar que las tareas T1, T2 y T3 no comparten archivos.

## Notas
- Las tareas de código se numerarán 036 (T0), 037 (T0b), 038 (T1), 039 (T2) y 040 (T3), cada una en su worktree.
- Móvil: se implementa sin los tableros `Movil-*`; el riesgo está anotado en la spec.

## Revisión
- Reviewer: n.a. (solo documentación)
- lint n.a. · tsc n.a. · Playwright n.a. (solo documentación, sin código)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
