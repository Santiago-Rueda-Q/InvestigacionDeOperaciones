import React, { useState } from 'react';
import { SimplexProblem, SimplexStep } from '../types';
import { LatexRenderer, TextWithMath } from './LatexRenderer';
import { ChevronLeft, ChevronRight, SkipForward, SkipBack, FileText, Table2 } from 'lucide-react';
import { SimplexGraph } from './SimplexGraph';

interface Props { problem: SimplexProblem; steps: SimplexStep[]; accentColor?: string; }

const PHASE_LABELS: Record<string, string> = {
  formulation:  'Enunciado',
  standard_form:'Forma Estándar',
  initial_bfs:  'BFS Inicial',
  tableau:      'Tableau',
};

const PHASE_ICONS: Record<string, React.ReactNode> = {
  formulation:   <FileText size={14} />,
  standard_form: <FileText size={14} />,
  initial_bfs:   <FileText size={14} />,
  tableau:       <Table2 size={14} />,
};

export const StepByStepViewer: React.FC<Props> = ({ problem, steps, accentColor = '#6366f1' }) => {
  const [idx, setIdx] = useState(0);

  if (!steps || steps.length === 0) return null;

  const step = steps[idx];
  const isLast = idx === steps.length - 1;
  const isFirst = idx === 0;
  const isPreTableau = step.phase !== 'tableau';
  const hasMatrix = step.matrix && step.matrix.length > 0;

  const progressPct = ((idx + 1) / steps.length) * 100;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Barra de progreso y navegación ── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Miniaturas de pasos */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              title={PHASE_LABELS[s.phase ?? 'tableau']}
              className="h-2 rounded-full transition-all duration-300 flex-1 min-w-[8px]"
              style={{
                background: i <= idx ? accentColor : 'rgba(255,255,255,0.1)',
                opacity: i === idx ? 1 : 0.6,
              }}
            />
          ))}
        </div>

        {/* Indicador de fase */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold"
            style={{ color: accentColor }}
          >
            {PHASE_ICONS[step.phase ?? 'tableau']}
            {PHASE_LABELS[step.phase ?? 'tableau']}
            {step.iteration >= 0 && ` — Iteración ${step.iteration}`}
          </div>
          <span className="text-xs text-white/30">{idx + 1} / {steps.length}</span>
        </div>

        {/* Botones de control */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => setIdx(0)} disabled={isFirst}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
          >
            <SkipBack size={14} /> Inicio
          </button>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={isFirst}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <button onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))} disabled={isLast}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30 transition-all"
            style={{ background: accentColor, color: 'white' }}
          >
            Siguiente <ChevronRight size={14} />
          </button>
          <button onClick={() => setIdx(steps.length - 1)} disabled={isLast}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
          >
            Final <SkipForward size={14} />
          </button>
        </div>
      </div>

      {/* ── Explicación tipo libro ── */}
      <div
        className="rounded-2xl p-5 overflow-y-auto"
        style={{
          background: 'rgba(8,10,20,0.88)',
          border: `1px solid ${accentColor}35`,
          minHeight: '140px',
          borderLeft: `3px solid ${accentColor}`,
        }}
      >
        {step.isOptimal && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs font-bold text-green-400"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            ✓ Solución Óptima Alcanzada
          </div>
        )}
        {step.isUnbounded && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs font-bold text-red-400"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            ⚠ Problema No Acotado
          </div>
        )}
        <TextWithMath text={step.explanationLatex} />
      </div>

      {/* ── Tabla del Tableau (solo si hay datos) ── */}
      {hasMatrix && !isPreTableau && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* ... table content remains below ... */}
          <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
            <Table2 size={14} style={{ color: accentColor }} />
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Tableau</span>
          </div>
          <div className="overflow-x-auto p-3">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-white/40 font-semibold border-r border-white/8 text-left">Base</th>
                  {step.headers.map((h, i) => (
                    <th key={i}
                      className="px-2 py-2 font-semibold"
                      style={{
                        color: step.enteringCol === i ? '#4ade80' : 'rgba(255,255,255,0.5)',
                        background: step.enteringCol === i ? 'rgba(74,222,128,0.06)' : 'transparent',
                      }}
                    >
                      <LatexRenderer math={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {step.matrix.map((row, ri) => {
                  const isPivotRow = step.leavingRow === ri;
                  const isZRow    = ri === step.matrix.length - 1;
                  return (
                    <tr key={ri}
                      style={{
                        background: isPivotRow
                          ? 'rgba(248,113,113,0.08)'
                          : isZRow
                            ? 'rgba(255,255,255,0.03)'
                            : 'transparent',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <td className="px-3 py-2 text-left border-r border-white/8 font-semibold"
                        style={{ color: isPivotRow ? '#f87171' : 'rgba(255,255,255,0.5)' }}
                      >
                        <LatexRenderer math={step.basis[ri]} />
                      </td>
                      {row.map((val, ci) => {
                        const isPivotEl = isPivotRow && step.enteringCol === ci;
                        const isPivotCol = step.enteringCol === ci && !isZRow;
                        return (
                          <td key={ci}
                            className="px-2 py-2 font-mono transition-all"
                            style={{
                              background: isPivotEl
                                ? accentColor
                                : isPivotCol
                                  ? 'rgba(74,222,128,0.06)'
                                  : isPivotRow
                                    ? 'rgba(248,113,113,0.04)'
                                    : 'transparent',
                              color: isPivotEl
                                ? 'white'
                                : isPivotCol
                                  ? '#4ade80'
                                  : isPivotRow
                                    ? '#f87171'
                                    : isZRow
                                      ? '#e2e8f0'
                                      : 'rgba(255,255,255,0.7)',
                              fontWeight: isPivotEl ? 800 : isZRow ? 600 : 400,
                              borderRadius: isPivotEl ? '6px' : 0,
                            }}
                          >
                            {Math.abs(val) < 1e-9 ? '0' : (Number.isInteger(val) ? val : val.toFixed(3))}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Leyenda */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-white/6 text-[10px] text-white/30">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Entra
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Sale
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: accentColor }} /> Pivote
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Gráfica 2D/3D (solo en paso óptimo) ── */}
      {step.isOptimal && (
        <SimplexGraph problem={problem} optimalStep={step} accentColor={accentColor} />
      )}
    </div>
  );
};
