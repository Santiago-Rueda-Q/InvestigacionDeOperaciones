import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DarkSelect } from './DarkSelect';
import { inputClass } from './ModuleShell';

export interface EditableEdge {
  id: string;
  from: string;
  to: string;
  capacity: number;
  cost?: number;
}

interface Props {
  nodes: string[];
  edges: EditableEdge[];
  /** Si true, muestra columna de costo unitario. */
  withCost?: boolean;
  accent?: string;
  onChange: (edges: EditableEdge[]) => void;
  onAdd: () => void;
}

const fieldLabel = 'text-[9px] font-bold uppercase tracking-wider text-white/30 mb-0.5 block';

/** Lista editable de aristas (cap / costo) adaptable al ancho del sidebar. */
export const EdgeListEditor: React.FC<Props> = ({
  nodes,
  edges,
  withCost = false,
  accent = '#10b981',
  onChange,
  onAdd,
}) => {
  const patch = (index: number, next: Partial<EditableEdge>) => {
    onChange(edges.map((e, i) => (i === index ? { ...e, ...next } : e)));
  };

  const remove = (index: number) => {
    onChange(edges.filter((_, i) => i !== index));
  };

  return (
    <div className="min-w-0">
      <div className="flex justify-between items-center mb-2 gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
          {withCost ? 'Aristas (cap. · costo)' : 'Aristas (capacidad)'}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 text-[10px] font-bold shrink-0"
          style={{ color: accent }}
        >
          <Plus size={11} /> arista
        </button>
      </div>

      {/* Cabecera solo cuando el sidebar es ancho */}
      <div
        className={[
          'hidden @[28rem]/sidebar:grid gap-1.5 px-2.5 mb-1',
          withCost ? 'grid-cols-[1fr_1fr_4.5rem_4.5rem_1.75rem]' : 'grid-cols-[1fr_1fr_5rem_1.75rem]',
        ].join(' ')}
      >
        <span className={fieldLabel}>Desde</span>
        <span className={fieldLabel}>Hacia</span>
        <span className={`${fieldLabel} text-center`}>Cap.</span>
        {withCost && <span className={`${fieldLabel} text-center`}>Costo</span>}
        <span />
      </div>

      <div className="space-y-2">
        {edges.map((e, i) => (
          <div
            key={e.id}
            className="rounded-xl p-2.5 min-w-0"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Compacto: apilado / ancho: una fila */}
            <div
              className={[
                'grid gap-2 items-end',
                withCost
                  ? 'grid-cols-2 @[28rem]/sidebar:grid-cols-[1fr_1fr_4.5rem_4.5rem_1.75rem]'
                  : 'grid-cols-2 @[28rem]/sidebar:grid-cols-[1fr_1fr_5rem_1.75rem]',
              ].join(' ')}
            >
              <label className="min-w-0 block">
                <span className={`${fieldLabel} @[28rem]/sidebar:hidden`}>Desde</span>
                <DarkSelect
                  value={e.from}
                  options={nodes}
                  accent={accent}
                  aria-label={`Origen arista ${i + 1}`}
                  onChange={v => patch(i, { from: v })}
                />
              </label>

              <label className="min-w-0 block">
                <span className={`${fieldLabel} @[28rem]/sidebar:hidden`}>Hacia</span>
                <DarkSelect
                  value={e.to}
                  options={nodes}
                  accent={accent}
                  aria-label={`Destino arista ${i + 1}`}
                  onChange={v => patch(i, { to: v })}
                />
              </label>

              <label className="min-w-0">
                <span className={`${fieldLabel} @[28rem]/sidebar:hidden`}>Capacidad</span>
                <input
                  type="number"
                  min={0}
                  value={Number.isFinite(e.capacity) ? e.capacity : ''}
                  className={inputClass}
                  onChange={ev => {
                    const v = Number(ev.target.value);
                    patch(i, { capacity: Number.isFinite(v) ? v : Number.NaN });
                  }}
                />
              </label>

              {withCost && (
                <label className="min-w-0">
                  <span className={`${fieldLabel} @[28rem]/sidebar:hidden`}>Costo</span>
                  <input
                    type="number"
                    value={Number.isFinite(e.cost as number) ? e.cost : ''}
                    className={inputClass}
                    onChange={ev => {
                      const v = Number(ev.target.value);
                      patch(i, { cost: Number.isFinite(v) ? v : Number.NaN });
                    }}
                  />
                </label>
              )}

              <button
                type="button"
                onClick={() => remove(i)}
                title="Eliminar arista"
                className={[
                  'h-9 w-7 flex items-center justify-center rounded-lg text-red-400/60 hover:text-red-400',
                  'col-span-2 @[28rem]/sidebar:col-span-1 justify-self-end @[28rem]/sidebar:justify-self-center',
                ].join(' ')}
                style={{ background: 'rgba(244,63,94,0.08)' }}
              >
                <Trash2 size={13} />
              </button>
            </div>

            <p className="text-[10px] text-white/25 mt-1.5 truncate">
              {e.from} → {e.to}
              {Number.isFinite(e.capacity) ? ` · u=${e.capacity}` : ''}
              {withCost && Number.isFinite(e.cost as number) ? ` · c=${e.cost}` : ''}
            </p>
          </div>
        ))}

        {!edges.length && (
          <p className="text-[11px] text-white/35 px-1">
            No hay aristas. Pulsa «+ arista» para conectar nodos.
          </p>
        )}
      </div>
    </div>
  );
};
