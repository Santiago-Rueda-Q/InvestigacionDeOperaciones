/**
 * Programación No Lineal (alcance pedagógico acotado):
 * Optimización univariable de un polinomio f(x)=a₂x²+a₁x+a₀ (+ opcional a₃x³)
 * en un intervalo [lo, hi], usando derivada y evaluación en extremos / críticos.
 */

export interface NoLinealInput {
  /** Coeficientes [a0, a1, a2, a3?] → f(x)=a0 + a1 x + a2 x² + a3 x³ */
  coeffs: number[];
  lo: number;
  hi: number;
  sense: 'min' | 'max';
}

export interface NoLinealCritical {
  x: number;
  f: number;
  f2: number;
  kind: 'mínimo local' | 'máximo local' | 'punto de inflexión' | 'crítico';
  inDomain: boolean;
}

export interface NoLinealStep {
  id: string;
  title: string;
  content: string;
}

export interface NoLinealResult {
  polyLatex: string;
  derivativeLatex: string;
  secondDerivativeLatex: string;
  criticals: NoLinealCritical[];
  candidates: { x: number; f: number; label: string }[];
  optimal: { x: number; f: number };
  steps: NoLinealStep[];
  samples: { x: number; f: number }[];
}

export interface NoLinealPreset {
  id: string;
  name: string;
  blurb: string;
  data: NoLinealInput;
  expected: { x: number; f: number };
}

export class NoLinealError extends Error {}

const EPS = 1e-9;

const fmt = (v: number) => {
  const r = Math.round(v * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '');
};

export function evalPoly(coeffs: number[], x: number): number {
  let s = 0;
  for (let i = 0; i < coeffs.length; i++) s += coeffs[i] * x ** i;
  return s;
}

export function derivativeCoeffs(coeffs: number[]): number[] {
  if (coeffs.length <= 1) return [0];
  return coeffs.slice(1).map((c, i) => c * (i + 1));
}

function polyLatex(coeffs: number[], name = 'f'): string {
  const parts: string[] = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const c = coeffs[i];
    if (Math.abs(c) < EPS) continue;
    const abs = Math.abs(c);
    const coef = abs === 1 && i > 0 ? '' : fmt(abs);
    const sign = parts.length === 0 ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + ';
    const term =
      i === 0 ? `${coef || '0'}` :
      i === 1 ? `${coef}x` :
      `${coef}x^{${i}}`;
    parts.push(`${sign}${term}`);
  }
  return `${name}(x) = ${parts.length ? parts.join('') : '0'}`;
}

/** Raíces reales de ax²+bx+c=0 o bx+c=0 */
function solveDerivativeRoots(d: number[]): number[] {
  const a = d[2] ?? 0;
  const b = d[1] ?? 0;
  const c = d[0] ?? 0;
  if (Math.abs(a) > EPS) {
    const disc = b * b - 4 * a * c;
    if (disc < -EPS) return [];
    if (Math.abs(disc) <= EPS) return [-b / (2 * a)];
    const s = Math.sqrt(Math.max(0, disc));
    return [(-b - s) / (2 * a), (-b + s) / (2 * a)];
  }
  if (Math.abs(b) > EPS) return [-c / b];
  return [];
}

export function validateNoLinealInput(raw: NoLinealInput): string[] {
  const issues: string[] = [];
  if (!raw.coeffs?.length || raw.coeffs.length > 4) {
    issues.push('Usa entre 1 y 4 coeficientes (hasta cúbico).');
  }
  if (raw.coeffs?.some(c => !Number.isFinite(c))) {
    issues.push('Coeficientes inválidos.');
  }
  if (!Number.isFinite(raw.lo) || !Number.isFinite(raw.hi) || raw.lo >= raw.hi) {
    issues.push('El intervalo [lo, hi] debe cumplir lo < hi.');
  }
  const deg = [...(raw.coeffs ?? [])].reverse().findIndex(c => Math.abs(c) > EPS);
  const realDeg = deg < 0 ? 0 : (raw.coeffs.length - 1 - deg);
  if (realDeg < 2) {
    issues.push('Para NLP univariable interesa al menos un término cuadrático (grado ≥ 2).');
  }
  return issues;
}

export function blankNoLineal(): NoLinealInput {
  return { coeffs: [0, -4, 1], lo: -1, hi: 5, sense: 'min' }; // x² - 4x
}

export function solveNoLineal(raw: NoLinealInput): NoLinealResult {
  const issues = validateNoLinealInput(raw);
  if (issues.length) throw new NoLinealError(issues[0]);

  const coeffs = [...raw.coeffs];
  while (coeffs.length < 3) coeffs.push(0);
  const d1 = derivativeCoeffs(coeffs);
  const d2 = derivativeCoeffs(d1);
  const steps: NoLinealStep[] = [];

  steps.push({
    id: 'intro',
    title: 'Diferencia con PL',
    content:
      `En **programación no lineal** la función objetivo (o las restricciones) no son lineales. ` +
      `Aquí resolvemos un problema univariable en un intervalo cerrado $[${fmt(raw.lo)}, ${fmt(raw.hi)}]$, ` +
      `usando la condición necesaria $f'(x)=0$ y la suficiente vía $f''(x)$.`,
  });

  const pL = polyLatex(coeffs, 'f');
  const dL = polyLatex(d1, "f'");
  const d2L = polyLatex(d2, "f''");

  steps.push({
    id: 'deriv',
    title: 'Derivadas',
    content: `$$${pL}$$\n\n$$${dL}$$\n\n$$${d2L}$$`,
  });

  const roots = solveDerivativeRoots(d1);
  const criticals: NoLinealCritical[] = roots.map(x => {
    const f2 = evalPoly(d2, x);
    const f = evalPoly(coeffs, x);
    let kind: NoLinealCritical['kind'] = 'crítico';
    if (f2 > EPS) kind = 'mínimo local';
    else if (f2 < -EPS) kind = 'máximo local';
    else kind = 'punto de inflexión';
    return {
      x,
      f,
      f2,
      kind,
      inDomain: x >= raw.lo - EPS && x <= raw.hi + EPS,
    };
  });

  steps.push({
    id: 'crit',
    title: 'Puntos críticos',
    content: roots.length
      ? roots
          .map((x, i) => {
            const c = criticals[i];
            return `$x=${fmt(x)}$, $f=${fmt(c.f)}$, $f''=${fmt(c.f2)}$ → **${c.kind}**` +
              (c.inDomain ? '' : ' (fuera del intervalo)');
          })
          .join('\n\n')
      : 'No hay raíces reales de $f\'(x)=0$ (p. ej. derivada nunca cero).',
  });

  const candidates: NoLinealResult['candidates'] = [
    { x: raw.lo, f: evalPoly(coeffs, raw.lo), label: 'extremo lo' },
    { x: raw.hi, f: evalPoly(coeffs, raw.hi), label: 'extremo hi' },
    ...criticals
      .filter(c => c.inDomain)
      .map(c => ({ x: c.x, f: c.f, label: c.kind })),
  ];

  // deduplicar x cercanos
  const uniq: typeof candidates = [];
  for (const c of candidates) {
    if (!uniq.some(u => Math.abs(u.x - c.x) < 1e-6)) uniq.push(c);
  }

  let optimal = uniq[0];
  for (const c of uniq) {
    const better =
      raw.sense === 'min' ? c.f < optimal.f - EPS : c.f > optimal.f + EPS;
    const tie =
      Math.abs(c.f - optimal.f) <= EPS &&
      c.label.includes('local') &&
      !optimal.label.includes('local');
    if (better || tie) optimal = c;
  }

  steps.push({
    id: 'opt',
    title: 'Óptimo en el intervalo',
    content:
      `Se comparan extremos y críticos factibles (${raw.sense === 'min' ? 'mínimo' : 'máximo'}):\n\n` +
      uniq.map(c => `• ${c.label}: $x=${fmt(c.x)}$, $f=${fmt(c.f)}$`).join('\n\n') +
      `\n\n**Óptimo:** $x^*=${fmt(optimal.x)}$, $f(x^*)=${fmt(optimal.f)}$.`,
  });

  const nSamples = 60;
  const samples = Array.from({ length: nSamples }, (_, i) => {
    const x = raw.lo + ((raw.hi - raw.lo) * i) / (nSamples - 1);
    return { x, f: evalPoly(coeffs, x) };
  });

  return {
    polyLatex: pL,
    derivativeLatex: dL,
    secondDerivativeLatex: d2L,
    criticals,
    candidates: uniq,
    optimal: { x: optimal.x, f: optimal.f },
    steps,
    samples,
  };
}

export const NOLINEAL_PRESETS: NoLinealPreset[] = [
  {
    id: 'parabola-min',
    name: 'Parábola (mínimo)',
    blurb: 'f(x)=x²−4x en [−1,5]',
    data: { coeffs: [0, -4, 1], lo: -1, hi: 5, sense: 'min' },
    expected: { x: 2, f: -4 },
  },
  {
    id: 'parabola-max',
    name: 'Ingreso marginal',
    blurb: 'f(x)=−x²+10x en [0,10] (máx)',
    data: { coeffs: [0, 10, -1], lo: 0, hi: 10, sense: 'max' },
    expected: { x: 5, f: 25 },
  },
  {
    id: 'cubica',
    name: 'Cúbica acotada',
    blurb: 'f(x)=x³−3x en [−2,2] (mín)',
    data: { coeffs: [0, -3, 0, 1], lo: -2, hi: 2, sense: 'min' },
    // Óptimo f*=-2 en x=-2 (extremo) y en x=1 (mínimo local); el solver prioriza críticos interiores en empate.
    expected: { x: 1, f: -2 },
  },
];
