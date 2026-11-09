/**
 * Programación Dinámica — dos modos pedagógicos:
 * 1) Ruta más corta por etapas (forward/backward recursion)
 * 2) Mochila 0-1 (asignación de recursos por etapas/ítems)
 */

export type DinamicaMode = 'ruta' | 'mochila';

export interface RutaArc {
  from: string;
  to: string;
  cost: number;
}

export interface RutaInput {
  mode: 'ruta';
  stages: string[][]; // nodos por etapa (índice 0 = origen)
  arcs: RutaArc[];
  sense: 'min' | 'max';
}

export interface MochilaItem {
  id: string;
  name: string;
  weight: number;
  value: number;
}

export interface MochilaInput {
  mode: 'mochila';
  capacity: number;
  items: MochilaItem[];
}

export type DinamicaInput = RutaInput | MochilaInput;

export interface DinamicaStep {
  id: string;
  title: string;
  content: string;
  table?: { headers: string[]; rows: string[][] };
}

export interface DinamicaResult {
  mode: DinamicaMode;
  optimalValue: number;
  policy: string[];
  steps: DinamicaStep[];
  feasible: boolean;
}

export interface DinamicaPreset {
  id: string;
  name: string;
  blurb: string;
  data: DinamicaInput;
  expectedValue: number;
}

export class DinamicaError extends Error {}

const fmt = (v: number) => {
  const r = Math.round(v * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '');
};

export function validateDinamicaInput(raw: DinamicaInput): string[] {
  const issues: string[] = [];
  if (raw.mode === 'ruta') {
    if (!raw.stages?.length || raw.stages.some(s => !s.length)) {
      issues.push('Cada etapa debe tener al menos un nodo.');
    }
    if (!raw.arcs?.length) issues.push('Se requieren arcos entre etapas.');
    for (const a of raw.arcs ?? []) {
      if (!Number.isFinite(a.cost)) issues.push(`Costo inválido en ${a.from}→${a.to}.`);
    }
  } else {
    if (!(raw.capacity >= 0) || !Number.isFinite(raw.capacity)) {
      issues.push('La capacidad debe ser un número ≥ 0.');
    }
    if (!raw.items?.length) issues.push('Agrega al menos un ítem.');
    for (const it of raw.items ?? []) {
      if (!(it.weight > 0) || !(it.value >= 0) || !Number.isFinite(it.weight) || !Number.isFinite(it.value)) {
        issues.push(`Ítem "${it.name || it.id}": peso > 0 y valor ≥ 0.`);
      }
    }
  }
  return issues;
}

export function blankDinamica(mode: DinamicaMode = 'ruta'): DinamicaInput {
  if (mode === 'mochila') {
    return {
      mode: 'mochila',
      capacity: 5,
      items: [
        { id: '1', name: 'A', weight: 2, value: 3 },
        { id: '2', name: 'B', weight: 3, value: 4 },
        { id: '3', name: 'C', weight: 4, value: 5 },
      ],
    };
  }
  return {
    mode: 'ruta',
    sense: 'min',
    stages: [['S'], ['A', 'B'], ['C', 'D'], ['T']],
    arcs: [
      { from: 'S', to: 'A', cost: 2 },
      { from: 'S', to: 'B', cost: 4 },
      { from: 'A', to: 'C', cost: 7 },
      { from: 'A', to: 'D', cost: 3 },
      { from: 'B', to: 'C', cost: 2 },
      { from: 'B', to: 'D', cost: 5 },
      { from: 'C', to: 'T', cost: 4 },
      { from: 'D', to: 'T', cost: 6 },
    ],
  };
}

function solveRuta(input: RutaInput): DinamicaResult {
  const steps: DinamicaStep[] = [];
  const { stages, arcs, sense } = input;
  const better = (a: number, b: number) => (sense === 'min' ? a < b : a > b);
  const init = sense === 'min' ? Infinity : -Infinity;

  // f[node] = óptimo desde node hasta el final; next[node] = sucesor óptimo
  const f = new Map<string, number>();
  const next = new Map<string, string | null>();

  const last = stages[stages.length - 1];
  for (const n of last) {
    f.set(n, 0);
    next.set(n, null);
  }

  steps.push({
    id: 'intro',
    title: 'Recursión hacia atrás',
    content:
      `Se optimiza ${sense === 'min' ? 'minimizando' : 'maximizando'} el costo por etapas. ` +
      `Para el nodo terminal $f(\\text{fin}) = 0$. En cada etapa: ` +
      `$f(i) = ${sense === 'min' ? '\\min' : '\\max'}_j\\{c_{ij}+f(j)\\}$.`,
  });

  for (let t = stages.length - 2; t >= 0; t--) {
    const headers = ['Estado i', 'Decisión j', 'cᵢⱼ + f(j)', 'f(i)*', 'Óptimo j*'];
    const rows: string[][] = [];

    for (const i of stages[t]) {
      let best = init;
      let bestJ: string | null = null;
      const outs = arcs.filter(a => a.from === i);
      if (!outs.length) {
        f.set(i, init);
        next.set(i, null);
        rows.push([i, '—', '—', 'infactible', '—']);
        continue;
      }
      for (const a of outs) {
        const fj = f.get(a.to);
        if (fj === undefined || !Number.isFinite(fj)) continue;
        const val = a.cost + fj;
        const mark = better(val, best) || bestJ === null ? ' ←' : '';
        if (better(val, best) || bestJ === null) {
          best = val;
          bestJ = a.to;
        }
        rows.push([i, a.to, `${fmt(a.cost)}+${fmt(fj)}=${fmt(val)}${mark}`, '', '']);
      }
      f.set(i, best);
      next.set(i, bestJ);
      // anotar resumen en última fila del estado
      if (rows.length) {
        const lastRow = rows[rows.length - 1];
        lastRow[3] = Number.isFinite(best) ? fmt(best) : '∞';
        lastRow[4] = bestJ ?? '—';
      }
    }

    steps.push({
      id: `stage-${t}`,
      title: `Etapa ${t + 1} → ${t + 2}`,
      content: `Evaluación de estados en la etapa ${t + 1}.`,
      table: { headers, rows },
    });
  }

  const start = stages[0][0];
  const optimalValue = f.get(start) ?? init;
  if (!Number.isFinite(optimalValue)) {
    return {
      mode: 'ruta',
      optimalValue: NaN,
      policy: [],
      steps,
      feasible: false,
    };
  }

  const policy: string[] = [start];
  let cur: string | null = start;
  while (cur && next.get(cur)) {
    cur = next.get(cur)!;
    policy.push(cur);
  }

  steps.push({
    id: 'policy',
    title: 'Política óptima',
    content:
      `Valor óptimo $f(${start}) = ${fmt(optimalValue)}$.\n\n` +
      `Ruta: $${policy.join(' \\to ')}$.`,
  });

  return { mode: 'ruta', optimalValue, policy, steps, feasible: true };
}

function solveMochila(input: MochilaInput): DinamicaResult {
  const steps: DinamicaStep[] = [];
  const W = Math.floor(input.capacity);
  const items = input.items;
  const n = items.length;

  // dp[i][w] = máximo valor usando ítems 0..i-1 con capacidad w
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  const take: boolean[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(false));

  steps.push({
    id: 'intro',
    title: 'Mochila 0-1',
    content:
      `Capacidad $W = ${W}$. Recurrencia:\n\n` +
      `$$f_i(w) = \\max\\{f_{i-1}(w),\\; v_i + f_{i-1}(w-w_i)\\}\\quad (w\\ge w_i)$$\n\n` +
      `Cada ítem es una etapa de decisión (tomarlo o no).`,
  });

  for (let i = 1; i <= n; i++) {
    const it = items[i - 1];
    const headers = ['w', ...Array.from({ length: W + 1 }, (_, w) => String(w))];
    const rowVals: string[] = [`f_${i}`];

    for (let w = 0; w <= W; w++) {
      const skip = dp[i - 1][w];
      let best = skip;
      let took = false;
      if (it.weight <= w) {
        const withIt = it.value + dp[i - 1][w - it.weight];
        if (withIt > best) {
          best = withIt;
          took = true;
        }
      }
      dp[i][w] = best;
      take[i][w] = took;
      rowVals.push(String(best));
    }

    steps.push({
      id: `item-${i}`,
      title: `Etapa ${i}: ítem ${it.name} (w=${it.weight}, v=${it.value})`,
      content: `Tabla $f_${i}(w)$ tras decidir sobre **${it.name}**.`,
      table: {
        headers: ['', ...Array.from({ length: W + 1 }, (_, w) => `w=${w}`)],
        rows: [rowVals],
      },
    });
  }

  // reconstrucción
  const policy: string[] = [];
  let w = W;
  for (let i = n; i >= 1; i--) {
    if (take[i][w]) {
      policy.unshift(items[i - 1].name);
      w -= items[i - 1].weight;
    }
  }

  const optimalValue = dp[n][W];
  steps.push({
    id: 'policy',
    title: 'Solución óptima',
    content:
      `Valor óptimo $f_${n}(${W}) = ${optimalValue}$.\n\n` +
      (policy.length
        ? `Ítems seleccionados: ${policy.map(p => `**${p}**`).join(', ')}.`
        : 'No se selecciona ningún ítem.'),
  });

  return { mode: 'mochila', optimalValue, policy, steps, feasible: true };
}

export function solveDinamica(raw: DinamicaInput): DinamicaResult {
  const issues = validateDinamicaInput(raw);
  if (issues.length) throw new DinamicaError(issues[0]);
  return raw.mode === 'ruta' ? solveRuta(raw) : solveMochila(raw);
}

export const DINAMICA_PRESETS: DinamicaPreset[] = [
  {
    id: 'ruta-corta',
    name: 'Ruta más corta',
    blurb: 'Red de 4 etapas S→{A,B}→{C,D}→T',
    data: blankDinamica('ruta'),
    expectedValue: 11, // S-A-D-T = 2+3+6=11; S-B-C-T = 4+2+4=10 → 10
  },
  {
    id: 'ruta-max',
    name: 'Ruta de máximo beneficio',
    blurb: 'Misma red maximizando',
    data: {
      ...(blankDinamica('ruta') as RutaInput),
      sense: 'max',
    },
    expectedValue: 17, // S-A-C-T = 2+7+4=13; S-B-D-T=4+5+6=15; S-A-D-T=11; S-B-C-T=10 → max 15? Wait S-A-C-T=13, S-B-D-T=15. Actually 15.
  },
  {
    id: 'mochila-5',
    name: 'Mochila W=5',
    blurb: 'Ítems A(2,3), B(3,4), C(4,5)',
    data: blankDinamica('mochila'),
    expectedValue: 7, // A+B = 3+4 = 7
  },
  {
    id: 'mochila-8',
    name: 'Mochila W=8',
    blurb: 'Proyecto de inversión con 4 opciones',
    data: {
      mode: 'mochila',
      capacity: 8,
      items: [
        { id: '1', name: 'P1', weight: 3, value: 4 },
        { id: '2', name: 'P2', weight: 4, value: 5 },
        { id: '3', name: 'P3', weight: 2, value: 3 },
        { id: '4', name: 'P4', weight: 5, value: 7 },
      ],
    },
    expectedValue: 12, // P1+P2+P3 = 4+5+3=12 weight 9 too much; P1+P4=11 w=8; P2+P3=8 w=6; P4+P3=10 w=7; P1+P2=9 w=7 → 11? 
    // P1+P4 = 4+7=11, w=8
    // P2+P3 = 5+3=8, w=6
    // P4+P3 = 7+3=10, w=7
    // P1+P2 = 4+5=9, w=7
    // Best = 11
  },
];

// Corregir expected values after manual verification
DINAMICA_PRESETS[0].expectedValue = 10; // S→B→C→T = 4+2+4
DINAMICA_PRESETS[1].expectedValue = 15; // S→B→D→T = 4+5+6
DINAMICA_PRESETS[3].expectedValue = 11; // P1+P4
