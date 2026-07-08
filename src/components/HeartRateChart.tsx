import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { t, type Language } from '../lib/i18n';
import type { AppAnalysis } from '../types/lactate';
import { EmptyChartMessage } from './LactateChart';

interface HeartRateChartProps {
  analysis: AppAnalysis;
  language: Language;
}

export function HeartRateChart({ analysis, language }: HeartRateChartProps) {
  const hrData = analysis.validPoints
    .filter((point) => point.heartRate !== undefined)
    .map((point) => ({ speedKmh: point.speedKmh, heartRate: point.heartRate, step: point.step }));

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'chart')}</p>
          <h2>{t(language, 'heartRateResponse')}</h2>
        </div>
      </div>
      <div className="chart-panel">
        {hrData.length < 2 ? (
          <EmptyChartMessage language={language} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={hrData} margin={{ top: 14, right: 24, bottom: 14, left: 6 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="speedKmh"
                type="number"
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                unit=" km/h"
                tick={{ fontSize: 12 }}
              />
              <YAxis dataKey="heartRate" type="number" domain={['dataMin - 8', 'dataMax + 8']} unit=" bpm" />
              <Tooltip content={(props) => <HeartRateTooltip {...props} language={language} />} />
              <Legend />
              {analysis.selectedThresholds.aerobic?.speedKmh && (
                <ReferenceLine x={analysis.selectedThresholds.aerobic.speedKmh} stroke="#0891b2" strokeDasharray="4 3" label="AeT" />
              )}
              {analysis.selectedThresholds.anaerobic?.speedKmh && (
                <ReferenceLine
                  x={analysis.selectedThresholds.anaerobic.speedKmh}
                  stroke="#dc2626"
                  strokeDasharray="4 3"
                  label="AnT"
                />
              )}
              {analysis.selectedThresholds.aerobic?.heartRate && (
                <ReferenceLine y={analysis.selectedThresholds.aerobic.heartRate} stroke="#06b6d4" strokeDasharray="6 4" />
              )}
              {analysis.selectedThresholds.anaerobic?.heartRate && (
                <ReferenceLine y={analysis.selectedThresholds.anaerobic.heartRate} stroke="#ef4444" strokeDasharray="6 4" />
              )}
              <Line dataKey="heartRate" name={t(language, 'heartRate')} stroke="#be123c" strokeWidth={3} dot={false} type="monotone" />
              <Scatter dataKey="heartRate" name={t(language, 'hrPoints')} fill="#be123c" legendType="none" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function HeartRateTooltip({ active, payload, label, language }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const heartRate = payload.find((item) => item.dataKey === 'heartRate')?.value;
  if (heartRate === undefined) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{`${t(language, 'speedLabel')} ${Number(label).toFixed(1)} km/h`}</p>
      <p className="mt-1 text-slate-700">{`${t(language, 'heartRate')}: ${Number(heartRate).toFixed(0)} bpm`}</p>
    </div>
  );
}

interface TooltipContentProps {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
  language: Language;
}
