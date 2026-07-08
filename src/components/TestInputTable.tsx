import { Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { exampleTestSteps } from '../data/exampleTest';
import {
  calculateDurationSeconds,
  calculateSpeedFromDuration,
  convertDistanceFromDisplay,
  convertDistanceToDisplay,
  formatDuration,
  parsePaceToSecondsPerKm,
  parseTimeToSeconds,
  paceSecondsPerKmToSpeed,
  round,
  speedToPaceSecondsPerKm,
} from '../lib/conversions';
import { localizeWarning, t, type Language } from '../lib/i18n';
import type { DataQualityResult, DistanceUnit, PaceUnit, TestStep } from '../types/lactate';

interface TestInputTableProps {
  steps: TestStep[];
  onChange: (steps: TestStep[]) => void;
  quality: DataQualityResult;
  paceUnit: PaceUnit;
  distanceUnit: DistanceUnit;
  language: Language;
}

type TimeDraft = Record<string, { pace: string; duration: string }>;

export function TestInputTable({ steps, onChange, quality, paceUnit, distanceUnit, language }: TestInputTableProps) {
  const [drafts, setDrafts] = useState<TimeDraft>({});

  useEffect(() => {
    const nextDrafts: TimeDraft = {};
    steps.forEach((step) => {
      nextDrafts[step.id] = {
        pace: step.paceSecondsPerKm ? formatDuration(paceUnit === 'minPerMile' ? step.paceSecondsPerKm * 1.609344 : step.paceSecondsPerKm) : '',
        duration: step.durationSeconds ? formatDuration(step.durationSeconds) : '',
      };
    });
    setDrafts(nextDrafts);
  }, [steps, paceUnit]);

  const warningsByStep = useMemo(() => {
    const map = new Map<string, number>();
    quality.warnings.forEach((warning) => {
      if (!warning.stepId) return;
      map.set(warning.stepId, (map.get(warning.stepId) ?? 0) + 1);
    });
    return map;
  }, [quality.warnings]);

  const setRows = (rows: TestStep[]) => {
    onChange(rows.map((row, index) => ({ ...row, step: index + 1 })));
  };

  const updateStep = (id: string, patch: Partial<TestStep>, source?: 'speed' | 'pace' | 'distance' | 'duration') => {
    const updated = steps.map((step) => {
      if (step.id !== id) return step;
      const next = { ...step, ...patch };
      if (source === 'speed') {
        next.paceSecondsPerKm = speedToPaceSecondsPerKm(next.speedKmh);
        next.durationSeconds = calculateDurationSeconds(next.distanceKm, next.speedKmh);
      }
      if (source === 'pace') {
        next.speedKmh = paceSecondsPerKmToSpeed(next.paceSecondsPerKm);
        next.durationSeconds = calculateDurationSeconds(next.distanceKm, next.speedKmh);
      }
      if (source === 'distance') {
        next.durationSeconds = calculateDurationSeconds(next.distanceKm, next.speedKmh);
      }
      if (source === 'duration') {
        next.speedKmh = calculateSpeedFromDuration(next.distanceKm, next.durationSeconds);
        next.paceSecondsPerKm = speedToPaceSecondsPerKm(next.speedKmh);
      }
      return next;
    });
    setRows(updated);
  };

  const addStep = () => {
    const previous = steps[steps.length - 1];
    const speed = previous?.speedKmh ? round(previous.speedKmh + 0.8, 1) : undefined;
    const distance = previous?.distanceKm ?? 1.6;
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      step: steps.length + 1,
      distanceKm: distance,
      speedKmh: speed,
      paceSecondsPerKm: speedToPaceSecondsPerKm(speed),
      durationSeconds: calculateDurationSeconds(distance, speed),
    };
    setRows([...steps, newStep]);
  };

  const clear = () => {
    setRows([]);
  };

  const loadExample = () => {
    setRows(exampleTestSteps.map((step) => ({ ...step, id: `demo-${step.step}-${Date.now()}` })));
  };

  const deleteStep = (id: string) => {
    setRows(steps.filter((step) => step.id !== id));
  };

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'inputEyebrow')}</p>
          <h2>{t(language, 'inputTitle')}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button" onClick={loadExample} type="button">
            <RotateCcw size={16} aria-hidden="true" />
            {t(language, 'loadExample')}
          </button>
          <button className="secondary-button" onClick={clear} type="button">
            <X size={16} aria-hidden="true" />
            {t(language, 'clear')}
          </button>
          <button className="primary-button" onClick={addStep} type="button">
            <Plus size={16} aria-hidden="true" />
            {t(language, 'addStep')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th>{t(language, 'step')}</th>
              <th>{t(language, 'distanceCol')} ({distanceUnit})</th>
              <th>{t(language, 'speedCol')} (km/h)</th>
              <th>{t(language, 'paceCol')} ({paceUnit === 'minPerMile' ? 'min/mi' : 'min/km'})</th>
              <th>{t(language, 'durationCol')}</th>
              <th>{t(language, 'lactateCol')}</th>
              <th>{t(language, 'hrCol')}</th>
              <th>{t(language, 'rpeCol')} ({t(language, 'optional')})</th>
              <th>{t(language, 'noteCol')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {steps.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-sm text-slate-500">
                  {t(language, 'emptySteps')}
                </td>
              </tr>
            ) : (
              steps.map((step) => {
                const warningCount = warningsByStep.get(step.id) ?? 0;
                return (
                  <tr key={step.id}>
                    <td className="font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        {step.step}
                        {warningCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            {warningCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={convertDistanceToDisplay(step.distanceKm, distanceUnit) ?? ''}
                        onChange={(event) =>
                          updateStep(
                            step.id,
                            {
                              distanceKm: convertDistanceFromDisplay(
                                event.target.value === '' ? undefined : Number(event.target.value),
                                distanceUnit,
                              ),
                            },
                            'distance',
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.1"
                        min="0"
                        value={step.speedKmh ?? ''}
                        onChange={(event) =>
                          updateStep(
                            step.id,
                            { speedKmh: event.target.value === '' ? undefined : Number(event.target.value) },
                            'speed',
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={drafts[step.id]?.pace ?? ''}
                        placeholder="MM:SS"
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [step.id]: { ...(current[step.id] ?? { duration: '' }), pace: event.target.value },
                          }))
                        }
                        onBlur={(event) =>
                          updateStep(step.id, { paceSecondsPerKm: parsePaceToSecondsPerKm(event.target.value, paceUnit) }, 'pace')
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={drafts[step.id]?.duration ?? ''}
                        placeholder="MM:SS"
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [step.id]: { ...(current[step.id] ?? { pace: '' }), duration: event.target.value },
                          }))
                        }
                        onBlur={(event) =>
                          updateStep(step.id, { durationSeconds: parseTimeToSeconds(event.target.value) }, 'duration')
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.1"
                        min="0"
                        value={step.lactate ?? ''}
                        onChange={(event) =>
                          updateStep(step.id, { lactate: event.target.value === '' ? undefined : Number(event.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="1"
                        min="0"
                        value={step.heartRate ?? ''}
                        onChange={(event) =>
                          updateStep(step.id, { heartRate: event.target.value === '' ? undefined : Number(event.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="1"
                        min="0"
                        max="20"
                        value={step.rpe ?? ''}
                        onChange={(event) =>
                          updateStep(step.id, { rpe: event.target.value === '' ? undefined : Number(event.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input min-w-44"
                        value={step.note ?? ''}
                        onChange={(event) => updateStep(step.id, { note: event.target.value })}
                        placeholder={t(language, 'optional')}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button text-rose-600 hover:bg-rose-50"
                        onClick={() => deleteStep(step.id)}
                        aria-label={`${t(language, 'clear')} ${step.step}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {quality.warnings.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">{t(language, 'warnings')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {quality.warnings.slice(0, 8).map((warning) => (
              <span
                key={warning.id}
                className={
                  warning.severity === 'critical'
                    ? 'warning-pill-critical'
                    : warning.severity === 'warning'
                      ? 'warning-pill-warning'
                      : 'warning-pill-info'
                }
              >
                {localizeWarning(warning, language, steps.find((step) => step.id === warning.stepId)?.step)}
              </span>
            ))}
            {quality.warnings.length > 8 && (
              <span className="warning-pill-info">
                +{quality.warnings.length - 8} {t(language, 'moreWarnings')}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
