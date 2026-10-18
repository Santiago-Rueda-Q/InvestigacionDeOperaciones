/**
 * Flujo a costo mínimo: caminos aumentantes de menor costo
 * con Bellman–Ford sobre la red residual (admite costos residuales negativos).
 *
 * Limitación: no se admiten ciclos de costo negativo en la red original
 * (capacidades > 0 con ciclo de costo negativo).
 */

export interface MinCostEdgeInput {
  id: string;
  from: string;
  to: string;
  capacity: number;
  cost: number;
}

export interface MinCostFlowInput {
  nodes: string[];
  edges: MinCostEdgeInput[];
  source: string;
  sink: string;
  demand: number;
}

export interface MinCostEdgeState {
  id: string;
  from: string;
  to: string;
  capacity: number;
  cost: number;
  flow: number;
}

export interface MinCostStep {
  id: string;
  iteration: number;
  path: string[];
  pathCost: number;
  amount: number;
  sentSoFar: number;
  totalCostSoFar: number;
  hint: string;
  edges: MinCostEdgeState[];
}

export interface MinCostFlowResult {
  complete: boolean;
  sent: number;
  demand: number;
  totalCost: number;
  edges: MinCostEdgeState[];
  steps: MinCostStep[];
  message: string;
}

export class MinCostFlowError extends Error {}

const EPS = 1e-9;
const INF = 1e15;

function asNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new MinCostFlowError('Número inválido.');
  return Math.abs(n) < EPS ? 0 : Math.round(n * 1e9) / 1e9;
}

/**
 * Costos negativos permitidos si no hay ciclos negativos con capacidad > 0
 * (el solver lo detecta al ejecutar). Capacidades deben ser ≥ 0.
 */
export function validateMinCostInput(raw: MinCostFlowInput): string[] {
  const issues: string[] = [];
  if (raw.nodes.length < 2) issues.push('La red necesita al menos dos nodos.');
  raw.nodes.forEach((n, i) => {
    if (!n.trim()) issues.push(`El nodo ${i + 1} no tiene nombre.`);
  });
  if (new Set(raw.nodes.map(n => n.trim()).filter(Boolean)).size !== raw.nodes.filter(n => n.trim()).length) {
    issues.push('Hay nodos duplicados.');
  }
  if (!raw.nodes.includes(raw.source)) issues.push(`El origen «${raw.source || '—'}» no existe.`);
  if (!raw.nodes.includes(raw.sink)) issues.push(`El destino «${raw.sink || '—'}» no existe.`);
  if (raw.source === raw.sink) issues.push('Origen y destino deben ser distintos.');
  if (!Number.isFinite(raw.demand)) issues.push('La cantidad de flujo está vacía o no es numérica.');
  else if (raw.demand < 0) issues.push('La cantidad de flujo debe ser ≥ 0.');
  if (!raw.edges.length) issues.push('Agrega al menos una arista.');
  const seen = new Set<string>();
  raw.edges.forEach((e, i) => {
    const label = `Arista ${i + 1} (${e.from || '?'} → ${e.to || '?'})`;
    if (!raw.nodes.includes(e.from) || !raw.nodes.includes(e.to)) issues.push(`${label}: extremos inválidos.`);
    if (e.from === e.to) issues.push(`${label}: no se admiten bucles.`);
    if (!Number.isFinite(e.capacity)) issues.push(`${label}: capacidad vacía o no numérica.`);
    else if (e.capacity < 0) issues.push(`${label}: la capacidad no puede ser negativa.`);
    if (!Number.isFinite(e.cost)) issues.push(`${label}: costo vacío o no numérico.`);
    const key = `${e.from.trim()}→${e.to.trim()}`;
    if (e.from.trim() && e.to.trim()) {
      if (seen.has(key)) issues.push(`Aristas paralelas ${key}: fusiona o elimina el duplicado.`);
      seen.add(key);
    }
  });
  return [...new Set(issues)];
}

export function blankMinCostFlow(): MinCostFlowInput {
  return {
    nodes: ['s', 't'],
    source: 's',
    sink: 't',
    demand: 1,
    edges: [{ id: 'e1', from: 's', to: 't', capacity: 1, cost: 1 }],
  };
}

interface ResArc {
  to: number;
  rev: number;
  cap: number;
  cost: number;
  edgeId: string | null;
  forward: boolean;
}

export function solveMinCostFlow(raw: MinCostFlowInput): MinCostFlowResult {
  const issues = validateMinCostInput(raw);
  if (issues.length) throw new MinCostFlowError(issues[0]);

  const demand = asNum(raw.demand);
  const nodes = raw.nodes.map(n => n.trim());
  const index = new Map(nodes.map((n, i) => [n, i]));
  const m = nodes.length;
  const source = index.get(raw.source.trim())!;
  const sink = index.get(raw.sink.trim())!;

  const edgeStates: MinCostEdgeState[] = raw.edges.map(e => ({
    id: e.id,
    from: e.from.trim(),
    to: e.to.trim(),
    capacity: asNum(e.capacity),
    cost: asNum(e.cost),
    flow: 0,
  }));

  const adj: ResArc[][] = Array.from({ length: m }, () => []);
  const add = (u: number, v: number, cap: number, cost: number, edgeId: string | null, forward: boolean) => {
    const a: ResArc = { to: v, rev: adj[v].length, cap, cost, edgeId, forward };
    const b: ResArc = { to: u, rev: adj[u].length, cap: 0, cost: -cost, edgeId, forward: !forward };
    adj[u].push(a);
    adj[v].push(b);
  };

  edgeStates.forEach(e => add(index.get(e.from)!, index.get(e.to)!, e.capacity, e.cost, e.id, true));

  // Detect negative cycle reachable with positive capacity in original graph (unsafe)
  {
    const dist = Array(m).fill(0);
    let updated = false;
    for (let k = 0; k < m; k++) {
      updated = false;
      for (let u = 0; u < m; u++) {
        for (const arc of adj[u]) {
          if (arc.cap > EPS && arc.forward && dist[u] + arc.cost < dist[arc.to] - EPS) {
            dist[arc.to] = dist[u] + arc.cost;
            updated = true;
          }
        }
      }
    }
    if (updated) {
      throw new MinCostFlowError('La red tiene un ciclo de costo negativo con capacidad positiva; este algoritmo no lo resuelve de forma segura.');
    }
  }

  const snap = () => edgeStates.map(e => ({ ...e }));
  const steps: MinCostStep[] = [];
  let sent = 0;
  let totalCost = 0;
  let iter = 0;

  if (demand === 0) {
    return {
      complete: true,
      sent: 0,
      demand: 0,
      totalCost: 0,
      edges: snap(),
      steps: [],
      message: 'La cantidad solicitada es 0; no hace falta enviar flujo.',
    };
  }

  while (sent + EPS < demand) {
    const dist = Array(m).fill(INF);
    const parent = Array<number | null>(m).fill(null);
    const parentArc = Array<number | null>(m).fill(null);
    dist[source] = 0;

    for (let k = 0; k < m - 1; k++) {
      let changed = false;
      for (let u = 0; u < m; u++) {
        if (dist[u] >= INF / 2) continue;
        for (let ai = 0; ai < adj[u].length; ai++) {
          const arc = adj[u][ai];
          if (arc.cap <= EPS) continue;
          const nd = dist[u] + arc.cost;
          if (nd < dist[arc.to] - EPS) {
            dist[arc.to] = nd;
            parent[arc.to] = u;
            parentArc[arc.to] = ai;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    // residual negative cycle
    for (let u = 0; u < m; u++) {
      if (dist[u] >= INF / 2) continue;
      for (const arc of adj[u]) {
        if (arc.cap > EPS && dist[u] + arc.cost < dist[arc.to] - EPS) {
          throw new MinCostFlowError('Apareció un ciclo de costo negativo en la red residual.');
        }
      }
    }

    if (dist[sink] >= INF / 2) break;

    let bottle = asNum(demand - sent);
    let v = sink;
    const pathNodes: number[] = [sink];
    while (v !== source) {
      const p = parent[v]!;
      const ai = parentArc[v]!;
      bottle = Math.min(bottle, adj[p][ai].cap);
      v = p;
      pathNodes.push(v);
    }
    pathNodes.reverse();
    bottle = asNum(bottle);
    if (bottle <= EPS) break;

    v = sink;
    while (v !== source) {
      const p = parent[v]!;
      const ai = parentArc[v]!;
      const arc = adj[p][ai];
      arc.cap = asNum(arc.cap - bottle);
      adj[v][arc.rev].cap = asNum(adj[v][arc.rev].cap + bottle);
      if (arc.edgeId !== null) {
        const edge = edgeStates.find(e => e.id === arc.edgeId)!;
        edge.flow = asNum(edge.flow + (arc.forward ? bottle : -bottle));
      }
      v = p;
    }

    const pathCost = asNum(dist[sink]);
    const addCost = asNum(pathCost * bottle);
    sent = asNum(sent + bottle);
    totalCost = asNum(totalCost + addCost);
    iter += 1;
    const names = pathNodes.map(i => nodes[i]);
    steps.push({
      id: `mc-${iter}`,
      iteration: iter,
      path: names,
      pathCost,
      amount: bottle,
      sentSoFar: sent,
      totalCostSoFar: totalCost,
      hint: `Camino de menor costo ${names.join(' → ')} (costo unitario del camino ${pathCost}). Se envían ${bottle} unidades; costo añadido ${addCost}.`,
      edges: snap(),
    });
  }

  // Recompute total cost from final flows (ignore numerical drift)
  totalCost = asNum(edgeStates.reduce((s, e) => s + e.flow * e.cost, 0));
  const complete = sent + EPS >= demand;

  return {
    complete,
    sent,
    demand,
    totalCost,
    edges: snap(),
    steps,
    message: complete
      ? `Se enviaron ${sent} unidades al costo total ${totalCost}.`
      : `Solo se pudieron enviar ${sent} de ${demand} unidades. No hay capacidad suficiente; la solución es incompleta.`,
  };
}

export interface MinCostPreset {
  id: string;
  name: string;
  blurb: string;
  enunciado: string;
  data: MinCostFlowInput;
  expectedSent: number;
  expectedCost: number;
  expectComplete: boolean;
}

export const MIN_COST_PRESETS: MinCostPreset[] = [
  {
    id: 'mc-simple',
    name: 'Dos caminos',
    blurb: 'Elige el camino más barato primero.',
    enunciado: 'Enviar 5 unidades de s a t al menor costo.',
    data: {
      nodes: ['s', 'a', 'b', 't'],
      source: 's',
      sink: 't',
      demand: 5,
      edges: [
        { id: 'e1', from: 's', to: 'a', capacity: 4, cost: 2 },
        { id: 'e2', from: 's', to: 'b', capacity: 3, cost: 5 },
        { id: 'e3', from: 'a', to: 't', capacity: 4, cost: 3 },
        { id: 'e4', from: 'b', to: 't', capacity: 3, cost: 1 },
        { id: 'e5', from: 'a', to: 'b', capacity: 2, cost: 1 },
      ],
    },
    // Óptimo verificado: usar s→a→b→t y s→a→t; costo total 24.
    expectedSent: 5,
    expectedCost: 24,
    expectComplete: true,
  },
  {
    id: 'mc-short',
    name: 'Camino único',
    blurb: 'Una sola ruta s→m→t.',
    enunciado: 'Enviar 3 unidades por el único camino.',
    data: {
      nodes: ['s', 'm', 't'],
      source: 's',
      sink: 't',
      demand: 3,
      edges: [
        { id: 'e1', from: 's', to: 'm', capacity: 5, cost: 4 },
        { id: 'e2', from: 'm', to: 't', capacity: 3, cost: 2 },
      ],
    },
    expectedSent: 3,
    expectedCost: 18, // 3*(4+2)
    expectComplete: true,
  },
  {
    id: 'mc-insuff',
    name: 'Capacidad insuficiente',
    blurb: 'No se puede completar el envío.',
    enunciado: 'Se piden 10 unidades pero la red solo admite 4.',
    data: {
      nodes: ['s', 't'],
      source: 's',
      sink: 't',
      demand: 10,
      edges: [
        { id: 'e1', from: 's', to: 't', capacity: 4, cost: 3 },
      ],
    },
    expectedSent: 4,
    expectedCost: 12,
    expectComplete: false,
  },
];
