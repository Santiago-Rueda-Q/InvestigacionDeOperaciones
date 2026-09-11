import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, Sigma, Network, Cpu, BarChart2,
  GitBranch, Layers, TrendingUp, Boxes, BookOpen,
  Star, Zap
} from 'lucide-react';

// =============================================
// DATOS DE LAS UNIDADES
// =============================================

const units = [
  {
    id: 1,
    label: 'Unidad 1',
    title: 'Programación Lineal',
    subtitle: 'Modelos de optimización clásica',
    gradient: 'from-indigo-600 via-blue-600 to-cyan-500',
    gradientBg: 'from-indigo-950 via-blue-950 to-slate-900',
    accent: '#6366f1',
    glowColor: 'rgba(99,102,241,0.30)',
    number: '01',
    icon: Sigma,
    topics: [
      { label: 'Formulación de Modelos',   path: '/unidad1/formulacion',     icon: BookOpen,   ready: true },
      { label: 'Método Gráfico',            path: '/unidad1/grafico',          icon: BarChart2,  ready: false },
      { label: 'Método Simplex',            path: '/unidad1/simplex',          icon: Layers,     ready: true },
      { label: 'Dualidad',                  path: '/unidad1/dualidad',         icon: GitBranch,  ready: false },
      { label: 'Análisis de Sensibilidad',  path: '/unidad1/sensibilidad',     icon: TrendingUp, ready: false },
      { label: 'Simplex Revisado',          path: '/unidad1/simplex-revisado', icon: Zap,        ready: false },
    ],
  },
  {
    id: 2,
    label: 'Unidad 2',
    title: 'Modelos de Redes',
    subtitle: 'Flujo, transporte y actividades',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    gradientBg: 'from-emerald-950 via-teal-950 to-slate-900',
    accent: '#10b981',
    glowColor: 'rgba(16,185,129,0.25)',
    number: '02',
    icon: Network,
    topics: [
      { label: 'El Problema del Transporte', path: '/unidad2/transporte', icon: Boxes,      ready: false },
      { label: 'Problema de Asignación',     path: '/unidad2/asignacion', icon: GitBranch,  ready: false },
      { label: 'Flujo Máximo',               path: '/unidad2/flujo',      icon: TrendingUp, ready: false },
      { label: 'Flujo a Costo Mínimo',       path: '/unidad2/costo-min',  icon: Layers,     ready: false },
      { label: 'Árbol de Mínimo Recorrido',  path: '/unidad2/arbol',      icon: Network,    ready: false },
      { label: 'Redes PERT y CPM',           path: '/unidad2/pert-cpm',   icon: Sigma,      ready: false },
    ],
  },
  {
    id: 3,
    label: 'Unidad 3',
    title: 'Otros Modelos',
    subtitle: 'Programación avanzada y colas',
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
    gradientBg: 'from-violet-950 via-purple-950 to-slate-900',
    accent: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.25)',
    number: '03',
    icon: Cpu,
    topics: [
      { label: 'Programación Dinámica',  path: '/unidad3/dinamica', icon: Layers,     ready: false },
      { label: 'Programación Entera',    path: '/unidad3/entera',   icon: Boxes,      ready: false },
      { label: 'Programación No Lineal', path: '/unidad3/no-lineal',icon: TrendingUp, ready: false },
      { label: 'Teoría de Colas',        path: '/unidad3/colas',    icon: Network,    ready: false },
    ],
  },
];

// =============================================
// NÚMEROS FLOTANTES DECORATIVOS
// =============================================

const BG_NUMBERS = ['π', 'Σ', '∞', 'λ', 'α', 'Z', 'x₁', 'S₁', '∂', '∇', 'ε', 'δ', 'max'];

const FloatingNumbers: React.FC = () => {
  const [items] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      symbol: BG_NUMBERS[i % BG_NUMBERS.length],
      x: 2 + (i % 8) * 12,
      y: 5 + Math.floor(i / 8) * 50 + Math.random() * 35,
      size: 14 + Math.random() * 22,
      delay: Math.random() * 6,
      duration: 5 + Math.random() * 6,
    }))
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {items.map(item => (
        <span
          key={item.id}
          className="absolute font-black text-white"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}px`,
            opacity: 0.055,
            animation: `number-float ${item.duration}s ${item.delay}s ease-in-out infinite`,
          }}
        >
          {item.symbol}
        </span>
      ))}
    </div>
  );
};

// =============================================
// CARD DE UNIDAD
// =============================================

interface UnitCardProps {
  unit: typeof units[0];
  delay: number;
}

const UnitCard: React.FC<UnitCardProps> = ({ unit, delay }) => {
  const Icon = unit.icon;
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        animationDelay: `${delay}s`,
        boxShadow: `0 4px 32px ${unit.glowColor}, 0 1px 6px rgba(0,0,0,0.5)`,
        background: 'rgba(8,10,20,0.88)',
        border: '1px solid rgba(255,255,255,0.07)',
        animation: `fadeInUp 0.6s ${delay}s ease-out both`,
      }}
    >
      {/* Header */}
      <div className={`relative bg-gradient-to-br ${unit.gradientBg} px-5 py-4 overflow-hidden shrink-0`}>
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${unit.accent}, transparent)`, animation: 'spin-slow 12s linear infinite' }}
        />
        {/* Número decorativo */}
        <div className="absolute top-1 right-3 font-black text-6xl opacity-[0.06] text-white select-none leading-none">
          {unit.number}
        </div>

        {/* Icono */}
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${unit.gradient} flex items-center justify-center mb-3`}
          style={{ boxShadow: `0 3px 14px ${unit.glowColor}` }}
        >
          <Icon size={22} color="white" strokeWidth={1.8} />
        </div>

        <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: unit.accent }}>
          {unit.label}
        </p>
        <h2 className="text-lg font-extrabold text-white leading-tight">{unit.title}</h2>
        <p className="text-xs text-white/40 mt-0.5 font-medium">{unit.subtitle}</p>
      </div>

      {/* Divider */}
      <div className={`h-px bg-gradient-to-r ${unit.gradient} opacity-25 shrink-0`} />

      {/* Temas */}
      <div className="flex-1 px-4 py-3 space-y-1.5 overflow-hidden">
        {unit.topics.map((topic) => {
          const TIcon = topic.icon;
          const inner = (
            <div
              className={`topic-item group flex items-center gap-2.5 px-3 py-2 rounded-xl ${
                topic.ready
                  ? 'text-white/80 hover:text-white cursor-pointer'
                  : 'text-white/30 cursor-not-allowed'
              }`}
              style={{
                background: topic.ready ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: topic.ready ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
                transition: 'all 0.25s ease',
              }}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  topic.ready ? 'group-hover:scale-110 transition-transform' : 'opacity-40'
                }`}
                style={{ background: `${unit.accent}20` }}
              >
                <TIcon size={13} color={topic.ready ? unit.accent : '#555'} strokeWidth={2} />
              </div>
              <span className="text-xs font-medium flex-1 leading-tight">{topic.label}</span>
              {topic.ready ? (
                <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" style={{ color: unit.accent }} />
              ) : (
                <span className="text-[9px] bg-white/8 text-white/30 px-1.5 py-0.5 rounded-full font-semibold">Pronto</span>
              )}
            </div>
          );

          return topic.ready
            ? <Link to={topic.path} key={topic.path} className="block no-underline">{inner}</Link>
            : <div key={topic.path}>{inner}</div>;
        })}
      </div>
    </div>
  );
};

// =============================================
// STATS
// =============================================
const stats = [
  { label: 'Unidades',    value: '3'   },
  { label: 'Temas',       value: '16'  },
  { label: 'Algoritmos',  value: '10+' },
  { label: 'Paso a paso', value: '∞'   },
];

// =============================================
// DASHBOARD — SINGLE SCREEN (sin scroll)
// =============================================
export const Dashboard: React.FC = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t); }, []);

  return (
    <div
      className="w-screen h-screen overflow-hidden relative flex flex-col"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #0d1020 45%, #0a0e1a 75%, #050810 100%)' }}
    >
      {/* Orbes de fondo */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(60px)', animation: 'float 8s ease-in-out infinite' }} />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', filter: 'blur(60px)', animation: 'float 10s 2s ease-in-out infinite' }} />
      <div className="absolute top-1/3 left-1/2 w-48 h-48 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #10b981, transparent)', filter: 'blur(50px)', animation: 'float 12s 4s ease-in-out infinite' }} />

      {/* Números flotantes */}
      <FloatingNumbers />

      {/* ── HERO compacto ── */}
      <header
        className="relative z-10 text-center pt-5 pb-3 px-6 shrink-0"
        style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.6s ease' }}
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-[10px] font-bold tracking-widest uppercase"
          style={{ background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.32)', color: '#a5b4fc' }}>
          <Star size={10} fill="#a5b4fc" color="#a5b4fc" />
          Ingeniería de Software · VIII Semestre
        </div>

        {/* Título */}
        <h1
          className="text-4xl md:text-5xl font-black text-transparent bg-clip-text leading-tight mb-2"
          style={{
            backgroundImage: 'linear-gradient(90deg, #818cf8, #a78bfa, #38bdf8, #818cf8)',
            backgroundSize: '200%',
            animation: 'gradient-x 4s ease infinite',
          }}
        >
          Investigación de Operaciones
        </h1>

        <p className="text-white/45 text-sm font-light max-w-lg mx-auto">
          Resuelve modelos matemáticos complejos <strong className="text-white/65">paso a paso</strong>,
          con tablas interactivas y LaTeX en tiempo real.
        </p>

        {/* Stats en línea */}
        <div className="flex flex-wrap justify-center gap-6 mt-3">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-[9px] text-white/35 font-bold uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Separador */}
      <div className="shrink-0 h-px mx-8 bg-gradient-to-r from-transparent via-indigo-500/35 to-transparent" />

      {/* ── GRID DE UNIDADES — ocupa el espacio restante ── */}
      <main className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 px-6 py-4 min-h-0">
        {units.map((unit, i) => (
          <UnitCard key={unit.id} unit={unit} delay={0.15 + i * 0.12} />
        ))}
      </main>

      {/* Footer mínimo */}
      <footer className="relative z-10 shrink-0 text-center py-2 text-white/15 text-[10px] font-medium tracking-wide">
        FESC · Investigación de Operaciones · 2026
      </footer>
    </div>
  );
};
