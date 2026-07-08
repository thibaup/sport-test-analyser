import { formatDuration, formatPace } from '../lib/conversions';
import { t, type Language } from '../lib/i18n';
import type { AppAnalysis, PaceUnit } from '../types/lactate';

interface RaceEstimatesProps {
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  language: Language;
}

export function RaceEstimates({ analysis, paceUnit, language }: RaceEstimatesProps) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'race')}</p>
          <h2>{t(language, 'raceEstimates')}</h2>
        </div>
      </div>
      <p className="text-sm leading-6 text-slate-600">{t(language, 'raceEstimateNote')}</p>
      {analysis.raceEstimates.length === 0 ? (
        <p className="empty-state">{t(language, 'targetsNeedData')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="data-table min-w-[540px] border-0">
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
      )}
    </section>
  );
}
