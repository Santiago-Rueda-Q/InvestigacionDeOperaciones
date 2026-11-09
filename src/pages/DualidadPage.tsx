import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ArrowRightLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  DualidadResult,
  DUALIDAD_PRESETS,
  buildDual,
  solveDualidad,
} from '../core/DualidadSolver';
import { SimplexProblem, Constraint, OptimizationType } from '../types';
import { ModuleShell, glass, inputClass, sidebarBasisForColumns, sectionLabelClass, RELATION_OPTIONS } from '../components/io/ModuleShell';
import {
  SolveButton,
  ClearButton,
  ValidationList,
  HintBanner,
  DimensionStepper,
} from '../components/io/CalculatorChrome';
import { DarkSelect } from '../components/io/DarkSelect';
import { TextWithMath } from '../components/LatexRenderer';
import { LatexRenderer } from '../components/LatexRenderer';

const ACCENT = '#6366f1';
const sectionTitle = (t: string) => <p className={sectionLabelClass}>{t}</p>;

function validateDualInput(p: SimplexProblem): string[] {
  const errs: string[] = [];
  if (p.numVars < 1) errs.push('El problema debe tener al menos 1 variable.');
  if (p.constraints.length < 1) errs.push('Se requiere al menos una restricción.');
  if (p.objectiveCoeffs.some(isNaN)) errs.push('Los coeficientes de la FO contienen valores inválidos.');
  for (const c of p.constraints) {
    if (c.coefficients.some(isNaN) || isNaN(c.rhs)) errs.push(`Restricción ${c.id}: datos inválidos.`);
  }
  return errs;
}

const relLatex: Record<string, string> = { '<=': '\\leq', '>=': '\\geq', '=': '=' };
const relSymbol: Record<string, string> = { '<=': '≤', '>=': '≥', '=': '=' };

// ── Tarjeta de problema ───────────────────────────────────────────

const ProblemCard: React.FC<{
  problem: SimplexProblem;
  label: string;
  varPrefix?: string;
  accent?: string;
}> = ({ problem, label, varPrefix = 'x', accent = ACCENT }) => {
  const terms = problem.objectiveCoeffs.map((c, i) => `${c}${varPrefix}_{${i + 1}}`).join(' + ');
  const rows = problem.constraints.map((c, j) => {
    const lhs = c.coefficients.map((v, k) => `${v}${varPrefix}_{${k + 1}}`).join(' + ');
    return `${lhs} ${relLatex[c.relation]} ${c.rhs}`;
  }).join(' \\\\ ');

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: `1px solid ${accent}33` }}>
      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', borderLeft: `3px solid ${accent}` }}>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>{label}</span>
      </div>
      <div className="p-4 overflow-x-auto">
        <LatexRenderer block math={
          `\\begin{aligned}\n` +
          `&\\text{${problem.type === 'MAX' ? 'Maximizar' : 'Minimizar'}} \\quad ${problem.type === 'MAX' ? 'Z' : 'W'} = ${terms} \\\\\n` +
          `&\\text{s.a.:} \\quad \\begin{cases} ${rows} \\end{cases} \\\\\n` +
          `&${varPrefix}_j \\geq 0\n` +
          `\\end{aligned}`
        } />
      </div>
    </div>
  );
};

// ── Tabla de precios sombra ───────────────────────────────────────

const ShadowPricesTable: React.FC<{ result: DualidadResult; primal: SimplexProblem }> = ({ result, primal }) => {
  if (!result.primalSolution) return null;
  const fmt = (v: number) => Math.abs(v) < 1e-9 ? '0' : (Number.isInteger(v) ? String(v) : v.toFixed(4).replace(/\.?0+$/, ''));

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Precios Sombra (Variables Duales)</span>
      </div>
      <div className="overflow-x-auto p-3">
        <table className="w-full text-center text-xs border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 text-white/40 font-semibold text-left">Restricción</th>
              <th className="px-2 py-2 text-white/40 font-semibold">RHS (b_i)</th>
              <th className="px-2 py-2 text-white/40 font-semibold">Variable dual y_i</th>
              <th className="px-2 py-2 text-white/40 font-semibold">Interpretación</th>
            </tr>
          </thead>
          <tbody>
            {result.shadowPrices.map((sp, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <td className="px-3 py-2 text-left font-semibold text-white/60">
                  <LatexRenderer math={`R_{${i + 1}}`} />
                </td>
                <td className="px-2 py-2 font-mono text-white/70">{primal.constraints[i]?.rhs ?? '—'}</td>
                <td className="px-2 py-2 font-mono font-bold" style={{ color: Math.abs(sp) > 1e-9 ? ACCENT : 'rgba(255,255,255,0.4)' }}>
                  {fmt(sp)}
                </td>
                <td className="px-2 py-2 text-white/40 text-[10px]">
                  {Math.abs(sp) < 1e-9
                    ? 'Restricción inactiva (holgura > 0)'
                    : `↑ b${i + 1} en 1 → Z* ${sp > 0 ? '+' : ''}${fmt(sp)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Resultado de dualidad fuerte ──────────────────────────────────

const DualityStrengthCard: React.FC<{ result: DualidadResult }> = ({ result }) => {
  if (!result.primalSolution || !result.dualSolution) return null;
  const fmt = (v: number) => v.toFixed(4).replace(/\.?0+$/, '');
  const verified = result.dualityGap < 1e-4;

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-4"
      style={{
        background: verified ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.08)',
        border: `1px solid ${verified ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
      }}
    >
      {verified
        ? <CheckCircle2 size={28} className="text-emerald-400 shrink-0" aria-hidden />
        : <AlertTriangle size={28} className="text-amber-400 shrink-0" aria-hidden />}
      <div>
        <p className="text-sm font-bold" style={{ color: verified ? '#10b981' : '#fbbf24' }}>
          Dualidad Fuerte {verified ? 'Verificada' : 'con Brecha'}
        </p>
        <p className="text-xs text-white/50 mt-0.5">
          Z* = {fmt(result.primalSolution.z)} &nbsp;|&nbsp; W* = {fmt(result.dualSolution.w)}
          &nbsp;|&nbsp; |Z* − W*| = {fmt(result.dualityGap)}
        </p>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────

const PRESET_NAMES = ['Producción 2×2', 'Clásico 3 restricciones', 'Dieta MIN'];

export const DualidadPage: React.FC = () => {
  const [presetIdx, setPresetIdx] = useState(0);
  const [problem, setProblem] = useState<SimplexProblem>(() => structuredClone(DUALIDAD_PRESETS[0]));
  const [result, setResult] = useState<DualidadResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const sidebarBasisRem = useMemo(
    () => sidebarBasisForColumns(problem.numVars, 3.0, 20) + Math.min(3, problem.constraints.length * 0.3),
    [problem.numVars, problem.constraints.length]
  );

  const touch = () => { setResult(null); setDirty(true); setErrors([]); setStepIdx(0); };

  const updNumVars = (n: number) => {
    if (n < 1 || n > 6) return;
    setProblem(p => ({
      ...p,
      numVars: n,
      objectiveCoeffs: Array.from({ length: n }, (_, i) => p.objectiveCoeffs[i] ?? 1),
      constraints: p.constraints.map(c => ({
        ...c,
        coefficients: Array.from({ length: n }, (_, i) => c.coefficients[i] ?? 0),
      })),
    }));
    touch();
  };

  const updObj = (i: number, v: number) => {
    setProblem(p => ({ ...p, objectiveCoeffs: p.objectiveCoeffs.map((c, j) => j === i ? v : c) }));
    touch();
  };

  const updConstraint = (id: string, field: keyof Constraint, value: unknown) => {
    setProblem(p => ({
      ...p,
      constraints: p.constraints.map(c => {
        if (c.id !== id) return c;
        if (field === 'coefficients') return c; // handled separately
        return { ...c, [field]: value };
      }),
    }));
    touch();
  };

  const updCoeff = (id: string, i: number, v: number) => {
    setProblem(p => ({
      ...p,
      constraints: p.constraints.map(c =>
        c.id !== id ? c : { ...c, coefficients: c.coefficients.map((val, j) => j === i ? v : val) }
      ),
    }));
    touch();
  };

  const addConstraint = () => {
    setProblem(p => ({
      ...p,
      constraints: [...p.constraints, {
        id: Date.now().toString(),
        coefficients: new Array(p.numVars).fill(0),
        relation: p.type === 'MAX' ? '<=' : '>=',
        rhs: 0,
      }],
    }));
    touch();
  };

  const removeConstraint = (id: string) => {
    if (problem.constraints.length <= 1) return;
    setProblem(p => ({ ...p, constraints: p.constraints.filter(c => c.id !== id) }));
    touch();
  };

  const handlePreset = (idx: number) => {
    setPresetIdx(idx);
    setProblem(structuredClone(DUALIDAD_PRESETS[idx]));
    setResult(null); setDirty(false); setErrors([]); setStepIdx(0);
  };

  const handleSolve = () => {
    const errs = validateDualInput(problem);
    if (errs.length) { setErrors(errs); return; }
    setBusy(true); setErrors([]);
    try {
      setResult(solveDualidad(problem));
      setStepIdx(0); setDirty(false);
    } finally { setBusy(false); }
  };

  const handleClear = () => { setResult(null); setDirty(false); setErrors([]); setStepIdx(0); };

  const sidebar = (
    <>
      <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 min-w-0" style={glass}>
        <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: ACCENT }}>
            D
          </span>
          Configurar Primal
        </h2>

        {sectionTitle('Ejemplos')}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRESET_NAMES.map((name, i) => (
            <button key={i} type="button" onClick={() => handlePreset(i)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
              style={{
                background: presetIdx === i && !dirty ? `${ACCENT}25` : 'rgba(255,255,255,0.05)',
                color: presetIdx === i && !dirty ? ACCENT : 'rgba(255,255,255,0.4)',
                border: presetIdx === i && !dirty ? `1px solid ${ACCENT}50` : '1px solid rgba(255,255,255,0.08)',
              }}
            >{name}</button>
          ))}
        </div>

        {sectionTitle('Objetivo')}
        <div className="flex gap-2 mb-4">
          {(['MAX', 'MIN'] as OptimizationType[]).map(t => (
            <button key={t} type="button"
              onClick={() => { setProblem(p => ({ ...p, type: t })); touch(); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: problem.type === t ? ACCENT : 'rgba(255,255,255,0.05)',
                color: problem.type === t ? 'white' : 'rgba(255,255,255,0.4)',
                border: problem.type === t ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.08)',
              }}
            >{t === 'MAX' ? 'Maximizar' : 'Minimizar'}</button>
          ))}
        </div>

        <div className="mb-4">
          <DimensionStepper label="Variables (n)" value={problem.numVars} min={1} max={6} onChange={updNumVars} accent={ACCENT} />
        </div>

        {sectionTitle(`${problem.type} Z`)}
        <div className="flex flex-wrap gap-1.5 mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-white/40 text-xs w-full mb-1">Z =</span>
          {problem.objectiveCoeffs.map((v, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-1">
                <input type="number" value={v} onChange={e => updObj(i, Number(e.target.value))} className={inputClass} style={{ width: '50px' }} />
                <span className="text-white/30 text-[10px]">x<sub>{i + 1}</sub></span>
              </div>
              {i < problem.numVars - 1 && <span className="text-white/20 text-sm">+</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="flex justify-between items-center mb-2">
          {sectionTitle('Restricciones')}
          <button type="button" onClick={addConstraint}
            className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-colors mb-2"
            style={{ background: `${ACCENT}20`, color: ACCENT }}>
            <Plus size={12} /> Añadir
          </button>
        </div>

        <div className="space-y-2">
          {problem.constraints.map(c => (
            <div key={c.id} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex flex-wrap gap-1 items-center">
                {c.coefficients.map((v, i) => (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-0.5">
                      <input type="number" value={v} onChange={e => updCoeff(c.id, i, Number(e.target.value))} className={inputClass} style={{ width: '42px' }} />
                      <span className="text-white/30 text-[10px]">x<sub>{i + 1}</sub></span>
                    </div>
                    {i < problem.numVars - 1 && <span className="text-white/15 text-xs">+</span>}
                  </React.Fragment>
                ))}
                <DarkSelect
                  className="w-14 shrink-0"
                  value={c.relation}
                  options={[...RELATION_OPTIONS]}
                  accent={ACCENT}
                  aria-label="Relación"
                  onChange={v => updConstraint(c.id, 'relation', v)}
                />
                <input type="number" value={c.rhs}
                  onChange={e => updConstraint(c.id, 'rhs', Number(e.target.value))}
                  className={inputClass} style={{ width: '48px' }} />
                <button type="button" onClick={() => removeConstraint(c.id)} className="ml-auto text-red-400/50 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ValidationList issues={errors} />
      <HintBanner accent={ACCENT}>
        Para MAX primal, el dual es MIN y viceversa. Las variables duales representan los <strong>precios sombra</strong> de las restricciones.
      </HintBanner>
      <SolveButton label="Construir Dual y Resolver" busy={busy} accent={ACCENT} onClick={handleSolve} />
      {result && <ClearButton onClick={handleClear} label="Limpiar" />}
    </>
  );

  const mainArea = result ? (
    <div className="flex flex-col gap-4">
      {/* Dualidad fuerte */}
      <DualityStrengthCard result={result} />

      {/* Primal y Dual lado a lado (vertical en mobile) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ProblemCard problem={problem} label={`Problema Primal (${problem.type})`} varPrefix="x" accent={ACCENT} />
        <ProblemCard problem={result.dualProblem} label={`Problema Dual (${result.dualProblem.type})`} varPrefix="y" accent="#10b981" />
      </div>

      {/* Soluciones */}
      {result.primalSolution && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft size={14} style={{ color: ACCENT }} />
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Soluciones Óptimas</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Primal</p>
              <div className="overflow-x-auto">
                <LatexRenderer block math={
                  result.primalSolution.values.map((v, i) => `x_{${i + 1}}^* = ${v.toFixed(4).replace(/\.?0+$/, '')}`).join(',\\quad ') +
                  `\\quad Z^* = ${result.primalSolution.z.toFixed(4).replace(/\.?0+$/, '')}`
                } />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Dual</p>
              <div className="overflow-x-auto">
                <LatexRenderer block math={
                  result.shadowPrices.map((v, i) => `y_{${i + 1}}^* = ${v.toFixed(4).replace(/\.?0+$/, '')}`).join(',\\quad ') +
                  `\\quad W^* = ${result.dualSolution?.w.toFixed(4).replace(/\.?0+$/, '') ?? '—'}`
                } />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Precios sombra */}
      <ShadowPricesTable result={result} primal={problem} />

      {/* Pasos */}
      {result.steps.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {result.steps.map((s, i) => (
              <button key={i} onClick={() => setStepIdx(i)}
                className="px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  background: stepIdx === i ? `${ACCENT}20` : 'transparent',
                  color: stepIdx === i ? ACCENT : 'rgba(255,255,255,0.35)',
                  borderBottom: stepIdx === i ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}
              >
                {s.stepNum}. {s.title}
              </button>
            ))}
          </div>
          <div className="p-5">
            <TextWithMath text={result.steps[stepIdx].content} />
          </div>
        </div>
      )}

      {!result.feasible && (
        <HintBanner accent="#f43f5e">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle size={13} className="shrink-0" aria-hidden />
            No se pudo obtener solución óptima del primal. Verifica que el problema sea factible y acotado.
          </span>
        </HintBanner>
      )}
    </div>
  ) : (
    <div className="h-full min-h-[16rem] flex flex-col items-center justify-center text-center gap-6 p-8"
      style={{ background: 'rgba(8,10,20,0.5)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <ArrowRightLeft size={56} className="text-white/15" strokeWidth={1.25} aria-hidden />
      <div>
        <p className="text-white/50 font-bold text-lg mb-2">Dualidad en Programación Lineal</p>
        <p className="text-white/25 text-sm">
          Ingresa el problema primal y obtén su dual, con verificación del Teorema de Dualidad Fuerte.
        </p>
      </div>
      <ValidationList issues={errors} />
    </div>
  );

  return (
    <ModuleShell title="Dualidad" unit="Unidad 1" accent={ACCENT} sidebarBasisRem={sidebarBasisRem} sidebar={sidebar}>
      {mainArea}
    </ModuleShell>
  );
};
