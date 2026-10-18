import React, { useMemo, useState } from 'react';
import { Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { TextWithMath } from '../LatexRenderer';
import { CostMatrix } from '../io/CostMatrix';
import { ModuleShell, glass } from '../io/ModuleShell';
import { StepBar } from '../transporte/StepBar';
import {
  AssignmentError,
  type AssignmentPreset,
  type AssignmentResult,
  type AssignmentSense,
  solveAssignment,
  validateAssignmentInput,
} from '../../core/AsignacionSolver';

const ACCENT = '#10b981';

interface Props {
  title: string;
  mode: 'asignacion' | 'hungaro';
  presets: AssignmentPreset[];
  intro: string;
}

export const AssignmentWorkbench: React.FC<Props> = ({ title, mode, presets, intro }) => {
  const initial = presets[0];
  const [agents, setAgents] = useState([...initial.data.agents]);
  const [tasks, setTasks] = useState([...initial.data.tasks]);
  const [costs, setCosts] = useState(initial.data.costs.map(r => [...r]));
  const [sense, setSense] = useState<AssignmentSense>(initial.data.sense);
  const [presetId, setPresetId] = useState(initial.id);
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const draft = useMemo(() => ({ agents, tasks, costs, sense }), [agents, tasks, costs, sense]);
  const issues = useMemo(() => validateAssignmentInput(draft), [draft]);

  const clear = () => {
    setResult(null);
    setError(null);
    setStepIdx(0);
  };

  const load = (id: string) => {
    const p = presets.find(item => item.id === id);
    if (!p) return;
    setAgents([...p.data.agents]);
    setTasks([...p.data.tasks]);
    setCosts(p.data.costs.map(r => [...r]));
    setSense(p.data.sense);
    setPresetId(id);
    clear();
  };

  const touch = () => {
    setPresetId('');
    clear();
  };

  const solve = () => {
    if (issues.length) {
      setError(issues[0]);
      return;
    }
    try {
      const r = solveAssignment(draft);
      setResult(r);
      setError(null);
      setStepIdx(mode === 'hungaro' ? 0 : Math.max(0, r.steps.length - 2));
    } catch (err) {
      setResult(null);
      setError(err instanceof AssignmentError || err instanceof Error ? err.message : 'No se pudo resolver.');
    }
  };

  const step = result?.steps[stepIdx];
  const highlights = result
    ? result.pairs.filter(p => !p.fictional).map(p => ({ i: p.agentIndex, j: p.taskIndex }))
    : [];

  return (
    <ModuleShell
      title={title}
      accent={ACCENT}
      sidebar={(
        <>
          <div className="rounded-2xl p-5" style={glass}>
            <h2 className="text-base font-extrabold text-white mb-3">Datos</h2>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">Ejemplos</p>
            <div className="flex flex-col gap-1.5 mb-4">
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={() => load(p.id)}
                  className="text-left px-3 py-2 rounded-xl"
                  style={{
                    background: presetId === p.id ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                    border: presetId === p.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="text-xs font-bold text-white">{p.name}</div>
                  <div className="text-[11px] text-white/40">{p.blurb}</div>
                </button>
              ))}
            </div>

            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">Objetivo</p>
            <div className="flex gap-2 mb-4">
              {(['min', 'max'] as AssignmentSense[]).map(s => (
                <button
                  key={s}
                  onClick={() => { setSense(s); touch(); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: sense === s ? ACCENT : 'rgba(255,255,255,0.05)',
                    color: sense === s ? 'white' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {s === 'min' ? 'Minimizar' : 'Maximizar'}
                </button>
              ))}
            </div>

            <div className="flex justify-between mb-2">
              <p className="text-[10px] font-black tracking-widest uppercase text-white/30">Matriz</p>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (agents.length >= 10) return;
                    setAgents(a => [...a, `A${a.length + 1}`]);
                    setCosts(c => [...c, tasks.map(() => 0)]);
                    touch();
                  }}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{ background: `${ACCENT}20`, color: ACCENT }}
                >
                  <Plus size={11} className="inline" /> fila
                </button>
                <button
                  onClick={() => {
                    if (tasks.length >= 10) return;
                    setTasks(t => [...t, `T${t.length + 1}`]);
                    setCosts(c => c.map(row => [...row, 0]));
                    touch();
                  }}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{ background: `${ACCENT}20`, color: ACCENT }}
                >
                  <Plus size={11} className="inline" /> col
                </button>
              </div>
            </div>

            <CostMatrix
              rowLabels={agents}
              colLabels={tasks}
              values={costs}
              editable
              onRowLabel={(i, v) => { setAgents(a => a.map((x, k) => (k === i ? v : x))); touch(); }}
              onColLabel={(j, v) => { setTasks(t => t.map((x, k) => (k === j ? v : x))); touch(); }}
              onCell={(i, j, v) => {
                setCosts(c => c.map((row, ri) => (ri === i ? row.map((cell, cj) => (cj === j ? v : cell)) : row)));
                touch();
              }}
            />

            <div className="flex gap-2 mt-3">
              {agents.length > 1 && (
                <button
                  onClick={() => {
                    setAgents(a => a.slice(0, -1));
                    setCosts(c => c.slice(0, -1));
                    touch();
                  }}
                  className="text-[10px] text-red-300/70 flex items-center gap-1"
                >
                  <Trash2 size={11} /> Quitar fila
                </button>
              )}
              {tasks.length > 1 && (
                <button
                  onClick={() => {
                    setTasks(t => t.slice(0, -1));
                    setCosts(c => c.map(row => row.slice(0, -1)));
                    touch();
                  }}
                  className="text-[10px] text-red-300/70 flex items-center gap-1"
                >
                  <Trash2 size={11} /> Quitar col
                </button>
              )}
            </div>
          </div>

          <button
            onClick={solve}
            disabled={issues.length > 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: 'white' }}
          >
            <Play size={16} /> {mode === 'hungaro' ? 'Ejecutar Kuhn–Munkres' : 'Resolver asignación'}
          </button>
          {result && (
            <button
              onClick={clear}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={13} /> Reiniciar
            </button>
          )}
          {(error || issues[0]) && <p className="text-xs text-red-300 px-1">{error || issues[0]}</p>}
        </>
      )}
    >
      {!result || !step ? (
        <div className="rounded-2xl p-6 space-y-4" style={glass}>
          <h2 className="text-xl font-extrabold text-white">{title}</h2>
          <p className="text-sm text-white/50 leading-relaxed">{intro}</p>
          <div className="text-white/80">
            <TextWithMath text={sense === 'min'
              ? '$$\\min Z = \\sum_{i}\\sum_{j} c_{ij} x_{ij} \\quad \\sum_j x_{ij}=1,\\; \\sum_i x_{ij}=1,\\; x_{ij}\\in\\{0,1\\}$$'
              : '$$\\max Z = \\sum_{i}\\sum_{j} c_{ij} x_{ij} \\quad \\text{(vía } c\'_{ij}=M-c_{ij}\\text{)}$$'}
            />
          </div>
          <p className="text-xs text-white/35">Carga un ejemplo o edita la matriz y pulsa resolver.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-4" style={glass}>
            <div className="text-xs font-bold uppercase tracking-wider text-white/35 mb-1">Solución</div>
            <div className="text-2xl font-black" style={{ color: ACCENT }}>
              Z = {result.total}
            </div>
            <ul className="mt-3 space-y-1">
              {result.pairs.filter(p => !p.fictional).map(p => (
                <li key={`${p.agent}-${p.task}`} className="text-sm text-white/75">
                  <span className="font-semibold text-white">{p.agent}</span> → <span className="font-semibold text-white">{p.task}</span>
                  {': '}{p.cost}
                </li>
              ))}
            </ul>
            {result.pairs.some(p => p.fictional) && (
              <p className="text-[11px] text-white/35 mt-2">Las filas/columnas ficticias no entran en Z.</p>
            )}
          </div>

          {mode === 'hungaro' && (
            <StepBar
              count={result.steps.length}
              index={stepIdx}
              titles={result.steps.map(s => s.title)}
              label={step.title}
              title={step.title}
              accent={ACCENT}
              onChange={setStepIdx}
            />
          )}

          {mode === 'asignacion' && (
            <div className="flex flex-wrap gap-2">
              {result.steps.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setStepIdx(i)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: i === stepIdx ? `${ACCENT}25` : 'rgba(255,255,255,0.04)',
                    color: i === stepIdx ? '#6ee7b7' : 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl p-4" style={glass}>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">
              {step.matrix ? 'Matriz del paso' : 'Matriz de costos original'}
            </p>
            <CostMatrix
              rowLabels={step.rowLabels ?? result.original.agents}
              colLabels={step.colLabels ?? result.original.tasks}
              values={step.matrix ?? result.original.costs}
              highlight={stepIdx >= result.steps.length - 2 ? highlights : []}
            />
          </div>

          <div className="rounded-2xl p-5" style={{ ...glass, borderLeft: `3px solid ${ACCENT}` }}>
            <TextWithMath text={step.body} />
          </div>
        </div>
      )}
    </ModuleShell>
  );
};
