/**
 * Problema de asignación / algoritmo húngaro (Kuhn–Munkres).
 * Desempates deterministas: menor índice de fila/columna.
 */

export type AssignmentSense = 'min' | 'max';

export interface AssignmentInput {
  agents: string[];
  tasks: string[];
  costs: number[][];
  sense: AssignmentSense;
}

export interface AssignmentPair {
  agent: string;
  task: string;
  agentIndex: number;
  taskIndex: number;
  cost: number;
  fictional: boolean;
}

export interface AssignmentStep {
  id: string;
  title: string;
  body: string;
  matrix?: number[][];
  rowLabels?: string[];
  colLabels?: string[];
}

export interface AssignmentResult {
  original: AssignmentInput;
  working: number[][];
  agents: string[];
  tasks: string[];
  sense: AssignmentSense;
  transformMax: number | null;
  addedRows: number;
  addedCols: number;
  pairs: AssignmentPair[];
  total: number;
  steps: AssignmentStep[];
}

export class AssignmentError extends Error {}

export interface AssignmentPreset {
  id: string;
  name: string;
  blurb: string;
  enunciado: string;
  data: AssignmentInput;
  expectedTotal: number;
  /** Referencia académica opcional (p. ej. PDF Numeros_2). */
  source?: string;
}

const EPS = 1e-9;

function asNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new AssignmentError('Apareció un número inválido.');
  return Math.abs(n) < EPS ? 0 : Math.round(n * 1e9) / 1e9;
}

function cloneMatrix(m: number[][]): number[][] {
  return m.map(row => row.map(asNum));
}

function format(n: number): string {
  return String(asNum(n));
}

/**
 * Validación de entrada. Los costos negativos están permitidos:
 * el húngaro minimiza cualquier matriz real; en maximización se usa M − c.
 */
export function validateAssignmentInput(raw: AssignmentInput): string[] {
  const issues: string[] = [];
  if (!raw.agents.length || !raw.tasks.length) issues.push('Hace falta al menos un agente y una tarea.');
  if (raw.agents.length > 12 || raw.tasks.length > 12) issues.push('Como máximo 12 agentes y 12 tareas.');
  raw.agents.forEach((n, i) => {
    if (!n.trim()) issues.push(`El agente de la fila ${i + 1} no tiene nombre.`);
  });
  raw.tasks.forEach((n, j) => {
    if (!n.trim()) issues.push(`La tarea de la columna ${j + 1} no tiene nombre.`);
  });
  const agentNames = raw.agents.map(n => n.trim()).filter(Boolean);
  if (new Set(agentNames).size !== agentNames.length) issues.push('Hay agentes con el mismo nombre.');
  const taskNames = raw.tasks.map(n => n.trim()).filter(Boolean);
  if (new Set(taskNames).size !== taskNames.length) issues.push('Hay tareas con el mismo nombre.');
  if (raw.costs.length !== raw.agents.length) issues.push('La matriz no coincide con el número de agentes.');
  raw.costs.forEach((row, i) => {
    if (row.length !== raw.tasks.length) {
      issues.push(`La fila ${raw.agents[i] || i + 1} no tiene ${raw.tasks.length} columnas.`);
      return;
    }
    row.forEach((c, j) => {
      if (!Number.isFinite(c)) {
        issues.push(`Celda vacía o no numérica: ${raw.agents[i] || `A${i + 1}`} → ${raw.tasks[j] || `T${j + 1}`}.`);
      }
    });
  });
  return [...new Set(issues)];
}

/** Crea una matriz en blanco editable (modo personalizado). */
export function blankAssignment(sense: AssignmentSense = 'min', m = 2, n = 2): AssignmentInput {
  const mm = Math.max(1, Math.min(12, m));
  const nn = Math.max(1, Math.min(12, n));
  return {
    sense,
    agents: Array.from({ length: mm }, (_, i) => `A${i + 1}`),
    tasks: Array.from({ length: nn }, (_, j) => `T${j + 1}`),
    costs: Array.from({ length: mm }, () => Array.from({ length: nn }, () => 0)),
  };
}

function tidy(raw: AssignmentInput): AssignmentInput {
  const issues = validateAssignmentInput(raw);
  if (issues.length) throw new AssignmentError(issues[0]);
  return {
    sense: raw.sense,
    agents: raw.agents.map((n, i) => n.trim() || `A${i + 1}`),
    tasks: raw.tasks.map((n, i) => n.trim() || `T${i + 1}`),
    costs: raw.costs.map(row => row.map(asNum)),
  };
}

/** Matching máximo en el grafo bipartito de ceros + cubierta de König. */
function coverZeros(mat: number[][]): { rows: boolean[]; cols: boolean[]; rowMatch: number[] } {
  const n = mat.length;
  const rowMatch = Array(n).fill(-1);
  const colMatch = Array(n).fill(-1);

  const zeros = (i: number) => {
    const zs: number[] = [];
    for (let j = 0; j < n; j++) if (Math.abs(mat[i][j]) < EPS) zs.push(j);
    return zs;
  };

  const dfs = (i: number, seen: boolean[]): boolean => {
    for (const j of zeros(i)) {
      if (seen[j]) continue;
      seen[j] = true;
      if (colMatch[j] === -1 || dfs(colMatch[j], seen)) {
        rowMatch[i] = j;
        colMatch[j] = i;
        return true;
      }
    }
    return false;
  };

  for (let i = 0; i < n; i++) {
    if (rowMatch[i] === -1) dfs(i, Array(n).fill(false));
  }

  const freeRows = Array.from({ length: n }, (_, i) => i).filter(i => rowMatch[i] === -1);
  const visitedRows = new Set<number>(freeRows);
  const visitedCols = new Set<number>();
  const queue = [...freeRows];

  while (queue.length) {
    const i = queue.shift()!;
    for (const j of zeros(i)) {
      if (visitedCols.has(j)) continue;
      visitedCols.add(j);
      const mi = colMatch[j];
      if (mi >= 0 && !visitedRows.has(mi)) {
        visitedRows.add(mi);
        queue.push(mi);
      }
    }
  }

  return {
    rows: Array.from({ length: n }, (_, i) => !visitedRows.has(i)),
    cols: Array.from({ length: n }, (_, j) => visitedCols.has(j)),
    rowMatch,
  };
}

function findIndependentZeros(mat: number[][]): number[] {
  const n = mat.length;
  const assignment = Array(n).fill(-1);
  const colUsed = Array(n).fill(false);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const za = mat[a].filter(v => Math.abs(v) < EPS).length;
    const zb = mat[b].filter(v => Math.abs(v) < EPS).length;
    return za - zb || a - b;
  });

  const assignOrdered = (k: number): boolean => {
    if (k === n) return true;
    const i = order[k];
    for (let j = 0; j < n; j++) {
      if (Math.abs(mat[i][j]) > EPS || colUsed[j]) continue;
      colUsed[j] = true;
      assignment[i] = j;
      if (assignOrdered(k + 1)) return true;
      colUsed[j] = false;
      assignment[i] = -1;
    }
    return false;
  };

  if (assignOrdered(0)) return assignment;
  return coverZeros(mat).rowMatch;
}

export function solveAssignment(raw: AssignmentInput): AssignmentResult {
  const original = tidy(raw);
  const steps: AssignmentStep[] = [];
  const push = (title: string, body: string, matrix?: number[][], rowLabels?: string[], colLabels?: string[]) => {
    steps.push({
      id: `s${steps.length}`,
      title,
      body,
      matrix: matrix ? cloneMatrix(matrix) : undefined,
      rowLabels,
      colLabels,
    });
  };

  let agents = [...original.agents];
  let tasks = [...original.tasks];
  let costs = cloneMatrix(original.costs);
  let addedRows = 0;
  let addedCols = 0;

  push(
    'Matriz original',
    `Matriz ${agents.length}×${tasks.length}. Objetivo: **${original.sense === 'min' ? 'minimizar costo' : 'maximizar beneficio'}**.`,
    costs,
    agents,
    tasks,
  );

  if (agents.length !== tasks.length) {
    if (agents.length < tasks.length) {
      addedRows = tasks.length - agents.length;
      for (let k = 0; k < addedRows; k++) {
        agents.push(`Ficticio ${k + 1}`);
        costs.push(tasks.map(() => 0));
      }
    } else {
      addedCols = agents.length - tasks.length;
      for (let k = 0; k < addedCols; k++) tasks.push(`Ficticia ${k + 1}`);
      costs = costs.map(row => [...row, ...Array(addedCols).fill(0)]);
    }
    push(
      'Balanceo',
      `La matriz no era cuadrada. Se añadieron ${addedRows ? `${addedRows} fila(s)` : `${addedCols} columna(s)`} ficticia(s) con costo 0.`,
      costs,
      agents,
      tasks,
    );
  }

  let transformMax: number | null = null;
  let working = cloneMatrix(costs);
  if (original.sense === 'max') {
    transformMax = working.flat().reduce((a, b) => Math.max(a, b), -Infinity);
    working = working.map(row => row.map(c => asNum(transformMax! - c)));
    push(
      'Transformación a minimización',
      `Se usa $c'_{ij} = M - c_{ij}$ con $M = ${format(transformMax)}$. Minimizar $c'$ equivale a maximizar el beneficio original.`,
      working,
      agents,
      tasks,
    );
  }

  const n = working.length;
  for (let i = 0; i < n; i++) {
    const min = Math.min(...working[i]);
    if (min !== 0) working[i] = working[i].map(v => asNum(v - min));
  }
  push('Reducción por filas', 'A cada fila se le resta su mínimo.', working, agents, tasks);

  for (let j = 0; j < n; j++) {
    let min = Infinity;
    for (let i = 0; i < n; i++) min = Math.min(min, working[i][j]);
    if (Number.isFinite(min) && min !== 0) {
      for (let i = 0; i < n; i++) working[i][j] = asNum(working[i][j] - min);
    }
  }
  push('Reducción por columnas', 'A cada columna se le resta su mínimo.', working, agents, tasks);

  let guard = 0;
  while (guard++ < n * n + 8) {
    const { rows, cols, rowMatch } = coverZeros(working);
    const lines = rows.filter(Boolean).length + cols.filter(Boolean).length;
    const assigned = rowMatch.filter(j => j >= 0).length;

    if (assigned === n || lines >= n) {
      const assignment = findIndependentZeros(working);
      if (assignment.every(j => j >= 0) && new Set(assignment).size === n) {
        push('Asignación óptima', `Se hallaron ${n} ceros independientes (uno por fila y columna).`, working, agents, tasks);
        const pairs: AssignmentPair[] = [];
        let total = 0;
        for (let i = 0; i < n; i++) {
          const j = assignment[i];
          const fictional = agents[i].startsWith('Ficticio') || tasks[j].startsWith('Ficticia');
          const cost = costs[i][j];
          if (!fictional) total = asNum(total + cost);
          pairs.push({ agent: agents[i], task: tasks[j], agentIndex: i, taskIndex: j, cost, fictional });
        }
        const parts = pairs.filter(p => !p.fictional).map(p => format(p.cost));
        push(
          'Valor de la solución',
          `${original.sense === 'min' ? 'Costo' : 'Beneficio'} total $Z = ${parts.join(' + ') || '0'} = ${format(total)}$.`,
        );
        return {
          original,
          working,
          agents,
          tasks,
          sense: original.sense,
          transformMax,
          addedRows,
          addedCols,
          pairs,
          total,
          steps,
        };
      }
    }

    let theta = Infinity;
    for (let i = 0; i < n; i++) {
      if (rows[i]) continue;
      for (let j = 0; j < n; j++) {
        if (cols[j]) continue;
        theta = Math.min(theta, working[i][j]);
      }
    }
    if (!Number.isFinite(theta) || theta <= 0) throw new AssignmentError('No se pudo ajustar la matriz del húngaro.');

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!rows[i] && !cols[j]) working[i][j] = asNum(working[i][j] - theta);
        else if (rows[i] && cols[j]) working[i][j] = asNum(working[i][j] + theta);
      }
    }
    push(
      `Ajuste con θ = ${format(theta)}`,
      `Cubierta con ${lines} línea(s). Se resta θ fuera de la cubierta y se suma en las intersecciones.`,
      working,
      agents,
      tasks,
    );
  }

  throw new AssignmentError('El algoritmo húngaro no terminó. Revisa los datos.');
}

/** Fuerza bruta para verificar óptimos en matrices cuadradas pequeñas. */
export function bruteForceAssignment(costs: number[][], sense: AssignmentSense): { total: number; perm: number[] } {
  const n = costs.length;
  if (costs.some(r => r.length !== n)) throw new AssignmentError('Fuerza bruta solo para matrices cuadradas.');
  const used = Array(n).fill(false);
  let best = sense === 'min' ? Infinity : -Infinity;
  let bestPerm: number[] = [];
  const cur = Array(n).fill(-1);

  const rec = (i: number, sum: number) => {
    if (i === n) {
      if (sense === 'min' ? sum < best - EPS : sum > best + EPS) {
        best = sum;
        bestPerm = [...cur];
      }
      return;
    }
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      used[j] = true;
      cur[i] = j;
      rec(i + 1, asNum(sum + costs[i][j]));
      used[j] = false;
    }
  };
  rec(0, 0);
  return { total: best, perm: bestPerm };
}

/** Prohibición en Ej. 3.3 del PDF (M grande finita). */
const FORBIDDEN = 9999;

export const ASSIGNMENT_PRESETS: AssignmentPreset[] = [
  {
    id: 'a-3x3-min',
    name: '3×3 costos',
    blurb: 'Asignación clásica de minimización.',
    enunciado: 'Tres trabajadores y tres tareas. Minimizar el costo total.',
    data: {
      sense: 'min',
      agents: ['W1', 'W2', 'W3'],
      tasks: ['T1', 'T2', 'T3'],
      costs: [
        [15, 9, 4],
        [8, 7, 6],
        [10, 11, 3],
      ],
    },
    expectedTotal: 20,
  },
  {
    id: 'pdf-3.1-max',
    name: 'PDF 3.1 · Vendedores',
    blurb: 'Maximizar utilidades (Numeros_2, p.15).',
    enunciado: 'Tres vendedores y tres zonas. Utilidad esperada (millones). Maximizar.',
    source: 'Numeros_2.pdf · Ejercicio 3.1 · p.15–16',
    data: {
      sense: 'max',
      agents: ['V1', 'V2', 'V3'],
      tasks: ['Z1', 'Z2', 'Z3'],
      costs: [
        [8, 5, 9],
        [7, 10, 6],
        [9, 7, 4],
      ],
    },
    expectedTotal: 28,
  },
  {
    id: 'pdf-3.2-rect',
    name: 'PDF 3.2 · 3×4',
    blurb: 'No balanceado: 3 agentes, 4 tareas (p.15–17).',
    enunciado: 'Tres trabajadores y cuatro tareas; una tarea queda libre. Minimizar.',
    source: 'Numeros_2.pdf · Ejercicio 3.2 · p.15–17',
    data: {
      sense: 'min',
      agents: ['A1', 'A2', 'A3'],
      tasks: ['T1', 'T2', 'T3', 'T4'],
      costs: [
        [9, 12, 15, 10],
        [14, 10, 11, 9],
        [12, 16, 13, 8],
      ],
    },
    expectedTotal: 27,
  },
  {
    id: 'pdf-3.3-prohib',
    name: 'PDF 3.3 · Prohibidas',
    blurb: 'Celdas prohibidas con M=9999 (p.17–18). Óptimo 26.',
    enunciado: 'Operario 1 no usa máquina 1; operario 3 no usa máquina 3.',
    source: 'Numeros_2.pdf · Ejercicio 3.3 · p.17–18',
    data: {
      sense: 'min',
      agents: ['O1', 'O2', 'O3'],
      tasks: ['M1', 'M2', 'M3'],
      costs: [
        [FORBIDDEN, 7, 9],
        [8, 6, 10],
        [11, 9, FORBIDDEN],
      ],
    },
    expectedTotal: 26,
  },
  {
    id: 'a-3x3-max',
    name: '3×3 beneficios',
    blurb: 'Maximización con transformación M − c.',
    enunciado: 'Maximizar el beneficio de tres agentes en tres proyectos.',
    data: {
      sense: 'max',
      agents: ['A', 'B', 'C'],
      tasks: ['P1', 'P2', 'P3'],
      costs: [
        [5, 7, 9],
        [8, 6, 4],
        [3, 10, 2],
      ],
    },
    expectedTotal: 27,
  },
];

export const HUNGARIAN_PRESETS: AssignmentPreset[] = [
  {
    id: 'pdf-2.1',
    name: 'PDF 2.1 · 3×3',
    blurb: 'Sin ajuste de θ; costo 31 (p.8–9).',
    enunciado: 'Minimizar con C = [[12,8,15],[10,9,12],[14,11,13]].',
    source: 'Numeros_2.pdf · Ejercicio 2.1 · p.8–9',
    data: {
      sense: 'min',
      agents: ['A1', 'A2', 'A3'],
      tasks: ['T1', 'T2', 'T3'],
      costs: [
        [12, 8, 15],
        [10, 9, 12],
        [14, 11, 13],
      ],
    },
    expectedTotal: 31,
  },
  {
    id: 'pdf-2.2',
    name: 'PDF 2.2 · 4×4',
    blurb: 'Un ajuste θ=6; costo 140 (p.9–11).',
    enunciado: 'Costos en miles; aplicar Kuhn–Munkres con un ajuste.',
    source: 'Numeros_2.pdf · Ejercicio 2.2 · p.9–11',
    data: {
      sense: 'min',
      agents: ['1', '2', '3', '4'],
      tasks: ['1', '2', '3', '4'],
      costs: [
        [82, 83, 69, 92],
        [77, 37, 49, 92],
        [11, 69, 5, 86],
        [8, 9, 98, 23],
      ],
    },
    expectedTotal: 140,
  },
  {
    id: 'pdf-2.3',
    name: 'PDF 2.3 · Tiempos',
    blurb: 'Operarios × tareas; 15 horas (p.11–12).',
    enunciado: 'Cuatro operarios y cuatro tareas. Minimizar tiempo total.',
    source: 'Numeros_2.pdf · Ejercicio 2.3 · p.11–12',
    data: {
      sense: 'min',
      agents: ['Op1', 'Op2', 'Op3', 'Op4'],
      tasks: ['T1', 'T2', 'T3', 'T4'],
      costs: [
        [14, 5, 8, 7],
        [2, 12, 6, 5],
        [7, 8, 3, 9],
        [2, 4, 6, 10],
      ],
    },
    expectedTotal: 15,
  },
  {
    id: 'h-4x4',
    name: '4×4 húngaro',
    blurb: 'Matriz 4×4 que obliga a varios ajustes.',
    enunciado: 'Aplicar Kuhn–Munkres para minimizar el costo.',
    data: {
      sense: 'min',
      agents: ['A1', 'A2', 'A3', 'A4'],
      tasks: ['B1', 'B2', 'B3', 'B4'],
      costs: [
        [9, 2, 7, 8],
        [6, 4, 3, 7],
        [5, 8, 1, 8],
        [7, 6, 9, 4],
      ],
    },
    expectedTotal: 13,
  },
  {
    id: 'h-max',
    name: 'Maximización 3×3',
    blurb: 'Caso max con transformación M − c.',
    enunciado: 'Maximizar puntuaciones de tres candidatos en tres puestos.',
    data: {
      sense: 'max',
      agents: ['C1', 'C2', 'C3'],
      tasks: ['Puesto 1', 'Puesto 2', 'Puesto 3'],
      costs: [
        [6, 2, 8],
        [5, 9, 3],
        [7, 4, 1],
      ],
    },
    expectedTotal: 24,
  },
];
