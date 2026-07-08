import type { DataQualityResult, TestStep, ValidTestPoint, WarningItem } from '../types/lactate';
import { isFiniteNumber, paceSecondsPerKmToSpeed, speedToPaceSecondsPerKm } from './conversions';
import { polynomialPredict, polynomialRegression, toValidPoints } from './curveFitting';

export function analyzeDataQuality(steps: TestStep[]): DataQualityResult {
  const warnings: WarningItem[] = [];
  const suspectedOutlierIds = new Set<string>();
  const validPoints = toValidPoints(steps);

  steps.forEach((step) => {
    if (step.invalid) {
      warnings.push({
        id: `excluded-${step.id}`,
        severity: 'info',
        metric: 'data',
        stepId: step.id,
        message: `Step ${step.step} is excluded from calculations.`,
      });
    }
    if (step.suspectedOutlier) {
      suspectedOutlierIds.add(step.id);
      warnings.push({
        id: `excluded-review-${step.id}`,
        severity: 'warning',
        metric: 'data',
        stepId: step.id,
        message: `Step ${step.step} is excluded from calculations.`,
      });
    }
    const speed = step.speedKmh ?? paceSecondsPerKmToSpeed(step.paceSecondsPerKm);
    const pace = step.paceSecondsPerKm ?? speedToPaceSecondsPerKm(speed);
    if (!isFiniteNumber(step.distanceKm) || !isFiniteNumber(speed) || !isFiniteNumber(pace)) {
      warnings.push({
        id: `missing-load-${step.id}`,
        severity: 'warning',
        metric: 'data',
        stepId: step.id,
        message: `Step ${step.step} is missing distance, speed, or pace.`,
      });
    }
    if (!isFiniteNumber(step.lactate)) {
      warnings.push({
        id: `missing-lactate-${step.id}`,
        severity: 'critical',
        metric: 'lactate',
        stepId: step.id,
        message: `Step ${step.step} has no lactate value, so it cannot support threshold detection.`,
      });
    }
    if (!isFiniteNumber(step.heartRate)) {
      warnings.push({
        id: `missing-hr-${step.id}`,
        severity: 'info',
        metric: 'heartRate',
        stepId: step.id,
        message: `Step ${step.step} has no heart-rate value, so HR zones may be incomplete.`,
      });
    }
  });

  checkSpeedProgression(steps, warnings);
  checkLactateJumps(validPoints, warnings, suspectedOutlierIds);
  checkCurveResiduals(validPoints, warnings, suspectedOutlierIds);
  checkHeartRateConsistency(validPoints, warnings);

  const penalty = warnings.reduce((sum, warning) => {
    if (warning.severity === 'critical') return sum + 18;
    if (warning.severity === 'warning') return sum + 9;
    return sum + 3;
  }, 0);

  const validStepPenalty = validPoints.length < 5 ? (5 - validPoints.length) * 8 : 0;
  const score = Math.max(0, Math.min(100, 100 - penalty - validStepPenalty));

  return {
    score,
    validStepCount: validPoints.length,
    totalStepCount: steps.length,
    suspectedOutlierIds: [...suspectedOutlierIds],
    warnings,
  };
}

function checkSpeedProgression(steps: TestStep[], warnings: WarningItem[]): void {
  const ordered = steps
    .filter((step) => !step.invalid)
    .map((step) => ({
      id: step.id,
      step: step.step,
      speed: step.speedKmh ?? paceSecondsPerKmToSpeed(step.paceSecondsPerKm),
    }))
    .filter((step): step is { id: string; step: number; speed: number } => isFiniteNumber(step.speed))
    .sort((a, b) => a.step - b.step);

  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].speed <= ordered[index - 1].speed) {
      warnings.push({
        id: `speed-order-${ordered[index].id}`,
        severity: 'warning',
        metric: 'speed',
        stepId: ordered[index].id,
        message: `Step ${ordered[index].step} does not increase speed compared with the previous step.`,
      });
    }
  }
}

function checkLactateJumps(
  points: ValidTestPoint[],
  warnings: WarningItem[],
  suspectedOutlierIds: Set<string>,
): void {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const speedDelta = Math.max(0.1, current.speedKmh - previous.speedKmh);
    const lactateDelta = current.lactate - previous.lactate;
    const slope = lactateDelta / speedDelta;
    if (lactateDelta > 1.6 || slope > 1.8) {
      warnings.push({
        id: `lactate-jump-${current.id}`,
        severity: lactateDelta > 2.3 ? 'critical' : 'warning',
        metric: 'lactate',
        stepId: current.id,
        message: `Step ${current.step} has a sharp lactate rise of ${lactateDelta.toFixed(1)} mmol/L over ${speedDelta.toFixed(1)} km/h.`,
      });
      if (lactateDelta > 2.3) suspectedOutlierIds.add(current.id);
    }
  }
}

function checkCurveResiduals(
  points: ValidTestPoint[],
  warnings: WarningItem[],
  suspectedOutlierIds: Set<string>,
): void {
  if (points.length < 5) return;
  const coefficients = polynomialRegression(
    points.map((point) => point.speedKmh),
    points.map((point) => point.lactate),
    Math.min(3, points.length - 1),
  );

  points.forEach((point) => {
    const predicted = polynomialPredict(coefficients, point.speedKmh);
    const residual = point.lactate - predicted;
    if (Math.abs(residual) > 0.9) {
      warnings.push({
        id: `curve-residual-${point.id}`,
        severity: Math.abs(residual) > 1.3 ? 'critical' : 'warning',
        metric: 'lactate',
        stepId: point.id,
        message: `Step ${point.step} does not match the surrounding lactate pattern.`,
      });
      if (Math.abs(residual) > 1.3) suspectedOutlierIds.add(point.id);
    }
  });
}

function checkHeartRateConsistency(points: ValidTestPoint[], warnings: WarningItem[]): void {
  const hrPoints = points.filter((point) => isFiniteNumber(point.heartRate)) as Array<
    ValidTestPoint & { heartRate: number }
  >;
  for (let index = 1; index < hrPoints.length; index += 1) {
    const previous = hrPoints[index - 1];
    const current = hrPoints[index];
    const speedDelta = Math.max(0.1, current.speedKmh - previous.speedKmh);
    const hrDelta = current.heartRate - previous.heartRate;
    if (hrDelta < -3) {
      warnings.push({
        id: `hr-drop-${current.id}`,
        severity: 'warning',
        metric: 'heartRate',
        stepId: current.id,
        message: `Heart rate drops by ${Math.abs(hrDelta).toFixed(0)} bpm while speed increases at step ${current.step}.`,
      });
    }
    if (hrDelta / speedDelta > 16) {
      warnings.push({
        id: `hr-jump-${current.id}`,
        severity: 'warning',
        metric: 'heartRate',
        stepId: current.id,
        message: `Heart rate rises very quickly at step ${current.step}: ${hrDelta.toFixed(0)} bpm over ${speedDelta.toFixed(1)} km/h.`,
      });
    }
    if (current.heartRate >= 205) {
      warnings.push({
        id: `hr-high-${current.id}`,
        severity: 'info',
        metric: 'heartRate',
        stepId: current.id,
        message: `Step ${current.step} records ${current.heartRate} bpm. Check max HR context before using HR zones.`,
      });
    }
  }
}
