/**
 * Teoría de Colas — modelos M/M/1 y M/M/c (c ≤ 10).
 * Fórmulas clásicas de nacimiento-muerte con llegada Poisson y servicio exponencial.
 */

export type ColaModelo = 'MM1' | 'MMc';

export interface ColasInput {
  model: ColaModelo;
  /** Tasa de llegada λ > 0 */
  lambda: number;
  /** Tasa de servicio por servidor μ > 0 */
  mu: number;
  /** Número de servidores (solo M/M/c); 1..10 */
  c: number;
  /** Máximo n para Pn (default 10) */
  maxN?: number;
}

export interface ColasStep {
  id: string;
  title: string;
  content: string;
}

export interface ColasResult {
  model: ColaModelo;
  rho: number;
  stable: boolean;
  P0: number;
  L: number;
  Lq: number;
  W: number;
  Wq: number;
  Pn: { n: number; p: number }[];
  steps: ColasStep[];
  interpretation: string;
}

export interface ColasPreset {
  id: string;
  name: string;
  blurb: string;
  data: ColasInput;
  expected?: Partial<Pick<ColasResult, 'rho' | 'L' | 'Lq' | 'P0'>>;
}

export class ColasError extends Error {}

const EPS = 1e-12;

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function fmt(v: number, d = 4): string {
  if (!Number.isFinite(v)) return '∞';
  const r = Math.round(v * 10 ** d) / 10 ** d;
  return Number.isInteger(r) ? String(r) : r.toFixed(d).replace(/\.?0+$/, '');
}

export function validateColasInput(raw: ColasInput): string[] {
  const issues: string[] = [];
  if (!(raw.lambda > 0) || !Number.isFinite(raw.lambda)) {
    issues.push('La tasa de llegada λ debe ser un número positivo.');
  }
  if (!(raw.mu > 0) || !Number.isFinite(raw.mu)) {
    issues.push('La tasa de servicio μ debe ser un número positivo.');
  }
  if (raw.model === 'MMc') {
    if (!Number.isInteger(raw.c) || raw.c < 1 || raw.c > 10) {
      issues.push('El número de servidores c debe ser un entero entre 1 y 10.');
    }
  }
  return issues;
}

export function blankColas(): ColasInput {
  return { model: 'MM1', lambda: 8, mu: 10, c: 1, maxN: 10 };
}

export function solveColas(raw: ColasInput): ColasResult {
  const issues = validateColasInput(raw);
  if (issues.length) throw new ColasError(issues[0]);

  const { lambda: λ, mu: μ } = raw;
  const c = raw.model === 'MM1' ? 1 : raw.c;
  const maxN = Math.min(20, Math.max(5, raw.maxN ?? 10));
  const steps: ColasStep[] = [];

  if (c === 1) {
    const rho = λ / μ;
    steps.push({
      id: 's0',
      title: 'Modelo M/M/1',
      content:
        `Llegadas Poisson con tasa $\\lambda = ${fmt(λ)}$, servicio exponencial $\\mu = ${fmt(μ)}$.\n\n` +
        `Utilización del servidor: $\\rho = \\dfrac{\\lambda}{\\mu} = ${fmt(rho)}$.`,
    });

    if (rho >= 1 - EPS) {
      steps.push({
        id: 's1',
        title: 'Sistema inestable',
        content: `Como $\\rho \\geq 1$, la cola crece sin límite. Se requiere $\\rho < 1$ (es decir $\\lambda < \\mu$).`,
      });
      return {
        model: 'MM1',
        rho,
        stable: false,
        P0: 0,
        L: Infinity,
        Lq: Infinity,
        W: Infinity,
        Wq: Infinity,
        Pn: [],
        steps,
        interpretation: 'El sistema no alcanza estado estable: la demanda supera la capacidad de servicio.',
      };
    }

    const P0 = 1 - rho;
    const Lq = (rho * rho) / (1 - rho);
    const L = rho / (1 - rho);
    const W = 1 / (μ - λ);
    const Wq = λ / (μ * (μ - λ));
    const Pn = Array.from({ length: maxN + 1 }, (_, n) => ({ n, p: P0 * rho ** n }));

    steps.push({
      id: 's1',
      title: 'Probabilidad de sistema vacío',
      content: `$P_0 = 1 - \\rho = ${fmt(P0)}$.`,
    });
    steps.push({
      id: 's2',
      title: 'Longitudes medias',
      content:
        `$L_q = \\dfrac{\\rho^2}{1-\\rho} = ${fmt(Lq)}$ (cola)\n\n` +
        `$L = \\dfrac{\\rho}{1-\\rho} = ${fmt(L)}$ (sistema)`,
    });
    steps.push({
      id: 's3',
      title: 'Tiempos medios',
      content:
        `$W = \\dfrac{1}{\\mu-\\lambda} = ${fmt(W)}$\n\n` +
        `$W_q = \\dfrac{\\lambda}{\\mu(\\mu-\\lambda)} = ${fmt(Wq)}$\n\n` +
        `Ley de Little: $L = \\lambda W$, $L_q = \\lambda W_q$.`,
    });
    steps.push({
      id: 's4',
      title: 'Distribución de estado',
      content: `$P_n = (1-\\rho)\\rho^n = P_0\\rho^n$ para $n = 0,1,2,\\ldots$`,
    });

    return {
      model: 'MM1',
      rho,
      stable: true,
      P0,
      L,
      Lq,
      W,
      Wq,
      Pn,
      steps,
      interpretation:
        `Con utilización ${(rho * 100).toFixed(1)}%, en promedio hay ${fmt(L, 2)} clientes en el sistema ` +
        `(${fmt(Lq, 2)} en cola). El tiempo medio en sistema es ${fmt(W, 3)} y en cola ${fmt(Wq, 3)}.`,
    };
  }

  // M/M/c
  const rho = λ / (c * μ);
  const a = λ / μ; // intensidad de tráfico
  steps.push({
    id: 's0',
    title: 'Modelo M/M/c',
    content:
      `$\\lambda = ${fmt(λ)}$, $\\mu = ${fmt(μ)}$, $c = ${c}$ servidores.\n\n` +
      `Utilización por servidor: $\\rho = \\dfrac{\\lambda}{c\\mu} = ${fmt(rho)}$.\n` +
      `Intensidad de tráfico: $a = \\dfrac{\\lambda}{\\mu} = ${fmt(a)}$.`,
  });

  if (rho >= 1 - EPS) {
    steps.push({
      id: 's1',
      title: 'Sistema inestable',
      content: `Se requiere $\\rho < 1$, es decir $\\lambda < c\\mu$.`,
    });
    return {
      model: 'MMc',
      rho,
      stable: false,
      P0: 0,
      L: Infinity,
      Lq: Infinity,
      W: Infinity,
      Wq: Infinity,
      Pn: [],
      steps,
      interpretation: 'Capacidad insuficiente: la cola no se estabiliza.',
    };
  }

  let sum = 0;
  for (let n = 0; n < c; n++) sum += a ** n / factorial(n);
  sum += (a ** c) / (factorial(c) * (1 - rho));
  const P0 = 1 / sum;

  const Lq = (P0 * (a ** c) * rho) / (factorial(c) * (1 - rho) ** 2);
  const L = Lq + a;
  const Wq = Lq / λ;
  const W = Wq + 1 / μ;

  const Pn: { n: number; p: number }[] = [];
  for (let n = 0; n <= maxN; n++) {
    let p: number;
    if (n < c) p = P0 * (a ** n) / factorial(n);
    else p = P0 * (a ** n) / (factorial(c) * c ** (n - c));
    Pn.push({ n, p });
  }

  steps.push({
    id: 's1',
    title: 'Probabilidad de vacío',
    content:
      `$P_0 = \\left[\\sum_{n=0}^{c-1}\\dfrac{a^n}{n!} + \\dfrac{a^c}{c!(1-\\rho)}\\right]^{-1} = ${fmt(P0)}$.`,
  });
  steps.push({
    id: 's2',
    title: 'Cola y sistema',
    content:
      `$L_q = P_0\\dfrac{a^c\\rho}{c!(1-\\rho)^2} = ${fmt(Lq)}$\n\n` +
      `$L = L_q + a = ${fmt(L)}$`,
  });
  steps.push({
    id: 's3',
    title: 'Tiempos (Little)',
    content:
      `$W_q = L_q/\\lambda = ${fmt(Wq)}$,\quad $W = W_q + 1/\\mu = ${fmt(W)}$.`,
  });

  return {
    model: 'MMc',
    rho,
    stable: true,
    P0,
    L,
    Lq,
    W,
    Wq,
    Pn,
    steps,
    interpretation:
      `Con $c=${c}$ servidores y utilización ${(rho * 100).toFixed(1)}% por servidor, ` +
      `hay ${fmt(Lq, 2)} clientes en cola y ${fmt(L, 2)} en el sistema en promedio.`,
  };
}

export const COLAS_PRESETS: ColasPreset[] = [
  {
    id: 'banco-mm1',
    name: 'Cajero único',
    blurb: 'Banco con un cajero: λ=12/h, μ=15/h',
    data: { model: 'MM1', lambda: 12, mu: 15, c: 1, maxN: 10 },
    expected: { rho: 0.8, L: 4, Lq: 3.2 },
  },
  {
    id: 'taller-mm1',
    name: 'Taller mecánico',
    blurb: 'Un mecánico: λ=4/h, μ=5/h',
    data: { model: 'MM1', lambda: 4, mu: 5, c: 1, maxN: 8 },
    expected: { rho: 0.8 },
  },
  {
    id: 'call-mmc',
    name: 'Call center',
    blurb: '3 agentes: λ=20/h, μ=8/h cada uno',
    data: { model: 'MMc', lambda: 20, mu: 8, c: 3, maxN: 12 },
    expected: { rho: 20 / 24 },
  },
  {
    id: 'clinica-mmc',
    name: 'Clínica',
    blurb: '2 consultorios: λ=10/h, μ=6/h',
    data: { model: 'MMc', lambda: 10, mu: 6, c: 2, maxN: 10 },
    expected: { rho: 10 / 12 },
  },
];
