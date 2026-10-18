import React, { useMemo, useState } from 'react';
import { ModuleShell, sidebarBasisForColumns } from '../components/io/ModuleShell';
import { TransportEditor } from '../components/transporte/TransportEditor';
import { TransportIntro } from '../components/transporte/TransportIntro';
import { TransportWalkthrough } from '../components/transporte/TransportWalkthrough';
import { ACCENT, cloneDraft, validateDraft } from '../components/transporte/shared';
import { PRESETS, TransportError, solveAll, type MethodId, type SolvedTransport, type TransportInput } from '../core/TransporteSolver';

export const TransportePage: React.FC = () => {
  const initial = cloneDraft(PRESETS[1].data);
  const [draft, setDraft] = useState<TransportInput>(initial);
  const [activePreset, setActivePreset] = useState(PRESETS[1].id);
  const [result, setResult] = useState<SolvedTransport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [methodId, setMethodId] = useState<MethodId>('noroeste');
  const [stepIdx, setStepIdx] = useState(0);

  const issues = useMemo(() => validateDraft(draft), [draft]);
  const sidebarBasisRem = useMemo(
    () => sidebarBasisForColumns(draft.destinations.length, 3.5, 19),
    [draft.destinations.length],
  );

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
    <ModuleShell
      title="Problema del Transporte"
      accent={ACCENT}
      sidebarBasisRem={sidebarBasisRem}
      sidebar={(
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
      )}
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
    </ModuleShell>
  );
};
