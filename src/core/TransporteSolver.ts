import { evaluate } from 'mathjs';

/**
 * Problema del transporte: solución factible inicial.
 * Toda la aritmética pasa por mathjs. El texto de cada paso trae
 * el LaTeX equivalente para renderizarlo con react-katex.
 */

export type MethodId = 'noroeste' | 'minimo' | 'vogel';
export type AddedLine = 'none' | 'origin' | 'destination';

export interface TransportInput {
  origins: string[];
  destinations: string[];
  costs: number[][];
  supply: number[];
  demand: number[];
}

export interface Shipment {
  i: number;
  j: number;
  origin: string;
  destination: string;
  quantity: number;
  unit: number;
  line: number;
  epsilon: boolean;
  fictional: boolean;
}

export interface GridSnapshot {
  origins: string[];
  destinations: string[];
  costs: number[][];
  supplyLeft: number[];
  demandLeft: number[];
  supplyGiven: number[];
  demandGiven: number[];
  alloc: (number | null)[][];
  epsilon: boolean[][];
  showClosure: boolean;
  focus: { i: number; j: number } | null;
  penalties: { rows: (number | null)[]; cols: (number | null)[] } | null;
  penaltyPick: { kind: 'row' | 'col'; index: number } | null;
}

export type StepPhase = 'modelo' | 'balance' | 'metodo' | 'eleccion' | 'asignacion' | 'base' | 'resultado';

export interface TransportStep {
  id: string;
  phase: StepPhase;
  phaseLabel: string;
  title: string;
  body: string;
  grid: GridSnapshot;
  runningCost: number;
}

export interface MethodResult {
  id: MethodId;
  title: string;
  english: string;
  totalCost: number;
  degenerate: boolean;
  iterations: number;
  basicCount: number;
  requiredBasics: number;
  steps: TransportStep[];
  shipments: Shipment[];
}

export interface SolvedTransport {
  original: TransportInput;
  balanced: TransportInput;
  added: AddedLine;
  gap: number;
  methods: MethodResult[];
}

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  data: TransportInput;
}

export class TransportError extends Error {}

const EPS = 1e-8;

export const METHOD_INFO: Record<MethodId, { title: string; english: string; blurb: string }> = {
  noroeste: {
    title: 'Esquina noroeste',
    english: 'North-West Corner',
    blurb: 'Empieza en la celda de arriba a la izquierda y avanza sin mirar los costos. Es la solución factible más rápida de armar.',
  },
  minimo: {
    title: 'Costo mínimo',
    english: 'Minimum-Cost Method',
    blurb: 'En cada paso elige la ruta abierta más barata y le manda todo lo que esa celda pueda recibir.',
  },
  vogel: {
    title: 'Aproximación de Vogel',
    english: "Vogel's Approximation Method",
    blurb: 'Mide cuánto cuesta desperdiciar la ruta barata de cada fila y columna, y atiende primero el mayor castigo.',
  },
};

interface Mutable {
  origins: string[];
  destinations: string[];
  costs: number[][];
  supplyLeft: number[];
  demandLeft: number[];
  supplyGiven: number[];
  demandGiven: number[];
  alloc: (number | null)[][];
  epsilon: boolean[][];
  shipments: Shipment[];
}

interface PenRow {
  kind: 'row' | 'col';
  index: number;
  penalty: number;
  low: number;
  second: number;
  i: number;
  j: number;
  minCost: number;
}

function asNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new TransportError('Apareció un número inválido durante el cálculo.');
  const rounded = Math.round(n * 1e9) / 1e9;
  return Math.abs(rounded) < EPS ? 0 : rounded;
}

function numLit(n: number): string {
  const v = asNum(n);
  if (Math.abs(v) > 1e6) throw new TransportError('Usa valores de hasta 1 000 000 para que el desarrollo se pueda leer.');
  return String(v);
}

function lit(n: number): string {
  const s = numLit(n);
  return n < 0 ? `(${s})` : s;
}

function evalNum(expr: string): number {
  return asNum(evaluate(expr));
}

function sumList(xs: number[]): number {
  if (xs.length === 0) return 0;
  if (xs.length === 1) return asNum(xs[0]);
  return evalNum(xs.map(numLit).join(' + '));
}

export function formatQty(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const r = asNum(n);
  return String(r);
}

export function totals(supply: number[], demand: number[]) {
  const safeS = supply.map(v => (Number.isFinite(v) ? asNum(v) : NaN));
  const safeD = demand.map(v => (Number.isFinite(v) ? asNum(v) : NaN));
  if (safeS.some(v => !Number.isFinite(v)) || safeD.some(v => !Number.isFinite(v))) {
    return { supplyTotal: 0, demandTotal: 0, gap: 0, invalid: true };
  }
  const supplyTotal = sumList(safeS);
  const demandTotal = sumList(safeD);
  const gap = evalNum(`${lit(supplyTotal)} - ${lit(demandTotal)}`);
  return { supplyTotal, demandTotal, gap, invalid: false };
}

function lx(label: string): string {
  const m = label.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ]+)(\d+)$/);
  if (m) return `${m[1]}_{${m[2]}}`;
  const safe = label.replace(/[\\{}$%&_#]/g, '').trim() || '?';
  return `\\text{${safe}}`;
}

function xTex(i: number, j: number): string {
  return `x_{${i + 1},${j + 1}}`;
}

function cTex(i: number, j: number): string {
  return `c_{${i + 1},${j + 1}}`;
}

function times(q: number, c: number): string {
  const qq = q < 0 ? `(${formatQty(q)})` : formatQty(q);
  const cc = c < 0 ? `(${formatQty(c)})` : formatQty(c);
  return `${qq} \\times ${cc}`;
}

function cloneInput(raw: TransportInput): TransportInput {
  if (raw.origins.length < 1 || raw.destinations.length < 1) {
    throw new TransportError('Hace falta al menos un origen y un destino.');
  }
  const tidy = (name: string, fallback: string) => name.trim().replace(/[<>&]/g, '').slice(0, 18) || fallback;
  const origins = raw.origins.map((name, i) => tidy(name, `O${i + 1}`));
  const destinations = raw.destinations.map((name, j) => tidy(name, `D${j + 1}`));
  if (raw.supply.length !== origins.length || raw.demand.length !== destinations.length) {
    throw new TransportError('La oferta y la demanda no coinciden con el tamaño de la tabla.');
  }
  const supply = raw.supply.map((v, i) => {
    if (!Number.isFinite(v)) throw new TransportError(`La oferta de ${origins[i]} no es un número.`);
    if (v < 0) throw new TransportError(`La oferta de ${origins[i]} no puede ser negativa.`);
    return asNum(v);
  });
  const demand = raw.demand.map((v, j) => {
    if (!Number.isFinite(v)) throw new TransportError(`La demanda de ${destinations[j]} no es un número.`);
    if (v < 0) throw new TransportError(`La demanda de ${destinations[j]} no puede ser negativa.`);
    return asNum(v);
  });
  const costs = origins.map((_, i) => destinations.map((__, j) => {
    const v = raw.costs[i]?.[j];
    if (v === undefined || !Number.isFinite(v)) {
      throw new TransportError(`Falta el costo de ${origins[i]} hacia ${destinations[j]}.`);
    }
    if (v < 0) throw new TransportError(`El costo de ${origins[i]} hacia ${destinations[j]} no puede ser negativo.`);
    return asNum(v);
  }));
  return { origins, destinations, costs, supply, demand };
}

function uniqueName(base: string, used: string[]): string {
  if (!used.includes(base)) return base;
  let k = 2;
  while (used.includes(`${base} ${k}`)) k += 1;
  return `${base} ${k}`;
}

function balanceProblem(input: TransportInput): { problem: TransportInput; added: AddedLine; gap: number } {
  const { supplyTotal, demandTotal, gap } = totals(input.supply, input.demand);
  if (gap === 0) return { problem: input, added: 'none', gap: 0 };
  if (gap > 0) {
    const name = uniqueName('Ficticio', input.destinations);
    return {
      added: 'destination',
      gap,
      problem: {
        origins: input.origins,
        destinations: [...input.destinations, name],
        supply: input.supply,
        demand: [...input.demand, gap],
        costs: input.costs.map(row => [...row, 0]),
      },
    };
  }
  const need = evalNum(`${lit(demandTotal)} - ${lit(supplyTotal)}`);
  const name = uniqueName('Ficticio', input.origins);
  return {
    added: 'origin',
    gap: need,
    problem: {
      origins: [...input.origins, name],
      destinations: input.destinations,
      supply: [...input.supply, need],
      demand: input.demand,
      costs: [...input.costs, input.destinations.map(() => 0)],
    },
  };
}

function blankGrid(p: TransportInput): GridSnapshot {
  const m = p.origins.length;
  const n = p.destinations.length;
  return {
    origins: [...p.origins],
    destinations: [...p.destinations],
    costs: p.costs.map(row => [...row]),
    supplyLeft: [...p.supply],
    demandLeft: [...p.demand],
    supplyGiven: [...p.supply],
    demandGiven: [...p.demand],
    alloc: Array.from({ length: m }, () => Array<number | null>(n).fill(null)),
    epsilon: Array.from({ length: m }, () => Array<boolean>(n).fill(false)),
    showClosure: false,
    focus: null,
    penalties: null,
    penaltyPick: null,
  };
}

function createState(p: TransportInput): Mutable {
  const m = p.origins.length;
  const n = p.destinations.length;
  return {
    origins: [...p.origins],
    destinations: [...p.destinations],
    costs: p.costs.map(row => [...row]),
    supplyLeft: [...p.supply],
    demandLeft: [...p.demand],
    supplyGiven: [...p.supply],
    demandGiven: [...p.demand],
    alloc: Array.from({ length: m }, () => Array<number | null>(n).fill(null)),
    epsilon: Array.from({ length: m }, () => Array<boolean>(n).fill(false)),
    shipments: [],
  };
}

function snap(
  state: Mutable,
  opts: {
    showClosure?: boolean;
    focus?: { i: number; j: number } | null;
    penalties?: GridSnapshot['penalties'];
    penaltyPick?: GridSnapshot['penaltyPick'];
  } = {},
): GridSnapshot {
  return {
    origins: [...state.origins],
    destinations: [...state.destinations],
    costs: state.costs.map(row => [...row]),
    supplyLeft: [...state.supplyLeft],
    demandLeft: [...state.demandLeft],
    supplyGiven: [...state.supplyGiven],
    demandGiven: [...state.demandGiven],
    alloc: state.alloc.map(row => [...row]),
    epsilon: state.epsilon.map(row => [...row]),
    showClosure: opts.showClosure ?? false,
    focus: opts.focus ?? null,
    penalties: opts.penalties
      ? { rows: [...opts.penalties.rows], cols: [...opts.penalties.cols] }
      : null,
    penaltyPick: opts.penaltyPick ?? null,
  };
}

function runningCost(state: Mutable): number {
  return sumList(state.shipments.filter(s => !s.epsilon).map(s => s.line));
}

function costTex(ships: Shipment[]): string {
  const used = ships.filter(s => !s.epsilon && s.quantity > 0);
  if (used.length === 0) return 'Z = 0';
  const value = sumList(used.map(s => s.line));
  return `Z = ${used.map(s => times(s.quantity, s.unit)).join(' + ')} = ${formatQty(value)}`;
}

function openRows(state: Mutable): number[] {
  return state.supplyLeft.map((v, i) => (v > EPS ? i : -1)).filter(i => i >= 0);
}

function openCols(state: Mutable): number[] {
  return state.demandLeft.map((v, j) => (v > EPS ? j : -1)).filter(j => j >= 0);
}

function apply(state: Mutable, i: number, j: number, qty: number) {
  if (qty <= EPS) throw new TransportError('La asignación quedó en cero antes de cerrar la tabla.');
  if (state.alloc[i][j] !== null) throw new TransportError('Se intentó asignar dos veces la misma celda.');
  const unit = state.costs[i][j];
  const line = evalNum(`${lit(qty)} * ${lit(unit)}`);
  state.alloc[i][j] = qty;
  state.supplyLeft[i] = evalNum(`${lit(state.supplyLeft[i])} - ${lit(qty)}`);
  state.demandLeft[j] = evalNum(`${lit(state.demandLeft[j])} - ${lit(qty)}`);
  state.shipments.push({
    i,
    j,
    origin: state.origins[i],
    destination: state.destinations[j],
    quantity: qty,
    unit,
    line,
    epsilon: false,
    fictional: state.origins[i].startsWith('Ficticio') || state.destinations[j].startsWith('Ficticio'),
  });
}

function closureSentence(origin: string, dest: string, rowDone: boolean, colDone: boolean, finished: boolean): string {
  if (finished) {
    return 'Oferta y demanda de esta celda quedaron en cero y ya no hay otra celda abierta. La tabla quedó completa.';
  }
  if (rowDone && colDone) {
    return `La oferta de **${origin}** y la demanda de **${dest}** llegaron a cero al mismo tiempo. Se cierran la fila y la columna. Esa doble eliminación deja la base corta: es una degeneración y, al final, se completa con una variable básica de cantidad 0.`;
  }
  if (rowDone) {
    return `La oferta de **${origin}** llegó a cero, así que esa fila se cierra. La demanda de **${dest}** todavía no se cubrió: el siguiente envío seguirá en esa columna, desde otro origen.`;
  }
  return `La demanda de **${dest}** llegó a cero, así que esa columna se cierra. A **${origin}** todavía le queda oferta: el siguiente envío sale del mismo origen hacia otro destino.`;
}

function assignmentBody(
  stateBefore: { supply: number; demand: number },
  state: Mutable,
  i: number,
  j: number,
  qty: number,
  first: boolean,
): string {
  const origin = state.origins[i];
  const dest = state.destinations[j];
  const unit = state.costs[i][j];
  const line = state.shipments[state.shipments.length - 1].line;
  const leftA = state.supplyLeft[i];
  const leftB = state.demandLeft[j];
  const rowDone = leftA === 0;
  const colDone = leftB === 0;
  const finished = openRows(state).length === 0 && openCols(state).length === 0;
  const intro = first
    ? 'La cantidad que cabe en la celda es el mínimo entre lo que el origen todavía puede enviar y lo que el destino todavía pide. No se puede mandar más que eso, porque sobraría oferta o faltaría demanda.'
    : 'Se aplica otra vez la misma cuenta: el envío es el mínimo entre la oferta que queda y la demanda que queda.';
  return [
    intro,
    '',
    `$$${xTex(i, j)} = \\min(${formatQty(stateBefore.supply)}, ${formatQty(stateBefore.demand)}) = ${formatQty(qty)}$$`,
    '',
    `Se envían **${formatQty(qty)}** unidades de **${origin}** a **${dest}**.`,
    '',
    `El costo de ese tramo es el producto de la cantidad por el costo unitario \$${cTex(i, j)} = ${formatQty(unit)}$:`,
    '',
    `$$${times(qty, unit)} = ${formatQty(line)}$$`,
    '',
    `Oferta que le queda a **${origin}**:`,
    '',
    `$$${formatQty(stateBefore.supply)} - ${formatQty(qty)} = ${formatQty(leftA)}$$`,
    '',
    `Demanda que le queda a **${dest}**:`,
    '',
    `$$${formatQty(stateBefore.demand)} - ${formatQty(qty)} = ${formatQty(leftB)}$$`,
    '',
    closureSentence(origin, dest, rowDone, colDone, finished),
    '',
    'Costo acumulado de todo lo ya enviado:',
    '',
    `$$${costTex(state.shipments)}$$`,
  ].join('\n');
}

function matrixTex(costs: number[][]): string {
  const rows = costs.map(row => row.map(formatQty).join(' & ')).join(' \\\\ ');
  return `\\begin{bmatrix} ${rows} \\end{bmatrix}`;
}

function modelBody(p: TransportInput): string {
  const m = p.origins.length;
  const n = p.destinations.length;
  const offer = p.supply.map((a, i) => `${lx(p.origins[i])}: ${formatQty(a)}`).join(', ');
  const need = p.demand.map((b, j) => `${lx(p.destinations[j])}: ${formatQty(b)}`).join(', ');
  const terms = p.costs.flatMap((row, i) => row.map((c, j) => `${formatQty(c)}${xTex(i, j)}`));
  const z = terms.join(' + ');
  return [
    `Hay **${m} orígenes** y **${n} destinos**. El origen $i$ dispone de una oferta $a_i$. El destino $j$ exige una demanda $b_j$. Mandar una unidad del origen $i$ al destino $j$ cuesta $c_{ij}$.`,
    '',
    'La incógnita $x_{ij}$ es cuántas unidades viajan por esa ruta. El objetivo es pagar lo menos posible y, al mismo tiempo, vaciar cada origen y llenar cada destino.',
    '',
    '$$\\min Z = \\sum_{i=1}^{' + m + '} \\sum_{j=1}^{' + n + '} c_{ij}\\, x_{ij}$$',
    '',
    'Cada origen reparte exactamente su oferta:',
    '',
    '$$\\sum_{j=1}^{' + n + '} x_{ij} = a_i \\quad (i = 1,\\ldots,' + m + ')$$',
    '',
    'Cada destino recibe exactamente su demanda:',
    '',
    '$$\\sum_{i=1}^{' + m + '} x_{ij} = b_j \\quad (j = 1,\\ldots,' + n + ')$$',
    '',
    'Y no se envían cantidades negativas:',
    '',
    '$$x_{ij} \\ge 0$$',
    '',
    'Antes de equilibrar la tabla, las restricciones se leen así: un origen no puede entregar más de lo que tiene, y un destino tiene que recibir al menos lo que pidió.',
    '',
    '$$\\sum_{j} x_{ij} \\le a_i$$',
    '',
    'La oferta $a_i$ es el tope de la fila $i$. Cada $x_{ij}$ de esa fila es lo que sale hacia un destino, y la suma de la fila no puede pasar de $a_i$.',
    '',
    '$$\\sum_{i} x_{ij} \\ge b_j$$',
    '',
    'La demanda $b_j$ es el mínimo que tiene que entrar a la columna $j$. Si sobra oferta o falta oferta, el siguiente paso agrega un destino o un origen ficticio y las desigualdades se vuelven igualdades. Los tres métodos trabajan sobre esa tabla equilibrada.',
    '',
    'En esas fórmulas:',
    '',
    '$Z$ es el costo total de todos los envíos.',
    '',
    '$c_{ij}$ es el costo de llevar **una** unidad del origen $i$ al destino $j$.',
    '',
    '$x_{ij}$ es la cantidad que realmente se transporta por esa ruta. Si la celda queda vacía, esa variable vale 0.',
    '',
    `Ofertas de este problema: \$${offer}$.`,
    '',
    `Demandas de este problema: \$${need}$.`,
    '',
    'La matriz de costos, leída con las filas como orígenes y las columnas como destinos, es',
    '',
    `$$C = ${matrixTex(p.costs)}$$`,
    '',
    'Escrita suma por suma, la función objetivo queda',
    '',
    `$$Z = ${z}$$`,
    '',
    'Los tres métodos de esta pantalla no prueban que el plan sea óptimo. Construyen una **solución factible inicial**: un reparto que cumple oferta y demanda. Después se comparan sus costos. El óptimo verdadero puede ser todavía más bajo; para asegurarlo haría falta un método de mejora, como MODI o el cruce de piedras.',
  ].join('\n');
}

function balanceBody(original: TransportInput, balanced: TransportInput, added: AddedLine, gap: number): string {
  const S = sumList(original.supply);
  const D = sumList(original.demand);
  const head = [
    'Estos métodos solo recorren una tabla en la que todo lo que sale tiene quién lo reciba.',
    '',
    `$$\\sum_i a_i = ${formatQty(S)} \\qquad \\sum_j b_j = ${formatQty(D)}$$`,
    '',
  ];
  if (added === 'none') {
    return [
      ...head,
      'Las dos sumas son iguales, así que el problema **ya está equilibrado**. No se agrega un origen ni un destino ficticio. Cada unidad que salga de un origen real llega a un destino real.',
      '',
      `La base de una solución de transporte debe tener exactamente $m + n - 1$ celdas básicas. Aquí $m = ${balanced.origins.length}$, $n = ${balanced.destinations.length}$ y`,
      '',
      `$$m + n - 1 = ${balanced.origins.length} + ${balanced.destinations.length} - 1 = ${balanced.origins.length + balanced.destinations.length - 1}$$`,
    ].join('\n');
  }
  if (added === 'destination') {
    const name = balanced.destinations[balanced.destinations.length - 1];
    return [
      ...head,
      `La oferta supera a la demanda en **${formatQty(gap)}** unidades. Esa diferencia no tiene destino real.`,
      '',
      `$$\\sum_i a_i - \\sum_j b_j = ${formatQty(S)} - ${formatQty(D)} = ${formatQty(gap)}$$`,
      '',
      `Se agrega el destino **${name}** con demanda \$${formatQty(gap)}$ y costo $0$ desde todos los orígenes. Las unidades que "viajan" ahí no se envían: se quedan en el origen. Como el costo es cero,`,
      '',
      `$$${formatQty(gap)} \\times 0 = 0$$`,
      '',
      'no cambian el valor de $Z$. En la tabla de abajo esa columna ya está añadida, y los métodos trabajarán sobre ella.',
    ].join('\n');
  }
  const name = balanced.origins[balanced.origins.length - 1];
  return [
    ...head,
    `La demanda supera a la oferta en **${formatQty(gap)}** unidades. Faltan unidades reales para cubrir todos los destinos.`,
    '',
    `$$\\sum_j b_j - \\sum_i a_i = ${formatQty(D)} - ${formatQty(S)} = ${formatQty(gap)}$$`,
    '',
    `Se agrega el origen **${name}** con oferta \$${formatQty(gap)}$ y costo $0$ hacia todos los destinos. Esas unidades no existen en la realidad: representan demanda sin cubrir. Entran al modelo solo para igualar las sumas, y no cambian $Z$ porque cada unidad ficticia cuesta $0$.`,
  ].join('\n');
}

function methodIntro(id: MethodId, m: number, n: number): string {
  const req = m + n - 1;
  if (id === 'noroeste') {
    return [
      'El método de la esquina noroeste (*North-West Corner*) no consulta los costos para elegir la celda. Solo los usa al final, para sumar $Z$. Por eso suele ser la solución factible más cara de las tres, y también la más fácil de ejecutar a mano.',
      '',
      'La regla es esta:',
      '',
      '1. La celda activa es la esquina noroeste de lo que sigue abierto: la fila abierta de más arriba y la columna abierta de más a la izquierda.',
      '',
      `2. Ahí se asigna $x_{ij} = \\min(a_i', b_j')$. Las primas indican lo que todavía queda, no la oferta original.`,
      '',
      '3. Se resta esa cantidad de la oferta y de la demanda.',
      '',
      '4. Si la oferta llega a cero, la fila se cierra. Si la demanda llega a cero, la columna se cierra. Si las dos llegan a cero juntas, se cierran las dos y el camino salta en diagonal.',
      '',
      '5. Se repite hasta que no quede oferta ni demanda.',
      '',
      `En esta tabla se esperan \$${m} + ${n} - 1 = ${req}$ celdas básicas. Si en algún paso se cierran fila y columna a la vez antes de terminar, faltarán celdas y la solución será degenerada.`,
    ].join('\n');
  }
  if (id === 'minimo') {
    return [
      'El método del costo mínimo (*Minimum-Cost*) sí mira la matriz. En cada paso escoge la celda abierta de menor $c_{ij}$ y la llena hasta donde den la oferta y la demanda.',
      '',
      'Si dos celdas empatan en el costo, gana la de menor índice de fila. Si siguen empatadas, gana la de menor índice de columna. Con esa regla el procedimiento no depende de una elección al azar: cualquier persona que siga estos pasos llega a la misma tabla.',
      '',
      'Después de asignar, se cierra la fila, la columna, o las dos si se agotan juntas. Las celdas cerradas ya no entran a la búsqueda del mínimo. El proceso se repite sobre el resto.',
      '',
      `También aquí una base completa tiene \$${m} + ${n} - 1 = ${req}$ celdas. El costo total casi siempre baja respecto a la esquina noroeste, pero eso no demuestra que sea el óptimo del problema.`,
    ].join('\n');
  }
  return [
    'Vogel (*VAM*, *Vogel\'s Approximation Method*) no elige simplemente la celda más barata. Pregunta otra cosa: ¿cuánto se encarece la fila, o la columna, si no uso su ruta más barata?',
    '',
    'Esa diferencia se llama penalización. Si en una fila los dos costos menores son $c^{(1)}$ y $c^{(2)}$, con $c^{(1)} \\le c^{(2)}$,',
    '',
    '$$P = c^{(2)} - c^{(1)}$$',
    '',
    'Una penalización grande significa que dejar pasar la celda barata obliga a pagar bastante más en esa misma fila o columna. Por eso se atiende primero.',
    '',
    'La regla completa:',
    '',
    '1. En cada fila y columna con al menos dos celdas abiertas, se restan los dos costos más pequeños. Una línea con una sola celda abierta no tiene penalización: no existe un segundo costo.',
    '',
    '2. Se elige la penalización mayor. Si empatan, gana la línea cuya celda más barata tenga el menor costo. Si todavía empatan, se prefiere una fila y, dentro de ellas, el menor índice.',
    '',
    '3. Dentro de la línea elegida se asigna en la celda de menor costo, otra vez con $x_{ij} = \\min(a_i\', b_j\')$.',
    '',
    '4. Se cierra lo que se agote y se vuelven a calcular todas las penalizaciones. Las anteriores ya no sirven, porque la tabla cambió.',
    '',
    `La base esperada sigue siendo \$${m} + ${n} - 1 = ${req}$. Vogel suele acercarse más al óptimo que los otros dos métodos, pero el número que salga al final hay que compararlo: en un problema concreto puede no ser el más bajo de los tres, y tampoco es una prueba de optimalidad.`,
  ].join('\n');
}

function choiceNW(state: Mutable, i: number, j: number, iter: number): string {
  const origin = state.origins[i];
  const dest = state.destinations[j];
  const extra = iter === 1
    ? 'Es la primera celda porque está en la esquina superior izquierda. El método no comparó costos: cualquier otro número en $C$ habría señalado la misma casilla.'
    : 'Las filas de más arriba y las columnas de más a la izquierda ya se cerraron. La esquina noroeste de lo que queda es esta celda.';
  return [
    extra,
    '',
    `Origen **${origin}**, destino **${dest}**, celda \$${xTex(i, j)}$.`,
    '',
    `Oferta disponible ahora: $a'_{${i + 1}} = ${formatQty(state.supplyLeft[i])}$.`,
    '',
    `Demanda disponible ahora: $b'_{${j + 1}} = ${formatQty(state.demandLeft[j])}$.`,
    '',
    `El costo unitario, que este método no usa para decidir, es \$${cTex(i, j)} = ${formatQty(state.costs[i][j])}$. Sí entra en la suma de $Z$ cuando se haga el envío.`,
  ].join('\n');
}

function choiceMin(state: Mutable, i: number, j: number, ties: number): string {
  const rows = openRows(state);
  const cols = openCols(state);
  const open = rows.flatMap(ii => cols.map(jj => ({ ii, jj, cost: state.costs[ii][jj] })));
  const listed = open.slice(0, 12).map(cell => `\$${cTex(cell.ii, cell.jj)} = ${formatQty(cell.cost)}$`);
  const more = open.length > 12 ? ` y otras ${open.length - 12} celdas` : '';
  const tieText = ties > 1
    ? `Hay **${ties}** celdas abiertas con ese mismo costo. El desempate elige la menor fila y, si hace falta, la menor columna. Por eso gana **${state.origins[i]}** hacia **${state.destinations[j]}**.`
    : `Ese costo no se repite en otra celda abierta, así que la elección es única.`;
  const only = open.length === 1 ? 'Es la única celda que sigue abierta, así que no hay nada que comparar.' : '';
  return [
    only,
    `Se revisan las celdas cuya fila todavía tiene oferta y cuya columna todavía tiene demanda. ${open.length === 1 ? '' : `Hay **${open.length}** celdas abiertas:`}`,
    '',
    listed.join(', ') + more + '.',
    '',
    `El menor costo es \$${cTex(i, j)} = ${formatQty(state.costs[i][j])}$, en **${state.origins[i]}** → **${state.destinations[j]}**.`,
    '',
    tieText,
  ].filter(Boolean).join('\n');
}

function twoLowest(values: number[]): [number, number] {
  const low = evalNum(`min(${values.map(lit).join(', ')})`);
  const rest = [...values];
  const idx = rest.findIndex(v => Math.abs(v - low) <= EPS);
  rest.splice(idx, 1);
  const second = evalNum(`min(${rest.map(lit).join(', ')})`);
  return [low, second];
}

function vogelCandidates(state: Mutable): { pens: GridSnapshot['penalties']; list: PenRow[] } {
  const rows = openRows(state);
  const cols = openCols(state);
  const rowPen: (number | null)[] = state.origins.map(() => null);
  const colPen: (number | null)[] = state.destinations.map(() => null);
  const list: PenRow[] = [];

  const consider = (kind: 'row' | 'col', index: number, cells: { i: number; j: number; cost: number }[]) => {
    if (cells.length < 2) return;
    const [low, second] = twoLowest(cells.map(c => c.cost));
    const penalty = evalNum(`${lit(second)} - ${lit(low)}`);
    const best = cells.reduce((acc, cell) => {
      if (cell.cost < acc.cost - EPS) return cell;
      if (Math.abs(cell.cost - acc.cost) <= EPS && (cell.i < acc.i || (cell.i === acc.i && cell.j < acc.j))) return cell;
      return acc;
    });
    if (kind === 'row') rowPen[index] = penalty;
    else colPen[index] = penalty;
    list.push({ kind, index, penalty, low, second, i: best.i, j: best.j, minCost: best.cost });
  };

  rows.forEach(i => {
    consider('row', i, cols.map(j => ({ i, j, cost: state.costs[i][j] })));
  });
  cols.forEach(j => {
    consider('col', j, rows.map(i => ({ i, j, cost: state.costs[i][j] })));
  });

  return { pens: { rows: rowPen, cols: colPen }, list };
}

/**
 * Desempates, siempre en el mismo orden, para que dos corridas iguales
 * den la misma tabla:
 * Costo mínimo: menor c_ij; si empatan, menor fila; si siguen empatados, menor columna.
 * Vogel: mayor penalización; si empatan, la línea cuya celda más barata sea menor;
 * si eso también empata, se prefiere la fila y, dentro del mismo tipo, el menor índice.
 */
function pickVogel(list: PenRow[]): PenRow[] {
  return [...list].sort((a, b) => {
    if (Math.abs(b.penalty - a.penalty) > EPS) return b.penalty - a.penalty;
    if (Math.abs(a.minCost - b.minCost) > EPS) return a.minCost - b.minCost;
    if (a.kind !== b.kind) return a.kind === 'row' ? -1 : 1;
    return a.index - b.index;
  });
}

function lineName(state: Mutable, item: PenRow): string {
  return item.kind === 'row' ? state.origins[item.index] : state.destinations[item.index];
}

function choiceVogel(state: Mutable, ordered: PenRow[], pens: GridSnapshot['penalties']): string {
  const winner = ordered[0];
  const samePen = ordered.filter(item => Math.abs(item.penalty - winner.penalty) <= EPS);
  const lines = ordered.map(item => {
    const name = lineName(state, item);
    const mark = item === winner ? ' ← se elige esta' : '';
    return `**${name}** (${item.kind === 'row' ? 'fila' : 'columna'}): $P = ${formatQty(item.second)} - ${formatQty(item.low)} = ${formatQty(item.penalty)}$.${mark}`;
  });
  const singleLines = [
    ...state.supplyLeft.map((v, i) => (v > EPS && (pens?.rows[i] ?? null) === null ? state.origins[i] : null)),
    ...state.demandLeft.map((v, j) => (v > EPS && (pens?.cols[j] ?? null) === null ? state.destinations[j] : null)),
  ].filter((x): x is string => Boolean(x));
  const tie = samePen.length > 1
    ? `Empataron en la penalización: ${samePen.map(item => `**${lineName(state, item)}**`).join(', ')}. Se desempata por la celda más barata de cada línea${Math.abs(samePen[0].minCost - samePen[1].minCost) <= EPS ? ', y como esa también empata, se prefiere la fila de menor índice' : ''}. Gana **${lineName(state, winner)}**.`
    : `La penalización mayor es única: **${lineName(state, winner)}**, con $P = ${formatQty(winner.penalty)}$.`;
  const where = winner.kind === 'row' ? 'esa fila' : 'esa columna';
  return [
    'Se calculan de nuevo las penalizaciones. No se reutiliza ninguna de la iteración anterior.',
    '',
    ...lines,
    '',
    singleLines.length
      ? `Sin penalización, porque solo les queda una celda abierta: ${singleLines.map(n => `**${n}**`).join(', ')}.`
      : 'Todas las filas y columnas abiertas tienen al menos dos celdas, así que todas tienen penalización.',
    '',
    tie,
    '',
    `Dentro de ${where}, la celda más barata es \$${xTex(winner.i, winner.j)}$ (**${state.origins[winner.i]}** → **${state.destinations[winner.j]}**), con \$${cTex(winner.i, winner.j)} = ${formatQty(winner.minCost)}$. El envío se hace ahí.`,
  ].join('\n');
}

function choiceLastCell(state: Mutable, i: number, j: number): string {
  return [
    'Queda una sola celda abierta. Ya no hay dos costos para armar una penalización, ni otra ruta contra la cual comparar.',
    '',
    `La oferta que le queda a **${state.origins[i]}** es \$${formatQty(state.supplyLeft[i])}$ y la demanda que le queda a **${state.destinations[j]}** es \$${formatQty(state.demandLeft[j])}$. En un problema equilibrado esos dos números coinciden, y el envío los agota a los dos.`,
  ].join('\n');
}

function positiveTerms(values: (number | null)[]): string[] {
  return values.filter((v): v is number => v !== null && v > EPS).map(formatQty);
}

function resultBody(state: Mutable, meta: { title: string }, degenerate: boolean): string {
  const used = state.shipments.filter(s => !s.epsilon && s.quantity > 0);
  const m = state.origins.length;
  const n = state.destinations.length;
  const basics = state.alloc.flat().filter(v => v !== null).length;
  const plan = used.map(s => {
    const tag = s.fictional ? ' Este tramo es ficticio: entra en el equilibrio, pero suma $0$ al costo.' : '';
    return `${formatQty(s.quantity)} unidades de **${s.origin}** a **${s.destination}**, a \$${formatQty(s.unit)}$ cada una, aportan \$${formatQty(s.line)}$.${tag}`;
  });
  const rowChecks = state.origins.map((name, i) => {
    const parts = positiveTerms(state.alloc[i]);
    const expr = parts.length ? parts.join(' + ') : '0';
    return `**${name}:** \$${expr} = ${formatQty(state.supplyGiven[i])}$, que es su oferta.`;
  });
  const colChecks = state.destinations.map((name, j) => {
    const parts = positiveTerms(state.alloc.map(row => row[j]));
    const expr = parts.length ? parts.join(' + ') : '0';
    return `**${name}:** \$${expr} = ${formatQty(state.demandGiven[j])}$, que es su demanda.`;
  });
  return [
    `El plan construido con **${meta.title}** es una solución factible inicial. Cada línea de abajo es un envío del tablero.`,
    '',
    ...plan,
    '',
    'Sumando los costos de esos envíos:',
    '',
    `$$${costTex(state.shipments)}$$`,
    '',
    'Comprobación de la oferta, fila por fila. Solo se suman las cantidades positivas; un cero básico no aporta unidades:',
    '',
    ...rowChecks,
    '',
    'Comprobación de la demanda, columna por columna:',
    '',
    ...colChecks,
    '',
    `Celdas básicas (asignaciones positivas y ceros de base): **${basics}**. Se exigen`,
    '',
    `$$m + n - 1 = ${m} + ${n} - 1 = ${m + n - 1}$$`,
    '',
    degenerate
      ? 'La solución nació degenerada y se completó con al menos un cero básico. El costo no cambió por eso.'
      : 'No hizo falta un cero básico: las asignaciones positivas ya formaban una base completa.',
    '',
    'Este valor de $Z$ es el costo de este arranque. No afirma, por sí solo, que no exista otro plan más barato.',
  ].join('\n');
}

function completeBasis(state: Mutable, push: (step: Omit<TransportStep, 'id' | 'runningCost'> & { runningCost?: number }) => void): boolean {
  const m = state.origins.length;
  const n = state.destinations.length;
  const parent = Array.from({ length: m + n }, (_, i) => i);
  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a: number, b: number): boolean => {
    const pa = find(a);
    const pb = find(b);
    if (pa === pb) return false;
    parent[pa] = pb;
    return true;
  };

  let edges = 0;
  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (state.alloc[i][j] !== null && union(i, m + j)) edges += 1;
    }
  }
  const required = m + n - 1;
  const missing = required - edges;
  if (missing <= 0) {
    push({
      phase: 'base',
      phaseLabel: 'Base',
      title: 'La base ya está completa',
      runningCost: runningCost(state),
      grid: snap(state, { showClosure: false }),
      body: [
        `Hay **${edges}** celdas asignadas y la base pide`,
        '',
        `$$m + n - 1 = ${m} + ${n} - 1 = ${required}$$`,
        '',
        'Los dos números coinciden. La solución no es degenerada: las celdas ocupadas conectan todos los orígenes y destinos sin formar un ciclo, que es justo un árbol de transporte. No se agrega ningún cero.',
      ].join('\n'),
    });
    return false;
  }

  const candidates: { i: number; j: number; cost: number }[] = [];
  for (let i = 0; i < m; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (state.alloc[i][j] === null) candidates.push({ i, j, cost: state.costs[i][j] });
    }
  }
  candidates.sort((a, b) => a.cost - b.cost || a.i - b.i || a.j - b.j);
  const added: { i: number; j: number; cost: number }[] = [];
  for (const cell of candidates) {
    if (edges >= required) break;
    if (union(cell.i, m + cell.j)) {
      state.alloc[cell.i][cell.j] = 0;
      state.epsilon[cell.i][cell.j] = true;
      state.shipments.push({
        i: cell.i,
        j: cell.j,
        origin: state.origins[cell.i],
        destination: state.destinations[cell.j],
        quantity: 0,
        unit: cell.cost,
        line: 0,
        epsilon: true,
        fictional: state.origins[cell.i].startsWith('Ficticio') || state.destinations[cell.j].startsWith('Ficticio'),
      });
      added.push(cell);
      edges += 1;
    }
  }
  if (edges < required) throw new TransportError('No se pudo completar la base de la solución.');

  const details = added.map(cell => (
    `Se coloca \$${xTex(cell.i, cell.j)} = 0$ en **${state.origins[cell.i]}** → **${state.destinations[cell.j]}**. Esa celda une dos partes de la base que estaban separadas y no cierra un ciclo. Su aporte al costo es $0 \\times ${formatQty(cell.cost)} = 0$.`
  ));
  push({
    phase: 'base',
    phaseLabel: 'Base',
    title: missing === 1 ? 'Hace falta un cero en la base' : `Hacen falta ${missing} ceros en la base`,
    runningCost: runningCost(state),
    grid: snap(state, { showClosure: false, focus: { i: added[0].i, j: added[0].j } }),
    body: [
      'Una solución básica de transporte es un árbol: conecta los $m$ orígenes y los $n$ destinos con exactamente',
      '',
      `$$m + n - 1 = ${m} + ${n} - 1 = ${required}$$`,
      '',
      `celdas, sin ciclos. Las asignaciones positivas son menos que eso (**faltan ${missing}**). El plan sigue siendo factible, porque la oferta y la demanda sí se cumplen. Lo que falta es una variable básica. A eso se le llama **degeneración**.`,
      '',
      'El cero se escribe en la celda libre de menor costo que conecta dos grupos todavía separados. En el tablero aparece como $0$ con una $\\varepsilon$: es básico, pero no mueve carga.',
      '',
      ...details,
      '',
      'El costo acumulado no se mueve:',
      '',
      `$$${costTex(state.shipments)}$$`,
    ].join('\n'),
  });
  return true;
}

function assertConserved(state: Mutable) {
  state.origins.forEach((_, i) => {
    const got = sumList(state.alloc[i].map(v => v ?? 0));
    if (Math.abs(got - state.supplyGiven[i]) > 1e-6) {
      throw new TransportError(`La fila ${state.origins[i]} no cumple su oferta.`);
    }
  });
  state.destinations.forEach((_, j) => {
    const got = sumList(state.alloc.map(row => row[j] ?? 0));
    if (Math.abs(got - state.demandGiven[j]) > 1e-6) {
      throw new TransportError(`La columna ${state.destinations[j]} no cumple su demanda.`);
    }
  });
  if (openRows(state).length || openCols(state).length) {
    throw new TransportError('Quedó oferta o demanda sin asignar.');
  }
  const basics = state.alloc.flat().filter(v => v !== null).length;
  const required = state.origins.length + state.destinations.length - 1;
  if (basics !== required) {
    throw new TransportError('La base no tiene m + n − 1 celdas.');
  }
}

function solveMethod(
  original: TransportInput,
  balanced: TransportInput,
  added: AddedLine,
  gap: number,
  id: MethodId,
): MethodResult {
  const meta = METHOD_INFO[id];
  const state = createState(balanced);
  const steps: TransportStep[] = [];
  let iter = 0;

  const push = (step: Omit<TransportStep, 'id' | 'runningCost'> & { runningCost?: number }) => {
    steps.push({
      ...step,
      runningCost: step.runningCost ?? runningCost(state),
      id: `${id}-${steps.length}`,
    });
  };

  push({
    phase: 'modelo',
    phaseLabel: 'Modelo',
    title: 'El modelo matemático',
    grid: blankGrid(original),
    body: modelBody(original),
  });
  push({
    phase: 'balance',
    phaseLabel: 'Equilibrio',
    title: added === 'none' ? 'El problema ya está equilibrado' : 'Hay que equilibrar la tabla',
    grid: blankGrid(balanced),
    body: balanceBody(original, balanced, added, gap),
  });
  push({
    phase: 'metodo',
    phaseLabel: 'Método',
    title: `Cómo funciona: ${meta.title}`,
    grid: snap(state),
    body: methodIntro(id, balanced.origins.length, balanced.destinations.length),
  });

  const assignStep = (i: number, j: number) => {
    const before = { supply: state.supplyLeft[i], demand: state.demandLeft[j] };
    const qty = evalNum(`min(${lit(before.supply)}, ${lit(before.demand)})`);
    const first = iter === 1;
    apply(state, i, j, qty);
    push({
      phase: 'asignacion',
      phaseLabel: 'Asignación',
      title: `Iteración ${iter}: se envían ${formatQty(qty)} unidades`,
      grid: snap(state, { showClosure: true, focus: { i, j } }),
      body: assignmentBody(before, state, i, j, qty, first),
    });
  };

  let guard = 0;
  while (openRows(state).length || openCols(state).length) {
    guard += 1;
    if (guard > balanced.origins.length * balanced.destinations.length + 2) {
      throw new TransportError('El método no terminó. Revisa los datos.');
    }
    const rows = openRows(state);
    const cols = openCols(state);
    if (!rows.length || !cols.length) throw new TransportError('Oferta y demanda no cierran.');
    iter += 1;

    if (id === 'noroeste') {
      const i = rows[0];
      const j = cols[0];
      push({
        phase: 'eleccion',
        phaseLabel: 'Elección',
        title: `Iteración ${iter}: la esquina noroeste`,
        grid: snap(state, { showClosure: true, focus: { i, j } }),
        body: choiceNW(state, i, j, iter),
      });
      assignStep(i, j);
      continue;
    }

    if (id === 'minimo') {
      let best: { i: number; j: number; cost: number } | null = null;
      let ties = 0;
      rows.forEach(i => {
        cols.forEach(j => {
          const cost = state.costs[i][j];
          const better = !best || cost < best.cost - EPS || (Math.abs(cost - best.cost) <= EPS && (i < best.i || (i === best.i && j < best.j)));
          if (!best || better) {
            if (!best || cost < best.cost - EPS) ties = 1;
            else if (Math.abs(cost - best.cost) <= EPS) ties += 1;
            best = { i, j, cost };
          } else if (Math.abs(cost - best.cost) <= EPS) ties += 1;
        });
      });
      if (!best) throw new TransportError('No quedó una celda de costo mínimo.');
      const picked = best as { i: number; j: number; cost: number };
      push({
        phase: 'eleccion',
        phaseLabel: 'Elección',
        title: `Iteración ${iter}: la celda más barata`,
        grid: snap(state, { showClosure: true, focus: { i: picked.i, j: picked.j } }),
        body: choiceMin(state, picked.i, picked.j, ties),
      });
      assignStep(picked.i, picked.j);
      continue;
    }

    if (rows.length === 1 && cols.length === 1) {
      push({
        phase: 'eleccion',
        phaseLabel: 'Elección',
        title: `Iteración ${iter}: la última celda`,
        grid: snap(state, { showClosure: true, focus: { i: rows[0], j: cols[0] } }),
        body: choiceLastCell(state, rows[0], cols[0]),
      });
      assignStep(rows[0], cols[0]);
      continue;
    }

    const { pens, list } = vogelCandidates(state);
    if (!list.length) throw new TransportError('Vogel no pudo calcular penalizaciones.');
    const ordered = pickVogel(list);
    const winner = ordered[0];
    push({
      phase: 'eleccion',
      phaseLabel: 'Elección',
      title: `Iteración ${iter}: penalizaciones de Vogel`,
      grid: snap(state, {
        showClosure: true,
        focus: { i: winner.i, j: winner.j },
        penalties: pens,
        penaltyPick: { kind: winner.kind, index: winner.index },
      }),
      body: choiceVogel(state, ordered, pens),
    });
    assignStep(winner.i, winner.j);
  }

  const degenerate = completeBasis(state, push);
  const basics = state.alloc.flat().filter(v => v !== null).length;
  push({
    phase: 'resultado',
    phaseLabel: 'Resultado',
    title: `Costo total: ${formatQty(runningCost(state))}`,
    grid: snap(state, { showClosure: false }),
    body: resultBody(state, meta, degenerate),
  });
  assertConserved(state);

  return {
    id,
    title: meta.title,
    english: meta.english,
    totalCost: runningCost(state),
    degenerate,
    iterations: steps.filter(item => item.phase === 'asignacion').length,
    basicCount: basics,
    requiredBasics: balanced.origins.length + balanced.destinations.length - 1,
    steps,
    shipments: state.shipments.map(s => ({ ...s })),
  };
}

export function solveAll(raw: TransportInput): SolvedTransport {
  const original = cloneInput(raw);
  const { problem, added, gap } = balanceProblem(original);
  const methods: MethodId[] = ['noroeste', 'minimo', 'vogel'];
  return {
    original,
    balanced: problem,
    added,
    gap,
    methods: methods.map(id => solveMethod(original, problem, added, gap, id)),
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'compacto',
    name: '3 × 3 de clase',
    blurb: 'Tabla corta para seguir cada mínimo con números pequeños.',
    data: {
      origins: ['O1', 'O2', 'O3'],
      destinations: ['D1', 'D2', 'D3'],
      costs: [
        [2, 7, 4],
        [3, 3, 1],
        [5, 4, 7],
      ],
      supply: [5, 8, 7],
      demand: [7, 9, 4],
    },
  },
  {
    id: 'clasico',
    name: 'Clásico 3 × 4',
    blurb: 'El ejemplo largo: la esquina noroeste y el costo mínimo no coinciden.',
    data: {
      origins: ['O1', 'O2', 'O3'],
      destinations: ['D1', 'D2', 'D3', 'D4'],
      costs: [
        [10, 2, 20, 11],
        [12, 7, 9, 20],
        [4, 14, 16, 18],
      ],
      supply: [15, 25, 10],
      demand: [5, 15, 15, 15],
    },
  },
  {
    id: 'desbalance',
    name: 'Oferta de sobra',
    blurb: 'Sobra oferta. Al resolver se agrega un destino ficticio de costo cero.',
    data: {
      origins: ['Planta A', 'Planta B'],
      destinations: ['Ciudad 1', 'Ciudad 2'],
      costs: [
        [8, 6],
        [4, 9],
      ],
      supply: [20, 30],
      demand: [15, 25],
    },
  },
  {
    id: 'faltante',
    name: 'Falta oferta',
    blurb: 'La demanda es mayor. Al resolver se agrega un origen ficticio de costo cero.',
    data: {
      origins: ['A', 'B'],
      destinations: ['C1', 'C2', 'C3'],
      costs: [
        [3, 6, 4],
        [5, 2, 7],
      ],
      supply: [30, 20],
      demand: [15, 25, 20],
    },
  },
];
