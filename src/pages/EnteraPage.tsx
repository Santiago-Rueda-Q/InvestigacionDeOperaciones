import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ModuleShell, glass, inputClass, sidebarBasisForColumns, RELATION_OPTIONS } from '../components/io/ModuleShell';
import { ClearButton, HintBanner, SolveButton, ValidationList } from '../components/io/CalculatorChrome';
import { DarkSelect } from '../components/io/DarkSelect';
import { SegmentedControl } from '../components/io/SegmentedControl';
import { TextWithMath } from '../components/LatexRenderer';
import { StepBar } from '../components/transporte/StepBar';
import {
  ENTERA_PRESETS,
  blankEntera,
  solveEntera,
  validateEnteraInput,
  type EnteraConstraint,
  type EnteraInput,
  type EnteraResult,
  EnteraError,
} from '../core/EnteraSolver';
import type { OptimizationType } from '../types';

const ACCENT = '#8b5cf6';

export const EnteraPage: React.FC = () => {
  const initial = ENTERA_PRESETS[0];
  const [type, setType] = useState<OptimizationType>(initial.data.type);
  const [c1, setC1] = useState(initial.data.c1);
  const [c2, setC2] = useState(initial.data.c2);
  const [constraints, setConstraints] = useState<EnteraConstraint[]>(
    initial.data.constraints.map(c => ({ ...c })),
  );
  const [presetId, setPresetId] = useState(initial.id);
  const [result, setResult] = useState<EnteraResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const draft: EnteraInput = useMemo(
    () => ({ type, c1, c2, constraints }),
    [type, c1, c2, constraints],
  );
  const issues = useMemo(() => validateEnteraInput(draft), [draft]);
  const clear = () => { setResult(null); setError(null); setStepIdx(0); };
  const touch = () => { setPresetId(''); clear(); };

  const load = (id: string) => {
    const p = ENTERA_PRESETS.find(x => x.id === id);
    if (!p) return;
    setType(p.data.type);
    setC1(p.data.c1);
    setC2(p.data.c2);
    setConstraints(p.data.constraints.map(c => ({ ...c })));
    setPresetId(id);
    clear();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) { setError(issues[0]); return; }
    setBusy(true);
    try {
      setResult(solveEntera(draft));
      setError(null);
      setStepIdx(0);
    } catch (e) {
      setResult(null);
      setError(e instanceof EnteraError || e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const step = result?.steps[stepIdx];
  const statusColor = (s: string) =>
    s === 'integer' ? '#34d399' :
    s === 'infeasible' ? '#f43f5e' :
    s === 'fathomed' ? '#fbbf24' : ACCENT;

  return (
    <ModuleShell
      title="Programación Entera"
      unit="Unidad 3"
      accent={ACCENT}
      sidebarBasisRem={sidebarBasisForColumns(3, 3, 18)}
      sidebar={(
        <div className="rounded-2xl p-4 space-y-3" style={glass}>
          <h2 className="text-base font-extrabold text-white">ILP (2 variables)</h2>
          <div className="grid grid-cols-1 gap-1.5">
            {ENTERA_PRESETS.map(p => (
              <button key={p.id} type="button" onClick={() => load(p.id)} className="text-left px-3 py-2 rounded-xl"
                style={{
                  background: presetId === p.id ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                  border: presetId === p.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
                }}>
                <div className="text-xs font-bold text-white">{p.name}</div>
                <div className="text-[11px] text-white/40">{p.blurb}</div>
              </button>
            ))}
          </div>

          <SegmentedControl
            aria-label="Tipo de optimización"
            accent={ACCENT}
            value={type}
            options={[
              { value: 'MAX', label: 'MAX' },
              { value: 'MIN', label: 'MIN' },
            ]}
            onChange={t => { setType(t); touch(); }}
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-white/40 block">c₁
              <input className={`${inputClass} mt-1`} type="number" value={c1}
                onChange={e => { setC1(Number(e.target.value)); touch(); }} />
            </label>
            <label className="text-[11px] text-white/40 block">c₂
              <input className={`${inputClass} mt-1`} type="number" value={c2}
                onChange={e => { setC2(Number(e.target.value)); touch(); }} />
            </label>
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Restricciones</p>
          <div className="space-y-1.5">
            {constraints.map((c, i) => (
              <div key={c.id} className="grid grid-cols-[1fr_1fr_minmax(3.5rem,4.5rem)_1fr_1.5rem] gap-1 items-center">
                <input className={inputClass} type="number" value={c.a1}
                  onChange={e => {
                    const next = [...constraints];
                    next[i] = { ...c, a1: Number(e.target.value) };
                    setConstraints(next); touch();
                  }} />
                <input className={inputClass} type="number" value={c.a2}
                  onChange={e => {
                    const next = [...constraints];
                    next[i] = { ...c, a2: Number(e.target.value) };
                    setConstraints(next); touch();
                  }} />
                <DarkSelect
                  value={c.rel}
                  options={[...RELATION_OPTIONS]}
                  accent={ACCENT}
                  aria-label="Relación"
                  onChange={v => {
                    const next = [...constraints];
                    next[i] = { ...c, rel: v as EnteraConstraint['rel'] };
                    setConstraints(next); touch();
                  }}
                />
                <input className={inputClass} type="number" value={c.rhs}
                  onChange={e => {
                    const next = [...constraints];
                    next[i] = { ...c, rhs: Number(e.target.value) };
                    setConstraints(next); touch();
                  }} />
                <button type="button" onClick={() => {
                  setConstraints(constraints.filter((_, j) => j !== i)); touch();
                }} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          <button type="button" className="text-[10px] font-bold" style={{ color: ACCENT }}
            onClick={() => {
              setConstraints([...constraints, { id: String(Date.now()), a1: 1, a2: 1, rel: '<=', rhs: 10 }]);
              touch();
            }}>
            <Plus size={11} className="inline" /> restricción
          </button>

          <HintBanner accent={ACCENT}>
            Branch & Bound con relajación continua (vértices). También se muestra una heurística de redondeo (no garantiza optimalidad).
          </HintBanner>
          <ValidationList issues={issues} error={error} />
          <SolveButton label="Branch & Bound" accent={ACCENT} busy={busy} disabled={!!issues.length} onClick={solve} />
          <ClearButton onClick={() => {
            const b = blankEntera();
            setType(b.type); setC1(b.c1); setC2(b.c2);
            setConstraints(b.constraints.map(c => ({ ...c }))); touch();
          }} label="Personalizado" />
        </div>
      )}
    >
      {!result ? (
        <div className="rounded-2xl p-6 space-y-3" style={glass}>
          <h3 className="text-lg font-extrabold text-white">Programación entera y heurísticas</h3>
          <TextWithMath text={
            `Cuando las variables deben ser enteras, la relajación PL puede dar fracciones. ` +
            `**Branch & Bound** ramifica y poda con cotas. El **redondeo** es una heurística rápida que puede perder optimalidad o factibilidad.`
          } />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3" style={glass}>
            <div>
              <div className="text-[10px] text-white/35 uppercase">x₁*</div>
              <div className="text-xl font-black font-mono" style={{ color: ACCENT }}>
                {result.feasible ? result.x : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/35 uppercase">x₂*</div>
              <div className="text-xl font-black font-mono" style={{ color: ACCENT }}>
                {result.feasible ? result.y : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/35 uppercase">Z*</div>
              <div className="text-xl font-black font-mono text-white">
                {result.feasible ? result.z : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/35 uppercase">Heurística</div>
              <div className="text-sm font-mono text-white/70">
                {result.heuristicRound.feasible
                  ? `(${result.heuristicRound.x},${result.heuristicRound.y}) Z=${result.heuristicRound.z}`
                  : 'n/d'}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-2" style={glass}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Árbol B&B</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {result.nodes.map(n => (
                <div key={n.id} className="rounded-xl px-3 py-2 text-xs"
                  style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${statusColor(n.status)}` }}>
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-white">{n.id}</span>
                    <span className="uppercase tracking-wide" style={{ color: statusColor(n.status) }}>{n.status}</span>
                  </div>
                  <TextWithMath text={n.note} />
                </div>
              ))}
            </div>
          </div>

          {result.steps.length > 0 && (
            <div className="rounded-2xl p-4 space-y-3" style={glass}>
              <StepBar
                count={result.steps.length}
                index={stepIdx}
                label="Paso"
                title={step?.title ?? ''}
                accent={ACCENT}
                onChange={setStepIdx}
              />
              {step && (
                <div>
                  <h4 className="text-sm font-bold text-white mb-2">{step.title}</h4>
                  <TextWithMath text={step.content} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </ModuleShell>
  );
};
