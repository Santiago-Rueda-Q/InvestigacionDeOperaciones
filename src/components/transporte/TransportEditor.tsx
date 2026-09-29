import React from 'react';
import { Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { PRESETS, formatQty, totals, type TransportInput } from '../../core/TransporteSolver';
import { ACCENT, glassCard, inputClass, readNumber, shownNumber } from './shared';

const MAX_LINES = 10;

interface Props {
  draft: TransportInput;
  activePreset: string;
  issues: string[];
  error: string | null;
  hasResult: boolean;
  onChange: (next: TransportInput) => void;
  onPreset: (id: string) => void;
  onSolve: () => void;
  onClear: () => void;
}

const Label: React.FC<{ children: string }> = ({ children }) => (
  <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">{children}</p>
);

export const TransportEditor: React.FC<Props> = ({
  draft, activePreset, issues, error, hasResult, onChange, onPreset, onSolve, onClear,
}) => {
  const { origins, destinations, costs, supply, demand } = draft;
  const balance = totals(supply, demand);

  const rename = (kind: 'origins' | 'destinations', index: number, value: string) => {
    onChange({
      ...draft,
      [kind]: draft[kind].map((item, i) => (i === index ? value : item)),
    });
  };

  const setSupply = (index: number, value: number) => {
    onChange({ ...draft, supply: supply.map((item, i) => (i === index ? value : item)) });
  };

  const setDemand = (index: number, value: number) => {
    onChange({ ...draft, demand: demand.map((item, i) => (i === index ? value : item)) });
  };

  const setCost = (i: number, j: number, value: number) => {
    onChange({
      ...draft,
      costs: costs.map((row, ri) => (ri === i ? row.map((cell, cj) => (cj === j ? value : cell)) : row)),
    });
  };

  const addOrigin = () => {
    if (origins.length >= MAX_LINES) return;
    onChange({
      ...draft,
      origins: [...origins, `O${origins.length + 1}`],
      supply: [...supply, 0],
      costs: [...costs, destinations.map(() => 0)],
    });
  };

  const removeOrigin = (index: number) => {
    if (origins.length <= 1) return;
    onChange({
      ...draft,
      origins: origins.filter((_, i) => i !== index),
      supply: supply.filter((_, i) => i !== index),
      costs: costs.filter((_, i) => i !== index),
    });
  };

  const addDestination = () => {
    if (destinations.length >= MAX_LINES) return;
    onChange({
      ...draft,
      destinations: [...destinations, `D${destinations.length + 1}`],
      demand: [...demand, 0],
      costs: costs.map(row => [...row, 0]),
    });
  };

  const removeDestination = (index: number) => {
    if (destinations.length <= 1) return;
    onChange({
      ...draft,
      destinations: destinations.filter((_, j) => j !== index),
      demand: demand.filter((_, j) => j !== index),
      costs: costs.map(row => row.filter((_, j) => j !== index)),
    });
  };

  return (
    <>
      <div className="rounded-2xl p-5" style={glassCard}>
        <h2 className="text-base font-extrabold text-white mb-4">Configurar tabla</h2>

        <Label>Ejemplos</Label>
        <div className="flex flex-col gap-1.5 mb-4">
          {PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onPreset(preset.id)}
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
          <Label>Orígenes</Label>
          <button
            onClick={addOrigin}
            disabled={origins.length >= MAX_LINES}
            className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg mb-2 disabled:opacity-30"
            style={{ background: `${ACCENT}20`, color: ACCENT }}
          >
            <Plus size={12} /> Añadir
          </button>
        </div>
        <div className="space-y-2 mb-4">
          {origins.map((name, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={name} onChange={e => rename('origins', i, e.target.value)} className={inputClass} />
              <input
                type="number"
                min={0}
                value={shownNumber(supply[i])}
                onChange={e => setSupply(i, readNumber(e.target.value))}
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
          <Label>Destinos</Label>
          <button
            onClick={addDestination}
            disabled={destinations.length >= MAX_LINES}
            className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg mb-2 disabled:opacity-30"
            style={{ background: `${ACCENT}20`, color: ACCENT }}
          >
            <Plus size={12} /> Añadir
          </button>
        </div>
        <div className="space-y-2 mb-4">
          {destinations.map((name, j) => (
            <div key={j} className="flex items-center gap-1.5">
              <input value={name} onChange={e => rename('destinations', j, e.target.value)} className={inputClass} />
              <input
                type="number"
                min={0}
                value={shownNumber(demand[j])}
                onChange={e => setDemand(j, readNumber(e.target.value))}
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

        <Label>Costos unitarios</Label>
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
                        onChange={e => setCost(i, j, readNumber(e.target.value))}
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
            background: balance.gap === 0 && !balance.invalid ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.08)',
            color: balance.gap === 0 && !balance.invalid ? '#6ee7b7' : '#fcd34d',
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
        onClick={onSolve}
        disabled={issues.length > 0}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all shadow-lg disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: 'white' }}
      >
        <Play size={16} /> Resolver los tres métodos
      </button>

      {hasResult && (
        <button
          onClick={onClear}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <RefreshCw size={13} /> Limpiar solución
        </button>
      )}

      {(error || issues.length > 0) && (
        <p className="text-xs text-red-300 px-1">{error || issues[0]}</p>
      )}
    </>
  );
};
