import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home, type LucideIcon } from 'lucide-react';

export type StatusTone = 'indigo' | 'amber' | 'rose' | 'emerald';

const TONES: Record<StatusTone, {
  orb: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  cta: string;
  code: string;
}> = {
  indigo: {
    orb: '#6366f1',
    badgeBg: 'rgba(99,102,241,0.14)',
    badgeBorder: 'rgba(99,102,241,0.32)',
    badgeText: '#a5b4fc',
    iconBg: 'rgba(99,102,241,0.16)',
    iconColor: '#818cf8',
    cta: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    code: 'rgba(129,140,248,0.9)',
  },
  amber: {
    orb: '#f59e0b',
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeBorder: 'rgba(245,158,11,0.35)',
    badgeText: '#fcd34d',
    iconBg: 'rgba(245,158,11,0.14)',
    iconColor: '#fbbf24',
    cta: 'linear-gradient(135deg, #d97706, #f59e0b)',
    code: 'rgba(251,191,36,0.9)',
  },
  rose: {
    orb: '#f43f5e',
    badgeBg: 'rgba(244,63,94,0.12)',
    badgeBorder: 'rgba(244,63,94,0.35)',
    badgeText: '#fda4af',
    iconBg: 'rgba(244,63,94,0.14)',
    iconColor: '#fb7185',
    cta: 'linear-gradient(135deg, #e11d48, #f43f5e)',
    code: 'rgba(251,113,133,0.95)',
  },
  emerald: {
    orb: '#10b981',
    badgeBg: 'rgba(16,185,129,0.12)',
    badgeBorder: 'rgba(16,185,129,0.35)',
    badgeText: '#6ee7b7',
    iconBg: 'rgba(16,185,129,0.14)',
    iconColor: '#34d399',
    cta: 'linear-gradient(135deg, #059669, #10b981)',
    code: 'rgba(52,211,153,0.95)',
  },
};

interface Action {
  label: string;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
}

interface Props {
  tone?: StatusTone;
  badge: string;
  code?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: string;
  pathHint?: string;
  actions?: Action[];
}

/** Pantalla de estado a viewport fijo: sin scroll en desktop ni tablet. */
export const StatusScreen: React.FC<Props> = ({
  tone = 'indigo',
  badge,
  code,
  icon: Icon,
  title,
  description,
  meta,
  pathHint,
  actions = [{ label: 'Volver al panel', to: '/', primary: true }],
}) => {
  const t = TONES[tone];

  return (
    <div
      className="h-screen w-screen overflow-hidden relative flex flex-col"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #0d1020 45%, #0a0e1a 75%, #050810 100%)' }}
    >
      <div
        className="pointer-events-none absolute -top-24 -left-20 w-64 h-64 rounded-full opacity-25"
        style={{ background: `radial-gradient(circle, ${t.orb}, transparent)`, filter: 'blur(56px)', animation: 'float 8s ease-in-out infinite' }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-16 w-56 h-56 rounded-full opacity-18"
        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', filter: 'blur(56px)', animation: 'float 10s 2s ease-in-out infinite' }}
      />

      <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-4 py-4">
        <div
          className="w-full max-w-xl rounded-2xl px-5 py-5 md:px-7 md:py-6 text-center"
          style={{
            background: 'rgba(8,10,20,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 0 32px ${t.orb}20`,
            animation: 'fadeInUp 0.45s ease-out both',
          }}
        >
          {/* Cabecera compacta: badge + icono + código en una franja */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: t.iconBg, boxShadow: `0 6px 18px ${t.orb}30` }}
            >
              <Icon size={22} color={t.iconColor} strokeWidth={1.8} />
            </div>
            <div className="text-left min-w-0">
              <div
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase"
                style={{ background: t.badgeBg, border: `1px solid ${t.badgeBorder}`, color: t.badgeText }}
              >
                {badge}
              </div>
              {code && (
                <p className="text-2xl font-black leading-none mt-1" style={{ color: t.code }}>
                  {code}
                </p>
              )}
            </div>
          </div>

          <h1 className="text-xl md:text-2xl font-extrabold text-white leading-tight mb-1.5">
            {title}
          </h1>

          <p className="text-xs md:text-sm text-white/50 leading-snug max-w-md mx-auto">
            {description}
          </p>

          {(pathHint || meta) && (
            <div
              className="mt-3 rounded-xl px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-left"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {pathHint && (
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 mr-2">Ruta</span>
                  <code className="text-[11px] font-mono text-white/65 break-all">{pathHint}</code>
                </div>
              )}
              {meta && (
                <p className="text-[11px] text-white/45 sm:text-right shrink-0">{meta}</p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {actions.map((action, i) => {
              const className =
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all';
              const style = action.primary
                ? { background: t.cta, color: 'white', boxShadow: `0 6px 16px ${t.orb}40` }
                : {
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  };

              if (action.to) {
                return (
                  <Link key={i} to={action.to} className={className} style={style}>
                    {action.primary ? <Home size={13} /> : <ArrowLeft size={13} />}
                    {action.label}
                  </Link>
                );
              }
              return (
                <button key={i} type="button" onClick={action.onClick} className={className} style={style}>
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="relative z-10 shrink-0 text-center py-2 text-white/15 text-[10px] font-medium tracking-wide">
        FESC · Investigación de Operaciones · 2026
      </footer>
    </div>
  );
};
