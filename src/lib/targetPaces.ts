import type {
  RaceEstimate,
  RaceTime,
  TargetDistanceTime,
  TargetPaceCategory,
  TargetRecoveryType,
  ThresholdPair,
  ValidTestPoint,
  ZoneProfile,
} from '../types/lactate';
import { clamp, round, speedToPaceSecondsPerKm, timeForDistanceSeconds } from './conversions';
import {
  calculateRiegelBlendWeight,
  estimateRiegelPerformances,
  estimateRiegelTimeForDistance,
  usableRaceTimes,
} from './raceCalculations';
import { estimateVvo2Speed } from './trainingZones';

type AnchorId = 'aerobic' | 'anaerobic' | 'vvo2' | 'maxTested' | 'sprintReserve';

type TargetCategoryConfig = {
  id: string;
  name: string;
  purpose: string;
  anchor: AnchorId;
  intensityFrom: number;
  intensityTo: number;
  referenceDistanceMeters: number;
  fatigueExponent: number;
  correctionMin: number;
  correctionMax: number;
  distancesMeters: number[];
  volumeFromMeters: number;
  volumeToMeters: number;
  minReps: number;
  maxReps: number;
  maxRepSpread: number;
  recoveryType: TargetRecoveryType;
  recoveryBaseSeconds: number;
  recoveryPerMeter: number;
  recoveryTimeRatio?: number;
  raceTimeFastFactor?: number;
  raceTimeControlledFactor?: number;
};

const targetCategories: TargetCategoryConfig[] = [
  {
    id: 'easy-intervals',
    name: 'Easy aerobic intervals',
    purpose: 'Low-pressure repeats for rhythm, mechanics, and aerobic control below the first threshold.',
    anchor: 'aerobic',
    intensityFrom: 0.94,
    intensityTo: 1.0,
    referenceDistanceMeters: 1000,
    fatigueExponent: 0.025,
    correctionMin: 0.96,
    correctionMax: 1.08,
    distancesMeters: [200, 300, 400, 600, 800, 1000, 1200, 1600],
    volumeFromMeters: 3200,
    volumeToMeters: 6400,
    minReps: 4,
    maxReps: 16,
    maxRepSpread: 3,
    recoveryType: 'easyJog',
    recoveryBaseSeconds: 20,
    recoveryPerMeter: 0.06,
  },
  {
    id: 'extensive',
    name: 'Extensive intervals',
    purpose: 'Controlled aerobic interval volume between aerobic threshold and LT2 without forcing lactate too high.',
    anchor: 'anaerobic',
    intensityFrom: 0.9,
    intensityTo: 0.97,
    referenceDistanceMeters: 1000,
    fatigueExponent: 0.03,
    correctionMin: 0.95,
    correctionMax: 1.1,
    distancesMeters: [200, 300, 400, 600, 800, 1000, 1200, 1600],
    volumeFromMeters: 3600,
    volumeToMeters: 7600,
    minReps: 4,
    maxReps: 18,
    maxRepSpread: 3,
    recoveryType: 'jog',
    recoveryBaseSeconds: 30,
    recoveryPerMeter: 0.095,
  },
  {
    id: 'threshold',
    name: 'Threshold intervals',
    purpose: 'Cruise-style work around LT2 with controlled lactate, short recoveries, and sustainable total volume.',
    anchor: 'anaerobic',
    intensityFrom: 0.985,
    intensityTo: 1.025,
    referenceDistanceMeters: 1000,
    fatigueExponent: 0.025,
    correctionMin: 0.96,
    correctionMax: 1.08,
    distancesMeters: [400, 600, 800, 1000, 1200, 1600, 2000],
    volumeFromMeters: 3000,
    volumeToMeters: 6400,
    minReps: 2,
    maxReps: 10,
    maxRepSpread: 2,
    recoveryType: 'easyJog',
    recoveryBaseSeconds: 25,
    recoveryPerMeter: 0.065,
  },
  {
    id: 'vo2max',
    name: 'VO2max intervals',
    purpose: 'Distance-specific repeats near estimated vVO2 with fatigue correction to avoid making long reps too aggressive.',
    anchor: 'vvo2',
    intensityFrom: 0.96,
    intensityTo: 1.03,
    referenceDistanceMeters: 800,
    fatigueExponent: 0.06,
    correctionMin: 0.94,
    correctionMax: 1.12,
    distancesMeters: [300, 400, 500, 600, 800, 1000, 1200],
    volumeFromMeters: 2400,
    volumeToMeters: 5000,
    minReps: 3,
    maxReps: 10,
    maxRepSpread: 2,
    recoveryType: 'jog',
    recoveryBaseSeconds: 25,
    recoveryPerMeter: 0.08,
    recoveryTimeRatio: 0.45,
  },
  {
    id: 'race-resistance',
    name: 'Race-specific resistance',
    purpose: 'Fast controlled reps above threshold for speed endurance, lactate tolerance, and finishing strength.',
    anchor: 'sprintReserve',
    intensityFrom: 0.86,
    intensityTo: 0.94,
    referenceDistanceMeters: 500,
    fatigueExponent: 0.1,
    correctionMin: 0.88,
    correctionMax: 1.18,
    distancesMeters: [200, 300, 400, 500, 600],
    volumeFromMeters: 1400,
    volumeToMeters: 3000,
    minReps: 2,
    maxReps: 8,
    maxRepSpread: 2,
    recoveryType: 'walkJog',
    recoveryBaseSeconds: 120,
    recoveryPerMeter: 0.48,
    raceTimeFastFactor: 0.97,
    raceTimeControlledFactor: 1.04,
  },
  {
    id: 'sprint',
    name: 'Sprint / neuromuscular speed',
    purpose: 'Very fast, low-volume running for mechanics, stiffness, and recruitment. Full recovery matters more than volume.',
    anchor: 'sprintReserve',
    intensityFrom: 1.1,
    intensityTo: 1.2,
    referenceDistanceMeters: 120,
    fatigueExponent: 0.12,
    correctionMin: 0.84,
    correctionMax: 1.2,
    distancesMeters: [60, 80, 100, 120, 150, 200],
    volumeFromMeters: 360,
    volumeToMeters: 900,
    minReps: 3,
    maxReps: 8,
    maxRepSpread: 2,
    recoveryType: 'full',
    recoveryBaseSeconds: 120,
    recoveryPerMeter: 1.2,
    raceTimeFastFactor: 0.9,
    raceTimeControlledFactor: 0.95,
  },
];

const profileSettings: Record<ZoneProfile, { intensityShift: number; volumeMultiplier: number }> = {
  beginner: { intensityShift: -0.012, volumeMultiplier: 0.82 },
  intermediate: { intensityShift: 0, volumeMultiplier: 1 },
  advanced: { intensityShift: 0.01, volumeMultiplier: 1.12 },
};

export function generateTargetPaces(
  thresholds: ThresholdPair,
  points: ValidTestPoint[],
  profile: ZoneProfile,
  raceTimes: RaceTime[] = [],
  lactateMaxOverride?: number,
): TargetPaceCategory[] {
  const aerobic = thresholds.aerobic?.speedKmh;
  const anaerobic = thresholds.anaerobic?.speedKmh;
  if (!aerobic || !anaerobic || anaerobic <= aerobic || points.length < 4) return [];

  const maxTested = Math.max(...points.map((point) => point.speedKmh));
  const maxLactate = lactateMaxOverride ?? Math.max(...points.map((point) => point.lactate));
  const vvo2 = estimateVvo2Speed(anaerobic, maxTested, maxLactate);
  const sprintReserve = estimateSprintReserveSpeed(aerobic, anaerobic, vvo2, maxTested, maxLactate);
  const profileSetting = profileSettings[profile];

  return targetCategories.map((category) => {
    const anchor = selectAnchor(category.anchor, { aerobic, anaerobic, vvo2, maxTested, sprintReserve });
    const intensityFrom = Math.max(0.1, category.intensityFrom + profileSetting.intensityShift);
    const intensityTo = Math.max(intensityFrom + 0.02, category.intensityTo + profileSetting.intensityShift);
    const baseSpeedFrom = anchor * intensityFrom;
    const baseSpeedTo = anchor * intensityTo;
    const times = category.distancesMeters.map((distance) => {
      const raceSpecificTime =
        category.id === 'race-resistance' || category.id === 'sprint'
          ? estimateRiegelTimeForDistance(raceTimes, distance)
          : undefined;
      return calculateDistanceRecommendation(
        distance,
        baseSpeedFrom,
        baseSpeedTo,
        category,
        profileSetting.volumeMultiplier,
        raceSpecificTime,
      );
    });
    const minSpeed = Math.min(...times.map((time) => time.speedFromKmh));
    const maxSpeed = Math.max(...times.map((time) => time.speedToKmh));
    const warning =
      (category.anchor === 'sprintReserve' || category.anchor === 'vvo2') && maxLactate < 6
        ? 'Fast targets need caution because the test may not have reached a high lactate endpoint.'
        : undefined;

    return {
      id: category.id,
      name: category.name,
      purpose: category.purpose,
      speedFromKmh: round(minSpeed, 1),
      speedToKmh: round(maxSpeed, 1),
      paceFromSecondsPerKm: speedToPaceSecondsPerKm(maxSpeed) ?? 0,
      paceToSecondsPerKm: speedToPaceSecondsPerKm(minSpeed) ?? 0,
      recovery: 'Distance-specific',
      repetitions: 'Distance-specific',
      totalVolume: 'Distance-specific',
      formula: `Anchor ${category.anchor} x ${intensityFrom.toFixed(3)}-${intensityTo.toFixed(3)} x (distance/${category.referenceDistanceMeters}m)^-${category.fatigueExponent.toFixed(3)}`,
      times,
      warning,
    };
  });
}

function calculateDistanceRecommendation(
  distanceMeters: number,
  baseSpeedFromKmh: number,
  baseSpeedToKmh: number,
  category: TargetCategoryConfig,
  volumeMultiplier: number,
  raceSpecificTimeSeconds?: number,
): TargetDistanceTime {
  if (raceSpecificTimeSeconds) {
    const fastFactor = category.raceTimeFastFactor ?? 0.97;
    const controlledFactor = category.raceTimeControlledFactor ?? 1.04;
    const fastTime = raceSpecificTimeSeconds * fastFactor;
    const controlledTime = raceSpecificTimeSeconds * controlledFactor;
    const speedFrom = speedFromTime(distanceMeters, controlledTime);
    const speedTo = speedFromTime(distanceMeters, fastTime);
    const avgTime = (fastTime + controlledTime) / 2;
    const reps = calculateRepetitions(distanceMeters, category, volumeMultiplier);
    const recoverySeconds = roundToNearestFive(
      category.recoveryBaseSeconds + distanceMeters * category.recoveryPerMeter + avgTime * (category.recoveryTimeRatio ?? 0),
    );

    return {
      distanceMeters,
      timeFromSeconds: fastTime,
      timeToSeconds: controlledTime,
      speedFromKmh: round(speedFrom, 2),
      speedToKmh: round(speedTo, 2),
      paceFromSecondsPerKm: speedToPaceSecondsPerKm(speedTo) ?? 0,
      paceToSecondsPerKm: speedToPaceSecondsPerKm(speedFrom) ?? 0,
      repetitionsFrom: reps.from,
      repetitionsTo: reps.to,
      recoverySeconds,
      recoveryType: category.recoveryType,
      totalVolumeMetersFrom: reps.from * distanceMeters,
      totalVolumeMetersTo: reps.to * distanceMeters,
      explanation: distanceUseExplanation(category.id, distanceMeters),
      formula: `Riegel median race projection x ${(fastFactor * 100).toFixed(0)}-${(controlledFactor * 100).toFixed(0)}% target window`,
    };
  }

  const correction = clamp(
    (distanceMeters / category.referenceDistanceMeters) ** -category.fatigueExponent,
    category.correctionMin,
    category.correctionMax,
  );
  const speedFrom = Math.max(1, baseSpeedFromKmh * correction);
  const speedTo = Math.max(speedFrom + 0.1, baseSpeedToKmh * correction);
  const fastTime = timeForDistanceSeconds(distanceMeters, speedTo);
  const controlledTime = timeForDistanceSeconds(distanceMeters, speedFrom);
  const avgTime = (fastTime + controlledTime) / 2;
  const reps = calculateRepetitions(distanceMeters, category, volumeMultiplier);
  const recoverySeconds = roundToNearestFive(
    category.recoveryBaseSeconds + distanceMeters * category.recoveryPerMeter + avgTime * (category.recoveryTimeRatio ?? 0),
  );

  return {
    distanceMeters,
    timeFromSeconds: fastTime,
    timeToSeconds: controlledTime,
    speedFromKmh: round(speedFrom, 2),
    speedToKmh: round(speedTo, 2),
    paceFromSecondsPerKm: speedToPaceSecondsPerKm(speedTo) ?? 0,
    paceToSecondsPerKm: speedToPaceSecondsPerKm(speedFrom) ?? 0,
    repetitionsFrom: reps.from,
    repetitionsTo: reps.to,
    recoverySeconds,
    recoveryType: category.recoveryType,
    totalVolumeMetersFrom: reps.from * distanceMeters,
    totalVolumeMetersTo: reps.to * distanceMeters,
    explanation: distanceUseExplanation(category.id, distanceMeters),
    formula: `time = distance / (${category.anchor} anchor x intensity x ${(distanceMeters / category.referenceDistanceMeters).toFixed(2)}^-${category.fatigueExponent.toFixed(3)})`,
  };
}

function speedFromTime(distanceMeters: number, timeSeconds: number): number {
  return (distanceMeters / 1000 / timeSeconds) * 3600;
}

function calculateRepetitions(
  distanceMeters: number,
  category: TargetCategoryConfig,
  volumeMultiplier: number,
): { from: number; to: number } {
  const minVolume = category.volumeFromMeters * volumeMultiplier;
  const maxVolume = category.volumeToMeters * volumeMultiplier;
  const from = clamp(Math.ceil(minVolume / distanceMeters), category.minReps, category.maxReps);
  const rawTo = clamp(Math.floor(maxVolume / distanceMeters), from, category.maxReps);
  const to = Math.min(rawTo, from + category.maxRepSpread);
  return { from, to };
}

function selectAnchor(
  anchor: AnchorId,
  values: Record<AnchorId, number>,
): number {
  return values[anchor];
}

function estimateSprintReserveSpeed(
  aerobic: number,
  anaerobic: number,
  vvo2: number,
  maxTested: number,
  maxLactate: number,
): number {
  const thresholdGap = Math.max(0.4, anaerobic - aerobic);
  const endpointConfidence = clamp((maxLactate - 4) / 4, 0, 1);
  const fromThresholdReserve = anaerobic + thresholdGap * (2.2 + endpointConfidence * 0.8);
  const fromTestPeak = maxTested * (1.08 + endpointConfidence * 0.08);
  const fromVvo2 = vvo2 * 1.08;
  return round(Math.max(fromThresholdReserve, fromTestPeak, fromVvo2), 2);
}

function distanceUseExplanation(categoryId: string, distanceMeters: number): string {
  if (categoryId === 'sprint') {
    if (distanceMeters <= 80) return 'Pure acceleration and posture without meaningful lactate load.';
    if (distanceMeters <= 120) return 'Fast mechanics, stiffness, and top-speed exposure with full recovery.';
    return 'Speed endurance while keeping the session low-volume and high-quality.';
  }
  if (categoryId === 'race-resistance') {
    if (distanceMeters <= 300) return 'Useful for sharpening, closing speed, and pace changes.';
    if (distanceMeters <= 500) return 'Strong speed-endurance stimulus for middle-distance and 5K ability.';
    return 'Demanding resistance rep; best when the athlete already tolerates fast work.';
  }
  if (categoryId === 'vo2max') {
    if (distanceMeters <= 400) return 'Raises oxygen uptake with less local muscular fatigue.';
    if (distanceMeters <= 800) return 'Core VO2max distance: enough duration without excessive slowing.';
    return 'Long VO2max rep; fatigue correction keeps it realistic and repeatable.';
  }
  if (categoryId === 'threshold') {
    if (distanceMeters <= 600) return 'Short cruise rep for rhythm, control, and low recovery cost.';
    if (distanceMeters <= 1200) return 'Classic threshold interval for accumulating controlled work.';
    return 'Long threshold rep for stamina; pace should stay sustainable.';
  }
  if (categoryId === 'extensive') {
    if (distanceMeters <= 400) return 'Technique-friendly aerobic repetition with modest lactate pressure.';
    if (distanceMeters <= 1000) return 'Main aerobic interval distance for building repeatable rhythm.';
    return 'Long aerobic interval for endurance without drifting into race effort.';
  }
  if (distanceMeters <= 400) return 'Low-risk rhythm work, drills, and economy at controlled speed.';
  if (distanceMeters <= 1000) return 'Aerobic control and relaxed mechanics over repeatable reps.';
  return 'Long controlled aerobic repetition for pacing discipline.';
}

function roundToNearestFive(value: number): number {
  return Math.max(15, Math.round(value / 5) * 5);
}

export function estimateRacePerformances(
  thresholds: ThresholdPair,
  points: ValidTestPoint[],
  raceTimes: RaceTime[] = [],
  lactateMaxOverride?: number,
): RaceEstimate[] {
  const riegelEstimates = estimateRiegelPerformances(raceTimes);
  const lactateEstimates = estimateLactateRacePerformances(
    thresholds,
    points,
    lactateMaxOverride,
  );
  if (riegelEstimates.length === 0) return lactateEstimates;
  if (lactateEstimates.length === 0) return riegelEstimates;

  const inputs = usableRaceTimes(raceTimes);
  const maxProvidedDistance = Math.max(
    ...inputs.map((input) => input.distanceMeters),
  );
  const lactateByDistance = new Map(
    lactateEstimates.map((estimate) => [estimate.distanceMeters, estimate]),
  );

  return riegelEstimates.map((riegelEstimate) => {
    const lactateEstimate = lactateByDistance.get(riegelEstimate.distanceMeters);
    if (
      !lactateEstimate ||
      riegelEstimate.distanceMeters <= maxProvidedDistance
    ) {
      return riegelEstimate;
    }

    const riegelWeight = calculateRiegelBlendWeight(
      riegelEstimate.distanceMeters,
      inputs,
    );
    const lactateWeight = 1 - riegelWeight;
    const estimatedTimeSeconds =
      riegelEstimate.estimatedTimeSeconds * riegelWeight +
      lactateEstimate.estimatedTimeSeconds * lactateWeight;
    const speedKmh =
      (riegelEstimate.distanceMeters / 1000 / estimatedTimeSeconds) * 3600;

    return {
      ...lactateEstimate,
      estimatedTimeSeconds,
      estimatedPaceSecondsPerKm: speedToPaceSecondsPerKm(speedKmh) ?? 0,
      method: `Distance-weighted blend: Riegel ${Math.round(riegelWeight * 100)}% + lactate model ${Math.round(lactateWeight * 100)}%`,
      source: 'blended' as const,
      inputCount: riegelEstimate.inputCount,
      confidenceLabel:
        riegelEstimate.confidenceLabel === 'moderate' &&
        lactateEstimate.confidenceLabel === 'moderate'
          ? 'moderate'
          : 'low',
    };
  });
}

function estimateLactateRacePerformances(
  thresholds: ThresholdPair,
  points: ValidTestPoint[],
  lactateMaxOverride?: number,
): RaceEstimate[] {
  const aerobic = thresholds.aerobic?.speedKmh;
  const anaerobic = thresholds.anaerobic?.speedKmh;
  if (!aerobic || !anaerobic || points.length < 5) return [];
  const maxTested = Math.max(...points.map((point) => point.speedKmh));
  const maxLactate = lactateMaxOverride ?? Math.max(...points.map((point) => point.lactate));
  const vvo2 = estimateVvo2Speed(anaerobic, maxTested, maxLactate);
  const vdot = oxygenCost((vvo2 * 1000) / 60);
  const enduranceScore = clamp((aerobic / anaerobic - 0.78) / 0.14, 0, 1);

  const races = [
    ['1500 m', 1500],
    ['3 km', 3000],
    ['5 km', 5000],
    ['10 km', 10000],
    ['Half marathon', 21097.5],
    ['Marathon', 42195],
  ] as const;

  const estimates: RaceEstimate[] = [];
  races.forEach(([label, distance]) => {
    const danielsSpeed = solveDanielsRaceSpeed(vdot, distance);
    if (!danielsSpeed) return;
    const cap = lactateAnchoredRaceCap(distance, aerobic, anaerobic, vvo2, enduranceScore);
    const speed = Math.min(danielsSpeed, cap);
    const time = timeForDistanceSeconds(distance, speed);
    estimates.push({
      distanceLabel: label,
      distanceMeters: distance,
      estimatedTimeSeconds: time,
      estimatedPaceSecondsPerKm: speedToPaceSecondsPerKm(speed) ?? 0,
      method: 'Daniels-Gilbert VO2 model capped by lactate-threshold speed and endurance drop-off',
      source: 'lactate',
      confidenceLabel: maxLactate >= 6 ? 'moderate' : 'low',
    });
  });
  return estimates;
}

function lactateAnchoredRaceCap(
  distanceMeters: number,
  aerobic: number,
  anaerobic: number,
  vvo2: number,
  enduranceScore: number,
): number {
  if (distanceMeters <= 1500) return Math.min(vvo2 * 0.98, anaerobic * (1.14 + enduranceScore * 0.03));
  if (distanceMeters <= 3000) return Math.min(vvo2 * 0.94, anaerobic * (1.08 + enduranceScore * 0.025));
  if (distanceMeters <= 5000) return anaerobic * (1.02 + enduranceScore * 0.035);
  if (distanceMeters <= 10000) return anaerobic * (0.97 + enduranceScore * 0.025);
  if (distanceMeters <= 21100) return anaerobic * (0.89 + enduranceScore * 0.045);
  return Math.min(anaerobic * (0.8 + enduranceScore * 0.07), aerobic * (0.94 + enduranceScore * 0.08));
}

function oxygenCost(velocityMetersPerMinute: number): number {
  return -4.6 + 0.182258 * velocityMetersPerMinute + 0.000104 * velocityMetersPerMinute ** 2;
}

function vo2Fraction(durationMinutes: number): number {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * durationMinutes) + 0.2989558 * Math.exp(-0.1932605 * durationMinutes);
}

function solveDanielsRaceSpeed(vdot: number, distanceMeters: number): number | undefined {
  let low = 5;
  let high = 28;
  for (let iteration = 0; iteration < 70; iteration += 1) {
    const mid = (low + high) / 2;
    const durationMinutes = timeForDistanceSeconds(distanceMeters, mid) / 60;
    if (durationMinutes < 3.5 || durationMinutes > 260) return undefined;
    const estimatedVdot = oxygenCost((mid * 1000) / 60) / vo2Fraction(durationMinutes);
    if (estimatedVdot > vdot) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return round((low + high) / 2, 3);
}
