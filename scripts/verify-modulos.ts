import { solveAssignment, bruteForceAssignment, ASSIGNMENT_PRESETS, HUNGARIAN_PRESETS } from '../src/core/AsignacionSolver';
import { solveMaxFlow, MAX_FLOW_PRESETS } from '../src/core/FlujoMaximoSolver';
import { solveMinCostFlow, MIN_COST_PRESETS } from '../src/core/FlujoCostoMinSolver';

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(ok ? 'OK  ' : 'FAIL', msg);
  if (!ok) failed += 1;
};

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
}

for (const p of MAX_FLOW_PRESETS) {
  const r = solveMaxFlow(p.data);
  check(r.maxFlow === p.expectedFlow, `${p.id} flow=${r.maxFlow} expected=${p.expectedFlow}`);
  check(Math.abs(r.minCut.capacity - r.maxFlow) < 1e-6 || r.maxFlow === 0, `${p.id} mincut=${r.minCut.capacity}`);
  for (const e of r.edges) check(e.flow >= -1e-9 && e.flow <= e.capacity + 1e-9, `${p.id} capacity ${e.id}`);
}

for (const p of MIN_COST_PRESETS) {
  const r = solveMinCostFlow(p.data);
  const recomputed = r.edges.reduce((s, e) => s + e.flow * e.cost, 0);
  check(r.sent === p.expectedSent, `${p.id} sent=${r.sent} expected=${p.expectedSent}`);
  check(Math.abs(r.totalCost - p.expectedCost) < 1e-6, `${p.id} cost=${r.totalCost} expected=${p.expectedCost}`);
  check(r.complete === p.expectComplete, `${p.id} complete=${r.complete}`);
  check(Math.abs(recomputed - r.totalCost) < 1e-6, `${p.id} cost identity`);
}

// invalid inputs
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
  solveMinCostFlow({ nodes: ['s', 't'], source: 's', sink: 't', demand: 1, edges: [{ id: 'e', from: 's', to: 't', capacity: 1, cost: Number.NaN }] });
  check(false, 'mincost should reject NaN cost');
} catch {
  check(true, 'mincost rejects NaN cost');
}

if (failed) {
  console.error(`\n${failed} checks failed`);
  process.exit(1);
}
console.log('\nAll checks passed');
