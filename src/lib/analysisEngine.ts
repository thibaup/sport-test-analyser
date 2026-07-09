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
): AppAnalysis {
  const quality = analyzeDataQuality(steps);
  const validPoints = toValidPoints(steps);
  const curve = createCurvePoints(steps, validPoints);
  const thresholdPairs = calculateThresholdPairs(validPoints, quality);
  const selectedThresholds = selectConfiguredThresholdPair(thresholdPairs, validPoints, quality, thresholdControls);
  const maxLactate = determineMaxLactate(validPoints, maxLactateTest);
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

function determineMaxLactate(validPoints: AppAnalysis['validPoints'], maxLactateTest?: MaxLactateTest): AppAnalysis['maxLactate'] {
  const allOutLactate = maxLactateTest?.lactate;
  const allOutSpeed = calculateSpeedFromDuration(
    maxLactateTest?.distanceMeters ? maxLactateTest.distanceMeters / 1000 : undefined,
    maxLactateTest?.timeSeconds,
  );
  const allOutHeartRate = isFiniteNumber(maxLactateTest?.heartRate) ? maxLactateTest.heartRate : undefined;
  const heartRateValues = validPoints.map((point) => point.heartRate).filter((value): value is number => isFiniteNumber(value));
  const highestRecordedHeartRate = heartRateValues.length ? Math.max(...heartRateValues) : undefined;
  const maxHeartRate =
    allOutHeartRate !== undefined && highestRecordedHeartRate !== undefined
      ? Math.max(allOutHeartRate, highestRecordedHeartRate)
      : allOutHeartRate ?? highestRecordedHeartRate;
  if (isFiniteNumber(allOutLactate)) {
    return {
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
      source: 'none',
      distanceMeters: maxLactateTest?.distanceMeters,
      timeSeconds: maxLactateTest?.timeSeconds,
      speedKmh: allOutSpeed ? round(allOutSpeed, 2) : undefined,
      heartRate: maxHeartRate,
    };
  }
  return {
    value: round(Math.max(...validPoints.map((point) => point.lactate)), 1),
    source: 'test',
    distanceMeters: maxLactateTest?.distanceMeters,
    timeSeconds: maxLactateTest?.timeSeconds,
    speedKmh: allOutSpeed ? round(allOutSpeed, 2) : undefined,
    heartRate: maxHeartRate,
  };
}
