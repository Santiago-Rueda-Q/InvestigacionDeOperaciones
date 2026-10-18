import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DarkSelectOption {
  value: string;
  label?: string;
}

interface Props {
  value: string;
  options: DarkSelectOption[] | string[];
  onChange: (value: string) => void;
  accent?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

function normalize(options: DarkSelectOption[] | string[]): DarkSelectOption[] {
  return options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));
}

/** Select con panel de opciones en tema oscuro (el &lt;select&gt; nativo no estiliza el menú). */
export const DarkSelect: React.FC<Props> = ({
  value,
  options,
  onChange,
  accent = '#10b981',
  className = '',
  disabled,
  'aria-label': ariaLabel,
}) => {
  const items = normalize(options);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = items.find(o => o.value === value) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-sm font-mono text-white outline-none transition-colors disabled:opacity-40"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: open ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.15)',
          boxShadow: open ? `0 0 0 1px ${accent}33` : undefined,
        }}
      >
        <span className="truncate text-center flex-1">{current?.label ?? value ?? '—'}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg py-1 shadow-xl"
          style={{
            background: '#0c1020',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
          }}
        >
          {items.map(opt => {
            const selected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm font-mono transition-colors"
                  style={{
                    background: selected ? `${accent}33` : 'transparent',
                    color: selected ? '#fff' : 'rgba(255,255,255,0.75)',
                  }}
                  onMouseEnter={e => {
                    if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = selected ? `${accent}33` : 'transparent';
                  }}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label ?? opt.value}
                </button>
              </li>
            );
          })}
          {!items.length && (
            <li className="px-3 py-2 text-xs text-white/35">Sin opciones</li>
          )}
        </ul>
      )}
    </div>
  );
};
