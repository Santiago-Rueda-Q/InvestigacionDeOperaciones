import React, { useState } from 'react';
import { CheckCircle, XCircle, HelpCircle, ChevronRight, BookOpen, Lightbulb } from 'lucide-react';
import {
  FORMULACION_CASES,
  FormulacionCase,
  generateFeedback,
  SelfEvalQuestion,
  FCase_Constraint,
} from '../core/FormulacionContent';
import { ModuleShell, glass } from '../components/io/ModuleShell';
import { TextWithMath } from '../components/LatexRenderer';
import { LatexRenderer } from '../components/LatexRenderer';
import { HintBanner, ValidationList } from '../components/io/CalculatorChrome';

const ACCENT = '#6366f1';

const sectionTitle = (t: string) => (
  <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">{t}</p>
);

// ── Autoevaluación ────────────────────────────────────────────────

const SelfEvalPanel: React.FC<{ questions: SelfEvalQuestion[] }> = ({ questions }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const answer = (qid: string, idx: number) => {
    setAnswers(p => ({ ...p, [qid]: idx }));
    setRevealed(p => ({ ...p, [qid]: true }));
  };

  const score = questions.filter(q => answers[q.id] === q.correctIndex).length;
  const total = questions.length;
  const done = Object.keys(revealed).length === total;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: `1px solid ${ACCENT}33` }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)', borderLeft: `3px solid ${ACCENT}` }}>
        <HelpCircle size={14} style={{ color: ACCENT }} />
        <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Autoevaluación</span>
        {done && (
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: score === total ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.2)', color: score === total ? '#10b981' : '#fbbf24' }}>
            {score}/{total} correctas
          </span>
        )}
      </div>
      <div className="p-4 space-y-5">
        {questions.map((q, qi) => {
          const userAns = answers[q.id];
          const isRevealed = revealed[q.id] ?? false;
          return (
            <div key={q.id}>
              <p className="text-sm font-semibold text-white/80 mb-2.5">
                <span className="text-white/30 mr-2">{qi + 1}.</span>{q.question}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correctIndex;
                  const isSelected = userAns === oi;
                  let bg = 'rgba(255,255,255,0.03)';
                  let border = '1px solid rgba(255,255,255,0.08)';
                  let textColor = 'rgba(255,255,255,0.6)';
                  if (isRevealed && isCorrect) { bg = 'rgba(16,185,129,0.12)'; border = '1px solid rgba(16,185,129,0.4)'; textColor = '#10b981'; }
                  if (isRevealed && isSelected && !isCorrect) { bg = 'rgba(244,63,94,0.12)'; border = '1px solid rgba(244,63,94,0.4)'; textColor = '#f43f5e'; }
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={isRevealed}
                      onClick={() => answer(q.id, oi)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2"
                      style={{ background: bg, border, color: textColor }}
                    >
                      {isRevealed && isCorrect && <CheckCircle size={12} className="shrink-0" />}
                      {isRevealed && isSelected && !isCorrect && <XCircle size={12} className="shrink-0" />}
                      {!(isRevealed && (isCorrect || (isSelected && !isCorrect))) && <span className="w-3 h-3 rounded-full border border-white/20 inline-block shrink-0" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
              {isRevealed && (
                <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <span style={{ color: ACCENT }}>💡 </span><span className="text-white/60">{q.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Panel de modelo ───────────────────────────────────────────────

const ModelPanel: React.FC<{ cas: FormulacionCase }> = ({ cas }) => {
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const sol = cas.solution;

  return (
    <div className="flex flex-col gap-4">
      {/* Contexto */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{cas.emoji}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>{cas.category}</p>
            <h3 className="text-base font-extrabold text-white">{cas.title}</h3>
          </div>
        </div>
        <TextWithMath text={cas.context} />
      </div>

      {/* Objetivos de aprendizaje */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} style={{ color: ACCENT }} />
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">Objetivos de Aprendizaje</p>
        </div>
        <ul className="space-y-1.5">
          {cas.learningObjectives.map((obj, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/60">
              <ChevronRight size={12} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />
              <span>{obj}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pistas */}
      {showHint && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(8,10,20,0.88)', border: `1px solid ${ACCENT}33` }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={14} style={{ color: '#fbbf24' }} />
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>Pistas</p>
          </div>
          <ul className="space-y-1.5">
            {cas.hints.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span style={{ color: '#fbbf24' }}>→</span><span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowHint(p => !p)}
        className="text-xs font-bold py-2 rounded-lg transition-all"
        style={{ background: 'rgba(251,191,36,0.08)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
      >
        <Lightbulb size={12} className="inline mr-1" />
        {showHint ? 'Ocultar pistas' : 'Mostrar pistas'}
      </button>

      {/* Modelo construido */}
      {showSolution ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(8,10,20,0.88)', border: `1px solid rgba(16,185,129,0.3)` }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.07)', borderLeft: '3px solid #10b981' }}>
            <CheckCircle size={14} style={{ color: '#10b981' }} />
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Modelo Correcto</span>
          </div>
          <div className="p-5 space-y-4">
            {sectionTitle('Variables de Decisión')}
            <div className="space-y-1">
              {sol.variables.map((v, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/70">
                  <span className="font-mono font-bold" style={{ color: ACCENT }}>
                    <LatexRenderer math={v.symbol} />
                  </span>
                  <span>→ {v.description} ({v.unit})</span>
                </div>
              ))}
            </div>
            {sectionTitle('Función Objetivo')}
            <div className="p-3 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <LatexRenderer block math={sol.modelLatex} />
            </div>
            {sectionTitle('Interpretación')}
            <p className="text-xs text-white/60 leading-relaxed">{sol.interpretation}</p>
            <HintBanner accent={ACCENT}>
              Forma canónica: <LatexRenderer math={sol.canonicalLatex} />
            </HintBanner>
          </div>
          <div className="px-4 pb-4">
            <button type="button" onClick={() => setShowSolution(false)}
              className="text-xs font-bold py-2 px-4 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Ocultar solución
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowSolution(true)}
          className="w-full py-3 rounded-xl text-sm font-black transition-all"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`, color: 'white' }}>
          Mostrar Modelo Canónico
        </button>
      )}

      {/* Autoevaluación */}
      <SelfEvalPanel questions={cas.selfEval} />
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────

export const FormulacionPage: React.FC = () => {
  const [caseIdx, setCaseIdx] = useState(0);
  const cas = FORMULACION_CASES[caseIdx];

  const sidebar = (
    <>
      <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 min-w-0" style={glass}>
        <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: ACCENT }}>
            F
          </span>
          Formulación de Modelos
        </h2>

        {sectionTitle('Casos disponibles')}
        <div className="space-y-2">
          {FORMULACION_CASES.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCaseIdx(i)}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              style={{
                background: caseIdx === i ? `${ACCENT}20` : 'rgba(255,255,255,0.03)',
                border: caseIdx === i ? `1px solid ${ACCENT}50` : '1px solid rgba(255,255,255,0.06)',
                color: caseIdx === i ? ACCENT : 'rgba(255,255,255,0.5)',
              }}
            >
              <span className="text-base">{c.emoji}</span>
              <div>
                <div>{c.title}</div>
                <div className="text-[10px] font-normal capitalize text-white/30">{c.category}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={glass}>
        {sectionTitle('Proceso de Formulación')}
        <ol className="space-y-2">
          {[
            'Leer el enunciado',
            'Identificar las variables de decisión',
            'Escribir la función objetivo',
            'Escribir las restricciones',
            'Añadir condiciones de no negatividad',
            'Verificar consistencia del modelo',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-white/50">
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                style={{ background: `${ACCENT}25`, color: ACCENT }}>
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <HintBanner accent={ACCENT}>
        La formulación correcta es la base del éxito en Programación Lineal. Un modelo mal formulado produce
        soluciones sin sentido aunque el algoritmo sea correcto.
      </HintBanner>
    </>
  );

  return (
    <ModuleShell
      title="Formulación de Modelos PL"
      unit="Unidad 1"
      accent={ACCENT}
      sidebarBasisRem={22}
      sidebar={sidebar}
    >
      <ModelPanel key={cas.id} cas={cas} />
    </ModuleShell>
  );
};
