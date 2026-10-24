# SETUP

Reglas de buenas prácticas del proyecto. Aplican a todo el código nuevo.

Stack: ver [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md#stack). No cargar los demás documentos salvo que la tarea los necesite (ver tabla al final).

---

## 1. Estructura de carpetas

Vive en [ARCHITECTURE.md](ARCHITECTURE.md). **Leerlo al crear o mover archivos**: módulos de dominio, naming de TypeScript, `app/` solo routing, Server Components por defecto, rutas por rol.

---

## 2. Buenas prácticas

**SOLID, DRY, KISS y YAGNI se aplican siempre**: componentes shadcn, componentes propios, funciones, hooks, services, stores, schemas.

| Principio | Qué significa acá                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| **S**RP   | Una unidad, una responsabilidad: el service accede a datos, el hook orquesta, el componente renderiza.             |
| **O**CP   | Extender por props/composición (`children`, variantes) en vez de modificar el componente con más `if`.             |
| **L**SP   | Los componentes derivados o wrappers deben poder usarse donde se usa el base sin romper su contrato.               |
| **I**SP   | Props mínimas y específicas; no pasar objetos gigantes si solo se usan dos campos.                                 |
| **D**IP   | Los componentes dependen de hooks/abstracciones, no de Axios directo. Los hooks dependen de services.              |
| DRY       | Lógica repetida en 2+ lugares → se extrae. No antes (ver YAGNI).                                                   |
| KISS      | La solución más simple que funcione. Sin capas, patrones ni genéricos que el problema no pide.                     |
| YAGNI     | No construir para "algún día". Sin props, opciones, carpetas ni abstracciones sin un uso real actual.              |

### Componentes: shadcn primero

Al empezar cualquier componente de UI:

1. **Verificar si existe en shadcn** (`npx shadcn@latest add <name>`). Si existe, se usa.
2. Si no existe, **lo creamos nosotros pensando en reutilización**: props genéricas, estilos con Tailwind + `cn()`, sin lógica de dominio. Va en `components/shared/` si lo usan varios módulos, o en `modules/<domain>/components/` si es específico de uno.
3. Nota: el preset de shadcn es `base-nova` (basado en `@base-ui/react`, no Radix).
4. Colores, tipografía y tokens: [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Leerlo al hacer UI.

### Verificar antes de crear

**Siempre buscar antes de escribir.** Antes de crear un componente, función, hook, schema o util, confirmar que no exista ya (en el módulo, en `components/shared`, `hooks`, `lib` o en shadcn). Si existe algo parecido, se reutiliza o se extiende; no se duplica.

---

## 3. Unit testing

- Se testea **donde aporta valor**: lógica de negocio, services, hooks con lógica, schemas Zod, utilidades y stores. No se testea markup trivial ni componentes que solo componen.
- Los tests van junto al archivo que prueban: `booking-service.ts` → `booking-service.test.ts`.
- El test runner todavía **no está instalado**. Se elige y configura al implementar el primer test; hasta entonces no se agrega.

---

## Qué documento leer y cuándo

Cada documento se lee **solo si la tarea lo necesita**. Son enlaces, no importaciones.

| Documento                                  | Leer cuando…                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)         | Creás o movés archivos, decidís en qué módulo va algo, agregás una ruta   |
| [ERM.md](ERM.md)                           | Tocás la base de datos: schema, migraciones, services, queries, permisos por rol |
| [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md)       | Tocás auth, pagos, webhooks, variables de entorno, despliegue             |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)       | Construís o cambiás UI, colores, tipografía, `globals.css`                |
