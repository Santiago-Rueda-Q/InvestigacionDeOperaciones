export type OptimizationType = 'MAX' | 'MIN';
export type ConstraintRelation = '<=' | '>=' | '=';
export type StepPhase = 'formulation' | 'standard_form' | 'initial_bfs' | 'tableau';

export interface Constraint {
  id: string;
  coefficients: number[];
  relation: ConstraintRelation;
  rhs: number;
}

export interface SimplexProblem {
  type: OptimizationType;
  numVars: number;
  objectiveCoeffs: number[];
  constraints: Constraint[];
}

export interface SimplexStep {
  iteration: number;
  matrix: number[][];
  headers: string[];
  basis: string[];
  enteringCol?: number;
  leavingRow?: number;
  pivotElement?: number;
  explanationLatex: string;
  isOptimal: boolean;
  isUnbounded?: boolean;
  phase?: StepPhase;
}
