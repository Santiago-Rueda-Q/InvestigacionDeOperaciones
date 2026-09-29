import React from 'react';
import { TextWithMath } from '../LatexRenderer';
import { formatQty, type MethodResult } from '../../core/TransporteSolver';
import { glassCard } from './shared';
import { TransportGrid } from './TransportGrid';

export const TransportComparison: React.FC<{ methods: MethodResult[] }> = ({ methods }) => (
  <div className="rounded-2xl p-5" style={glassCard}>
    <h3 className="text-base font-extrabold text-white mb-1">Comparación de los tres arranques</h3>
    <p className="text-sm text-white/45 mb-4 leading-relaxed">
      Los tres planes cumplen oferta y demanda. El de menor costo es el mejor arranque de esta tabla.
      Ninguno certifica el óptimo: para eso haría falta un método de mejora, como MODI o stepping-stone.
    </p>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {methods.map(item => {
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
);
