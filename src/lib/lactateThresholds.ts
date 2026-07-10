import type {
  ConfidenceLabel,
  DataQualityResult,
  Lt1MethodId,
  Lt2MethodId,
  ThresholdControls,
  ThresholdEstimate,
  ThresholdMethodId,
  ThresholdPair,
  ThresholdType,
  ValidTestPoint,
} from '../types/lactate';
import { clamp, round, speedToPaceSecondsPerKm } from './conversions';
import {
  calculateReferenceLt1,
  calculateReferenceLt2,
  referenceFormula,
  referenceMethodName,
  type ReferenceDataPoint,
  type ReferenceThreshold,
} from './referenceThresholds';

interface MethodDefinition {
  id: ThresholdMethodId;
  name: string;
  explanation: string;
}

export const lt1MethodOptions: Lt1MethodId[] = ['fixed_2', 'baseline', 'baseline_plus_04', 'baseline_plus', 'manual_lt1'];
export const lt2MethodOptions: Lt2MethodId[] = ['dmax_modified', 'manual_lt2'];

export const thresholdMethodDefinitions: MethodDefinition[] = [
  {
    id: 'fixed_2',
    name: 'LT1 2.0 mmol/L',
    explanation: 'Uses the reference polynomial curve crossing at 2.0 mmol/L after the initial lactate nadir.',
  },
  {
    id: 'baseline',
    name: 'LT1 baseline',
    explanation: 'Uses the mean lactate before the first 0.4 mmol/L rise, crossed after the initial lactate nadir.',
  },
  {
    id: 'baseline_plus_04',
    name: 'LT1 baseline + 0.4',
    explanation: 'Uses baseline lactate plus 0.4 mmol/L on the reference polynomial curve after the initial lactate nadir.',
  },
  {
    id: 'baseline_plus',
    name: 'LT1 baseline + 0.5',
    explanation: 'Uses baseline lactate plus 0.5 mmol/L on the reference polynomial curve after the initial lactate nadir.',
  },
  {
    id: 'dmax',
    name: 'LT2 D-Max',
    explanation: 'Uses the maximum distance from the polynomial curve to the first-to-last lactate line.',
  },
  {
    id: 'dmax_modified',
    name: 'LT2 D-Max Modified',
    explanation: 'Uses the maximum distance from the polynomial curve to the LT1-to-final lactate line.',
  },
  {
    id: 'tangent51',
    name: 'LT2 Tangent 51',
    explanation: 'Uses the polynomial curve point where the tangent slope equals tan(51 degrees).',
  },
  {
    id: 'stegmann',
    name: 'LT2 Stegmann',
    explanation: 'Uses the polynomial curve inflection point.',
  },
  {
    id: 'fixed_4',
    name: 'LT2 4.0 mmol/L',
    explanation: 'Uses the reference polynomial curve crossing at 4.0 mmol/L after the initial lactate nadir.',
  },
  {
    id: 'manual',
    name: 'Manual LT1/LT2',
    explanation: 'Uses manually selected LT1 and/or LT2 speeds from the lactate chart.',
  },
];

export function calculateThresholdPairs(points: ValidTestPoint[], quality: DataQualityResult): ThresholdPair[] {
  return [
    estimatePair(points, quality, 'fixed_2', 'fixed_4'),
    estimatePair(points, quality, 'fixed_2', 'dmax_modified'),
    estimatePair(points, quality, 'baseline_plus_04', 'dmax_modified'),
    estimatePair(points, quality, 'baseline_plus', 'dmax_modified'),
    estimatePair(points, quality, 'fixed_2', 'dmax'),
    estimatePair(points, quality, 'fixed_2', 'tangent51'),
    estimatePair(points, quality, 'fixed_2', 'stegmann'),
  ];
}

export function selectThresholdPair(pairs: ThresholdPair[], methodId: ThresholdMethodId): ThresholdPair {
  return pairs.find((pair) => pair.methodId === methodId) ?? pairs[0];
}

export function selectConfiguredThresholdPair(
  _pairs: ThresholdPair[],
  points: ValidTestPoint[],
  quality: DataQualityResult,
  controls: ThresholdControls,
): ThresholdPair {
  return estimatePair(
    points,
    quality,
    controls.aerobicMethod,
    controls.anaerobicMethod,
    controls.manualAerobicSpeedKmh,
    controls.manualAnaerobicSpeedKmh,
    'selected',
  );
}

export function estimateHeartRateAtSpeed(points: ValidTestPoint[], speedKmh?: number): number | undefined {
  if (!speedKmh) return undefined;
  const dataPoints = points
    .map((point) => ({ intensity: point.speedKmh, lactate: point.lactate, heartRate: point.heartRate }))
    .filter((point) => point.heartRate !== undefined) as ReferenceDataPoint[];
  if (dataPoints.length < 2) return undefined;

  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  let left = sorted[0];
  let right = sorted[sorted.length - 1];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    if (sorted[index].intensity <= speedKmh && sorted[index + 1].intensity >= speedKmh) {
      left = sorted[index];
      right = sorted[index + 1];
      break;
    }
  }

  if (left.heartRate === undefined || right.heartRate === undefined || left.intensity === right.intensity) return undefined;
  const ratio = (speedKmh - left.intensity) / (right.intensity - left.intensity);
  return left.heartRate + (right.heartRate - left.heartRate) * ratio;
}

function estimatePair(
  points: ValidTestPoint[],
  quality: DataQualityResult,
  aerobicMethod: Lt1MethodId,
  anaerobicMethod: Lt2MethodId,
  manualAerobicSpeedKmh?: number,
  manualAnaerobicSpeedKmh?: number,
  pairId: ThresholdMethodId = 'selected',
): ThresholdPair {
  let aerobicValidationError = validateManualThresholdSpeed(
    points,
    aerobicMethod,
    manualAerobicSpeedKmh,
    'LT1',
  );
  let anaerobicValidationError = validateManualThresholdSpeed(
    points,
    anaerobicMethod,
    manualAnaerobicSpeedKmh,
    'LT2',
  );
  let aerobicReference = aerobicValidationError
    ? undefined
    : calculateReferenceLt1(points, aerobicMethod, manualAerobicSpeedKmh);
  let anaerobicReference = anaerobicValidationError
    ? undefined
    : calculateReferenceLt2(points, anaerobicMethod, aerobicReference, manualAnaerobicSpeedKmh);

  if (
    aerobicReference &&
    anaerobicReference &&
    anaerobicReference.intensity <= aerobicReference.intensity
  ) {
    if (anaerobicMethod === 'manual_lt2') {
      anaerobicReference = undefined;
      anaerobicValidationError = 'Manual LT2 must be faster than LT1.';
    } else if (aerobicMethod === 'manual_lt1') {
      aerobicReference = undefined;
      aerobicValidationError = 'Manual LT1 must be slower than LT2.';
    }
  }

  const aerobic = makeEstimate(
    points,
    quality,
    'aerobic',
    aerobicMethod,
    aerobicReference,
    aerobicValidationError,
  );
  const anaerobic = makeEstimate(
    points,
    quality,
    'anaerobic',
    anaerobicMethod,
    anaerobicReference,
    anaerobicValidationError,
  );

  return makePair(
    pairId,
    `${referenceMethodName('aerobic', aerobicMethod)} / ${referenceMethodName('anaerobic', anaerobicMethod)}`,
    referencePairExplanation(aerobicMethod, anaerobicMethod),
    aerobic,
    anaerobic,
    quality,
  );
}

function makeEstimate(
  points: ValidTestPoint[],
  quality: DataQualityResult,
  type: ThresholdType,
  methodId: Lt1MethodId | Lt2MethodId,
  threshold?: ReferenceThreshold,
  validationError?: string,
): ThresholdEstimate {
  const speedKmh = threshold?.intensity;
  const confidence = speedKmh ? calculateConfidence(points, quality) : 0;
  return {
    id: `${methodId}-${type}`,
    methodId,
    methodName: referenceMethodName(type, methodId),
    type,
    speedKmh: speedKmh ? round(speedKmh, 2) : undefined,
    paceSecondsPerKm: speedKmh ? speedToPaceSecondsPerKm(speedKmh) : undefined,
    lactate: threshold?.lactate != null ? round(threshold.lactate, 2) : undefined,
    heartRate: threshold?.heartRate != null ? Math.round(threshold.heartRate) : undefined,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    explanation: referenceExplanation(methodId),
    formula: referenceFormula(methodId),
    insufficientReason: speedKmh ? undefined : validationError ?? insufficientReason(methodId),
  };
}

function validateManualThresholdSpeed(
  points: ValidTestPoint[],
  methodId: Lt1MethodId | Lt2MethodId,
  manualSpeedKmh: number | undefined,
  label: 'LT1' | 'LT2',
): string | undefined {
  const isManual = methodId === 'manual_lt1' || methodId === 'manual_lt2';
  if (!isManual || manualSpeedKmh == null || !Number.isFinite(manualSpeedKmh) || points.length === 0) {
    return undefined;
  }

  const speeds = points.map((point) => point.speedKmh);
  const minTestedSpeed = Math.min(...speeds);
  const maxTestedSpeed = Math.max(...speeds);
  if (manualSpeedKmh < minTestedSpeed || manualSpeedKmh > maxTestedSpeed) {
    return `Manual ${label} must be within the tested speed range (${round(minTestedSpeed, 2)}-${round(maxTestedSpeed, 2)} km/h).`;
  }

  return undefined;
}

function makePair(
  methodId: ThresholdMethodId,
  methodName: string,
  explanation: string,
  aerobic: ThresholdEstimate | undefined,
  anaerobic: ThresholdEstimate | undefined,
  quality: DataQualityResult,
): ThresholdPair {
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
    methodName,
    aerobic,
    anaerobic,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    explanation,
    warnings,
  };
}

function referenceExplanation(methodId: Lt1MethodId | Lt2MethodId): string {
  const explanations: Record<Lt1MethodId | Lt2MethodId, string> = {
    manual_lt1: 'The first threshold is set by the coach on the lactate curve.',
    baseline: 'The first threshold uses the average lactate before the first 0.4 mmol/L rise, then finds the post-nadir curve crossing.',
    baseline_plus_04: 'The first threshold uses baseline lactate plus 0.4 mmol/L, then finds the post-nadir curve crossing.',
    baseline_plus: 'The first threshold uses baseline lactate plus 0.5 mmol/L, then finds the post-nadir curve crossing.',
    fixed_2: 'The first threshold uses the post-nadir 2.0 mmol/L curve crossing.',
    manual_lt2: 'The second threshold is set by the coach on the lactate curve.',
    dmax: 'The second threshold is the largest curve distance from the first-to-last lactate line.',
    dmax_modified: 'The second threshold is the largest curve distance from the LT1-to-final lactate line.',
    tangent51: 'The second threshold uses the 51-degree tangent method from the fitted lactate curve.',
    stegmann: 'The second threshold uses the inflection point of the fitted lactate curve.',
    fixed_4: 'The second threshold uses the post-nadir 4.0 mmol/L curve crossing.',
  };
  return explanations[methodId];
}

function referencePairExplanation(aerobicMethod: Lt1MethodId, anaerobicMethod: Lt2MethodId): string {
  return `${referenceExplanation(aerobicMethod)} ${referenceExplanation(anaerobicMethod)}`;
}

function insufficientReason(methodId: Lt1MethodId | Lt2MethodId): string {
  if (methodId === 'manual_lt1' || methodId === 'manual_lt2') return 'No manual threshold speed has been selected.';
  if (methodId === 'stegmann') return 'Stegmann requires a usable polynomial inflection point.';
  if (methodId === 'tangent51') return 'The fitted curve does not expose a usable 51-degree tangent point.';
  return 'The lactate curve does not support this threshold method with the current data.';
}

function calculateConfidence(points: ValidTestPoint[], quality: DataQualityResult): number {
  if (points.length < 4) return 0;
  const lactateRange = Math.max(...points.map((point) => point.lactate)) - Math.min(...points.map((point) => point.lactate));
  const spanScore = clamp(lactateRange / 4, 0.25, 1);
  const countScore = clamp(points.length / 7, 0.45, 1);
  const qualityScore = clamp(quality.score / 100, 0.2, 1);
  return round(clamp(qualityScore * 0.45 + spanScore * 0.3 + countScore * 0.25, 0, 1), 2);
}

export function confidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.78) return 'high';
  if (confidence >= 0.55) return 'moderate';
  if (confidence > 0) return 'low';
  return 'insufficient';
}
