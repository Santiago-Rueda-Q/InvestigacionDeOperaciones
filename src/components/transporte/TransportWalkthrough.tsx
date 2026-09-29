import React from 'react';
import { TextWithMath } from '../LatexRenderer';
import { formatQty, type MethodId, type SolvedTransport } from '../../core/TransporteSolver';
import { ACCENT, glassCard } from './shared';
import { StepBar } from './StepBar';
import { TransportComparison } from './TransportComparison';
import { TransportGrid } from './TransportGrid';

interface Props {
  result: SolvedTransport;
  methodId: MethodId;
  stepIdx: number;
  onMethod: (id: MethodId) => void;
  onStep: (index: number) => void;
}

export const TransportWalkthrough: React.FC<Props> = ({ result, methodId, stepIdx, onMethod, onStep }) => {
  const method = result.methods.find(item => item.id === methodId) ?? result.methods[0];
  const step = method.steps[stepIdx];
  if (!step) return null;

  const bestCost = Math.min(...result.methods.map(item => item.totalCost));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {result.methods.map(item => {
          const selected = item.id === method.id;
          const cheapest = Math.abs(item.totalCost - bestCost) < 1e-6;
          return (
            <button
              key={item.id}
              onClick={() => onMethod(item.id)}
              className="rounded-2xl px-3 py-3 text-left transition-all"
              style={{
                background: selected ? `${ACCENT}22` : 'rgba(8,10,20,0.88)',
                border: selected ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">{item.english}</div>
              <div className="text-sm font-extrabold text-white mt-0.5">{item.title}</div>
              <div className="text-lg font-black mt-1" style={{ color: cheapest ? ACCENT : 'rgba(255,255,255,0.75)' }}>
                Z = {formatQty(item.totalCost)}
              </div>
              {cheapest && <div className="text-[10px] font-bold text-emerald-300/80">Mejor arranque, no necesariamente el óptimo</div>}
              <div className="text-[10px] text-white/35 mt-1">{item.iterations} asignaciones</div>
            </button>
          );
        })}
      </div>

      <StepBar
        count={method.steps.length}
        index={stepIdx}
        titles={method.steps.map(item => item.phaseLabel)}
        label={step.phaseLabel}
        title={step.title}
        trailing={`Costo acum. ${formatQty(step.runningCost)}`}
        accent={ACCENT}
        onChange={onStep}
      />

      <div className="rounded-2xl p-4" style={glassCard}>
        <TransportGrid grid={step.grid} />
        <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-white/35">
          <span>La celda resaltada es la que se elige en este paso.</span>
          <span>0 ε es un cero básico: entra en la base y no mueve carga.</span>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ ...glassCard, border: `1px solid ${ACCENT}35`, borderLeft: `3px solid ${ACCENT}` }}>
        <TextWithMath text={step.body} />
      </div>

      {step.phase === 'resultado' && <TransportComparison methods={result.methods} />}
    </div>
  );
};
