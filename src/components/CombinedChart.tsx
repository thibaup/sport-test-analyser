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

interface CombinedChartProps {
  analysis: AppAnalysis;
  language: Language;
}

export function CombinedChart({ analysis, language }: CombinedChartProps) {
  const data = analysis.validPoints.map((point) => ({
    speedKmh: point.speedKmh,
    lactate: point.lactate,
    heartRate: point.heartRate,
  }));

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'chart')}</p>
          <h2>{t(language, 'combinedChart')}</h2>
        </div>
      </div>
      <div className="chart-panel">
        {data.length < 2 ? (
          <EmptyChartMessage language={language} />
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={data} margin={{ top: 14, right: 24, bottom: 14, left: 6 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="speedKmh"
                type="number"
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                unit=" km/h"
                tick={{ fontSize: 12 }}
              />
              <YAxis yAxisId="left" dataKey="lactate" type="number" domain={[0, 'dataMax + 1']} unit=" mmol/L" />
              <YAxis yAxisId="right" orientation="right" dataKey="heartRate" type="number" domain={['dataMin - 8', 'dataMax + 8']} unit=" bpm" />
              <Tooltip content={(props) => <CombinedTooltip {...props} language={language} />} />
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
              <Line yAxisId="left" dataKey="lactate" name={t(language, 'lactateCol')} stroke="#0284c7" strokeWidth={3} dot={false} type="monotone" />
              <Line yAxisId="right" dataKey="heartRate" name={t(language, 'heartRate')} stroke="#be123c" strokeWidth={3} dot={false} type="monotone" />
              <Scatter yAxisId="left" dataKey="lactate" name={t(language, 'lactatePoints')} fill="#0284c7" legendType="none" />
              <Scatter yAxisId="right" dataKey="heartRate" name={t(language, 'hrPoints')} fill="#be123c" legendType="none" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function CombinedTooltip({ active, payload, label, language }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const lactate = payload.find((item) => item.dataKey === 'lactate')?.value;
  const heartRate = payload.find((item) => item.dataKey === 'heartRate')?.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{`${t(language, 'speedLabel')} ${Number(label).toFixed(1)} km/h`}</p>
      {lactate !== undefined && <p className="mt-1 text-slate-700">{`${t(language, 'lactateCol')}: ${Number(lactate).toFixed(2)} mmol/L`}</p>}
      {heartRate !== undefined && <p className="mt-1 text-slate-700">{`${t(language, 'heartRate')}: ${Number(heartRate).toFixed(0)} bpm`}</p>}
    </div>
  );
}

interface TooltipContentProps {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
  language: Language;
}
