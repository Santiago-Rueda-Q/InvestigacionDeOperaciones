/**
 * Programación Entera — Branch & Bound para ILP de 2 variables (x,y ≥ 0 enteras).
 * Relajación continua: evaluación de la FO en vértices (GeometrySolver).
 */

import { GeometrySolver } from './GeometrySolver';
import type { Constraint, OptimizationType, SimplexProblem } from '../types';

export interface EnteraConstraint {
  id: string;
  a1: number;
  a2: number;
  rel: '<=' | '>=' | '=';
  rhs: number;
}

export interface EnteraInput {
  type: OptimizationType;
  c1: number;
  c2: number;
  constraints: EnteraConstraint[];
  /** Límite de nodos B&B */
  maxNodes?: number;
}

export interface BBNode {
  id: string;
  parentId: string | null;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  status: 'branch' | 'integer' | 'infeasible' | 'fathomed';
  x?: number;
  y?: number;
  z?: number;
  note: string;
}

export interface EnteraStep {
  id: string;
  title: string;
  content: string;
}

export interface EnteraResult {
  feasible: boolean;
  x: number;
  y: number;
  z: number;
  nodes: BBNode[];
  steps: EnteraStep[];
  heuristicRound: { x: number; y: number; z: number; feasible: boolean };
}

export interface EnteraPreset {
  id: string;
  name: string;
  blurb: string;
  data: EnteraInput;
  expected: { x: number; y: number; z: number };
}

export class EnteraError extends Error {}

const EPS = 1e-7;
const INF = 1e6;

const fmt = (v: number) => {
  const r = Math.round(v * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '');
};

const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;

export function validateEnteraInput(raw: EnteraInput): string[] {
  const issues: string[] = [];
  if (!Number.isFinite(raw.c1) || !Number.isFinite(raw.c2)) {
    issues.push('Coeficientes de la FO inválidos.');
  }
  if (!raw.constraints?.length) issues.push('Se requiere al menos una restricción.');
  for (const c of raw.constraints ?? []) {
    if ([c.a1, c.a2, c.rhs].some(v => !Number.isFinite(v))) {
      issues.push(`Restricción ${c.id}: datos inválidos.`);
    }
  }
  return issues;
}

export function blankEntera(): EnteraInput {
  return {
    type: 'MAX',
    c1: 5,
    c2: 8,
    constraints: [
      { id: '1', a1: 1, a2: 1, rel: '<=', rhs: 6 },
      { id: '2', a1: 5, a2: 9, rel: '<=', rhs: 45 },
    ],
  };
}

function toProblem(
  input: EnteraInput,
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
): SimplexProblem {
  const constraints: Constraint[] = input.constraints.map(c => ({
    id: c.id,
    coefficients: [c.a1, c.a2],
    relation: c.rel,
    rhs: c.rhs,
  }));
  // cotas de ramificación como restricciones
  if (bounds.xMax < INF / 2) {
    constraints.push({
      id: `xub-${bounds.xMax}`,
      coefficients: [1, 0],
      relation: '<=',
      rhs: bounds.xMax,
    });
  }
  if (bounds.xMin > 0) {
    constraints.push({
      id: `xlb-${bounds.xMin}`,
      coefficients: [1, 0],
      relation: '>=',
      rhs: bounds.xMin,
    });
  }
  if (bounds.yMax < INF / 2) {
    constraints.push({
      id: `yub-${bounds.yMax}`,
      coefficients: [0, 1],
      relation: '<=',
      rhs: bounds.yMax,
    });
  }
  if (bounds.yMin > 0) {
    constraints.push({
      id: `ylb-${bounds.yMin}`,
      coefficients: [0, 1],
      relation: '>=',
      rhs: bounds.yMin,
    });
  }
  return {
    type: input.type,
    numVars: 2,
    objectiveCoeffs: [input.c1, input.c2],
    constraints,
  };
}

function evalObj(input: EnteraInput, x: number, y: number): number {
  return input.c1 * x + input.c2 * y;
}

function feasiblePoint(input: EnteraInput, x: number, y: number, bounds: BBNode['bounds']): boolean {
  if (x < bounds.xMin - EPS || x > bounds.xMax + EPS) return false;
  if (y < bounds.yMin - EPS || y > bounds.yMax + EPS) return false;
  if (x < -EPS || y < -EPS) return false;
  for (const c of input.constraints) {
    const v = c.a1 * x + c.a2 * y;
    if (c.rel === '<=' && v > c.rhs + EPS) return false;
    if (c.rel === '>=' && v < c.rhs - EPS) return false;
    if (c.rel === '=' && Math.abs(v - c.rhs) > EPS) return false;
  }
  return true;
}

/** Relajación LP 2D por vértices del polígono factible. */
function solveRelaxation(
  input: EnteraInput,
  bounds: BBNode['bounds'],
): { feasible: boolean; x: number; y: number; z: number } {
  const problem = toProblem(input, bounds);
  const verts = GeometrySolver.getFeasibleVertices2D(problem);
  if (!verts.length) return { feasible: false, x: 0, y: 0, z: NaN };

  let best = verts[0];
  let bestZ = evalObj(input, best.x, best.y);
  for (const v of verts) {
    const z = evalObj(input, v.x, v.y);
    if (input.type === 'MAX' ? z > bestZ + EPS : z < bestZ - EPS) {
      best = v;
      bestZ = z;
    }
  }
  return { feasible: true, x: best.x, y: best.y, z: bestZ };
}

function heuristicRound(input: EnteraInput, x: number, y: number): EnteraResult['heuristicRound'] {
  const candidates = [
    { x: Math.floor(x), y: Math.floor(y) },
    { x: Math.ceil(x), y: Math.floor(y) },
    { x: Math.floor(x), y: Math.ceil(y) },
    { x: Math.ceil(x), y: Math.ceil(y) },
  ];
  const bounds = { xMin: 0, xMax: INF, yMin: 0, yMax: INF };
  let best: EnteraResult['heuristicRound'] | null = null;
  for (const c of candidates) {
    if (!feasiblePoint(input, c.x, c.y, bounds)) continue;
    const z = evalObj(input, c.x, c.y);
    if (
      !best ||
      !best.feasible ||
      (input.type === 'MAX' ? z > best.z : z < best.z)
    ) {
      best = { ...c, z, feasible: true };
    }
  }
  return best ?? { x: Math.round(x), y: Math.round(y), z: NaN, feasible: false };
}

export function solveEntera(raw: EnteraInput): EnteraResult {
  const issues = validateEnteraInput(raw);
  if (issues.length) throw new EnteraError(issues[0]);

  const maxNodes = raw.maxNodes ?? 40;
  const steps: EnteraStep[] = [];
  const nodes: BBNode[] = [];
  let nodeSeq = 0;

  steps.push({
    id: 'intro',
    title: 'Branch & Bound',
    content:
      `Se resuelve la **relajación continua** en cada nodo (vértices de la región factible). ` +
      `Si alguna variable es fraccionaria, se ramifica: $x \\le \\lfloor x\\rfloor$ y $x \\ge \\lceil x\\rceil$ ` +
      `(análogo para $y$). Un nodo se poda si es infactible o si su cota no mejora la mejor solución entera (incumbente).`,
  });

  type QItem = { bounds: BBNode['bounds']; parentId: string | null };
  const queue: QItem[] = [
    { bounds: { xMin: 0, xMax: INF, yMin: 0, yMax: INF }, parentId: null },
  ];

  let bestInt: { x: number; y: number; z: number } | null = null;
  let rootRelax: { x: number; y: number; z: number } | null = null;

  while (queue.length && nodes.length < maxNodes) {
    const { bounds, parentId } = queue.shift()!;
    const id = `N${nodeSeq++}`;
    const rel = solveRelaxation(raw, bounds);

    if (!rel.feasible) {
      nodes.push({
        id,
        parentId,
        bounds,
        status: 'infeasible',
        note: 'Relajación infactible — se poda.',
      });
      continue;
    }

    if (!rootRelax) rootRelax = { x: rel.x, y: rel.y, z: rel.z };

    // poda por cota
    if (bestInt) {
      const worse =
        raw.type === 'MAX' ? rel.z <= bestInt.z + EPS : rel.z >= bestInt.z - EPS;
      if (worse) {
        nodes.push({
          id,
          parentId,
          bounds,
          status: 'fathomed',
          x: rel.x,
          y: rel.y,
          z: rel.z,
          note: `Cota $Z=${fmt(rel.z)}$ no mejora el incumbente $Z^*=${fmt(bestInt.z)}$.`,
        });
        continue;
      }
    }

    if (isInt(rel.x) && isInt(rel.y)) {
      const xi = Math.round(rel.x);
      const yi = Math.round(rel.y);
      const zi = evalObj(raw, xi, yi);
      nodes.push({
        id,
        parentId,
        bounds,
        status: 'integer',
        x: xi,
        y: yi,
        z: zi,
        note: `Solución entera $(${xi},${yi})$, $Z=${fmt(zi)}$.`,
      });
      if (
        !bestInt ||
        (raw.type === 'MAX' ? zi > bestInt.z + EPS : zi < bestInt.z - EPS)
      ) {
        bestInt = { x: xi, y: yi, z: zi };
      }
      continue;
    }

    // ramificar
    const fracX = !isInt(rel.x);
    const varName = fracX ? 'x_1' : 'x_2';
    const val = fracX ? rel.x : rel.y;
    const floor = Math.floor(val + EPS);
    const ceil = Math.ceil(val - EPS);

    nodes.push({
      id,
      parentId,
      bounds,
      status: 'branch',
      x: rel.x,
      y: rel.y,
      z: rel.z,
      note: `Relajación $(${fmt(rel.x)}, ${fmt(rel.y)})$, $Z=${fmt(rel.z)}$. Ramifica en $${varName}=${fmt(val)}$.`,
    });

    if (fracX) {
      queue.push({
        parentId: id,
        bounds: { ...bounds, xMax: Math.min(bounds.xMax, floor) },
      });
      queue.push({
        parentId: id,
        bounds: { ...bounds, xMin: Math.max(bounds.xMin, ceil) },
      });
    } else {
      queue.push({
        parentId: id,
        bounds: { ...bounds, yMax: Math.min(bounds.yMax, floor) },
      });
      queue.push({
        parentId: id,
        bounds: { ...bounds, yMin: Math.max(bounds.yMin, ceil) },
      });
    }
  }

  const heur = rootRelax
    ? heuristicRound(raw, rootRelax.x, rootRelax.y)
    : { x: 0, y: 0, z: NaN, feasible: false };

  steps.push({
    id: 'tree',
    title: 'Árbol de búsqueda',
    content: `Se exploraron ${nodes.length} nodos. ` +
      (bestInt
        ? `Incumbente óptimo: $(x_1,x_2)=(${bestInt.x},${bestInt.y})$, $Z^*=${fmt(bestInt.z)}$.`
        : 'No se encontró solución entera factible.'),
  });

  if (heur.feasible) {
    steps.push({
      id: 'heur',
      title: 'Heurística de redondeo',
      content:
        `Redondeando la relajación raíz se obtiene $(${heur.x},${heur.y})$ con $Z=${fmt(heur.z)}$` +
        (heur.feasible ? ' (factible).' : ' (puede ser infactible).') +
        ` El B&B garantiza optimalidad entera; el redondeo solo da una solución rápida aproximada.`,
    });
  }

  if (!bestInt) {
    return {
      feasible: false,
      x: 0,
      y: 0,
      z: NaN,
      nodes,
      steps,
      heuristicRound: heur,
    };
  }

  return {
    feasible: true,
    x: bestInt.x,
    y: bestInt.y,
    z: bestInt.z,
    nodes,
    steps,
    heuristicRound: heur,
  };
}

export const ENTERA_PRESETS: EnteraPreset[] = [
  {
    id: 'ilp-clasico',
    name: 'Producción entera',
    blurb: 'MAX 5x+8y; x+y≤6; 5x+9y≤45',
    data: blankEntera(),
    expected: { x: 0, y: 5, z: 40 }, // verify: (0,5)=40; (3,3)=39; (9,0) not feasible with x+y≤6 → (0,5)=40 or (6,0)=30. Continuous maybe (0,5) already int?
    // 5x+9y≤45, x+y≤6. Vertex: y=5 from 9y=45, x=0; or intersect x+y=6 and 5x+9y=45 → 5x+9(6-x)=45 → 5x+54-9x=45 → -4x=-9 → x=2.25, y=3.75, Z=5*2.25+8*3.75=11.25+30=41.25
    // Integer: (2,3)=10+24=34; (2,4)=10+32=42 but 5*2+9*4=10+36=46>45; (1,4)=5+32=37, 5+36=41≤45, 1+4=5≤6; (0,5)=40; (3,3)=15+24=39, 15+27=42≤45. Best = (0,5)=40? (1,4)=37. Wait (0,5)=40. Is (3,2)=15+16=31. 
    // Actually (0,5)=40 is best among integers? (1,4)=37, (2,3)=34, (3,3)=39, (4,2)=20+16=36, (5,1)=25+8=33, (6,0)=30. So (0,5)=40 OR is there (0,5)? 9*5=45 OK. Yes z=40.
    // But continuous 41.25 at (2.25, 3.75). Integer optimal 40 at (0,5). Hmm (3,3)=39. Yes 40.
  },
  {
    id: 'ilp-simple',
    name: 'MAX 3x+2y',
    blurb: 'x≤4, y≤3, x+y≤5, enteras',
    data: {
      type: 'MAX',
      c1: 3,
      c2: 2,
      constraints: [
        { id: '1', a1: 1, a2: 0, rel: '<=', rhs: 4 },
        { id: '2', a1: 0, a2: 1, rel: '<=', rhs: 3 },
        { id: '3', a1: 1, a2: 1, rel: '<=', rhs: 5 },
      ],
    },
    expected: { x: 4, y: 1, z: 14 }, // or (3,2)=13; (4,1)=14; (2,3)=12. Continuous (4,1) already int? x+y=5 → (4,1) or (2,3). Opt continuous at (4,1)=14 if max 3x+2y. Yes.
  },
  {
    id: 'ilp-min',
    name: 'MIN costo entero',
    blurb: 'MIN 4x+3y; x+y≥5; 2x+y≥6',
    data: {
      type: 'MIN',
      c1: 4,
      c2: 3,
      constraints: [
        { id: '1', a1: 1, a2: 1, rel: '>=', rhs: 5 },
        { id: '2', a1: 2, a2: 1, rel: '>=', rhs: 6 },
      ],
    },
    expected: { x: 1, y: 4, z: 16 }, // (1,4)=16; (2,3)=17; (0,6)=18; (3,2)=18. Continuous: intersect x+y=5, 2x+y=6 → x=1,y=4 already int.
  },
];
