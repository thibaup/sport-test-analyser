import type {
  MaxLactateResult,
  ThresholdPair,
  TrainingZone,
  ValidTestPoint,
  ZoneCount,
} from '../types/lactate';
import { clamp, round, speedToPaceSecondsPerKm } from './conversions';

interface ZoneContext {
  maxIntensity?: number;
  lt1HeartRate?: number;
  lt2HeartRate?: number;
  maxHeartRate?: number;
  points: ValidTestPoint[];
}

const NMR_HEART_RATE_SPLIT = 0.7;

interface StandardZone {
  id: string;
  zone: number;
  shortName: string;
  boundaryLabel: string;
  minIntensity: number;
  maxIntensity: number | null;
  minHeartRate?: number;
  maxHeartRate?: number | null;
  color: string;
  name: string;
  purpose: string;
  intensity: string;
}

export function generateTrainingZones(
  thresholds: ThresholdPair,
  points: ValidTestPoint[],
  zoneCount: ZoneCount,
  maxValues?: MaxLactateResult,
): TrainingZone[] {
  const lt1 = thresholds.aerobic?.speedKmh;
  const lt2 = thresholds.anaerobic?.speedKmh;

  if (lt1 == null || lt2 == null || lt2 <= lt1) return [];

  const context: ZoneContext = {
    maxIntensity: maxValues?.speedKmh,
    lt1HeartRate:
      thresholds.aerobic?.heartRate != null
        ? Math.round(thresholds.aerobic.heartRate)
        : undefined,
    lt2HeartRate:
      thresholds.anaerobic?.heartRate != null
        ? Math.round(thresholds.anaerobic.heartRate)
        : undefined,
    maxHeartRate: maxValues?.heartRate,
    points,
  };

  return standardZones(zoneCount, lt1, lt2, context)
    .map(preventInvertedHeartRateRange)
    .map(toTrainingZone);
}

export function estimateVvo2Speed(
  anaerobicSpeed: number,
  maxTestedSpeed: number,
  maxLactate: number,
): number {
  const severeDomainEvidence = clamp((maxLactate - 4) / 3, 0, 1);
  const fromThreshold =
    anaerobicSpeed * (1.08 + 0.04 * severeDomainEvidence);
  const fromTestPeak = maxTestedSpeed * (maxLactate >= 6 ? 1 : 1.03);

  return round(Math.max(fromThreshold, fromTestPeak), 2);
}

function standardZones(
  zoneCount: ZoneCount,
  lt1: number,
  lt2: number,
  context: ZoneContext,
): StandardZone[] {
  if (zoneCount === 7) {
    return standard7Zones(lt1, lt2, context);
  }

  return standard5Zones(lt1, lt2, context);
}

function standard5Zones(
  lt1: number,
  lt2: number,
  context: ZoneContext,
): StandardZone[] {
  const max = context.maxIntensity || 1.2 * lt2;

  const z1Min = round1(0.6 * lt1);
  const z1Max = round1(0.85 * lt1);
  const z2Max = round1(0.95 * lt1);
  const z3Max = round1(lt2);
  const z4Max = round1(1.03 * lt2);
  const z5Max = round1(max);

  const hrZ1Min = estimateHeartRateAtSpeed(
    z1Min,
    context.points,
  );

  const hrZ1Max = estimateHeartRateAtSpeed(
    z1Max,
    context.points,
  );

  const hrZ2Max = estimateHeartRateAtSpeed(
    z2Max,
    context.points,
  );

  const hrZ3Max =
    context.lt2HeartRate ??
    estimateHeartRateAtSpeed(z3Max, context.points);

  const hrZ4Max =
    estimateHeartRateAtSpeed(z4Max, context.points) ??
    (context.lt2HeartRate != null
      ? Math.round(1.02 * context.lt2HeartRate)
      : undefined);

  const hrZ5Max =
    context.maxHeartRate ??
    estimateHeartRateAtSpeed(z5Max, context.points);

  return [
    zoneDefinition(
      1,
      'REC',
      '60% LT1 - 85% LT1',
      z1Min,
      z1Max,
      hrZ1Min,
      hrZ1Max,
      '#D1D5DB',
    ),
    zoneDefinition(
      2,
      'AER',
      '85% LT1 - 95% LT1',
      z1Max,
      z2Max,
      nextHeartRate(hrZ1Max),
      hrZ2Max,
      '#22C55E',
    ),
    zoneDefinition(
      3,
      'TMP',
      '95% LT1 - LT2',
      z2Max,
      z3Max,
      nextHeartRate(hrZ2Max),
      hrZ3Max,
      '#EAB308',
    ),
    zoneDefinition(
      4,
      'THR',
      'LT2 - 103% LT2',
      z3Max,
      z4Max,
      nextHeartRate(hrZ3Max),
      hrZ4Max,
      '#F97316',
    ),
    zoneDefinition(
      5,
      'VO2',
      '103% LT2 - 120% LT2',
      z4Max,
      z5Max,
      nextHeartRate(hrZ4Max),
      hrZ5Max,
      '#EF4444',
    ),
  ];
}

function standard7Zones(
  lt1: number,
  lt2: number,
  context: ZoneContext,
): StandardZone[] {
  const mid = (Number(lt1) + Number(lt2)) / 2;

  const z1Min = round1(0.65 * lt1);
  const z1Max = round1(0.8 * lt1);
  const z2Max = round1(0.95 * lt1);
  const z3Max = round1(mid);
  const z4Max = round1(lt2);
  const z5Max = round1(1.03 * lt2);
  const z6Max = round1(1.2 * lt2);

  const hrZ1Min = estimateHeartRateAtSpeed(
    z1Min,
    context.points,
  );

  const hrZ1Max = estimateHeartRateAtSpeed(
    z1Max,
    context.points,
  );

  const hrZ2Max = estimateHeartRateAtSpeed(
    z2Max,
    context.points,
  );

  const hrZ3Max =
    estimateHeartRateAtSpeed(z3Max, context.points) ??
    interpolateThresholdHeartRate(
      z3Max,
      lt1,
      lt2,
      context.lt1HeartRate,
      context.lt2HeartRate,
    );

  const hrZ4Max =
    context.lt2HeartRate ??
    estimateHeartRateAtSpeed(z4Max, context.points);

  const hrZ5Max =
    estimateHeartRateAtSpeed(z5Max, context.points) ??
    (context.lt2HeartRate != null
      ? Math.round(1.02 * context.lt2HeartRate)
      : undefined);

  const vo2HeartRateFrom = nextHeartRate(hrZ5Max);

  const nmrHeartRateFrom = splitNmrHeartRate(
    vo2HeartRateFrom,
    context.maxHeartRate,
  );

  const vo2HeartRateTo =
    nmrHeartRateFrom !== undefined &&
    vo2HeartRateFrom !== undefined &&
    nmrHeartRateFrom > vo2HeartRateFrom
      ? nmrHeartRateFrom - 1
      : context.maxHeartRate;

  return [
    zoneDefinition(
      1,
      'REC',
      '65% LT1 - 80% LT1',
      z1Min,
      z1Max,
      hrZ1Min,
      hrZ1Max,
      '#D1D5DB',
    ),
    zoneDefinition(
      2,
      'AER',
      '80% LT1 - 95% LT1',
      z1Max,
      z2Max,
      nextHeartRate(hrZ1Max),
      hrZ2Max,
      '#9CA3AF',
    ),
    zoneDefinition(
      3,
      'TMP',
      '95% LT1 - 1/2(LT1+LT2)',
      z2Max,
      z3Max,
      nextHeartRate(hrZ2Max),
      hrZ3Max,
      '#22C55E',
    ),
    zoneDefinition(
      4,
      'SST',
      '1/2(LT1+LT2) - LT2',
      z3Max,
      z4Max,
      nextHeartRate(hrZ3Max),
      hrZ4Max,
      '#EAB308',
    ),
    zoneDefinition(
      5,
      'THR',
      'LT2 - 103% LT2',
      z4Max,
      z5Max,
      nextHeartRate(hrZ4Max),
      hrZ5Max,
      '#F97316',
    ),
    zoneDefinition(
      6,
      'VO2',
      '103% LT2 - 120% LT2',
      z5Max,
      z6Max,
      vo2HeartRateFrom,
      vo2HeartRateTo,
      '#EF4444',
    ),
    zoneDefinition(
      7,
      'NMR',
      '> 120% LT2',
      z6Max,
      null,
      nmrHeartRateFrom,
      null,
      '#991B1B',
    ),
  ];
}

function estimateHeartRateAtSpeed(
  speedKmh: number,
  points: ValidTestPoint[],
): number | undefined {
  const validPoints = points
    .filter(
      (point) =>
        Number.isFinite(point.speedKmh) &&
        Number.isFinite(point.heartRate),
    )
    .map((point) => ({
      speedKmh: Number(point.speedKmh),
      heartRate: Number(point.heartRate),
    }))
    .sort((a, b) => a.speedKmh - b.speedKmh);

  if (validPoints.length === 0) return undefined;

  const groupedPoints: Array<{
    speedKmh: number;
    heartRate: number;
  }> = [];

  for (const point of validPoints) {
    const previous = groupedPoints[groupedPoints.length - 1];

    if (previous && previous.speedKmh === point.speedKmh) {
      previous.heartRate = (previous.heartRate + point.heartRate) / 2;
    } else {
      groupedPoints.push({ ...point });
    }
  }

  if (groupedPoints.length === 1) {
    return groupedPoints[0].speedKmh === speedKmh
      ? Math.round(groupedPoints[0].heartRate)
      : undefined;
  }

  if (
    speedKmh < groupedPoints[0].speedKmh ||
    speedKmh > groupedPoints[groupedPoints.length - 1].speedKmh
  ) {
    return undefined;
  }

  for (const point of groupedPoints) {
    if (point.speedKmh === speedKmh) {
      return Math.round(point.heartRate);
    }
  }

  for (let i = 0; i < groupedPoints.length - 1; i++) {
    const lower = groupedPoints[i];
    const upper = groupedPoints[i + 1];

    if (
      speedKmh < lower.speedKmh ||
      speedKmh > upper.speedKmh
    ) {
      continue;
    }

    const fraction =
      (speedKmh - lower.speedKmh) /
      (upper.speedKmh - lower.speedKmh);

    return Math.round(
      lower.heartRate +
        fraction * (upper.heartRate - lower.heartRate),
    );
  }

  return undefined;
}

function interpolateThresholdHeartRate(
  speedKmh: number,
  lt1Speed: number,
  lt2Speed: number,
  lt1HeartRate: number | undefined,
  lt2HeartRate: number | undefined,
): number | undefined {
  if (
    lt1HeartRate === undefined ||
    lt2HeartRate === undefined ||
    lt2Speed <= lt1Speed
  ) {
    return undefined;
  }

  const fraction = clamp(
    (speedKmh - lt1Speed) / (lt2Speed - lt1Speed),
    0,
    1,
  );

  return Math.round(
    lt1HeartRate +
      fraction * (lt2HeartRate - lt1HeartRate),
  );
}

function nextHeartRate(
  heartRate: number | undefined,
): number | undefined {
  return heartRate != null ? heartRate + 1 : undefined;
}

function splitNmrHeartRate(
  vo2HeartRateFrom: number | undefined,
  maxHeartRate: number | undefined,
): number | undefined {
  if (
    vo2HeartRateFrom === undefined ||
    maxHeartRate === undefined
  ) {
    return undefined;
  }

  if (maxHeartRate <= vo2HeartRateFrom) {
    return maxHeartRate;
  }

  return Math.min(
    maxHeartRate,
    Math.ceil(
      vo2HeartRateFrom +
        (maxHeartRate - vo2HeartRateFrom) *
          NMR_HEART_RATE_SPLIT,
    ),
  );
}

function zoneDefinition(
  zone: number,
  shortName: string,
  boundaryLabel: string,
  minIntensity: number,
  maxIntensity: number | null,
  minHeartRate: number | undefined,
  maxHeartRate: number | null | undefined,
  color: string,
): StandardZone {
  const details = standardZoneDetails(shortName, zone);

  return {
    id: `z${zone}-${shortName.toLowerCase()}`,
    zone,
    shortName,
    boundaryLabel,
    minIntensity,
    maxIntensity,
    minHeartRate,
    maxHeartRate,
    color,
    ...details,
  };
}

function preventInvertedHeartRateRange(
  zone: StandardZone,
): StandardZone {
  if (
    zone.minHeartRate === undefined ||
    zone.maxHeartRate === undefined ||
    zone.maxHeartRate === null ||
    zone.minHeartRate <= zone.maxHeartRate
  ) {
    return zone;
  }

  return {
    ...zone,
    minHeartRate: zone.maxHeartRate,
    maxHeartRate: zone.maxHeartRate,
  };
}

function toTrainingZone(
  zone: StandardZone,
): TrainingZone {
  const speedToKmh = zone.maxIntensity ?? undefined;

  const paceFromSecondsPerKm = speedToKmh
    ? speedToPaceSecondsPerKm(speedToKmh)
    : undefined;

  const heartRateFrom = zone.minHeartRate;
  const heartRateTo = zone.maxHeartRate ?? undefined;

  return {
    id: zone.id,
    shortName: zone.shortName,
    boundaryLabel: zone.boundaryLabel,
    name: zone.name,
    purpose: zone.purpose,
    speedFromKmh: zone.minIntensity,
    speedToKmh,
    paceFromSecondsPerKm,
    paceToSecondsPerKm:
      speedToPaceSecondsPerKm(zone.minIntensity) ?? 0,
    heartRateFrom,
    heartRateTo,
    heartRateReliable:
      heartRateFrom !== undefined ||
      heartRateTo !== undefined,
    intensity: zone.intensity,
    formula: zone.boundaryLabel,
    color: zone.color,
    warning:
      zone.minHeartRate === undefined &&
      zone.maxHeartRate === undefined
        ? 'Add LT1, LT2, or max HR data for this zone.'
        : undefined,
  };
}

function standardZoneDetails(
  shortName: string,
  zone: number,
): Pick<
  TrainingZone,
  'name' | 'purpose' | 'intensity'
> {
  const details: Record<
    string,
    Pick<TrainingZone, 'name' | 'purpose' | 'intensity'>
  > = {
    REC: {
      name: `Zone ${zone} - Recovery`,
      purpose:
        'Regeneration, warm-ups, cool-downs, and very easy aerobic running.',
      intensity: 'Very easy',
    },
    AER: {
      name: `Zone ${zone} - Aerobic`,
      purpose:
        'Aerobic endurance below LT1 with controlled lactate.',
      intensity: 'Easy aerobic',
    },
    TMP: {
      name: `Zone ${zone} - Tempo`,
      purpose:
        'Controlled aerobic pressure between LT1 and LT2.',
      intensity: 'Moderate',
    },
    SST: {
      name: `Zone ${zone} - Sub-threshold`,
      purpose:
        'Strong steady aerobic work in the upper LT1-LT2 range.',
      intensity: 'Steady hard',
    },
    THR: {
      name: `Zone ${zone} - Above threshold`,
      purpose: 'Work around LT2 and just above it.',
      intensity: 'Hard',
    },
    VO2: {
      name: `Zone ${zone} - VO2max`,
      purpose:
        'Fast intervals above threshold up to the high aerobic ceiling.',
      intensity: 'Very hard',
    },
    NMR: {
      name: `Zone ${zone} - Neuromuscular`,
      purpose:
        'Short high-speed work above the standard VO2 range.',
      intensity: 'Maximum speed',
    },
    Z1: {
      name: 'Zone 1 - Below LT1',
      purpose:
        'Low-intensity work below the first threshold.',
      intensity: 'Easy',
    },
    Z2: {
      name: 'Zone 2 - LT1 to LT2',
      purpose:
        'Middle-intensity work between the first and second threshold.',
      intensity: 'Steady to hard',
    },
    Z3: {
      name: 'Zone 3 - Above LT2',
      purpose:
        'High-intensity work above the second threshold.',
      intensity: 'Hard',
    },
  };

  return details[shortName];
}

function round1(value: number): number {
  return Math.round(10 * value) / 10;
}