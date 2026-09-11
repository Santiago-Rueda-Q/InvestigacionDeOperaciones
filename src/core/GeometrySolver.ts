import { SimplexProblem } from '../types';

export interface Point2D { x: number; y: number; }
export interface Point3D { x: number; y: number; z: number; }

const EPSILON = 1e-6;

export class GeometrySolver {
  // ── 2D ────────────────────────────────────────────────────────

  public static getFeasibleVertices2D(problem: SimplexProblem): Point2D[] {
    if (problem.numVars !== 2) return [];

    const equations: { a1: number; a2: number; b: number }[] = [];

    // Restricciones originales
    problem.constraints.forEach(c => {
      equations.push({ a1: c.coefficients[0], a2: c.coefficients[1], b: c.rhs });
    });
    // No negatividad (x1 >= 0 -> -x1 <= 0, x2 >= 0 -> -x2 <= 0)
    // Para las intersecciones, solo necesitamos la igualdad: x1 = 0, x2 = 0
    equations.push({ a1: -1, a2: 0, b: 0 });
    equations.push({ a1: 0, a2: -1, b: 0 });

    const points: Point2D[] = [];

    // Encontrar todas las combinaciones de pares de rectas
    for (let i = 0; i < equations.length; i++) {
      for (let j = i + 1; j < equations.length; j++) {
        const eq1 = equations[i];
        const eq2 = equations[j];

        // Regla de Cramer 2x2
        const det = eq1.a1 * eq2.a2 - eq1.a2 * eq2.a1;
        if (Math.abs(det) > EPSILON) {
          const x = (eq1.b * eq2.a2 - eq2.b * eq1.a2) / det;
          const y = (eq1.a1 * eq2.b - eq2.a1 * eq1.b) / det;
          points.push({ x, y });
        }
      }
    }

    // Filtrar los puntos que cumplen con todas las restricciones
    const feasiblePoints = points.filter(p => {
      if (p.x < -EPSILON || p.y < -EPSILON) return false;
      for (const c of problem.constraints) {
        const val = c.coefficients[0] * p.x + c.coefficients[1] * p.y;
        if (c.relation === '<=' && val > c.rhs + EPSILON) return false;
        if (c.relation === '>=' && val < c.rhs - EPSILON) return false;
        if (c.relation === '=' && Math.abs(val - c.rhs) > EPSILON) return false;
      }
      return true;
    });

    // Eliminar duplicados
    const uniqueFeasible = feasiblePoints.filter((p, index, self) =>
      index === self.findIndex(t => Math.abs(t.x - p.x) < EPSILON && Math.abs(t.y - p.y) < EPSILON)
    );

    // Ordenar los vértices en sentido antihorario respecto al centroide para trazar el polígono
    if (uniqueFeasible.length === 0) return [];
    
    const cx = uniqueFeasible.reduce((sum, p) => sum + p.x, 0) / uniqueFeasible.length;
    const cy = uniqueFeasible.reduce((sum, p) => sum + p.y, 0) / uniqueFeasible.length;

    uniqueFeasible.sort((a, b) => {
      const angleA = Math.atan2(a.y - cy, a.x - cx);
      const angleB = Math.atan2(b.y - cy, b.x - cx);
      return angleA - angleB;
    });

    return uniqueFeasible;
  }

  // ── 3D ────────────────────────────────────────────────────────

  public static getFeasibleVertices3D(problem: SimplexProblem): Point3D[] {
    if (problem.numVars !== 3) return [];

    const equations: { a1: number; a2: number; a3: number; b: number }[] = [];

    problem.constraints.forEach(c => {
      equations.push({ a1: c.coefficients[0], a2: c.coefficients[1], a3: c.coefficients[2], b: c.rhs });
    });
    // No negatividad (igualdades x1=0, x2=0, x3=0)
    equations.push({ a1: 1, a2: 0, a3: 0, b: 0 });
    equations.push({ a1: 0, a2: 1, a3: 0, b: 0 });
    equations.push({ a1: 0, a2: 0, a3: 1, b: 0 });

    const points: Point3D[] = [];

    // Encontrar combinaciones de 3 planos
    for (let i = 0; i < equations.length; i++) {
      for (let j = i + 1; j < equations.length; j++) {
        for (let k = j + 1; k < equations.length; k++) {
          const pt = this.solve3x3(equations[i], equations[j], equations[k]);
          if (pt) points.push(pt);
        }
      }
    }

    // Filtrar factibles
    const feasiblePoints = points.filter(p => {
      if (p.x < -EPSILON || p.y < -EPSILON || p.z < -EPSILON) return false;
      for (const c of problem.constraints) {
        const val = c.coefficients[0] * p.x + c.coefficients[1] * p.y + c.coefficients[2] * p.z;
        if (c.relation === '<=' && val > c.rhs + EPSILON) return false;
        if (c.relation === '>=' && val < c.rhs - EPSILON) return false;
        if (c.relation === '=' && Math.abs(val - c.rhs) > EPSILON) return false;
      }
      return true;
    });

    // Eliminar duplicados
    const uniqueFeasible = feasiblePoints.filter((p, index, self) =>
      index === self.findIndex(t => 
        Math.abs(t.x - p.x) < EPSILON && 
        Math.abs(t.y - p.y) < EPSILON && 
        Math.abs(t.z - p.z) < EPSILON
      )
    );

    return uniqueFeasible;
  }

  // Resuelve sistema 3x3 usando regla de Cramer
  private static solve3x3(
    eq1: { a1: number; a2: number; a3: number; b: number },
    eq2: { a1: number; a2: number; a3: number; b: number },
    eq3: { a1: number; a2: number; a3: number; b: number }
  ): Point3D | null {
    const D = 
      eq1.a1 * (eq2.a2 * eq3.a3 - eq2.a3 * eq3.a2) -
      eq1.a2 * (eq2.a1 * eq3.a3 - eq2.a3 * eq3.a1) +
      eq1.a3 * (eq2.a1 * eq3.a2 - eq2.a2 * eq3.a1);

    if (Math.abs(D) < EPSILON) return null; // Planos paralelos o dependientes

    const Dx = 
      eq1.b * (eq2.a2 * eq3.a3 - eq2.a3 * eq3.a2) -
      eq1.a2 * (eq2.b * eq3.a3 - eq2.a3 * eq3.b) +
      eq1.a3 * (eq2.b * eq3.a2 - eq2.a2 * eq3.b);

    const Dy = 
      eq1.a1 * (eq2.b * eq3.a3 - eq2.a3 * eq3.b) -
      eq1.b * (eq2.a1 * eq3.a3 - eq2.a3 * eq3.a1) +
      eq1.a3 * (eq2.a1 * eq3.b - eq2.b * eq3.a1);

    const Dz = 
      eq1.a1 * (eq2.a2 * eq3.b - eq2.b * eq3.a2) -
      eq1.a2 * (eq2.a1 * eq3.b - eq2.b * eq3.a1) +
      eq1.b * (eq2.a1 * eq3.a2 - eq2.a2 * eq3.a1);

    return { x: Dx / D, y: Dy / D, z: Dz / D };
  }
}
