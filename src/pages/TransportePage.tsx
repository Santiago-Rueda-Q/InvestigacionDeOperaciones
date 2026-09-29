import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PRESETS, TransportError, solveAll, type MethodId, type SolvedTransport, type TransportInput } from '../core/TransporteSolver';
import { TransportEditor } from '../components/transporte/TransportEditor';
import { TransportIntro } from '../components/transporte/TransportIntro';
import { TransportWalkthrough } from '../components/transporte/TransportWalkthrough';
import { ACCENT, cloneDraft, validateDraft } from '../components/transporte/shared';

export const TransportePage: React.FC = () => {
  const initial = cloneDraft(PRESETS[1].data);
  const [draft, setDraft] = useState<TransportInput>(initial);
  const [activePreset, setActivePreset] = useState(PRESETS[1].id);
  const [result, setResult] = useState<SolvedTransport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<MethodId>('noroeste');
  const [stepIdx, setStepIdx] = useState(0);

  const issues = useMemo(() => validateDraft(draft), [draft]);

  const clearSolution = () => {
    setResult(null);
    setError(null);
    setStepIdx(0);
  };

  const editDraft = (next: TransportInput) => {
    setDraft(next);
    setActivePreset('');
    clearSolution();
  };

  const loadPreset = (id: string) => {
    const preset = PRESETS.find(item => item.id === id);
    if (!preset) return;
    setDraft(cloneDraft(preset.data));
    setActivePreset(id);
    clearSolution();
  };

  const solve = () => {
    if (issues.length) {
      setError(issues[0]);
      setResult(null);
      return;
    }
    try {
      setResult(solveAll(draft));
      setError(null);
      setStepIdx(0);
      setMethodId('noroeste');
    } catch (err) {
      setResult(null);
      setError(err instanceof TransportError || err instanceof Error ? err.message : 'No se pudo resolver el problema.');
    }
  };

  return (
    <div
      className="min-h-screen lg:h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #060810 0%, #0d1020 45%, #0a0e1a 75%, #050810 100%)' }}
    >
      <header
        className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(6,8,16,0.7)', backdropFilter: 'blur(12px)' }}
      >
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={16} /> Panel Principal
        </Link>
        <h1 className="text-sm font-extrabold text-white">Problema del Transporte</h1>
        <div className="text-xs text-white/25 font-semibold">Unidad 2</div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-5 px-4 md:px-5 py-5 lg:min-h-0 lg:overflow-hidden">
        <aside
          className="w-full lg:w-80 lg:shrink-0 flex flex-col gap-4 lg:overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}40 transparent` }}
        >
          <TransportEditor
            draft={draft}
            activePreset={activePreset}
            issues={issues}
            error={error}
            hasResult={result !== null}
            onChange={editDraft}
            onPreset={loadPreset}
            onSolve={solve}
            onClear={clearSolution}
          />
        </aside>

        <main
          className="flex-1 lg:min-h-0 lg:overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${ACCENT}40 transparent` }}
        >
          {result ? (
            <TransportWalkthrough
              result={result}
              methodId={methodId}
              stepIdx={stepIdx}
              onMethod={id => { setMethodId(id); setStepIdx(0); }}
              onStep={setStepIdx}
            />
          ) : (
            <TransportIntro />
          )}
        </main>
      </div>
    </div>
  );
};
