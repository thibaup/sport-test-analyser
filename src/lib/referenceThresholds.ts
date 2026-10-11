import type { CurvePoint, Lt1MethodId, Lt2MethodId, ThresholdType, ValidTestPoint } from '../types/lactate';

export interface ReferenceDataPoint {
  intensity: number;
  lactate: number;
  heartRate?: number;
}

export interface ReferenceThreshold {
  intensity: number;
  lactate: number;
  heartRate?: number;
}

interface ReferenceCurve {
  type: string;
  degree: number;
  supportsInflection: boolean;
  coefficients: number[] | null;
  evaluate: (x: number) => number;
  derivative: (x: number) => number;
  generatePoints: (start: number, end: number, count?: number) => Array<{ x: number; y: number }>;
  findIntensityAtLactate: (lactate: number, min: number, max: number, tolerance?: number) => number | null;
  findIntensityAtSlope: (slope: number, min: number, max: number) => number | null;
  findInflection: (min: number, max: number) => { x: number; y: number } | null;
}

const DEFAULT_CURVE_TYPE = 'poly3';

export function toReferenceDataPoints(points: ValidTestPoint[]): ReferenceDataPoint[] {
  const groups = new Map<number, { lactateSum: number; count: number; hrSum: number; hrCount: number }>();
  for (const point of points) {
    if (!Number.isFinite(point.speedKmh) || point.speedKmh <= 0 || !Number.isFinite(point.lactate) || point.lactate < 0) continue;
    const group = groups.get(point.speedKmh) ?? { lactateSum: 0, count: 0, hrSum: 0, hrCount: 0 };
    group.lactateSum += point.lactate;
    group.count += 1;
    if (point.heartRate !== undefined && Number.isFinite(point.heartRate) && point.heartRate > 0) {
      group.hrSum += point.heartRate;
      group.hrCount += 1;
    }
    groups.set(point.speedKmh, group);
  }
  return [...groups].map(([intensity, group]) => ({ intensity, lactate: group.lactateSum / group.count,
    heartRate: group.hrCount ? group.hrSum / group.hrCount : undefined }))
    .sort((a, b) => a.intensity - b.intensity);
}

export function calculateReferenceLt1(
  points: ValidTestPoint[],
  method: Lt1MethodId,
  manualSpeed?: number,
): ReferenceThreshold | undefined {
  const dataPoints = toReferenceDataPoints(points);
  if (dataPoints.length < 2) return undefined;
  try {
    const curve = createCurve(dataPoints, DEFAULT_CURVE_TYPE);
    if (method === 'manual_lt1') return manualThreshold(dataPoints, curve, manualSpeed);
    const searchStart = findInitialNadirIntensity(dataPoints);
    if (method === 'fixed_2') return obla(dataPoints, 2, curve, searchStart);

    const baseline = calculateBaselineLactate(dataPoints);
    if (baseline == null) return undefined;
    const lactate = baseline + (method === 'baseline_plus' ? 0.5 : method === 'baseline_plus_04' ? 0.4 : 0);
    return obla(dataPoints, lactate, curve, searchStart);
  } catch {
    return undefined;
  }
}

export function calculateReferenceLt2(
  points: ValidTestPoint[],
  method: Lt2MethodId,
  lt1?: ReferenceThreshold,
  manualSpeed?: number,
): ReferenceThreshold | undefined {
  const dataPoints = toReferenceDataPoints(points);
  if (dataPoints.length < 2) return undefined;
  try {
    const curve = createCurve(dataPoints, DEFAULT_CURVE_TYPE);
    if (method === 'manual_lt2') return manualThreshold(dataPoints, curve, manualSpeed);
    if (method === 'fixed_4') return obla(dataPoints, 4, curve, findInitialNadirIntensity(dataPoints));
    if (method === 'dmax') return dmax(dataPoints, curve);
    if (method === 'dmax_modified') return dmaxModified(dataPoints, curve, lt1);
    if (method === 'tangent51') return tangent51(dataPoints, curve);
    if (method === 'stegmann') return stegmann(dataPoints, curve);
  } catch {
    return undefined;
  }

  return undefined;
}

export function calculateBaselineLactate(dataPoints: ReferenceDataPoint[]): number | null {
  if (!dataPoints.length) return null;
  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  let firstRiseIndex = -1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].lactate - sorted[index - 1].lactate >= 0.4) {
      firstRiseIndex = index;
      break;
    }
  }
  // Require an initial block before the first qualifying rise; a nonflat test without one is unsupported.
  if (sorted.length < 2) return null;
  if (firstRiseIndex < 0 && sorted.some((point) => point.lactate !== sorted[0].lactate)) return null;
  if (firstRiseIndex === 1) return null;
  const baselinePoints = firstRiseIndex > 0 ? sorted.slice(0, firstRiseIndex) : sorted;
  return baselinePoints.reduce((sum, point) => sum + point.lactate, 0) / baselinePoints.length;
}

export function sampleReferenceCurve(points: ValidTestPoint[], count = 160): CurvePoint[] {
  const dataPoints = toReferenceDataPoints(points);
  if (dataPoints.length < 2) return [];
  try {
    const curve = createCurve(dataPoints, DEFAULT_CURVE_TYPE);
    const min = dataPoints[0].intensity;
    const max = dataPoints[dataPoints.length - 1].intensity;
    return curve.generatePoints(min, max, count).map((point) => ({
      speedKmh: point.x,
      smoothedLactate: Math.max(0.4, point.y),
    }));
  } catch {
    return [];
  }
}

export function referenceMethodName(type: ThresholdType, method: Lt1MethodId | Lt2MethodId): string {
  const names: Record<Lt1MethodId | Lt2MethodId, string> = {
    manual_lt1: 'Manual LT1',
    baseline: 'Baseline',
    baseline_plus_04: 'Baseline + 0.4 mmol/L',
    baseline_plus: 'Baseline + 0.5 mmol/L',
    fixed_2: '2.0 mmol/L',
    manual_lt2: 'Manual LT2',
    dmax: 'D-Max',
    dmax_modified: 'D-Max from selected LT1',
    tangent51: 'Tangent 51',
    stegmann: 'Polynomial inflection',
    fixed_4: '4.0 mmol/L',
  };
  const prefix = type === 'aerobic' ? 'LT1' : 'LT2';
  return `${prefix} ${names[method]}`;
}

export function referenceFormula(method: Lt1MethodId | Lt2MethodId): string {
  const formulas: Record<Lt1MethodId | Lt2MethodId, string> = {
    manual_lt1: 'Manual speed selected on the lactate chart',
    baseline: 'Polynomial curve crossing at the calculated baseline lactate after the initial lactate nadir',
    baseline_plus_04: 'Polynomial curve crossing at baseline lactate + 0.4 mmol/L after the initial lactate nadir',
    baseline_plus: 'Polynomial curve crossing at baseline lactate + 0.5 mmol/L after the initial lactate nadir',
    fixed_2: 'Polynomial curve crossing at 2.0 mmol/L after the initial lactate nadir',
    manual_lt2: 'Manual speed selected on the lactate chart',
    dmax: 'Maximum perpendicular distance from polynomial curve to the first-to-last lactate line',
    dmax_modified: 'Maximum perpendicular distance from polynomial curve to the LT1-to-final lactate line',
    tangent51: 'Polynomial curve point where the tangent slope equals tan(51 degrees)',
    stegmann: 'Polynomial curve inflection point',
    fixed_4: 'Polynomial curve crossing at 4.0 mmol/L after the initial lactate nadir',
  };
  return formulas[method];
}

function manualThreshold(
  dataPoints: ReferenceDataPoint[],
  curve: ReferenceCurve,
  manualSpeed?: number,
): ReferenceThreshold | undefined {
  if (manualSpeed == null || !Number.isFinite(manualSpeed)) return undefined;
  const minTestedSpeed = dataPoints[0]?.intensity;
  const maxTestedSpeed = dataPoints[dataPoints.length - 1]?.intensity;
  if (
    minTestedSpeed == null ||
    maxTestedSpeed == null ||
    manualSpeed < minTestedSpeed ||
    manualSpeed > maxTestedSpeed
  ) {
    throw new Error('Manual threshold speed must be within the tested speed range');
  }
  return {
    intensity: Math.round(100 * manualSpeed) / 100,
    lactate: Math.round(100 * Math.max(0, curve.evaluate(manualSpeed))) / 100,
    heartRate: interpolateHeartRate(manualSpeed, dataPoints),
  };
}

function obla(
  dataPoints: ReferenceDataPoint[],
  lactateLevel: number,
  curve: ReferenceCurve,
  searchStartIntensity?: number,
): ReferenceThreshold {
  if (dataPoints.length < 4) throw new Error('At least 4 data points are needed for OBLA analysis');
  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  const min = sorted[0].intensity;
  const max = sorted[sorted.length - 1].intensity;
  const searchStart =
    searchStartIntensity != null && Number.isFinite(searchStartIntensity)
      ? Math.min(Math.max(searchStartIntensity, min), max)
      : min;
  const intensity = curve.findIntensityAtLactate(lactateLevel, searchStart, max);
  if (intensity == null) throw new Error(`Could not find intensity at ${lactateLevel} mmol/L`);
  return {
    intensity: Math.round(100 * intensity) / 100,
    lactate: lactateLevel,
    heartRate: interpolateHeartRate(intensity, dataPoints),
  };
}

function findInitialNadirIntensity(dataPoints: ReferenceDataPoint[], rise = 0.4): number {
  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  if (sorted.length === 0) return 0;
  let firstRiseIndex = -1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].lactate - sorted[index - 1].lactate >= rise) {
      firstRiseIndex = index;
      break;
    }
  }
  const candidates = firstRiseIndex > 0 ? sorted.slice(0, firstRiseIndex) : sorted;
  return candidates.reduce((best, point) => (point.lactate < best.lactate ? point : best), candidates[0]).intensity;
}

function hasDmaxCurvature(curve: ReferenceCurve, min: number, max: number): boolean {
  if (curve.degree < 2 || !(max > min)) return false;
  const samples = curve.generatePoints(min, max, 200);
  const start = samples[0];
  const end = samples[samples.length - 1];
  return samples.some((point) => perpendicularDistance(point, start, end) > 1e-8);
}

function dmax(dataPoints: ReferenceDataPoint[], curve: ReferenceCurve): ReferenceThreshold {
  if (dataPoints.length < 4) throw new Error('At least 4 data points are needed for D-Max analysis');
  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  const min = sorted[0].intensity;
  const max = sorted[sorted.length - 1].intensity;
  const lineStart = { x: min, y: sorted[0].lactate };
  const lineEnd = { x: max, y: sorted[sorted.length - 1].lactate };
  if (!hasDmaxCurvature(curve, min, max)) throw new Error('D-Max curvature unavailable');
  const curvePoints = curve.generatePoints(min, max, 200);
  let maxDistance = 0;
  let maxPoint = curvePoints[0];
  for (const point of curvePoints) {
    const distance = perpendicularDistance(point, lineStart, lineEnd);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxPoint = point;
    }
  }
  if (maxDistance <= 1e-8 || maxPoint.x <= min || maxPoint.x >= max) throw new Error('No interior D-Max');
  return {
    intensity: Math.round(100 * maxPoint.x) / 100,
    lactate: Math.round(100 * maxPoint.y) / 100,
    heartRate: interpolateHeartRate(maxPoint.x, dataPoints),
  };
}

function dmaxModified(dataPoints: ReferenceDataPoint[], curve: ReferenceCurve, lt1?: ReferenceThreshold): ReferenceThreshold {
  if (dataPoints.length < 4) throw new Error('At least 4 data points are needed for D-Max Modified analysis');
  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  const firstRise = findFirstRisePoint(sorted, 0.4);
  const start =
    lt1 && lt1.intensity != null && lt1.lactate != null
      ? { intensity: lt1.intensity, lactate: lt1.lactate }
      : firstRise;
  const min = start.intensity;
  const max = sorted[sorted.length - 1].intensity;
  const lineStart = { x: min, y: start.lactate };
  const lineEnd = { x: max, y: sorted[sorted.length - 1].lactate };
  if (!hasDmaxCurvature(curve, min, max)) throw new Error('D-Max curvature unavailable');
  const candidatePoints = curve.generatePoints(min, max, 200);
  let maxDistance = 0;
  let maxPoint = candidatePoints[0];
  for (const point of candidatePoints) {
    const distance = perpendicularDistance(point, lineStart, lineEnd);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxPoint = point;
    }
  }
  if (maxDistance <= 1e-8 || maxPoint.x <= min || maxPoint.x >= max) throw new Error('No interior D-Max');
  return {
    intensity: Math.round(100 * maxPoint.x) / 100,
    lactate: Math.round(100 * maxPoint.y) / 100,
    heartRate: interpolateHeartRate(maxPoint.x, dataPoints),
  };
}

function tangent51(dataPoints: ReferenceDataPoint[], curve: ReferenceCurve, angle = 51): ReferenceThreshold {
  if (dataPoints.length < 4) throw new Error('At least 4 data points are needed for Tangent 51 analysis');
  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  const min = sorted[0].intensity;
  const max = sorted[sorted.length - 1].intensity;
  if (!hasDmaxCurvature(curve, min, max)) throw new Error('No identifiable tangent point');
  const slope = Math.tan((angle * Math.PI) / 180);
  const intensity = curve.findIntensityAtSlope(slope, min, max);
  if (intensity == null) throw new Error('Could not find tangent point');
  const lactate = curve.evaluate(intensity);
  return {
    intensity: Math.round(100 * intensity) / 100,
    lactate: Math.round(100 * lactate) / 100,
    heartRate: interpolateHeartRate(intensity, dataPoints),
  };
}

function stegmann(dataPoints: ReferenceDataPoint[], curve: ReferenceCurve): ReferenceThreshold {
  if (dataPoints.length < 4) throw new Error('At least 4 data points are needed for Stegmann analysis');
  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  const min = sorted[0].intensity;
  const max = sorted[sorted.length - 1].intensity;
  if (!hasDmaxCurvature(curve, min, max)) throw new Error('Inflection curvature unavailable');
  const point = curve.findInflection(min, max);
  if (point == null) throw new Error('No identifiable polynomial inflection');
  return {
    intensity: Math.round(100 * point.x) / 100,
    lactate: Math.round(100 * point.y) / 100,
    heartRate: interpolateHeartRate(point.x, dataPoints),
  };
}

function createCurve(dataPoints: ReferenceDataPoint[], curveFitType = DEFAULT_CURVE_TYPE): ReferenceCurve {
  const points = dataPoints
    .map((point) => ({ x: Number(point.intensity), y: Number(point.lactate) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => a.x - b.x);

  const groups: Array<{ x: number; sum: number; count: number }> = [];
  for (const point of points) {
    const last = groups[groups.length - 1];
    if (last && last.x === point.x) { last.sum += point.y; last.count += 1; }
    else groups.push({ x: point.x, sum: point.y, count: 1 });
  }
  const deduped = groups.map(({ x, sum, count }) => ({ x, y: sum / count }));

  if (deduped.length < 2) throw new Error('At least 2 data points are needed to determine a curve');
  if (curveFitType === 'linear') return createLinearCurve(deduped);

  let degree = polynomialDegree(curveFitType);
  if (degree >= deduped.length && (degree = deduped.length - 1) < 2) {
    return createLinearCurve(deduped);
  }

  return createPolynomialCurve(deduped, degree);
}

function polynomialDegree(curveType: string): number {
  const match = /^poly([2-6])$/.exec(curveType);
  return match ? Number(match[1]) : 3;
}

function createPolynomialCurve(points: Array<{ x: number; y: number }>, degree: number): ReferenceCurve {
  const minX = points[0].x;
  let range = points[points.length - 1].x - minX;
  if (range <= 0) range = 1;

  const normalize = (x: number) => (x - minX) / range;
  const normalized = points.map((point) => ({
    intensity: normalize(point.x),
    lactate: point.y,
  }));

  const coefficients = fitPolynomialRegression(normalized, degree);
  const firstDerivative = derivativeCoefficients(coefficients);
  const secondDerivative = derivativeCoefficients(firstDerivative);
  const evaluate = (x: number) => evaluatePolynomial(coefficients, normalize(x));
  const derivative = (x: number) => evaluatePolynomial(firstDerivative, normalize(x)) / range;
  const second = (x: number) => evaluatePolynomial(secondDerivative, normalize(x)) / (range * range);

  return {
    type: `poly${degree}`,
    degree,
    supportsInflection: degree >= 3,
    coefficients,
    evaluate,
    derivative,
    generatePoints(start, end, count = 100) {
      const first = Number(start);
      const step = (Number(end) - first) / count;
      const result: Array<{ x: number; y: number }> = [];
      for (let index = 0; index <= count; index += 1) {
        const x = first + index * step;
        result.push({ x, y: evaluate(x) });
      }
      return result;
    },
    findIntensityAtLactate(lactate, min, max, tolerance) {
      return findIntensityAtLactate(evaluate, lactate, min, max, tolerance);
    },
    findIntensityAtSlope(slope, min, max) {
      return findIntensityAtSlope(derivative, slope, min, max, 0.0001);
    },
    findInflection(min, max) {
      if (degree < 3) return null;
      return findInflection(second, evaluate, min, max);
    },
  };
}

function createLinearCurve(points: Array<{ x: number; y: number }>): ReferenceCurve {
  function segmentIndex(x: number): number {
    if (x <= points[0].x) return 0;
    if (x >= points[points.length - 1].x) return points.length - 2;
    for (let index = 0; index < points.length - 1; index += 1) {
      if (x >= points[index].x && x <= points[index + 1].x) return index;
    }
    return points.length - 2;
  }

  function segmentSlope(index: number): number {
    const a = points[index];
    const b = points[index + 1];
    return (b.y - a.y) / (b.x - a.x);
  }

  function evaluate(x: number): number {
    const index = segmentIndex(x);
    const point = points[index];
    return point.y + segmentSlope(index) * (x - point.x);
  }

  return {
    type: 'linear',
    degree: 1,
    supportsInflection: false,
    coefficients: null,
    evaluate,
    derivative(x) {
      return segmentSlope(segmentIndex(x));
    },
    generatePoints(start, end) {
      const first = Number(start);
      const last = Number(end);
      const result: Array<{ x: number; y: number }> = [{ x: first, y: evaluate(first) }];
      for (const point of points) {
        if (point.x > first && point.x < last) result.push({ x: point.x, y: evaluate(point.x) });
      }
      result.push({ x: last, y: evaluate(last) });
      return result;
    },
    findIntensityAtLactate(lactate, min, max, tolerance) {
      return findIntensityAtLactate(evaluate, lactate, min, max, tolerance);
    },
    findIntensityAtSlope(slope, min, max) {
      const low = Number(min);
      const high = Number(max);
      for (let index = 0; index < points.length - 1; index += 1) {
        if (points[index + 1].x <= low) continue;
        if (points[index].x >= high) break;
        if (Math.abs(segmentSlope(index) - slope) <= 0.0001) return Math.max(low, points[index].x);
      }
      return null;
    },
    findInflection() {
      return null;
    },
  };
}

function findIntensityAtLactate(
  evaluate: (x: number) => number,
  lactate: number,
  minIntensity: number,
  maxIntensity: number,
  tolerance = 0.001,
): number | null {
  const min = Number(minIntensity);
  const max = Number(maxIntensity);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return null;
  const step = (max - min) / 200;
  let previousX = min;
  let previousValue = evaluate(min) - lactate;
  if (!Number.isFinite(previousValue)) return null;
  if (Math.abs(previousValue) <= 1e-10 && step > 0 && evaluate(min + step) - lactate > 1e-10) return min;

  for (let index = 1; index <= 200; index += 1) {
    const x = min + index * step;
    const value = evaluate(x) - lactate;
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) <= 1e-10 && previousValue < -1e-10) return x;
    if (previousValue < 0 && value > 0) {
      let low = previousX;
      let high = x;
      for (let iteration = 0; iteration < 80; iteration += 1) {
        const mid = (low + high) / 2;
        const midValue = evaluate(mid) - lactate;
        if (!Number.isFinite(midValue)) return null;
        if (Math.abs(midValue) < tolerance) return mid;
        if (midValue > 0) high = mid;
        else low = mid;
      }
      return (low + high) / 2;
    }
    previousX = x;
    previousValue = value;
  }
  return null;
}

function findIntensityAtSlope(
  derivative: (x: number) => number,
  slope: number,
  minIntensity: number,
  maxIntensity: number,
  tolerance = 0.001,
): number | null {
  const min = Number(minIntensity);
  const max = Number(maxIntensity);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) return null;
  let previousX = min;
  let previousValue = derivative(min) - slope;
  if (!Number.isFinite(previousValue)) return null;
  if (Math.abs(previousValue) <= 1e-10) return min;
  for (let index = 1; index <= 200; index += 1) {
    const x = min + ((max - min) * index) / 200;
    const value = derivative(x) - slope;
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) <= 1e-10) return x;
    if (previousValue * value < 0) {
      let low = previousX;
      let high = x;
      for (let iteration = 0; iteration < 100; iteration += 1) {
        const mid = (low + high) / 2;
        const midValue = derivative(mid) - slope;
        if (!Number.isFinite(midValue)) return null;
        if (Math.abs(midValue) < tolerance) return mid;
        if (previousValue * midValue < 0) high = mid;
        else { low = mid; previousValue = midValue; }
      }
      return (low + high) / 2;
    }
    previousX = x;
    previousValue = value;
  }
  return null;
}

function findInflection(
  secondDerivative: (x: number) => number,
  evaluate: (x: number) => number,
  minIntensity: number,
  maxIntensity: number,
): { x: number; y: number } | null {
  const min = Number(minIntensity);
  const max = Number(maxIntensity);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) return null;
  const intervals = 200;
  const step = (max - min) / intervals;
  let previousX = min;
  let previousValue = secondDerivative(min);

  for (let index = 1; index <= intervals; index += 1) {
    const x = min + index * step;
    const value = secondDerivative(x);

    if (!Number.isFinite(value) || !Number.isFinite(previousValue)) return null;
    if (value === 0) continue;
    if (previousValue * value < 0) {
      let low = previousX;
      let high = x;
      for (let iteration = 0; iteration < 60; iteration += 1) {
        const mid = (low + high) / 2;
        if (previousValue * secondDerivative(mid) <= 0) high = mid;
        else low = mid;
      }
      const root = (low + high) / 2;
      return { x: root, y: evaluate(root) };
    }

    previousX = x;
    previousValue = value;
  }

  return null;
}

function fitPolynomialRegression(points: Array<{ intensity: number; lactate: number }>, degree = 3): number[] {
  const pointCount = points.length;
  if (pointCount <= degree) throw new Error(`Not enough data points (${pointCount}) for polynomial degree ${degree}`);

  const rows: number[][] = [];
  const y: number[] = [];
  for (let rowIndex = 0; rowIndex < pointCount; rowIndex += 1) {
    const row: number[] = [];
    for (let index = 0; index <= degree; index += 1) {
      row.push(Math.pow(points[rowIndex].intensity, index));
    }
    rows.push(row);
    y.push(points[rowIndex].lactate);
  }

  const normalMatrix: number[][] = [];
  for (let row = 0; row <= degree; row += 1) {
    normalMatrix[row] = [];
    for (let col = 0; col <= degree; col += 1) {
      let sum = 0;
      for (let point = 0; point < pointCount; point += 1) {
        sum += rows[point][row] * rows[point][col];
      }
      normalMatrix[row][col] = sum;
    }
  }

  const normalY: number[] = [];
  for (let row = 0; row <= degree; row += 1) {
    let sum = 0;
    for (let point = 0; point < pointCount; point += 1) {
      sum += rows[point][row] * y[point];
    }
    normalY[row] = sum;
  }

  const augmented = normalMatrix.map((row, index) => row.concat([normalY[index]]));
  const size = degree + 1;

  for (let pivot = 0; pivot < size; pivot += 1) {
    let bestRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[bestRow][pivot])) bestRow = row;
    }

    if (!Number.isFinite(augmented[bestRow][pivot]) || Math.abs(augmented[bestRow][pivot]) < 1e-12) {
      throw new Error('Singular polynomial fit');
    }
    const temp = augmented[pivot];
    augmented[pivot] = augmented[bestRow];
    augmented[bestRow] = temp;

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot] / augmented[pivot][pivot];
      for (let col = pivot; col <= size; col += 1) {
        augmented[row][col] -= factor * augmented[pivot][col];
      }
    }
  }

  const coefficients = augmented.map((row, index) => row[size] / row[index]);
  if (!coefficients.every(Number.isFinite)) throw new Error('Invalid polynomial fit');
  return coefficients;
}

function evaluatePolynomial(coefficients: number[], x: number): number {
  let value = 0;
  for (let index = 0; index < coefficients.length; index += 1) {
    value += coefficients[index] * Math.pow(x, index);
  }
  return value;
}

function derivativeCoefficients(coefficients: number[]): number[] {
  if (coefficients.length <= 1) return [0];
  return coefficients.slice(1).map((coefficient, index) => coefficient * (index + 1));
}

function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const numerator = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  const denominator = Math.sqrt(dx * dx + dy * dy);
  return denominator === 0 ? 0 : numerator / denominator;
}

function interpolateHeartRate(intensity: number, dataPoints: ReferenceDataPoint[]): number | undefined {
  const sorted = dataPoints
    .filter((point) => Number.isFinite(point.heartRate))
    .slice().sort((a, b) => a.intensity - b.intensity);
  const groups: Array<{ x: number; sum: number; count: number }> = [];
  for (const point of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.x === point.intensity) { last.sum += point.heartRate!; last.count += 1; }
    else groups.push({ x: point.intensity, sum: point.heartRate!, count: 1 });
  }
  if (!groups.length || intensity < groups[0].x || intensity > groups[groups.length - 1].x) return undefined;
  const value = (group: typeof groups[number]) => group.sum / group.count;
  for (let index = 0; index < groups.length; index += 1) {
    const left = groups[index];
    if (intensity === left.x) return Math.round(value(left));
    const right = groups[index + 1];
    if (right && intensity < right.x) {
      const fraction = (intensity - left.x) / (right.x - left.x);
      return Math.round(value(left) + (value(right) - value(left)) * fraction);
    }
  }
  return undefined;
}

function findFirstRisePoint(dataPoints: ReferenceDataPoint[], rise = 0.4): ReferenceDataPoint {
  const sorted = dataPoints.slice().sort((a, b) => a.intensity - b.intensity);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].lactate - sorted[index - 1].lactate >= rise) return sorted[index];
  }
  return sorted[0];
}
