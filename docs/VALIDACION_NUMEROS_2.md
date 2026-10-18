# Validación con Numeros_2.pdf

**Documento:** `C:\Users\erick\Downloads\Numeros_2.pdf` (FESC · Investigación de Operaciones)  
**Extracción:** texto con `pdftotext` (42 páginas / form-feeds). No se usaron páginas solo-imagen ilegibles; las tablas se reconstruyeron a partir del texto y se contrastaron con enumeración / identidades de flujo.

## Páginas leídas (temas relevantes)

| Páginas | Contenido |
| --- | --- |
| 1–6 | Portada, índice, presentación |
| 7–10 | Cap. 1 Asignación (teoría) |
| 11–18 | Cap. 2 Kuhn–Munkres + Ej. 2.1–2.3 |
| 19–24 | Cap. 3 Casos particulares + Ej. 3.1–3.3 |
| 25–31 | Cap. 4 Flujo máximo + Ej. 4.1–4.3 |
| 32–38 | Cap. 5 Flujo a costo mínimo + Ej. 5.1–5.3 |
| 39–42 | Conclusiones y bibliografía |

PERT/CPM y transporte clásico no aparecen como capítulos de este PDF (el transporte se modela solo como flujo a costo mínimo en Ej. 5.2).

## Matriz de verificación

| Tema | Ej. PDF | Datos (resumen) | Resultado PDF | Algoritmo | Verif. indep. | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| Húngaro | 2.1 p.8–9 | 3×3 min `[[12,8,15],[10,9,12],[14,11,13]]` | Z=31; A1→T2,A2→T1,A3→T3 | 31; misma asignación | Fuerza bruta 6 perm. = 31 | **Correcto** |
| Húngaro | 2.2 p.9–11 | 4×4 min (82…23) | Z=140; 1→3,2→2,3→1,4→4 | 140 | Brute force = 140 | **Correcto** |
| Húngaro | 2.3 p.11–12 | Tiempos 4×4 | Z=15 h | 15 | Brute force = 15 | **Correcto** |
| Asignación | 3.1 p.15–16 | Max utilidades 3×3 | Z=28 | 28 | Brute force max = 28 | **Correcto** |
| Asignación | 3.2 p.15–17 | 3×4 min | Z=27; T3 libre | 27 | Enumeración PDF (libre T3=27) | **Correcto** |
| Asignación | 3.3 p.17–18 | Prohibidas M | Z=26 (2 óptimos) | 26 (con M=9999) | Permutaciones factibles | **Correcto** |
| Flujo máx. | 4.1 p.22–23 | Red s,A,B,t | v=17; caminos +7,+8,+2 | 17; mismos cuellos | Corte = 17 | **Correcto** |
| Flujo máx. | 4.2 p.23–24 | Red 6 nodos | v=23 | 23 | Corte S={s,1,2,4} cap=23 | **Correcto** |
| Flujo máx. | 4.3 p.24–25 | Multi F/D | v=20 | 20 (∞→10⁶) | Corte a clientes = 20 | **Correcto** |
| Costo mín. | 5.1 p.28–29 | 1→4, demanda 4 | costo 18 | 18 | Σ f·c = 18 | **Correcto** |
| Costo mín. | 5.2 p.29–30 | Transporte 50 ud. | costo 465 | 465 | Dual PDF = 465 | **Correcto** |
| Costo mín. | 5.3 p.30–32 | Oferta 7 | costo 37 | 37 | Balances + Σ f·c = 37 | **Correcto** |

### Diferencias de procedimiento (válidas, no errores)

- El PDF describe a veces la selección de ceros “a mano” (encuadrar/tachar); el código usa matching bipartito + cobertura de König. **Mismo óptimo**; la traza educativa refleja las operaciones reales del solver.
- Capacidades infinitas del PDF se modelan con cotas grandes (10⁶ / 1000). No alteran los óptimos de los ejercicios citados.
- Ej. 3.3: `M` tipográfico → `9999` en el preset.

### Errores matemáticos en el código

Ninguno detectado en estos doce ejercicios.

### Inconsistencias en el documento

- Extracción OCR/layout de matrices 4×4 a veces desordenada en texto plano; se reconstruyeron con las reducciones de filas del propio PDF y se validaron por fuerza bruta.
- No se halló un resultado numérico incorrecto en los ejercicios resueltos contrastados.

## Ejemplos incorporados a las calculadoras

| Calculadora | Presets nuevos / actualizados |
| --- | --- |
| Asignación | `pdf-3.1-max`, `pdf-3.2-rect`, `pdf-3.3-prohib` |
| Kuhn–Munkres | `pdf-2.1`, `pdf-2.2`, `pdf-2.3` |
| Flujo máximo | `pdf-4.1`, `mf-classic` (=4.2), `pdf-4.3` |
| Costo mínimo | `pdf-5.1`, `pdf-5.2`, `pdf-5.3` |

Los presets existentes útiles se conservaron. Todos son editables; al cambiar datos se limpia la solución y se recalcula.

## Pruebas ejecutadas

```bash
npm test
```

Incluye presets PDF + brute force donde aplica + suma de aumentos = flujo + identidad de costo + tweak de una celda.

## Archivos modificados

- `src/core/AsignacionSolver.ts`
- `src/core/FlujoMaximoSolver.ts`
- `src/core/FlujoCostoMinSolver.ts`
- `src/components/asignacion/AssignmentWorkbench.tsx`
- `src/pages/FlujoMaximoPage.tsx`, `FlujoCostoMinPage.tsx`
- `scripts/verify-modulos.ts`
- `docs/VALIDACION_NUMEROS_2.md` (este informe)

## No verificado / fuera de alcance del PDF

- Capítulos de teoría sin ejercicio numérico completo.
- PERT/CPM (no está en Numeros_2.pdf).
- Figuras dibujadas solo como ASCII parcial (capacidades se tomaron del texto enumerado).
