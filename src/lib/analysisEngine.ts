import type { AppAnalysis, TestStep, ThresholdMethodId, ZoneProfile } from '../types/lactate';
import { generateAdvice } from './adviceEngine';
import { createCurvePoints, toValidPoints } from './curveFitting';
import { analyzeDataQuality } from './dataQuality';
import { calculateThresholdPairs, selectThresholdPair } from './lactateThresholds';
import { estimateRacePerformances, generateTargetPaces } from './targetPaces';
import { generateTrainingZones } from './trainingZones';

export function analyzeTest(
  steps: TestStep[],
  thresholdMethodId: ThresholdMethodId,
  profile: ZoneProfile,
): AppAnalysis {
  const quality = analyzeDataQuality(steps);
  const validPoints = toValidPoints(steps);
  const curve = createCurvePoints(steps, validPoints);
  const thresholdPairs = calculateThresholdPairs(validPoints, quality);
  const selectedThresholds = selectThresholdPair(thresholdPairs, thresholdMethodId);
  const zones = generateTrainingZones(selectedThresholds, validPoints);
  const targets = generateTargetPaces(selectedThresholds, validPoints, profile);
  const raceEstimates = estimateRacePerformances(selectedThresholds, validPoints);
  const advice = generateAdvice(validPoints, selectedThresholds, quality, zones);

  return {
    validPoints,
    curve,
    quality,
    thresholdPairs,
    selectedThresholds,
    zones,
    targets,
    raceEstimates,
    advice,
  };
}
