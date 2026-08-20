import type { MaxLactateResult, ThresholdPair, TrainingZone, ValidTestPoint, ZoneCount } from '../types/lactate';
import { clamp, round, speedToPaceSecondsPerKm } from './conversions';

interface ZoneContext {
  maxIntensity?: number;
  lt1HeartRate?: number;
  lt2HeartRate?: number;
  maxHeartRate?: number;
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
  _points: ValidTestPoint[],
  zoneCount: ZoneCount,
  maxValues?: MaxLactateResult,
): TrainingZone[] {
  const lt1 = thresholds.aerobic?.speedKmh;
  const lt2 = thresholds.anaerobic?.speedKmh;
  if (lt1 == null || lt2 == null || lt2 <= lt1) return [];

  const context: ZoneContext = {
    maxIntensity: maxValues?.speedKmh,
    lt1HeartRate: thresholds.aerobic?.heartRate ? Math.round(thresholds.aerobic.heartRate) : undefined,
    lt2HeartRate: thresholds.anaerobic?.heartRate ? Math.round(thresholds.anaerobic.heartRate) : undefined,
    maxHeartRate: maxValues?.heartRate,
  };

  return standardZones(zoneCount, lt1, lt2, context)
    .map(preventInvertedHeartRateRange)
    .map(toTrainingZone);
}

export function estimateVvo2Speed(anaerobicSpeed: number, maxTestedSpeed: number, maxLactate: number): number {
  const severeDomainEvidence = clamp((maxLactate - 4) / 3, 0, 1);
  const fromThreshold = anaerobicSpeed * (1.08 + 0.04 * severeDomainEvidence);
  const fromTestPeak = maxTestedSpeed * (maxLactate >= 6 ? 1 : 1.03);
  return round(Math.max(fromThreshold, fromTestPeak), 2);
}

function standardZones(zoneCount: ZoneCount, lt1: number, lt2: number, context: ZoneContext): StandardZone[] {
  if (zoneCount === 7) return standard7Zones(lt1, lt2, context);
  return standard5Zones(lt1, lt2, context);
}

function standard5Zones(lt1: number, lt2: number, context: ZoneContext): StandardZone[] {
  const max = context.maxIntensity || 1.2 * lt2;

  const z1Max = round1(0.85 * lt1);
  const z2Max = round1(0.9 * lt1);
  const z3Max = round1(lt2);
  const z4Max = round1(1.03 * lt2);

  const hrZ1Max = context.lt1HeartRate
    ? Math.round(0.85 * context.lt1HeartRate)
    : undefined;
  const hrZ2Max = context.lt1HeartRate
    ? Math.round(0.9 * context.lt1HeartRate)
    : undefined;
  const hrZ3Max = context.lt2HeartRate
    ? Math.round(context.lt2HeartRate)
    : undefined;
  const hrZ4Max = context.lt2HeartRate
    ? Math.round(1.02 * context.lt2HeartRate)
    : undefined;

  return [
    zoneDefinition(
      1,
      'REC',
      '60% LT1 - 85% LT1',
      round1(0.6 * lt1),
      z1Max,
      context.lt1HeartRate
        ? Math.round(0.65 * context.lt1HeartRate)
        : undefined,
      hrZ1Max,
      '#D1D5DB',
    ),
    zoneDefinition(
      2,
      'AER',
      '85% LT1 - 90% LT1',
      z1Max,
      z2Max,
      hrZ1Max != null ? hrZ1Max + 1 : undefined,
      hrZ2Max,
      '#22C55E',
    ),
    zoneDefinition(
      3,
      'TMP',
      '90% LT1 - LT2',
      z2Max,
      z3Max,
      hrZ2Max != null ? hrZ2Max + 1 : undefined,
      hrZ3Max,
      '#EAB308',
    ),
    zoneDefinition(
      4,
      'THR',
      'LT2 - 103% LT2',
      z3Max,
      z4Max,
      hrZ3Max != null ? hrZ3Max + 1 : undefined,
      hrZ4Max,
      '#F97316',
    ),
    zoneDefinition(
      5,
      'VO2',
      '103% LT2 - 120% LT2',
      z4Max,
      round1(max),
      hrZ4Max != null ? hrZ4Max + 1 : undefined,
      context.maxHeartRate || undefined,
      '#EF4444',
    ),
  ];
}

function standard7Zones(lt1: number, lt2: number, context: ZoneContext): StandardZone[] {
  const mid = (Number(lt1) + Number(lt2)) / 2;

  const z1Max = round1(0.8 * lt1);
  const z2Max = round1(0.9 * lt1);
  const z3Max = round1(mid);
  const z4Max = round1(lt2);
  const z5Max = round1(1.03 * lt2);
  const z6Max = round1(1.2 * lt2);

  const hrZ1Max = context.lt1HeartRate
    ? Math.round(0.8 * context.lt1HeartRate)
    : undefined;
  const hrZ2Max = context.lt1HeartRate
    ? Math.round(0.9 * context.lt1HeartRate)
    : undefined;
  const hrZ3Max =
    context.lt1HeartRate && context.lt2HeartRate
      ? Math.round(
          (context.lt1HeartRate + context.lt2HeartRate) / 2,
        )
      : undefined;
  const hrZ4Max = context.lt2HeartRate
    ? Math.round(context.lt2HeartRate)
    : undefined;
  const hrZ5Max = context.lt2HeartRate
    ? Math.round(1.02 * context.lt2HeartRate)
    : undefined;

  const vo2HeartRateFrom =
    hrZ5Max != null ? hrZ5Max + 1 : undefined;

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
      round1(0.65 * lt1),
      z1Max,
      context.lt1HeartRate
        ? Math.round(0.65 * context.lt1HeartRate)
        : undefined,
      hrZ1Max,
      '#D1D5DB',
    ),
    zoneDefinition(
      2,
      'AER',
      '80% LT1 - 90% LT1',
      z1Max,
      z2Max,
      hrZ1Max != null ? hrZ1Max + 1 : undefined,
      hrZ2Max,
      '#9CA3AF',
    ),
    zoneDefinition(
      3,
      'TMP',
      '90% LT1 - 1/2(LT1+LT2)',
      z2Max,
      z3Max,
      hrZ2Max != null ? hrZ2Max + 1 : undefined,
      hrZ3Max,
      '#22C55E',
    ),
    zoneDefinition(
      4,
      'SST',
      '1/2(LT1+LT2) - LT2',
      z3Max,
      z4Max,
      hrZ3Max != null ? hrZ3Max + 1 : undefined,
      hrZ4Max,
      '#EAB308',
    ),
    zoneDefinition(
      5,
      'THR',
      'LT2 - 103% LT2',
      z4Max,
      z5Max,
      hrZ4Max != null ? hrZ4Max + 1 : undefined,
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

function splitNmrHeartRate(
  vo2HeartRateFrom: number | undefined,
  maxHeartRate: number | undefined,
): number | undefined {
  if (vo2HeartRateFrom === undefined || maxHeartRate === undefined) return undefined;
  if (maxHeartRate <= vo2HeartRateFrom) return maxHeartRate;

  return Math.min(
    maxHeartRate,
    Math.ceil(
      vo2HeartRateFrom +
        (maxHeartRate - vo2HeartRateFrom) * NMR_HEART_RATE_SPLIT,
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

function preventInvertedHeartRateRange(zone: StandardZone): StandardZone {
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

function toTrainingZone(zone: StandardZone): TrainingZone {
  const speedToKmh = zone.maxIntensity ?? undefined;
  const paceFromSecondsPerKm = speedToKmh ? speedToPaceSecondsPerKm(speedToKmh) : undefined;
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
    paceToSecondsPerKm: speedToPaceSecondsPerKm(zone.minIntensity) ?? 0,
    heartRateFrom,
    heartRateTo,
    heartRateReliable: heartRateFrom !== undefined || heartRateTo !== undefined,
    intensity: zone.intensity,
    formula: zone.boundaryLabel,
    color: zone.color,
    warning:
      zone.minHeartRate === undefined && zone.maxHeartRate === undefined
        ? 'Add LT1, LT2, or max HR data for this zone.'
        : undefined,
  };
}

function standardZoneDetails(shortName: string, zone: number): Pick<TrainingZone, 'name' | 'purpose' | 'intensity'> {
  const details: Record<string, Pick<TrainingZone, 'name' | 'purpose' | 'intensity'>> = {
    REC: {
      name: `Zone ${zone} - Recovery`,
      purpose: 'Regeneration, warm-ups, cool-downs, and very easy aerobic running.',
      intensity: 'Very easy',
    },
    AER: {
      name: `Zone ${zone} - Aerobic`,
      purpose: 'Aerobic endurance below LT1 with controlled lactate.',
      intensity: 'Easy aerobic',
    },
    TMP: {
      name: `Zone ${zone} - Tempo`,
      purpose: 'Controlled aerobic pressure between LT1 and LT2.',
      intensity: 'Moderate',
    },
    SST: {
      name: `Zone ${zone} - Sub-threshold`,
      purpose: 'Strong steady aerobic work in the upper LT1-LT2 range.',
      intensity: 'Steady hard',
    },
    THR: {
      name: `Zone ${zone} - Above threshold`,
      purpose: 'Work around LT2 and just above it.',
      intensity: 'Hard',
    },
    VO2: {
      name: `Zone ${zone} - VO2max`,
      purpose: 'Fast intervals above threshold up to the high aerobic ceiling.',
      intensity: 'Very hard',
    },
    NMR: {
      name: `Zone ${zone} - Neuromuscular`,
      purpose: 'Short high-speed work above the standard VO2 range.',
      intensity: 'Maximum speed',
    },
    Z1: {
      name: 'Zone 1 - Below LT1',
      purpose: 'Low-intensity work below the first threshold.',
      intensity: 'Easy',
    },
    Z2: {
      name: 'Zone 2 - LT1 to LT2',
      purpose: 'Middle-intensity work between the first and second threshold.',
      intensity: 'Steady to hard',
    },
    Z3: {
      name: 'Zone 3 - Above LT2',
      purpose: 'High-intensity work above the second threshold.',
      intensity: 'Hard',
    },
  };
  return details[shortName];
}

function round1(value: number): number {
  return Math.round(10 * value) / 10;
}
