import { SimplexSolver } from './SimplexSolver';
import { SimplexProblem } from '../types';

// ────────────────────────────────────────────────────────────────
// Tipos públicos
// ────────────────────────────────────────────────────────────────

export interface ObjCoeffRange {
  varIndex: number;
  varName: string;
  currentValue: number;
  allowableIncrease: number;  // cuánto puede aumentar antes de cambiar la base óptima
  allowableDecrease: number;  // cuánto puede disminuir antes de cambiar la base óptima
  lowerBound: number;
  upperBound: number;
}

export interface RhsRange {
  constraintIndex: number;
  constraintName: string;
  currentValue: number;
  shadowPrice: number;
  allowableIncrease: number;
  allowableDecrease: number;
  lowerBound: number;
  upperBound: number;
}

export interface SensibilidadResult {
  optimal: { values: number[]; z: number } | null;
  shadowPrices: number[];
  objCoeffRanges: ObjCoeffRange[];
  rhsRanges: RhsRange[];
  steps: SensibilidadStep[];
  feasible: boolean;
}

export interface SensibilidadStep {
  stepNum: number;
  title: string;
  content: string;
}

// ────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────

const INF = 1e15;
const EPSILON = 1e-9;

const fmt = (v: number, d = 4): string => {
  if (Math.abs(v) >= INF / 2) return '\\infty';
  const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  return Number.isInteger(r) ? String(r) : r.toFixed(d).replace(/\.?0+$/, '');
};

const fmtRange = (v: number): string => {
  if (Math.abs(v) >= INF / 2) return '∞';
  const r = Math.round(v * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '');
};

// ────────────────────────────────────────────────────────────────
// Solver principal
// ────────────────────────────────────────────────────────────────

export function solveSensibilidad(problem: SimplexProblem): SensibilidadResult {
  const steps: SensibilidadStep[] = [];
  const { numVars, objectiveCoeffs, constraints, type } = problem;
  const m = constraints.length;

  // ── Resolver con Simplex para obtener el tableau óptimo ──────
  const simplexSteps = SimplexSolver.solve(problem);
  const lastStep = [...simplexSteps].reverse().find(s => s.isOptimal);

  if (!lastStep || !lastStep.matrix.length) {
    steps.push({
      stepNum: 1,
      title: 'Sin Solución Óptima',
      content: `## 1. Análisis de Sensibilidad\n\n⚠ El problema no tiene solución óptima finita (puede ser infactible o no acotado).`,
    });
    return { optimal: null, shadowPrices: [], objCoeffRanges: [], rhsRanges: [], steps, feasible: false };
  }

  // ── Extraer datos del tableau óptimo ─────────────────────────
  const T = lastStep.matrix;        // [m+1 × numCols]  (m filas + fila Z)
  const numCols = T[0].length;      // numVars + m + 2  (xj + Si + Z + RHS)
  const rhs = numCols - 1;          // índice de la columna RHS

  // Solución primal
  const optValues = Array.from({ length: numVars }, (_, j) => {
    const varName = `x_{${j + 1}}`;
    const bIdx = lastStep.basis.indexOf(varName);
    return bIdx >= 0 ? T[bIdx][rhs] : 0;
  });
  const optZ = T[m][rhs];

  // Fila Z del tableau óptimo
  const zRow = T[m]; // indices 0..numVars+m-1 son reduced costs (negados para MAX)

  // B^-1 está en las columnas de las variables de holgura
  // B^-1[r][i] = T[r][numVars + i]  (fila r, holgura i)
  const Binv: number[][] = Array.from({ length: m }, (_, r) =>
    Array.from({ length: m }, (_, i) => T[r][numVars + i])
  );

  // RHS del tableau óptimo (valores actuales de variables básicas)
  const bBar = Array.from({ length: m }, (_, r) => T[r][rhs]);

  // Precios sombra: y_i = z_row[numVars + i]
  // Para MAX: y_i = z_row[numVars + i] (positivo si la restricción es activa)
  const shadowPrices = Array.from({ length: m }, (_, i) => {
    const sp = zRow[numVars + i];
    return type === 'MAX' ? sp : -sp;
  });

  // ── Paso 1: Enunciado y solución óptima ─────────────────────
  const optStr = optValues.map((v, i) => `x_{${i + 1}}^* = ${fmt(v, 3)}`).join(',\\; ');
  steps.push({
    stepNum: 1,
    title: 'Solución Óptima Base',
    content:
      `## 1. Solución Óptima\n\n` +
      `$$${optStr}$$\n\n` +
      `$$Z^* = ${fmt(optZ, 4)}$$\n\n` +
      `La base óptima $\\mathcal{B}$ es: $\\{${lastStep.basis.slice(0, m).join(', ')}\\}$.\n\n` +
      `A partir de esta base se calculan los rangos de sensibilidad.`,
  });

  // ── Paso 2: Precios sombra ───────────────────────────────────
  const spRows = shadowPrices.map((sp, i) =>
    `y_{${i + 1}}^* = ${fmt(sp, 4)} & \\frac{\\partial Z^*}{\\partial b_{${i + 1}}} = ${fmt(sp, 4)} & ` +
    `\\text{(restricción ${i + 1}: ${constraints[i].rhs})}`
  ).join(' \\\\ ');

  steps.push({
    stepNum: 2,
    title: 'Precios Sombra',
    content:
      `## 2. Precios Sombra (Variables Duales)\n\n` +
      `El precio sombra $y_i$ mide el cambio en $Z^*$ por unidad de aumento en $b_i$, manteniendo la misma base óptima:\n\n` +
      `$$y_i^* = \\frac{\\partial Z^*}{\\partial b_i}$$\n\n` +
      `$$\\begin{array}{c|c|l}y_i^* & \\partial Z^*/\\partial b_i & \\text{Interpretación} \\\\ \\hline ${spRows}\\end{array}$$`,
  });

  // ── Paso 3: Rangos de coeficientes de la FO ─────────────────
  const objRanges: ObjCoeffRange[] = [];

  for (let k = 0; k < numVars; k++) {
    const varName = `x_{${k + 1}}`;
    const inBasis = lastStep.basis.indexOf(varName);
    const isBasic = inBasis >= 0 && inBasis < m;
    const ck = objectiveCoeffs[k];

    let allowInc = INF;
    let allowDec = INF;

    if (isBasic) {
      // Variable básica en fila r_k
      // Cambiar c_k por δ → z_row[j]_new = z_row[j] + δ × T[inBasis][j] para no básicos j
      // Mantener: z_row[j] + δ × T[inBasis][j] ≥ 0 (para MAX; columnas no básicas)
      let minDelta = -INF;
      let maxDelta = INF;
      for (let j = 0; j < numVars + m; j++) {
        // saltar la columna básica k (zRow = 0 allí)
        const zj = zRow[j];
        const tjk = T[inBasis][j];
        if (Math.abs(tjk) < EPSILON) continue;
        // Para MAX: z_row[j] + delta * T[r_k][j] >= 0
        // Si tjk > 0: delta >= -zj/tjk
        // Si tjk < 0: delta <= -zj/tjk
        const ratio = -zj / tjk;
        if (tjk > EPSILON) {
          if (ratio > minDelta) minDelta = ratio;
        } else {
          if (ratio < maxDelta) maxDelta = ratio;
        }
      }
      allowInc = maxDelta >= INF / 2 ? INF : maxDelta;
      allowDec = minDelta <= -INF / 2 ? INF : -minDelta;
    } else {
      // Variable no básica
      // z_row[k]_new = z_row[k] - delta >= 0  →  delta <= z_row[k]
      const zk = zRow[k];
      allowInc = zk >= INF / 2 ? INF : zk;
      allowDec = INF; // puede disminuir sin límite
    }

    objRanges.push({
      varIndex: k,
      varName: varName,
      currentValue: ck,
      allowableIncrease: allowInc,
      allowableDecrease: allowDec,
      lowerBound: allowDec >= INF / 2 ? -INF : ck - allowDec,
      upperBound: allowInc >= INF / 2 ? INF : ck + allowInc,
    });
  }

  const objRangeRows = objRanges.map(r =>
    `x_{${r.varIndex + 1}} & ${fmt(r.currentValue, 3)} & ` +
    `[${fmt(r.lowerBound, 3)},\\; ${fmt(r.upperBound, 3)}] & ` +
    `+${fmt(r.allowableIncrease, 3)} & -${fmt(r.allowableDecrease, 3)}`
  ).join(' \\\\ ');

  steps.push({
    stepNum: 3,
    title: 'Rangos de los Coeficientes de la FO',
    content:
      `## 3. Análisis de Sensibilidad de los Coeficientes de la FO\n\n` +
      `Rango de $c_j$ para el que la base óptima **permanece óptima**:\n\n` +
      `$$\\begin{array}{c|c|c|c|c}\\text{Var.} & c_j^* & \\text{Rango} & \\text{Aumento máx.} & \\text{Disminución máx.} \\\\ \\hline ${objRangeRows}\\end{array}$$`,
  });

  // ── Paso 4: Rangos del RHS ───────────────────────────────────
  const rhsRanges: RhsRange[] = [];

  for (let i = 0; i < m; i++) {
    const bi = constraints[i].rhs;
    // Columna B^-1[:, i] = T[:, numVars + i]
    const col = Array.from({ length: m }, (_, r) => T[r][numVars + i]);

    let minDelta = -INF;
    let maxDelta = INF;

    for (let r = 0; r < m; r++) {
      if (Math.abs(col[r]) < EPSILON) continue;
      // b_bar[r] + delta * col[r] >= 0
      const ratio = -bBar[r] / col[r];
      if (col[r] > EPSILON) {
        if (ratio > minDelta) minDelta = ratio;
      } else {
        if (ratio < maxDelta) maxDelta = ratio;
      }
    }

    const allowInc = maxDelta >= INF / 2 ? INF : maxDelta;
    const allowDec = minDelta <= -INF / 2 ? INF : -minDelta;

    rhsRanges.push({
      constraintIndex: i,
      constraintName: `R_{${i + 1}}`,
      currentValue: bi,
      shadowPrice: shadowPrices[i],
      allowableIncrease: allowInc,
      allowableDecrease: allowDec,
      lowerBound: allowDec >= INF / 2 ? -INF : bi - allowDec,
      upperBound: allowInc >= INF / 2 ? INF : bi + allowInc,
    });
  }

  const rhsRows = rhsRanges.map(r =>
    `R_{${r.constraintIndex + 1}} & ${fmt(r.currentValue, 3)} & ${fmt(r.shadowPrice, 4)} & ` +
    `[${fmt(r.lowerBound, 3)},\\; ${fmt(r.upperBound, 3)}] & ` +
    `+${fmt(r.allowableIncrease, 3)} & -${fmt(r.allowableDecrease, 3)}`
  ).join(' \\\\ ');

  steps.push({
    stepNum: 4,
    title: 'Rangos del RHS',
    content:
      `## 4. Análisis de Sensibilidad del RHS\n\n` +
      `Rango de $b_i$ para el que la base óptima **permanece factible** (misma base):\n\n` +
      `$$\\begin{array}{c|c|c|c|c|c}\\text{Restr.} & b_i^* & y_i^* & \\text{Rango factible} & \\Delta^+ & \\Delta^-\\\\ \\hline ${rhsRows}\\end{array}$$`,
  });

  // ── Paso 5: Interpretación ───────────────────────────────────
  const spInterp = shadowPrices.map((sp, i) => {
    if (Math.abs(sp) < EPSILON) return `- **R${i + 1}** ($b_${i + 1} = ${constraints[i].rhs}$): precio sombra $y_{${i + 1}} = 0$ — restricción no activa (holgura).`;
    return `- **R${i + 1}** ($b_${i + 1} = ${constraints[i].rhs}$): precio sombra $y_{${i + 1}} = ${fmt(sp, 4)}$ — aumentar $b_${i + 1}$ en 1 unidad mejora $Z^*$ en ${fmt(Math.abs(sp), 4)}.`;
  }).join('\n');

  steps.push({
    stepNum: 5,
    title: 'Interpretación Económica',
    content:
      `## 5. Interpretación Económica\n\n` +
      `### Precios Sombra\n\n${spInterp}\n\n` +
      `### Rangos de los Coeficientes de la FO\n\nMientras $c_j$ permanezca dentro de su rango, la **solución óptima no cambia** (aunque el valor $Z^*$ sí puede cambiar).\n\n` +
      `### Rangos del RHS\n\nMientras $b_i$ permanezca dentro de su rango, la **base óptima no cambia** (mismas variables en la base). El valor $Z^*$ cambia a razón del precio sombra.`,
  });

  return {
    optimal: { values: optValues, z: optZ },
    shadowPrices,
    objCoeffRanges: objRanges,
    rhsRanges,
    steps,
    feasible: true,
  };
}
