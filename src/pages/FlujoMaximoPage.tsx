import React, { useMemo, useState } from 'react';
import { Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { TextWithMath } from '../components/LatexRenderer';
import { ModuleShell, glass, inputClass } from '../components/io/ModuleShell';
import { NetworkBoard } from '../components/io/NetworkBoard';
import { StepBar } from '../components/transporte/StepBar';
import {
  FlowError,
  MAX_FLOW_PRESETS,
  type MaxFlowResult,
  solveMaxFlow,
  validateMaxFlowInput,
} from '../core/FlujoMaximoSolver';

const ACCENT = '#10b981';

export const FlujoMaximoPage: React.FC = () => {
  const initial = MAX_FLOW_PRESETS[1];
  const [nodes, setNodes] = useState([...initial.data.nodes]);
  const [edges, setEdges] = useState(initial.data.edges.map(e => ({ ...e })));
  const [source, setSource] = useState(initial.data.source);
  const [sink, setSink] = useState(initial.data.sink);
  const [presetId, setPresetId] = useState(initial.id);
  const [result, setResult] = useState<MaxFlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const draft = useMemo(() => ({ nodes, edges, source, sink }), [nodes, edges, source, sink]);
  const issues = useMemo(() => validateMaxFlowInput(draft), [draft]);

  const clear = () => { setResult(null); setError(null); setStepIdx(0); };
  const touch = () => { setPresetId(''); clear(); };

  const load = (id: string) => {
    const p = MAX_FLOW_PRESETS.find(x => x.id === id);
    if (!p) return;
    setNodes([...p.data.nodes]);
    setEdges(p.data.edges.map(e => ({ ...e })));
    setSource(p.data.source);
    setSink(p.data.sink);
    setPresetId(id);
    clear();
  };

  const solve = () => {
    if (issues.length) { setError(issues[0]); return; }
    try {
      setResult(solveMaxFlow(draft));
      setError(null);
      setStepIdx(0);
    } catch (err) {
      setResult(null);
      setError(err instanceof FlowError || err instanceof Error ? err.message : 'No se pudo resolver.');
    }
  };

  const step = result?.steps[stepIdx];
  const boardEdges = (result
    ? (step ? step.edgeFlows : result.edges)
    : edges.map(e => ({ ...e, flow: 0 }))
  ).map(e => ({
    id: e.id,
    from: e.from,
    to: e.to,
    label: `${e.flow ?? 0}/${e.capacity}`,
    active: (e.flow ?? 0) > 0,
    muted: e.capacity === 0,
  }));

  return (
    <ModuleShell
      title="Flujo Máximo"
      accent={ACCENT}
      sidebar={(
        <>
          <div className="rounded-2xl p-5 space-y-3" style={glass}>
            <h2 className="text-base font-extrabold text-white">Red</h2>
            <div className="flex flex-col gap-1.5">
              {MAX_FLOW_PRESETS.map(p => (
                <button key={p.id} onClick={() => load(p.id)} className="text-left px-3 py-2 rounded-xl"
                  style={{
                    background: presetId === p.id ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                    border: presetId === p.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  <div className="text-xs font-bold text-white">{p.name}</div>
                  <div className="text-[11px] text-white/40">{p.blurb}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-white/40">Origen
                <select value={source} onChange={e => { setSource(e.target.value); touch(); }} className={`${inputClass} mt-1`}>
                  {nodes.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-white/40">Destino
                <select value={sink} onChange={e => { setSink(e.target.value); touch(); }} className={`${inputClass} mt-1`}>
                  {nodes.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Nodos</span>
                <button onClick={() => { setNodes(n => [...n, `N${n.length + 1}`]); touch(); }}
                  className="text-[10px] font-bold" style={{ color: ACCENT }}><Plus size={11} className="inline" /> nodo</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {nodes.map((n, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input value={n} className={inputClass} style={{ width: 56 }}
                      onChange={e => {
                        const v = e.target.value;
                        setNodes(prev => prev.map((x, k) => (k === i ? v : x)));
                        setEdges(ed => ed.map(edge => ({
                          ...edge,
                          from: edge.from === n ? v : edge.from,
                          to: edge.to === n ? v : edge.to,
                        })));
                        if (source === n) setSource(v);
                        if (sink === n) setSink(v);
                        touch();
                      }} />
                    {nodes.length > 2 && (
                      <button onClick={() => {
                        setNodes(prev => prev.filter((_, k) => k !== i));
                        setEdges(ed => ed.filter(e => e.from !== n && e.to !== n));
                        touch();
                      }} className="text-red-400/50"><Trash2 size={12} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Aristas</span>
                <button onClick={() => {
                  const id = `e${Date.now()}`;
                  setEdges(ed => [...ed, { id, from: nodes[0], to: nodes[nodes.length - 1], capacity: 1 }]);
                  touch();
                }} className="text-[10px] font-bold" style={{ color: ACCENT }}><Plus size={11} className="inline" /> arista</button>
              </div>
              <div className="space-y-1.5">
                {edges.map((e, i) => (
                  <div key={e.id} className="grid grid-cols-[1fr_1fr_56px_20px] gap-1 items-center">
                    <select value={e.from} className={inputClass}
                      onChange={ev => { setEdges(ed => ed.map((x, k) => k === i ? { ...x, from: ev.target.value } : x)); touch(); }}>
                      {nodes.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select value={e.to} className={inputClass}
                      onChange={ev => { setEdges(ed => ed.map((x, k) => k === i ? { ...x, to: ev.target.value } : x)); touch(); }}>
                      {nodes.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input type="number" min={0} value={e.capacity} className={inputClass}
                      onChange={ev => {
                        const v = Number(ev.target.value);
                        setEdges(ed => ed.map((x, k) => k === i ? { ...x, capacity: Number.isFinite(v) ? v : Number.NaN } : x));
                        touch();
                      }} />
                    <button onClick={() => { setEdges(ed => ed.filter((_, k) => k !== i)); touch(); }} className="text-red-400/50"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={solve} disabled={issues.length > 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: 'white' }}>
            <Play size={16} /> Calcular flujo máximo
          </button>
          {result && (
            <button onClick={clear} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={13} /> Reiniciar
            </button>
          )}
          {(error || issues[0]) && <p className="text-xs text-red-300">{error || issues[0]}</p>}
        </>
      )}
    >
      {!result ? (
        <div className="rounded-2xl p-6 space-y-3" style={glass}>
          <h2 className="text-xl font-extrabold text-white">Flujo máximo</h2>
          <p className="text-sm text-white/50">Edmonds–Karp: Ford–Fulkerson con BFS. Se muestran caminos aumentantes, flujo por arista y el corte mínimo.</p>
          <TextWithMath text={'$$v = \\max\\ \\text{flujo de } s \\text{ a } t$$'} />
          <NetworkBoard nodes={nodes} edges={boardEdges} source={source} sink={sink} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-4" style={glass}>
            <div className="text-xs uppercase tracking-wider text-white/35 font-bold">Flujo máximo</div>
            <div className="text-3xl font-black" style={{ color: ACCENT }}>{result.maxFlow}</div>
            {result.unreachable && <p className="text-sm text-amber-200/80 mt-2">No hay camino aumentante: el flujo es 0.</p>}
            <p className="text-xs text-white/40 mt-2">
              Corte mínimo: {result.minCut.sourceSide.join(', ')} | {result.minCut.sinkSide.join(', ')}
              {' '}(capacidad {result.minCut.capacity})
            </p>
          </div>

          {result.steps.length > 0 && (
            <StepBar
              count={result.steps.length}
              index={stepIdx}
              titles={result.steps.map(s => `Iter ${s.iteration}`)}
              label={`Iteración ${step?.iteration ?? 1}`}
              title={step ? step.path.join(' → ') : ''}
              trailing={step ? `+${step.bottleneck} · total ${step.totalFlow}` : undefined}
              accent={ACCENT}
              onChange={setStepIdx}
            />
          )}

          <div className="rounded-2xl p-4" style={glass}>
            <NetworkBoard nodes={nodes} edges={boardEdges} source={source} sink={sink} />
            <p className="text-[10px] text-white/35 mt-2">Etiqueta: flujo / capacidad. Verde: arista con flujo.</p>
          </div>

          {step && (
            <div className="rounded-2xl p-5" style={{ ...glass, borderLeft: `3px solid ${ACCENT}` }}>
              <TextWithMath text={step.residualHint} />
            </div>
          )}

          <div className="rounded-2xl p-4 overflow-x-auto" style={glass}>
            <table className="w-full text-xs text-white/70">
              <thead>
                <tr className="text-white/40">
                  <th className="text-left py-1">Arista</th>
                  <th>Capacidad</th>
                  <th>Flujo</th>
                </tr>
              </thead>
              <tbody>
                {(step?.edgeFlows ?? result.edges).map(e => (
                  <tr key={e.id}>
                    <td className="py-1 font-semibold text-white">{e.from} → {e.to}</td>
                    <td className="text-center">{e.capacity}</td>
                    <td className="text-center" style={{ color: e.flow > 0 ? ACCENT : undefined }}>{e.flow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModuleShell>
  );
};
