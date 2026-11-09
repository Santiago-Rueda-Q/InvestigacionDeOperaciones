// ────────────────────────────────────────────────────────────────
// Contenido educativo para Formulación de Modelos PL
// ────────────────────────────────────────────────────────────────

export type ConstraintRelSymbol = '<=' | '>=' | '=';

export interface FCase_Variable {
  symbol: string;
  description: string;
  unit: string;
}

export interface FCase_Constraint {
  coeffs: number[];
  rel: ConstraintRelSymbol;
  rhs: number;
  description: string;
}

export interface FCase_Solution {
  type: 'MAX' | 'MIN';
  variables: FCase_Variable[];
  objectiveCoeffs: number[];
  objectiveDesc: string;
  constraints: FCase_Constraint[];
  modelLatex: string;
  canonicalLatex: string;
  interpretation: string;
}

export interface SelfEvalQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface FormulacionCase {
  id: string;
  title: string;
  category: 'produccion' | 'dieta' | 'mezcla';
  emoji: string;
  context: string;
  learningObjectives: string[];
  solution: FCase_Solution;
  hints: string[];
  selfEval: SelfEvalQuestion[];
}

// ────────────────────────────────────────────────────────────────
// Casos
// ────────────────────────────────────────────────────────────────

export const FORMULACION_CASES: FormulacionCase[] = [
  // ── 1. Producción ────────────────────────────────────────────
  {
    id: 'produccion',
    title: 'Mezcla de Producción',
    category: 'produccion',
    emoji: '🏭',
    context:
      'Una fábrica produce dos tipos de muebles: **sillas** (tipo A) y **mesas** (tipo B). ' +
      'Cada silla requiere **2 h de carpintería** y **1 h de pintura**, con una ganancia de **$30**. ' +
      'Cada mesa requiere **4 h de carpintería** y **2 h de pintura**, con una ganancia de **$50**. ' +
      'La fábrica dispone de **40 h semanales de carpintería** y **20 h semanales de pintura**. ' +
      '¿Cuántas unidades de cada tipo se deben fabricar para **maximizar la ganancia**?',
    learningObjectives: [
      'Identificar las variables de decisión de un problema de producción.',
      'Expresar la función objetivo como combinación lineal de las variables.',
      'Modelar restricciones de recursos como inecuaciones lineales.',
      'Escribir el modelo en forma canónica.',
    ],
    solution: {
      type: 'MAX',
      variables: [
        { symbol: 'x_1', description: 'Número de sillas (tipo A) producidas por semana', unit: 'unidades' },
        { symbol: 'x_2', description: 'Número de mesas (tipo B) producidas por semana', unit: 'unidades' },
      ],
      objectiveCoeffs: [30, 50],
      objectiveDesc: 'Ganancia total semanal (en $)',
      constraints: [
        { coeffs: [2, 4], rel: '<=', rhs: 40, description: 'Horas de carpintería disponibles (40 h)' },
        { coeffs: [1, 2], rel: '<=', rhs: 20, description: 'Horas de pintura disponibles (20 h)' },
      ],
      modelLatex:
        '\\begin{aligned}\n' +
        '&\\text{Maximizar} \\quad Z = 30x_1 + 50x_2 \\\\\n' +
        '&\\text{sujeto a:} \\\\\n' +
        '&\\quad 2x_1 + 4x_2 \\leq 40 \\quad (\\text{carpintería}) \\\\\n' +
        '&\\quad x_1 + 2x_2 \\leq 20 \\quad (\\text{pintura}) \\\\\n' +
        '&\\quad x_1,\\; x_2 \\geq 0\n' +
        '\\end{aligned}',
      canonicalLatex:
        '\\text{MAX } Z = 30x_1 + 50x_2 \\quad \\text{s.a.} \\quad Ax \\leq b, \\; x \\geq 0',
      interpretation:
        'El modelo es de tipo **MAX con restricciones ≤** (forma canónica estándar). ' +
        'Puede resolverse directamente con el Método Simplex o el Método Gráfico (2 variables).',
    },
    hints: [
      '¿Cuántas unidades diferentes se producen? Esas son las variables.',
      'La ganancia total es la suma de lo que genera cada producto.',
      'Las limitaciones de horas de trabajo son las restricciones.',
      'No se pueden producir cantidades negativas → x₁, x₂ ≥ 0.',
    ],
    selfEval: [
      {
        id: 'p1',
        question: '¿Cuántas variables de decisión tiene este modelo?',
        options: ['1 (solo la ganancia)', '2 (sillas y mesas)', '3 (sillas, mesas y ganancia)', '4 (horas de cada proceso)'],
        correctIndex: 1,
        explanation: 'Las variables de decisión son las cantidades a determinar: x₁ = sillas y x₂ = mesas.',
      },
      {
        id: 'p2',
        question: '¿Cuál es el coeficiente de x₂ en la restricción de carpintería?',
        options: ['2', '4', '50', '1'],
        correctIndex: 1,
        explanation: 'Cada mesa requiere 4 h de carpintería, por lo tanto el coeficiente de x₂ en esa restricción es 4.',
      },
      {
        id: 'p3',
        question: '¿Cuántas restricciones (sin contar no negatividad) tiene el modelo?',
        options: ['1', '2', '3', '4'],
        correctIndex: 1,
        explanation: 'Hay 2 restricciones de recursos: carpintería y pintura.',
      },
    ],
  },

  // ── 2. Dieta ─────────────────────────────────────────────────
  {
    id: 'dieta',
    title: 'Problema de Dieta',
    category: 'dieta',
    emoji: '🥗',
    context:
      'Un nutricionista diseña una dieta mínimo-costo con dos alimentos: **Alimento A** y **Alimento B**. ' +
      'El Alimento A contiene **3 g de proteína y 1 g de grasa** por porción, con un costo de **$4**. ' +
      'El Alimento B contiene **2 g de proteína y 3 g de grasa** por porción, con un costo de **$6**. ' +
      'Se requieren **al menos 12 g de proteína** y **al menos 9 g de grasa** diariamente. ' +
      '¿Cuántas porciones de cada alimento se deben incluir para **minimizar el costo**?',
    learningObjectives: [
      'Formular un modelo de minimización de costo.',
      'Identificar restricciones de tipo ≥ (requerimientos mínimos).',
      'Reconocer la diferencia entre problemas MAX y MIN en su estructura.',
      'Escribir el dual del problema a partir del primal.',
    ],
    solution: {
      type: 'MIN',
      variables: [
        { symbol: 'x_1', description: 'Porciones del Alimento A por día', unit: 'porciones' },
        { symbol: 'x_2', description: 'Porciones del Alimento B por día', unit: 'porciones' },
      ],
      objectiveCoeffs: [4, 6],
      objectiveDesc: 'Costo total diario (en $)',
      constraints: [
        { coeffs: [3, 2], rel: '>=', rhs: 12, description: 'Requerimiento mínimo de proteína (12 g)' },
        { coeffs: [1, 3], rel: '>=', rhs: 9, description: 'Requerimiento mínimo de grasa (9 g)' },
      ],
      modelLatex:
        '\\begin{aligned}\n' +
        '&\\text{Minimizar} \\quad Z = 4x_1 + 6x_2 \\\\\n' +
        '&\\text{sujeto a:} \\\\\n' +
        '&\\quad 3x_1 + 2x_2 \\geq 12 \\quad (\\text{proteína}) \\\\\n' +
        '&\\quad x_1 + 3x_2 \\geq 9 \\quad (\\text{grasa}) \\\\\n' +
        '&\\quad x_1,\\; x_2 \\geq 0\n' +
        '\\end{aligned}',
      canonicalLatex:
        '\\text{MIN } Z = c^T x \\quad \\text{s.a.} \\quad Ax \\geq b, \\; x \\geq 0',
      interpretation:
        'El modelo es de tipo **MIN con restricciones ≥** (forma canónica de dieta). ' +
        'Su **dual** es un problema MAX con restricciones ≤, relacionado con los precios sombra de los nutrientes.',
    },
    hints: [
      '¿Qué cantidades se debe decidir? Esas son las variables.',
      'El objetivo es minimizar, no maximizar.',
      'Los requerimientos mínimos generan restricciones ≥.',
      'No se permiten porciones negativas.',
    ],
    selfEval: [
      {
        id: 'd1',
        question: '¿Qué tipo de restricciones tiene este problema de dieta?',
        options: ['Restricciones ≤ (límites superiores)', 'Restricciones ≥ (requerimientos mínimos)', 'Restricciones de igualdad (=)', 'No tiene restricciones'],
        correctIndex: 1,
        explanation: 'Los requerimientos mínimos de nutrientes se expresan como restricciones ≥.',
      },
      {
        id: 'd2',
        question: '¿El dual de este problema MIN(≥) es...?',
        options: ['MIN con ≤', 'MAX con ≥', 'MAX con ≤', 'MIN con ='],
        correctIndex: 2,
        explanation: 'El dual de un problema MIN(≥) es un MAX(≤). Los coeficientes de la FO del primal son el RHS del dual, y viceversa.',
      },
      {
        id: 'd3',
        question: '¿Cuál es el coeficiente de x₁ en la función objetivo?',
        options: ['3', '1', '4', '6'],
        correctIndex: 2,
        explanation: 'El costo del Alimento A es $4 por porción, por lo tanto el coeficiente de x₁ en Z es 4.',
      },
    ],
  },

  // ── 3. Mezcla ────────────────────────────────────────────────
  {
    id: 'mezcla',
    title: 'Mezcla de Materiales',
    category: 'mezcla',
    emoji: '⚗️',
    context:
      'Una empresa produce pintura mezclando dos compuestos químicos: **Compuesto P** y **Compuesto Q**. ' +
      'Se requiere que la mezcla final tenga **al menos 30% del ingrediente activo A** y ' +
      '**no más de 50% del ingrediente activo B**. El Compuesto P contiene **40% de A y 30% de B** por litro. ' +
      'El Compuesto Q contiene **20% de A y 60% de B** por litro. ' +
      'Los costos son **$5/L** para P y **$3/L** para Q. Se necesitan **exactamente 100 L** de mezcla. ' +
      '**Minimizar el costo** de la mezcla.',
    learningObjectives: [
      'Formular modelos con restricciones mixtas (≤, ≥ y =).',
      'Manejar porcentajes y proporciones en restricciones.',
      'Identificar cuándo se necesita una restricción de igualdad.',
      'Aplicar la condición de volumen total.',
    ],
    solution: {
      type: 'MIN',
      variables: [
        { symbol: 'x_1', description: 'Litros del Compuesto P en la mezcla', unit: 'litros' },
        { symbol: 'x_2', description: 'Litros del Compuesto Q en la mezcla', unit: 'litros' },
      ],
      objectiveCoeffs: [5, 3],
      objectiveDesc: 'Costo total de la mezcla (en $)',
      constraints: [
        { coeffs: [1, 1], rel: '=', rhs: 100, description: 'Volumen total de 100 litros' },
        { coeffs: [0.4, 0.2], rel: '>=', rhs: 30, description: 'Mínimo 30% de ingrediente A (≥30 L)' },
        { coeffs: [0.3, 0.6], rel: '<=', rhs: 50, description: 'Máximo 50% de ingrediente B (≤50 L)' },
      ],
      modelLatex:
        '\\begin{aligned}\n' +
        '&\\text{Minimizar} \\quad Z = 5x_1 + 3x_2 \\\\\n' +
        '&\\text{sujeto a:} \\\\\n' +
        '&\\quad x_1 + x_2 = 100 \\quad (\\text{volumen total}) \\\\\n' +
        '&\\quad 0.4x_1 + 0.2x_2 \\geq 30 \\quad (\\text{mín. ingrediente A}) \\\\\n' +
        '&\\quad 0.3x_1 + 0.6x_2 \\leq 50 \\quad (\\text{máx. ingrediente B}) \\\\\n' +
        '&\\quad x_1,\\; x_2 \\geq 0\n' +
        '\\end{aligned}',
      canonicalLatex:
        '\\text{MIN } Z = c^T x \\quad \\text{s.a.} \\quad A_= x = b_=,\\; A_{\\leq} x \\leq b_{\\leq},\\; A_{\\geq} x \\geq b_{\\geq},\\; x \\geq 0',
      interpretation:
        'El modelo tiene **restricciones mixtas** (=, ≥ y ≤). Para el Simplex se convierte a forma estándar ' +
        'usando variables de holgura (para ≤), variables de exceso (para ≥) y variables artificiales (para = y ≥).',
    },
    hints: [
      'Las dos cantidades a decidir son los litros de cada compuesto.',
      'El volumen total fijo genera una restricción de igualdad (=).',
      'Los límites de porcentaje se multiplican por el volumen total para obtener los RHS.',
      'Los porcentajes se aplican a toda la mezcla (100 L): 30% de 100 L = 30 L.',
    ],
    selfEval: [
      {
        id: 'm1',
        question: '¿Por qué hay una restricción de igualdad (=) en este modelo?',
        options: [
          'Porque el costo debe ser igual a cero',
          'Porque el volumen total es fijo en 100 litros',
          'Porque los ingredientes A y B deben ser iguales',
          'Porque es un problema de minimización',
        ],
        correctIndex: 1,
        explanation: 'La restricción x₁ + x₂ = 100 impone que el volumen total de la mezcla sea exactamente 100 litros.',
      },
      {
        id: 'm2',
        question: '¿Cuántas restricciones (sin no negatividad) tiene el modelo?',
        options: ['1', '2', '3', '4'],
        correctIndex: 2,
        explanation: 'Hay 3 restricciones: volumen total (=), mínimo de A (≥) y máximo de B (≤).',
      },
      {
        id: 'm3',
        question: 'Para convertir "mínimo 30% de A" a una restricción numérica se usa...',
        options: [
          '0.3 × (x₁ + x₂) ≥ 100',
          '0.4x₁ + 0.2x₂ ≥ 0.30',
          '0.4x₁ + 0.2x₂ ≥ 30',
          '30x₁ + 20x₂ ≥ 100',
        ],
        correctIndex: 2,
        explanation: '30% de los 100 L totales = 30 L. Cada litro de P aporta 0.4 L de A y cada litro de Q aporta 0.2 L de A.',
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// Utilidades de validación del modelo construido por el usuario
// ────────────────────────────────────────────────────────────────

/** Verifica si los coeficientes del usuario coinciden (con tolerancia) con los del caso. */
export function checkCoefficients(
  userCoeffs: number[],
  expected: number[],
  tol = 0.01
): boolean {
  if (userCoeffs.length !== expected.length) return false;
  return userCoeffs.every((v, i) => Math.abs(v - expected[i]) <= tol);
}

/** Genera retroalimentación detallada comparando el modelo del usuario con la solución. */
export function generateFeedback(
  caseId: string,
  userType: 'MAX' | 'MIN',
  userObjCoeffs: number[],
  userConstraints: Array<{ coeffs: number[]; rel: ConstraintRelSymbol; rhs: number }>
): { correct: boolean; messages: string[] } {
  const cas = FORMULACION_CASES.find(c => c.id === caseId);
  if (!cas) return { correct: false, messages: ['Caso no encontrado.'] };
  const sol = cas.solution;

  const messages: string[] = [];
  let correct = true;

  // Verificar tipo de optimización
  if (userType !== sol.type) {
    correct = false;
    messages.push(`El tipo de optimización debería ser **${sol.type}**, no ${userType}.`);
  }

  // Verificar coeficientes de la FO
  if (!checkCoefficients(userObjCoeffs, sol.objectiveCoeffs)) {
    correct = false;
    messages.push(
      `Los coeficientes de la función objetivo no coinciden. Esperado: [${sol.objectiveCoeffs.join(', ')}].`
    );
  }

  // Verificar restricciones
  if (userConstraints.length !== sol.constraints.length) {
    correct = false;
    messages.push(
      `El modelo debe tener ${sol.constraints.length} restricción(es), pero se detectaron ${userConstraints.length}.`
    );
  } else {
    sol.constraints.forEach((sc, i) => {
      const uc = userConstraints[i];
      if (!uc) return;
      if (!checkCoefficients(uc.coeffs, sc.coeffs)) {
        correct = false;
        messages.push(`Restricción ${i + 1}: coeficientes incorrectos. Esperado: [${sc.coeffs.join(', ')}].`);
      }
      if (uc.rel !== sc.rel) {
        correct = false;
        messages.push(`Restricción ${i + 1}: la relación debería ser "${sc.rel}", no "${uc.rel}".`);
      }
      if (Math.abs(uc.rhs - sc.rhs) > 0.01) {
        correct = false;
        messages.push(`Restricción ${i + 1}: el RHS debería ser ${sc.rhs}, no ${uc.rhs}.`);
      }
    });
  }

  if (correct) {
    messages.push('✅ ¡Formulación correcta! El modelo captura adecuadamente el problema.');
  }

  return { correct, messages };
}
