import React, { useMemo, useState } from 'react';
import { ModuleShell, glass, inputClass, sidebarBasisForRows } from '../components/io/ModuleShell';
import { ClearButton, HintBanner, SolveButton, ValidationList, DimensionStepper } from '../components/io/CalculatorChrome';
import { TextWithMath } from '../components/LatexRenderer';
import { StepBar } from '../components/transporte/StepBar';
import {
  COLAS_PRESETS,
  blankColas,
  solveColas,
  validateColasInput,
  type ColaModelo,
  type ColasResult,
  ColasError,
} from '../core/ColasSolver';

const ACCENT = '#8b5cf6';

export const ColasPage: React.FC = () => {
  const initial = COLAS_PRESETS[0];
  const [model, setModel] = useState<ColaModelo>(initial.data.model);
  const [lambda, setLambda] = useState(initial.data.lambda);
  const [mu, setMu] = useState(initial.data.mu);
  const [c, setC] = useState(initial.data.c);
  const [presetId, setPresetId] = useState(initial.id);
  const [result, setResult] = useState<ColasResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const draft = useMemo(() => ({ model, lambda, mu, c, maxN: 10 }), [model, lambda, mu, c]);
  const issues = useMemo(() => validateColasInput(draft), [draft]);
  const clear = () => { setResult(null); setError(null); setStepIdx(0); };
  const touch = () => { setPresetId(''); clear(); };

  const load = (id: string) => {
    const p = COLAS_PRESETS.find(x => x.id === id);
    if (!p) return;
    setModel(p.data.model);
    setLambda(p.data.lambda);
    setMu(p.data.mu);
    setC(p.data.c);
    setPresetId(id);
    clear();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) { setError(issues[0]); return; }
    setBusy(true);
    try {
      setResult(solveColas(draft));
      setError(null);
      setStepIdx(0);
    } catch (e) {
      setResult(null);
      setError(e instanceof ColasError || e instanceof Error ? e.message : 'Error al resolver');
    } finally {
      setBusy(false);
    }
  };

  const step = result?.steps[stepIdx];
  const fmt = (v: number) => (!Number.isFinite(v) ? '∞' : (Math.round(v * 10000) / 10000).toString());

  return (
    <ModuleShell
      title="Teoría de Colas"
      unit="Unidad 3"
      accent={ACCENT}
      sidebarBasisRem={sidebarBasisForRows(6, 0.4, 20, 26)}
      sidebar={(
        <>
          <div className="rounded-2xl p-4 space-y-3" style={glass}>
            <h2 className="text-base font-extrabold text-white">Parámetros</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Ejemplos</p>
            <div className="grid grid-cols-1 gap-1.5">
              {COLAS_PRESETS.map(p => (
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

            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {(['MM1', 'MMc'] as ColaModelo[]).map(m => (
                <button key={m} type="button" onClick={() => { setModel(m); if (m === 'MM1') setC(1); touch(); }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold"
                  style={{ background: model === m ? ACCENT : 'transparent', color: model === m ? 'white' : 'rgba(255,255,255,0.45)' }}>
                  {m === 'MM1' ? 'M/M/1' : 'M/M/c'}
                </button>
              ))}
            </div>

            <label className="text-[11px] text-white/40 block">λ (llegadas / unidad tiempo)
              <input className={`${inputClass} mt-1`} type="number" step="any" value={lambda}
                onChange={e => { setLambda(Number(e.target.value)); touch(); }} />
            </label>
            <label className="text-[11px] text-white/40 block">μ (servicio por servidor)
              <input className={`${inputClass} mt-1`} type="number" step="any" value={mu}
                onChange={e => { setMu(Number(e.target.value)); touch(); }} />
            </label>
            {model === 'MMc' && (
              <DimensionStepper label="Servidores c" value={c} min={1} max={10} accent={ACCENT}
                onChange={n => { setC(n); touch(); }} />
            )}

            <HintBanner accent={ACCENT}>
              Estabilidad: M/M/1 requiere λ&lt;μ; M/M/c requiere λ&lt;cμ. Se calculan ρ, P₀, L, Lq, W, Wq y Pn.
            </HintBanner>
            <ValidationList issues={issues} error={error} />
            <SolveButton label="Calcular indicadores" accent={ACCENT} busy={busy} disabled={!!issues.length} onClick={solve} />
            <ClearButton onClick={() => load(COLAS_PRESETS[0].id)} label="Reiniciar ejemplo" />
            <button type="button" className="text-[10px] text-white/40 underline" onClick={() => {
              const b = blankColas();
              setModel(b.model); setLambda(b.lambda); setMu(b.mu); setC(b.c); touch();
            }}>Personalizado</button>
          </div>
        </>
      )}
    >
      {!result ? (
        <div className="rounded-2xl p-6 space-y-3" style={glass}>
          <h3 className="text-lg font-extrabold text-white">Modelos de líneas de espera</h3>
          <TextWithMath text={
            `La **teoría de colas** analiza sistemas con llegadas aleatorias y tiempos de servicio aleatorios.\n\n` +
            `**M/M/1:** un servidor, llegadas Poisson, servicio exponencial.\n\n` +
            `**M/M/c:** $c$ servidores en paralelo.\n\n` +
            `Indicadores clave: utilización $\\rho$, longitud media $L$ / $L_q$, tiempo medio $W$ / $W_q$ y $P_n$.`
          } />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3" style={glass}>
            {[
              ['ρ', result.rho],
              ['P₀', result.P0],
              ['L', result.L],
              ['Lq', result.Lq],
              ['W', result.W],
              ['Wq', result.Wq],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="text-[10px] uppercase tracking-widest text-white/35">{k as string}</div>
                <div className="text-xl font-black text-white font-mono" style={{ color: result.stable ? ACCENT : '#f43f5e' }}>
                  {fmt(v as number)}
                </div>
              </div>
            ))}
          </div>

          {!result.stable && (
            <div className="rounded-xl px-4 py-3 text-sm text-rose-200" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)' }}>
              Sistema inestable: la cola crece sin límite.
            </div>
          )}

          <div className="rounded-2xl p-4" style={glass}>
            <p className="text-sm text-white/70 leading-relaxed">{result.interpretation}</p>
          </div>

          {result.Pn.length > 0 && (
            <div className="rounded-2xl p-4 overflow-x-auto" style={glass}>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Distribución Pn</p>
              <div className="flex gap-1.5 min-w-max">
                {result.Pn.map(p => (
                  <div key={p.n} className="w-12 text-center">
                    <div className="h-16 flex items-end justify-center">
                      <div className="w-8 rounded-t" style={{ height: `${Math.max(4, p.p * 64)}px`, background: ACCENT }} />
                    </div>
                    <div className="text-[10px] text-white/40 mt-1">n={p.n}</div>
                    <div className="text-[10px] font-mono text-white/60">{(p.p * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
