/**
 * Flujo máximo: Edmonds–Karp (Ford–Fulkerson + BFS).
 */

export interface FlowEdgeInput {
  id: string;
  from: string;
  to: string;
  capacity: number;
}

export interface MaxFlowInput {
  nodes: string[];
  edges: FlowEdgeInput[];
  source: string;
  sink: string;
}

export interface FlowEdgeState {
  id: string;
  from: string;
  to: string;
  capacity: number;
  flow: number;
}

export interface AugmentStep {
  id: string;
  iteration: number;
  path: string[];
  bottleneck: number;
  residualHint: string;
  edgeFlows: FlowEdgeState[];
  totalFlow: number;
}

export interface MinCut {
  sourceSide: string[];
  sinkSide: string[];
  cutEdges: { from: string; to: string; capacity: number }[];
  capacity: number;
}

export interface MaxFlowResult {
  maxFlow: number;
  edges: FlowEdgeState[];
  steps: AugmentStep[];
  minCut: MinCut;
  unreachable: boolean;
}

export class FlowError extends Error {}

const EPS = 1e-9;

function asNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new FlowError('Número inválido en la red.');
  return Math.abs(n) < EPS ? 0 : Math.round(n * 1e9) / 1e9;
}

export function validateMaxFlowInput(raw: MaxFlowInput): string[] {
  const issues: string[] = [];
  if (raw.nodes.length < 2) issues.push('La red necesita al menos dos nodos.');
  raw.nodes.forEach((n, i) => {
    if (!n.trim()) issues.push(`El nodo ${i + 1} no tiene nombre.`);
  });
  if (new Set(raw.nodes.map(n => n.trim()).filter(Boolean)).size !== raw.nodes.filter(n => n.trim()).length) {
    issues.push('Hay nodos con el mismo nombre.');
  }
  if (!raw.nodes.includes(raw.source)) issues.push(`El origen «${raw.source || '—'}» no está en la lista de nodos.`);
  if (!raw.nodes.includes(raw.sink)) issues.push(`El destino «${raw.sink || '—'}» no está en la lista de nodos.`);
  if (raw.source === raw.sink) issues.push('El origen y el destino deben ser distintos.');
  if (!raw.edges.length) issues.push('Agrega al menos una arista con capacidad.');
  const seen = new Set<string>();
  raw.edges.forEach((e, i) => {
    const label = `Arista ${i + 1} (${e.from || '?'} → ${e.to || '?'})`;
    if (!raw.nodes.includes(e.from) || !raw.nodes.includes(e.to)) issues.push(`${label}: extremos inválidos.`);
    if (e.from === e.to) issues.push(`${label}: no se admiten bucles.`);
    if (!Number.isFinite(e.capacity)) issues.push(`${label}: la capacidad está vacía o no es numérica.`);
    else if (e.capacity < 0) issues.push(`${label}: la capacidad no puede ser negativa.`);
    const key = `${e.from.trim()}→${e.to.trim()}`;
    if (e.from.trim() && e.to.trim()) {
      if (seen.has(key)) issues.push(`Hay aristas paralelas ${key}. Fusiona capacidades o elimina el duplicado.`);
      seen.add(key);
    }
  });
  return [...new Set(issues)];
}

export function blankMaxFlow(): MaxFlowInput {
  return {
    nodes: ['s', 't'],
    source: 's',
    sink: 't',
    edges: [{ id: 'e1', from: 's', to: 't', capacity: 0 }],
  };
}

/** Conservación de flujo en nodos intermedios (entrada − salida ≈ 0). */
export function checkFlowConservation(
  nodes: string[],
  edges: { from: string; to: string; flow: number }[],
  source: string,
  sink: string,
): { node: string; net: number; ok: boolean }[] {
  return nodes
    .filter(n => n !== source && n !== sink)
    .map(node => {
      const inn = edges.filter(e => e.to === node).reduce((s, e) => s + e.flow, 0);
      const out = edges.filter(e => e.from === node).reduce((s, e) => s + e.flow, 0);
      const net = Math.round((inn - out) * 1e9) / 1e9;
      return { node, net, ok: Math.abs(net) < 1e-6 };
    });
}

interface ResidualArc {
  to: number;
  rev: number;
  cap: number;
  edgeId: string | null;
  forward: boolean;
}

export function solveMaxFlow(raw: MaxFlowInput): MaxFlowResult {
  const issues = validateMaxFlowInput(raw);
  if (issues.length) throw new FlowError(issues[0]);

  const nodes = raw.nodes.map(n => n.trim());
  const index = new Map(nodes.map((n, i) => [n, i]));
  const m = nodes.length;
  const source = index.get(raw.source.trim())!;
  const sink = index.get(raw.sink.trim())!;

  const adj: ResidualArc[][] = Array.from({ length: m }, () => []);
  const edgeFlows = raw.edges.map(e => ({
    id: e.id,
    from: e.from.trim(),
    to: e.to.trim(),
    capacity: asNum(e.capacity),
    flow: 0,
  }));

  const addArc = (u: number, v: number, cap: number, edgeId: string | null, forward: boolean) => {
    const a: ResidualArc = { to: v, rev: adj[v].length, cap, edgeId, forward };
    const b: ResidualArc = { to: u, rev: adj[u].length, cap: 0, edgeId, forward: !forward };
    adj[u].push(a);
    adj[v].push(b);
  };

  edgeFlows.forEach(e => {
    addArc(index.get(e.from)!, index.get(e.to)!, e.capacity, e.id, true);
  });

  const snapshot = (): FlowEdgeState[] => edgeFlows.map(e => ({ ...e }));
  const steps: AugmentStep[] = [];
  let totalFlow = 0;
  let iter = 0;

  const bfs = (): { parent: (number | null)[]; parentArc: (number | null)[]; bottleneck: number } | null => {
    const parent = Array<number | null>(m).fill(null);
    const parentArc = Array<number | null>(m).fill(null);
    const queue = [source];
    parent[source] = source;
    while (queue.length) {
      const u = queue.shift()!;
      for (let ai = 0; ai < adj[u].length; ai++) {
        const arc = adj[u][ai];
        if (arc.cap > EPS && parent[arc.to] === null) {
          parent[arc.to] = u;
          parentArc[arc.to] = ai;
          if (arc.to === sink) {
            let bottle = Infinity;
            let v = sink;
            while (v !== source) {
              const p = parent[v]!;
              const a = adj[p][parentArc[v]!];
              bottle = Math.min(bottle, a.cap);
              v = p;
            }
            return { parent, parentArc, bottleneck: asNum(bottle) };
          }
          queue.push(arc.to);
        }
      }
    }
    return null;
  };

  while (true) {
    const found = bfs();
    if (!found) break;
    iter += 1;
    const { parent, parentArc, bottleneck } = found;
    const pathIdx: number[] = [];
    let v = sink;
    while (v !== source) {
      pathIdx.push(v);
      v = parent[v]!;
    }
    pathIdx.push(source);
    pathIdx.reverse();

    v = sink;
    while (v !== source) {
      const p = parent[v]!;
      const ai = parentArc[v]!;
      const arc = adj[p][ai];
      arc.cap = asNum(arc.cap - bottleneck);
      adj[v][arc.rev].cap = asNum(adj[v][arc.rev].cap + bottleneck);
      if (arc.edgeId !== null && arc.forward) {
        const edge = edgeFlows.find(e => e.id === arc.edgeId)!;
        edge.flow = asNum(edge.flow + bottleneck);
      } else if (arc.edgeId !== null && !arc.forward) {
        const edge = edgeFlows.find(e => e.id === arc.edgeId)!;
        edge.flow = asNum(edge.flow - bottleneck);
      }
      v = p;
    }

    totalFlow = asNum(totalFlow + bottleneck);
    const pathNames = pathIdx.map(i => nodes[i]);
    steps.push({
      id: `aug-${iter}`,
      iteration: iter,
      path: pathNames,
      bottleneck,
      residualHint: `Camino ${pathNames.join(' → ')}. Se envían ${bottleneck} unidades (mínima capacidad residual del camino).`,
      edgeFlows: snapshot(),
      totalFlow,
    });
  }

  // Min cut: nodos alcanzables desde source en residual
  const reachable = new Set<number>();
  const q = [source];
  reachable.add(source);
  while (q.length) {
    const u = q.shift()!;
    for (const arc of adj[u]) {
      if (arc.cap > EPS && !reachable.has(arc.to)) {
        reachable.add(arc.to);
        q.push(arc.to);
      }
    }
  }

  const sourceSide = nodes.filter((_, i) => reachable.has(i));
  const sinkSide = nodes.filter((_, i) => !reachable.has(i));
  const cutEdges: MinCut['cutEdges'] = [];
  let cutCap = 0;
  edgeFlows.forEach(e => {
    const u = index.get(e.from)!;
    const v = index.get(e.to)!;
    if (reachable.has(u) && !reachable.has(v)) {
      cutEdges.push({ from: e.from, to: e.to, capacity: e.capacity });
      cutCap = asNum(cutCap + e.capacity);
    }
  });

  return {
    maxFlow: totalFlow,
    edges: snapshot(),
    steps,
    minCut: { sourceSide, sinkSide, cutEdges, capacity: cutCap },
    unreachable: totalFlow === 0 && steps.length === 0,
  };
}

export interface MaxFlowPreset {
  id: string;
  name: string;
  blurb: string;
  enunciado: string;
  data: MaxFlowInput;
  expectedFlow: number;
}

export const MAX_FLOW_PRESETS: MaxFlowPreset[] = [
  {
    id: 'mf-classic',
    name: 'Red clásica (flujo 23)',
    blurb: 'Ejemplo estándar de Edmonds–Karp.',
    enunciado: 'Calcular el flujo máximo de s a t.',
    data: {
      nodes: ['s', 'a', 'b', 'c', 'd', 't'],
      source: 's',
      sink: 't',
      edges: [
        { id: 'e1', from: 's', to: 'a', capacity: 16 },
        { id: 'e2', from: 's', to: 'b', capacity: 13 },
        { id: 'e3', from: 'a', to: 'b', capacity: 10 },
        { id: 'e4', from: 'a', to: 'c', capacity: 12 },
        { id: 'e5', from: 'b', to: 'a', capacity: 4 },
        { id: 'e6', from: 'b', to: 'd', capacity: 14 },
        { id: 'e7', from: 'c', to: 'b', capacity: 9 },
        { id: 'e8', from: 'c', to: 't', capacity: 20 },
        { id: 'e9', from: 'd', to: 'c', capacity: 7 },
        { id: 'e10', from: 'd', to: 't', capacity: 4 },
      ],
    },
    expectedFlow: 23,
  },
  {
    id: 'mf-diamond',
    name: 'Diamante simple',
    blurb: 'Dos caminos en paralelo.',
    enunciado: 'Origen A, destino D. Dos rutas A→B→D y A→C→D.',
    data: {
      nodes: ['A', 'B', 'C', 'D'],
      source: 'A',
      sink: 'D',
      edges: [
        { id: 'e1', from: 'A', to: 'B', capacity: 5 },
        { id: 'e2', from: 'A', to: 'C', capacity: 7 },
        { id: 'e3', from: 'B', to: 'D', capacity: 4 },
        { id: 'e4', from: 'C', to: 'D', capacity: 6 },
        { id: 'e5', from: 'B', to: 'C', capacity: 3 },
      ],
    },
    expectedFlow: 10,
  },
  {
    id: 'mf-blocked',
    name: 'Sin camino útil',
    blurb: 'Capacidad cero bloquea el destino.',
    enunciado: 'Hay aristas, pero no se puede enviar flujo a t.',
    data: {
      nodes: ['s', 'x', 't'],
      source: 's',
      sink: 't',
      edges: [
        { id: 'e1', from: 's', to: 'x', capacity: 8 },
        { id: 'e2', from: 'x', to: 't', capacity: 0 },
      ],
    },
    expectedFlow: 0,
  },
];
