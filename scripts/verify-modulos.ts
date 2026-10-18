/**
 * Verificación matemática y de contratos de las calculadoras IO (Unidad 2).
 * Ejecutar: npm test
 */
import {
  ASSIGNMENT_PRESETS,
  HUNGARIAN_PRESETS,
  blankAssignment,
  bruteForceAssignment,
  solveAssignment,
  validateAssignmentInput,
} from '../src/core/AsignacionSolver';
import {
  MAX_FLOW_PRESETS,
  blankMaxFlow,
  checkFlowConservation,
  solveMaxFlow,
  validateMaxFlowInput,
} from '../src/core/FlujoMaximoSolver';
import {
  MIN_COST_PRESETS,
  blankMinCostFlow,
  solveMinCostFlow,
  validateMinCostInput,
} from '../src/core/FlujoCostoMinSolver';
import {
  PERT_CPM_PRESETS,
  blankPertCpm,
  solvePertCpm,
  validatePertCpmInput,
} from '../src/core/PertCpmSolver';

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(ok ? 'OK  ' : 'FAIL', msg);
  if (!ok) failed += 1;
};

// ── Presets conocidos ────────────────────────────────────────────────────────
for (const p of [...ASSIGNMENT_PRESETS, ...HUNGARIAN_PRESETS]) {
  const r = solveAssignment(p.data);
  let bfMsg = '';
  if (p.data.agents.length === p.data.tasks.length) {
    const bf = bruteForceAssignment(p.data.costs, p.data.sense).total;
    bfMsg = ` bf=${bf}`;
    check(Math.abs(bf - r.total) < 1e-6, `${p.id} matches brute ${r.total}`);
  }
  check(Math.abs(r.total - p.expectedTotal) < 1e-6, `${p.id} total=${r.total} expected=${p.expectedTotal}${bfMsg}`);
  const agents = r.pairs.filter(x => !x.fictional).map(x => x.agent);
  const tasks = r.pairs.filter(x => !x.fictional).map(x => x.task);
  check(new Set(agents).size === agents.length && new Set(tasks).size === tasks.length, `${p.id} one-to-one`);
  check(r.steps.length > 0, `${p.id} has real steps`);
}

for (const p of MAX_FLOW_PRESETS) {
  const r = solveMaxFlow(p.data);
  check(r.maxFlow === p.expectedFlow, `${p.id} flow=${r.maxFlow} expected=${p.expectedFlow}`);
  check(Math.abs(r.minCut.capacity - r.maxFlow) < 1e-6 || r.maxFlow === 0, `${p.id} mincut=${r.minCut.capacity}`);
  for (const e of r.edges) check(e.flow >= -1e-9 && e.flow <= e.capacity + 1e-9, `${p.id} capacity ${e.id}`);
  const cons = checkFlowConservation(p.data.nodes, r.edges, p.data.source, p.data.sink);
  check(cons.every(c => c.ok), `${p.id} flow conservation`);
  if (r.maxFlow > 0) check(r.steps.length > 0, `${p.id} has augmenting steps`);
}

for (const p of MIN_COST_PRESETS) {
  const r = solveMinCostFlow(p.data);
  const recomputed = r.edges.reduce((s, e) => s + e.flow * e.cost, 0);
  check(r.sent === p.expectedSent, `${p.id} sent=${r.sent} expected=${p.expectedSent}`);
  check(Math.abs(r.totalCost - p.expectedCost) < 1e-6, `${p.id} cost=${r.totalCost} expected=${p.expectedCost}`);
  check(r.complete === p.expectComplete, `${p.id} complete=${r.complete}`);
  check(Math.abs(recomputed - r.totalCost) < 1e-6, `${p.id} cost identity`);
  for (const e of r.edges) check(e.flow >= -1e-9 && e.flow <= e.capacity + 1e-9, `${p.id} cap ${e.id}`);
}

// ── Matriz personalizada: cambiar datos cambia el resultado ──────────────────
{
  const a = {
    sense: 'min' as const,
    agents: ['A', 'B'],
    tasks: ['X', 'Y'],
    costs: [[1, 4], [3, 2]],
  };
  const b = { ...a, costs: [[9, 1], [2, 8]] };
  const ra = solveAssignment(a);
  const rb = solveAssignment(b);
  check(Math.abs(ra.total - 3) < 1e-6, `custom assign A total=${ra.total}`);
  check(Math.abs(rb.total - 3) < 1e-6, `custom assign B total=${rb.total}`);
  check(ra.pairs[0].task !== rb.pairs[0].task || ra.pairs[1].task !== rb.pairs[1].task
    || JSON.stringify(ra.pairs) !== JSON.stringify(rb.pairs), 'custom assign different pairing when costs change');
  // Misma matriz con un costo alterado → total distinto
  const c = { ...a, costs: [[1, 4], [3, 100]] };
  const rc = solveAssignment(c);
  check(Math.abs(rc.total - 7) < 1e-6, `custom assign C total=${rc.total} (changed cell)`);
  check(Math.abs(rc.total - ra.total) > 1e-6, 'changed cell produces different total');
}

// ── Dimensiones: blank + rectangular + resize mental ─────────────────────────
{
  const blank = blankAssignment('min', 3, 2);
  check(blank.agents.length === 3 && blank.tasks.length === 2, 'blank dims 3×2');
  check(validateAssignmentInput(blank).length === 0, 'blank assignment validates');
  const rect = solveAssignment({
    sense: 'min',
    agents: ['A', 'B', 'C'],
    tasks: ['X', 'Y'],
    costs: [[1, 2], [3, 4], [5, 0]],
  });
  check(rect.pairs.filter(p => !p.fictional).length === 2, 'rectangular assigns min(m,n) real pairs');
  check(rect.steps.some(s => /fictici/i.test(s.body) || /fictici/i.test(s.title)), 'rectangular balances with dummy');
}

// ── Validación: vacíos / inválidos; draft se conserva (validación no muta) ───
{
  const bad = {
    sense: 'min' as const,
    agents: ['A', ''],
    tasks: ['T'],
    costs: [[1], [Number.NaN]],
  };
  const before = JSON.stringify(bad);
  const issues = validateAssignmentInput(bad);
  check(issues.length >= 2, `assignment validation issues=${issues.length}`);
  check(JSON.stringify(bad) === before, 'validation does not mutate input');
  check(issues.some(i => /vacía|no numérica/i.test(i)), 'flags non-numeric cell');
  check(issues.some(i => /nombre/i.test(i)), 'flags empty agent name');
}

{
  const issues = validateMaxFlowInput({
    nodes: ['s', 't'],
    source: 's',
    sink: 's',
    edges: [{ id: 'e', from: 's', to: 't', capacity: -2 }],
  });
  check(issues.some(i => /distintos/i.test(i)), 'maxflow: source≠sink');
  check(issues.some(i => /negativa/i.test(i)), 'maxflow: negative capacity');
}

{
  const draft = blankMinCostFlow();
  draft.demand = Number.NaN;
  const issues = validateMinCostInput(draft);
  check(issues.some(i => /cantidad|numérica/i.test(i)), 'mincost: invalid demand');
  check(draft.nodes.length === 2, 'invalid demand keeps nodes (draft preserved)');
}

// ── Ejemplo precargado modificado y resuelto ─────────────────────────────────
{
  const base = structuredClone(ASSIGNMENT_PRESETS[0].data);
  // Forzar un total distinto: poner costos extremos en la diagonal óptima previa
  for (let i = 0; i < base.costs.length; i++) {
    for (let j = 0; j < base.costs[i].length; j++) base.costs[i][j] = 100;
  }
  base.costs[0][0] = 1;
  base.costs[1][1] = 1;
  if (base.costs[2]) base.costs[2][2] = 1;
  const modified = solveAssignment(base);
  const original = solveAssignment(ASSIGNMENT_PRESETS[0].data);
  check(Math.abs(modified.total - original.total) > 1e-9, `modified preset total ${modified.total} ≠ ${original.total}`);
}

// ── Pasos reales (no genéricos vacíos) ───────────────────────────────────────
{
  const r = solveAssignment(ASSIGNMENT_PRESETS[0].data);
  check(r.steps[0].title.length > 0 && r.steps[0].body.length > 0, 'assignment step 0 has content');
  check(r.steps.some(s => s.matrix && s.matrix.length > 0), 'assignment steps include matrices');
}

{
  const multi = MAX_FLOW_PRESETS.find(p => p.expectedFlow > 0)!;
  const r = solveMaxFlow(multi.data);
  const sumAug = r.steps.reduce((s, st) => s + st.bottleneck, 0);
  check(Math.abs(sumAug - r.maxFlow) < 1e-6, `maxflow sum of augmentations=${sumAug}`);
  check(r.steps.every(st => st.path.length >= 2 && st.bottleneck > 0), 'each step has path and bottleneck');
}

// ── Flujo máximo multi-camino (caso canónico) ────────────────────────────────
{
  const data = {
    nodes: ['s', 'a', 'b', 't'],
    source: 's',
    sink: 't',
    edges: [
      { id: '1', from: 's', to: 'a', capacity: 10 },
      { id: '2', from: 's', to: 'b', capacity: 10 },
      { id: '3', from: 'a', to: 't', capacity: 10 },
      { id: '4', from: 'b', to: 't', capacity: 10 },
      { id: '5', from: 'a', to: 'b', capacity: 1 },
    ],
  };
  const r = solveMaxFlow(data);
  check(r.maxFlow === 20, `diamond maxflow=${r.maxFlow}`);
  check(r.steps.length >= 2, `diamond paths=${r.steps.length}`);
}

// ── Capacidad insuficiente (costo mínimo) ────────────────────────────────────
{
  const r = solveMinCostFlow({
    nodes: ['s', 't'],
    source: 's',
    sink: 't',
    demand: 10,
    edges: [{ id: 'e', from: 's', to: 't', capacity: 3, cost: 2 }],
  });
  check(r.sent === 3 && !r.complete, `insufficient capacity sent=${r.sent} complete=${r.complete}`);
  check(Math.abs(r.totalCost - 6) < 1e-6, `partial cost=${r.totalCost}`);
}

// ── Sin camino viable ────────────────────────────────────────────────────────
{
  const r = solveMaxFlow({
    nodes: ['s', 'x', 't'],
    source: 's',
    sink: 't',
    edges: [{ id: 'e', from: 's', to: 'x', capacity: 5 }],
  });
  check(r.maxFlow === 0, 'no path → maxflow 0');
}

{
  const r = solveMinCostFlow({
    nodes: ['s', 'x', 't'],
    source: 's',
    sink: 't',
    demand: 4,
    edges: [{ id: 'e', from: 's', to: 'x', capacity: 5, cost: 1 }],
  });
  check(r.sent === 0 && !r.complete, 'mincost no path → sent 0 incomplete');
}

// ── Costos negativos en asignación (permitidos) ──────────────────────────────
{
  const r = solveAssignment({
    sense: 'min',
    agents: ['A', 'B'],
    tasks: ['X', 'Y'],
    costs: [[-5, 1], [2, -3]],
  });
  check(Math.abs(r.total - (-8)) < 1e-6, `negative costs total=${r.total}`);
}

// ── Maximización: total es beneficio original, no matriz transformada ────────
{
  const data = {
    sense: 'max' as const,
    agents: ['A', 'B'],
    tasks: ['X', 'Y'],
    costs: [[5, 1], [2, 4]],
  };
  const r = solveAssignment(data);
  const bf = bruteForceAssignment(data.costs, 'max').total;
  check(Math.abs(r.total - bf) < 1e-6, `max sense matches brute ${r.total}`);
  check(r.total === 9, `max benefit=${r.total}`);
}

// ── blank helpers ────────────────────────────────────────────────────────────
{
  const mf = blankMaxFlow();
  check(validateMaxFlowInput(mf).length === 0, 'blank maxflow validates');
  const mc = blankMinCostFlow();
  check(validateMinCostInput(mc).length === 0, 'blank mincost validates');
}

// ── PERT / CPM ───────────────────────────────────────────────────────────────
for (const p of PERT_CPM_PRESETS) {
  const r = solvePertCpm(p.data);
  check(Math.abs(r.projectDuration - p.expectedDuration) < 1e-6, `${p.id} T=${r.projectDuration} expected=${p.expectedDuration}`);
  check(r.criticalPath.join() === p.expectedCritical.join(), `${p.id} critical=${r.criticalPath.join('→')}`);
  check(r.steps.length >= 3, `${p.id} has steps`);
  for (const a of r.activities) {
    check(Math.abs(a.EF - a.ES - a.duration) < 1e-6, `${p.id} ${a.id} EF=ES+t`);
    check(Math.abs(a.LF - a.LS - a.duration) < 1e-6, `${p.id} ${a.id} LF=LS+t`);
    check(Math.abs(a.slack - (a.LS - a.ES)) < 1e-6, `${p.id} ${a.id} slack`);
    if (a.critical) check(Math.abs(a.slack) < 1e-6, `${p.id} ${a.id} critical slack 0`);
  }
}

{
  const r = solvePertCpm({
    mode: 'cpm',
    activities: [
      { id: 'A', name: 'A', preds: [], duration: 2 },
      { id: 'B', name: 'B', preds: ['A'], duration: 3 },
      { id: 'C', name: 'C', preds: ['A'], duration: 1 },
    ],
  });
  check(r.projectDuration === 5, `custom cpm T=${r.projectDuration}`);
  check(r.criticalPath.join() === 'A,B', `custom cpm path=${r.criticalPath}`);
  check(r.activities.find(a => a.id === 'C')!.slack === 2, 'custom cpm C slack=2');
}

{
  const issues = validatePertCpmInput({
    mode: 'pert',
    activities: [{ id: 'A', name: 'A', preds: [], a: 5, m: 2, b: 1 }],
  });
  check(issues.some(i => /a ≤ m ≤ b/i.test(i)), 'pert rejects a>m>b');
  check(validatePertCpmInput(blankPertCpm('cpm')).length === 0, 'blank pert/cpm validates');
}

try {
  solvePertCpm({
    mode: 'cpm',
    activities: [
      { id: 'A', name: 'A', preds: ['B'], duration: 1 },
      { id: 'B', name: 'B', preds: ['A'], duration: 1 },
    ],
  });
  check(false, 'pert should reject cycle');
} catch {
  check(true, 'pert rejects cycle');
}

// ── Rechazos duros en solve ──────────────────────────────────────────────────
try {
  solveAssignment({ sense: 'min', agents: ['A'], tasks: ['T'], costs: [[Number.NaN]] });
  check(false, 'assignment should reject NaN');
} catch {
  check(true, 'assignment rejects NaN');
}

try {
  solveMaxFlow({ nodes: ['s', 't'], source: 's', sink: 't', edges: [{ id: 'e', from: 's', to: 't', capacity: -1 }] });
  check(false, 'maxflow should reject negative capacity');
} catch {
  check(true, 'maxflow rejects negative capacity');
}

try {
  solveMinCostFlow({
    nodes: ['s', 't'],
    source: 's',
    sink: 't',
    demand: 1,
    edges: [{ id: 'e', from: 's', to: 't', capacity: 1, cost: Number.NaN }],
  });
  check(false, 'mincost should reject NaN cost');
} catch {
  check(true, 'mincost rejects NaN cost');
}

if (failed) {
  console.error(`\n${failed} checks failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
