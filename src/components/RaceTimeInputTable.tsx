import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDuration, parseTimeToSeconds } from '../lib/conversions';
import { t, type Language } from '../lib/i18n';
import type { RaceTime } from '../types/lactate';

interface RaceTimeInputTableProps {
  raceTimes: RaceTime[];
  onChange: (raceTimes: RaceTime[]) => void;
  language: Language;
}

type RaceTimeDrafts = Record<string, string>;

export function RaceTimeInputTable({ raceTimes, onChange, language }: RaceTimeInputTableProps) {
  const [drafts, setDrafts] = useState<RaceTimeDrafts>({});

  useEffect(() => {
    const nextDrafts: RaceTimeDrafts = {};
    raceTimes.forEach((raceTime) => {
      nextDrafts[raceTime.id] = raceTime.timeSeconds ? formatDuration(raceTime.timeSeconds) : '';
    });
    setDrafts(nextDrafts);
  }, [raceTimes]);

  const addRaceTime = () => {
    const previous = raceTimes[raceTimes.length - 1];
    onChange([
      ...raceTimes,
      {
        id: `race-${Date.now()}`,
        distanceMeters: previous?.distanceMeters ?? 5000,
      },
    ]);
  };

  const updateRaceTime = (id: string, patch: Partial<RaceTime>) => {
    onChange(raceTimes.map((raceTime) => (raceTime.id === id ? { ...raceTime, ...patch } : raceTime)));
  };

  const deleteRaceTime = (id: string) => {
    onChange(raceTimes.filter((raceTime) => raceTime.id !== id));
  };

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'raceTimesEyebrow')}</p>
          <h2>{t(language, 'raceTimesTitle')}</h2>
        </div>
        <button className="primary-button" type="button" onClick={addRaceTime}>
          <Plus size={16} aria-hidden="true" />
          {t(language, 'addRaceTime')}
        </button>
      </div>

      <div className="space-y-3 md:hidden">
        {raceTimes.length === 0 ? (
          <p className="empty-state">{t(language, 'emptyRaceTimes')}</p>
        ) : (
          raceTimes.map((raceTime) => (
            <article key={raceTime.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{t(language, 'raceDistanceMeters')}</p>
                <button
                  type="button"
                  className="icon-button text-rose-600 hover:bg-rose-50"
                  onClick={() => deleteRaceTime(raceTime.id)}
                  aria-label={t(language, 'clear')}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="field-label">
                  {t(language, 'raceDistanceMeters')}
                  <input
                    className="table-input"
                    type="number"
                    min="1"
                    step="1"
                    value={raceTime.distanceMeters ?? ''}
                    onChange={(event) =>
                      updateRaceTime(raceTime.id, {
                        distanceMeters: event.target.value === '' ? undefined : Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="field-label">
                  {t(language, 'raceTime')}
                  <input
                    className="table-input"
                    value={drafts[raceTime.id] ?? ''}
                    placeholder="MM:SS"
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [raceTime.id]: event.target.value,
                      }))
                    }
                    onBlur={(event) => updateRaceTime(raceTime.id, { timeSeconds: parseTimeToSeconds(event.target.value) })}
                  />
                </label>
                <label className="field-label col-span-2">
                  {t(language, 'noteCol')}
                  <input
                    className="table-input"
                    value={raceTime.note ?? ''}
                    onChange={(event) => updateRaceTime(raceTime.id, { note: event.target.value })}
                    placeholder={t(language, 'optional')}
                  />
                </label>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="data-table min-w-[640px]">
          <thead>
            <tr>
              <th>{t(language, 'raceDistanceMeters')}</th>
              <th>{t(language, 'raceTime')}</th>
              <th>{t(language, 'noteCol')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {raceTimes.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                  {t(language, 'emptyRaceTimes')}
                </td>
              </tr>
            ) : (
              raceTimes.map((raceTime) => (
                <tr key={raceTime.id}>
                  <td>
                    <input
                      className="table-input"
                      type="number"
                      min="1"
                      step="1"
                      value={raceTime.distanceMeters ?? ''}
                      onChange={(event) =>
                        updateRaceTime(raceTime.id, {
                          distanceMeters: event.target.value === '' ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      value={drafts[raceTime.id] ?? ''}
                      placeholder="MM:SS"
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [raceTime.id]: event.target.value,
                        }))
                      }
                      onBlur={(event) => updateRaceTime(raceTime.id, { timeSeconds: parseTimeToSeconds(event.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="table-input min-w-72"
                      value={raceTime.note ?? ''}
                      onChange={(event) => updateRaceTime(raceTime.id, { note: event.target.value })}
                      placeholder={t(language, 'optional')}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icon-button text-rose-600 hover:bg-rose-50"
                      onClick={() => deleteRaceTime(raceTime.id)}
                      aria-label={t(language, 'clear')}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
