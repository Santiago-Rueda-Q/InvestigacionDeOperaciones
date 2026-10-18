import React, { useMemo, useState } from 'react';
import { FilePlus2 } from 'lucide-react';
import { TextWithMath } from '../LatexRenderer';
import { CostMatrix } from '../io/CostMatrix';
import { ModuleShell, glass, sidebarBasisForColumns } from '../io/ModuleShell';
import { ClearButton, DimensionStepper, HintBanner, SolveButton, ValidationList } from '../io/CalculatorChrome';
import { StepBar } from '../transporte/StepBar';
import {
  AssignmentError,
  blankAssignment,
  type AssignmentPreset,
  type AssignmentResult,
  type AssignmentSense,
  solveAssignment,
  validateAssignmentInput,
} from '../../core/AsignacionSolver';

const ACCENT = '#10b981';
const MAX_DIM = 10;

interface Props {
  title: string;
  mode: 'asignacion' | 'hungaro';
  presets: AssignmentPreset[];
  intro: string;
}

function resizeMatrix(
  agents: string[],
  tasks: string[],
  costs: number[][],
  nextM: number,
  nextN: number,
) {
  const m = Math.max(1, Math.min(MAX_DIM, nextM));
  const n = Math.max(1, Math.min(MAX_DIM, nextN));
  const nextAgents = Array.from({ length: m }, (_, i) => agents[i] ?? `A${i + 1}`);
  const nextTasks = Array.from({ length: n }, (_, j) => tasks[j] ?? `T${j + 1}`);
  const nextCosts = Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => (Number.isFinite(costs[i]?.[j]) ? costs[i][j] : 0)),
  );
  return { agents: nextAgents, tasks: nextTasks, costs: nextCosts };
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
  const [busy, setBusy] = useState(false);

  const draft = useMemo(() => ({ agents, tasks, costs, sense }), [agents, tasks, costs, sense]);
  const issues = useMemo(() => validateAssignmentInput(draft), [draft]);

  const clearSolution = () => {
    setResult(null);
    setError(null);
    setStepIdx(0);
  };

  /** Cualquier edición invalida la solución anterior (no se muestra como actual). */
  const touch = () => {
    setPresetId('');
    clearSolution();
  };

  const applySize = (m: number, n: number) => {
    const next = resizeMatrix(agents, tasks, costs, m, n);
    setAgents(next.agents);
    setTasks(next.tasks);
    setCosts(next.costs);
    touch();
  };

  const load = (id: string) => {
    const p = presets.find(item => item.id === id);
    if (!p) return;
    setAgents([...p.data.agents]);
    setTasks([...p.data.tasks]);
    setCosts(p.data.costs.map(r => [...r]));
    setSense(p.data.sense);
    setPresetId(id);
    clearSolution();
  };

  const startBlank = () => {
    const blank = blankAssignment(sense, 3, 3);
    setAgents(blank.agents);
    setTasks(blank.tasks);
    setCosts(blank.costs);
    setSense(blank.sense);
    setPresetId('');
    clearSolution();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) {
      setError(issues[0]);
      return;
    }
    setBusy(true);
    try {
      // microtask: permite pintar el estado "Calculando…"
      const r = solveAssignment(draft);
      setResult(r);
      setError(null);
      setStepIdx(0);
    } catch (err) {
      setResult(null);
      setError(err instanceof AssignmentError || err instanceof Error ? err.message : 'No se pudo resolver.');
    } finally {
      setBusy(false);
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
      sidebarBasisRem={sidebarBasisForColumns(tasks.length, 4.2, 18)}
      sidebar={(
        <>
          <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 min-w-0" style={glass}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-white">Datos</h2>
              <button
                type="button"
                onClick={startBlank}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' }}
                title="Matriz en blanco editable"
              >
                <FilePlus2 size={12} /> Personalizado
              </button>
            </div>

            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">Ejemplos (editables)</p>
            <div className="grid grid-cols-1 @[26rem]/sidebar:grid-cols-2 gap-1.5 mb-4">
              {presets.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => load(p.id)}
                  className="text-left px-3 py-2 rounded-xl min-w-0"
                  style={{
                    background: presetId === p.id ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                    border: presetId === p.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
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

            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">Objetivo</p>
            <div className="flex gap-2 mb-4">
              {(['min', 'max'] as AssignmentSense[]).map(s => (
                <button
                  key={s}
                  type="button"
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

            <div className="flex gap-6 mb-4">
              <DimensionStepper
                label="Agentes (filas)"
                value={agents.length}
                min={1}
                max={MAX_DIM}
                accent={ACCENT}
                onChange={m => applySize(m, tasks.length)}
              />
              <DimensionStepper
                label="Tareas (cols)"
                value={tasks.length}
                min={1}
                max={MAX_DIM}
                accent={ACCENT}
                onChange={n => applySize(agents.length, n)}
              />
            </div>

            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">Matriz de costos / beneficios</p>
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
            <p className="text-[10px] text-white/30 mt-2">
              Negativos permitidos. En maximización se transforma con M − c; Z se reporta sobre la matriz original.
            </p>
          </div>

          <SolveButton
            label={mode === 'hungaro' ? 'Ejecutar Kuhn–Munkres' : 'Resolver con mis datos'}
            disabled={issues.length > 0}
            busy={busy}
            accent={ACCENT}
            onClick={solve}
          />
          {result && <ClearButton onClick={clearSolution} />}
          <ValidationList issues={issues} error={error} />
          {!result && issues.length === 0 && (
            <HintBanner accent={ACCENT}>
              Edita la matriz o carga un ejemplo. Al cambiar cualquier celda se limpia la solución anterior.
            </HintBanner>
          )}
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
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-white/45 leading-relaxed">
              <strong className="text-white/70">Modo ejemplo:</strong> elige un preset y resuelve.
              {' '}<strong className="text-white/70">Modo personalizado:</strong> pulsa «Personalizado» o cambia dimensiones y celdas; el algoritmo usa siempre los datos actuales.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-4" style={glass}>
            <div className="text-xs font-bold uppercase tracking-wider text-white/35 mb-1">
              {result.sense === 'min' ? 'Costo mínimo total' : 'Beneficio máximo total'}
            </div>
            <div className="text-2xl font-black" style={{ color: ACCENT }}>
              Z = {result.total}
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              Calculado sobre la matriz original
              {result.transformMax != null ? ` (tras maximizar con M = ${result.transformMax})` : ''}.
              {result.addedRows || result.addedCols
                ? ` Balanceo: +${result.addedRows} fila(s) y +${result.addedCols} columna(s) ficticia(s).`
                : ''}
            </p>
            <ul className="mt-3 space-y-1">
              {result.pairs.filter(p => !p.fictional).map(p => (
                <li key={`${p.agent}-${p.task}`} className="text-sm text-white/75">
                  <span className="font-semibold text-white">{p.agent}</span>
                  {' → '}
                  <span className="font-semibold text-white">{p.task}</span>
                  {': '}{p.cost}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-white/35 mt-2">
              Asignación uno a uno: cada agente real y cada tarea real aparecen a lo sumo una vez.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2 px-1">
              Procedimiento paso a paso (traza real)
            </p>
            <StepBar
              count={result.steps.length}
              index={stepIdx}
              titles={result.steps.map(s => s.title)}
              label={step.title}
              title={step.title}
              accent={ACCENT}
              onChange={setStepIdx}
            />
          </div>

          <div className="rounded-2xl p-4" style={glass}>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">
              {step.matrix ? 'Estado de la matriz en este paso' : 'Matriz original'}
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
