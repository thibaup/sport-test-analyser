import type { CurvePoint, TestStep, ValidTestPoint } from '../types/lactate';
import {
  calculateDurationSeconds,
  isFiniteNumber,
  paceSecondsPerKmToSpeed,
  speedToPaceSecondsPerKm,
} from './conversions';

export function toValidPoints(steps: TestStep[]): ValidTestPoint[] {
  const points: ValidTestPoint[] = [];
  steps
    .filter((step) => !step.invalid && !step.suspectedOutlier)
    .forEach((step) => {
      const speed = step.speedKmh ?? paceSecondsPerKmToSpeed(step.paceSecondsPerKm);
      const pace = step.paceSecondsPerKm ?? speedToPaceSecondsPerKm(speed);
      const duration = step.durationSeconds ?? calculateDurationSeconds(step.distanceKm, speed);
      if (!isFiniteNumber(speed) || speed <= 0 || !isFiniteNumber(pace) || !isFiniteNumber(step.lactate)) {
        return;
      }
      const point: ValidTestPoint = {
        id: step.id,
        step: step.step,
        distanceKm: isFiniteNumber(step.distanceKm) ? step.distanceKm : undefined,
        speedKmh: speed,
        paceSecondsPerKm: pace,
        durationSeconds: isFiniteNumber(duration) ? duration : undefined,
        lactate: step.lactate,
        heartRate: isFiniteNumber(step.heartRate) ? step.heartRate : undefined,
        rpe: isFiniteNumber(step.rpe) ? step.rpe : undefined,
      };
      points.push(point);
    });
  return points.sort((a, b) => a.speedKmh - b.speedKmh);
}

export function createCurvePoints(steps: TestStep[], validPoints: ValidTestPoint[]): CurvePoint[] {
  const smooth = smoothLactateCurve(validPoints);
  const smoothBySpeed = new Map(smooth.map((point) => [point.speedKmh.toFixed(4), point.smoothedLactate]));

  const curve: CurvePoint[] = [];
  steps.forEach((step) => {
      const speed = step.speedKmh ?? paceSecondsPerKmToSpeed(step.paceSecondsPerKm);
      if (!isFiniteNumber(speed)) return;
      curve.push({
        speedKmh: speed,
        lactate: isFiniteNumber(step.lactate) ? step.lactate : undefined,
        smoothedLactate: smoothBySpeed.get(speed.toFixed(4)),
        heartRate: isFiniteNumber(step.heartRate) ? step.heartRate : undefined,
        invalid: Boolean(step.invalid || step.suspectedOutlier),
        step: step.step,
      });
    });
  return curve.sort((a, b) => a.speedKmh - b.speedKmh);
}

export function linearInterpolate(x1: number, y1: number, x2: number, y2: number, targetY: number): number {
  if (y1 === y2) return (x1 + x2) / 2;
  const ratio = (targetY - y1) / (y2 - y1);
  return x1 + ratio * (x2 - x1);
}

export function interpolateYAtX(points: Array<{ speedKmh: number; value?: number }>, speedKmh: number): number | undefined {
  const usable = points
    .filter((point) => isFiniteNumber(point.value))
    .sort((a, b) => a.speedKmh - b.speedKmh) as Array<{ speedKmh: number; value: number }>;
  if (usable.length < 2) return undefined;
  if (speedKmh < usable[0].speedKmh || speedKmh > usable[usable.length - 1].speedKmh) return undefined;

  for (let index = 0; index < usable.length - 1; index += 1) {
    const current = usable[index];
    const next = usable[index + 1];
    if (speedKmh >= current.speedKmh && speedKmh <= next.speedKmh) {
      if (current.speedKmh === next.speedKmh) return current.value;
      const ratio = (speedKmh - current.speedKmh) / (next.speedKmh - current.speedKmh);
      return current.value + ratio * (next.value - current.value);
    }
  }
  return undefined;
}

export function findSpeedAtLactate(
  points: ValidTestPoint[],
  targetLactate: number,
  preferAfterMinimum = true,
): number | undefined {
  const usable = points.filter((point) => isFiniteNumber(point.lactate)).sort((a, b) => a.speedKmh - b.speedKmh);
  if (usable.length < 2) return undefined;
  const minLactate = Math.min(...usable.map((point) => point.lactate));
  const maxLactate = Math.max(...usable.map((point) => point.lactate));
  if (targetLactate < minLactate || targetLactate > maxLactate) return undefined;

  const minimumIndex = usable.findIndex((point) => point.lactate === minLactate);
  const startIndex = preferAfterMinimum ? Math.max(0, minimumIndex) : 0;
  const crossings: number[] = [];

  for (let index = startIndex; index < usable.length - 1; index += 1) {
    const current = usable[index];
    const next = usable[index + 1];
    const low = Math.min(current.lactate, next.lactate);
    const high = Math.max(current.lactate, next.lactate);
    if (targetLactate >= low && targetLactate <= high) {
      crossings.push(linearInterpolate(current.speedKmh, current.lactate, next.speedKmh, next.lactate, targetLactate));
    }
  }

  return crossings[0];
}

export function smoothLactateCurve(points: ValidTestPoint[]): CurvePoint[] {
  const usable = points.sort((a, b) => a.speedKmh - b.speedKmh);
  if (usable.length === 0) return [];
  if (usable.length < 4) {
    return usable.map((point) => ({
      speedKmh: point.speedKmh,
      lactate: point.lactate,
      smoothedLactate: point.lactate,
      heartRate: point.heartRate,
      step: point.step,
    }));
  }

  const degree = Math.min(3, usable.length - 1);
  const coefficients = polynomialRegression(
    usable.map((point) => point.speedKmh),
    usable.map((point) => point.lactate),
    degree,
  );

  return usable.map((point) => {
    const polynomialValue = polynomialPredict(coefficients, point.speedKmh);
    const neighborValues = usable
      .filter((candidate) => Math.abs(candidate.speedKmh - point.speedKmh) <= 1.5)
      .map((candidate) => candidate.lactate);
    const localAverage = neighborValues.reduce((sum, value) => sum + value, 0) / neighborValues.length;
    return {
      speedKmh: point.speedKmh,
      lactate: point.lactate,
      smoothedLactate: Math.max(0.4, polynomialValue * 0.65 + localAverage * 0.35),
      heartRate: point.heartRate,
      step: point.step,
    };
  });
}

export function samplePolynomialCurve(points: ValidTestPoint[], sampleCount = 160): CurvePoint[] {
  if (points.length < 3) return smoothLactateCurve(points);
  const sorted = points.sort((a, b) => a.speedKmh - b.speedKmh);
  const degree = Math.min(3, sorted.length - 1);
  const coefficients = polynomialRegression(
    sorted.map((point) => point.speedKmh),
    sorted.map((point) => point.lactate),
    degree,
  );
  const minSpeed = sorted[0].speedKmh;
  const maxSpeed = sorted[sorted.length - 1].speedKmh;
  const samples: CurvePoint[] = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const speed = minSpeed + ((maxSpeed - minSpeed) * index) / sampleCount;
    samples.push({
      speedKmh: speed,
      smoothedLactate: Math.max(0.4, polynomialPredict(coefficients, speed)),
    });
  }
  return samples;
}

export function polynomialRegression(xValues: number[], yValues: number[], degree: number): number[] {
  const size = degree + 1;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const vector = Array(size).fill(0);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      matrix[row][col] = xValues.reduce((sum, x) => sum + x ** (row + col), 0);
    }
    vector[row] = xValues.reduce((sum, x, index) => sum + yValues[index] * x ** row, 0);
  }

  return solveLinearSystem(matrix, vector);
}

export function polynomialPredict(coefficients: number[], x: number): number {
  return coefficients.reduce((sum, coefficient, power) => sum + coefficient * x ** power, 0);
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivot = 0; pivot < n; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) {
        maxRow = row;
      }
    }
    [augmented[pivot], augmented[maxRow]] = [augmented[maxRow], augmented[pivot]];

    const divisor = augmented[pivot][pivot] || 1e-12;
    for (let col = pivot; col <= n; col += 1) {
      augmented[pivot][col] /= divisor;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let col = pivot; col <= n; col += 1) {
        augmented[row][col] -= factor * augmented[pivot][col];
      }
    }
  }

  return augmented.map((row) => row[n]);
}

export function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
): number {
  const numerator = Math.abs(
    (lineEnd.y - lineStart.y) * point.x -
      (lineEnd.x - lineStart.x) * point.y +
      lineEnd.x * lineStart.y -
      lineEnd.y * lineStart.x,
  );
  const denominator = Math.hypot(lineEnd.y - lineStart.y, lineEnd.x - lineStart.x);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function findFirstSustainedRiseIndex(points: ValidTestPoint[], riseMmol = 0.4): number {
  const sorted = points.sort((a, b) => a.speedKmh - b.speedKmh);
  let rollingMinimum = sorted[0]?.lactate ?? 0;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].lactate - rollingMinimum >= riseMmol) {
      return Math.max(0, index - 1);
    }
    rollingMinimum = Math.min(rollingMinimum, sorted[index].lactate);
  }
  return 0;
}

export function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } | undefined {
  if (points.length < 2) return undefined;
  const xMean = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const yMean = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const numerator = points.reduce((sum, point) => sum + (point.x - xMean) * (point.y - yMean), 0);
  const denominator = points.reduce((sum, point) => sum + (point.x - xMean) ** 2, 0);
  if (denominator === 0) return undefined;
  const slope = numerator / denominator;
  return { slope, intercept: yMean - slope * xMean };
}
