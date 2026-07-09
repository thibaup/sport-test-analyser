import { formatDuration, formatPace } from '../lib/conversions';
import { t, type Language } from '../lib/i18n';
import type { AppAnalysis, PaceUnit } from '../types/lactate';

interface RaceEstimatesProps {
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  language: Language;
}

export function RaceEstimates({ analysis, paceUnit, language }: RaceEstimatesProps) {
  const raceSource = analysis.raceEstimates[0]?.source;
  const hasBlendedEstimates = analysis.raceEstimates.some(
    (estimate) => estimate.source === 'blended',
  );
  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'race')}</p>
          <h2>{t(language, 'raceEstimates')}</h2>
        </div>
      </div>
      <p className="text-sm leading-6 text-slate-600">
        {hasBlendedEstimates
          ? t(language, 'raceBlendNote')
          : raceSource === 'raceTime'
            ? t(language, 'raceRiegelNote')
            : t(language, 'raceEstimateNote')}
      </p>
      {analysis.raceEstimates.length === 0 ? (
        <p className="empty-state">{t(language, 'targetsNeedData')}</p>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {analysis.raceEstimates.map((estimate) => (
              <article key={estimate.distanceLabel} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-950">{estimate.distanceLabel}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatPace(estimate.estimatedPaceSecondsPerKm, paceUnit)}</p>
                  </div>
                  <p className="text-right text-lg font-semibold text-slate-950">{formatDuration(estimate.estimatedTimeSeconds)}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
            <table className="data-table min-w-[480px] border-0">
              <thead>
                <tr>
                  <th>{t(language, 'distance')}</th>
                  <th>{t(language, 'estimatedTime')}</th>
                  <th>{t(language, 'estimatedPace')}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.raceEstimates.map((estimate) => (
                  <tr key={estimate.distanceLabel}>
                    <td className="font-semibold text-slate-950">{estimate.distanceLabel}</td>
                    <td>{formatDuration(estimate.estimatedTimeSeconds)}</td>
                    <td>{formatPace(estimate.estimatedPaceSecondsPerKm, paceUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
