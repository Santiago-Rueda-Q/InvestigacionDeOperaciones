---
name: io-calculadoras
description: >-
  Desarrollar y refactorizar calculadoras educativas de Investigación de
  Operaciones (asignación, húngaro, flujo máximo, costo mínimo, transporte,
  PERT/CPM) con datos personalizados, trazas reales y patrones UI del repo.
  Usar al tocar solvers en src/core, páginas Flujo*/Asignacion*/Pert* o io/.
---

# Calculadoras educativas IO

## Antes de modificar

1. Identificar módulos de referencia que ya funcionan (p. ej. Transporte + Simplex).
2. Reutilizar `ModuleShell`, `CalculatorChrome`, `CostMatrix`, `NetworkBoard`, `StepBar`.
3. No introducir arquitectura paralela ni librerías UI nuevas.
4. Separar: entrada UI → `validate*` → `solve*` (traza) → presentación.

## Contrato de cada calculadora

- **Modo ejemplo:** presets editables (`*_PRESETS`).
- **Modo personalizado:** `blank*` + edición libre.
- Cualquier edición (`touch`) limpia o marca obsoleto el resultado anterior.
- El botón Resolver usa el draft actual; nunca mostrar totales precargados.
- `busy` evita doble envío mientras se calcula.
- Validación con mensajes de campo; no borrar la entrada válida del usuario.

## Solvers (`src/core`)

- Validar con `validate*Input` (lista de strings).
- Algoritmo puro sin DOM; emitir `steps[]` durante la ejecución real.
- Cada paso: iteración, descripción, datos/matriz/red, decisión, parcial.
- Asignación: negativos permitidos; max vía transformación, total = beneficio original.
- Flujo máx: Edmonds–Karp; capacidades ≥ 0; conservación en intermedios.
- Costo mín: caminos sucesivos + Bellman–Ford residual; costos negativos OK si no hay ciclo negativo; parcial ≠ completo.

## UI

Orden: descripción → entrada → ejemplo/reiniciar/resolver → validaciones → resultado → pasos → interpretación.
Usar `ModuleShell` en **todos** los módulos (Simplex, Transporte, Asignación, Húngaro, Flujo máx., Costo mín., PERT/CPM): sidebar con `sidebarBasisRem` / `sidebarBasisForColumns` / `sidebarBasisForRows`, `@container/sidebar` para reordenar contenido al ensancharse. No fijar `w-72`/`w-80`.
PERT/CPM: AoN, ES/EF/LS/LF, holguras, ruta crítica; PERT con $t_e$ y $\sigma^2$ sobre la RC.
Usar `SolveButton`, `ClearButton`, `ValidationList`, `HintBanner`, `DimensionStepper`.

## Pruebas

Ampliar `scripts/verify-modulos.ts` y ejecutar `npm test`.
Cubrir: datos custom, dims, validación, draft tras error, preset modificado, dirty clear (lógica de touch), pasos = operaciones, 1-a-1, capacidades/conservación, multi-camino, costo total, capacidad insuficiente, no factible.

## Prohibido

Reconstruir módulos desde cero; ejemplos como única entrada; resultados simulados; commits/push no pedidos; afirmar pruebas no ejecutadas.
