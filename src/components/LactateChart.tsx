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
import { samplePolynomialCurve } from '../lib/curveFitting';
import { t, type Language } from '../lib/i18n';
import type { AppAnalysis } from '../types/lactate';

interface LactateChartProps {
  analysis: AppAnalysis;
  language: Language;
}

export function LactateChart({ analysis, language }: LactateChartProps) {
  const validPoints = analysis.curve.filter((point) => !point.invalid && point.lactate !== undefined);
  const smoothData = samplePolynomialCurve(analysis.validPoints).map((point) => ({
    speedKmh: Number(point.speedKmh.toFixed(2)),
    lactate: point.smoothedLactate,
  }));

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'chart')}</p>
          <h2>{t(language, 'lactateCurve')}</h2>
        </div>
      </div>
      <div className="chart-panel">
        {analysis.validPoints.length < 2 ? (
          <EmptyChartMessage language={language} />
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart margin={{ top: 14, right: 24, bottom: 14, left: 6 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="speedKmh"
                type="number"
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                unit=" km/h"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                dataKey="lactate"
                type="number"
                domain={[0, 'dataMax + 1']}
                unit=" mmol/L"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value, name) => [
                  `${Number(value ?? 0).toFixed(2)}${String(name).toLowerCase().includes('lact') ? ' mmol/L' : ''}`,
                  String(name),
                ]}
                labelFormatter={(label) => `${t(language, 'speedLabel')} ${Number(label).toFixed(1)} km/h`}
              />
              <Legend />
              <ReferenceLine y={2} stroke="#0ea5e9" strokeDasharray="6 4" label="2 mmol/L" />
              <ReferenceLine y={4} stroke="#f97316" strokeDasharray="6 4" label="4 mmol/L" />
              {analysis.selectedThresholds.aerobic?.speedKmh && (
                <ReferenceLine
                  x={analysis.selectedThresholds.aerobic.speedKmh}
                  stroke="#0891b2"
                  strokeDasharray="4 3"
                  label="AeT"
                />
              )}
              {analysis.selectedThresholds.anaerobic?.speedKmh && (
                <ReferenceLine
                  x={analysis.selectedThresholds.anaerobic.speedKmh}
                  stroke="#dc2626"
                  strokeDasharray="4 3"
                  label="AnT"
                />
              )}
              <Line
                data={smoothData}
                dataKey="lactate"
                name={t(language, 'lactateCurve')}
                stroke="#0f172a"
                strokeWidth={3}
                dot={false}
                type="monotone"
              />
              <Scatter data={validPoints} dataKey="lactate" name={t(language, 'lactatePoints')} fill="#0284c7" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

export function EmptyChartMessage({ language }: { language: Language }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
      {t(language, 'emptyChart')}
    </div>
  );
}
