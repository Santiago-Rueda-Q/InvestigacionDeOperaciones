import { SimplexProblem, SimplexStep } from '../types';

// ────────────────────────────────────────────────────────────────
// SIMPLEX REVISADO — B⁻¹ explícita en cada iteración
// ────────────────────────────────────────────────────────────────

const clone = (m: number[][]): number[][] => m.map(r => [...r]);
const fmt = (v: number): string => {
  const r = Math.round(v * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '');
};

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length, p = B[0].length, q = B.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: p }, (_, j) =>
      Array.from({ length: q }, (_, k) => A[i][k] * B[k][j]).reduce((a, b) => a + b, 0)
    )
  );
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

function matVecMul(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
}

function matToLatex(M: number[][], label: string): string {
  const body = M.map(row => row.map(v => fmt(v)).join(' & ')).join(' \\\\ ');
  return `${label} = \\begin{pmatrix} ${body} \\end{pmatrix}`;
}

function vecToLatex(v: number[], label: string): string {
  const body = v.map(fmt).join(' \\\\ ');
  return `${label} = \\begin{pmatrix} ${body} \\end{pmatrix}`;
}

export class SimplexRevisadoSolver {
  public static solve(problem: SimplexProblem): SimplexStep[] {
    const steps: SimplexStep[] = [];
    const { numVars, objectiveCoeffs, constraints, type } = problem;
    const m = constraints.length;
    const n = numVars + m; // total de variables (xj + Si)

    const c_full = [...objectiveCoeffs.map(v => (type === 'MAX' ? v : -v)), ...new Array(m).fill(0)];
    const A_full: number[][] = constraints.map((c, i) => {
      const row = [...c.coefficients];
      for (let k = 0; k < m; k++) row.push(k === i ? 1 : 0);
      return row;
    });
    const b = constraints.map(c => c.rhs);

    const headers = [
      ...Array.from({ length: numVars }, (_, i) => `x_{${i + 1}}`),
      ...Array.from({ length: m }, (_, i) => `S_{${i + 1}}`),
      'Z', 'RHS',
    ];

    // ── PRE-PASO: Formulación ────────────────────────────────────
    steps.push({
      iteration: -3, phase: 'formulation',
      matrix: [], headers: [], basis: [], isOptimal: false,
      explanationLatex:
        `## 1. Formulación del Simplex Revisado\n` +
        `El Simplex Revisado trabaja directamente con la inversa de la base $B^{-1}$, evitando mantener y actualizar el tableau completo.\n` +
        `En cada iteración se calculan:\n` +
        `- **Costos reducidos:** $\\bar{c}_j = c_j - c_B^T B^{-1} a_j$\n` +
        `- **Dirección de actualización:** $\\bar{a}_j = B^{-1} a_j$\n` +
        `- **Razones:** $\\theta = \\min\\left(\\dfrac{\\bar{b}_i}{\\bar{a}_{ij}}\\right)$`,
    });

    // ── PRE-PASO: Base inicial ───────────────────────────────────
    let basisIdx = Array.from({ length: m }, (_, i) => numVars + i);
    let Binv = identity(m);
    let xB = [...b];
    let cB = basisIdx.map(i => c_full[i]);

    steps.push({
      iteration: -2, phase: 'initial_bfs',
      matrix: [], headers: [], basis: basisIdx.map(i => headers[i]), isOptimal: false,
      explanationLatex:
        `## 2. Solución Básica Factible Inicial\n` +
        `La base inicial natural está formada por las variables de holgura:\n\n` +
        `$\\mathcal{B} = \\{${basisIdx.map(i => headers[i]).join(', ')}\\}$\n\n` +
        `$$\n${matToLatex(identity(m), 'B^{-1}_0')}\n$$\n\n` +
        `$$\n${vecToLatex(xB, '\\bar{b}_0')}\n$$\n\n` +
        `El vector de costos básicos es $c_B^T = [${cB.map(fmt).join(',\\; ')}]$.\n\n` +
        `El valor de la función objetivo inicial es $Z_0 = c_B^T \\bar{b} = ${fmt(cB.reduce((s, v, i) => s + v * xB[i], 0))}$.`,
    });

    // ── Iteraciones ──────────────────────────────────────────────
    for (let iter = 1; iter <= 30; iter++) {
      const nonBasis = Array.from({ length: n }, (_, i) => i).filter(i => !basisIdx.includes(i));
      const piT = Array.from({ length: m }, (_, j) => cB.reduce((s, v, i) => s + v * Binv[i][j], 0));

      const reducedCosts = nonBasis.map(j => {
        const aCol = A_full.map(row => row[j]);
        const piAj = piT.reduce((s, v, i) => s + v * aCol[i], 0);
        return { j, rc: c_full[j] - piAj };
      });

      const entering = reducedCosts.filter(r => r.rc > 1e-9).sort((a, b) => b.rc - a.rc)[0];

      if (!entering) {
        steps[steps.length - 1].isOptimal = true;
        const zOpt = cB.reduce((s, v, i) => s + v * xB[i], 0);
        steps[steps.length - 1].explanationLatex +=
          `\n\n## Solución Óptima e Interpretación\n` +
          `Todos los costos reducidos son $\\leq 0$. Se cumple el criterio de optimalidad.\n\n` +
          `$$ Z^* = ${fmt(zOpt)} $$`;
        break;
      }

      const enterIdx = entering.j;
      const aEnter = A_full.map(row => row[enterIdx]);
      const yEnter = matVecMul(Binv, aEnter);

      const ratios = yEnter.map((y, i) => ({ i, ratio: y > 1e-9 ? xB[i] / y : Infinity }));
      const leavingInfo = ratios.reduce((best, cur) => (cur.ratio < best.ratio ? cur : best), { i: -1, ratio: Infinity });

      if (leavingInfo.ratio === Infinity) {
        steps.push({
          iteration: iter, phase: 'tableau',
          matrix: [], headers, basis: basisIdx.map(i => headers[i]), isOptimal: false, isUnbounded: true,
          explanationLatex: `## Problema No Acotado\nTodos los coeficientes $\\bar{a}_{ij} \\leq 0$ para la columna entrante.`,
        });
        break;
      }

      const leavingPos = leavingInfo.i;
      const leavingIdx = basisIdx[leavingPos];
      const thetaStar = leavingInfo.ratio;

      const yLatex = vecToLatex(yEnter, `\\bar{a}_{${enterIdx + 1}}`);
      const ratioLatex = ratios
        .map((r, i) => `\\frac{${fmt(xB[i])}}{${fmt(yEnter[i])}} = ${r.ratio === Infinity ? '\\infty' : fmt(r.ratio)} ${i === leavingPos ? '\\leftarrow \\text{mínimo}' : ''}`)
        .join(' \\quad ');

      const explIt =
        `## Iteración ${iter}\n` +
        `**1. Cálculo de multiplicadores simplex (vector dual):**\n\n` +
        `$$\n\\pi^T = c_B^T B^{-1} = [${piT.map(fmt).join(',\\; ')}]\n$$\n\n` +
        `**2. Costos reducidos de las variables no básicas:**\n\n` +
        `$$\n\\bar{c}_j = c_j - \\pi^T a_j \\quad \\Rightarrow \\quad ${reducedCosts.map(r => `\\bar{c}_{${headers[r.j].replace(/[{}]/g, '')}} = ${fmt(r.rc)}`).join(',\\; ')}\n$$\n\n` +
        `Se elige la variable con mayor costo reducido: **${headers[enterIdx].replace(/[{}]/g, '')}**, que entra a la base.\n\n` +
        `**3. Columna actualizada de la variable entrante:**\n\n` +
        `$$\n${yLatex}\n$$\n\n` +
        `**4. Prueba de razón mínima (¿Quién sale?):**\n\n` +
        `$$\n\\theta_i = \\dfrac{\\bar{b}_i}{\\bar{a}_{i, \\text{entrante}}}\n$$\n\n` +
        `$$\n${ratioLatex}\n$$\n\n` +
        `El mínimo es $\\theta^* = ${fmt(thetaStar)}$, en la fila ${leavingPos + 1}. Por lo tanto **${headers[leavingIdx].replace(/[{}]/g, '')}** sale de la base.\n\n` +
        `**5. Actualización de $B^{-1}$:** Se aplica pivoteo de Gauss-Jordan.`;

      const newBinv = clone(Binv);
      const pivotY = yEnter[leavingPos];
      for (let j = 0; j < m; j++) newBinv[leavingPos][j] /= pivotY;
      for (let i = 0; i < m; i++) {
        if (i !== leavingPos) {
          const f = yEnter[i];
          for (let j = 0; j < m; j++) newBinv[i][j] -= f * newBinv[leavingPos][j];
        }
      }

      const newXB = xB.map((v, i) => (i === leavingPos ? thetaStar : v - yEnter[i] * thetaStar));

      basisIdx = basisIdx.map((v, i) => (i === leavingPos ? enterIdx : v));
      cB = basisIdx.map(i => c_full[i]);
      Binv = newBinv;
      xB = newXB;

      const numColsT = numVars + m + 2;
      const dispMatrix: number[][] = A_full.map((_, r) => {
        const row: number[] = [];
        for (let j = 0; j < n; j++) {
          const aCol = A_full.map(rr => rr[j]);
          row.push(matVecMul(Binv, aCol)[r]);
        }
        row.push(0);
        row.push(xB[r]);
        return row;
      });
      const zVal = cB.reduce((s, v, i) => s + v * xB[i], 0);
      const zRow = Array.from({ length: n }, (_, j) => {
        const aCol = A_full.map(rr => rr[j]);
        return c_full[j] - piT.reduce((s, v, i) => s + v * aCol[i], 0);
      });
      dispMatrix.push([...zRow, 1, zVal]);

      steps.push({
        iteration: iter, phase: 'tableau',
        matrix: dispMatrix, headers,
        basis: [...basisIdx.map(i => headers[i]), 'Z'],
        isOptimal: false,
        enteringCol: enterIdx,
        leavingRow: leavingPos,
        explanationLatex: explIt +
          `\n\n$$\n${matToLatex(newBinv, 'B^{-1}_{' + iter + '}')}\n$$\n\n` +
          `$$\n${vecToLatex(newXB, '\\bar{b}_{' + iter + '}')}\n$$`,
      });
    }

    return steps;
  }
}
