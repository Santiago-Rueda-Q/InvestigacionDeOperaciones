import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Play, RefreshCw, Sigma, Layers } from 'lucide-react';
import { SimplexProblem, Constraint, SimplexStep, OptimizationType } from '../types';
import { SimplexSolver } from '../core/SimplexSolver';
import { SimplexRevisadoSolver } from '../core/SimplexRevisadoSolver';
import { StepByStepViewer } from '../components/StepByStepViewer';
import { LatexRenderer } from '../components/LatexRenderer';

// ──────────────────────────────────────────────────────────────
// Helpers de UI (DRY)
// ──────────────────────────────────────────────────────────────

const inputClass =
  'bg-transparent border border-white/15 rounded-lg text-white text-center text-sm font-mono py-1.5 outline-none focus:border-indigo-400 transition-colors w-full';

const sectionTitle = (t: string) => (
  <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">{t}</p>
);

// ──────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────

type Method = 'simplex' | 'revisado';

export const SimplexPage: React.FC = () => {
  // ── Estado del problema ──────────────────────────────────────
  const [method, setMethod]     = useState<Method>('simplex');
  const [optType, setOptType]   = useState<OptimizationType>('MAX');
  const [numVars, setNumVars]   = useState(2);
  const [objective, setObjective] = useState<number[]>([3, 5]);
  const [constraints, setConstraints] = useState<Constraint[]>([
    { id: '1', coefficients: [1, 0], relation: '<=', rhs: 4  },
    { id: '2', coefficients: [0, 2], relation: '<=', rhs: 12 },
    { id: '3', coefficients: [3, 2], relation: '<=', rhs: 18 },
  ]);
  const [steps, setSteps]       = useState<SimplexStep[]>([]);

  const accent = method === 'simplex' ? '#6366f1' : '#10b981';

  // ── Handlers (SRP: cada uno hace una sola cosa) ──────────────
  const handleObjChange = (i: number, v: number) => {
    setObjective(prev => prev.map((c, idx) => (idx === i ? v : c)));
  };

  const handleCoeffChange = (id: string, i: number, v: number) => {
    setConstraints(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, coefficients: c.coefficients.map((cv, ci) => (ci === i ? v : cv)) }
          : c
      )
    );
  };

  const updateVarCount = (n: number) => {
    if (n < 2 || n > 8) return;
    setNumVars(n);
    setObjective(prev => {
      const a = [...prev];
      while (a.length < n) a.push(0);
      return a.slice(0, n);
    });
    setConstraints(prev =>
      prev.map(c => {
        const a = [...c.coefficients];
        while (a.length < n) a.push(0);
        return { ...c, coefficients: a.slice(0, n) };
      })
    );
  };

  const addConstraint = () => {
    setConstraints(prev => [
      ...prev,
      { id: Date.now().toString(), coefficients: new Array(numVars).fill(0), relation: '<=', rhs: 0 },
    ]);
  };

  const removeConstraint = (id: string) => {
    setConstraints(prev => prev.filter(c => c.id !== id));
  };

  const solve = () => {
    const problem: SimplexProblem = { type: optType, numVars, objectiveCoeffs: objective, constraints };
    const result =
      method === 'simplex'
        ? SimplexSolver.solve(problem)
        : SimplexRevisadoSolver.solve(problem);
    setSteps(result);
  };

  const reset = () => setSteps([]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #0d1020 45%, #0a0e1a 75%, #050810 100%)' }}
    >
      {/* ── Barra superior ── */}
      <header
        className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(6,8,16,0.7)', backdropFilter: 'blur(12px)' }}
      >
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={16} /> Panel Principal
        </Link>

        {/* Toggle de método */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['simplex', 'revisado'] as Method[]).map(m => (
            <button
              key={m}
              onClick={() => { setMethod(m); reset(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: method === m ? (m === 'simplex' ? '#6366f1' : '#10b981') : 'transparent',
                color: method === m ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            >
              {m === 'simplex' ? <Sigma size={13} /> : <Layers size={13} />}
              {m === 'simplex' ? 'Método Simplex' : 'Simplex Revisado'}
            </button>
          ))}
        </div>

        <div className="text-xs text-white/25 font-semibold">Unidad 1</div>
      </header>

      {/* ── Cuerpo principal ── */}
      <div className="flex-1 flex gap-5 px-5 py-5 min-h-0 overflow-hidden">

        {/* ════════════════════════════════════
            PANEL IZQUIERDO — Configuración
        ════════════════════════════════════ */}
        <aside
          className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${accent}40 transparent` }}
        >
          {/* Card configuración */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
                style={{ background: accent }}>
                Z
              </span>
              Configurar Problema
            </h2>

            {/* Tipo de optimización */}
            {sectionTitle('Objetivo')}
            <div className="flex gap-2 mb-4">
              {(['MAX', 'MIN'] as OptimizationType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setOptType(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: optType === t ? accent : 'rgba(255,255,255,0.05)',
                    color: optType === t ? 'white' : 'rgba(255,255,255,0.4)',
                    border: optType === t ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {t === 'MAX' ? 'Maximizar' : 'Minimizar'}
                </button>
              ))}
            </div>

            {/* Variables */}
            {sectionTitle('Variables (n)')}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => updateVarCount(numVars - 1)}
                className="w-8 h-8 rounded-lg text-white/60 hover:text-white font-bold text-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}>−</button>
              <span className="flex-1 text-center text-white font-black text-lg">{numVars}</span>
              <button onClick={() => updateVarCount(numVars + 1)}
                className="w-8 h-8 rounded-lg text-white/60 hover:text-white font-bold text-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}>+</button>
            </div>

            {/* Función objetivo */}
            {sectionTitle(`${optType} Z`)}
            <div className="flex flex-wrap gap-1.5 items-center mb-4 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-white/50 text-sm font-bold w-full mb-1">Z =</span>
              {objective.map((val, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" value={val}
                      onChange={e => handleObjChange(i, Number(e.target.value))}
                      className={inputClass}
                      style={{ width: '52px' }}
                    />
                    <span className="text-white/40 text-xs">x<sub>{i + 1}</sub></span>
                  </div>
                  {i < numVars - 1 && <span className="text-white/20 text-sm">+</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Restricciones */}
            <div className="flex justify-between items-center mb-2">
              {sectionTitle('Restricciones')}
              <button onClick={addConstraint}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-colors mb-2"
                style={{ background: `${accent}20`, color: accent }}>
                <Plus size={12} /> Añadir
              </button>
            </div>

            <div className="space-y-2">
              {constraints.map((c, ci) => (
                <div key={c.id}
                  className="p-2.5 rounded-xl space-y-1.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex flex-wrap gap-1 items-center">
                    {c.coefficients.map((val, i) => (
                      <React.Fragment key={i}>
                        <div className="flex items-center gap-0.5">
                          <input type="number" value={val}
                            onChange={e => handleCoeffChange(c.id, i, Number(e.target.value))}
                            className={inputClass} style={{ width: '44px' }} />
                          <span className="text-white/30 text-[10px]">x<sub>{i + 1}</sub></span>
                        </div>
                        {i < numVars - 1 && <span className="text-white/15 text-xs">+</span>}
                      </React.Fragment>
                    ))}
                    <span className="text-white/30 text-xs mx-1">≤</span>
                    <input type="number" value={c.rhs}
                      onChange={e => setConstraints(prev => prev.map(cc => cc.id === c.id ? { ...cc, rhs: Number(e.target.value) } : cc))}
                      className={inputClass} style={{ width: '48px' }} />
                    <button onClick={() => removeConstraint(c.id)} className="ml-auto text-red-400/50 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <button onClick={solve}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: 'white' }}>
            <Play size={16} /> Solucionar Paso a Paso
          </button>

          {steps.length > 0 && (
            <button onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={13} /> Limpiar Solución
            </button>
          )}
        </aside>

        {/* ════════════════════════════════════
            PANEL DERECHO — Solución
        ════════════════════════════════════ */}
        <main className="flex-1 min-h-0 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${accent}40 transparent` }}>

          {steps.length > 0 ? (
            <StepByStepViewer problem={{ type: optType, numVars, objectiveCoeffs: objective, constraints }} steps={steps} accentColor={accent} />
          ) : (
            /* Pantalla de bienvenida */
            <div className="h-full flex flex-col items-center justify-center text-center gap-6 p-8"
              style={{ background: 'rgba(8,10,20,0.5)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-white/10 text-7xl font-black select-none">
                {method === 'simplex' ? 'Σ' : 'B⁻¹'}
              </div>
              <div>
                <p className="text-white/50 font-bold text-lg mb-2">
                  {method === 'simplex' ? 'Método Simplex Estándar' : 'Método Simplex Revisado'}
                </p>
                <div className="text-white/20 text-sm mb-4">
                  <LatexRenderer block math={
                    method === 'simplex'
                      ? '\\text{Max } Z = c^T x \\quad \\text{s.a.} \\quad Ax \\leq b,\\; x \\geq 0'
                      : '\\bar{c}_j = c_j - c_B^T B^{-1} a_j'
                  } />
                </div>
                <p className="text-white/25 text-xs">
                  Configura el problema en el panel izquierdo y presiona{' '}
                  <strong className="text-white/40">Solucionar</strong>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
