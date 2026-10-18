import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

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

type Pt = { x: number; y: number };

/** Capas: origen → intermedios → destino (redes de flujo). */
function layeredPositions(
  nodes: string[],
  edges: BoardEdge[],
  source: string | undefined,
  sink: string | undefined,
  w: number,
  h: number,
): Map<string, Pt> {
  const positions = new Map<string, Pt>();
  if (!nodes.length) return positions;

  const padX = Math.min(56, w * 0.08);
  const padY = Math.min(48, h * 0.14);
  const usableW = Math.max(40, w - padX * 2);
  const usableH = Math.max(40, h - padY * 2);

  const src = source && nodes.includes(source) ? source : undefined;
  const dst = sink && nodes.includes(sink) && sink !== src ? sink : undefined;
  const middle = nodes.filter(n => n !== src && n !== dst);

  // Particionar intermedios en columnas por BFS desde el origen (si existe)
  const cols: string[][] = [];
  if (src) {
    const adj = new Map<string, string[]>();
    nodes.forEach(n => adj.set(n, []));
    edges.forEach(e => {
      if (adj.has(e.from) && adj.has(e.to) && e.from !== e.to) {
        adj.get(e.from)!.push(e.to);
      }
    });
    const dist = new Map<string, number>();
    dist.set(src, 0);
    const q = [src];
    while (q.length) {
      const u = q.shift()!;
      for (const v of adj.get(u) ?? []) {
        if (!dist.has(v) && v !== dst) {
          dist.set(v, (dist.get(u) ?? 0) + 1);
          q.push(v);
        }
      }
    }
    const byLayer = new Map<number, string[]>();
    middle.forEach(n => {
      const d = dist.has(n) ? dist.get(n)! : 1;
      if (!byLayer.has(d)) byLayer.set(d, []);
      byLayer.get(d)!.push(n);
    });
    const keys = [...byLayer.keys()].sort((a, b) => a - b);
    if (keys.length) keys.forEach(k => cols.push(byLayer.get(k)!));
    else if (middle.length) cols.push(middle);
  } else if (middle.length) {
    const colsCount = Math.max(1, Math.ceil(Math.sqrt(middle.length)));
    for (let i = 0; i < middle.length; i++) {
      const c = i % colsCount;
      if (!cols[c]) cols[c] = [];
      cols[c].push(middle[i]);
    }
  }

  const layers: string[][] = [];
  if (src) layers.push([src]);
  layers.push(...cols);
  if (dst) layers.push([dst]);
  if (!layers.length) layers.push(nodes);

  const layerCount = layers.length;
  layers.forEach((layer, li) => {
    const x = layerCount === 1
      ? padX + usableW / 2
      : padX + (li / (layerCount - 1)) * usableW;
    layer.forEach((name, ri) => {
      const y = layer.length === 1
        ? padY + usableH / 2
        : padY + (ri / (layer.length - 1)) * usableH;
      positions.set(name, { x, y });
    });
  });

  // Nodos aislados no alcanzados
  nodes.forEach((name, i) => {
    if (!positions.has(name)) {
      positions.set(name, {
        x: padX + ((i % 3) / 2) * usableW,
        y: padY + (Math.floor(i / 3) / Math.max(1, Math.ceil(nodes.length / 3) - 1)) * usableH,
      });
    }
  });

  return positions;
}

/** Vista esquemática de red (SVG) fluida al ancho del panel. */
export const NetworkBoard: React.FC<Props> = ({ nodes, edges, source, sink }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 640, h: 280 });
  const uid = useId().replace(/:/g, '');

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const width = Math.max(280, el.clientWidth);
      const rows = Math.max(1, Math.ceil(Math.sqrt(Math.max(nodes.length, 1))));
      const height = Math.min(420, Math.max(220, 160 + rows * 72 + Math.min(edges.length, 8) * 4));
      setBox({ w: width, h: height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nodes.length, edges.length]);

  const positions = useMemo(
    () => layeredPositions(nodes, edges, source, sink, box.w, box.h),
    [nodes, edges, source, sink, box.w, box.h],
  );

  const arrowId = `arrow-${uid}`;
  const arrowActiveId = `arrow-active-${uid}`;
  const r = Math.min(20, Math.max(14, box.w / 40));

  return (
    <div
      ref={wrapRef}
      className="w-full min-w-0 rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <svg
        width="100%"
        height={box.h}
        viewBox={`0 0 ${box.w} ${box.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="block max-w-full"
        role="img"
        aria-label="Diagrama de la red de flujo"
      >
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.45)" />
          </marker>
          <marker id={arrowActiveId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
          </marker>
        </defs>

        {edges.map(e => {
          const a = positions.get(e.from);
          const b = positions.get(e.to);
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const ox = (dx / len) * (r + 2);
          const oy = (dy / len) * (r + 2);
          const x1 = a.x + ox;
          const y1 = a.y + oy;
          const x2 = b.x - ox;
          const y2 = b.y - oy;
          // Curva leve si hay arista inversa o solapamiento
          const reverse = edges.some(o => o.id !== e.id && o.from === e.to && o.to === e.from);
          const nx = (-dy / len) * (reverse ? 18 : 0);
          const ny = (dx / len) * (reverse ? 18 : 0);
          const cx = (x1 + x2) / 2 + nx;
          const cy = (y1 + y2) / 2 + ny;
          const color = e.active ? '#34d399' : e.muted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)';
          const d = reverse
            ? `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
            : `M ${x1} ${y1} L ${x2} ${y2}`;
          return (
            <g key={e.id}>
              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={e.active ? 2.6 : 1.6}
                markerEnd={`url(#${e.active ? arrowActiveId : arrowId})`}
              />
              <text
                x={cx}
                y={cy - 8}
                fill={color}
                fontSize={Math.min(12, Math.max(9, box.w / 55))}
                textAnchor="middle"
                className="select-none"
              >
                {e.label}
              </text>
            </g>
          );
        })}

        {nodes.map(name => {
          const p = positions.get(name);
          if (!p) return null;
          const isS = name === source;
          const isT = name === sink;
          return (
            <g key={name}>
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={isS ? 'rgba(16,185,129,0.28)' : isT ? 'rgba(56,189,248,0.28)' : 'rgba(255,255,255,0.07)'}
                stroke={isS ? '#10b981' : isT ? '#38bdf8' : 'rgba(255,255,255,0.3)'}
                strokeWidth={1.5}
              />
              <text
                x={p.x}
                y={p.y + 4}
                fill="white"
                fontSize={Math.min(13, Math.max(10, r * 0.7))}
                fontWeight="700"
                textAnchor="middle"
                className="select-none"
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
