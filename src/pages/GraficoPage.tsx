import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Plus, Trash2, DraftingCompass, AlertTriangle } from 'lucide-react';
import {
  GraficoInput,
  GraficoConstraint,
  GraficoResult,
  GRAFICO_PRESETS,
  blankGrafico,
  validateGraficoInput,
  solveGrafico,
} from '../core/GraficoSolver';
import { GeometrySolver } from '../core/GeometrySolver';
import { ModuleShell, glass, inputClass, sidebarBasisForColumns, sectionLabelClass, RELATION_OPTIONS } from '../components/io/ModuleShell';
import {
  SolveButton,
  ClearButton,
  ValidationList,
  HintBanner,
} from '../components/io/CalculatorChrome';
import { DarkSelect } from '../components/io/DarkSelect';
import { TextWithMath } from '../components/LatexRenderer';
import { OptimizationType } from '../types';

const ACCENT = '#6366f1';
const sectionTitle = (t: string) => <p className={sectionLabelClass}>{t}</p>;

// ── Gráfica ──────────────────────────────────────────────────────

const GraficoChart: React.FC<{ input: GraficoInput; result: GraficoResult }> = ({ input, result }) => {
  const problem = {
    type: input.type,
    numVars: 2,
    objectiveCoeffs: [input.c1, input.c2],
    constraints: input.constraints.map(c => ({
      id: c.id,
      coefficients: [c.a1, c.a2],
      relation: c.rel as '<=' | '>=' | '=',
      rhs: c.rhs,
    })),
  };

  const vertices = GeometrySolver.getFeasibleVertices2D(problem);
  if (!vertices.length) return null;

  const polygon = [...vertices, vertices[0]];
  const maxX = Math.max(...vertices.map(v => v.x), 1) * 1.4;
  const maxY = Math.max(...vertices.map(v => v.y), 1) * 1.4;
  const constraintColors = ['#f472b6', '#38bdf8', '#fbbf24', '#c084fc', '#4ade80'];

  const data: object[] = [
    {
      type: 'scatter',
      x: polygon.map(v => v.x),
      y: polygon.map(v => v.y),
      mode: 'lines+markers',
      fill: 'toself',
      fillcolor: `${ACCENT}22`,
      line: { color: `${ACCENT}99`, width: 2 },
      marker: { size: 5, color: ACCENT },
      name: 'Región Factible',
    } as object,
    ...input.constraints.map((c, idx) => {
      const color = constraintColors[idx % constraintColors.length];
      let xPts: number[], yPts: number[];
      if (Math.abs(c.a2) < 1e-9) {
        const x = Math.abs(c.a1) > 1e-9 ? c.rhs / c.a1 : 0;
        xPts = [x, x]; yPts = [0, maxY];
      } else if (Math.abs(c.a1) < 1e-9) {
        const y = c.rhs / c.a2;
        xPts = [0, maxX]; yPts = [y, y];
      } else {
        xPts = [0, Math.abs(c.a1) > 1e-9 ? c.rhs / c.a1 : maxX];
        yPts = [Math.abs(c.a2) > 1e-9 ? c.rhs / c.a2 : maxY, 0];
      }
      const relSym = c.rel === '<=' ? '≤' : c.rel === '>=' ? '≥' : '=';
      return {
        type: 'scatter', x: xPts, y: yPts, mode: 'lines',
        line: { color, width: 2, dash: 'dash' },
        name: `R${idx + 1}: ${c.a1}x₁+${c.a2}x₂${relSym}${c.rhs}`,
      } as object;
    }),
  ];

  if (result.optimal) {
    data.push({
      type: 'scatter',
      x: [result.optimal.x], y: [result.optimal.y],
      mode: 'markers+text',
      marker: { size: 14, color: ACCENT, line: { color: 'white', width: 2 }, symbol: 'star' },
      text: [`Z*=${result.optimal.z.toFixed(2)}`],
      textposition: 'top right',
      textfont: { color: 'white', size: 11 },
      name: `Óptimo (${result.optimal.x.toFixed(2)}, ${result.optimal.y.toFixed(2)})`,
    } as object);
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="text-xs font-bold text-white/50 mb-3 uppercase tracking-widest">Región Factible</p>
      <div className="w-full h-72 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <Plot
          data={data as Parameters<typeof Plot>[0]['data']}
          layout={{
            paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
            font: { color: 'rgba(255,255,255,0.6)', family: 'Inter, ui-sans-serif, system-ui, sans-serif', size: 10 },
            margin: { l: 36, r: 16, t: 16, b: 36 },
            showlegend: true,
            legend: { font: { size: 9 }, bgcolor: 'rgba(0,0,0,0.5)', bordercolor: 'rgba(255,255,255,0.1)', borderwidth: 1 },
            xaxis: { title: 'x₁', gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.2)', range: [-0.5, maxX] },
            yaxis: { title: 'x₂', gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.2)', range: [-0.5, maxY] },
          }}
          useResizeHandler style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );
};

// ── Tabla de vértices ─────────────────────────────────────────────

const VertexTable: React.FC<{ result: GraficoResult; type: OptimizationType; c1: number; c2: number }> = ({ result, type, c1, c2 }) => {
  if (!result.vertices.length) return null;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Evaluación en Vértices</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${ACCENT}25`, color: ACCENT }}>
          {type === 'MAX' ? 'MAX Z' : 'MIN Z'}
        </span>
      </div>
      <div className="overflow-x-auto p-3">
        <table className="w-full text-center text-xs border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 text-white/40 font-semibold text-left">Vértice</th>
              <th className="px-2 py-2 text-white/40 font-semibold">x₁</th>
              <th className="px-2 py-2 text-white/40 font-semibold">x₂</th>
              <th className="px-2 py-2 text-white/40 font-semibold">Z = {c1}x₁ + {c2}x₂</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {result.vertices.map((v, i) => (
              <tr key={i} style={{ background: v.isOptimal ? `${ACCENT}18` : 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <td className="px-3 py-2 text-left font-semibold" style={{ color: v.isOptimal ? ACCENT : 'rgba(255,255,255,0.6)' }}>
                  {v.label}
                </td>
                <td className="px-2 py-2 font-mono text-white/70">{v.x.toFixed(3)}</td>
                <td className="px-2 py-2 font-mono text-white/70">{v.y.toFixed(3)}</td>
                <td className="px-2 py-2 font-mono font-bold" style={{ color: v.isOptimal ? ACCENT : 'rgba(255,255,255,0.8)' }}>
                  {v.z.toFixed(4)}
                </td>
                <td className="px-2 py-2">
                  {v.isOptimal && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${ACCENT}30`, color: ACCENT }}>
                      ★ ÓPTIMO
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────

const PRESET_NAMES = ['Clásico MAX', 'Producción', 'Dieta MIN'];

export const GraficoPage: React.FC = () => {
  const [presetIdx, setPresetIdx] = useState(0);
  const [input, setInput] = useState<GraficoInput>(() => structuredClone(GRAFICO_PRESETS[0]));
  const [result, setResult] = useState<GraficoResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const sidebarBasisRem = useMemo(
    () => sidebarBasisForColumns(2, 3.2, 20) + Math.min(3, input.constraints.length * 0.3),
    [input.constraints.length]
  );

  const touch = () => { setResult(null); setDirty(true); setErrors([]); setStepIdx(0); };

  const updConstraint = (id: string, field: keyof GraficoConstraint, value: unknown) => {
    setInput(p => ({ ...p, constraints: p.constraints.map(c => c.id === id ? { ...c, [field]: value } : c) }));
    touch();
  };

  const handlePreset = (idx: number) => {
    setPresetIdx(idx);
    setInput(structuredClone(GRAFICO_PRESETS[idx]));
    setResult(null); setDirty(false); setErrors([]); setStepIdx(0);
  };

  const handleSolve = () => {
    const errs = validateGraficoInput(input);
    if (errs.length) { setErrors(errs); return; }
    setBusy(true); setErrors([]);
    try {
      setResult(solveGrafico(input));
      setStepIdx(0); setDirty(false);
    } finally { setBusy(false); }
  };

  const handleClear = () => { setResult(null); setDirty(false); setErrors([]); setStepIdx(0); };

  const sidebar = (
    <>
      <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 min-w-0" style={glass}>
        <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: ACCENT }}>
            G
          </span>
          Configurar Problema
        </h2>

        {sectionTitle('Ejemplos')}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRESET_NAMES.map((name, i) => (
            <button key={i} type="button" onClick={() => handlePreset(i)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
              style={{
                background: presetIdx === i && !dirty ? `${ACCENT}25` : 'rgba(255,255,255,0.05)',
                color: presetIdx === i && !dirty ? ACCENT : 'rgba(255,255,255,0.4)',
                border: presetIdx === i && !dirty ? `1px solid ${ACCENT}50` : '1px solid rgba(255,255,255,0.08)',
              }}
            >{name}</button>
          ))}
          <button type="button"
            onClick={() => { setInput(blankGrafico()); touch(); }}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
          >En blanco</button>
        </div>

        {sectionTitle('Objetivo')}
        <div className="flex gap-2 mb-4">
          {(['MAX', 'MIN'] as OptimizationType[]).map(t => (
            <button key={t} type="button" onClick={() => { setInput(p => ({ ...p, type: t })); touch(); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: input.type === t ? ACCENT : 'rgba(255,255,255,0.05)',
                color: input.type === t ? 'white' : 'rgba(255,255,255,0.4)',
                border: input.type === t ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.08)',
              }}
            >{t === 'MAX' ? 'Maximizar' : 'Minimizar'}</button>
          ))}
        </div>

        {sectionTitle('FO:  Z = c₁x₁ + c₂x₂')}
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-white/40 text-xs">Z =</span>
          <input type="number" value={input.c1}
            onChange={e => { setInput(p => ({ ...p, c1: Number(e.target.value) })); touch(); }}
            className={inputClass} style={{ width: '52px' }} />
          <span className="text-white/30 text-xs">x₁ +</span>
          <input type="number" value={input.c2}
            onChange={e => { setInput(p => ({ ...p, c2: Number(e.target.value) })); touch(); }}
            className={inputClass} style={{ width: '52px' }} />
          <span className="text-white/30 text-xs">x₂</span>
        </div>

        <div className="flex justify-between items-center mb-2">
          {sectionTitle('Restricciones')}
          <button type="button"
            onClick={() => { setInput(p => ({ ...p, constraints: [...p.constraints, { id: Date.now().toString(), a1: 1, a2: 1, rel: '<=', rhs: 10 }] })); touch(); }}
            className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-colors mb-2"
            style={{ background: `${ACCENT}20`, color: ACCENT }}
          ><Plus size={12} /> Añadir</button>
        </div>

        <div className="space-y-2">
          {input.constraints.map(c => (
            <div key={c.id} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-1 flex-wrap">
                <input type="number" value={c.a1} onChange={e => updConstraint(c.id, 'a1', Number(e.target.value))} className={inputClass} style={{ width: '44px' }} />
                <span className="text-white/30 text-[10px]">x₁ +</span>
                <input type="number" value={c.a2} onChange={e => updConstraint(c.id, 'a2', Number(e.target.value))} className={inputClass} style={{ width: '44px' }} />
                <span className="text-white/30 text-[10px]">x₂</span>
                <DarkSelect
                  className="w-14 shrink-0"
                  value={c.rel}
                  options={[...RELATION_OPTIONS]}
                  accent={ACCENT}
                  aria-label="Relación"
                  onChange={v => updConstraint(c.id, 'rel', v)}
                />
                <input type="number" value={c.rhs} onChange={e => updConstraint(c.id, 'rhs', Number(e.target.value))} className={inputClass} style={{ width: '48px' }} />
                <button type="button"
                  onClick={() => { if (input.constraints.length > 1) { setInput(p => ({ ...p, constraints: p.constraints.filter(cc => cc.id !== c.id) })); touch(); } }}
                  className="ml-auto text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ValidationList issues={errors} />
      <HintBanner accent={ACCENT}>
        Solo para <strong>2 variables</strong>. El método evalúa Z en cada vértice del polígono factible y elige el óptimo.
      </HintBanner>
      <SolveButton label="Resolver Gráficamente" busy={busy} accent={ACCENT} onClick={handleSolve} />
      {result && <ClearButton onClick={handleClear} label="Limpiar solución" />}
    </>
  );

  const mainArea = result ? (
    <div className="flex flex-col gap-4">
      <GraficoChart input={input} result={result} />
      <VertexTable result={result} type={input.type} c1={input.c1} c2={input.c2} />
      {result.steps.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {result.steps.map((s, i) => (
              <button key={i} onClick={() => setStepIdx(i)}
                className="px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-all"
                style={{
                  background: stepIdx === i ? `${ACCENT}20` : 'transparent',
                  color: stepIdx === i ? ACCENT : 'rgba(255,255,255,0.35)',
                  borderBottom: stepIdx === i ? `2px solid ${ACCENT}` : '2px solid transparent',
                }}
              >{s.title}</button>
            ))}
          </div>
          <div className="p-5">
            <TextWithMath text={result.steps[stepIdx].content} />
          </div>
        </div>
      )}
      {result.infeasible && (
        <HintBanner accent="#f43f5e">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle size={13} className="shrink-0" />
            La región factible está vacía. Revisa que las restricciones sean compatibles.
          </span>
        </HintBanner>
      )}
    </div>
  ) : (
    <div className="h-full min-h-[16rem] flex flex-col items-center justify-center text-center gap-6 p-8"
      style={{ background: 'rgba(8,10,20,0.5)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <DraftingCompass size={56} className="text-white/15" strokeWidth={1.25} aria-hidden />
      <div>
        <p className="text-white/50 font-bold text-lg mb-2">Método Gráfico — 2 Variables</p>
        <p className="text-white/25 text-sm">
          Configura el problema en el panel y presiona <strong className="text-white/40">Resolver Gráficamente</strong>.
        </p>
      </div>
      <ValidationList issues={errors} />
    </div>
  );

  return (
    <ModuleShell title="Método Gráfico" unit="Unidad 1" accent={ACCENT} sidebarBasisRem={sidebarBasisRem} sidebar={sidebar}>
      {mainArea}
    </ModuleShell>
  );
};
