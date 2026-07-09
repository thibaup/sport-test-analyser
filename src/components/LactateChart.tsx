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
import { useState } from 'react';
import { round } from '../lib/conversions';
import { lt1MethodOptions, lt2MethodOptions } from '../lib/lactateThresholds';
import { sampleReferenceCurve } from '../lib/referenceThresholds';
import { t, type Language } from '../lib/i18n';
import type { AppAnalysis, Lt1MethodId, Lt2MethodId, ManualThresholdTarget, ThresholdControls } from '../types/lactate';

interface LactateChartProps {
  analysis: AppAnalysis;
  language: Language;
  thresholdControls: ThresholdControls;
  onThresholdControlsChange: (controls: ThresholdControls) => void;
}

interface ChartClickState {
  activeLabel?: unknown;
  activePayload?: Array<{ payload?: { speedKmh?: unknown } }>;
}

interface TooltipPayloadItem {
  dataKey?: unknown;
  value?: unknown;
  payload?: {
    speedKmh?: unknown;
    lactate?: unknown;
    smoothedLactate?: unknown;
  };
  color?: string;
  name?: unknown;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: unknown;
  language: Language;
}

export function LactateChart({
  analysis,
  language,
  thresholdControls,
  onThresholdControlsChange,
}: LactateChartProps) {
  const [isDraggingThreshold, setIsDraggingThreshold] = useState(false);
  const validPoints = analysis.curve.filter((point) => !point.invalid && point.lactate !== undefined);
  const observedLactates = validPoints
    .map((point) => point.lactate)
    .filter((value): value is number => Number.isFinite(value));
  const rawMaxLactate = Math.max(4, ...observedLactates);
  const chartYMax = Math.max(6, Math.ceil(rawMaxLactate + 2));
  const smoothData = sampleReferenceCurve(analysis.validPoints)
    .map((point) => ({
      speedKmh: Number(point.speedKmh.toFixed(2)),
      lactate: point.smoothedLactate,
    }))
    .filter((point) => Number.isFinite(point.speedKmh) && Number.isFinite(point.lactate))
    .map((point) => ({
      ...point,
      lactate: Math.min(Math.max(point.lactate ?? 0, 0), chartYMax),
    }));
  const hasManualThreshold =
    thresholdControls.aerobicMethod === 'manual_lt1' || thresholdControls.anaerobicMethod === 'manual_lt2';

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'chart')}</p>
          <h2>{t(language, 'lactateCurve')}</h2>
        </div>
        <ThresholdControlsPanel
          controls={thresholdControls}
          analysis={analysis}
          language={language}
          onChange={onThresholdControlsChange}
        />
      </div>
      <div className="chart-panel">
        {analysis.validPoints.length < 2 ? (
          <EmptyChartMessage language={language} />
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart
              data={smoothData}
              className={hasManualThreshold ? 'cursor-crosshair' : undefined}
              margin={{ top: 14, right: 24, bottom: 14, left: 6 }}
              onMouseDown={(state: ChartClickState) => {
                if (!hasManualThreshold) return;
                setIsDraggingThreshold(true);
                handleChartSelection(state, thresholdControls, onThresholdControlsChange);
              }}
              onMouseMove={(state: ChartClickState) => {
                if (isDraggingThreshold) handleChartSelection(state, thresholdControls, onThresholdControlsChange);
              }}
              onMouseUp={() => setIsDraggingThreshold(false)}
              onMouseLeave={() => setIsDraggingThreshold(false)}
              onClick={(state: ChartClickState) => handleChartSelection(state, thresholdControls, onThresholdControlsChange)}
            >
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
                domain={[0, chartYMax]}
                unit=" mmol/L"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={(props) => <LactateTooltip {...props} language={language} />} />
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

function LactateTooltip({ active, payload, label, language }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const lactatePoint = payload.find((item) => item.dataKey === 'lactate' && item.payload?.lactate !== undefined);
  const speed = Number(lactatePoint?.payload?.speedKmh ?? label);
  const lactate = Number(lactatePoint?.value ?? lactatePoint?.payload?.lactate);
  if (!Number.isFinite(speed) || !Number.isFinite(lactate)) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{`${t(language, 'speedLabel')} ${speed.toFixed(1)} km/h`}</p>
      <p className="mt-1 text-slate-700">{`${t(language, 'lactateCol')}: ${lactate.toFixed(2)} mmol/L`}</p>
    </div>
  );
}


export function ThresholdControlsPanel({
  controls,
  analysis,
  language,
  onChange,
}: {
  controls: ThresholdControls;
  analysis: AppAnalysis;
  language: Language;
  onChange: (controls: ThresholdControls) => void;
}) {
  const updateLt1Method = (method: Lt1MethodId) => {
    const next: ThresholdControls = {
      ...controls,
      aerobicMethod: method,
      manualTarget: method === 'manual_lt1' ? 'aerobic' : controls.manualTarget,
    };
    if (method === 'manual_lt1' && !next.manualAerobicSpeedKmh) {
      next.manualAerobicSpeedKmh = analysis.selectedThresholds.aerobic?.speedKmh;
    }
    onChange(next);
  };

  const updateLt2Method = (method: Lt2MethodId) => {
    const next: ThresholdControls = {
      ...controls,
      anaerobicMethod: method,
      manualTarget: method === 'manual_lt2' ? 'anaerobic' : controls.manualTarget,
    };
    if (method === 'manual_lt2' && !next.manualAnaerobicSpeedKmh) {
      next.manualAnaerobicSpeedKmh = analysis.selectedThresholds.anaerobic?.speedKmh;
    }
    onChange(next);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[560px] lg:grid-cols-[1fr_1fr_auto]">
      <ThresholdSelect
        label={t(language, 'lt1Mode')}
        value={controls.aerobicMethod}
        options={lt1MethodOptions}
        language={language}
        onChange={(method) => updateLt1Method(method as Lt1MethodId)}
      />
      <ThresholdSelect
        label={t(language, 'lt2Mode')}
        value={controls.anaerobicMethod}
        options={lt2MethodOptions}
        language={language}
        onChange={(method) => updateLt2Method(method as Lt2MethodId)}
      />
      <div className="flex items-end gap-2">
        <ThresholdTargetButton
          target="aerobic"
          label="LT1"
          controls={controls}
          onChange={onChange}
          language={language}
        />
        <ThresholdTargetButton
          target="anaerobic"
          label="LT2"
          controls={controls}
          onChange={onChange}
          language={language}
        />
      </div>
      {controls.aerobicMethod === 'manual_lt1' && (
        <ManualSpeedInput
          label="LT1 km/h"
          value={controls.manualAerobicSpeedKmh}
          onChange={(value) => onChange({ ...controls, manualAerobicSpeedKmh: value, manualTarget: 'aerobic' })}
        />
      )}
      {controls.anaerobicMethod === 'manual_lt2' && (
        <ManualSpeedInput
          label="LT2 km/h"
          value={controls.manualAnaerobicSpeedKmh}
          onChange={(value) => onChange({ ...controls, manualAnaerobicSpeedKmh: value, manualTarget: 'anaerobic' })}
        />
      )}
    </div>
  );
}

function ThresholdSelect({
  label,
  value,
  options,
  language,
  onChange,
}: {
  label: string;
  value: Lt1MethodId | Lt2MethodId;
  options: Array<Lt1MethodId | Lt2MethodId>;
  language: Language;
  onChange: (method: Lt1MethodId | Lt2MethodId) => void;
}) {
  return (
    <label className="control-label">
      {label}
      <select className="select-field" value={value} onChange={(event) => onChange(event.target.value as Lt1MethodId | Lt2MethodId)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {thresholdMethodLabel(option, language)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ManualSpeedInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <label className="control-label">
      {label}
      <input
        className="text-field"
        type="number"
        min="1"
        step="0.1"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
      />
    </label>
  );
}

function ThresholdTargetButton({
  target,
  label,
  controls,
  onChange,
  language,
}: {
  target: ManualThresholdTarget;
  label: string;
  controls: ThresholdControls;
  onChange: (controls: ThresholdControls) => void;
  language: Language;
}) {
  const isManual = target === 'aerobic' ? controls.aerobicMethod === 'manual_lt1' : controls.anaerobicMethod === 'manual_lt2';
  const isActive = controls.manualTarget === target;
  return (
    <button
      type="button"
      className={isManual && isActive ? 'selected-button h-10 px-3' : 'secondary-button h-10 px-3'}
      disabled={!isManual}
      title={t(language, target === 'aerobic' ? 'setLt1FromChart' : 'setLt2FromChart')}
      onClick={() => onChange({ ...controls, manualTarget: target })}
    >
      {label}
    </button>
  );
}

export function handleChartSelection(
  state: ChartClickState,
  controls: ThresholdControls,
  onChange: (controls: ThresholdControls) => void,
) {
  const speed = readClickedSpeed(state);
  if (!speed) return;

  const target =
    controls.aerobicMethod === 'manual_lt1' && controls.anaerobicMethod !== 'manual_lt2'
      ? 'aerobic'
      : controls.anaerobicMethod === 'manual_lt2' && controls.aerobicMethod !== 'manual_lt1'
        ? 'anaerobic'
        : controls.manualTarget;

  if (target === 'aerobic' && controls.aerobicMethod === 'manual_lt1') {
    onChange({ ...controls, manualAerobicSpeedKmh: round(speed, 2), manualTarget: 'aerobic' });
  }
  if (target === 'anaerobic' && controls.anaerobicMethod === 'manual_lt2') {
    onChange({ ...controls, manualAnaerobicSpeedKmh: round(speed, 2), manualTarget: 'anaerobic' });
  }
}

function readClickedSpeed(state: ChartClickState): number | undefined {
  const payloadSpeed = state.activePayload?.find((item) => Number.isFinite(Number(item.payload?.speedKmh)))?.payload?.speedKmh;
  const speed = Number(payloadSpeed ?? state.activeLabel);
  return Number.isFinite(speed) && speed > 0 ? speed : undefined;
}

function thresholdMethodLabel(method: Lt1MethodId | Lt2MethodId, language: Language): string {
  const labels: Record<Lt1MethodId | Lt2MethodId, { nl: string; en: string }> = {
    fixed_2: { nl: '2 mmol', en: '2 mmol' },
    baseline: { nl: 'Baseline', en: 'Baseline' },
    baseline_plus_04: { nl: 'Baseline + 0,4', en: 'Baseline + 0.4' },
    baseline_plus: { nl: 'Baseline + 0,5', en: 'Baseline + 0.5' },
    manual_lt1: { nl: 'Handmatig vastleggen', en: 'Set manually' },
    dmax_modified: { nl: 'D-Max Modified', en: 'D-Max Modified' },
    dmax: { nl: 'D-Max', en: 'D-Max' },
    tangent51: { nl: 'Tangent 51', en: 'Tangent 51' },
    stegmann: { nl: 'Stegmann', en: 'Stegmann' },
    fixed_4: { nl: '4 mmol', en: '4 mmol' },
    manual_lt2: { nl: 'Handmatig vastleggen', en: 'Set manually' },
  };
  return labels[method][language];
}

export function EmptyChartMessage({ language }: { language: Language }) {
  return (
    <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
      {t(language, 'emptyChart')}
    </div>
  );
}
