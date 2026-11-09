import type { CSSProperties } from 'react';

/** Tokens y clases compartidas de formularios / tipografía UI. */

export const RELATION_OPTIONS = [
  { value: '<=', label: '≤' },
  { value: '>=', label: '≥' },
  { value: '=', label: '=' },
] as const;

/** Campo numérico / texto editable (matriz, FO, RHS). */
export const inputClass =
  'io-input w-full bg-transparent border border-white/15 rounded-lg text-white text-center text-sm font-mono py-2 px-2 outline-none transition-colors focus:border-[var(--io-accent,#818cf8)] disabled:opacity-40';

/** Etiqueta de sección en sidebars (mayúsculas, tracking). */
export const sectionLabelClass =
  'text-[10px] font-bold tracking-widest uppercase text-white/30 mb-2';

/** Título de panel lateral. */
export const panelTitleClass = 'text-base font-bold text-white';

/** Título de bloque en el área principal. */
export const contentTitleClass = 'text-lg font-bold text-white';

export function presetButtonStyle(active: boolean, accent: string): CSSProperties {
  return {
    background: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
    border: active ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.07)',
  };
}
