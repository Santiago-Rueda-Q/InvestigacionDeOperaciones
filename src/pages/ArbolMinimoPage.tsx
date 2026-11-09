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
  MstError,
  MST_PRESETS,
  blankMst,
  type MstAlgorithm,
  type MstResult,
  solveMst,
  validateMstInput,
} from '../core/ArbolMinimoSolver';

const ACCENT = '#10b981';

const ALGO_OPTIONS = [
  { value: 'kruskal', label: 'Kruskal' },
  { value: 'prim',    label: 'Prim'    },
] satisfies { value: MstAlgorithm; label: string }[];

export const ArbolMinimoPage: React.FC = () => {
  const initial = MST_PRESETS[0];

  const [nodes,     setNodes]     = useState([...initial.data.nodes]);
  const [edges,     setEdges]     = useState(
    // Mapear weight → capacity para usar con EdgeListEditor
    initial.data.edges.map(e => ({ id: e.id, from: e.from, to: e.to, capacity: e.weight })),
  );
  const [algorithm, setAlgorithm] = useState<MstAlgorithm>(initial.data.algorithm);
  const [startNode, setStartNode] = useState(initial.data.startNode ?? initial.data.nodes[0]);
  const [presetId,  setPresetId]  = useState(initial.id);
  const [result,    setResult]    = useState<MstResult | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [stepIdx,   setStepIdx]   = useState(0);
  const [busy,      setBusy]      = useState(false);

  // ── draft: convertir capacity → weight para el solver ────────────────────
  const draft = useMemo(() => ({
    nodes,
    edges: edges.map(e => ({ id: e.id, from: e.from, to: e.to, weight: e.capacity })),
    algorithm,
    startNode,
  }), [nodes, edges, algorithm, startNode]);

  const issues = useMemo(() => validateMstInput(draft), [draft]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clear = () => { setResult(null); setError(null); setStepIdx(0); };
  const touch = () => { setPresetId(''); clear(); };

  const load = (id: string) => {
    const p = MST_PRESETS.find(x => x.id === id);
    if (!p) return;
    setNodes([...p.data.nodes]);
    setEdges(p.data.edges.map(e => ({ id: e.id, from: e.from, to: e.to, capacity: e.weight })));
    setAlgorithm(p.data.algorithm);
    setStartNode(p.data.startNode ?? p.data.nodes[0]);
    setPresetId(id);
    clear();
  };

  const startBlank = () => {
    const b = blankMst();
    setNodes([...b.nodes]);
    setEdges(b.edges.map(e => ({ id: e.id, from: e.from, to: e.to, capacity: e.weight })));
    setAlgorithm(b.algorithm);
    setStartNode(b.startNode ?? b.nodes[0]);
    setPresetId('');
    clear();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) { setError(issues[0]); return; }
    setBusy(true);
    try {
      setResult(solveMst(draft));
      setError(null);
      setStepIdx(0);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof MstError || err instanceof Error
          ? err.message
          : 'No se pudo resolver.',
      );
    } finally {
      setBusy(false);
    }
  };

  // ── Board ─────────────────────────────────────────────────────────────────
  const step = result?.steps[stepIdx];

  const activeMstIds = step ? step.mstEdgeIds : (result?.mstEdgeIds ?? []);
  const consideredId  = step?.edgeId ?? null;

  const boardEdges = edges.map(e => ({
    id:     e.id,
    from:   e.from,
    to:     e.to,
    label:  String(e.capacity),
    // Arista en el árbol actual: verde
    active: activeMstIds.includes(e.id),
    // Arista rechazada en el paso actual: atenuada
    muted:  result !== null && !activeMstIds.includes(e.id) && consideredId === e.id
      ? false          // la considerada-rechazada la dejamos visible (no muted)
      : result !== null && !activeMstIds.includes(e.id)
        ? true         // las demás no-MST se atenúan para destacar el árbol
        : false,
  }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ModuleShell
      title="Árbol de Mínimo Recorrido"
      accent={ACCENT}
      sidebarBasisRem={sidebarBasisForRows(edges.length + nodes.length, 0.4, 20, 30)}
      sidebar={(
        <>
          {/* ── Panel de configuración ──────────────────────────────────── */}
          <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 space-y-3 min-w-0" style={glass}>

            {/* Cabecera + botón personalizado */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white">Red</h2>
              <button
                type="button"
                onClick={startBlank}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' }}
              >
                <FilePlus2 size={12} /> Personalizado
              </button>
            </div>

            {/* Presets */}
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Ejemplos (editables)</p>
            <div className="grid grid-cols-1 @[26rem]/sidebar:grid-cols-2 gap-1.5">
              {MST_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => load(p.id)}
                  className="text-left px-3 py-2 rounded-xl min-w-0"
                  style={{
                    background: presetId === p.id ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                    border:     presetId === p.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="text-xs font-bold text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-white/40 line-clamp-2">{p.blurb}</div>
                  {p.source && (
                    <div className="text-[9px] text-white/25 mt-0.5 truncate">{p.source}</div>
                  )}
                </button>
              ))}
            </div>

            {/* Selector de algoritmo */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-white/40 block">
                Algoritmo
                <DarkSelect
                  className="mt-1"
                  value={algorithm}
                  options={ALGO_OPTIONS}
                  accent={ACCENT}
                  aria-label="Algoritmo MST"
                  onChange={v => { setAlgorithm(v as MstAlgorithm); touch(); }}
                />
              </label>
              {algorithm === 'prim' && (
                <label className="text-[11px] text-white/40 block">
                  Nodo inicio
                  <DarkSelect
                    className="mt-1"
                    value={startNode}
                    options={nodes}
                    accent={ACCENT}
                    aria-label="Nodo de inicio (Prim)"
                    onChange={v => { setStartNode(v); touch(); }}
                  />
                </label>
              )}
            </div>

            {/* Nodos */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Nodos</span>
                <button
                  onClick={() => {
                    setNodes(n => [...n, `N${n.length + 1}`]);
                    touch();
                  }}
                  className="text-[10px] font-bold"
                  style={{ color: ACCENT }}
                >
                  <Plus size={11} className="inline" /> nodo
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {nodes.map((nd, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input
                      value={nd}
                      className={inputClass}
                      style={{ width: 56 }}
                      onChange={e => {
                        const v = e.target.value;
                        setNodes(prev => prev.map((x, k) => (k === i ? v : x)));
                        setEdges(ed => ed.map(edge => ({
                          ...edge,
                          from: edge.from === nd ? v : edge.from,
                          to:   edge.to   === nd ? v : edge.to,
                        })));
                        if (startNode === nd) setStartNode(v);
                        touch();
                      }}
                    />
                    {nodes.length > 2 && (
                      <button
                        onClick={() => {
                          setNodes(prev => prev.filter((_, k) => k !== i));
                          setEdges(ed => ed.filter(e => e.from !== nd && e.to !== nd));
                          touch();
                        }}
                        className="text-red-400/50"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Aristas (capacity = peso) */}
            <EdgeListEditor
              nodes={nodes}
              edges={edges}
              accent={ACCENT}
              onChange={next => { setEdges(next); touch(); }}
              onAdd={() => {
                setEdges(ed => [...ed, {
                  id:       `e${Date.now()}`,
                  from:     nodes[0],
                  to:       nodes[nodes.length - 1],
                  capacity: 1,
                }]);
                touch();
              }}
            />
            <p className="text-[10px] text-white/30 leading-tight -mt-1">
              «Cap.» = Peso de la arista (no dirigida).
            </p>
          </div>

          {/* ── Botones acción ───────────────────────────────────────────── */}
          <SolveButton
            label={`Calcular MST (${algorithm === 'kruskal' ? 'Kruskal' : 'Prim'})`}
            disabled={issues.length > 0}
            busy={busy}
            accent={ACCENT}
            onClick={solve}
          />
          {result && <ClearButton onClick={clear} />}
          <ValidationList issues={issues} error={error} />
          {!result && issues.length === 0 && (
            <HintBanner accent={ACCENT}>
              Modifica nodos, aristas o pesos: la solución anterior se borra hasta recalcular.
            </HintBanner>
          )}
        </>
      )}
    >
      {/* ── Panel principal ─────────────────────────────────────────────── */}
      {!result ? (
        <div className="rounded-2xl p-6 space-y-4" style={glass}>
          <h2 className="text-xl font-extrabold text-white">Árbol de Mínimo Recorrido</h2>
          <p className="text-sm text-white/50">
            Kruskal (Union-Find) · Prim (mínimo corte). Grafo no dirigido con pesos.
          </p>
          <TextWithMath
            text={
              '$$\\text{MST} = \\underset{T \\subseteq E,\\ \\text{árbol}}' +
              '{\\arg\\min}\\sum_{e \\in T} w(e)$$'
            }
          />
          <NetworkBoard nodes={nodes} edges={boardEdges} />
          <p className="text-[10px] text-white/30">
            Etiqueta = peso. Carga un ejemplo o define tu propia red.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Resumen del resultado ──────────────────────────────────── */}
          <div className="rounded-2xl p-4" style={glass}>
            <div className="text-xs uppercase tracking-wider text-white/35 font-bold">
              Costo total del MST
            </div>
            <div className="text-3xl font-black" style={{ color: ACCENT }}>
              {result.totalCost}
            </div>
            {!result.connected && (
              <p className="text-sm text-amber-200/80 mt-2">
                ⚠ El grafo no es conexo: no existe un árbol recubridor completo.
                Se muestra el bosque de mínimo costo.
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-white/50">
              <span className="font-bold text-white/60">Algoritmo</span>
              <span>{result.algorithm === 'kruskal' ? 'Kruskal' : 'Prim'}</span>
              <span className="font-bold text-white/60">Aristas en MST</span>
              <span>{result.mstEdgeIds.length} de {edges.length}</span>
              <span className="font-bold text-white/60">Nodos cubiertos</span>
              <span>
                {result.connected
                  ? `${nodes.length} / ${nodes.length} ✓`
                  : `${result.mstEdgeIds.length + 1} / ${nodes.length}`}
              </span>
            </div>
            {result.connected && (
              <div className="mt-2 text-[11px] text-white/40">
                <span className="font-bold text-white/55">Aristas del árbol: </span>
                {result.mstEdges
                  .map(e => `${e.from}–${e.to} (${e.weight})`)
                  .join(' · ')}
              </div>
            )}
          </div>

          {/* ── Procedimiento paso a paso ─────────────────────────────── */}
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2 px-1">
              Procedimiento paso a paso
            </p>
            {result.steps.length > 0 ? (
              <StepBar
                count={result.steps.length}
                index={stepIdx}
                titles={result.steps.map((s, i) =>
                  s.decision === 'info'
                    ? 'Inicialización'
                    : `${s.decision === 'added' ? '✓' : '✗'} ${s.edgeLabel}`,
                )}
                label={
                  step?.decision === 'info'
                    ? 'Inicio'
                    : step?.decision === 'added'
                      ? `✓ Iter ${step.iteration}`
                      : `✗ Iter ${step?.iteration ?? 1}`
                }
                title={
                  step?.decision === 'info'
                    ? 'Inicialización'
                    : step?.edgeLabel ?? ''
                }
                trailing={
                  step && step.decision !== 'info'
                    ? `peso ${step.weight} · total ${step.accumulatedCost}`
                    : undefined
                }
                accent={ACCENT}
                onChange={setStepIdx}
              />
            ) : (
              <div className="rounded-2xl p-4 text-sm text-white/50" style={glass}>
                No se generaron pasos.
              </div>
            )}
          </div>

          {/* ── Detalle del paso actual ───────────────────────────────── */}
          {step && (
            <div
              className="rounded-2xl p-5"
              style={{
                ...glass,
                borderLeft: `3px solid ${
                  step.decision === 'added'
                    ? ACCENT
                    : step.decision === 'rejected'
                      ? '#f43f5e'
                      : 'rgba(255,255,255,0.2)'
                }`,
              }}
            >
              <p className="text-sm text-white/80 leading-relaxed">{step.reason}</p>
              {step.decision !== 'info' && (
                <div className="mt-2 flex gap-4 text-xs text-white/40 font-mono">
                  <span>Aristas en árbol: <strong className="text-white/70">{step.mstEdgeIds.length}</strong></span>
                  <span>Costo acumulado: <strong style={{ color: ACCENT }}>{step.accumulatedCost}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* ── Grafo con árbol visualizado ───────────────────────────── */}
          <div className="rounded-2xl p-4" style={glass}>
            <NetworkBoard nodes={nodes} edges={boardEdges} />
            <p className="text-[10px] text-white/35 mt-2">
              Verde = arista en el MST actual. Atenuada = no incluida.
              Etiqueta = peso.
            </p>
          </div>

          {/* ── Tabla de aristas ─────────────────────────────────────── */}
          <div className="rounded-2xl p-4 overflow-x-auto" style={glass}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
              Tabla de aristas
            </p>
            <table className="w-full text-xs text-white/70">
              <thead>
                <tr className="text-white/40">
                  <th className="text-left py-1">Arista</th>
                  <th className="text-center">Peso</th>
                  <th className="text-center">En MST</th>
                </tr>
              </thead>
              <tbody>
                {edges
                  .slice()
                  .sort((a, b) => a.capacity - b.capacity)
                  .map(e => {
                    const inTree = result.mstEdgeIds.includes(e.id);
                    const isCurrent = step?.edgeId === e.id;
                    return (
                      <tr
                        key={e.id}
                        style={{
                          background: isCurrent ? `${ACCENT}18` : undefined,
                        }}
                      >
                        <td className="py-1 font-semibold" style={{ color: inTree ? ACCENT : 'rgba(255,255,255,0.7)' }}>
                          {e.from} — {e.to}
                          {isCurrent && <span className="ml-1 text-[10px] text-white/40">← actual</span>}
                        </td>
                        <td className="text-center">{e.capacity}</td>
                        <td className="text-center">
                          {inTree
                            ? <span style={{ color: ACCENT }} className="font-bold">✓</span>
                            : <span className="text-white/25">—</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10">
                  <td className="pt-2 text-white/50 font-semibold">Total MST</td>
                  <td className="text-center pt-2 font-black" style={{ color: ACCENT }}>
                    {result.totalCost}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
      )}
    </ModuleShell>
  );
};
