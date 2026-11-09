import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ModuleShell, glass, inputClass, sidebarBasisForRows } from '../components/io/ModuleShell';
import { ClearButton, HintBanner, SolveButton, ValidationList } from '../components/io/CalculatorChrome';
import { SegmentedControl } from '../components/io/SegmentedControl';
import { TextWithMath } from '../components/LatexRenderer';
import { StepBar } from '../components/transporte/StepBar';
import {
  DINAMICA_PRESETS,
  blankDinamica,
  solveDinamica,
  validateDinamicaInput,
  type DinamicaInput,
  type DinamicaMode,
  type DinamicaResult,
  type MochilaItem,
  type RutaArc,
  DinamicaError,
} from '../core/DinamicaSolver';

const ACCENT = '#8b5cf6';

export const DinamicaPage: React.FC = () => {
  const initial = DINAMICA_PRESETS[0];
  const [mode, setMode] = useState<DinamicaMode>(initial.data.mode);
  const [draft, setDraft] = useState<DinamicaInput>(structuredClone(initial.data));
  const [presetId, setPresetId] = useState(initial.id);
  const [result, setResult] = useState<DinamicaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const issues = useMemo(() => validateDinamicaInput(draft), [draft]);
  const clear = () => { setResult(null); setError(null); setStepIdx(0); };
  const touch = () => { setPresetId(''); clear(); };

  const load = (id: string) => {
    const p = DINAMICA_PRESETS.find(x => x.id === id);
    if (!p) return;
    setMode(p.data.mode);
    setDraft(structuredClone(p.data));
    setPresetId(id);
    clear();
  };

  const switchMode = (m: DinamicaMode) => {
    setMode(m);
    setDraft(blankDinamica(m));
    touch();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) { setError(issues[0]); return; }
    setBusy(true);
    try {
      setResult(solveDinamica(draft));
      setError(null);
      setStepIdx(0);
    } catch (e) {
      setResult(null);
      setError(e instanceof DinamicaError || e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const step = result?.steps[stepIdx];
  const ruta = draft.mode === 'ruta' ? draft : null;
  const mochila = draft.mode === 'mochila' ? draft : null;

  return (
    <ModuleShell
      title="Programación Dinámica"
      unit="Unidad 3"
      accent={ACCENT}
      sidebarBasisRem={sidebarBasisForRows(12, 0.35, 20, 30)}
      sidebar={(
        <div className="rounded-2xl p-4 space-y-3" style={glass}>
          <h2 className="text-base font-extrabold text-white">Problema</h2>
          <SegmentedControl
            aria-label="Modo de programación dinámica"
            accent={ACCENT}
            value={mode}
            options={[
              { value: 'ruta', label: 'Ruta por etapas' },
              { value: 'mochila', label: 'Mochila 0-1' },
            ]}
            onChange={switchMode}
          />

          <div className="grid grid-cols-1 gap-1.5">
            {DINAMICA_PRESETS.filter(p => p.data.mode === mode).map(p => (
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

          {ruta && (
            <>
              <SegmentedControl
                aria-label="Criterio de ruta"
                accent={ACCENT}
                size="sm"
                value={ruta.sense}
                options={[
                  { value: 'min', label: 'MIN' },
                  { value: 'max', label: 'MAX' },
                ]}
                onChange={s => { setDraft({ ...ruta, sense: s }); touch(); }}
              />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Arcos</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {ruta.arcs.map((a, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_4rem_1.5rem] gap-1 items-center">
                    <input className={inputClass} value={a.from}
                      onChange={e => {
                        const arcs = [...ruta.arcs];
                        arcs[i] = { ...a, from: e.target.value };
                        setDraft({ ...ruta, arcs }); touch();
                      }} />
                    <input className={inputClass} value={a.to}
                      onChange={e => {
                        const arcs = [...ruta.arcs];
                        arcs[i] = { ...a, to: e.target.value };
                        setDraft({ ...ruta, arcs }); touch();
                      }} />
                    <input className={inputClass} type="number" value={a.cost}
                      onChange={e => {
                        const arcs = [...ruta.arcs];
                        arcs[i] = { ...a, cost: Number(e.target.value) };
                        setDraft({ ...ruta, arcs }); touch();
                      }} />
                    <button type="button" onClick={() => {
                      setDraft({ ...ruta, arcs: ruta.arcs.filter((_, j) => j !== i) }); touch();
                    }} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="text-[10px] font-bold" style={{ color: ACCENT }}
                onClick={() => {
                  const arcs: RutaArc[] = [...ruta.arcs, { from: 'A', to: 'B', cost: 1 }];
                  setDraft({ ...ruta, arcs }); touch();
                }}>
                <Plus size={11} className="inline" /> arco
              </button>
            </>
          )}

          {mochila && (
            <>
              <label className="text-[11px] text-white/40 block">Capacidad W
                <input className={`${inputClass} mt-1`} type="number" value={mochila.capacity}
                  onChange={e => { setDraft({ ...mochila, capacity: Number(e.target.value) }); touch(); }} />
              </label>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Ítems</p>
              <div className="space-y-1.5">
                {mochila.items.map((it, i) => (
                  <div key={it.id} className="grid grid-cols-[1fr_3.5rem_3.5rem_1.5rem] gap-1">
                    <input className={inputClass} value={it.name}
                      onChange={e => {
                        const items = [...mochila.items];
                        items[i] = { ...it, name: e.target.value };
                        setDraft({ ...mochila, items }); touch();
                      }} />
                    <input className={inputClass} type="number" title="peso" value={it.weight}
                      onChange={e => {
                        const items = [...mochila.items];
                        items[i] = { ...it, weight: Number(e.target.value) };
                        setDraft({ ...mochila, items }); touch();
                      }} />
                    <input className={inputClass} type="number" title="valor" value={it.value}
                      onChange={e => {
                        const items = [...mochila.items];
                        items[i] = { ...it, value: Number(e.target.value) };
                        setDraft({ ...mochila, items }); touch();
                      }} />
                    <button type="button" onClick={() => {
                      setDraft({ ...mochila, items: mochila.items.filter((_, j) => j !== i) }); touch();
                    }} className="text-white/30 hover:text-rose-400"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="text-[10px] font-bold" style={{ color: ACCENT }}
                onClick={() => {
                  const items: MochilaItem[] = [
                    ...mochila.items,
                    { id: String(Date.now()), name: `I${mochila.items.length + 1}`, weight: 1, value: 1 },
                  ];
                  setDraft({ ...mochila, items }); touch();
                }}>
                <Plus size={11} className="inline" /> ítem
              </button>
            </>
          )}

          <HintBanner accent={ACCENT}>
            La PD descompone el problema en etapas. En ruta se usa recursión hacia atrás; en mochila, una etapa por ítem.
          </HintBanner>
          <ValidationList issues={issues} error={error} />
          <SolveButton label="Resolver PD" accent={ACCENT} busy={busy} disabled={!!issues.length} onClick={solve} />
          <ClearButton onClick={() => load(DINAMICA_PRESETS.find(p => p.data.mode === mode)!.id)} />
        </div>
      )}
    >
      {!result ? (
        <div className="rounded-2xl p-6 space-y-3" style={glass}>
          <h3 className="text-lg font-extrabold text-white">Programación dinámica</h3>
          <TextWithMath text={
            `Se resuelven subproblemas solapados y se combina la política óptima. ` +
            `**Ruta por etapas:** $f(i)=\\operatorname{opt}_j\\{c_{ij}+f(j)\\}$. ` +
            `**Mochila 0-1:** $f_i(w)=\\max\\{f_{i-1}(w),\\,v_i+f_{i-1}(w-w_i)\\}$.`
          } />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={glass}>
            <div className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Óptimo</div>
            <div className="text-2xl font-black font-mono" style={{ color: ACCENT }}>
              {result.feasible ? result.optimalValue : 'Infactible'}
            </div>
            {result.policy.length > 0 && (
              <p className="text-sm text-white/60 mt-2">
                Política: {result.policy.join(result.mode === 'ruta' ? ' → ' : ', ')}
              </p>
            )}
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
                <div className="space-y-3">
                  <TextWithMath text={step.content} />
                  {step.table && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-center border-collapse">
                        <thead>
                          <tr>
                            {step.table.headers.map(h => (
                              <th key={h} className="px-2 py-1.5 text-white/40 font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {step.table.rows.map((row, ri) => (
                            <tr key={ri} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              {row.map((cell, ci) => (
                                <td key={ci} className="px-2 py-1.5 font-mono text-white/75">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </ModuleShell>
  );
};
