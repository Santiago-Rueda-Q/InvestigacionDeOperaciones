import React from 'react';
import { AssignmentWorkbench } from '../components/asignacion/AssignmentWorkbench';
import { HUNGARIAN_PRESETS } from '../core/AsignacionSolver';

export const HungaroPage: React.FC = () => (
  <AssignmentWorkbench
    title="Método de Kuhn–Munkres"
    mode="hungaro"
    presets={HUNGARIAN_PRESETS}
    intro="Recorre el algoritmo húngaro paso a paso: reducción por filas y columnas, cubierta de ceros, ajuste con θ y asignación de ceros independientes. Para maximizar se transforma la matriz con M − c antes de minimizar."
  />
);
