import React, { useMemo, useState } from 'react';
import { FilePlus2, Plus } from 'lucide-react';
import { TextWithMath } from '../components/LatexRenderer';
import { ModuleShell, glass, inputClass, sidebarBasisForRows } from '../components/io/ModuleShell';
import { NetworkBoard } from '../components/io/NetworkBoard';
import { EdgeListEditor } from '../components/io/EdgeListEditor';
import { DarkSelect } from '../components/io/DarkSelect';
import { ClearButton, HintBanner, SolveButton, ValidationList } from '../components/io/CalculatorChrome';
import { StepBar } from '../components/transporte/StepBar';
import {
  MIN_COST_PRESETS,
  MinCostFlowError,
  blankMinCostFlow,
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
  const [busy, setBusy] = useState(false);

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

  const startBlank = () => {
    const b = blankMinCostFlow();
    setNodes([...b.nodes]);
    setEdges(b.edges.map(e => ({ ...e })));
    setSource(b.source);
    setSink(b.sink);
    setDemand(b.demand);
    setPresetId('');
    clear();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) { setError(issues[0]); return; }
    setBusy(true);
    try {
      setResult(solveMinCostFlow(draft));
      setError(null);
      setStepIdx(0);
    } catch (err) {
      setResult(null);
      setError(err instanceof MinCostFlowError || err instanceof Error ? err.message : 'No se pudo resolver.');
    } finally {
      setBusy(false);
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
      sidebarBasisRem={sidebarBasisForRows(edges.length + nodes.length, 0.45, 20, 32)}
      sidebar={(
        <>
          <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 space-y-3 min-w-0" style={glass}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white">Red y demanda</h2>
              <button type="button" onClick={startBlank}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' }}>
                <FilePlus2 size={12} /> Personalizado
              </button>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Ejemplos (editables)</p>
            <div className="grid grid-cols-1 @[26rem]/sidebar:grid-cols-2 gap-1.5">
              {MIN_COST_PRESETS.map(p => (
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

            <EdgeListEditor
              nodes={nodes}
              edges={edges}
              withCost
              accent={ACCENT}
              onChange={next => { setEdges(next.map(e => ({ ...e, cost: e.cost ?? 0 }))); touch(); }}
              onAdd={() => {
                setEdges(ed => [...ed, {
                  id: `e${Date.now()}`,
                  from: nodes[0],
                  to: nodes[nodes.length - 1],
                  capacity: 1,
                  cost: 1,
                }]);
                touch();
              }}
            />
          </div>

          <SolveButton label="Calcular con esta red" disabled={issues.length > 0} busy={busy} accent={ACCENT} onClick={solve} />
          {result && <ClearButton onClick={clear} />}
          <ValidationList issues={issues} error={error} />
          {!result && issues.length === 0 && (
            <HintBanner accent={ACCENT}>
              Costos negativos permitidos si no hay ciclos negativos con capacidad. Al editar se limpia la solución previa.
            </HintBanner>
          )}
        </>
      )}
    >
      {!result ? (
        <div className="rounded-2xl p-6 space-y-3" style={glass}>
          <h2 className="text-xl font-extrabold text-white">Flujo a costo mínimo</h2>
          <p className="text-sm text-white/50">
            Caminos de menor costo con Bellman–Ford en la red residual. Construye tu red o carga un ejemplo editable.
            Si no hay capacidad suficiente, el resultado se marca incompleto.
          </p>
          <TextWithMath text={'$$\\min \\sum_{(i,j)} c_{ij} f_{ij} \\quad 0 \\le f_{ij} \\le u_{ij}$$'} />
          <NetworkBoard nodes={nodes} edges={viewEdges} source={source} sink={sink} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-4" style={glass}>
            <div className="text-xs uppercase tracking-wider text-white/35 font-bold">
              {result.complete ? 'Solución completa' : result.sent === 0 ? 'No factible' : 'Solución incompleta'}
            </div>
            <div className="text-2xl font-black text-white mt-1">
              Enviado {result.sent} / {result.demand}
            </div>
            <div className="text-3xl font-black mt-1" style={{ color: result.complete ? ACCENT : '#fbbf24' }}>
              Costo {result.totalCost}
            </div>
            <p className="text-sm text-white/50 mt-2">{result.message}</p>
            <p className="text-[11px] text-white/35 mt-1">
              Costo = Σ (flujo final × costo unitario original). No se usa como total el costo de la matriz residual.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2 px-1">
              Procedimiento paso a paso
            </p>
            {result.steps.length > 0 ? (
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
            ) : (
              <div className="rounded-2xl p-4 text-sm text-white/50" style={glass}>
                No se pudo enviar flujo: no hay camino de costo finito desde el origen al destino.
              </div>
            )}
          </div>

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
