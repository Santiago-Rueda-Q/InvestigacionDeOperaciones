import React, { useState, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  SensibilidadResult,
  ObjCoeffRange,
  RhsRange,
  solveSensibilidad,
} from '../core/SensibilidadSolver';
import { DUALIDAD_PRESETS } from '../core/DualidadSolver';
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

function validateInput(p: SimplexProblem): string[] {
  const errs: string[] = [];
  if (p.numVars < 1) errs.push('Se requiere al menos 1 variable.');
  if (p.constraints.length < 1) errs.push('Se requiere al menos una restricción.');
  if (p.objectiveCoeffs.some(isNaN)) errs.push('La FO contiene valores inválidos.');
  for (const c of p.constraints) {
    if (c.coefficients.some(isNaN) || isNaN(c.rhs)) errs.push(`Restricción ${c.id}: datos inválidos.`);
  }
  return errs;
}

const fmtNum = (v: number): string => {
  if (Math.abs(v) >= 1e14) return '∞';
  const r = Math.round(v * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '');
};

// ── Tabla de rangos de la FO ──────────────────────────────────────

const ObjRangeTable: React.FC<{ ranges: ObjCoeffRange[] }> = ({ ranges }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
      <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Rangos de Coeficientes de la FO</span>
    </div>
    <div className="overflow-x-auto p-3">
      <table className="w-full text-xs border-collapse text-center">
        <thead>
          <tr>
            <th className="px-3 py-2 text-white/40 font-semibold text-left">Variable</th>
            <th className="px-2 py-2 text-white/40 font-semibold">c*</th>
            <th className="px-2 py-2 text-white/40 font-semibold">Rango óptimo</th>
            <th className="px-2 py-2 text-white/40 font-semibold">↑ máx</th>
            <th className="px-2 py-2 text-white/40 font-semibold">↓ máx</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map(r => (
            <tr key={r.varIndex} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <td className="px-3 py-2 text-left font-semibold" style={{ color: ACCENT }}>
                <LatexRenderer math={r.varName} />
              </td>
              <td className="px-2 py-2 font-mono text-white/80">{fmtNum(r.currentValue)}</td>
              <td className="px-2 py-2 font-mono text-white/70">
                [{fmtNum(r.lowerBound)}, {fmtNum(r.upperBound)}]
              </td>
              <td className="px-2 py-2 font-mono text-emerald-400">+{fmtNum(r.allowableIncrease)}</td>
              <td className="px-2 py-2 font-mono text-rose-400">−{fmtNum(r.allowableDecrease)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Tabla de rangos del RHS ───────────────────────────────────────

const RhsRangeTable: React.FC<{ ranges: RhsRange[] }> = ({ ranges }) => (
  <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
    <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
      <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Rangos del RHS (Lados Derechos)</span>
    </div>
    <div className="overflow-x-auto p-3">
      <table className="w-full text-xs border-collapse text-center">
        <thead>
          <tr>
            <th className="px-3 py-2 text-white/40 font-semibold text-left">Restricción</th>
            <th className="px-2 py-2 text-white/40 font-semibold">b*</th>
            <th className="px-2 py-2 text-white/40 font-semibold">Precio sombra</th>
            <th className="px-2 py-2 text-white/40 font-semibold">Rango factible</th>
            <th className="px-2 py-2 text-white/40 font-semibold">↑ máx</th>
            <th className="px-2 py-2 text-white/40 font-semibold">↓ máx</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map(r => (
            <tr key={r.constraintIndex} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <td className="px-3 py-2 text-left font-semibold" style={{ color: ACCENT }}>
                <LatexRenderer math={r.constraintName} />
              </td>
              <td className="px-2 py-2 font-mono text-white/80">{fmtNum(r.currentValue)}</td>
              <td className="px-2 py-2 font-mono font-bold" style={{ color: Math.abs(r.shadowPrice) > 1e-9 ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
                {fmtNum(r.shadowPrice)}
              </td>
              <td className="px-2 py-2 font-mono text-white/70">
                [{fmtNum(r.lowerBound)}, {fmtNum(r.upperBound)}]
              </td>
              <td className="px-2 py-2 font-mono text-emerald-400">+{fmtNum(r.allowableIncrease)}</td>
              <td className="px-2 py-2 font-mono text-rose-400">−{fmtNum(r.allowableDecrease)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Visualización de rangos (barras) ──────────────────────────────

const RangeBar: React.FC<{ current: number; lower: number; upper: number; label: string }> = ({ current, lower, upper, label }) => {
  const infLower = Math.abs(lower) >= 1e14;
  const infUpper = Math.abs(upper) >= 1e14;
  const range = infLower || infUpper ? null : upper - lower;
  const position = range && range > 0 ? ((current - lower) / range) * 100 : 50;

  return (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] text-white/40 mb-1">
        <span>{infLower ? '-∞' : fmtNum(lower)}</span>
        <span className="font-bold" style={{ color: ACCENT }}>{label} = {fmtNum(current)}</span>
        <span>{infUpper ? '+∞' : fmtNum(upper)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 relative">
        {range !== null && range > 0 && (
          <div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, rgba(99,102,241,0.3), ${ACCENT})`, width: `${Math.min(100, Math.max(0, position))}%` }}
          />
        )}
        {range !== null && range > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white"
            style={{ left: `${Math.min(100, Math.max(0, position))}%`, background: ACCENT, transform: 'translate(-50%, -50%)' }}
          />
        )}
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────

const PRESET_NAMES = ['Producción 2×2', 'Clásico 3 restricciones', 'Dieta MIN'];

export const SensibilidadPage: React.FC = () => {
  const [presetIdx, setPresetIdx] = useState(0);
  const [problem, setProblem] = useState<SimplexProblem>(() => structuredClone(DUALIDAD_PRESETS[0]));
  const [result, setResult] = useState<SensibilidadResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [showBars, setShowBars] = useState(false);

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
      constraints: p.constraints.map(c => c.id !== id ? c : { ...c, [field]: value }),
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

  const handlePreset = (idx: number) => {
    setPresetIdx(idx);
    setProblem(structuredClone(DUALIDAD_PRESETS[idx]));
    setResult(null); setDirty(false); setErrors([]); setStepIdx(0);
  };

  const handleSolve = () => {
    const errs = validateInput(problem);
    if (errs.length) { setErrors(errs); return; }
    setBusy(true); setErrors([]);
    try {
      setResult(solveSensibilidad(problem));
      setStepIdx(0); setDirty(false);
    } finally { setBusy(false); }
  };

  const handleClear = () => { setResult(null); setDirty(false); setErrors([]); setStepIdx(0); };

  const sidebar = (
    <>
      <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 min-w-0" style={glass}>
        <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: ACCENT }}>
            S
          </span>
          Configurar Problema
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
          <button type="button"
            onClick={() => {
              setProblem(p => ({ ...p, constraints: [...p.constraints, { id: Date.now().toString(), coefficients: new Array(p.numVars).fill(0), relation: '<=', rhs: 0 }] }));
              touch();
            }}
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
                <button type="button"
                  onClick={() => { if (problem.constraints.length > 1) { setProblem(p => ({ ...p, constraints: p.constraints.filter(cc => cc.id !== c.id) })); touch(); } }}
                  className="ml-auto text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ValidationList issues={errors} />
      <HintBanner accent={ACCENT}>
        El análisis de sensibilidad responde: ¿cuánto puede cambiar un parámetro sin que cambie la <strong>base óptima</strong>?
      </HintBanner>
      <SolveButton label="Analizar Sensibilidad" busy={busy} accent={ACCENT} onClick={handleSolve} />
      {result && <ClearButton onClick={handleClear} label="Limpiar" />}
    </>
  );

  const mainArea = result ? (
    <div className="flex flex-col gap-4">
      {/* Solución óptima */}
      {result.optimal && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: `1px solid ${ACCENT}33`, borderLeft: `3px solid ${ACCENT}` }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} style={{ color: ACCENT }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>Solución Óptima Base</span>
          </div>
          <div className="overflow-x-auto">
            <LatexRenderer block math={
              result.optimal.values.map((v, i) => `x_{${i + 1}}^* = ${fmtNum(v)}`).join(',\\quad ') +
              `\\quad Z^* = ${fmtNum(result.optimal.z)}`
            } />
          </div>
        </div>
      )}

      {/* Rangos FO */}
      <ObjRangeTable ranges={result.objCoeffRanges} />

      {/* Rangos RHS */}
      <RhsRangeTable ranges={result.rhsRanges} />

      {/* Barras visuales */}
      <button type="button" onClick={() => setShowBars(p => !p)}
        className="text-xs font-bold py-2 px-4 rounded-lg transition-all self-start"
        style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}33` }}>
        {showBars ? 'Ocultar' : 'Ver'} barras de rango
      </button>

      {showBars && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Visualización de Rangos</p>
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Coeficientes FO</p>
              {result.objCoeffRanges.map(r => (
                <RangeBar key={r.varIndex} current={r.currentValue} lower={r.lowerBound} upper={r.upperBound} label={`c${r.varIndex + 1}`} />
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">RHS</p>
              {result.rhsRanges.map(r => (
                <RangeBar key={r.constraintIndex} current={r.currentValue} lower={r.lowerBound} upper={r.upperBound} label={`b${r.constraintIndex + 1}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pasos pedagógicos */}
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
            No se obtuvo solución óptima. Verifica que el problema sea factible y acotado.
          </span>
        </HintBanner>
      )}
    </div>
  ) : (
    <div className="h-full min-h-[16rem] flex flex-col items-center justify-center text-center gap-6 p-8"
      style={{ background: 'rgba(8,10,20,0.5)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="text-white/10 text-7xl font-black select-none">↕</div>
      <div>
        <p className="text-white/50 font-bold text-lg mb-2">Análisis de Sensibilidad</p>
        <p className="text-white/25 text-sm">
          Ingresa el problema y obtén los rangos de estabilidad de los coeficientes y los precios sombra.
        </p>
      </div>
      <ValidationList issues={errors} />
    </div>
  );

  return (
    <ModuleShell title="Análisis de Sensibilidad" unit="Unidad 1" accent={ACCENT} sidebarBasisRem={sidebarBasisRem} sidebar={sidebar}>
      {mainArea}
    </ModuleShell>
  );
};
