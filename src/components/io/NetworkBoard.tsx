import React, { useMemo } from 'react';

export interface BoardEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  active?: boolean;
  muted?: boolean;
}

interface Props {
  nodes: string[];
  edges: BoardEdge[];
  source?: string;
  sink?: string;
}

/** Vista esquemática de red (SVG) sin dependencias extras. */
export const NetworkBoard: React.FC<Props> = ({ nodes, edges, source, sink }) => {
  const layout = useMemo(() => {
    const n = Math.max(nodes.length, 1);
    const w = Math.max(420, n * 70);
    const h = 220;
    const positions = new Map<string, { x: number; y: number }>();
    nodes.forEach((name, i) => {
      const col = n <= 4 ? i : i % Math.ceil(Math.sqrt(n));
      const row = n <= 4 ? 0 : Math.floor(i / Math.ceil(Math.sqrt(n)));
      const cols = n <= 4 ? n : Math.ceil(Math.sqrt(n));
      const rows = n <= 4 ? 1 : Math.ceil(n / cols);
      const x = 50 + (cols === 1 ? 0 : (col / (cols - 1 || 1)) * (w - 100));
      const y = 40 + (rows === 1 ? h / 2 - 40 : (row / (rows - 1 || 1)) * (h - 80));
      positions.set(name, { x, y });
    });
    return { w, h, positions };
  }, [nodes]);

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <svg width={layout.w} height={layout.h} viewBox={`0 0 ${layout.w} ${layout.h}`}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.45)" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
          </marker>
        </defs>
        {edges.map(e => {
          const a = layout.positions.get(e.from);
          const b = layout.positions.get(e.to);
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ox = (dx / len) * 18;
          const oy = (dy / len) * 18;
          const x1 = a.x + ox;
          const y1 = a.y + oy;
          const x2 = b.x - ox;
          const y2 = b.y - oy;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const color = e.active ? '#34d399' : e.muted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.35)';
          return (
            <g key={e.id}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color}
                strokeWidth={e.active ? 2.5 : 1.5}
                markerEnd={e.active ? 'url(#arrow-active)' : 'url(#arrow)'}
              />
              <text x={mx} y={my - 6} fill={color} fontSize="10" textAnchor="middle">{e.label}</text>
            </g>
          );
        })}
        {nodes.map(name => {
          const p = layout.positions.get(name)!;
          const isS = name === source;
          const isT = name === sink;
          return (
            <g key={name}>
              <circle
                cx={p.x} cy={p.y} r={16}
                fill={isS ? 'rgba(16,185,129,0.25)' : isT ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.06)'}
                stroke={isS ? '#10b981' : isT ? '#38bdf8' : 'rgba(255,255,255,0.25)'}
              />
              <text x={p.x} y={p.y + 4} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">{name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
