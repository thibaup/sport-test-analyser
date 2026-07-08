import { useMemo, useState } from 'react';
import { formatDuration, formatPace, formatRange, round } from '../lib/conversions';
import { localizeTarget, localizeTargetWarning, t, type Language } from '../lib/i18n';
import type { AppAnalysis, PaceUnit, TargetPaceCategory, TargetRecoveryType, ZoneProfile } from '../types/lactate';
import { TrainingProfileControl } from './TrainingProfileControl';

interface TargetPacesProps {
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  language: Language;
  profile: ZoneProfile;
  onProfileChange: (profile: ZoneProfile) => void;
}

export function TargetPaces({ analysis, paceUnit, language, profile, onProfileChange }: TargetPacesProps) {
  const [activeId, setActiveId] = useState<string>('');
  const categories = analysis.targets.map((target) => localizeTarget(target, language));
  const active = useMemo<TargetPaceCategory | undefined>(() => {
    return categories.find((category) => category.id === activeId) ?? categories[0];
  }, [activeId, categories]);

  if (categories.length === 0 || !active) {
    return (
      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t(language, 'targetsEyebrow')}</p>
            <h2>{t(language, 'targetsTitle')}</h2>
          </div>
        </div>
        <TrainingProfileControl language={language} profile={profile} onProfileChange={onProfileChange} />
        <p className="empty-state">{t(language, 'targetsNeedData')}</p>
      </section>
    );
  }

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'targetsEyebrow')}</p>
          <h2>{t(language, 'targetsTitle')}</h2>
        </div>
      </div>

      <TrainingProfileControl language={language} profile={profile} onProfileChange={onProfileChange} />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveId(category.id)}
            className={category.id === active.id ? 'tab-button-active whitespace-nowrap' : 'tab-button whitespace-nowrap'}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.8fr]">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-slate-950">{active.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{active.purpose}</p>
          <dl className="mt-5 grid gap-4">
            <div>
              <dt className="zone-label">{t(language, 'speedRange')}</dt>
              <dd className="zone-value">{formatRange(active.speedFromKmh, active.speedToKmh, ' km/h', 1)}</dd>
            </div>
            <div>
              <dt className="zone-label">{t(language, 'paceRange')}</dt>
              <dd className="zone-value">
                {formatPace(active.paceFromSecondsPerKm, paceUnit)} - {formatPace(active.paceToSecondsPerKm, paceUnit)}
              </dd>
            </div>
          </dl>
          {active.warning && (
            <p className="mt-3 text-xs font-medium text-amber-700">
              {localizeTargetWarning(active.warning, language)}
            </p>
          )}
        </article>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="data-table min-w-[1080px] border-0">
            <thead>
              <tr>
                <th>{t(language, 'distance')}</th>
                <th>{t(language, 'targetWindow')}</th>
                <th>{t(language, 'targetSpeed')}</th>
                <th>{t(language, 'targetPace')}</th>
                <th>{t(language, 'repetitions')}</th>
                <th>{t(language, 'recovery')}</th>
                <th>{t(language, 'totalVolume')}</th>
                <th>{t(language, 'usefulFor')}</th>
              </tr>
            </thead>
            <tbody>
              {active.times.map((time) => (
                <tr key={time.distanceMeters}>
                  <td className="font-semibold text-slate-950">{time.distanceMeters} m</td>
                  <td className="whitespace-nowrap">
                    {formatDuration(time.timeFromSeconds)} - {formatDuration(time.timeToSeconds)}
                  </td>
                  <td className="whitespace-nowrap">{formatRange(time.speedFromKmh, time.speedToKmh, ' km/h', 1)}</td>
                  <td className="whitespace-nowrap">
                    {formatPace(time.paceFromSecondsPerKm, paceUnit)} - {formatPace(time.paceToSecondsPerKm, paceUnit)}
                  </td>
                  <td className="whitespace-nowrap">{formatRepetitions(time.repetitionsFrom, time.repetitionsTo, language)}</td>
                  <td className="whitespace-nowrap">{formatRecovery(time.recoverySeconds, time.recoveryType, language)}</td>
                  <td className="whitespace-nowrap">
                    {formatVolume(time.totalVolumeMetersFrom, time.totalVolumeMetersTo, language)}
                  </td>
                  <td className="min-w-72 text-slate-600">{time.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function formatRepetitions(from: number, to: number, language: Language): string {
  const noun = language === 'nl' ? 'herh.' : 'reps';
  return from === to ? `${from} ${noun}` : `${from}-${to} ${noun}`;
}

function formatRecovery(seconds: number, type: TargetRecoveryType, language: Language): string {
  const label = recoveryTypeLabel(type, language);
  return `${formatDuration(seconds)} ${label}`;
}

function formatVolume(fromMeters: number, toMeters: number, language: Language): string {
  const fromKm = round(fromMeters / 1000, fromMeters < 1000 ? 2 : 1);
  const toKm = round(toMeters / 1000, toMeters < 1000 ? 2 : 1);
  const separator = language === 'nl' ? '-' : '-';
  return fromKm === toKm ? `${fromKm} km` : `${fromKm}${separator}${toKm} km`;
}

function recoveryTypeLabel(type: TargetRecoveryType, language: Language): string {
  const labels: Record<TargetRecoveryType, Record<Language, string>> = {
    easyJog: { en: 'easy jog', nl: 'rustig dribbel' },
    jog: { en: 'jog', nl: 'dribbel' },
    walkJog: { en: 'walk/jog', nl: 'wandelen/dribbelen' },
    walk: { en: 'walk', nl: 'wandelen' },
    full: { en: 'full recovery', nl: 'volledig herstel' },
  };
  return labels[type][language];
}
