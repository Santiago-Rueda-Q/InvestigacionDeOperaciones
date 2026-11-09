import React, { useMemo, useState } from 'react';
import Plot from 'react-plotly.js';
import { ModuleShell, glass, inputClass, sidebarBasisForColumns } from '../components/io/ModuleShell';
import { ClearButton, HintBanner, SolveButton, ValidationList } from '../components/io/CalculatorChrome';
import { TextWithMath, LatexRenderer } from '../components/LatexRenderer';
import { StepBar } from '../components/transporte/StepBar';
import {
  NOLINEAL_PRESETS,
  blankNoLineal,
  solveNoLineal,
  validateNoLinealInput,
  type NoLinealResult,
  NoLinealError,
} from '../core/NoLinealSolver';

const ACCENT = '#8b5cf6';

export const NoLinealPage: React.FC = () => {
  const initial = NOLINEAL_PRESETS[0];
  const [a0, setA0] = useState(initial.data.coeffs[0] ?? 0);
  const [a1, setA1] = useState(initial.data.coeffs[1] ?? 0);
  const [a2, setA2] = useState(initial.data.coeffs[2] ?? 0);
  const [a3, setA3] = useState(initial.data.coeffs[3] ?? 0);
  const [lo, setLo] = useState(initial.data.lo);
  const [hi, setHi] = useState(initial.data.hi);
  const [sense, setSense] = useState<'min' | 'max'>(initial.data.sense);
  const [presetId, setPresetId] = useState(initial.id);
  const [result, setResult] = useState<NoLinealResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const draft = useMemo(
    () => ({ coeffs: [a0, a1, a2, a3], lo, hi, sense }),
    [a0, a1, a2, a3, lo, hi, sense],
  );
  const issues = useMemo(() => validateNoLinealInput(draft), [draft]);
  const clear = () => { setResult(null); setError(null); setStepIdx(0); };
  const touch = () => { setPresetId(''); clear(); };

  const load = (id: string) => {
    const p = NOLINEAL_PRESETS.find(x => x.id === id);
    if (!p) return;
    setA0(p.data.coeffs[0] ?? 0);
    setA1(p.data.coeffs[1] ?? 0);
    setA2(p.data.coeffs[2] ?? 0);
    setA3(p.data.coeffs[3] ?? 0);
    setLo(p.data.lo);
    setHi(p.data.hi);
    setSense(p.data.sense);
    setPresetId(id);
    clear();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) { setError(issues[0]); return; }
    setBusy(true);
    try {
      setResult(solveNoLineal(draft));
      setError(null);
      setStepIdx(0);
    } catch (e) {
      setResult(null);
      setError(e instanceof NoLinealError || e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const step = result?.steps[stepIdx];
  const fmt = (v: number) => (Math.round(v * 10000) / 10000).toString();

  return (
    <ModuleShell
      title="Programación No Lineal"
      unit="Unidad 3"
      accent={ACCENT}
      sidebarBasisRem={sidebarBasisForColumns(4, 2.5, 18)}
      sidebar={(
        <div className="rounded-2xl p-4 space-y-3" style={glass}>
          <h2 className="text-base font-extrabold text-white">Función univariable</h2>
          <div className="grid grid-cols-1 gap-1.5">
            {NOLINEAL_PRESETS.map(p => (
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

          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">f(x)=a₀+a₁x+a₂x²+a₃x³</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['a₀', a0, setA0],
              ['a₁', a1, setA1],
              ['a₂', a2, setA2],
              ['a₃', a3, setA3],
            ].map(([lab, val, set]) => (
              <label key={lab as string} className="text-[11px] text-white/40 block">{lab as string}
                <input className={`${inputClass} mt-1`} type="number" step="any" value={val as number}
                  onChange={e => { (set as (n: number) => void)(Number(e.target.value)); touch(); }} />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-white/40 block">lo
              <input className={`${inputClass} mt-1`} type="number" step="any" value={lo}
                onChange={e => { setLo(Number(e.target.value)); touch(); }} />
            </label>
            <label className="text-[11px] text-white/40 block">hi
              <input className={`${inputClass} mt-1`} type="number" step="any" value={hi}
                onChange={e => { setHi(Number(e.target.value)); touch(); }} />
            </label>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['min', 'max'] as const).map(s => (
              <button key={s} type="button" onClick={() => { setSense(s); touch(); }}
                className="flex-1 py-2 rounded-lg text-xs font-bold uppercase"
                style={{ background: sense === s ? ACCENT : 'transparent', color: sense === s ? 'white' : 'rgba(255,255,255,0.45)' }}>
                {s}
              </button>
            ))}
          </div>
          <HintBanner accent={ACCENT}>
            Se localizan críticos con f′(x)=0, se clasifican con f″(x) y se comparan con los extremos del intervalo.
          </HintBanner>
          <ValidationList issues={issues} error={error} />
          <SolveButton label="Optimizar" accent={ACCENT} busy={busy} disabled={!!issues.length} onClick={solve} />
          <ClearButton onClick={() => load(NOLINEAL_PRESETS[0].id)} label="Reiniciar ejemplo" />
          <button type="button" className="text-[10px] text-white/40 underline" onClick={() => {
            const b = blankNoLineal();
            setA0(b.coeffs[0]); setA1(b.coeffs[1]); setA2(b.coeffs[2]); setA3(0);
            setLo(b.lo); setHi(b.hi); setSense(b.sense); touch();
          }}>Personalizado</button>
        </div>
      )}
    >
      {!result ? (
        <div className="rounded-2xl p-6 space-y-3" style={glass}>
          <h3 className="text-lg font-extrabold text-white">Optimización no lineal univariable</h3>
          <TextWithMath text={
            `A diferencia de la PL, aquí la FO no es lineal. Condición necesaria en un punto interior: $f'(x^*)=0$. ` +
            `Si $f''(x^*)>0$ hay un mínimo local; si $f''(x^*)<0$, un máximo local. En un intervalo cerrado siempre se revisan también los extremos.`
          } />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 space-y-2" style={glass}>
            <LatexRenderer math={result.polyLatex} block />
            <div className="text-sm text-white/70">
              Óptimo: <span className="font-mono font-bold" style={{ color: ACCENT }}>
                x*={fmt(result.optimal.x)}, f={fmt(result.optimal.f)}
              </span>
            </div>
          </div>

          <div className="rounded-2xl p-2 overflow-hidden" style={glass}>
            <Plot
              data={[
                {
                  type: 'scatter',
                  mode: 'lines',
                  x: result.samples.map(s => s.x),
                  y: result.samples.map(s => s.f),
                  line: { color: ACCENT, width: 2 },
                  name: 'f(x)',
                },
                {
                  type: 'scatter',
                  mode: 'markers',
                  x: result.criticals.filter(c => c.inDomain).map(c => c.x),
                  y: result.criticals.filter(c => c.inDomain).map(c => c.f),
                  marker: { size: 10, color: '#fbbf24' },
                  name: 'Críticos',
                },
                {
                  type: 'scatter',
                  mode: 'markers',
                  x: [result.optimal.x],
                  y: [result.optimal.f],
                  marker: { size: 14, color: '#34d399', symbol: 'star' },
                  name: 'Óptimo',
                },
              ]}
              layout={{
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: 'rgba(255,255,255,0.6)', size: 11 },
                margin: { l: 40, r: 20, t: 20, b: 40 },
                height: 280,
                showlegend: true,
                legend: { bgcolor: 'rgba(0,0,0,0.4)', font: { size: 10 } },
                xaxis: { gridcolor: 'rgba(255,255,255,0.06)' },
                yaxis: { gridcolor: 'rgba(255,255,255,0.06)' },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          </div>

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
        </div>
      )}
    </ModuleShell>
  );
};
