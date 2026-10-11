import type { AppAnalysis, MaxLactateTest, RaceTime, TestStep, ThresholdControls, ZoneCount, ZoneProfile } from '../types/lactate';
import { generateAdvice } from './adviceEngine';
import { calculateSpeedFromDuration, isFiniteNumber, round } from './conversions';
import { createCurvePoints, toValidPoints } from './curveFitting';
import { analyzeDataQuality } from './dataQuality';
import { calculateThresholdPairs, selectConfiguredThresholdPair } from './lactateThresholds';
import { estimateRacePerformances, generateTargetPaces } from './targetPaces';
import { generateTrainingZones } from './trainingZones';

export function analyzeTest(
  steps: TestStep[],
  thresholdControls: ThresholdControls,
  profile: ZoneProfile,
  raceTimes: RaceTime[] = [],
  maxLactateTest?: MaxLactateTest,
  zoneCount: ZoneCount = 5,
  maxHeartRateOverride?: number,
): AppAnalysis {
  const quality = analyzeDataQuality(steps);
  const validPoints = toValidPoints(steps);
  const curve = createCurvePoints(steps, validPoints);
  const thresholdPairs = calculateThresholdPairs(validPoints, quality);
  const selectedThresholds = selectConfiguredThresholdPair(thresholdPairs, validPoints, quality, thresholdControls);
  const maxLactate = determineMaxLactate(
    validPoints,
    maxLactateTest,
    maxHeartRateOverride,
  );
  if (maxLactate.heartRateWarning) {
    quality.warnings.push({
      id: 'max-heart-rate-conflict',
      severity: 'warning',
      metric: 'heartRate',
      message: maxLactate.heartRateWarning,
    });
  }
  const zones = generateTrainingZones(selectedThresholds, validPoints, zoneCount, maxLactate);
  const targets = generateTargetPaces(selectedThresholds, validPoints, profile, raceTimes, maxLactate.value);
  const raceEstimates = estimateRacePerformances(selectedThresholds, validPoints, raceTimes, maxLactate.value);
  const advice = generateAdvice(validPoints, selectedThresholds, quality, zones);

  return {
    validPoints,
    curve,
    quality,
    thresholdPairs,
    selectedThresholds,
    maxLactate,
    zones,
    targets,
    raceEstimates,
    advice,
  };
}

function determineMaxLactate(
  validPoints: AppAnalysis['validPoints'],
  maxLactateTest?: MaxLactateTest,
  maxHeartRateOverride?: number,
): AppAnalysis['maxLactate'] {
  const allOutLactate = isFiniteNumber(maxLactateTest?.lactate) && maxLactateTest.lactate >= 0
    ? maxLactateTest.lactate : undefined;
  const allOutSpeed = calculateSpeedFromDuration(
    maxLactateTest?.distanceMeters ? maxLactateTest.distanceMeters / 1000 : undefined,
    maxLactateTest?.timeSeconds,
  );
  const allOutHeartRate = isFiniteNumber(maxLactateTest?.heartRate) && maxLactateTest.heartRate > 0 ? maxLactateTest.heartRate : undefined;
  const heartRateValues = validPoints.map((point) => point.heartRate).filter((value): value is number => isFiniteNumber(value) && value > 0);
  const highestRecordedHeartRate = heartRateValues.length ? Math.max(...heartRateValues) : undefined;
  const derivedMaxHeartRate =
    allOutHeartRate !== undefined && highestRecordedHeartRate !== undefined
      ? Math.max(allOutHeartRate, highestRecordedHeartRate)
      : allOutHeartRate ?? highestRecordedHeartRate;
  const validOverride = isFiniteNumber(maxHeartRateOverride) && maxHeartRateOverride >= 100
    && (derivedMaxHeartRate === undefined || maxHeartRateOverride >= derivedMaxHeartRate);
  const maxHeartRate = validOverride ? Math.round(maxHeartRateOverride) : derivedMaxHeartRate;
  const stagePeakLactate = validPoints.length
    ? Math.max(...validPoints.map((point) => point.lactate)) : undefined;
  const sourceDetails = {
    stagePeakLactate,
    allOutLactate,
    heartRateSource: validOverride ? 'override' as const : derivedMaxHeartRate !== undefined ? 'observed' as const : undefined,
    heartRateWarning: isFiniteNumber(maxHeartRateOverride) && !validOverride
      ? 'The supplied maximum HR is below the recorded HR or outside the supported range; recorded HR is used instead.' : undefined,
  };
  if (allOutLactate !== undefined && (stagePeakLactate === undefined || allOutLactate >= stagePeakLactate)) {
    return {
      ...sourceDetails,
      value: round(allOutLactate, 1),
      source: 'allOut',
      distanceMeters: maxLactateTest?.distanceMeters,
      timeSeconds: maxLactateTest?.timeSeconds,
      speedKmh: allOutSpeed ? round(allOutSpeed, 2) : undefined,
      heartRate: maxHeartRate,
    };
  }
  if (validPoints.length === 0) {
    return {
      ...sourceDetails,
      source: 'none',
      distanceMeters: maxLactateTest?.distanceMeters,
      timeSeconds: maxLactateTest?.timeSeconds,
      speedKmh: allOutSpeed ? round(allOutSpeed, 2) : undefined,
      heartRate: maxHeartRate,
    };
  }
  return {
    ...sourceDetails,
    value: round(stagePeakLactate!, 1),
    source: 'test',
    distanceMeters: maxLactateTest?.distanceMeters,
    timeSeconds: maxLactateTest?.timeSeconds,
    speedKmh: allOutSpeed ? round(allOutSpeed, 2) : undefined,
    heartRate: maxHeartRate,
  };
}
