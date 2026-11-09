import { GeometrySolver } from './GeometrySolver';
import { OptimizationType } from '../types';

// ────────────────────────────────────────────────────────────────
// Tipos públicos
// ────────────────────────────────────────────────────────────────

export interface GraficoConstraint {
  id: string;
  a1: number;
  a2: number;
  rel: '<=' | '>=' | '=';
  rhs: number;
}

export interface GraficoInput {
  type: OptimizationType;
  c1: number;
  c2: number;
  constraints: GraficoConstraint[];
}

export interface GraficoVertex {
  x: number;
  y: number;
  z: number;
  label: string;
  isOptimal: boolean;
}

export interface GraficoStep {
  stepNum: number;
  title: string;
  /** Texto mixto con LaTeX (soportado por TextWithMath) */
  content: string;
}

export interface GraficoResult {
  vertices: GraficoVertex[];
  optimal: GraficoVertex | null;
  steps: GraficoStep[];
  infeasible: boolean;
}

// ────────────────────────────────────────────────────────────────
// Presets
// ────────────────────────────────────────────────────────────────

export const GRAFICO_PRESETS: GraficoInput[] = [
  {
    type: 'MAX',
    c1: 3,
    c2: 5,
    constraints: [
      { id: '1', a1: 1, a2: 0, rel: '<=', rhs: 4 },
      { id: '2', a1: 0, a2: 2, rel: '<=', rhs: 12 },
      { id: '3', a1: 3, a2: 2, rel: '<=', rhs: 18 },
    ],
  },
  {
    type: 'MAX',
    c1: 2,
    c2: 3,
    constraints: [
      { id: '1', a1: 1, a2: 1, rel: '<=', rhs: 4 },
      { id: '2', a1: 1, a2: 2, rel: '<=', rhs: 6 },
    ],
  },
  {
    type: 'MIN',
    c1: 2,
    c2: 3,
    constraints: [
      { id: '1', a1: 1, a2: 1, rel: '>=', rhs: 4 },
      { id: '2', a1: 2, a2: 1, rel: '>=', rhs: 6 },
    ],
  },
];

export function blankGrafico(): GraficoInput {
  return {
    type: 'MAX',
    c1: 1,
    c2: 1,
    constraints: [
      { id: '1', a1: 1, a2: 0, rel: '<=', rhs: 10 },
      { id: '2', a1: 0, a2: 1, rel: '<=', rhs: 10 },
    ],
  };
}

// ────────────────────────────────────────────────────────────────
// Validación
// ────────────────────────────────────────────────────────────────

const EPSILON = 1e-9;

export function validateGraficoInput(input: GraficoInput): string[] {
  const errors: string[] = [];
  if (input.constraints.length < 1)
    errors.push('Se requiere al menos una restricción.');
  if (Math.abs(input.c1) < EPSILON && Math.abs(input.c2) < EPSILON)
    errors.push('La función objetivo no puede tener todos sus coeficientes en cero.');
  for (const c of input.constraints) {
    if (Math.abs(c.a1) < EPSILON && Math.abs(c.a2) < EPSILON)
      errors.push(`Restricción ${c.id}: los coeficientes no pueden ser todos cero.`);
  }
  return errors;
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function fmt(v: number, d = 4): string {
  const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  return Number.isInteger(r) ? String(r) : r.toFixed(d).replace(/\.?0+$/, '');
}

const relLatex: Record<string, string> = { '<=': '\\leq', '>=': '\\geq', '=': '=' };

// ────────────────────────────────────────────────────────────────
// Solver principal
// ────────────────────────────────────────────────────────────────

export function solveGrafico(input: GraficoInput): GraficoResult {
  const steps: GraficoStep[] = [];

  // Adaptar al formato que entiende GeometrySolver
  const problem = {
    type: input.type,
    numVars: 2,
    objectiveCoeffs: [input.c1, input.c2],
    constraints: input.constraints.map(c => ({
      id: c.id,
      coefficients: [c.a1, c.a2],
      relation: c.rel as '<=' | '>=' | '=',
      rhs: c.rhs,
    })),
  };

  // ── Paso 1: Enunciado ────────────────────────────────────────
  const constraintLines = input.constraints.map(
    c => `${c.a1}x_1 + ${c.a2}x_2 ${relLatex[c.rel]} ${c.rhs}`
  ).join(' \\\\ ');

  steps.push({
    stepNum: 1,
    title: 'Formulación del Problema',
    content:
      `## 1. Enunciado del Problema\n\n` +
      `$$\\begin{aligned}\n` +
      `&\\text{${input.type === 'MAX' ? 'Maximizar' : 'Minimizar'}} \\quad Z = ${input.c1}x_1 + ${input.c2}x_2 \\\\\n` +
      `&\\text{sujeto a:} \\\\\n` +
      `&\\begin{cases} ${constraintLines} \\end{cases} \\\\\n` +
      `&x_1,\\; x_2 \\geq 0\n\\end{aligned}$$`,
  });

  // ── Paso 2: Trazar restricciones ─────────────────────────────
  const interceptsDesc = input.constraints.map((c, i) => {
    if (Math.abs(c.a1) < EPSILON && Math.abs(c.a2) > EPSILON) {
      return `- **R${i + 1}:** recta horizontal $x_2 = ${fmt(c.rhs / c.a2)}$`;
    } else if (Math.abs(c.a2) < EPSILON && Math.abs(c.a1) > EPSILON) {
      return `- **R${i + 1}:** recta vertical $x_1 = ${fmt(c.rhs / c.a1)}$`;
    } else {
      const x1int = Math.abs(c.a1) > EPSILON ? fmt(c.rhs / c.a1) : '\\infty';
      const x2int = Math.abs(c.a2) > EPSILON ? fmt(c.rhs / c.a2) : '\\infty';
      return `- **R${i + 1}:** interceptos con ejes: $(${x1int},\\; 0)$ y $(0,\\; ${x2int})$`;
    }
  }).join('\n');

  steps.push({
    stepNum: 2,
    title: 'Trazar las Restricciones',
    content:
      `## 2. Graficar las Restricciones\n\n` +
      `Se iguala cada restricción para obtener la recta frontera:\n\n` +
      `${interceptsDesc}\n\n` +
      `La **región factible** es la intersección de todos los semiplanos (incluyendo $x_1 \\geq 0$, $x_2 \\geq 0$).`,
  });

  // ── Paso 3: Vértices ─────────────────────────────────────────
  const rawVertices = GeometrySolver.getFeasibleVertices2D(problem);

  if (rawVertices.length === 0) {
    steps.push({
      stepNum: 3,
      title: 'Región Factible Vacía',
      content:
        `## 3. Región Factible\n\n` +
        `⚠ No existe región factible. Las restricciones son incompatibles o la región está vacía para $x_1, x_2 \\geq 0$.`,
    });
    return { vertices: [], optimal: null, steps, infeasible: true };
  }

  // Evaluar Z en cada vértice
  const vertices: GraficoVertex[] = rawVertices.map((v, i) => ({
    x: v.x,
    y: v.y,
    z: input.c1 * v.x + input.c2 * v.y,
    label: `V${i + 1}`,
    isOptimal: false,
  }));

  const vertexTableRows = vertices.map(
    (v, i) =>
      `V_{${i + 1}}\\left(${fmt(v.x, 3)},\\; ${fmt(v.y, 3)}\\right) & ` +
      `${input.c1}(${fmt(v.x, 3)}) + ${input.c2}(${fmt(v.y, 3)}) & ${fmt(v.z, 4)}`
  ).join(' \\\\ ');

  steps.push({
    stepNum: 3,
    title: 'Evaluar Z en los Vértices',
    content:
      `## 3. Evaluar la Función Objetivo en los Vértices\n\n` +
      `Por el **Teorema Fundamental de la PL**, si existe solución óptima, ocurre en un vértice de la región factible.\n\n` +
      `$$\\begin{array}{c|l|c}\\text{Vértice} & Z = ${input.c1}x_1 + ${input.c2}x_2 & Z \\\\ \\hline ${vertexTableRows}\\end{array}$$`,
  });

  // ── Paso 4: Óptimo ───────────────────────────────────────────
  const optimal =
    input.type === 'MAX'
      ? vertices.reduce((b, v) => (v.z > b.z ? v : b), vertices[0])
      : vertices.reduce((b, v) => (v.z < b.z ? v : b), vertices[0]);

  const markedVertices = vertices.map(v => ({
    ...v,
    isOptimal: Math.abs(v.x - optimal.x) < 1e-6 && Math.abs(v.y - optimal.y) < 1e-6,
  }));

  steps.push({
    stepNum: 4,
    title: 'Solución Óptima',
    content:
      `## 4. Solución Óptima\n\n` +
      `Se elige el vértice que **${input.type === 'MAX' ? 'maximiza' : 'minimiza'}** $Z$:\n\n` +
      `$$x_1^* = ${fmt(optimal.x, 4)}, \\quad x_2^* = ${fmt(optimal.y, 4)}$$\n\n` +
      `$$\\boxed{Z^* = ${fmt(optimal.z, 4)}}$$\n\n` +
      `La dirección de la función objetivo $Z = ${input.c1}x_1 + ${input.c2}x_2$ (vector $\\mathbf{c} = (${input.c1},\\; ${input.c2})^T$) ` +
      `se desplaza en el sentido de ${input.type === 'MAX' ? 'crecimiento' : 'decrecimiento'} hasta tocar el último vértice de la región factible.`,
  });

  return { vertices: markedVertices, optimal, steps, infeasible: false };
}
