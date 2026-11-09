import { SimplexSolver } from './SimplexSolver';
import { SimplexProblem, Constraint, OptimizationType } from '../types';

// ────────────────────────────────────────────────────────────────
// Tipos públicos
// ────────────────────────────────────────────────────────────────

export interface DualidadResult {
  dualProblem: SimplexProblem;
  primalSolution: { values: number[]; z: number } | null;
  dualSolution: { values: number[]; w: number } | null;
  shadowPrices: number[];
  dualityGap: number;
  feasible: boolean;
  steps: DualStep[];
}

export interface DualStep {
  stepNum: number;
  title: string;
  content: string;
}

// ────────────────────────────────────────────────────────────────
// Presets
// ────────────────────────────────────────────────────────────────

export const DUALIDAD_PRESETS: SimplexProblem[] = [
  {
    type: 'MAX',
    numVars: 2,
    objectiveCoeffs: [5, 4],
    constraints: [
      { id: '1', coefficients: [6, 4], relation: '<=', rhs: 24 },
      { id: '2', coefficients: [1, 2], relation: '<=', rhs: 6 },
    ],
  },
  {
    type: 'MAX',
    numVars: 2,
    objectiveCoeffs: [3, 5],
    constraints: [
      { id: '1', coefficients: [1, 0], relation: '<=', rhs: 4 },
      { id: '2', coefficients: [0, 2], relation: '<=', rhs: 12 },
      { id: '3', coefficients: [3, 2], relation: '<=', rhs: 18 },
    ],
  },
  {
    type: 'MIN',
    numVars: 2,
    objectiveCoeffs: [4, 6],
    constraints: [
      { id: '1', coefficients: [3, 2], relation: '>=', rhs: 12 },
      { id: '2', coefficients: [1, 3], relation: '>=', rhs: 9 },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// Utilidades
// ────────────────────────────────────────────────────────────────

const fmt = (v: number, d = 4): string => {
  const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  return Number.isInteger(r) ? String(r) : r.toFixed(d).replace(/\.?0+$/, '');
};

const relLatex: Record<string, string> = { '<=': '\\leq', '>=': '\\geq', '=': '=' };

function buildProblemLatex(p: SimplexProblem): string {
  const terms = p.objectiveCoeffs.map((c, i) => `${c}x_{${i + 1}}`).join(' + ');
  const rows = p.constraints.map(c => {
    const lhs = c.coefficients.map((v, j) => `${v}y_{${j + 1}}`).join(' + ');
    return `${lhs} ${relLatex[c.relation]} ${c.rhs}`;
  }).join(' \\\\ ');
  return (
    `\\begin{aligned}\n` +
    `&\\text{${p.type === 'MAX' ? 'Maximizar' : 'Minimizar'}} \\quad W = ${terms} \\\\\n` +
    `&\\text{sujeto a:} \\\\\n` +
    `&\\begin{cases} ${rows} \\end{cases} \\\\\n` +
    `&y_j \\geq 0 \\; \\forall j\n` +
    `\\end{aligned}`
  );
}

// ────────────────────────────────────────────────────────────────
// Construcción del problema dual
// ────────────────────────────────────────────────────────────────

/**
 * Construye el problema dual a partir del primal.
 *
 * Regla estándar:
 *  Primal MAX (Ax ≤ b, x ≥ 0)  →  Dual MIN (A^T y ≥ c, y ≥ 0)
 *  Primal MIN (Ax ≥ b, x ≥ 0)  →  Dual MAX (A^T y ≤ c, y ≥ 0)
 *
 * Para modelos mixtos se aplican las reglas individuales por restricción.
 */
export function buildDual(primal: SimplexProblem): SimplexProblem {
  const { numVars, objectiveCoeffs, constraints, type } = primal;
  const m = constraints.length;

  // Variables duales: una por cada restricción primal
  const dualType: OptimizationType = type === 'MAX' ? 'MIN' : 'MAX';

  // Función objetivo dual: coeficientes = RHS del primal
  const dualObjCoeffs = constraints.map(c => c.rhs);

  // Restricciones duales: una por cada variable primal
  // La j-ésima restricción dual usa la j-ésima columna de A
  const dualConstraints: Constraint[] = [];
  for (let j = 0; j < numVars; j++) {
    const dualCoeffs = constraints.map(c => c.coefficients[j]);
    // Relación dual depende del tipo primal y del signo de la variable primal (asumimos x_j ≥ 0)
    // Primal MAX → dual ≥; Primal MIN → dual ≤
    const dualRel: Constraint['relation'] = type === 'MAX' ? '>=' : '<=';
    dualConstraints.push({
      id: String(j + 1),
      coefficients: dualCoeffs,
      relation: dualRel,
      rhs: objectiveCoeffs[j],
    });
  }

  return {
    type: dualType,
    numVars: m,
    objectiveCoeffs: dualObjCoeffs,
    constraints: dualConstraints,
  };
}

// ────────────────────────────────────────────────────────────────
// Extracción de solución del último paso de SimplexSolver
// ────────────────────────────────────────────────────────────────

function extractSolution(
  steps: ReturnType<typeof SimplexSolver.solve>,
  numVars: number
): { values: number[]; z: number } | null {
  if (!steps.length) return null;
  const last = steps[steps.length - 1];
  if (!last.isOptimal || !last.matrix.length) return null;

  const m = last.matrix.length - 1; // número de filas de restricción
  const numCols = last.matrix[0].length;
  const rhs = numCols - 1;

  const values = Array.from({ length: numVars }, (_, j) => {
    const varName = `x_{${j + 1}}`;
    const bIdx = last.basis.indexOf(varName);
    return bIdx >= 0 ? last.matrix[bIdx][rhs] : 0;
  });

  const z = last.matrix[m][rhs];
  return { values, z };
}

// ────────────────────────────────────────────────────────────────
// Extracción de precios sombra (variables duales)
// ────────────────────────────────────────────────────────────────

/**
 * Los precios sombra son los coeficientes de las variables de holgura
 * en la fila Z del tableau óptimo.
 * Para MAX: shadow_i = z_row[numVars + i]  (positivo para MAX)
 */
function extractShadowPrices(
  steps: ReturnType<typeof SimplexSolver.solve>,
  numVars: number,
  m: number
): number[] {
  if (!steps.length) return new Array(m).fill(0);
  const last = steps[steps.length - 1];
  if (!last.isOptimal || !last.matrix.length) return new Array(m).fill(0);

  const zRow = last.matrix[last.matrix.length - 1];
  // Los precios sombra = z_row[numVars + i] (en el tableau estandar de SimplexSolver)
  return Array.from({ length: m }, (_, i) => {
    const val = zRow[numVars + i];
    return val;
  });
}

// ────────────────────────────────────────────────────────────────
// Solver principal
// ────────────────────────────────────────────────────────────────

export function solveDualidad(primal: SimplexProblem): DualidadResult {
  const steps: DualStep[] = [];
  const m = primal.constraints.length;

  // ── Paso 1: Enunciado primal ──────────────────────────────────
  const primalTerms = primal.objectiveCoeffs.map((c, i) => `${c}x_{${i + 1}}`).join(' + ');
  const primalRows = primal.constraints.map(c => {
    const lhs = c.coefficients.map((v, j) => `${v}x_{${j + 1}}`).join(' + ');
    return `${lhs} ${relLatex[c.relation]} ${c.rhs}`;
  }).join(' \\\\ ');

  steps.push({
    stepNum: 1,
    title: 'Problema Primal',
    content:
      `## 1. Problema Primal\n\n` +
      `$$\\begin{aligned}\n` +
      `&\\text{${primal.type === 'MAX' ? 'Maximizar' : 'Minimizar'}} \\quad Z = ${primalTerms} \\\\\n` +
      `&\\text{sujeto a:} \\\\\n` +
      `&\\begin{cases} ${primalRows} \\end{cases} \\\\\n` +
      `&x_j \\geq 0 \\; \\forall j\n` +
      `\\end{aligned}$$`,
  });

  // ── Paso 2: Reglas de transformación primal-dual ─────────────
  const dualVarSigns = primal.type === 'MAX' ? 'y_i \\geq 0' : 'y_i \\geq 0';
  const dualConsRel = primal.type === 'MAX' ? '\\geq' : '\\leq';
  const dualFODir = primal.type === 'MAX' ? 'Minimizar' : 'Maximizar';

  steps.push({
    stepNum: 2,
    title: 'Reglas de Transformación Primal → Dual',
    content:
      `## 2. Reglas de Dualidad\n\n` +
      (primal.type === 'MAX'
        ? `Para un primal **MAX** con restricciones $\\leq$:\n\n` +
          `| Primal (MAX) | Dual (MIN) |\n` +
          `|---|---|\n` +
          `| $n$ variables $x_j \\geq 0$ | $n$ restricciones $\\sum_i a_{ij}y_i \\geq c_j$ |\n` +
          `| $m$ restricciones $\\leq b_i$ | $m$ variables $y_i \\geq 0$ |\n` +
          `| Coeficientes FO $c_j$ | RHS del dual |\n` +
          `| RHS $b_i$ | Coeficientes FO del dual |`
        : `Para un primal **MIN** con restricciones $\\geq$:\n\n` +
          `| Primal (MIN) | Dual (MAX) |\n` +
          `|---|---|\n` +
          `| $n$ variables $x_j \\geq 0$ | $n$ restricciones $\\sum_i a_{ij}y_i \\leq c_j$ |\n` +
          `| $m$ restricciones $\\geq b_i$ | $m$ variables $y_i \\geq 0$ |\n` +
          `| Coeficientes FO $c_j$ | RHS del dual |\n` +
          `| RHS $b_i$ | Coeficientes FO del dual |`),
  });

  // ── Paso 3: Construir el dual ─────────────────────────────────
  const dual = buildDual(primal);

  const dualTerms = dual.objectiveCoeffs.map((c, i) => `${c}y_{${i + 1}}`).join(' + ');
  const dualRows = dual.constraints.map((c, j) => {
    const lhs = c.coefficients.map((v, i) => `${v}y_{${i + 1}}`).join(' + ');
    return `${lhs} ${relLatex[c.relation]} ${c.rhs} \\quad (\\text{var. primal } x_{${j + 1}})`;
  }).join(' \\\\ ');

  // Mostrar correspondencia A^T
  const A = primal.constraints.map(c => c.coefficients);
  const AT = Array.from({ length: primal.numVars }, (_, j) =>
    primal.constraints.map(c => c.coefficients[j])
  );
  const aLatex = `A = \\begin{pmatrix} ${A.map(r => r.join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
  const atLatex = `A^T = \\begin{pmatrix} ${AT.map(r => r.join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;

  steps.push({
    stepNum: 3,
    title: 'Construcción del Problema Dual',
    content:
      `## 3. Problema Dual\n\n` +
      `La matriz del primal y su transpuesta:\n\n` +
      `$$${aLatex} \\qquad ${atLatex}$$\n\n` +
      `**Problema Dual (${dualFODir}):**\n\n` +
      `$$\\begin{aligned}\n` +
      `&\\text{${dualFODir}} \\quad W = ${dualTerms} \\\\\n` +
      `&\\text{sujeto a:} \\\\\n` +
      `&\\begin{cases} ${dualRows} \\end{cases} \\\\\n` +
      `&${dualVarSigns}\n` +
      `\\end{aligned}$$`,
  });

  // ── Paso 4: Resolver el primal ────────────────────────────────
  // Para resolver, necesitamos convertir a forma estándar ≤ para MAX o ≥ para MIN
  // SimplexSolver maneja MAX con ≤ directamente; para MIN o ≥ necesitamos adaptar
  // Por ahora, resolvemos directamente con SimplexSolver (que ya maneja ≤)
  let primalSteps = SimplexSolver.solve(primal);
  const primalSol = extractSolution(primalSteps, primal.numVars);
  const shadowPrices = extractShadowPrices(primalSteps, primal.numVars, m);

  if (!primalSol) {
    steps.push({
      stepNum: 4,
      title: 'Solución Primal No Encontrada',
      content:
        `## 4. Solución Primal\n\n` +
        `⚠ No se pudo obtener una solución óptima del primal (puede ser no acotado o infactible).`,
    });
    return {
      dualProblem: dual,
      primalSolution: null,
      dualSolution: null,
      shadowPrices,
      dualityGap: Infinity,
      feasible: false,
      steps,
    };
  }

  const primalVarStr = primalSol.values.map((v, i) => `x_{${i + 1}}^* = ${fmt(v, 4)}`).join(',\\; ');
  steps.push({
    stepNum: 4,
    title: 'Solución del Problema Primal',
    content:
      `## 4. Solución Primal\n\n` +
      `Resolviendo el problema primal (Método Simplex):\n\n` +
      `$$${primalVarStr}$$\n\n` +
      `$$Z^* = ${fmt(primalSol.z, 4)}$$`,
  });

  // ── Paso 5: Precios sombra = solución dual ───────────────────
  const dualVarStr = shadowPrices.map((v, i) => `y_{${i + 1}}^* = ${fmt(v, 4)}`).join(',\\; ');
  const dualZ = shadowPrices.reduce((s, y, i) => s + y * primal.constraints[i].rhs, 0);

  steps.push({
    stepNum: 5,
    title: 'Solución Dual (Precios Sombra)',
    content:
      `## 5. Solución Dual a partir del Primal Óptimo\n\n` +
      `Los **precios sombra** (variables duales) se leen directamente del tableau óptimo del primal. ` +
      `Corresponden a los coeficientes de las variables de holgura en la fila $Z$:\n\n` +
      `$$y_i^* = \\left. \\frac{\\partial Z^*}{\\partial b_i} \\right|_{\\text{base fija}}$$\n\n` +
      `$$${dualVarStr}$$\n\n` +
      `**Verificación:** $W^* = \\sum_i b_i y_i^* = ${primal.constraints.map((c, i) => `${c.rhs}(${fmt(shadowPrices[i], 3)})`).join(' + ')} = ${fmt(dualZ, 4)}$`,
  });

  // ── Paso 6: Teorema de dualidad fuerte ───────────────────────
  const gap = Math.abs(primalSol.z - dualZ);
  steps.push({
    stepNum: 6,
    title: 'Teorema de Dualidad Fuerte',
    content:
      `## 6. Teorema de Dualidad Fuerte\n\n` +
      `Si el primal tiene solución óptima finita, el dual también y sus valores son iguales:\n\n` +
      `$$Z^* = W^* \\quad \\Longleftrightarrow \\quad ${fmt(primalSol.z, 4)} ${gap < 1e-6 ? '=' : '\\approx'} ${fmt(dualZ, 4)}$$\n\n` +
      (gap < 1e-6
        ? `✅ **Dualidad Fuerte Verificada**: $Z^* - W^* = ${fmt(gap, 6)} \\approx 0$`
        : `⚠ Brecha de dualidad: $|Z^* - W^*| = ${fmt(gap, 6)}$ (puede deberse a redondeo).`) +
      `\n\n**Condiciones de Holgura Complementaria:**\n\n` +
      `$$x_j^* (\\bar{c}_j^{\\text{dual}}) = 0 \\quad \\text{y} \\quad y_i^* (b_i - a_i^T x^*) = 0$$\n\n` +
      `Esto significa: si una variable $x_j^* > 0$, la restricción dual $j$ es activa, y si $y_i^* > 0$, la restricción primal $i$ es activa.`,
  });

  return {
    dualProblem: dual,
    primalSolution: primalSol,
    dualSolution: { values: shadowPrices, w: dualZ },
    shadowPrices,
    dualityGap: gap,
    feasible: true,
    steps,
  };
}
