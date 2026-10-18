import React, { useMemo, useState } from 'react';
import { Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { TextWithMath } from '../components/LatexRenderer';
import { ModuleShell, glass, inputClass } from '../components/io/ModuleShell';
import { NetworkBoard } from '../components/io/NetworkBoard';
import { StepBar } from '../components/transporte/StepBar';
import {
  MIN_COST_PRESETS,
  MinCostFlowError,
  type MinCostFlowResult,
  solveMinCostFlow,
  validateMinCostInput,
} from '../core/FlujoCostoMinSolver';

const ACCENT = '#10b981';

export const FlujoCostoMinPage: React.FC = () => {
  const initial = MIN_COST_PRESETS[0];
  const [nodes, setNodes] = useState([...initial.data.nodes]);
  const [edges, setEdges] = useState(initial.data.edges.map(e => ({ ...e })));
  const [source, setSource] = useState(initial.data.source);
  const [sink, setSink] = useState(initial.data.sink);
  const [demand, setDemand] = useState(initial.data.demand);
  const [presetId, setPresetId] = useState(initial.id);
  const [result, setResult] = useState<MinCostFlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const draft = useMemo(
    () => ({ nodes, edges, source, sink, demand }),
    [nodes, edges, source, sink, demand],
  );
  const issues = useMemo(() => validateMinCostInput(draft), [draft]);

  const clear = () => { setResult(null); setError(null); setStepIdx(0); };
  const touch = () => { setPresetId(''); clear(); };

  const load = (id: string) => {
    const p = MIN_COST_PRESETS.find(x => x.id === id);
    if (!p) return;
    setNodes([...p.data.nodes]);
    setEdges(p.data.edges.map(e => ({ ...e })));
    setSource(p.data.source);
    setSink(p.data.sink);
    setDemand(p.data.demand);
    setPresetId(id);
    clear();
  };

  const solve = () => {
    if (issues.length) { setError(issues[0]); return; }
    try {
      setResult(solveMinCostFlow(draft));
      setError(null);
      setStepIdx(0);
    } catch (err) {
      setResult(null);
      setError(err instanceof MinCostFlowError || err instanceof Error ? err.message : 'No se pudo resolver.');
    }
  };

  const step = result?.steps[stepIdx];
  const viewEdges = (step?.edges ?? result?.edges ?? edges.map(e => ({ ...e, flow: 0 }))).map(e => ({
    id: e.id,
    from: e.from,
    to: e.to,
    label: `${e.flow ?? 0}/${e.capacity} · $${e.cost}`,
    active: (e.flow ?? 0) > 0,
  }));

  return (
    <ModuleShell
      title="Flujo a Costo Mínimo"
      accent={ACCENT}
      sidebar={(
        <>
          <div className="rounded-2xl p-5 space-y-3" style={glass}>
            <h2 className="text-base font-extrabold text-white">Red y demanda</h2>
            <div className="flex flex-col gap-1.5">
              {MIN_COST_PRESETS.map(p => (
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

            <label className="text-[11px] text-white/40 block">Flujo solicitado
              <input type="number" min={0} value={Number.isFinite(demand) ? demand : ''} className={`${inputClass} mt-1`}
                onChange={e => { setDemand(Number(e.target.value)); touch(); }} />
            </label>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Nodos</span>
                <button onClick={() => { setNodes(n => [...n, `N${n.length + 1}`]); touch(); }}
                  className="text-[10px] font-bold" style={{ color: ACCENT }}><Plus size={11} className="inline" /> nodo</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {nodes.map((n, i) => (
                  <input key={i} value={n} className={inputClass} style={{ width: 56 }}
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
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Aristas (cap, costo)</span>
                <button onClick={() => {
                  setEdges(ed => [...ed, {
                    id: `e${Date.now()}`, from: nodes[0], to: nodes[nodes.length - 1], capacity: 1, cost: 1,
                  }]);
                  touch();
                }} className="text-[10px] font-bold" style={{ color: ACCENT }}><Plus size={11} className="inline" /> arista</button>
              </div>
              <div className="space-y-1.5">
                {edges.map((e, i) => (
                  <div key={e.id} className="grid grid-cols-[1fr_1fr_48px_48px_20px] gap-1 items-center">
                    <select value={e.from} className={inputClass}
                      onChange={ev => { setEdges(ed => ed.map((x, k) => k === i ? { ...x, from: ev.target.value } : x)); touch(); }}>
                      {nodes.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select value={e.to} className={inputClass}
                      onChange={ev => { setEdges(ed => ed.map((x, k) => k === i ? { ...x, to: ev.target.value } : x)); touch(); }}>
                      {nodes.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input type="number" min={0} title="Capacidad" value={e.capacity} className={inputClass}
                      onChange={ev => {
                        const v = Number(ev.target.value);
                        setEdges(ed => ed.map((x, k) => k === i ? { ...x, capacity: v } : x));
                        touch();
                      }} />
                    <input type="number" title="Costo" value={e.cost} className={inputClass}
                      onChange={ev => {
                        const v = Number(ev.target.value);
                        setEdges(ed => ed.map((x, k) => k === i ? { ...x, cost: v } : x));
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
            <Play size={16} /> Calcular costo mínimo
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
          <h2 className="text-xl font-extrabold text-white">Flujo a costo mínimo</h2>
          <p className="text-sm text-white/50">
            Caminos aumentantes de menor costo con Bellman–Ford sobre la red residual.
            Si no hay capacidad suficiente, se informa la solución incompleta (no se presenta como completa).
          </p>
          <TextWithMath text={'$$\\min \\sum_{(i,j)} c_{ij} f_{ij} \\quad 0 \\le f_{ij} \\le u_{ij}$$'} />
          <NetworkBoard nodes={nodes} edges={viewEdges} source={source} sink={sink} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-4" style={glass}>
            <div className="text-xs uppercase tracking-wider text-white/35 font-bold">
              {result.complete ? 'Solución completa' : 'Solución incompleta'}
            </div>
            <div className="text-2xl font-black text-white mt-1">
              Enviado {result.sent} / {result.demand}
            </div>
            <div className="text-3xl font-black mt-1" style={{ color: result.complete ? ACCENT : '#fbbf24' }}>
              Costo {result.totalCost}
            </div>
            <p className="text-sm text-white/50 mt-2">{result.message}</p>
          </div>

          {result.steps.length > 0 && (
            <StepBar
              count={result.steps.length}
              index={stepIdx}
              titles={result.steps.map(s => `Iter ${s.iteration}`)}
              label={`Iteración ${step?.iteration ?? 1}`}
              title={step ? step.path.join(' → ') : ''}
              trailing={step ? `+${step.amount} · costo camino ${step.pathCost}` : undefined}
              accent={ACCENT}
              onChange={setStepIdx}
            />
          )}

          <div className="rounded-2xl p-4" style={glass}>
            <NetworkBoard nodes={nodes} edges={viewEdges} source={source} sink={sink} />
            <p className="text-[10px] text-white/35 mt-2">Etiqueta: flujo/capacidad · costo unitario</p>
          </div>

          {step && (
            <div className="rounded-2xl p-5" style={{ ...glass, borderLeft: `3px solid ${ACCENT}` }}>
              <TextWithMath text={`${step.hint}\n\nCosto acumulado hasta ahora: $${step.totalCostSoFar}$.`} />
            </div>
          )}

          <div className="rounded-2xl p-4 overflow-x-auto" style={glass}>
            <table className="w-full text-xs text-white/70">
              <thead>
                <tr className="text-white/40">
                  <th className="text-left py-1">Arista</th>
                  <th>u</th>
                  <th>c</th>
                  <th>f</th>
                  <th>c·f</th>
                </tr>
              </thead>
              <tbody>
                {(step?.edges ?? result.edges).map(e => (
                  <tr key={e.id}>
                    <td className="py-1 font-semibold text-white">{e.from} → {e.to}</td>
                    <td className="text-center">{e.capacity}</td>
                    <td className="text-center">{e.cost}</td>
                    <td className="text-center" style={{ color: e.flow > 0 ? ACCENT : undefined }}>{e.flow}</td>
                    <td className="text-center">{e.flow * e.cost}</td>
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
