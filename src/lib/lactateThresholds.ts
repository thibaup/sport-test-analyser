import type {
  ConfidenceLabel,
  DataQualityResult,
  ThresholdEstimate,
  ThresholdMethodId,
  ThresholdPair,
  ThresholdType,
  ValidTestPoint,
} from '../types/lactate';
import { clamp, round, speedToPaceSecondsPerKm } from './conversions';
import {
  findFirstSustainedRiseIndex,
  findSpeedAtLactate,
  interpolateYAtX,
  linearRegression,
  perpendicularDistance,
  samplePolynomialCurve,
} from './curveFitting';

interface MethodDefinition {
  id: ThresholdMethodId;
  name: string;
  explanation: string;
}

export const thresholdMethodDefinitions: MethodDefinition[] = [
  {
    id: 'fixed',
    name: 'Fixed 2/4 mmol',
    explanation:
      'Uses 2.0 mmol/L as a first-threshold proxy and 4.0 mmol/L OBLA as a second-threshold proxy.',
  },
  {
    id: 'dmax',
    name: 'Log-log + Dmax',
    explanation:
      'Uses a log-log break point for the first threshold and the maximum distance from the lactate curve to its end-point line for the second threshold.',
  },
  {
    id: 'modifiedDmax',
    name: 'Baseline + modified Dmax',
    explanation:
      'Uses baseline plus 1.0 mmol/L for the first threshold and Dmax from the point before the first sustained lactate rise for the second threshold.',
  },
  {
    id: 'baselinePlus',
    name: 'Baseline + LT rise',
    explanation:
      'Uses the early-test lactate baseline plus 1.0 mmol/L and an LT plus 1.0 mmol/L MLSS-style proxy when the curve supports it.',
  },
  {
    id: 'logPolynomial',
    name: 'Log-log + polynomial',
    explanation:
      'Uses segmented log-lactate regression for the first threshold and polynomial Dmax for the second threshold.',
  },
];

export function calculateThresholdPairs(points: ValidTestPoint[], quality: DataQualityResult): ThresholdPair[] {
  const fixed2 = estimateFixedTarget(points, quality, 2, 'aerobic', 'Fixed 2.0 mmol/L', 'fixed');
  const fixed4 = estimateFixedTarget(points, quality, 4, 'anaerobic', 'Fixed 4.0 mmol/L OBLA', 'fixed');
  const baselinePlus = estimateBaselinePlus(points, quality, 'aerobic');
  const logLog = estimateLogLogBreak(points, quality);
  const dmax = estimateDmax(points, quality, false);
  const modifiedDmax = estimateDmax(points, quality, true);
  const usableLogLog = usableEstimate(logLog);
  const usableBaselinePlus = usableEstimate(baselinePlus);
  const ltPlusOne = estimateLtPlusOne(points, quality, usableLogLog ?? usableBaselinePlus);

  return [
    makePair('fixed', fixed2, fixed4, quality),
    makePair('dmax', usableLogLog ?? usableBaselinePlus ?? fixed2, dmax, quality),
    makePair('modifiedDmax', usableBaselinePlus ?? usableLogLog ?? fixed2, modifiedDmax, quality),
    makePair('baselinePlus', usableBaselinePlus ?? fixed2, ltPlusOne ?? dmax ?? fixed4, quality),
    makePair('logPolynomial', usableLogLog ?? usableBaselinePlus ?? fixed2, dmax ?? fixed4, quality),
  ];
}

export function selectThresholdPair(pairs: ThresholdPair[], methodId: ThresholdMethodId): ThresholdPair {
  return pairs.find((pair) => pair.methodId === methodId) ?? pairs[0];
}

export function estimateHeartRateAtSpeed(points: ValidTestPoint[], speedKmh?: number): number | undefined {
  if (!speedKmh) return undefined;
  return interpolateYAtX(
    points.map((point) => ({ speedKmh: point.speedKmh, value: point.heartRate })),
    speedKmh,
  );
}

export function estimateBaselineLactate(points: ValidTestPoint[]): number | undefined {
  if (points.length < 2) return undefined;
  const sorted = points.sort((a, b) => a.speedKmh - b.speedKmh);
  const early = sorted.slice(0, Math.max(2, Math.ceil(sorted.length / 2)));
  const lowValues = early.map((point) => point.lactate).sort((a, b) => a - b).slice(0, 3);
  return lowValues.reduce((sum, value) => sum + value, 0) / lowValues.length;
}

function estimateFixedTarget(
  points: ValidTestPoint[],
  quality: DataQualityResult,
  target: number,
  type: ThresholdType,
  methodName: string,
  methodId: ThresholdMethodId,
): ThresholdEstimate {
  const speed = findSpeedAtLactate(points, target, true);
  return makeEstimate({
    points,
    quality,
    methodId,
    methodName,
    type,
    speedKmh: speed,
    lactate: target,
    formula: `Linear interpolation at lactate = ${target.toFixed(1)} mmol/L`,
    explanation:
      target === 4
        ? 'OBLA is the speed where the lactate curve crosses 4.0 mmol/L. It is useful as a comparison marker but can differ from true MLSS.'
        : 'The 2.0 mmol/L crossing is used as a practical first-threshold estimate when the curve spans this level.',
    insufficientReason: speed ? undefined : `The lactate values do not cross ${target.toFixed(1)} mmol/L.`,
  });
}

function estimateBaselinePlus(
  points: ValidTestPoint[],
  quality: DataQualityResult,
  type: ThresholdType,
): ThresholdEstimate | undefined {
  const baseline = estimateBaselineLactate(points);
  if (!baseline) return undefined;
  const target = baseline + 1;
  const speed = findSpeedAtLactate(points, target, true);
  return makeEstimate({
    points,
    quality,
    methodId: 'baselinePlus',
    methodName: 'Baseline + 1.0 mmol/L',
    type,
    speedKmh: speed,
    lactate: target,
    formula: `Baseline lactate (${baseline.toFixed(2)}) + 1.0 mmol/L`,
    explanation:
      'Uses the low early-test lactate level as the individual baseline, then finds the speed one mmol/L above that value.',
    insufficientReason: speed ? undefined : 'The lactate values do not rise one mmol/L above the early-test level.',
  });
}

function estimateLtPlusOne(
  points: ValidTestPoint[],
  quality: DataQualityResult,
  firstThreshold?: ThresholdEstimate,
): ThresholdEstimate | undefined {
  if (!firstThreshold?.lactate) return undefined;
  const target = firstThreshold.lactate + 1;
  const speed = findSpeedAtLactate(points, target, true);
  return makeEstimate({
    points,
    quality,
    methodId: 'baselinePlus',
    methodName: 'LT + 1.0 mmol/L',
    type: 'anaerobic',
    speedKmh: speed,
    lactate: target,
    formula: `First-threshold lactate (${firstThreshold.lactate.toFixed(2)}) + 1.0 mmol/L`,
    explanation:
      'Uses the first lactate turn as the anchor and estimates a sustainable second threshold one mmol/L higher.',
    insufficientReason: speed ? undefined : 'The lactate values do not reach one mmol/L above the first threshold.',
  });
}

function estimateDmax(
  points: ValidTestPoint[],
  quality: DataQualityResult,
  modified: boolean,
): ThresholdEstimate | undefined {
  if (points.length < 4) {
    return makeEstimate({
      points,
      quality,
      methodId: modified ? 'modifiedDmax' : 'dmax',
      methodName: modified ? 'Modified Dmax' : 'Dmax',
      type: 'anaerobic',
      formula: modified ? 'Polynomial curve, line from first sustained rise to last point' : 'Polynomial curve, line from first to last point',
      explanation:
        'Dmax requires enough points to fit a curve and find the point farthest from the line joining reference points.',
      insufficientReason: 'At least four lactate points are needed.',
    });
  }

  const sorted = points.sort((a, b) => a.speedKmh - b.speedKmh);
  const startIndex = modified ? findFirstSustainedRiseIndex(sorted) : findStableDmaxStartIndex(sorted);
  const start = sorted[startIndex];
  const end = sorted[sorted.length - 1];
  const samples = samplePolynomialCurve(sorted, 180).filter(
    (sample) =>
      sample.smoothedLactate !== undefined &&
      sample.speedKmh >= start.speedKmh &&
      sample.speedKmh <= end.speedKmh,
  );

  const minInterior = start.speedKmh + (end.speedKmh - start.speedKmh) * 0.04;
  const maxInterior = end.speedKmh - (end.speedKmh - start.speedKmh) * 0.04;
  let best: { speed: number; lactate: number; distance: number } | undefined;
  samples.forEach((sample) => {
    if (!sample.smoothedLactate || sample.speedKmh < minInterior || sample.speedKmh > maxInterior) return;
    const distance = perpendicularDistance(
      { x: sample.speedKmh, y: sample.smoothedLactate },
      { x: start.speedKmh, y: start.lactate },
      { x: end.speedKmh, y: end.lactate },
    );
    if (!best || distance > best.distance) {
      best = { speed: sample.speedKmh, lactate: sample.smoothedLactate, distance };
    }
  });

  return makeEstimate({
    points,
    quality,
    methodId: modified ? 'modifiedDmax' : 'dmax',
    methodName: modified ? 'Modified Dmax' : 'Dmax',
    type: 'anaerobic',
    speedKmh: best?.speed,
    lactate: best?.lactate,
    formula: modified
      ? 'Max perpendicular distance from polynomial curve to line from point before first sustained rise to final point'
      : 'Max perpendicular distance from polynomial curve to line from first stable low-lactate point to final point',
    explanation: modified
      ? 'Modified Dmax reduces early-test baseline influence by starting the reference line near the first sustained lactate rise.'
      : 'Dmax identifies the largest curvature separation between the lactate curve and the endpoint line; early high baseline samples are skipped when the curve first dips.',
    insufficientReason: best ? undefined : 'The lactate rise is not clear enough for a second threshold.',
    confidenceAdjustment: best && best.distance > 0.25 ? 0 : -0.15,
  });
}

function findStableDmaxStartIndex(points: ValidTestPoint[]): number {
  const firstHalf = points.slice(0, Math.max(2, Math.ceil(points.length / 2)));
  const localMinimum = firstHalf.reduce(
    (best, point, index) => (point.lactate < best.lactate ? { lactate: point.lactate, index } : best),
    { lactate: firstHalf[0].lactate, index: 0 },
  );
  const firstPoint = points[0];
  return firstPoint.lactate - localMinimum.lactate > 0.2 ? localMinimum.index : 0;
}

function estimateLogLogBreak(points: ValidTestPoint[], quality: DataQualityResult): ThresholdEstimate | undefined {
  const usable = points.filter((point) => point.lactate > 0).sort((a, b) => a.speedKmh - b.speedKmh);
  if (usable.length < 5) {
    return makeEstimate({
      points,
      quality,
      methodId: 'logPolynomial',
      methodName: 'Log-log break point',
      type: 'aerobic',
      formula: 'Segmented regression of log(lactate) against speed',
      explanation:
        'The log-log method searches for the first breakpoint in lactate response. It needs at least five test points.',
      insufficientReason: 'At least five lactate points are needed.',
    });
  }

  let best:
    | {
        split: number;
        error: number;
      }
    | undefined;

  for (let split = 1; split < usable.length - 2; split += 1) {
    const left = usable.slice(0, split + 1).map((point) => ({ x: point.speedKmh, y: Math.log(point.lactate) }));
    const right = usable.slice(split).map((point) => ({ x: point.speedKmh, y: Math.log(point.lactate) }));
    const leftFit = linearRegression(left);
    const rightFit = linearRegression(right);
    if (!leftFit || !rightFit) continue;
    const error =
      left.reduce((sum, point) => sum + (point.y - (leftFit.slope * point.x + leftFit.intercept)) ** 2, 0) +
      right.reduce((sum, point) => sum + (point.y - (rightFit.slope * point.x + rightFit.intercept)) ** 2, 0);
    if (!best || error < best.error) {
      best = { split, error };
    }
  }

  const splitPoint = best ? usable[best.split] : undefined;
  return makeEstimate({
    points,
    quality,
    methodId: 'logPolynomial',
    methodName: 'Log-log break point',
    type: 'aerobic',
    speedKmh: splitPoint?.speedKmh,
    lactate: splitPoint?.lactate,
    formula: 'Best two-segment linear fit of ln(lactate) vs speed',
    explanation:
      'This estimates the first threshold by finding the point where log-transformed lactate begins a steeper linear segment.',
    insufficientReason: splitPoint ? undefined : 'No stable log-log breakpoint was found.',
  });
}

function makeEstimate({
  points,
  quality,
  methodId,
  methodName,
  type,
  speedKmh,
  lactate,
  formula,
  explanation,
  insufficientReason,
  confidenceAdjustment = 0,
}: {
  points: ValidTestPoint[];
  quality: DataQualityResult;
  methodId: ThresholdMethodId;
  methodName: string;
  type: ThresholdType;
  speedKmh?: number;
  lactate?: number;
  formula: string;
  explanation: string;
  insufficientReason?: string;
  confidenceAdjustment?: number;
}): ThresholdEstimate {
  const heartRate = estimateHeartRateAtSpeed(points, speedKmh);
  const confidence = speedKmh
    ? calculateConfidence(points, quality, confidenceAdjustment)
    : 0;
  return {
    id: `${methodId}-${type}-${methodName.replace(/\W+/g, '-').toLowerCase()}`,
    methodId,
    methodName,
    type,
    speedKmh: speedKmh ? round(speedKmh, 2) : undefined,
    paceSecondsPerKm: speedKmh ? speedToPaceSecondsPerKm(speedKmh) : undefined,
    lactate: lactate ? round(lactate, 2) : undefined,
    heartRate: heartRate ? Math.round(heartRate) : undefined,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    explanation,
    formula,
    insufficientReason,
  };
}

function calculateConfidence(points: ValidTestPoint[], quality: DataQualityResult, adjustment = 0): number {
  if (points.length < 4) return clamp(0.25 + adjustment, 0, 1);
  const lactateRange = Math.max(...points.map((point) => point.lactate)) - Math.min(...points.map((point) => point.lactate));
  const spanScore = clamp(lactateRange / 4, 0.25, 1);
  const countScore = clamp(points.length / 7, 0.45, 1);
  const qualityScore = clamp(quality.score / 100, 0.2, 1);
  return round(clamp(qualityScore * 0.45 + spanScore * 0.3 + countScore * 0.25 + adjustment, 0, 1), 2);
}

export function confidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.78) return 'high';
  if (confidence >= 0.55) return 'moderate';
  if (confidence > 0) return 'low';
  return 'insufficient';
}

function makePair(
  methodId: ThresholdMethodId,
  aerobic: ThresholdEstimate | undefined,
  anaerobic: ThresholdEstimate | undefined,
  quality: DataQualityResult,
): ThresholdPair {
  const definition = thresholdMethodDefinitions.find((method) => method.id === methodId)!;
  const usableConfidences = [aerobic?.confidence, anaerobic?.confidence].filter(
    (value): value is number => typeof value === 'number' && value > 0,
  );
  const confidence =
    usableConfidences.length > 0
      ? round(usableConfidences.reduce((sum, value) => sum + value, 0) / usableConfidences.length, 2)
      : 0;
  const warnings = [
    aerobic?.insufficientReason,
    anaerobic?.insufficientReason,
    quality.validStepCount < 5 ? 'Fewer than five test points limits threshold estimates.' : undefined,
  ].filter((item): item is string => Boolean(item));

  return {
    methodId,
    methodName: definition.name,
    aerobic,
    anaerobic,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    explanation: definition.explanation,
    warnings,
  };
}

function usableEstimate(estimate?: ThresholdEstimate): ThresholdEstimate | undefined {
  return estimate?.speedKmh ? estimate : undefined;
}
