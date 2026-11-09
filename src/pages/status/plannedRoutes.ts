/** Rutas conocidas del temario que aún no tienen módulo implementado. */
export interface PlannedRoute {
  label: string;
  unit: string;
  note?: string;
}

/** Vacío: todos los temas del microcurrículo ya tienen módulo. */
export const PLANNED_ROUTES: Record<string, PlannedRoute> = {};

export function matchPlanned(pathname: string): PlannedRoute | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PLANNED_ROUTES[clean] ?? null;
}
