import { useState } from "react";
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
} from "recharts";
import { sampleReferenceCurve } from "../lib/referenceThresholds";
import { t, type Language } from "../lib/i18n";
import type { AppAnalysis, ThresholdControls, ValidTestPoint } from "../types/lactate";
import {
  EmptyChartMessage,
  handleChartSelection,
  ThresholdControlsPanel,
} from "./LactateChart";

interface CombinedChartProps {
  analysis: AppAnalysis;
  language: Language;
  thresholdControls: ThresholdControls;
  onThresholdControlsChange: (controls: ThresholdControls) => void;
}

interface ChartClickState {
  activeLabel?: unknown;
  activePayload?: Array<{ payload?: { speedKmh?: unknown } }>;
}

interface CombinedChartPoint {
  speedKmh: number;
  lactate?: number;
  heartRate?: number;
}

export function CombinedChart({
  analysis,
  language,
  thresholdControls,
  onThresholdControlsChange,
}: CombinedChartProps) {
  const [isDraggingThreshold, setIsDraggingThreshold] = useState(false);
  const validPoints = analysis.validPoints;
  const actualPoints = validPoints.map((point) => ({
    step: point.step,
    speedKmh: point.speedKmh,
    lactate: point.lactate,
    heartRate: point.heartRate,
  }));
  const chartData = buildCombinedChartData(validPoints);
  const hasHeartRateLine = chartData.some((point) => point.heartRate !== undefined);
  const hasManualThreshold =
    thresholdControls.aerobicMethod === "manual_lt1" ||
    thresholdControls.anaerobicMethod === "manual_lt2";
  const observedLactates = validPoints
    .map((point) => point.lactate)
    .filter((value): value is number => Number.isFinite(value));
  const chartYMax = Math.max(6, Math.ceil(Math.max(4, ...observedLactates) + 2));

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, "chart")}</p>
          <h2>{t(language, "combinedChart")}</h2>
        </div>
        <ThresholdControlsPanel
          controls={thresholdControls}
          analysis={analysis}
          language={language}
          onChange={onThresholdControlsChange}
        />
      </div>
      <div className="chart-panel">
        {chartData.length < 2 ? (
          <EmptyChartMessage language={language} />
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart
              data={chartData}
              className={hasManualThreshold ? "cursor-crosshair" : undefined}
              margin={{ top: 14, right: hasHeartRateLine ? 54 : 24, bottom: 14, left: 6 }}
              onMouseDown={(state: ChartClickState) => {
                if (!hasManualThreshold) return;
                setIsDraggingThreshold(true);
                handleChartSelection(
                  state,
                  thresholdControls,
                  onThresholdControlsChange,
                );
              }}
              onMouseMove={(state: ChartClickState) => {
                if (isDraggingThreshold)
                  handleChartSelection(
                    state,
                    thresholdControls,
                    onThresholdControlsChange,
                  );
              }}
              onMouseUp={() => setIsDraggingThreshold(false)}
              onMouseLeave={() => setIsDraggingThreshold(false)}
              onClick={(state: ChartClickState) =>
                handleChartSelection(
                  state,
                  thresholdControls,
                  onThresholdControlsChange,
                )
              }
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="speedKmh"
                type="number"
                domain={["dataMin - 0.5", "dataMax + 0.5"]}
                unit=" km/h"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="lactate"
                dataKey="lactate"
                type="number"
                domain={[0, chartYMax]}
                unit=" mmol/L"
                tick={{ fontSize: 12 }}
              />
              {hasHeartRateLine && (
                <YAxis
                  yAxisId="heartRate"
                  dataKey="heartRate"
                  type="number"
                  orientation="right"
                  domain={["dataMin - 8", "dataMax + 8"]}
                  unit=" bpm"
                  tick={{ fontSize: 12 }}
                />
              )}
              <Tooltip
                content={(props) => (
                  <CombinedTooltip {...props} language={language} />
                )}
              />
              <Legend />
              <ReferenceLine
                yAxisId="lactate"
                y={2}
                stroke="#0ea5e9"
                strokeDasharray="6 4"
                label="2 mmol/L"
              />
              <ReferenceLine
                yAxisId="lactate"
                y={4}
                stroke="#f97316"
                strokeDasharray="6 4"
                label="4 mmol/L"
              />
              {analysis.selectedThresholds.aerobic?.speedKmh && (
                <ReferenceLine
                  yAxisId="lactate"
                  x={analysis.selectedThresholds.aerobic.speedKmh}
                  stroke="#0891b2"
                  strokeDasharray="4 3"
                  label="AeT"
                />
              )}
              {analysis.selectedThresholds.anaerobic?.speedKmh && (
                <ReferenceLine
                  yAxisId="lactate"
                  x={analysis.selectedThresholds.anaerobic.speedKmh}
                  stroke="#dc2626"
                  strokeDasharray="4 3"
                  label="AnT"
                />
              )}
              <Line
                yAxisId="lactate"
                dataKey="lactate"
                name={t(language, "lactateCol")}
                stroke="#0284c7"
                strokeWidth={3}
                dot={false}
                type="monotone"
                isAnimationActive={false}
              />
              {hasHeartRateLine && (
                <Line
                  yAxisId="heartRate"
                  dataKey="heartRate"
                  name={t(language, "heartRate")}
                  stroke="#be123c"
                  strokeWidth={3}
                  dot={false}
                  type="monotone"
                  isAnimationActive={false}
                />
              )}
              <Scatter
                yAxisId="lactate"
                data={actualPoints}
                dataKey="lactate"
                name={t(language, "lactatePoints")}
                fill="#0284c7"
                legendType="none"
                isAnimationActive={false}
              />
              {hasHeartRateLine && (
                <Scatter
                  yAxisId="heartRate"
                  data={actualPoints}
                  dataKey="heartRate"
                  name={t(language, "hrPoints")}
                  fill="#be123c"
                  legendType="none"
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function CombinedTooltip({
  active,
  payload,
  label,
  language,
}: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const lactate = payload.find((item) => item.dataKey === "lactate")?.value;
  const heartRate = payload.find((item) => item.dataKey === "heartRate")?.value;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{`${t(language, "speedLabel")} ${Number(label).toFixed(1)} km/h`}</p>
      {lactate !== undefined && Number.isFinite(Number(lactate)) && (
        <p className="mt-1 text-slate-700">{`${t(language, "lactateCol")}: ${Number(lactate).toFixed(2)} mmol/L`}</p>
      )}
      {heartRate !== undefined && Number.isFinite(Number(heartRate)) && (
        <p className="mt-1 text-slate-700">{`${t(language, "heartRate")}: ${Number(heartRate).toFixed(0)} bpm`}</p>
      )}
    </div>
  );
}

function buildCombinedChartData(points: ValidTestPoint[]): CombinedChartPoint[] {
  const lactateCurve = sampleReferenceCurve(points, 220);
  const sortedPoints = [...points].sort(
    (first, second) => first.speedKmh - second.speedKmh,
  );

  return lactateCurve.map((point) => ({
    speedKmh: Number(point.speedKmh.toFixed(2)),
    lactate: Number((point.smoothedLactate ?? 0).toFixed(3)),
    heartRate: interpolateValue(
      point.speedKmh,
      sortedPoints
        .filter((testPoint) => Number.isFinite(testPoint.heartRate))
        .map((testPoint) => ({ x: testPoint.speedKmh, y: testPoint.heartRate as number })),
    ),
  }));
}

function interpolateValue(
  x: number,
  points: Array<{ x: number; y: number }>,
): number | undefined {
  if (points.length === 0) return undefined;
  if (points.length === 1) return points[0].y;
  const sorted = [...points].sort((first, second) => first.x - second.x);
  if (x <= sorted[0].x) return sorted[0].y;
  if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (x >= previous.x && x <= current.x) {
      const span = current.x - previous.x;
      if (span <= 0) return current.y;
      const ratio = (x - previous.x) / span;
      return Number((previous.y + (current.y - previous.y) * ratio).toFixed(2));
    }
  }

  return undefined;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
  language: Language;
}
