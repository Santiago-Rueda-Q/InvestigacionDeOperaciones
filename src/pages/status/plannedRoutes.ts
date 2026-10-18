/** Rutas conocidas del temario que aún no tienen módulo implementado. */
export interface PlannedRoute {
  label: string;
  unit: string;
  note?: string;
}

export const PLANNED_ROUTES: Record<string, PlannedRoute> = {
  '/unidad1/formulacion': { label: 'Formulación de Modelos', unit: 'Unidad 1', note: 'En preparación' },
  '/unidad1/grafico': { label: 'Método Gráfico', unit: 'Unidad 1' },
  '/unidad1/dualidad': { label: 'Dualidad', unit: 'Unidad 1' },
  '/unidad1/sensibilidad': { label: 'Análisis de Sensibilidad', unit: 'Unidad 1' },
  '/unidad1/simplex-revisado': { label: 'Simplex Revisado', unit: 'Unidad 1', note: 'Disponible dentro de Método Simplex' },
  '/unidad2/arbol': { label: 'Árbol de Mínimo Recorrido', unit: 'Unidad 2' },
  '/unidad3/dinamica': { label: 'Programación Dinámica', unit: 'Unidad 3' },
  '/unidad3/entera': { label: 'Programación Entera', unit: 'Unidad 3' },
  '/unidad3/no-lineal': { label: 'Programación No Lineal', unit: 'Unidad 3' },
  '/unidad3/colas': { label: 'Teoría de Colas', unit: 'Unidad 3' },
};

export function matchPlanned(pathname: string): PlannedRoute | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PLANNED_ROUTES[clean] ?? null;
}
