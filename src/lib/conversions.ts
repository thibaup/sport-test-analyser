import type { DistanceUnit, PaceUnit } from '../types/lactate';

export const KM_PER_MILE = 1.609344;

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function speedToPaceSecondsPerKm(speedKmh?: number): number | undefined {
  if (!speedKmh || speedKmh <= 0) return undefined;
  return 3600 / speedKmh;
}

export function paceSecondsPerKmToSpeed(paceSecondsPerKm?: number): number | undefined {
  if (!paceSecondsPerKm || paceSecondsPerKm <= 0) return undefined;
  return 3600 / paceSecondsPerKm;
}

export function calculateDurationSeconds(distanceKm?: number, speedKmh?: number): number | undefined {
  if (!distanceKm || !speedKmh || distanceKm <= 0 || speedKmh <= 0) return undefined;
  return (distanceKm / speedKmh) * 3600;
}

export function calculateSpeedFromDuration(distanceKm?: number, durationSeconds?: number): number | undefined {
  if (!distanceKm || !durationSeconds || distanceKm <= 0 || durationSeconds <= 0) return undefined;
  return (distanceKm / durationSeconds) * 3600;
}

export function parseTimeToSeconds(raw: string): number | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
  const parts = value.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return undefined;
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds >= 60) return undefined;
    return minutes * 60 + seconds;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (minutes >= 60 || seconds >= 60) return undefined;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return undefined;
}

export function formatDuration(seconds?: number): string {
  if (!Number.isFinite(seconds) || seconds === undefined || seconds < 0) return '-';
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatPace(secondsPerKm?: number, unit: PaceUnit = 'minPerKm'): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm === undefined || secondsPerKm <= 0) return '-';
  const displaySeconds = unit === 'minPerMile' ? secondsPerKm * KM_PER_MILE : secondsPerKm;
  return `${formatDuration(displaySeconds)} ${unit === 'minPerMile' ? '/mi' : '/km'}`;
}

export function parsePaceToSecondsPerKm(raw: string, unit: PaceUnit = 'minPerKm'): number | undefined {
  const seconds = parseTimeToSeconds(raw);
  if (!seconds) return undefined;
  return unit === 'minPerMile' ? seconds / KM_PER_MILE : seconds;
}

export function convertDistanceFromDisplay(value: number | undefined, unit: DistanceUnit): number | undefined {
  if (!Number.isFinite(value) || value === undefined) return undefined;
  return unit === 'mi' ? value * KM_PER_MILE : value;
}

export function convertDistanceToDisplay(valueKm: number | undefined, unit: DistanceUnit): number | undefined {
  if (!Number.isFinite(valueKm) || valueKm === undefined) return undefined;
  return unit === 'mi' ? valueKm / KM_PER_MILE : valueKm;
}

export function timeForDistanceSeconds(distanceMeters: number, speedKmh: number): number {
  return (distanceMeters / 1000 / speedKmh) * 3600;
}

export function formatRange(
  from: number | undefined,
  to: number | undefined,
  suffix = '',
  decimals = 1,
): string {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return '-';
  return `${round(from as number, decimals)}-${round(to as number, decimals)}${suffix}`;
}

export function formatSpeed(speedKmh?: number): string {
  return Number.isFinite(speedKmh) ? `${round(speedKmh as number, 1)} km/h` : '-';
}
