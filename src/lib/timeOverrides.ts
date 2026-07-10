import type {
  AnalysisTimeOverrides,
  AppAnalysis,
  TargetTimeOverride,
} from "../types/lactate";

export function createEmptyTimeOverrides(): AnalysisTimeOverrides {
  return { targetTimes: {}, raceEstimates: {} };
}

export function targetTimeOverrideKey(
  targetId: string,
  distanceMeters: number,
): string {
  return `${targetId}:${distanceMeters}`;
}

export function applyTimeOverrides(
  analysis: AppAnalysis,
  overrides: AnalysisTimeOverrides,
): AppAnalysis {
  return {
    ...analysis,
    targets: analysis.targets.map((target) => ({
      ...target,
      times: target.times.map((time) => {
        const override =
          overrides.targetTimes[
            targetTimeOverrideKey(target.id, time.distanceMeters)
          ];
        if (!override) return time;

        const hasFromOverride =
          isPositive(override.timeFromSeconds) &&
          !matchesCalculatedTargetValue(
            "timeFromSeconds",
            override.timeFromSeconds,
            time.timeFromSeconds,
          );
        const hasToOverride =
          isPositive(override.timeToSeconds) &&
          !matchesCalculatedTargetValue(
            "timeToSeconds",
            override.timeToSeconds,
            time.timeToSeconds,
          );
        const hasRepetitionsFromOverride = isPositiveInteger(
          override.repetitionsFrom,
        ) && override.repetitionsFrom !== time.repetitionsFrom;
        const hasRepetitionsToOverride = isPositiveInteger(
          override.repetitionsTo,
        ) && override.repetitionsTo !== time.repetitionsTo;
        const hasRecoveryOverride =
          isNonNegative(override.recoverySeconds) &&
          !matchesCalculatedTargetValue(
            "recoverySeconds",
            override.recoverySeconds,
            time.recoverySeconds,
          );
        if (
          !hasFromOverride &&
          !hasToOverride &&
          !hasRepetitionsFromOverride &&
          !hasRepetitionsToOverride &&
          !hasRecoveryOverride
        ) {
          return time;
        }

        const timeFromSeconds = hasFromOverride
          ? (override.timeFromSeconds as number)
          : time.timeFromSeconds;
        const timeToSeconds = hasToOverride
          ? (override.timeToSeconds as number)
          : time.timeToSeconds;
        const repetitionsFrom = hasRepetitionsFromOverride
          ? (override.repetitionsFrom as number)
          : time.repetitionsFrom;
        const repetitionsTo = hasRepetitionsToOverride
          ? (override.repetitionsTo as number)
          : time.repetitionsTo;
        const recoverySeconds = hasRecoveryOverride
          ? (override.recoverySeconds as number)
          : time.recoverySeconds;
        const distanceKm = time.distanceMeters / 1000;

        return {
          ...time,
          timeFromSeconds,
          timeToSeconds,
          speedFromKmh: (distanceKm / timeToSeconds) * 3600,
          speedToKmh: (distanceKm / timeFromSeconds) * 3600,
          paceFromSecondsPerKm: timeFromSeconds / distanceKm,
          paceToSecondsPerKm: timeToSeconds / distanceKm,
          repetitionsFrom,
          repetitionsTo,
          recoverySeconds,
          totalVolumeMetersFrom: repetitionsFrom * time.distanceMeters,
          totalVolumeMetersTo: repetitionsTo * time.distanceMeters,
          timeFromOverridden: hasFromOverride,
          timeToOverridden: hasToOverride,
          repetitionsFromOverridden: hasRepetitionsFromOverride,
          repetitionsToOverridden: hasRepetitionsToOverride,
          recoverySecondsOverridden: hasRecoveryOverride,
        };
      }),
    })),
    raceEstimates: analysis.raceEstimates.map((estimate) => {
      const override = overrides.raceEstimates[`${estimate.distanceMeters}`];
      if (
        !isPositive(override) ||
        matchesDisplayedSeconds(override, estimate.estimatedTimeSeconds)
      ) {
        return estimate;
      }
      return {
        ...estimate,
        estimatedTimeSeconds: override,
        estimatedPaceSecondsPerKm:
          override / (estimate.distanceMeters / 1000),
        timeOverridden: true,
      };
    }),
  };
}

export function updateTargetTimeOverride(
  overrides: AnalysisTimeOverrides,
  targetId: string,
  distanceMeters: number,
  boundary: "from" | "to",
  seconds: number | undefined,
  calculatedSeconds?: number,
): AnalysisTimeOverrides {
  return updateTargetOverride(
    overrides,
    targetId,
    distanceMeters,
    boundary === "from" ? "timeFromSeconds" : "timeToSeconds",
    seconds,
    calculatedSeconds,
  );
}

export function updateTargetOverride(
  overrides: AnalysisTimeOverrides,
  targetId: string,
  distanceMeters: number,
  property: keyof TargetTimeOverride,
  value: number | undefined,
  calculatedValue?: number,
): AnalysisTimeOverrides {
  const key = targetTimeOverrideKey(targetId, distanceMeters);
  const current = overrides.targetTimes[key] ?? {};
  const next: TargetTimeOverride = { ...current };

  if (
    isValidTargetOverride(property, value) &&
    !matchesCalculatedTargetValue(property, value, calculatedValue)
  ) {
    next[property] = value;
  }
  else delete next[property];

  const targetTimes = { ...overrides.targetTimes };
  if (Object.values(next).every((item) => item === undefined)) {
    delete targetTimes[key];
  } else {
    targetTimes[key] = next;
  }
  return { ...overrides, targetTimes };
}

export function updateRaceTimeOverride(
  overrides: AnalysisTimeOverrides,
  distanceMeters: number,
  seconds: number | undefined,
  calculatedSeconds?: number,
): AnalysisTimeOverrides {
  const raceEstimates = { ...overrides.raceEstimates };
  const key = `${distanceMeters}`;
  if (
    isPositive(seconds) &&
    !matchesDisplayedSeconds(seconds, calculatedSeconds)
  ) {
    raceEstimates[key] = seconds;
  }
  else delete raceEstimates[key];
  return { ...overrides, raceEstimates };
}

function isPositive(value: number | undefined): value is number {
  return Number.isFinite(value) && (value as number) > 0;
}

function isPositiveInteger(value: number | undefined): value is number {
  return isPositive(value) && Number.isInteger(value);
}

function isNonNegative(value: number | undefined): value is number {
  return Number.isFinite(value) && (value as number) >= 0;
}

function isValidTargetOverride(
  property: keyof TargetTimeOverride,
  value: number | undefined,
): value is number {
  if (property === "recoverySeconds") return isNonNegative(value);
  if (property === "repetitionsFrom" || property === "repetitionsTo") {
    return isPositiveInteger(value);
  }
  return isPositive(value);
}

function matchesCalculatedTargetValue(
  property: keyof TargetTimeOverride,
  value: number | undefined,
  calculatedValue: number | undefined,
): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(calculatedValue)) return false;
  if (property.endsWith("Seconds")) {
    return matchesDisplayedSeconds(value, calculatedValue);
  }
  return value === calculatedValue;
}

function matchesDisplayedSeconds(
  value: number | undefined,
  calculatedValue: number | undefined,
): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(calculatedValue)) return false;
  return Math.round(value as number) === Math.round(calculatedValue as number);
}
