# Microcurrículo — Investigación de Operaciones (FESC)

Fuente: Microcurrículo oficial de la asignatura (Programa Ingeniería de Software, Semestre VIII).

## Competencia de la asignatura

Resolver problemas de Investigación de Operaciones mediante la identificación y análisis del problema, recopilación de datos e identificación de factores que lo afecten.

## Objetivo general

Orientar al estudiante en la utilización de la Investigación de Operaciones en diferentes áreas del conocimiento para formular y resolver modelos lineales de optimización.

## Conocimientos previos

Métodos Numéricos. Articulación con: Ecuaciones diferenciales, Estadística y probabilidad, Diseño móvil, Gestión de proyectos de software.

## Unidad 1 — Programación Lineal

**Competencia específica:** Proponer modelos lineales de optimización utilizando la Investigación de Operaciones en diferentes áreas del conocimiento.

**Contenido temático:** Introducción, Definiciones, Resumen Histórico. Análisis de los componentes de un problema de IO. Formulación de los diferentes Modelos. Métodos Gráficos. Método Simplex. Dualidad. Análisis de Sensibilidad. Método Simplex Revisado. Herramientas Computacionales: Solver, WinQSB, LINDO, TORA.

## Unidad 2 — Redes

**Competencia específica:** Diseñar proyectos de modo óptimo a partir de técnicas de optimización a diferentes modelos de redes de flujo y de actividades.

**Contenido temático:** Problema del Transporte. Algoritmo de Solución, Casos particulares. Problema de Asignación. Herramientas Computacionales. Conceptos Generales. Flujo Máximo. Flujo a Costo Mínimo. Árbol de Mínimo recorrido. Redes de Actividad CPM. Redes de Actividad PERT. Análisis de Sensibilidad y Costos en una red PERT.

## Unidad 3 — Otros Modelos

**Competencia específica:** Inferir otros tipos de problemas de optimización diferentes al modelo lineal clásico según los principios de probabilidades.

**Contenido temático:** Programación Dinámica. Programación entera y heurística. Programación no lineal. Herramientas Computacionales: Solver, QSB, LINDO. Teoría de Colas.

## Matriz de módulos «Pronto» (estado inicial del análisis)

| Módulo | Ruta | Unidad | Contenido microcurrículo | Referencias en código | Estado inicial |
| --- | --- | --- | --- | --- | --- |
| Formulación de Modelos | `/unidad1/formulacion` | 1 | Formulación de los diferentes Modelos | `SimplexPage`, tipos PL | Pronto |
| Método Gráfico | `/unidad1/grafico` | 1 | Métodos Gráficos | `GeometrySolver`, `SimplexGraph` | Pronto |
| Dualidad | `/unidad1/dualidad` | 1 | Dualidad | `SimplexSolver` | Pronto |
| Análisis de Sensibilidad | `/unidad1/sensibilidad` | 1 | Análisis de Sensibilidad | `SimplexSolver` | Pronto |
| Simplex Revisado | `/unidad1/simplex-revisado` | 1 | Método Simplex Revisado | Ya dentro de `SimplexPage` + `SimplexRevisadoSolver` | Pronto (parcial) |
| Árbol de Mínimo Recorrido | `/unidad2/arbol` | 2 | Árbol de Mínimo recorrido | `NetworkBoard`, flujos | Pronto |
| Programación Dinámica | `/unidad3/dinamica` | 3 | Programación Dinámica | `ModuleShell` | Pronto |
| Programación Entera | `/unidad3/entera` | 3 | Programación entera y heurística | `SimplexSolver` | Pronto |
| Programación No Lineal | `/unidad3/no-lineal` | 3 | Programación no lineal | `ModuleShell` | Pronto |
| Teoría de Colas | `/unidad3/colas` | 3 | Teoría de Colas | `ModuleShell` | Pronto |
