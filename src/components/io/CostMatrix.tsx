import React from 'react';
import { inputClass } from './ModuleShell';

interface Props {
  rowLabels: string[];
  colLabels: string[];
  values: number[][];
  editable?: boolean;
  highlight?: { i: number; j: number }[];
  onCell?: (i: number, j: number, value: number) => void;
  onRowLabel?: (i: number, value: string) => void;
  onColLabel?: (j: number, value: string) => void;
}

function readNum(raw: string): number {
  if (raw.trim() === '') return Number.NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

export const CostMatrix: React.FC<Props> = ({
  rowLabels, colLabels, values, editable, highlight = [], onCell, onRowLabel, onColLabel,
}) => (
  <div className="overflow-x-auto custom-scrollbar">
    <table className="border-separate border-spacing-1 text-xs">
      <thead>
        <tr>
          <th />
          {colLabels.map((name, j) => (
            <th key={j} className="min-w-[64px] px-1">
              {editable && onColLabel ? (
                <input value={name} onChange={e => onColLabel(j, e.target.value)} className={inputClass} />
              ) : (
                <span className="text-white/50 font-bold">{name}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowLabels.map((name, i) => (
          <tr key={i}>
            <th className="pr-1 text-left min-w-[72px]">
              {editable && onRowLabel ? (
                <input value={name} onChange={e => onRowLabel(i, e.target.value)} className={inputClass} />
              ) : (
                <span className="text-white/50 font-bold">{name}</span>
              )}
            </th>
            {colLabels.map((_, j) => {
              const lit = highlight.some(h => h.i === i && h.j === j);
              const v = values[i]?.[j];
              return (
                <td key={j}>
                  <div
                    className="rounded-lg px-1 py-1.5"
                    style={{
                      background: lit ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.03)',
                      outline: lit ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {editable && onCell ? (
                      <input
                        type="number"
                        value={Number.isFinite(v) ? v : ''}
                        onChange={e => onCell(i, j, readNum(e.target.value))}
                        className={inputClass}
                        style={{ width: '56px' }}
                      />
                    ) : (
                      <div className="text-center font-mono text-white text-sm py-1">
                        {Number.isFinite(v) ? v : '—'}
                      </div>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
