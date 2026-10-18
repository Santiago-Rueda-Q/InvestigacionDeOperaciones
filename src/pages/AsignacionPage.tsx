import React from 'react';
import { AssignmentWorkbench } from '../components/asignacion/AssignmentWorkbench';
import { ASSIGNMENT_PRESETS } from '../core/AsignacionSolver';

export const AsignacionPage: React.FC = () => (
  <AssignmentWorkbench
    title="Problema de Asignación"
    mode="asignacion"
    presets={ASSIGNMENT_PRESETS}
    intro="Asigna cada agente a una sola tarea (y cada tarea a un solo agente) minimizando el costo o maximizando el beneficio. Las matrices rectangulares se balancean con filas o columnas ficticias. El motor usa el algoritmo húngaro."
  />
);
