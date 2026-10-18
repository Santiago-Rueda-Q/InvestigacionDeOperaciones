import React, { useMemo, useState } from 'react';
import { FilePlus2, Plus, Trash2 } from 'lucide-react';
import { TextWithMath } from '../components/LatexRenderer';
import { ModuleShell, glass, inputClass, sidebarBasisForRows } from '../components/io/ModuleShell';
import { NetworkBoard } from '../components/io/NetworkBoard';
import { EdgeListEditor } from '../components/io/EdgeListEditor';
import { DarkSelect } from '../components/io/DarkSelect';
import { ClearButton, HintBanner, SolveButton, ValidationList } from '../components/io/CalculatorChrome';
import { StepBar } from '../components/transporte/StepBar';
import {
  FlowError,
  MAX_FLOW_PRESETS,
  blankMaxFlow,
  checkFlowConservation,
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
  const [busy, setBusy] = useState(false);

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

  const startBlank = () => {
    const b = blankMaxFlow();
    setNodes([...b.nodes]);
    setEdges(b.edges.map(e => ({ ...e })));
    setSource(b.source);
    setSink(b.sink);
    setPresetId('');
    clear();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) { setError(issues[0]); return; }
    setBusy(true);
    try {
      setResult(solveMaxFlow(draft));
      setError(null);
      setStepIdx(0);
    } catch (err) {
      setResult(null);
      setError(err instanceof FlowError || err instanceof Error ? err.message : 'No se pudo resolver.');
    } finally {
      setBusy(false);
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
      sidebarBasisRem={sidebarBasisForRows(edges.length + nodes.length, 0.4, 20, 30)}
      sidebar={(
        <>
          <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 space-y-3 min-w-0" style={glass}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white">Red</h2>
              <button type="button" onClick={startBlank}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' }}>
                <FilePlus2 size={12} /> Personalizado
              </button>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Ejemplos (editables)</p>
            <div className="grid grid-cols-1 @[26rem]/sidebar:grid-cols-2 gap-1.5">
              {MAX_FLOW_PRESETS.map(p => (
                <button key={p.id} type="button" onClick={() => load(p.id)} className="text-left px-3 py-2 rounded-xl min-w-0"
                  style={{
                    background: presetId === p.id ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                    border: presetId === p.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
                  }}>
                  <div className="text-xs font-bold text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-white/40 line-clamp-2">{p.blurb}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-white/40 block">Origen
                <DarkSelect
                  className="mt-1"
                  value={source}
                  options={nodes}
                  accent={ACCENT}
                  aria-label="Nodo origen"
                  onChange={v => { setSource(v); touch(); }}
                />
              </label>
              <label className="text-[11px] text-white/40 block">Destino
                <DarkSelect
                  className="mt-1"
                  value={sink}
                  options={nodes}
                  accent={ACCENT}
                  aria-label="Nodo destino"
                  onChange={v => { setSink(v); touch(); }}
                />
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

            <EdgeListEditor
              nodes={nodes}
              edges={edges}
              accent={ACCENT}
              onChange={next => { setEdges(next); touch(); }}
              onAdd={() => {
                setEdges(ed => [...ed, {
                  id: `e${Date.now()}`,
                  from: nodes[0],
                  to: nodes[nodes.length - 1],
                  capacity: 1,
                }]);
                touch();
              }}
            />
          </div>
          <SolveButton label="Calcular con esta red" disabled={issues.length > 0} busy={busy} accent={ACCENT} onClick={solve} />
          {result && <ClearButton onClick={clear} />}
          <ValidationList issues={issues} error={error} />
          {!result && issues.length === 0 && (
            <HintBanner accent={ACCENT}>Cambia nodos, aristas o capacidades: la solución anterior se borra hasta volver a calcular.</HintBanner>
          )}
        </>
      )}
    >
      {!result ? (
        <div className="rounded-2xl p-6 space-y-3" style={glass}>
          <h2 className="text-xl font-extrabold text-white">Flujo máximo</h2>
          <p className="text-sm text-white/50">Edmonds–Karp (Ford–Fulkerson + BFS). Construye tu red o carga un ejemplo editable.</p>
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
            <div className="mt-3 text-[11px] text-white/45 space-y-0.5">
              <p className="font-bold text-white/55 uppercase tracking-wider text-[10px]">Conservación (nodos intermedios)</p>
              {checkFlowConservation(nodes, result.edges, source, sink).map(c => (
                <p key={c.node}>{c.node}: entrada − salida = {c.net} {c.ok ? '✓' : '✗'}</p>
              ))}
              {checkFlowConservation(nodes, result.edges, source, sink).length === 0 && (
                <p>No hay nodos intermedios que comprobar.</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2 px-1">
              Procedimiento paso a paso (caminos aumentantes)
            </p>
            {result.steps.length > 0 ? (
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
            ) : (
              <div className="rounded-2xl p-4 text-sm text-white/50" style={glass}>
                No hubo aumentos: no existe camino s→t con capacidad residual positiva.
              </div>
            )}
          </div>

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
                  <th>Residual</th>
                </tr>
              </thead>
              <tbody>
                {(step?.edgeFlows ?? result.edges).map(e => (
                  <tr key={e.id}>
                    <td className="py-1 font-semibold text-white">{e.from} → {e.to}</td>
                    <td className="text-center">{e.capacity}</td>
                    <td className="text-center" style={{ color: e.flow > 0 ? ACCENT : undefined }}>{e.flow}</td>
                    <td className="text-center">{e.capacity - e.flow}</td>
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
