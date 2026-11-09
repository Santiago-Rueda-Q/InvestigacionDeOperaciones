import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  accent?: string;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/** Toggle de opciones mutuamente excluyentes (MAX/MIN, M/M/1, etc.). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  accent = '#818cf8',
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
}: Props<T>) {
  const pad = size === 'sm' ? 'py-1.5 px-2 text-[10px]' : 'py-2 px-2.5 text-xs';
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex gap-1 p-1 rounded-xl ${className}`}
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${pad}`}
            style={{
              background: active ? accent : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.45)',
            }}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
