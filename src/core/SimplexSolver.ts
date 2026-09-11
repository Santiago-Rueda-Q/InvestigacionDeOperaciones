import { SimplexProblem, SimplexStep } from '../types';

// ────────────────────────────────────────────────────────────────
// Helpers matemáticos reutilizables (DRY)
// ────────────────────────────────────────────────────────────────

const clone = (m: number[][]): number[][] => m.map(r => [...r]);
const fmt = (v: number, d = 4): string => {
  const r = Math.round(v * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(d).replace(/\.?0+$/, '');
};

function buildObjectiveLatex(coeffs: number[], numVars: number, type: string): string {
  const terms = coeffs.map((c, i) => `${c}x_{${i + 1}}`).join(' + ');
  return `\\text{${type === 'MAX' ? 'Maximizar' : 'Minimizar'}} \\quad Z = ${terms}`;
}

function buildConstraintsLatex(constraints: SimplexProblem['constraints'], numVars: number): string {
  return constraints.map((c, i) => {
    const lhs = c.coefficients.map((v, j) => `${v}x_{${j + 1}}`).join(' + ');
    const rel = c.relation === '<=' ? '\\leq' : c.relation === '>=' ? '\\geq' : '=';
    return `${lhs} ${rel} ${c.rhs}`;
  }).join(' \\\\ ');
}

// ────────────────────────────────────────────────────────────────
// SIMPLEX ESTÁNDAR
// ────────────────────────────────────────────────────────────────

export class SimplexSolver {
  public static solve(problem: SimplexProblem): SimplexStep[] {
    const steps: SimplexStep[] = [];
    const { numVars, objectiveCoeffs, constraints, type } = problem;
    const m = constraints.length; // número de restricciones
    const numCols = numVars + m + 2; // xj + Si + Z + RHS

    // ── Paso PRE-0: Enunciado del problema ──────────────────────
    steps.push({
      iteration: -3,
      matrix: [],
      headers: [],
      basis: [],
      isOptimal: false,
      phase: 'formulation',
      explanationLatex:
        `## 1. Enunciado del Problema\n\n` +
        `$$\n\\begin{aligned}\n` +
        `&${buildObjectiveLatex(objectiveCoeffs, numVars, type)} \\\\\n` +
        `&\\text{Sujeto a:} \\\\\n` +
        `&\\begin{cases} ${buildConstraintsLatex(constraints, numVars)} \\end{cases} \\\\\n` +
        `&x_j \\geq 0 \\quad \\forall j\n` +
        `\\end{aligned}\n$$`,
    });

    // ── Paso PRE-1: Forma estándar ───────────────────────────────
    const slackRows = constraints.map((c, i) => {
      const slackTerms = Array.from({ length: m }, (_, k) => (k === i ? `+S_{${k + 1}}` : '')).filter(Boolean).join('');
      const lhs = c.coefficients.map((v, j) => `${v}x_{${j + 1}}`).join(' + ');
      return `${lhs} ${slackTerms} = ${c.rhs}`;
    });

    steps.push({
      iteration: -2,
      matrix: [],
      headers: [],
      basis: [],
      isOptimal: false,
      phase: 'standard_form',
      explanationLatex:
        `## 2. Forma Estándar\n` +
        `Se agrega una variable de holgura $S_i \\geq 0$ a cada restricción $\\leq$, convirtiéndolas en igualdades:\n\n` +
        `$$\n\\begin{cases} ${slackRows.join(' \\\\ ')} \\end{cases}\n$$\n\n` +
        `Función objetivo en forma de fila $Z$:\n\n` +
        `$$\nZ - ${objectiveCoeffs.map((c, i) => `${c}x_{${i + 1}}`).join(' - ')} = 0\n$$`,
    });

    // ── Paso PRE-2: BFS inicial ──────────────────────────────────
    const bfsValues = constraints.map((c, i) => `S_{${i + 1}} = ${c.rhs}`).join(', \\quad ');
    const xZeros = Array.from({ length: numVars }, (_, i) => `x_{${i + 1}} = 0`).join(', \\quad ');
    const zInitial = type === 'MAX' ? 0 : 0;

    steps.push({
      iteration: -1,
      matrix: [],
      headers: [],
      basis: [],
      isOptimal: false,
      phase: 'initial_bfs',
      explanationLatex:
        `## 3. Solución Básica Factible Inicial (BFS)\n` +
        `Las variables no básicas se fijan en cero: $${xZeros}$.\n\n` +
        `Las variables básicas iniciales son las holguras:\n\n` +
        `$$\n${bfsValues}\n$$\n\n` +
        `Valor inicial de la función objetivo: $Z = ${zInitial}$.\n\n` +
        `Se construye el **tableau inicial** con base en $\\mathcal{B} = \\{${Array.from({ length: m }, (_, i) => `S_{${i + 1}}`).join(', ')}\\}$.`,
    });

    // ── Construir Tableau ────────────────────────────────────────
    const headers = [
      ...Array.from({ length: numVars }, (_, i) => `x_{${i + 1}}`),
      ...Array.from({ length: m }, (_, i) => `S_{${i + 1}}`),
      'Z', 'RHS',
    ];
    const basis = [...Array.from({ length: m }, (_, i) => `S_{${i + 1}}`), 'Z'];

    const matrix: number[][] = [];
    constraints.forEach((c, i) => {
      const row = new Array(numCols).fill(0);
      c.coefficients.forEach((v, j) => { row[j] = v; });
      row[numVars + i] = 1;
      row[numCols - 1] = c.rhs;
      matrix.push(row);
    });

    const zRow = new Array(numCols).fill(0);
    objectiveCoeffs.forEach((c, j) => { zRow[j] = type === 'MAX' ? -c : c; });
    zRow[numCols - 2] = 1;
    matrix.push(zRow);

    // ── Paso 0: Tableau inicial ──────────────────────────────────
    steps.push({
      iteration: 0,
      matrix: clone(matrix),
      headers,
      basis: [...basis],
      isOptimal: false,
      phase: 'tableau',
      explanationLatex:
        `## Tableau Inicial\n` +
        `Base actual: $\\mathcal{B} = \\{${basis.slice(0, m).join(', ')}\\}$.\n\n` +
        `Identificamos los coeficientes negativos en la fila $Z$ para determinar la variable que entra.`,
    });

    // ── Iteraciones del Simplex ──────────────────────────────────
    let cur = clone(matrix);
    let iterBasis = [...basis];
    let iter = 1;

    while (iter <= 30) {
      const zRowCur = cur[cur.length - 1];

      // Columna pivote: más negativo
      let enteringCol = -1, minVal = -1e-9;
      for (let j = 0; j < numCols - 2; j++) {
        if (zRowCur[j] < minVal) { minVal = zRowCur[j]; enteringCol = j; }
      }

      if (enteringCol === -1) {
        // Óptimo
        steps[steps.length - 1].isOptimal = true;
        const objVal = cur[m][numCols - 1];
        const varValues = Array.from({ length: numVars }, (_, j) => {
          const bIdx = iterBasis.indexOf(`x_{${j + 1}}`);
          return `x_{${j + 1}} = ${bIdx >= 0 ? fmt(cur[bIdx][numCols - 1]) : 0}`;
        }).join(', \\quad ');
        steps[steps.length - 1].explanationLatex +=
          `\n\n## Solución Óptima\n` +
          `Todos los coeficientes de la fila $Z$ son $\\geq 0$.\n\n` +
          `$$ ${varValues} $$\n\n` +
          `$$ Z^* = ${fmt(objVal)} $$`;
        break;
      }

      // Fila pivote: razón mínima positiva
      let leavingRow = -1, minRatio = Infinity;
      for (let i = 0; i < m; i++) {
        const coef = cur[i][enteringCol];
        if (coef > 1e-9) {
          const ratio = cur[i][numCols - 1] / coef;
          if (ratio < minRatio) { minRatio = ratio; leavingRow = i; }
        }
      }

      if (leavingRow === -1) {
        steps.push({
          iteration: iter,
          matrix: clone(cur),
          headers,
          basis: [...iterBasis],
          isOptimal: false,
          isUnbounded: true,
          phase: 'tableau',
          explanationLatex:
            `## Problema No Acotado\n` +
            `Todos los coeficientes de la columna pivote ($${headers[enteringCol]}$) son $\\leq 0$.\n\n` +
            `La función objetivo puede crecer indefinidamente.`,
        });
        break;
      }

      const pivot = cur[leavingRow][enteringCol];
      const varEntra = headers[enteringCol];
      const varSale = iterBasis[leavingRow];

      steps[steps.length - 1].enteringCol = enteringCol;
      steps[steps.length - 1].leavingRow  = leavingRow;
      steps[steps.length - 1].pivotElement = pivot;

      const ratioRows = Array.from({ length: m }, (_, i) => {
        const c = cur[i][enteringCol];
        if (c <= 1e-9) return `\\frac{${fmt(cur[i][numCols - 1])}}{${fmt(c)}} = \\text{no aplica}`;
        return `\\frac{${fmt(cur[i][numCols - 1])}}{${fmt(c)}} = ${fmt(cur[i][numCols - 1] / c)} ${i === leavingRow ? '\\leftarrow \\text{mín}' : ''}`;
      });

      const explIt =
        `## Iteración ${iter}\n` +
        `**1. Variable que ENTRA:**\n\n` +
        `El coeficiente más negativo en la fila $Z$ es $${fmt(minVal)}$ en la columna $${varEntra}$.\n\n` +
        `$\\therefore$ Entra: **$${varEntra}$**\n\n` +
        `**2. Variable que SALE (Razón Mínima):**\n\n` +
        `$\\theta_i = \\dfrac{b_i}{a_{i,\\text{columna}}}$\n\n` +
        `$$\n${ratioRows.join(' \\quad ')}\n$$\n\n` +
        `$\\therefore$ Sale: **$${varSale}$**\n\n` +
        `**3. Elemento Pivote:** $a_{${leavingRow + 1},${enteringCol + 1}} = ${fmt(pivot)}$\n\n` +
        `**4. Operaciones de Fila (Gauss-Jordan):**\n\n` +
        `$R_{${leavingRow + 1}} \\leftarrow \\dfrac{R_{${leavingRow + 1}}}{${fmt(pivot)}}$`;

      // Aplicar Gauss-Jordan
      const next = clone(cur);
      for (let j = 0; j < numCols; j++) next[leavingRow][j] /= pivot;
      for (let i = 0; i <= m; i++) {
        if (i !== leavingRow) {
          const f = next[i][enteringCol];
          if (Math.abs(f) > 1e-12)
            for (let j = 0; j < numCols; j++) next[i][j] -= f * next[leavingRow][j];
        }
      }

      iterBasis[leavingRow] = varEntra;

      steps.push({
        iteration: iter,
        matrix: next,
        headers,
        basis: [...iterBasis],
        isOptimal: false,
        phase: 'tableau',
        explanationLatex: explIt,
      });

      cur = next;
      iter++;
    }

    return steps;
  }
}
