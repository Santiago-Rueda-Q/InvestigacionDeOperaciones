import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Play, Plus, RefreshCw,
  SkipBack, SkipForward, Trash2,
} from 'lucide-react';
import { TextWithMath } from '../components/LatexRenderer';
import {
  METHOD_INFO,
  PRESETS,
  TransportError,
  formatQty,
  solveAll,
  totals,
  type GridSnapshot,
  type MethodId,
  type SolvedTransport,
  type TransportInput,
} from '../core/TransporteSolver';

const ACCENT = '#10b981';
const METHODS: MethodId[] = ['noroeste', 'minimo', 'vogel'];

const inputClass =
  'bg-transparent border border-white/15 rounded-lg text-white text-center text-sm font-mono py-1.5 outline-none focus:border-emerald-400 transition-colors w-full';

const sectionTitle = (t: string) => (
  <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">{t}</p>
);

function readNumber(raw: string): number {
  if (raw.trim() === '') return Number.NaN;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function shownNumber(value: number | undefined): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}

function clonePreset(data: TransportInput): TransportInput {
  return {
    origins: [...data.origins],
    destinations: [...data.destinations],
    supply: [...data.supply],
    demand: [...data.demand],
    costs: data.costs.map(row => [...row]),
  };
}

const TransportGrid: React.FC<{ grid: GridSnapshot }> = ({ grid }) => {
  const showPenalties = grid.penalties !== null;

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-24" />
            {grid.destinations.map((name, j) => {
              const picked = grid.penaltyPick?.kind === 'col' && grid.penaltyPick.index === j;
              return (
                <th
                  key={name + j}
                  className="px-2 py-2 rounded-lg font-bold text-white/80 min-w-[72px]"
                  style={{
                    background: picked ? `${ACCENT}33` : 'rgba(255,255,255,0.04)',
                    outline: picked ? `1px solid ${ACCENT}` : 'none',
                  }}
                >
                  <div>{name}</div>
                  {showPenalties && (
                    <div className="mt-1 font-mono text-[10px] text-emerald-300/80">
                      P {grid.penalties?.cols[j] == null ? '—' : formatQty(grid.penalties!.cols[j]!)}
                    </div>
                  )}
                </th>
              );
            })}
            <th className="px-2 py-2 rounded-lg font-bold text-white/50 min-w-[72px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
              Oferta
            </th>
          </tr>
        </thead>
        <tbody>
          {grid.origins.map((origin, i) => {
            const rowPicked = grid.penaltyPick?.kind === 'row' && grid.penaltyPick.index === i;
            return (
              <tr key={origin + i}>
                <th
                  className="px-2 py-2 rounded-lg text-left font-bold text-white/80"
                  style={{
                    background: rowPicked ? `${ACCENT}33` : 'rgba(255,255,255,0.04)',
                    outline: rowPicked ? `1px solid ${ACCENT}` : 'none',
                  }}
                >
                  <div>{origin}</div>
                  {showPenalties && (
                    <div className="mt-1 font-mono text-[10px] text-emerald-300/80">
                      P {grid.penalties?.rows[i] == null ? '—' : formatQty(grid.penalties!.rows[i]!)}
                    </div>
                  )}
                </th>
                {grid.destinations.map((_, j) => {
                  const qty = grid.alloc[i][j];
                  const focused = grid.focus?.i === i && grid.focus?.j === j;
                  const closed = grid.showClosure && qty === null && (grid.supplyLeft[i] === 0 || grid.demandLeft[j] === 0);
                  const epsilon = grid.epsilon[i][j];
                  return (
                    <td
                      key={j}
                      className="px-2 py-2 rounded-lg text-center align-middle"
                      style={{
                        background: focused ? `${ACCENT}28` : qty !== null ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                        outline: focused ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.05)',
                        opacity: closed ? 0.35 : 1,
                      }}
                    >
                      <div className="text-[10px] text-white/35 font-mono">c {formatQty(grid.costs[i][j])}</div>
                      {qty !== null && (
                        <div className="mt-0.5 font-black text-sm text-white">
                          {epsilon ? '0 ε' : formatQty(qty)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 rounded-lg text-center font-mono text-white/70" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {grid.showClosure
                    ? `${formatQty(grid.supplyLeft[i])} / ${formatQty(grid.supplyGiven[i])}`
                    : formatQty(grid.supplyGiven[i])}
                </td>
              </tr>
            );
          })}
          <tr>
            <th className="px-2 py-2 rounded-lg text-left font-bold text-white/50" style={{ background: 'rgba(255,255,255,0.03)' }}>
              Demanda
            </th>
            {grid.destinations.map((_, j) => (
              <td key={j} className="px-2 py-2 rounded-lg text-center font-mono text-white/70" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {grid.showClosure
                  ? `${formatQty(grid.demandLeft[j])} / ${formatQty(grid.demandGiven[j])}`
                  : formatQty(grid.demandGiven[j])}
              </td>
            ))}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export const TransportePage: React.FC = () => {
  const initial = clonePreset(PRESETS[1].data);
  const [origins, setOrigins] = useState(initial.origins);
  const [destinations, setDestinations] = useState(initial.destinations);
  const [costs, setCosts] = useState(initial.costs);
  const [supply, setSupply] = useState(initial.supply);
  const [demand, setDemand] = useState(initial.demand);
  const [activePreset, setActivePreset] = useState(PRESETS[1].id);
  const [result, setResult] = useState<SolvedTransport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<MethodId>('noroeste');
  const [stepIdx, setStepIdx] = useState(0);

  const balance = useMemo(() => totals(supply, demand), [supply, demand]);
  const issues = useMemo(() => {
    const list: string[] = [];
    if (origins.some(name => !name.trim())) list.push('Cada origen necesita un nombre.');
    if (destinations.some(name => !name.trim())) list.push('Cada destino necesita un nombre.');
    if (supply.some(value => !Number.isFinite(value))) list.push('Hay una oferta vacía.');
    if (demand.some(value => !Number.isFinite(value))) list.push('Hay una demanda vacía.');
    if (costs.some(row => row.some(value => !Number.isFinite(value)))) list.push('Hay un costo vacío.');
    if (supply.some(value => value < 0)) list.push('La oferta no puede ser negativa.');
    if (demand.some(value => value < 0)) list.push('La demanda no puede ser negativa.');
    if (costs.some(row => row.some(value => value < 0))) list.push('Los costos tienen que ser mayores o iguales que cero.');
    return list;
  }, [origins, destinations, supply, demand, costs]);

  const clearSolution = () => {
    setResult(null);
    setError(null);
    setStepIdx(0);
  };

  const loadPreset = (id: string) => {
    const preset = PRESETS.find(p => p.id === id);
    if (!preset) return;
    const data = clonePreset(preset.data);
    setOrigins(data.origins);
    setDestinations(data.destinations);
    setCosts(data.costs);
    setSupply(data.supply);
    setDemand(data.demand);
    setActivePreset(id);
    clearSolution();
  };

  const addOrigin = () => {
    if (origins.length >= 10) return;
    setOrigins(prev => [...prev, `O${prev.length + 1}`]);
    setSupply(prev => [...prev, 0]);
    setCosts(prev => [...prev, destinations.map(() => 0)]);
    setActivePreset('');
    clearSolution();
  };

  const removeOrigin = (index: number) => {
    if (origins.length <= 1) return;
    setOrigins(prev => prev.filter((_, i) => i !== index));
    setSupply(prev => prev.filter((_, i) => i !== index));
    setCosts(prev => prev.filter((_, i) => i !== index));
    setActivePreset('');
    clearSolution();
  };

  const addDestination = () => {
    if (destinations.length >= 10) return;
    setDestinations(prev => [...prev, `D${prev.length + 1}`]);
    setDemand(prev => [...prev, 0]);
    setCosts(prev => prev.map(row => [...row, 0]));
    setActivePreset('');
    clearSolution();
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 1) return;
    setDestinations(prev => prev.filter((_, j) => j !== index));
    setDemand(prev => prev.filter((_, j) => j !== index));
    setCosts(prev => prev.map(row => row.filter((_, j) => j !== index)));
    setActivePreset('');
    clearSolution();
  };

  const solve = () => {
    if (issues.length) {
      setError(issues[0]);
      setResult(null);
      return;
    }
    try {
      const solved = solveAll({ origins, destinations, costs, supply, demand });
      setResult(solved);
      setError(null);
      setStepIdx(0);
    } catch (err) {
      setResult(null);
      setError(err instanceof TransportError || err instanceof Error ? err.message : 'No se pudo resolver el problema.');
    }
  };

  const method = result?.methods.find(m => m.id === methodId) ?? result?.methods[0];
  const steps = method?.steps ?? [];
  const step = steps[stepIdx];
  const bestCost = result ? Math.min(...result.methods.map(m => m.totalCost)) : null;

  return (
    <div
      className="min-h-screen lg:h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #0d1020 45%, #0a0e1a 75%, #050810 100%)' }}
    >
      <header
        className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(6,8,16,0.7)', backdropFilter: 'blur(12px)' }}
      >
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={16} /> Panel Principal
        </Link>
        <h1 className="text-sm font-extrabold text-white">Problema del Transporte</h1>
        <div className="text-xs text-white/25 font-semibold">Unidad 2</div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 px-4 md:px-5 py-5 lg:min-h-0 lg:overflow-hidden">
        <aside
          className="w-full lg:w-80 lg:shrink-0 flex flex-col gap-4 lg:overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}40 transparent` }}
        >
          <div className="rounded-2xl p-5" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-base font-extrabold text-white mb-4">Configurar tabla</h2>

            {sectionTitle('Ejemplos')}
            <div className="flex flex-col gap-1.5 mb-4">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset.id)}
                  className="text-left px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: activePreset === preset.id ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                    border: activePreset === preset.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="text-xs font-bold text-white">{preset.name}</div>
                  <div className="text-[11px] text-white/40 leading-snug">{preset.blurb}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mb-2">
              {sectionTitle('Orígenes')}
              <button
                onClick={addOrigin}
                disabled={origins.length >= 10}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg mb-2 disabled:opacity-30"
                style={{ background: `${ACCENT}20`, color: ACCENT }}
              >
                <Plus size={12} /> Añadir
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {origins.map((name, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={name}
                    onChange={e => {
                      const value = e.target.value;
                      setOrigins(prev => prev.map((item, idx) => (idx === i ? value : item)));
                      setActivePreset('');
                      clearSolution();
                    }}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    value={shownNumber(supply[i])}
                    onChange={e => {
                      const value = readNumber(e.target.value);
                      setSupply(prev => prev.map((item, idx) => (idx === i ? value : item)));
                      setActivePreset('');
                      clearSolution();
                    }}
                    className={inputClass}
                    title="Oferta"
                  />
                  <button
                    onClick={() => removeOrigin(i)}
                    disabled={origins.length <= 1}
                    className="text-red-400/50 hover:text-red-400 disabled:opacity-20"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mb-2">
              {sectionTitle('Destinos')}
              <button
                onClick={addDestination}
                disabled={destinations.length >= 10}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg mb-2 disabled:opacity-30"
                style={{ background: `${ACCENT}20`, color: ACCENT }}
              >
                <Plus size={12} /> Añadir
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {destinations.map((name, j) => (
                <div key={j} className="flex items-center gap-1.5">
                  <input
                    value={name}
                    onChange={e => {
                      const value = e.target.value;
                      setDestinations(prev => prev.map((item, idx) => (idx === j ? value : item)));
                      setActivePreset('');
                      clearSolution();
                    }}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    value={shownNumber(demand[j])}
                    onChange={e => {
                      const value = readNumber(e.target.value);
                      setDemand(prev => prev.map((item, idx) => (idx === j ? value : item)));
                      setActivePreset('');
                      clearSolution();
                    }}
                    className={inputClass}
                    title="Demanda"
                  />
                  <button
                    onClick={() => removeDestination(j)}
                    disabled={destinations.length <= 1}
                    className="text-red-400/50 hover:text-red-400 disabled:opacity-20"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {sectionTitle('Costos unitarios')}
            <div className="overflow-x-auto custom-scrollbar mb-4">
              <table className="border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th />
                    {destinations.map((name, j) => (
                      <th key={j} className="text-[10px] text-white/35 font-bold px-1">{name || `D${j + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {origins.map((name, i) => (
                    <tr key={i}>
                      <th className="text-[10px] text-white/35 font-bold pr-1 text-left">{name || `O${i + 1}`}</th>
                      {destinations.map((_, j) => (
                        <td key={j}>
                          <input
                            type="number"
                            min={0}
                            value={shownNumber(costs[i]?.[j])}
                            onChange={e => {
                              const value = readNumber(e.target.value);
                              setCosts(prev => prev.map((row, ri) => (
                                ri === i ? row.map((cell, cj) => (cj === j ? value : cell)) : row
                              )));
                              setActivePreset('');
                              clearSolution();
                            }}
                            className={inputClass}
                            style={{ width: '52px' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="rounded-xl px-3 py-2 text-[11px] leading-relaxed"
              style={{
                background: balance.gap === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.08)',
                color: balance.gap === 0 ? '#6ee7b7' : '#fcd34d',
              }}
            >
              {balance.invalid
                ? 'Completa oferta y demanda con números.'
                : `Oferta ${formatQty(balance.supplyTotal)} · Demanda ${formatQty(balance.demandTotal)}${
                  balance.gap === 0
                    ? '. La tabla ya está equilibrada: se reparte todo y no sobra nada.'
                    : `. No está equilibrada. Al resolver se agrega un ${balance.gap > 0 ? 'destino' : 'origen'} ficticio de ${formatQty(Math.abs(balance.gap))} unidades con costo 0.`
                }`}
            </div>
          </div>

          <button
            onClick={solve}
            disabled={issues.length > 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all shadow-lg disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: 'white' }}
          >
            <Play size={16} /> Resolver los tres métodos
          </button>

          {result && (
            <button
              onClick={clearSolution}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw size={13} /> Limpiar solución
            </button>
          )}

          {(error || issues.length > 0) && (
            <p className="text-xs text-red-300 px-1">{error || issues[0]}</p>
          )}
        </aside>

        <main
          className="flex-1 lg:min-h-0 lg:overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}40 transparent` }}
        >
          {result && method && step ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {result.methods.map(item => {
                  const selected = item.id === method.id;
                  const cheapest = bestCost !== null && Math.abs(item.totalCost - bestCost) < 1e-6;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setMethodId(item.id); setStepIdx(0); }}
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

              <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1.5 mb-3">
                  {steps.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => setStepIdx(i)}
                      title={item.phaseLabel}
                      className="h-2 rounded-full transition-all duration-300 flex-1 min-w-[8px]"
                      style={{
                        background: i <= stepIdx ? ACCENT : 'rgba(255,255,255,0.1)',
                        opacity: i === stepIdx ? 1 : 0.6,
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold" style={{ color: ACCENT }}>
                      {step.phaseLabel} · {stepIdx + 1} / {steps.length}
                    </div>
                    <h3 className="text-base font-extrabold text-white mt-0.5">{step.title}</h3>
                  </div>
                  <div className="text-xs text-white/40 font-mono shrink-0">Costo acum. {formatQty(step.runningCost)}</div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => setStepIdx(0)} disabled={stepIdx === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                    <SkipBack size={14} /> Inicio
                  </button>
                  <button onClick={() => setStepIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <button onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))} disabled={stepIdx === steps.length - 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                    style={{ background: ACCENT, color: 'white' }}>
                    Siguiente <ChevronRight size={14} />
                  </button>
                  <button onClick={() => setStepIdx(steps.length - 1)} disabled={stepIdx === steps.length - 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
                    Final <SkipForward size={14} />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <TransportGrid grid={step.grid} />
                <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-white/35">
                  <span>La celda resaltada es la que se elige en este paso.</span>
                  <span>0 ε es un cero básico: entra en la base y no mueve carga.</span>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'rgba(8,10,20,0.88)', border: `1px solid ${ACCENT}35`, borderLeft: `3px solid ${ACCENT}` }}>
                <TextWithMath text={step.body} />
              </div>

              {step.phase === 'resultado' && (
                <div className="rounded-2xl p-5" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-base font-extrabold text-white mb-1">Comparación de los tres arranques</h3>
                  <p className="text-sm text-white/45 mb-4 leading-relaxed">
                    Los tres planes cumplen oferta y demanda. El de menor costo es el mejor arranque de esta tabla.
                    Ninguno certifica el óptimo: para eso haría falta un método de mejora, como MODI o stepping-stone.
                  </p>
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    {result.methods.map(item => {
                      const finalGrid = item.steps[item.steps.length - 1]?.grid;
                      const pieces = item.shipments
                        .filter(s => s.quantity > 0)
                        .map(s => `(${formatQty(s.quantity)} \\times ${formatQty(s.unit)})`);
                      return (
                        <div key={item.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-sm font-extrabold text-white">{item.title}</p>
                          <p className="text-[11px] text-white/40 mb-2">
                            {item.iterations} asignaciones
                            {item.degenerate ? ' · base completada con un cero' : ' · base sin degeneración'}
                          </p>
                          {finalGrid && <TransportGrid grid={finalGrid} />}
                          <div className="mt-2 text-white/80">
                            <TextWithMath text={`$$Z = ${pieces.join(' + ') || '0'} = ${formatQty(item.totalCost)}$$`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-6">
              <div className="rounded-2xl p-6" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: ACCENT }}>Unidad 2 · Modelos de redes</p>
                <h2 className="text-2xl font-extrabold text-white mb-2">Qué vas a resolver</h2>
                <p className="text-sm text-white/50 leading-relaxed max-w-3xl">
                  El problema del transporte reparte la oferta de cada origen hasta cubrir la demanda de cada destino, gastando lo menos posible.
                  Configura la tabla a la izquierda y recorre cada método paso a paso.
                </p>
                <div className="mt-4 text-white/80">
                  <TextWithMath text={'$$\\min Z = \\sum_{i} \\sum_{j} c_{ij} x_{ij}$$'} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mt-2 text-sm text-white/60">
                  <p><span className="text-white font-semibold">Z</span> es el costo total.</p>
                  <p><span className="text-white font-semibold">cᵢⱼ</span> es el costo de una unidad del origen i al destino j.</p>
                  <p><span className="text-white font-semibold">xᵢⱼ</span> es cuántas unidades viajan por esa ruta.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {[
                  ['Origen', 'Quien envía. Cada origen es una fila y tiene una oferta aᵢ.'],
                  ['Destino', 'Quien recibe. Cada destino es una columna y tiene una demanda bⱼ.'],
                  ['Oferta', 'Lo máximo que puede salir de un origen. La fila no puede sumar más que eso.'],
                  ['Demanda', 'Lo que un destino necesita recibir. La columna tiene que cubrir al menos esa cantidad.'],
                  ['Costo unitario', 'Lo que cuesta mover una sola unidad. Es el número c de cada celda.'],
                  ['Asignación', 'El valor que se escribe en una celda: por ejemplo x₁₁ = 30 significa 30 unidades de O1 a D1.'],
                  ['Solución factible', 'Un plan sin cantidades negativas que cumple toda la oferta y toda la demanda.'],
                  ['Solución inicial', 'Un plan factible para arrancar. Los tres métodos llegan a uno. El óptimo puede ser más barato.'],
                  ['Tabla no equilibrada', 'Si oferta y demanda no suman lo mismo, se agrega un origen o un destino ficticio con costo 0.'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-extrabold text-white mb-1">{title}</p>
                    <p className="text-[12px] text-white/45 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-extrabold text-white mb-2">Restricciones, antes y después de equilibrar</h3>
                <div className="text-white/80">
                  <TextWithMath text={'Un origen no entrega más de lo que tiene:\n\n$$\\sum_{j} x_{ij} \\le a_i$$\n\nUn destino recibe al menos lo que pidió:\n\n$$\\sum_{i} x_{ij} \\ge b_j$$\n\nSi las sumas no coinciden, el ficticio convierte esas desigualdades en igualdades y los tres métodos ya pueden recorrer la tabla.'} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {METHODS.map(id => (
                  <div key={id} className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-xs font-black text-white">{METHOD_INFO[id].title}</p>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">{METHOD_INFO[id].english}</p>
                    <p className="text-[11px] text-white/40 leading-snug">{METHOD_INFO[id].blurb}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
