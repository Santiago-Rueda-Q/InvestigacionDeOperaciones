/**
 * Árbol de Mínimo Recorrido (MST) — Kruskal y Prim con traza paso a paso.
 * Grafo no dirigido; aristas bidireccionales; pesos ≥ 0.
 */

// ─── Interfaces públicas ────────────────────────────────────────────────────

export interface MstEdgeInput {
  id: string;
  from: string;
  to: string;
  /** Peso (costo) de la arista. Debe ser ≥ 0. */
  weight: number;
}

export type MstAlgorithm = 'kruskal' | 'prim';

export interface MstInput {
  nodes: string[];
  edges: MstEdgeInput[];
  algorithm: MstAlgorithm;
  /** Nodo de inicio para Prim (si no se indica, se usa el primero). */
  startNode?: string;
}

export interface MstStep {
  id: string;
  iteration: number;
  /** ID de la arista considerada en este paso (null = paso inicial informativo). */
  edgeId: string | null;
  /** Etiqueta legible de la arista (p. ej. "A — B"). */
  edgeLabel: string;
  weight: number;
  decision: 'added' | 'rejected' | 'info';
  /** Descripción didáctica del paso. */
  reason: string;
  /** IDs de las aristas que forman el árbol hasta este paso. */
  mstEdgeIds: string[];
  accumulatedCost: number;
}

export interface MstResult {
  totalCost: number;
  /** IDs de las aristas del MST final. */
  mstEdgeIds: string[];
  /** Objetos arista del MST final. */
  mstEdges: MstEdgeInput[];
  steps: MstStep[];
  /** true si el grafo es conexo y se obtuvo un árbol recubridor completo. */
  connected: boolean;
  algorithm: MstAlgorithm;
}

export interface MstPreset {
  id: string;
  name: string;
  blurb: string;
  enunciado: string;
  source?: string;
  data: MstInput;
  expectedTotalCost: number;
}

// ─── Error ──────────────────────────────────────────────────────────────────

export class MstError extends Error {}

// ─── Validación ─────────────────────────────────────────────────────────────

export function validateMstInput(raw: MstInput): string[] {
  const issues: string[] = [];

  if (!raw.nodes || raw.nodes.length < 2) {
    issues.push('El grafo necesita al menos dos nodos.');
  }

  const trimmed = (raw.nodes ?? []).map(n => n.trim());
  trimmed.forEach((n, i) => {
    if (!n) issues.push(`El nodo ${i + 1} no tiene nombre.`);
  });

  const nodeSet = new Set(trimmed.filter(Boolean));
  if (nodeSet.size < trimmed.filter(Boolean).length) {
    issues.push('Hay nodos con el mismo nombre.');
  }

  if (!raw.edges || raw.edges.length < 1) {
    issues.push('Agrega al menos una arista.');
  }

  const pairsSeen = new Set<string>();
  (raw.edges ?? []).forEach((e, i) => {
    const f = e.from?.trim() ?? '';
    const t = e.to?.trim() ?? '';
    const label = `Arista ${i + 1} (${f || '?'} — ${t || '?'})`;

    if (!nodeSet.has(f) || !nodeSet.has(t)) {
      issues.push(`${label}: extremos no válidos.`);
    } else if (f === t) {
      issues.push(`${label}: no se admiten bucles.`);
    }

    if (!Number.isFinite(e.weight)) {
      issues.push(`${label}: el peso está vacío o no es numérico.`);
    } else if (e.weight < 0) {
      issues.push(`${label}: el peso no puede ser negativo.`);
    }

    // Detectar aristas duplicadas en sentido no dirigido
    if (f && t && f !== t) {
      const key = [f, t].sort().join('\u2014');
      if (pairsSeen.has(key)) {
        issues.push(`Aristas duplicadas ${f}—${t}: en un grafo no dirigido es redundante.`);
      }
      pairsSeen.add(key);
    }
  });

  if (raw.algorithm === 'prim' && raw.startNode) {
    if (!nodeSet.has(raw.startNode.trim())) {
      issues.push(`El nodo de inicio «${raw.startNode}» no está en la lista de nodos.`);
    }
  }

  return [...new Set(issues)];
}

// ─── Blank ──────────────────────────────────────────────────────────────────

export function blankMst(): MstInput {
  return {
    nodes: ['A', 'B', 'C', 'D'],
    edges: [
      { id: 'e1', from: 'A', to: 'B', weight: 1 },
      { id: 'e2', from: 'B', to: 'C', weight: 2 },
      { id: 'e3', from: 'C', to: 'D', weight: 3 },
    ],
    algorithm: 'kruskal',
    startNode: 'A',
  };
}

// ─── Union‑Find (para Kruskal) ───────────────────────────────────────────────

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  /** Devuelve true si la unión se realizó (eran componentes distintas). */
  union(x: number, y: number): boolean {
    const px = this.find(x);
    const py = this.find(y);
    if (px === py) return false;
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    return true;
  }

  /** Número de componentes distintas. */
  components(n: number): number {
    const roots = new Set<number>();
    for (let i = 0; i < n; i++) roots.add(this.find(i));
    return roots.size;
  }
}

// ─── Kruskal ─────────────────────────────────────────────────────────────────

function solveKruskal(raw: MstInput): MstResult {
  const nodes = raw.nodes.map(n => n.trim());
  const indexMap = new Map(nodes.map((n, i) => [n, i]));
  const n = nodes.length;

  const sorted = [...raw.edges].sort((a, b) => a.weight - b.weight);

  const uf = new UnionFind(n);
  const mstEdgeIds: string[] = [];
  let totalCost = 0;
  const steps: MstStep[] = [];

  // Paso 0: descripción del orden de procesamiento
  steps.push({
    id: 'k-init',
    iteration: 0,
    edgeId: null,
    edgeLabel: '',
    weight: 0,
    decision: 'info',
    reason:
      `Kruskal: ordenar ${sorted.length} arista${sorted.length !== 1 ? 's' : ''} por peso ` +
      `ascendente → [${sorted.map(e => `${e.from}–${e.to}:${e.weight}`).join(', ')}]. ` +
      `Componentes iniciales: ${n} (un componente por nodo).`,
    mstEdgeIds: [],
    accumulatedCost: 0,
  });

  let iter = 0;
  for (const edge of sorted) {
    iter++;
    const u = indexMap.get(edge.from.trim())!;
    const v = indexMap.get(edge.to.trim())!;
    const pu = uf.find(u);
    const pv = uf.find(v);

    if (pu !== pv) {
      // Agregar al árbol
      uf.union(u, v);
      mstEdgeIds.push(edge.id);
      totalCost += edge.weight;
      const compLeft = uf.components(n);
      steps.push({
        id: `k-${iter}`,
        iteration: iter,
        edgeId: edge.id,
        edgeLabel: `${edge.from} — ${edge.to}`,
        weight: edge.weight,
        decision: 'added',
        reason:
          `✓ Agregar ${edge.from}—${edge.to} (peso ${edge.weight}): ` +
          `conecta dos componentes distintas. ` +
          `Componentes restantes: ${compLeft}. Costo acumulado: ${totalCost}.`,
        mstEdgeIds: [...mstEdgeIds],
        accumulatedCost: totalCost,
      });
    } else {
      // Rechazar (formaría ciclo)
      steps.push({
        id: `k-${iter}`,
        iteration: iter,
        edgeId: edge.id,
        edgeLabel: `${edge.from} — ${edge.to}`,
        weight: edge.weight,
        decision: 'rejected',
        reason:
          `✗ Rechazar ${edge.from}—${edge.to} (peso ${edge.weight}): ` +
          `ambos nodos ya están en la misma componente → formaría un ciclo.`,
        mstEdgeIds: [...mstEdgeIds],
        accumulatedCost: totalCost,
      });
    }

    if (mstEdgeIds.length === n - 1) break;
  }

  const connected = uf.components(n) === 1;

  return {
    totalCost,
    mstEdgeIds,
    mstEdges: raw.edges.filter(e => mstEdgeIds.includes(e.id)),
    steps,
    connected,
    algorithm: 'kruskal',
  };
}

// ─── Prim ────────────────────────────────────────────────────────────────────

function solvePrim(raw: MstInput): MstResult {
  const nodes = raw.nodes.map(n => n.trim());
  const n = nodes.length;

  // Lista de adyacencia no dirigida
  type AdjEntry = { neighbor: string; weight: number; edgeId: string };
  const adj = new Map<string, AdjEntry[]>(nodes.map(nd => [nd, []]));

  raw.edges.forEach(e => {
    const f = e.from.trim();
    const t = e.to.trim();
    adj.get(f)?.push({ neighbor: t, weight: e.weight, edgeId: e.id });
    adj.get(t)?.push({ neighbor: f, weight: e.weight, edgeId: e.id });
  });

  const startNode =
    raw.startNode && nodes.includes(raw.startNode.trim())
      ? raw.startNode.trim()
      : nodes[0];

  const inMst = new Set<string>();
  const mstEdgeIds: string[] = [];
  let totalCost = 0;
  const steps: MstStep[] = [];

  inMst.add(startNode);

  steps.push({
    id: 'p-init',
    iteration: 0,
    edgeId: null,
    edgeLabel: '',
    weight: 0,
    decision: 'info',
    reason:
      `Prim: comenzar desde «${startNode}». Conjunto visitado inicial: {${startNode}}. ` +
      `En cada paso se elige la arista de mínimo peso que conecta un nodo visitado con uno no visitado.`,
    mstEdgeIds: [],
    accumulatedCost: 0,
  });

  let iter = 0;

  while (inMst.size < n) {
    // Encontrar arista de mínimo peso en el corte actual
    let minWeight = Infinity;
    let best: { from: string; to: string; weight: number; edgeId: string } | null = null;

    for (const visited of inMst) {
      for (const { neighbor, weight, edgeId } of adj.get(visited) ?? []) {
        if (!inMst.has(neighbor) && weight < minWeight) {
          minWeight = weight;
          best = { from: visited, to: neighbor, weight, edgeId };
        }
      }
    }

    if (!best) break; // grafo desconexo

    iter++;
    inMst.add(best.to);
    mstEdgeIds.push(best.edgeId);
    totalCost += best.weight;

    steps.push({
      id: `p-${iter}`,
      iteration: iter,
      edgeId: best.edgeId,
      edgeLabel: `${best.from} — ${best.to}`,
      weight: best.weight,
      decision: 'added',
      reason:
        `✓ Mínima arista del corte: ${best.from}—${best.to} (peso ${best.weight}). ` +
        `Conjunto visitado: {${[...inMst].join(', ')}}. ` +
        `Costo acumulado: ${totalCost}.`,
      mstEdgeIds: [...mstEdgeIds],
      accumulatedCost: totalCost,
    });
  }

  const connected = inMst.size === n;

  return {
    totalCost,
    mstEdgeIds,
    mstEdges: raw.edges.filter(e => mstEdgeIds.includes(e.id)),
    steps,
    connected,
    algorithm: 'prim',
  };
}

// ─── Punto de entrada ────────────────────────────────────────────────────────

export function solveMst(raw: MstInput): MstResult {
  const issues = validateMstInput(raw);
  if (issues.length) throw new MstError(issues[0]);
  return raw.algorithm === 'prim' ? solvePrim(raw) : solveKruskal(raw);
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export const MST_PRESETS: MstPreset[] = [
  {
    id: 'mst-7nodos',
    name: '7 ciudades · Kruskal',
    blurb: 'Red de 7 nodos; recorre ciclos y uniones. Costo óptimo 39.',
    enunciado:
      'Conectar 7 ciudades con la red de cables de mínimo costo. ' +
      'Aplicar Kruskal: ordenar aristas y agregar sin crear ciclos.',
    source: 'Ejemplo clásico IO · Redes',
    data: {
      nodes: ['1', '2', '3', '4', '5', '6', '7'],
      edges: [
        { id: 'e1',  from: '1', to: '2', weight: 7  },
        { id: 'e2',  from: '1', to: '4', weight: 5  },
        { id: 'e3',  from: '2', to: '3', weight: 8  },
        { id: 'e4',  from: '2', to: '4', weight: 9  },
        { id: 'e5',  from: '2', to: '5', weight: 7  },
        { id: 'e6',  from: '3', to: '5', weight: 5  },
        { id: 'e7',  from: '4', to: '5', weight: 15 },
        { id: 'e8',  from: '4', to: '6', weight: 6  },
        { id: 'e9',  from: '5', to: '6', weight: 8  },
        { id: 'e10', from: '5', to: '7', weight: 9  },
        { id: 'e11', from: '6', to: '7', weight: 11 },
      ],
      algorithm: 'kruskal',
      startNode: '1',
    },
    expectedTotalCost: 39,
  },
  {
    id: 'mst-6nodos',
    name: '6 nodos · Kruskal',
    blurb: '6 nodos, 11 aristas. Árbol recubridor de costo 16.',
    enunciado:
      'Red de 6 nodos. Encontrar el árbol de mínimo recorrido ' +
      'usando el algoritmo de Kruskal. Costo total esperado: 16.',
    source: 'IO Numeros_2 · Redes · Árbol MST',
    data: {
      nodes: ['1', '2', '3', '4', '5', '6'],
      edges: [
        { id: 'e1', from: '1', to: '2', weight: 6 },
        { id: 'e2', from: '1', to: '3', weight: 1 },
        { id: 'e3', from: '1', to: '4', weight: 5 },
        { id: 'e4', from: '2', to: '3', weight: 5 },
        { id: 'e5', from: '2', to: '4', weight: 3 },
        { id: 'e6', from: '2', to: '5', weight: 6 },
        { id: 'e7', from: '3', to: '4', weight: 5 },
        { id: 'e8', from: '3', to: '5', weight: 6 },
        { id: 'e9', from: '4', to: '5', weight: 3 },
        { id: 'e10', from: '4', to: '6', weight: 5 },
        { id: 'e11', from: '5', to: '6', weight: 4 },
      ],
      algorithm: 'kruskal',
      startNode: '1',
    },
    expectedTotalCost: 16,
  },
  {
    id: 'mst-prim-5',
    name: '5 nodos · Prim',
    blurb: 'Demo de Prim desde nodo 1. Muestra elección de mínimo corte.',
    enunciado:
      'Aplicar el algoritmo de Prim iniciando desde el nodo 1. ' +
      'En cada paso se elige la arista de menor peso hacia un nodo no visitado.',
    data: {
      nodes: ['1', '2', '3', '4', '5'],
      edges: [
        { id: 'e1', from: '1', to: '2', weight: 3 },
        { id: 'e2', from: '1', to: '3', weight: 6 },
        { id: 'e3', from: '2', to: '3', weight: 4 },
        { id: 'e4', from: '2', to: '4', weight: 5 },
        { id: 'e5', from: '3', to: '4', weight: 7 },
        { id: 'e6', from: '3', to: '5', weight: 9 },
        { id: 'e7', from: '4', to: '5', weight: 2 },
      ],
      algorithm: 'prim',
      startNode: '1',
    },
    expectedTotalCost: 14,
  },
  {
    id: 'mst-ciclo',
    name: 'Ciclos rechazados',
    blurb: 'Grafo denso: Kruskal rechaza varias aristas por ciclos.',
    enunciado:
      'Red con 4 nodos y 5 aristas (triángulo + rama). ' +
      'Kruskal muestra explícitamente qué aristas forman ciclos y se rechazan.',
    data: {
      nodes: ['A', 'B', 'C', 'D'],
      edges: [
        { id: 'e1', from: 'A', to: 'B', weight: 2 },
        { id: 'e2', from: 'A', to: 'C', weight: 3 },
        { id: 'e3', from: 'B', to: 'C', weight: 1 },
        { id: 'e4', from: 'B', to: 'D', weight: 4 },
        { id: 'e5', from: 'C', to: 'D', weight: 5 },
      ],
      algorithm: 'kruskal',
      startNode: 'A',
    },
    expectedTotalCost: 7,
  },
];
