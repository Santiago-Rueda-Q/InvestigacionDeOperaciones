import React, { type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  unit?: string;
  accent: string;
  sidebar: ReactNode;
  children: ReactNode;
  /**
   * Ancho base del sidebar en desktop (rem). El layout hace clamp entre
   * ~17.5rem y min(48rem, 48vw) para ceder espacio al panel principal.
   */
  sidebarBasisRem?: number;
  /** Sustituye el título centrado (p. ej. toggle de método en Simplex). */
  headerCenter?: ReactNode;
}

/** Estima rem de sidebar según columnas de una matriz editable (+ margen). */
export function sidebarBasisForColumns(cols: number, cellRem = 3.6, baseRem = 18): number {
  return Math.min(48, Math.max(17.5, baseRem + Math.max(0, cols) * cellRem));
}

/** Estima rem de sidebar según densidad de filas de aristas / restricciones. */
export function sidebarBasisForRows(rows: number, rowRem = 0.45, baseRem = 20, maxRem = 30): number {
  return Math.min(maxRem, Math.max(17.5, baseRem + Math.max(0, rows) * rowRem));
}

export const ModuleShell: React.FC<Props> = ({
  title,
  unit = 'Unidad 2',
  accent,
  sidebar,
  children,
  sidebarBasisRem = 20,
  headerCenter,
}) => {
  const basis = Math.min(48, Math.max(17.5, sidebarBasisRem));

  return (
    <div
      className="min-h-screen lg:h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #0d1020 45%, #0a0e1a 75%, #050810 100%)' }}
    >
      <header
        className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b gap-3"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(6,8,16,0.7)', backdropFilter: 'blur(12px)' }}
      >
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-semibold shrink-0">
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Panel Principal</span>
        </Link>
        <div className="min-w-0 flex-1 flex justify-center px-1">
          {headerCenter ?? (
            <h1 className="text-sm font-extrabold text-white text-center truncate">{title}</h1>
          )}
        </div>
        <div className="text-xs text-white/25 font-semibold shrink-0 hidden sm:block w-24 text-right">{unit}</div>
        <div className="w-8 sm:hidden shrink-0" aria-hidden />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-5 px-3 sm:px-4 md:px-5 py-4 md:py-5 lg:min-h-0 lg:overflow-hidden">
        <aside
          className={[
            '@container/sidebar',
            'w-full flex flex-col gap-4',
            'max-h-[min(70vh,40rem)] lg:max-h-none',
            'overflow-y-auto',
            'lg:shrink-0 lg:min-w-[17.5rem]',
            'lg:w-[clamp(17.5rem,var(--io-sidebar-basis),min(48rem,48vw))]',
          ].join(' ')}
          style={{
            ['--io-sidebar-basis' as string]: `${basis}rem`,
            scrollbarWidth: 'thin',
            scrollbarColor: `${accent}40 transparent`,
          }}
        >
          {sidebar}
        </aside>

        <main
          className="flex-1 min-w-0 lg:min-h-0 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${accent}40 transparent` }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export const glass: CSSProperties = {
  background: 'rgba(8,10,20,0.88)',
  border: '1px solid rgba(255,255,255,0.07)',
};

export const inputClass =
  'bg-transparent border border-white/15 rounded-lg text-white text-center text-sm font-mono py-1.5 outline-none focus:border-emerald-400 transition-colors w-full';
