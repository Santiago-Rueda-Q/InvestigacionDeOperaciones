# Módulo Unidad 2 — Asignación y flujos

## Cómo ejecutar

```bash
npm install
npm run dev
```

Abrir la URL de Vite (normalmente `http://localhost:5173/`).

Pruebas automatizadas de los cuatro algoritmos:

```bash
npm test
```

Build de producción:

```bash
npm run build
```

## Rutas

| Sección | Ruta |
| --- | --- |
| Problema de asignación | `/unidad2/asignacion` |
| Kuhn–Munkres (húngaro) | `/unidad2/hungaro` |
| Flujo máximo | `/unidad2/flujo` |
| Flujo a costo mínimo | `/unidad2/costo-min` |

## Arquitectura

- `src/core/AsignacionSolver.ts` — algoritmo húngaro (compartido por Asignación y Kuhn–Munkres).
- `src/core/FlujoMaximoSolver.ts` — Edmonds–Karp (Ford–Fulkerson + BFS), corte mínimo.
- `src/core/FlujoCostoMinSolver.ts` — caminos aumentantes de costo mínimo + Bellman–Ford residual.
- `src/components/asignacion/AssignmentWorkbench.tsx` — UI compartida de matrices.
- `src/components/io/*` — shell, matriz editable, tablero SVG de red.
- `src/pages/*` — páginas de cada tema.
- `scripts/verify-modulos.ts` — comprobaciones ejecutadas con `npm test`.

La lógica matemática no vive en componentes React: cada solver recibe datos, valida y devuelve resultado + pasos.

## Funcionamiento matemático (breve)

### Asignación / Kuhn–Munkres

1. Balancear a matriz cuadrada con filas/columnas ficticias de costo 0.
2. Si el objetivo es maximizar: $c'_{ij} = M - c_{ij}$.
3. Restar mínimos de filas y de columnas.
4. Cubrir ceros (matching bipartito + König). Si hay $n$ ceros independientes, asignar.
5. Si no, ajustar con $\theta$ y repetir.
6. $Z$ se calcula sobre la matriz **original** (ignorando ficticias).

### Flujo máximo

Edmonds–Karp: mientras exista camino $s$–$t$ en la red residual (BFS), aumentar el flujo por el cuello de botella. El valor del flujo máximo coincide con la capacidad del corte mínimo (nodos alcanzables desde $s$ en el residual).

### Flujo a costo mínimo

Repetir: camino de menor costo en la red residual (Bellman–Ford) y aumentar hasta completar la demanda o agotar capacidad. Costo total $=\sum c_{ij}f_{ij}$. Si no se alcanza la demanda, se marca la solución como **incompleta**.

**Limitación:** no se admiten ciclos de costo negativo con capacidad positiva en la red original.

## Doce ejercicios de demostración

Tres por tema, cargables desde la interfaz. Resultados verificados con `npm test` (fuerza bruta en asignaciones cuadradas pequeñas; identidades de flujo/corte/costo).

## Archivos principales creados o modificados

**Creados:** solvers, páginas, componentes `io`/`asignacion`, `scripts/verify-modulos.ts`, este documento.

**Modificados:** `App.tsx`, `Dashboard.tsx`, `package.json`.
