import type { CSSProperties } from 'react';
import type { TransportInput } from '../../core/TransporteSolver';

export const ACCENT = '#10b981';

export const glassCard: CSSProperties = {
  background: 'rgba(8,10,20,0.88)',
  border: '1px solid rgba(255,255,255,0.07)',
};

export const inputClass =
  'bg-transparent border border-white/15 rounded-lg text-white text-center text-sm font-mono py-1.5 outline-none focus:border-emerald-400 transition-colors w-full';

export function readNumber(raw: string): number {
  if (raw.trim() === '') return Number.NaN;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function shownNumber(value: number | undefined): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}

export function cloneDraft(data: TransportInput): TransportInput {
  return {
    origins: [...data.origins],
    destinations: [...data.destinations],
    supply: [...data.supply],
    demand: [...data.demand],
    costs: data.costs.map(row => [...row]),
  };
}

export function validateDraft(input: TransportInput): string[] {
  const list: string[] = [];
  if (input.origins.some(name => !name.trim())) list.push('Cada origen necesita un nombre.');
  if (input.destinations.some(name => !name.trim())) list.push('Cada destino necesita un nombre.');
  if (input.supply.some(value => !Number.isFinite(value))) list.push('Hay una oferta vacía.');
  if (input.demand.some(value => !Number.isFinite(value))) list.push('Hay una demanda vacía.');
  if (input.costs.some(row => row.some(value => !Number.isFinite(value)))) list.push('Hay un costo vacío.');
  if (input.supply.some(value => value < 0)) list.push('La oferta no puede ser negativa.');
  if (input.demand.some(value => value < 0)) list.push('La demanda no puede ser negativa.');
  if (input.costs.some(row => row.some(value => value < 0))) list.push('Los costos tienen que ser mayores o iguales que cero.');
  return list;
}
