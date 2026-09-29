import React from 'react';
import { TextWithMath } from '../LatexRenderer';
import { METHOD_INFO, type MethodId } from '../../core/TransporteSolver';
import { ACCENT, glassCard } from './shared';

const METHODS: MethodId[] = ['noroeste', 'minimo', 'vogel'];

const CONCEPTS: [string, string][] = [
  ['Origen', 'Quien envía. Cada origen es una fila y tiene una oferta aᵢ.'],
  ['Destino', 'Quien recibe. Cada destino es una columna y tiene una demanda bⱼ.'],
  ['Oferta', 'Lo máximo que puede salir de un origen. La fila no puede sumar más que eso.'],
  ['Demanda', 'Lo que un destino necesita recibir. La columna tiene que cubrir al menos esa cantidad.'],
  ['Costo unitario', 'Lo que cuesta mover una sola unidad. Es el número c de cada celda.'],
  ['Asignación', 'El valor que se escribe en una celda: por ejemplo x₁₁ = 30 significa 30 unidades de O1 a D1.'],
  ['Solución factible', 'Un plan sin cantidades negativas que cumple toda la oferta y toda la demanda.'],
  ['Solución inicial', 'Un plan factible para arrancar. Los tres métodos llegan a uno. El óptimo puede ser más barato.'],
  ['Tabla no equilibrada', 'Si oferta y demanda no suman lo mismo, se agrega un origen o un destino ficticio con costo 0.'],
];

export const TransportIntro: React.FC = () => (
  <div className="flex flex-col gap-4 pb-6">
    <div className="rounded-2xl p-6" style={glassCard}>
      <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: ACCENT }}>Unidad 2 · Modelos de redes</p>
      <h2 className="text-2xl font-extrabold text-white mb-2">Qué vas a resolver</h2>
      <p className="text-sm text-white/50 leading-relaxed max-w-3xl">
        El problema del transporte reparte la oferta de cada origen hasta cubrir la demanda de cada destino, gastando lo menos posible.
        Configura la tabla a la izquierda y recorre cada método paso a paso.
      </p>
      <div className="mt-4 text-white/80">
        <TextWithMath text={'$$\\min Z = \\sum_{i} \\sum_{j} c_{ij} x_{ij}$$'} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-2 text-sm text-white/60">
        <p><span className="text-white font-semibold">Z</span> es el costo total.</p>
        <p><span className="text-white font-semibold">cᵢⱼ</span> es el costo de una unidad del origen i al destino j.</p>
        <p><span className="text-white font-semibold">xᵢⱼ</span> es cuántas unidades viajan por esa ruta.</p>
      </div>
    </div>

    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {CONCEPTS.map(([title, text]) => (
        <div key={title} className="rounded-2xl p-4" style={glassCard}>
          <p className="text-xs font-extrabold text-white mb-1">{title}</p>
          <p className="text-[12px] text-white/45 leading-relaxed">{text}</p>
        </div>
      ))}
    </div>

    <div className="rounded-2xl p-5" style={glassCard}>
      <h3 className="text-sm font-extrabold text-white mb-2">Restricciones, antes y después de equilibrar</h3>
      <div className="text-white/80">
        <TextWithMath text={'Un origen no entrega más de lo que tiene:\n\n$$\\sum_{j} x_{ij} \\le a_i$$\n\nUn destino recibe al menos lo que pidió:\n\n$$\\sum_{i} x_{ij} \\ge b_j$$\n\nSi las sumas no coinciden, el ficticio convierte esas desigualdades en igualdades y los tres métodos ya pueden recorrer la tabla.'} />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {METHODS.map(id => (
        <div key={id} className="rounded-2xl p-4" style={glassCard}>
          <p className="text-xs font-black text-white">{METHOD_INFO[id].title}</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">{METHOD_INFO[id].english}</p>
          <p className="text-[11px] text-white/40 leading-snug">{METHOD_INFO[id].blurb}</p>
        </div>
      ))}
    </div>
  </div>
);
