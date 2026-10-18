import React, { type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  unit?: string;
  accent: string;
  sidebar: ReactNode;
  children: ReactNode;
}

export const ModuleShell: React.FC<Props> = ({ title, unit = 'Unidad 2', accent, sidebar, children }) => (
  <div
    className="min-h-screen lg:h-screen flex flex-col"
    style={{ background: 'linear-gradient(135deg, #060810 0%, #0d1020 45%, #0a0e1a 75%, #050810 100%)' }}
  >
    <header
      className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(6,8,16,0.7)', backdropFilter: 'blur(12px)' }}
    >
      <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-semibold">
        <ArrowLeft size={16} /> Panel Principal
      </Link>
      <h1 className="text-sm font-extrabold text-white">{title}</h1>
      <div className="text-xs text-white/25 font-semibold">{unit}</div>
    </header>
    <div className="flex-1 flex flex-col lg:flex-row gap-5 px-4 md:px-5 py-5 lg:min-h-0 lg:overflow-hidden">
      <aside
        className="w-full lg:w-80 lg:shrink-0 flex flex-col gap-4 lg:overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${accent}40 transparent` }}
      >
        {sidebar}
      </aside>
      <main
        className="flex-1 lg:min-h-0 lg:overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${accent}40 transparent` }}
      >
        {children}
      </main>
    </div>
  </div>
);

export const glass: CSSProperties = {
  background: 'rgba(8,10,20,0.88)',
  border: '1px solid rgba(255,255,255,0.07)',
};

export const inputClass =
  'bg-transparent border border-white/15 rounded-lg text-white text-center text-sm font-mono py-1.5 outline-none focus:border-emerald-400 transition-colors w-full';
