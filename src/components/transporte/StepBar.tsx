import React from 'react';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';

interface Props {
  count: number;
  index: number;
  titles?: string[];
  label: string;
  title: string;
  trailing?: string;
  accent: string;
  onChange: (index: number) => void;
}

/** Controles de un recorrido paso a paso. Sirve para cualquier lista de pasos. */
export const StepBar: React.FC<Props> = ({ count, index, titles, label, title, trailing, accent, onChange }) => {
  const first = index <= 0;
  const last = index >= count - 1;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex gap-1.5 mb-3">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            title={titles?.[i]}
            className="h-2 rounded-full transition-all duration-300 flex-1 min-w-[8px]"
            style={{
              background: i <= index ? accent : 'rgba(255,255,255,0.1)',
              opacity: i === index ? 1 : 0.6,
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold" style={{ color: accent }}>
            {label} · {index + 1} / {count}
          </div>
          <h3 className="text-base font-extrabold text-white mt-0.5">{title}</h3>
        </div>
        {trailing && <div className="text-xs text-white/40 font-mono shrink-0">{trailing}</div>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => onChange(0)} disabled={first}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
          <SkipBack size={14} /> Inicio
        </button>
        <button onClick={() => onChange(Math.max(0, index - 1))} disabled={first}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
          <ChevronLeft size={14} /> Anterior
        </button>
        <button onClick={() => onChange(Math.min(count - 1, index + 1))} disabled={last}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
          style={{ background: accent, color: 'white' }}>
          Siguiente <ChevronRight size={14} />
        </button>
        <button onClick={() => onChange(count - 1)} disabled={last}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
          Final <SkipForward size={14} />
        </button>
      </div>
    </div>
  );
};
