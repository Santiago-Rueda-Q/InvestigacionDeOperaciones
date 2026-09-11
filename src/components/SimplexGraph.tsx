import React from 'react';
import Plot from 'react-plotly.js';
import { SimplexProblem, SimplexStep } from '../types';
import { GeometrySolver } from '../core/GeometrySolver';

interface SimplexGraphProps {
  problem: SimplexProblem;
  optimalStep: SimplexStep;
  accentColor?: string;
}

export const SimplexGraph: React.FC<SimplexGraphProps> = ({ problem, optimalStep, accentColor = '#6366f1' }) => {
  const is2D = problem.numVars === 2;
  const is3D = problem.numVars === 3;

  if (!is2D && !is3D) {
    return (
      <div className="mt-4 p-5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2"
        style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span className="text-white/30 text-4xl">📐</span>
        <h4 className="text-white/80 font-bold">Gráfica no disponible</h4>
        <p className="text-white/40 text-xs">
          El método gráfico solo soporta problemas de 2 o 3 variables.<br/>
          Tu problema tiene {problem.numVars} variables.
        </p>
      </div>
    );
  }

  const optimalValues = optimalStep.basis.reduce((acc, bVar, i) => {
    if (bVar.startsWith('x_')) {
      const idx = parseInt(bVar.match(/\d+/)?.[0] || '1') - 1;
      acc[idx] = optimalStep.matrix[i][optimalStep.matrix[0].length - 1];
    }
    return acc;
  }, new Array(problem.numVars).fill(0));

  // Extraer las variables que no estaban en la base (que valen 0)
  for (let j = 0; j < problem.numVars; j++) {
    const varName = `x_{${j + 1}}`;
    if (!optimalStep.basis.includes(varName)) {
      optimalValues[j] = 0;
    }
  }

  const plotLayoutBase = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: 'rgba(255,255,255,0.6)', family: 'Inter, sans-serif' },
    margin: { l: 40, r: 40, t: 40, b: 40 },
    showlegend: true,
    legend: { font: { size: 10 }, bgcolor: 'rgba(0,0,0,0.5)', bordercolor: 'rgba(255,255,255,0.1)', borderwidth: 1 },
  };

  if (is2D) {
    const vertices = GeometrySolver.getFeasibleVertices2D(problem);
    if (vertices.length === 0) return null;

    // Cerrar el polígono
    const polygon = [...vertices, vertices[0]];

    const maxX = Math.max(...vertices.map(v => v.x)) * 1.5 || 10;
    const maxY = Math.max(...vertices.map(v => v.y)) * 1.5 || 10;

    const data: any[] = [
      {
        type: 'scatter',
        x: polygon.map(v => v.x),
        y: polygon.map(v => v.y),
        mode: 'lines+markers',
        fill: 'toself',
        fillcolor: 'rgba(16, 185, 129, 0.15)',
        line: { color: '#10b981', width: 2 },
        marker: { size: 6, color: '#10b981' },
        name: 'Región Factible',
        hoverinfo: 'x+y',
      },
    ];

    // Colores vibrantes para las restricciones
    const colors = ['#f472b6', '#38bdf8', '#fbbf24', '#c084fc', '#4ade80'];

    problem.constraints.forEach((c, idx) => {
      const a1 = c.coefficients[0];
      const a2 = c.coefficients[1];
      const b = c.rhs;
      
      let xPts = [], yPts = [];
      if (Math.abs(a2) < 1e-6) { // Vertical
        const x = b / a1;
        xPts = [x, x];
        yPts = [0, maxY];
      } else if (Math.abs(a1) < 1e-6) { // Horizontal
        const y = b / a2;
        xPts = [0, maxX];
        yPts = [y, y];
      } else {
        xPts = [0, b / a1];
        yPts = [b / a2, 0];
      }

      data.push({
        type: 'scatter',
        x: xPts,
        y: yPts,
        mode: 'lines',
        line: { color: colors[idx % colors.length], width: 2, dash: 'dash' },
        name: `R${idx + 1}: ${a1}x₁ + ${a2}x₂ ≤ ${b}`,
        hoverinfo: 'none',
      });
    });

    // Punto Óptimo
    data.push({
      type: 'scatter',
      x: [optimalValues[0]],
      y: [optimalValues[1]],
      mode: 'markers',
      marker: { size: 14, color: accentColor, line: { color: 'white', width: 2 }, symbol: 'star' },
      name: `Solución Óptima: (${optimalValues[0].toFixed(2)}, ${optimalValues[1].toFixed(2)})`,
      hoverinfo: 'text',
      text: `Óptimo: x₁=${optimalValues[0].toFixed(2)}, x₂=${optimalValues[1].toFixed(2)}`,
    });

    return (
      <div className="mt-4 p-4 rounded-2xl" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
          <span style={{ color: accentColor }}>📐</span> Método Gráfico 2D
        </h4>
        <div className="w-full h-80 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <Plot
            data={data}
            layout={{
              ...plotLayoutBase,
              xaxis: { title: 'x₁', gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.2)', range: [-1, maxX] },
              yaxis: { title: 'x₂', gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.2)', range: [-1, maxY] },
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ displayModeBar: false }}
          />
        </div>
      </div>
    );
  }

  // === 3D ===
  if (is3D) {
    const vertices = GeometrySolver.getFeasibleVertices3D(problem);
    if (vertices.length === 0) return null;

    const data: any[] = [
      {
        type: 'mesh3d',
        x: vertices.map(v => v.x),
        y: vertices.map(v => v.y),
        z: vertices.map(v => v.z),
        alphahull: 0, // Envolvente convexa estricta
        opacity: 0.35,
        color: '#10b981',
        name: 'Poliedro Factible',
        hoverinfo: 'x+y+z',
      },
      // Vértices del poliedro
      {
        type: 'scatter3d',
        x: vertices.map(v => v.x),
        y: vertices.map(v => v.y),
        z: vertices.map(v => v.z),
        mode: 'markers',
        marker: { size: 4, color: 'rgba(255,255,255,0.5)' },
        name: 'Vértices',
        hoverinfo: 'none',
      },
      // Punto Óptimo
      {
        type: 'scatter3d',
        x: [optimalValues[0]],
        y: [optimalValues[1]],
        z: [optimalValues[2]],
        mode: 'markers',
        marker: { size: 10, color: accentColor, line: { color: 'white', width: 2 }, symbol: 'diamond' },
        name: `Óptimo: (${optimalValues[0].toFixed(2)}, ${optimalValues[1].toFixed(2)}, ${optimalValues[2].toFixed(2)})`,
        hoverinfo: 'text',
        text: `Óptimo: x₁=${optimalValues[0].toFixed(2)}, x₂=${optimalValues[1].toFixed(2)}, x₃=${optimalValues[2].toFixed(2)}`,
      }
    ];

    return (
      <div className="mt-4 p-4 rounded-2xl" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h4 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
          <span style={{ color: accentColor }}>🧊</span> Poliedro Factible 3D (Interactivo)
        </h4>
        <div className="w-full h-96 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <Plot
            data={data}
            layout={{
              ...plotLayoutBase,
              scene: {
                xaxis: { title: 'x₁', gridcolor: 'rgba(255,255,255,0.1)', backgroundcolor: 'rgba(0,0,0,0)' },
                yaxis: { title: 'x₂', gridcolor: 'rgba(255,255,255,0.1)', backgroundcolor: 'rgba(0,0,0,0)' },
                zaxis: { title: 'x₃', gridcolor: 'rgba(255,255,255,0.1)', backgroundcolor: 'rgba(0,0,0,0)' },
                camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } },
              }
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
            config={{ displayModeBar: false }}
          />
        </div>
      </div>
    );
  }

  return null;
};
