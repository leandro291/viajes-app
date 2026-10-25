# 036 — design-frame

- Fecha: 2026-10-25
- Spec: `docs/specs/shared/design-fidelity.md` (tarea T0)
- PR: `docs/prs/036-design-frame.md`

## Resumen
Marco compartido de la spec de fidelidad: encabezado que se superpone a un hero a todo el ancho (`PageHero`), navegación con enlace activo, pie de tres bloques, textos "Iniciar sesión" y "Registrarse", y `PackageCard` con variantes `rail` y `grid`. Aún ninguna pantalla usa `PageHero`; lo trae T1/T2/T3.

## Cambios
- `components/shared/site-header.tsx` — header transparente sobre el hero (`:has([data-page-hero])`) y sólido sin hero; textos del tablero.
- `components/shared/site-nav.tsx` — nuevo, enlace activo con `aria-current`, dentro de `<Suspense>`.
- `components/shared/site-footer.tsx` — pie de tres bloques.
- `components/shared/page-hero.tsx` — nuevo contenedor de hero a todo el ancho.
- `app/(public)/layout.tsx` — wrapper `group/shell` que habilita el header superpuesto.
- `app/layout.tsx` — localización de Clerk: "Iniciar sesión" y "Registrarse".
- `app/globals.css` — keyframe `wy-up`.
- `modules/packages/components/package-card.tsx` — variantes `rail` y `grid`, foto 4:5, chips y círculo con flecha.
- `components/shared/wayra-logo.tsx` — logo de 34 px con texto de 28 px y tracking −0.03em; prop `compact` (32 px) para el pie.
- `docs/DESIGN-SYSTEM.md` — encabezado superpuesto, radios y criterio de fidelidad al artefacto.

## Pendiente
- Gradiente de `PageHero`: se usó `.62` (tablero) en vez del `.55` literal de AC4.
- Medidas de `PageHero` (`pt-52`, `sm:pt-40`, `min-[960px]:pt-24`) estimadas; se miden cuando una pantalla lo use.
