import { formatPace, formatRange } from '../lib/conversions';
import { localizeZone, localizeZoneWarning, t, type Language } from '../lib/i18n';
import type { AppAnalysis, PaceUnit } from '../types/lactate';

interface TrainingZonesProps {
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  language: Language;
}

export function TrainingZones({ analysis, paceUnit, language }: TrainingZonesProps) {
  const zones = analysis.zones.map((zone) => localizeZone(zone, language));
  if (zones.length === 0) {
    return (
      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t(language, 'trainingZonesEyebrow')}</p>
            <h2>{t(language, 'trainingZonesTitle')}</h2>
          </div>
        </div>
        <p className="empty-state">{t(language, 'zonesNeedData')}</p>
      </section>
    );
  }

  const minSpeed = Math.min(...zones.map((zone) => zone.speedFromKmh));
  const maxSpeed = Math.max(...zones.map((zone) => zone.speedToKmh));
  const span = maxSpeed - minSpeed;

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'trainingZonesEyebrow')}</p>
          <h2>{t(language, 'trainingZonesTitle')}</h2>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-12 overflow-hidden rounded-lg">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex min-w-14 items-center justify-center px-2 text-[11px] font-bold text-white"
              style={{
                width: `${Math.max(7, ((zone.speedToKmh - zone.speedFromKmh) / span) * 100)}%`,
                background: zone.color,
              }}
              title={`${zone.name}: ${zone.speedFromKmh}-${zone.speedToKmh} km/h`}
            >
              {zone.name.split(' ')[0]}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{minSpeed.toFixed(1)} km/h</span>
          <span>{maxSpeed.toFixed(1)} km/h</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {zones.map((zone) => (
          <article key={zone.id} className="zone-card">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: zone.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-950">{zone.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {zone.intensity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{zone.purpose}</p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="zone-label">{t(language, 'speed')}</dt>
                    <dd className="zone-value">{formatRange(zone.speedFromKmh, zone.speedToKmh, ' km/h', 1)}</dd>
                  </div>
                  <div>
                    <dt className="zone-label">{t(language, 'pace')}</dt>
                    <dd className="zone-value">
                      {formatPace(zone.paceFromSecondsPerKm, paceUnit)} - {formatPace(zone.paceToSecondsPerKm, paceUnit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="zone-label">{t(language, 'heartRateLabel')}</dt>
                    <dd className="zone-value">
                      {zone.heartRateFrom && zone.heartRateTo
                        ? `${zone.heartRateFrom}-${zone.heartRateTo} bpm`
                        : t(language, 'unavailable')}
                    </dd>
                  </div>
                </dl>
                {zone.warning && (
                  <p className="mt-3 text-xs font-medium text-amber-700">
                    {localizeZoneWarning(zone.warning, language)}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
