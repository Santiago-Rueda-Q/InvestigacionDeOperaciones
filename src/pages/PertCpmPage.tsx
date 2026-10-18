import React, { useMemo, useState } from 'react';
import { FilePlus2, Plus, Trash2 } from 'lucide-react';
import { TextWithMath } from '../components/LatexRenderer';
import { ModuleShell, glass, inputClass, sidebarBasisForRows } from '../components/io/ModuleShell';
import { NetworkBoard } from '../components/io/NetworkBoard';
import { ClearButton, HintBanner, SolveButton, ValidationList } from '../components/io/CalculatorChrome';
import { StepBar } from '../components/transporte/StepBar';
import {
  PERT_CPM_PRESETS,
  PertCpmError,
  blankPertCpm,
  type ActivityInput,
  type NetworkMode,
  type PertCpmResult,
  solvePertCpm,
  validatePertCpmInput,
} from '../core/PertCpmSolver';

const ACCENT = '#10b981';

function cloneActs(acts: ActivityInput[]): ActivityInput[] {
  return acts.map(a => ({ ...a, preds: [...a.preds] }));
}

export const PertCpmPage: React.FC = () => {
  const initial = PERT_CPM_PRESETS[0];
  const [mode, setMode] = useState<NetworkMode>(initial.data.mode);
  const [activities, setActivities] = useState(cloneActs(initial.data.activities));
  const [presetId, setPresetId] = useState(initial.id);
  const [result, setResult] = useState<PertCpmResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const draft = useMemo(() => ({ mode, activities }), [mode, activities]);
  const issues = useMemo(() => validatePertCpmInput(draft), [draft]);
  const ids = activities.map(a => a.id);

  const clear = () => { setResult(null); setError(null); setStepIdx(0); };
  const touch = () => { setPresetId(''); clear(); };

  const load = (id: string) => {
    const p = PERT_CPM_PRESETS.find(x => x.id === id);
    if (!p) return;
    setMode(p.data.mode);
    setActivities(cloneActs(p.data.activities));
    setPresetId(id);
    clear();
  };

  const startBlank = () => {
    const b = blankPertCpm(mode);
    setMode(b.mode);
    setActivities(cloneActs(b.activities));
    setPresetId('');
    clear();
  };

  const setModeAndTouch = (m: NetworkMode) => {
    setMode(m);
    setActivities(acts => acts.map(a => {
      if (m === 'cpm') {
        const te = Number.isFinite(a.a) && Number.isFinite(a.m) && Number.isFinite(a.b)
          ? Math.round(((a.a! + 4 * a.m! + a.b!) / 6) * 1000) / 1000
          : (a.duration ?? 1);
        return { id: a.id, name: a.name, preds: a.preds, duration: te };
      }
      const d = a.duration ?? 3;
      return { id: a.id, name: a.name, preds: a.preds, a: Math.max(0, d - 1), m: d, b: d + 1 };
    }));
    setPresetId('');
    clear();
  };

  const patchAct = (index: number, next: Partial<ActivityInput>) => {
    setActivities(acts => acts.map((a, i) => (i === index ? { ...a, ...next } : a)));
    touch();
  };

  const togglePred = (index: number, predId: string) => {
    setActivities(acts => acts.map((a, i) => {
      if (i !== index) return a;
      const has = a.preds.includes(predId);
      return { ...a, preds: has ? a.preds.filter(p => p !== predId) : [...a.preds, predId] };
    }));
    touch();
  };

  const addActivity = () => {
    const n = activities.length + 1;
    const id = String.fromCharCode(64 + Math.min(n, 26)) + (n > 26 ? String(n) : '');
    const base: ActivityInput = mode === 'cpm'
      ? { id, name: id, preds: [], duration: 1 }
      : { id, name: id, preds: [], a: 1, m: 2, b: 3 };
    setActivities(acts => [...acts, base]);
    touch();
  };

  const removeActivity = (index: number) => {
    const removed = activities[index]?.id;
    setActivities(acts => acts
      .filter((_, i) => i !== index)
      .map(a => ({ ...a, preds: a.preds.filter(p => p !== removed) })));
    touch();
  };

  const solve = () => {
    if (busy) return;
    if (issues.length) { setError(issues[0]); return; }
    setBusy(true);
    try {
      setResult(solvePertCpm(draft));
      setError(null);
      setStepIdx(0);
    } catch (err) {
      setResult(null);
      setError(err instanceof PertCpmError || err instanceof Error ? err.message : 'No se pudo resolver.');
    } finally {
      setBusy(false);
    }
  };

  const step = result?.steps[stepIdx];
  const boardNodes = ['Inicio', ...ids, 'Fin'];
  const boardEdges = (() => {
    const crit = new Set(result?.criticalPath ?? []);
    const edges: { id: string; from: string; to: string; label: string; active?: boolean; muted?: boolean }[] = [];
    activities.forEach(a => {
      if (!a.preds.length) {
        edges.push({
          id: `start-${a.id}`,
          from: 'Inicio',
          to: a.id,
          label: '',
          active: result ? crit.has(a.id) : false,
        });
      }
      a.preds.forEach(p => {
        edges.push({
          id: `${p}-${a.id}`,
          from: p,
          to: a.id,
          label: '',
          active: result ? crit.has(p) && crit.has(a.id) : false,
        });
      });
      const hasSucc = activities.some(o => o.preds.includes(a.id));
      if (!hasSucc) {
        edges.push({
          id: `${a.id}-end`,
          from: a.id,
          to: 'Fin',
          label: result ? String(result.activities.find(x => x.id === a.id)?.duration ?? '') : '',
          active: result ? crit.has(a.id) : false,
        });
      }
    });
    return edges;
  })();

  return (
    <ModuleShell
      title="Redes PERT y CPM"
      accent={ACCENT}
      sidebarBasisRem={sidebarBasisForRows(activities.length, 1.2, 22, 36)}
      sidebar={(
        <>
          <div className="rounded-2xl p-4 @[28rem]/sidebar:p-5 space-y-3 min-w-0" style={glass}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-white">Actividades</h2>
              <button
                type="button"
                onClick={startBlank}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' }}
              >
                <FilePlus2 size={12} /> Personalizado
              </button>
            </div>

            <div className="flex gap-2">
              {(['cpm', 'pert'] as NetworkMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeAndTouch(m)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: mode === m ? ACCENT : 'rgba(255,255,255,0.05)',
                    color: mode === m ? 'white' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {m === 'cpm' ? 'CPM' : 'PERT'}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Ejemplos (editables)</p>
            <div className="grid grid-cols-1 @[26rem]/sidebar:grid-cols-2 gap-1.5">
              {PERT_CPM_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => load(p.id)}
                  className="text-left px-3 py-2 rounded-xl min-w-0"
                  style={{
                    background: presetId === p.id ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                    border: presetId === p.id ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="text-xs font-bold text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-white/40 line-clamp-2">{p.blurb}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Lista</span>
              <button type="button" onClick={addActivity} className="text-[10px] font-bold flex items-center gap-1" style={{ color: ACCENT }}>
                <Plus size={11} /> actividad
              </button>
            </div>

            <div className="space-y-2">
              {activities.map((a, i) => (
                <div
                  key={`${a.id}-${i}`}
                  className="rounded-xl p-2.5 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="grid grid-cols-[4rem_1fr_1.75rem] gap-1.5 items-center">
                    <input
                      value={a.id}
                      className={inputClass}
                      title="Id"
                      onChange={e => patchAct(i, { id: e.target.value })}
                    />
                    <input
                      value={a.name}
                      className={inputClass}
                      title="Nombre"
                      onChange={e => patchAct(i, { name: e.target.value })}
                    />
                    <button
                      type="button"
                      disabled={activities.length <= 1}
                      onClick={() => removeActivity(i)}
                      className="h-9 flex items-center justify-center rounded-lg text-red-400/60 disabled:opacity-20"
                      style={{ background: 'rgba(244,63,94,0.08)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {mode === 'cpm' ? (
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-white/30">
                      Duración
                      <input
                        type="number"
                        min={0}
                        value={Number.isFinite(a.duration) ? a.duration : ''}
                        className={`${inputClass} mt-0.5`}
                        onChange={e => patchAct(i, { duration: Number(e.target.value) })}
                      />
                    </label>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        ['a', 'a'],
                        ['m', 'm'],
                        ['b', 'b'],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="block text-[9px] font-bold uppercase tracking-wider text-white/30">
                          {label}
                          <input
                            type="number"
                            min={0}
                            value={Number.isFinite(a[key]) ? a[key] : ''}
                            className={`${inputClass} mt-0.5`}
                            onChange={e => patchAct(i, { [key]: Number(e.target.value) })}
                          />
                        </label>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mb-1">Predecesoras</p>
                    <div className="flex flex-wrap gap-1">
                      {ids.filter(id => id !== a.id).map(pid => {
                        const on = a.preds.includes(pid);
                        return (
                          <button
                            key={pid}
                            type="button"
                            onClick={() => togglePred(i, pid)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{
                              background: on ? `${ACCENT}33` : 'rgba(255,255,255,0.04)',
                              color: on ? '#6ee7b7' : 'rgba(255,255,255,0.4)',
                              border: on ? `1px solid ${ACCENT}` : '1px solid rgba(255,255,255,0.08)',
                            }}
                          >
                            {pid}
                          </button>
                        );
                      })}
                      {ids.filter(id => id !== a.id).length === 0 && (
                        <span className="text-[10px] text-white/30">Sin otras actividades</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SolveButton label="Calcular red" disabled={issues.length > 0} busy={busy} accent={ACCENT} onClick={solve} />
          {result && <ClearButton onClick={clear} />}
          <ValidationList issues={issues} error={error} />
          {!result && issues.length === 0 && (
            <HintBanner accent={ACCENT}>
              {mode === 'cpm'
                ? 'CPM usa duraciones fijas. Al editar se limpia la solución anterior.'
                : 'PERT usa a ≤ m ≤ b; te y σ² se calculan al resolver.'}
            </HintBanner>
          )}
        </>
      )}
    >
      {!result ? (
        <div className="rounded-2xl p-6 space-y-3" style={glass}>
          <h2 className="text-xl font-extrabold text-white">Redes PERT y CPM</h2>
          <p className="text-sm text-white/50">
            Calcula tiempos earliest/latest, holguras y la ruta crítica (Activity-on-Node).
            En PERT se estiman $t_e$ y la varianza del proyecto sobre la ruta crítica.
          </p>
          <TextWithMath
            text={mode === 'cpm'
              ? '$$ES_j=\\max EF_i,\\; EF_j=ES_j+t_j,\\; H_j=LS_j-ES_j$$'
              : '$$t_e=\\dfrac{a+4m+b}{6},\\quad \\sigma^2=\\left(\\dfrac{b-a}{6}\\right)^2$$'}
          />
          <NetworkBoard nodes={boardNodes} edges={boardEdges} source="Inicio" sink="Fin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl p-4" style={glass}>
            <div className="text-xs uppercase tracking-wider text-white/35 font-bold">
              {result.mode === 'cpm' ? 'Duración del proyecto (CPM)' : 'Tiempo esperado del proyecto (PERT)'}
            </div>
            <div className="text-3xl font-black mt-1" style={{ color: ACCENT }}>
              T = {result.projectDuration}
            </div>
            <p className="text-sm text-white/60 mt-2">
              Ruta crítica: <span className="text-white font-semibold">{result.criticalPath.join(' → ')}</span>
            </p>
            {result.mode === 'pert' && (
              <p className="text-xs text-white/40 mt-1">
                σ²_T = {result.projectVariance} · σ_T ≈ {result.projectSigma}
              </p>
            )}
            <p className="text-[11px] text-white/35 mt-2">{result.message.replace(/\$/g, '')}</p>
          </div>

          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2 px-1">
              Procedimiento paso a paso
            </p>
            <StepBar
              count={result.steps.length}
              index={stepIdx}
              titles={result.steps.map(s => s.title)}
              label={step?.title ?? ''}
              title={step?.title ?? ''}
              accent={ACCENT}
              onChange={setStepIdx}
            />
          </div>

          {step && (
            <div className="rounded-2xl p-5" style={{ ...glass, borderLeft: `3px solid ${ACCENT}` }}>
              <TextWithMath text={step.body} />
            </div>
          )}

          <div className="rounded-2xl p-4" style={glass}>
            <NetworkBoard nodes={boardNodes} edges={boardEdges} source="Inicio" sink="Fin" />
            <p className="text-[10px] text-white/35 mt-2">En verde: aristas de la ruta crítica.</p>
          </div>

          <div className="rounded-2xl p-4 overflow-x-auto" style={glass}>
            <table className="w-full text-xs text-white/70">
              <thead>
                <tr className="text-white/40">
                  <th className="text-left py-1">Act.</th>
                  <th>t</th>
                  {result.mode === 'pert' && <th>σ²</th>}
                  <th>ES</th>
                  <th>EF</th>
                  <th>LS</th>
                  <th>LF</th>
                  <th>H</th>
                </tr>
              </thead>
              <tbody>
                {result.activities.map(a => (
                  <tr
                    key={a.id}
                    style={{
                      background: a.critical ? `${ACCENT}18` : undefined,
                      color: a.critical ? '#a7f3d0' : undefined,
                    }}
                  >
                    <td className="py-1 font-semibold text-white">{a.id}</td>
                    <td className="text-center">{a.duration}</td>
                    {result.mode === 'pert' && <td className="text-center">{a.variance}</td>}
                    <td className="text-center">{a.ES}</td>
                    <td className="text-center">{a.EF}</td>
                    <td className="text-center">{a.LS}</td>
                    <td className="text-center">{a.LF}</td>
                    <td className="text-center font-bold">{a.slack}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModuleShell>
  );
};
