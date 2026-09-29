import React from 'react';
import { formatQty, type GridSnapshot } from '../../core/TransporteSolver';
import { ACCENT } from './shared';

export const TransportGrid: React.FC<{ grid: GridSnapshot }> = ({ grid }) => {
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
