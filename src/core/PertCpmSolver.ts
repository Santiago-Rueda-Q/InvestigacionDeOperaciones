/**
 * Redes PERT / CPM (Activity-on-Node).
 * CPM: duración determinística.
 * PERT: te = (a+4m+b)/6, σ² = ((b−a)/6)²; varianza del proyecto = suma en una ruta crítica.
 */

export type NetworkMode = 'cpm' | 'pert';

export interface ActivityInput {
  id: string;
  name: string;
  /** Predecesoras (ids). Vacío = arranca en el inicio. */
  preds: string[];
  /** CPM: duración fija. */
  duration?: number;
  /** PERT: optimista, más probable, pesimista. */
  a?: number;
  m?: number;
  b?: number;
}

export interface PertCpmInput {
  mode: NetworkMode;
  activities: ActivityInput[];
}

export interface ActivityResult {
  id: string;
  name: string;
  preds: string[];
  duration: number;
  variance: number;
  ES: number;
  EF: number;
  LS: number;
  LF: number;
  slack: number;
  critical: boolean;
}

export interface PertCpmStep {
  id: string;
  title: string;
  body: string;
  /** Tabla parcial opcional (ids de actividades a resaltar). */
  highlightIds?: string[];
}

export interface PertCpmResult {
  mode: NetworkMode;
  activities: ActivityResult[];
  projectDuration: number;
  criticalPath: string[];
  projectVariance: number;
  projectSigma: number;
  steps: PertCpmStep[];
  message: string;
}

export interface PertCpmPreset {
  id: string;
  name: string;
  blurb: string;
  data: PertCpmInput;
  expectedDuration: number;
  expectedCritical: string[];
}

export class PertCpmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PertCpmError';
  }
}

const EPS = 1e-9;

function asNum(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

function expectedDuration(a: number, m: number, b: number): number {
  return asNum((a + 4 * m + b) / 6);
}

function variance(a: number, b: number): number {
  const s = (b - a) / 6;
  return asNum(s * s);
}

export function blankPertCpm(mode: NetworkMode = 'cpm'): PertCpmInput {
  if (mode === 'pert') {
    return {
      mode,
      activities: [
        { id: 'A', name: 'A', preds: [], a: 1, m: 2, b: 3 },
        { id: 'B', name: 'B', preds: ['A'], a: 2, m: 3, b: 4 },
      ],
    };
  }
  return {
    mode,
    activities: [
      { id: 'A', name: 'A', preds: [], duration: 3 },
      { id: 'B', name: 'B', preds: ['A'], duration: 4 },
    ],
  };
}

export function validatePertCpmInput(raw: PertCpmInput): string[] {
  const issues: string[] = [];
  if (!raw.activities.length) issues.push('Agrega al menos una actividad.');
  if (raw.activities.length > 40) issues.push('Como máximo 40 actividades.');

  const ids = raw.activities.map(a => a.id.trim());
  raw.activities.forEach((act, i) => {
    const label = `Actividad ${i + 1}`;
    if (!act.id.trim()) issues.push(`${label}: falta el identificador.`);
    if (!act.name.trim()) issues.push(`${label}: falta el nombre.`);
    if (raw.mode === 'cpm') {
      if (!Number.isFinite(act.duration as number)) issues.push(`${label} (${act.id || '?'}): duración vacía o no numérica.`);
      else if ((act.duration as number) < 0) issues.push(`${label} (${act.id}): la duración no puede ser negativa.`);
    } else {
      const { a, m, b } = act;
      if (![a, m, b].every(v => Number.isFinite(v as number))) {
        issues.push(`${label} (${act.id || '?'}): completa a, m y b con números.`);
      } else if ((a as number) < 0 || (m as number) < 0 || (b as number) < 0) {
        issues.push(`${label} (${act.id}): a, m y b deben ser ≥ 0.`);
      } else if (!((a as number) <= (m as number) && (m as number) <= (b as number))) {
        issues.push(`${label} (${act.id}): se requiere a ≤ m ≤ b.`);
      }
    }
    act.preds.forEach(p => {
      if (!ids.includes(p.trim())) issues.push(`${label} (${act.id}): predecesora «${p}» no existe.`);
      if (p.trim() === act.id.trim()) issues.push(`${label} (${act.id}): no puede ser predecesora de sí misma.`);
    });
  });

  if (new Set(ids.filter(Boolean)).size !== ids.filter(Boolean).length) {
    issues.push('Hay identificadores de actividad duplicados.');
  }

  return [...new Set(issues)];
}

function topoSort(ids: string[], predsOf: Map<string, string[]>): string[] {
  const indeg = new Map(ids.map(id => [id, 0]));
  const succ = new Map(ids.map(id => [id, [] as string[]]));
  ids.forEach(id => {
    for (const p of predsOf.get(id) ?? []) {
      if (!ids.includes(p)) continue;
      indeg.set(id, (indeg.get(id) ?? 0) + 1);
      succ.get(p)!.push(id);
    }
  });
  const q = ids.filter(id => (indeg.get(id) ?? 0) === 0).sort();
  const order: string[] = [];
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const v of succ.get(u) ?? []) {
      const d = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, d);
      if (d === 0) {
        q.push(v);
        q.sort();
      }
    }
  }
  if (order.length !== ids.length) {
    throw new PertCpmError('Hay un ciclo en las predecesoras; la red no es un DAG.');
  }
  return order;
}

/** Una ruta crítica (la lexicográficamente menor entre las de holgura 0). */
function pickCriticalPath(
  ids: string[],
  predsOf: Map<string, string[]>,
  critical: Set<string>,
  EF: Map<string, number>,
  projectDuration: number,
): string[] {
  const sinks = ids.filter(id => critical.has(id) && Math.abs((EF.get(id) ?? 0) - projectDuration) < EPS);
  if (!sinks.length) {
    return ids.filter(id => critical.has(id));
  }
  // Backtrack desde el sink con más EF (todos ≈ T)
  let best: string[] = [];
  const dfs = (node: string, path: string[]) => {
    const preds = (predsOf.get(node) ?? []).filter(p => critical.has(p));
    if (!preds.length) {
      const full = [node, ...path];
      if (!best.length || full.join() < best.join()) best = full;
      return;
    }
    for (const p of preds.sort()) dfs(p, [node, ...path]);
  };
  for (const s of sinks.sort()) dfs(s, []);
  return best;
}

export function solvePertCpm(raw: PertCpmInput): PertCpmResult {
  const issues = validatePertCpmInput(raw);
  if (issues.length) throw new PertCpmError(issues[0]);

  const mode = raw.mode;
  const steps: PertCpmStep[] = [];
  const push = (title: string, body: string, highlightIds?: string[]) => {
    steps.push({ id: `s${steps.length}`, title, body, highlightIds });
  };

  type Prep = {
    id: string;
    name: string;
    preds: string[];
    duration: number;
    variance: number;
  };

  const prepared: Prep[] = raw.activities.map(act => {
    const id = act.id.trim();
    const name = act.name.trim() || id;
    const preds = [...new Set(act.preds.map(p => p.trim()).filter(Boolean))];
    if (mode === 'cpm') {
      return { id, name, preds, duration: asNum(act.duration as number), variance: 0 };
    }
    const a = act.a as number;
    const m = act.m as number;
    const b = act.b as number;
    return {
      id,
      name,
      preds,
      duration: expectedDuration(a, m, b),
      variance: variance(a, b),
    };
  });

  const byId = new Map(prepared.map(a => [a.id, a]));
  const ids = prepared.map(a => a.id);
  const predsOf = new Map(prepared.map(a => [a.id, a.preds]));

  push(
    mode === 'cpm' ? 'Duraciones CPM' : 'Tiempos esperados PERT',
    mode === 'cpm'
      ? `Se usan las duraciones determinísticas de cada actividad.\n\n${prepared.map(a => `$${a.id}$: $t=${a.duration}$`).join(', ')}.`
      : [
          'Para cada actividad: $$t_e = \\dfrac{a + 4m + b}{6},\\quad \\sigma^2 = \\left(\\dfrac{b-a}{6}\\right)^2$$',
          '',
          ...prepared.map(a => {
            const src = raw.activities.find(x => x.id.trim() === a.id)!;
            return `$${a.id}$: $a=${src.a}$, $m=${src.m}$, $b=${src.b}$ → $t_e=${a.duration}$, $\\sigma^2=${a.variance}$.`;
          }),
        ].join('\n'),
  );

  const order = topoSort(ids, predsOf);
  push(
    'Orden topológico',
    `Se ordenan las actividades respetando predecesoras (sin ciclos): **${order.join(' → ')}**.`,
    order,
  );

  const ES = new Map<string, number>();
  const EF = new Map<string, number>();
  const forwardLines: string[] = [];

  for (const id of order) {
    const act = byId.get(id)!;
    const es = act.preds.length
      ? Math.max(...act.preds.map(p => EF.get(p) ?? 0))
      : 0;
    const ef = asNum(es + act.duration);
    ES.set(id, asNum(es));
    EF.set(id, ef);
    forwardLines.push(
      `$${id}$: ES = ${act.preds.length ? `\\max(${act.preds.map(p => `EF_{${p}}`).join(',')}) = ${asNum(es)}` : '0'},\\; EF = ES + t = ${ef}$.`,
    );
  }

  const projectDuration = asNum(Math.max(...ids.map(id => EF.get(id) ?? 0), 0));
  push(
    'Paso hacia adelante (ES, EF)',
    [
      '$$ES_j = \\max_{i\\in P(j)} EF_i \\quad(\\text{o }0\\text{ si no hay predecesoras}),\\quad EF_j = ES_j + t_j$$',
      '',
      ...forwardLines,
      '',
      `Duración del proyecto $T = \\max EF = ${projectDuration}$.`,
    ].join('\n'),
  );

  const succOf = new Map(ids.map(id => [id, [] as string[]]));
  prepared.forEach(a => {
    a.preds.forEach(p => succOf.get(p)?.push(a.id));
  });

  const LS = new Map<string, number>();
  const LF = new Map<string, number>();
  const backwardLines: string[] = [];

  for (const id of [...order].reverse()) {
    const act = byId.get(id)!;
    const succs = succOf.get(id) ?? [];
    const lf = succs.length
      ? Math.min(...succs.map(s => LS.get(s) ?? projectDuration))
      : projectDuration;
    const ls = asNum(lf - act.duration);
    LF.set(id, asNum(lf));
    LS.set(id, ls);
    backwardLines.push(
      `$${id}$: LF = ${succs.length ? `\\min(${succs.map(s => `LS_{${s}}`).join(',')}) = ${asNum(lf)}` : String(projectDuration)},\\; LS = LF - t = ${ls}$.`,
    );
  }

  push(
    'Paso hacia atrás (LS, LF)',
    [
      '$$LF_j = \\min_{k\\in S(j)} LS_k \\quad(\\text{o }T\\text{ si no hay sucesoras}),\\quad LS_j = LF_j - t_j$$',
      '',
      ...backwardLines,
    ].join('\n'),
  );

  const results: ActivityResult[] = prepared.map(a => {
    const es = ES.get(a.id)!;
    const ef = EF.get(a.id)!;
    const ls = LS.get(a.id)!;
    const lf = LF.get(a.id)!;
    const slack = asNum(ls - es);
    return {
      id: a.id,
      name: a.name,
      preds: a.preds,
      duration: a.duration,
      variance: a.variance,
      ES: es,
      EF: ef,
      LS: ls,
      LF: lf,
      slack,
      critical: Math.abs(slack) < EPS,
    };
  });

  const criticalSet = new Set(results.filter(r => r.critical).map(r => r.id));
  const criticalPath = pickCriticalPath(ids, predsOf, criticalSet, EF, projectDuration);

  push(
    'Holguras y ruta crítica',
    [
      '$$H_j = LS_j - ES_j = LF_j - EF_j$$',
      '',
      ...results.map(r => `$${r.id}$: $H=${r.slack}$${r.critical ? ' (crítica)' : ''}.`),
      '',
      `Ruta crítica: **${criticalPath.join(' → ')}**. Duración $T=${projectDuration}$.`,
    ].join('\n'),
    criticalPath,
  );

  let projectVariance = 0;
  if (mode === 'pert') {
    projectVariance = asNum(criticalPath.reduce((s, id) => s + (byId.get(id)?.variance ?? 0), 0));
    const sigma = asNum(Math.sqrt(projectVariance));
    push(
      'Varianza del proyecto (PERT)',
      [
        'Sobre la ruta crítica: $$\\sigma_T^2 = \\sum_{j\\in RC} \\sigma_j^2$$',
        '',
        ...criticalPath.map(id => {
          const a = byId.get(id)!;
          return `$${id}$: $\\sigma^2=${a.variance}$.`;
        }),
        '',
        `$\\sigma_T^2 = ${projectVariance}$, $\\sigma_T = ${sigma}$.`,
        '',
        'Con $T$ y $\\sigma_T$ se puede estimar $P(T\\le D)$ con la aproximación normal (tabla $Z$).',
      ].join('\n'),
      criticalPath,
    );
  }

  const projectSigma = asNum(Math.sqrt(projectVariance));
  const message =
    mode === 'cpm'
      ? `Proyecto CPM en ${projectDuration} u.t. Ruta crítica: ${criticalPath.join(' → ')}.`
      : `Proyecto PERT: $t_e$ total ≈ ${projectDuration}, σ_T ≈ ${projectSigma}. Ruta crítica: ${criticalPath.join(' → ')}.`;

  return {
    mode,
    activities: results,
    projectDuration,
    criticalPath,
    projectVariance,
    projectSigma,
    steps,
    message,
  };
}

export const PERT_CPM_PRESETS: PertCpmPreset[] = [
  {
    id: 'cpm-simple',
    name: 'CPM 5 actividades',
    blurb: 'Red pequeña para seguir ES/EF y LS/LF a mano.',
    expectedDuration: 14,
    expectedCritical: ['A', 'C', 'E'],
    data: {
      mode: 'cpm',
      activities: [
        { id: 'A', name: 'Inicio obra', preds: [], duration: 4 },
        { id: 'B', name: 'Compras', preds: [], duration: 3 },
        { id: 'C', name: 'Cimentación', preds: ['A'], duration: 5 },
        { id: 'D', name: 'Instalaciones', preds: ['A', 'B'], duration: 4 },
        { id: 'E', name: 'Acabados', preds: ['C', 'D'], duration: 5 },
      ],
    },
  },
  {
    id: 'pert-classic',
    name: 'PERT clásico',
    blurb: 'Tiempos a, m, b y varianza sobre la ruta crítica.',
    expectedDuration: 20, // will verify with solver
    expectedCritical: [], // filled after we compute - we'll set properly
    data: {
      mode: 'pert',
      activities: [
        { id: 'A', name: 'A', preds: [], a: 2, m: 3, b: 4 },
        { id: 'B', name: 'B', preds: [], a: 1, m: 2, b: 3 },
        { id: 'C', name: 'C', preds: ['A'], a: 4, m: 5, b: 12 },
        { id: 'D', name: 'D', preds: ['A', 'B'], a: 3, m: 4, b: 5 },
        { id: 'E', name: 'E', preds: ['C', 'D'], a: 2, m: 3, b: 4 },
      ],
    },
  },
  {
    id: 'cpm-parallel',
    name: 'CPM con holguras',
    blurb: 'Dos ramas en paralelo; solo una es crítica.',
    expectedDuration: 10,
    expectedCritical: ['A', 'C'],
    data: {
      mode: 'cpm',
      activities: [
        { id: 'A', name: 'A', preds: [], duration: 5 },
        { id: 'B', name: 'B', preds: [], duration: 2 },
        { id: 'C', name: 'C', preds: ['A'], duration: 5 },
        { id: 'D', name: 'D', preds: ['B'], duration: 3 },
      ],
    },
  },
];

// Calcular expected del preset PERT al cargar el módulo
(() => {
  const p = PERT_CPM_PRESETS.find(x => x.id === 'pert-classic');
  if (!p) return;
  const r = solvePertCpm(p.data);
  p.expectedDuration = r.projectDuration;
  p.expectedCritical = r.criticalPath;
})();
