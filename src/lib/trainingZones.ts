import type { ThresholdPair, TrainingZone, ValidTestPoint } from '../types/lactate';
import { clamp, round, speedToPaceSecondsPerKm } from './conversions';
import { linearRegression } from './curveFitting';

const zoneColors = [
  '#38bdf8',
  '#22c55e',
  '#84cc16',
  '#facc15',
  '#fb923c',
  '#ef4444',
  '#a855f7',
  '#0f172a',
];

export function generateTrainingZones(
  thresholds: ThresholdPair,
  points: ValidTestPoint[],
): TrainingZone[] {
  const aerobic = thresholds.aerobic?.speedKmh;
  const anaerobic = thresholds.anaerobic?.speedKmh;
  if (!aerobic || !anaerobic || anaerobic <= aerobic || points.length < 4) return [];

  const maxTestedSpeed = Math.max(...points.map((point) => point.speedKmh));
  const lactateMax = Math.max(...points.map((point) => point.lactate));
  const vvo2Estimate = estimateVvo2Speed(anaerobic, maxTestedSpeed, lactateMax);
  const zoneSettings = automaticZoneSettings();
  const gap = anaerobic - aerobic;
  const highGap = Math.max(0.4, vvo2Estimate - anaerobic);

  const boundaries = [
    aerobic * zoneSettings.recoveryLow,
    aerobic * zoneSettings.recoveryHigh,
    aerobic * zoneSettings.easyHigh,
    aerobic + gap * 0.33,
    aerobic + gap * 0.6,
    anaerobic * zoneSettings.subThreshold,
    anaerobic * zoneSettings.thresholdHigh,
    anaerobic + highGap * zoneSettings.vo2High,
    Math.max(vvo2Estimate * zoneSettings.speedHigh, maxTestedSpeed),
  ];

  const definitions = [
    {
      id: 'recovery',
      name: 'Recovery',
      purpose: 'Low mechanical and metabolic load for regeneration and warm-ups.',
      intensity: 'Very easy, conversational',
      formula: `${zoneSettings.recoveryLow.toFixed(2)}-${zoneSettings.recoveryHigh.toFixed(2)} x aerobic threshold speed`,
    },
    {
      id: 'easy',
      name: 'Easy aerobic',
      purpose: 'Build durable aerobic volume while keeping lactate controlled.',
      intensity: 'Easy, relaxed breathing',
      formula: `${zoneSettings.recoveryHigh.toFixed(2)}-${zoneSettings.easyHigh.toFixed(2)} x aerobic threshold speed`,
    },
    {
      id: 'steady',
      name: 'Steady aerobic',
      purpose: 'Aerobic endurance close to the first lactate turn.',
      intensity: 'Comfortably steady',
      formula: `Aerobic threshold to 33% of the AeT-AnT speed gap`,
    },
    {
      id: 'tempo',
      name: 'Tempo',
      purpose: 'Improve aerobic pressure without sitting directly at threshold.',
      intensity: 'Moderate to strong',
      formula: `33-60% of the AeT-AnT speed gap`,
    },
    {
      id: 'sub-threshold',
      name: 'Sub-threshold',
      purpose: 'Raise lactate clearance just below the selected second threshold.',
      intensity: 'Controlled hard',
      formula: `60% of the AeT-AnT gap to ${zoneSettings.subThreshold.toFixed(2)} x anaerobic threshold speed`,
    },
    {
      id: 'threshold',
      name: 'Threshold',
      purpose: 'Develop sustainable high-end aerobic output near LT2 or MLSS proxy.',
      intensity: 'Hard but repeatable',
      formula: `${zoneSettings.subThreshold.toFixed(2)}-${zoneSettings.thresholdHigh.toFixed(2)} x anaerobic threshold speed`,
    },
    {
      id: 'vo2max',
      name: 'VO2max',
      purpose: 'Stress oxygen uptake using speeds between LT2 and estimated vVO2.',
      intensity: 'Very hard intervals',
      formula: `Anaerobic threshold to ${zoneSettings.vo2High.toFixed(2)} of the AnT-vVO2 speed gap`,
    },
    {
      id: 'speed',
      name: 'Anaerobic / speed',
      purpose: 'Fast running economy, capacity, and neuromuscular speed.',
      intensity: 'Fast, high recovery demand',
      formula: `${zoneSettings.vo2High.toFixed(2)} of the AnT-vVO2 gap to ${zoneSettings.speedHigh.toFixed(2)} x estimated vVO2`,
    },
  ];

  return definitions.map((definition, index) => {
    const from = Math.max(0.1, boundaries[index]);
    const to = Math.max(from + 0.1, boundaries[index + 1]);
    const hrRange = estimateHeartRateRange(points, from, to);
    return {
      ...definition,
      speedFromKmh: round(from, 1),
      speedToKmh: round(to, 1),
      paceFromSecondsPerKm: speedToPaceSecondsPerKm(to) ?? 0,
      paceToSecondsPerKm: speedToPaceSecondsPerKm(from) ?? 0,
      heartRateFrom: hrRange.from,
      heartRateTo: hrRange.to,
      heartRateReliable: hrRange.reliable,
      color: zoneColors[index],
      warning: hrRange.warning,
    };
  });
}

export function estimateVvo2Speed(anaerobicSpeed: number, maxTestedSpeed: number, maxLactate: number): number {
  const severeDomainEvidence = clamp((maxLactate - 4) / 3, 0, 1);
  const fromThreshold = anaerobicSpeed * (1.08 + 0.04 * severeDomainEvidence);
  const fromTestPeak = maxTestedSpeed * (maxLactate >= 6 ? 1 : 1.03);
  return round(Math.max(fromThreshold, fromTestPeak), 2);
}


function automaticZoneSettings() {
  return {
    recoveryLow: 0.7,
    recoveryHigh: 0.86,
    easyHigh: 0.98,
    subThreshold: 0.98,
    thresholdHigh: 1.03,
    vo2High: 0.62,
    speedHigh: 1.05,
  };
}

function estimateHeartRateRange(
  points: ValidTestPoint[],
  speedFromKmh: number,
  speedToKmh: number,
): { from?: number; to?: number; reliable: boolean; warning?: string } {
  const hrPoints = points
    .filter((point) => point.heartRate !== undefined)
    .map((point) => ({ x: point.speedKmh, y: point.heartRate as number }));
  if (hrPoints.length < 3) {
    return { reliable: false, warning: 'Add more HR data for this zone.' };
  }
  const fit = linearRegression(hrPoints);
  if (!fit) return { reliable: false, warning: 'Heart-rate range is unavailable.' };
  const minObserved = Math.min(...hrPoints.map((point) => point.x));
  const maxObserved = Math.max(...hrPoints.map((point) => point.x));
  const from = Math.round(fit.slope * speedFromKmh + fit.intercept);
  const to = Math.round(fit.slope * speedToKmh + fit.intercept);
  const reliable = speedFromKmh >= minObserved && speedToKmh <= maxObserved;
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
    reliable,
    warning: reliable ? undefined : 'This HR range extends beyond the tested speeds.',
  };
}
