import { Activity, Gauge, HeartPulse, ShieldCheck, Timer, TrendingUp } from 'lucide-react';
import { formatPace, formatSpeed, round } from '../lib/conversions';
import { t, type Language } from '../lib/i18n';
import type { AppAnalysis, PaceUnit, SummaryMetric } from '../types/lactate';

interface SummaryCardsProps {
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  language: Language;
}

export function SummaryCards({ analysis, paceUnit, language }: SummaryCardsProps) {
  const { selectedThresholds, validPoints } = analysis;
  const aerobic = selectedThresholds.aerobic;
  const anaerobic = selectedThresholds.anaerobic;
  const maxSpeed = validPoints.length ? Math.max(...validPoints.map((point) => point.speedKmh)) : undefined;
  const heartRateValues = validPoints.map((point) => point.heartRate).filter((value): value is number => Boolean(value));
  const maxHeartRate = heartRateValues.length ? Math.max(...heartRateValues) : undefined;
  const maxLactate = analysis.maxLactate.value;
  const lactateLabel = language === 'nl' ? 'lactaat' : 'lactate';

  const metrics: SummaryMetric[] = [
    {
      label: t(language, 'aerobicSpeed'),
      value: formatSpeed(aerobic?.speedKmh),
      detail: aerobic?.paceSecondsPerKm ? formatPace(aerobic.paceSecondsPerKm, paceUnit) : aerobic?.insufficientReason,
      tone: aerobic?.speedKmh ? 'good' : 'warning',
    },
    {
      label: t(language, 'aerobicHr'),
      value: aerobic?.heartRate ? `${aerobic.heartRate} bpm` : '-',
      detail: aerobic?.lactate ? `${aerobic.lactate} mmol/L ${lactateLabel}` : aerobic?.insufficientReason,
    },
    {
      label: t(language, 'anaerobicSpeed'),
      value: formatSpeed(anaerobic?.speedKmh),
      detail: anaerobic?.paceSecondsPerKm ? formatPace(anaerobic.paceSecondsPerKm, paceUnit) : anaerobic?.insufficientReason,
      tone: anaerobic?.speedKmh ? 'good' : 'warning',
    },
    {
      label: t(language, 'anaerobicHr'),
      value: anaerobic?.heartRate ? `${anaerobic.heartRate} bpm` : '-',
      detail: anaerobic?.lactate ? `${anaerobic.lactate} mmol/L ${lactateLabel}` : anaerobic?.insufficientReason,
    },
    {
      label: t(language, 'maxSpeed'),
      value: formatSpeed(maxSpeed),
      detail: maxSpeed ? formatPace(3600 / maxSpeed, paceUnit) : t(language, 'addValidData'),
    },
    {
      label: t(language, 'maxHr'),
      value: maxHeartRate ? `${maxHeartRate} bpm` : '-',
      detail: t(language, 'highestValidHr'),
    },
    {
      label: t(language, 'maxLactate'),
      value: maxLactate ? `${round(maxLactate, 1)} mmol/L` : '-',
      detail:
        analysis.maxLactate.source === 'allOut'
          ? t(language, 'allOutLactateSource')
          : t(language, 'highestValidLactate'),
    },
  ];

  const icons = [Gauge, HeartPulse, TrendingUp, HeartPulse, Timer, Activity, ShieldCheck];

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'summaryEyebrow')}</p>
          <h2>{t(language, 'summaryTitle')}</h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = icons[index];
          return (
            <article key={metric.label} className="metric-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
                </div>
                <div
                  className={
                    metric.tone === 'warning'
                      ? 'metric-icon-warning'
                      : metric.tone === 'good'
                        ? 'metric-icon-good'
                        : 'metric-icon'
                  }
                >
                  <Icon size={19} aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 min-h-10 text-sm leading-5 text-slate-600">{metric.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
