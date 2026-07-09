import type { RaceEstimate, RaceTime } from '../types/lactate';
import { clamp, formatDuration, isFiniteNumber, speedToPaceSecondsPerKm } from './conversions';

const riegelExponent = 1.06;

const raceDistances = [
  ['800 m', 800],
  ['1500 m', 1500],
  ['3 km', 3000],
  ['5 km', 5000],
  ['10 km', 10000],
  ['Half marathon', 21097.5],
  ['Marathon', 42195],
] as const;

export interface UsableRaceTime {
  distanceMeters: number;
  timeSeconds: number;
}

export function usableRaceTimes(raceTimes: RaceTime[]): UsableRaceTime[] {
  return raceTimes
    .filter(
      (race): race is RaceTime & { distanceMeters: number; timeSeconds: number } =>
        isFiniteNumber(race.distanceMeters) &&
        isFiniteNumber(race.timeSeconds) &&
        race.distanceMeters > 0 &&
        race.timeSeconds > 0,
    )
    .map((race) => ({ distanceMeters: race.distanceMeters, timeSeconds: race.timeSeconds }));
}

export function estimateRiegelPerformances(raceTimes: RaceTime[]): RaceEstimate[] {
  const inputs = usableRaceTimes(raceTimes);
  if (inputs.length === 0) return [];

  return raceDistances.map(([distanceLabel, distanceMeters]) => {
    const predictions = inputs.map((input) => predictRiegelTime(input, distanceMeters));
    const estimatedTimeSeconds = median(predictions);
    const speedKmh = (distanceMeters / 1000 / estimatedTimeSeconds) * 3600;
    return {
      distanceLabel,
      distanceMeters,
      estimatedTimeSeconds,
      estimatedPaceSecondsPerKm: speedToPaceSecondsPerKm(speedKmh) ?? 0,
      method:
        inputs.length === 1
          ? `Riegel from ${formatRaceAnchor(inputs[0])}`
          : `Median Riegel projection from ${inputs.length} race times`,
      source: 'raceTime',
      inputCount: inputs.length,
      confidenceLabel: inputs.length >= 2 ? 'moderate' : 'low',
    };
  });
}

export function estimateRiegelTimeForDistance(raceTimes: RaceTime[], distanceMeters: number): number | undefined {
  const inputs = usableRaceTimes(raceTimes);
  if (inputs.length === 0) return undefined;
  return median(inputs.map((input) => predictRiegelTime(input, distanceMeters)));
}

export function calculateRiegelBlendWeight(
  targetDistanceMeters: number,
  inputs: UsableRaceTime[],
): number {
  if (inputs.length === 0 || targetDistanceMeters <= 0) return 0;

  const distanceRelevance =
    inputs.reduce((sum, input) => {
      const ratio = targetDistanceMeters / input.distanceMeters;
      const closeness = Math.exp(-Math.abs(Math.log(ratio)) / 1.25);
      const longerTargetPenalty = ratio > 1 ? 0.75 : 1;
      return sum + closeness * longerTargetPenalty;
    }, 0) / inputs.length;
  const medianDistance = median(inputs.map((input) => input.distanceMeters));
  const longDistanceEvidence = clamp(
    Math.log(Math.max(medianDistance, 800) / 800) / Math.log(21097.5 / 800),
    0,
    1,
  );
  const inputCountEvidence = clamp((inputs.length - 1) / 2, 0, 1);
  const shortDistanceEvidence = clamp(
    Math.log(10000 / targetDistanceMeters) / Math.log(10000 / 800),
    0,
    1,
  );

  return clamp(
    0.15 +
      0.6 * distanceRelevance +
      0.15 * longDistanceEvidence +
      0.1 * inputCountEvidence +
      0.18 * shortDistanceEvidence,
    0.15,
    0.9,
  );
}

function predictRiegelTime(input: UsableRaceTime, targetDistanceMeters: number): number {
  return input.timeSeconds * (targetDistanceMeters / input.distanceMeters) ** riegelExponent;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatRaceAnchor(input: UsableRaceTime): string {
  return `${formatDistance(input.distanceMeters)} in ${formatDuration(input.timeSeconds)}`;
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${distanceMeters} m`;
  if (distanceMeters === 21097.5) return 'half marathon';
  if (distanceMeters === 42195) return 'marathon';
  return `${distanceMeters / 1000} km`;
}
