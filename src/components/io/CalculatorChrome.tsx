import React from 'react';
import { Loader2, Play, RefreshCw } from 'lucide-react';

/** Lista de validaciones (patrón Transporte / Simplex). */
export const ValidationList: React.FC<{ issues: string[]; error?: string | null }> = ({ issues, error }) => {
  const items = [...(error ? [error] : []), ...issues].filter((v, i, a) => a.indexOf(v) === i);
  if (!items.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 space-y-1"
      style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.22)' }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-300/80">Revisa estos datos</p>
      <ul className="space-y-1">
        {items.slice(0, 6).map((msg, i) => (
          <li key={i} className="text-xs text-rose-100/85 leading-snug flex gap-1.5">
            <span className="text-rose-400 shrink-0">•</span>
            <span>{msg}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const DimensionStepper: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  accent?: string;
}> = ({ label, value, min = 1, max = 10, onChange, accent = '#10b981' }) => (
  <div>
    <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="w-8 h-8 rounded-lg text-white/70 font-bold disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        −
      </button>
      <span className="w-8 text-center text-white font-black" style={{ color: accent }}>{value}</span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg text-white/70 font-bold disabled:opacity-30"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        +
      </button>
    </div>
  </div>
);

export const SolveButton: React.FC<{
  label: string;
  disabled?: boolean;
  busy?: boolean;
  accent?: string;
  onClick: () => void;
}> = ({ label, disabled, busy, accent = '#10b981', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || busy}
    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black disabled:opacity-40"
    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: 'white' }}
  >
    {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
    {busy ? 'Calculando…' : label}
  </button>
);

export const ClearButton: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = 'Limpiar solución' }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
  >
    <RefreshCw size={13} /> {label}
  </button>
);

export const HintBanner: React.FC<{ children: React.ReactNode; accent?: string }> = ({ children, accent = '#10b981' }) => (
  <div
    className="rounded-xl px-3 py-2 text-[11px] leading-relaxed text-white/55"
    style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}
  >
    {children}
  </div>
);
