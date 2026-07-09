import type { AthleteInfo, MaxLactateTest, RaceTime, TestStep, ThresholdControls } from '../types/lactate';

export const defaultAthleteInfo: AthleteInfo = {
  athleteName: '',
  testDate: '',
  coachName: '',
  maxHeartRate: undefined,
  protocol: '',
  coachRemarks: '',
};

export const defaultThresholdControls: ThresholdControls = {
  aerobicMethod: 'baseline',
  anaerobicMethod: 'dmax_modified',
  manualTarget: 'aerobic',
};

export const defaultMaxLactateTest: MaxLactateTest = {
  distanceMeters: 400,
};

export const exampleMaxLactateTest: MaxLactateTest = {
  distanceMeters: 600,
  timeSeconds: 106,
  lactate: 12,
  heartRate: 184,
};

export const exampleRaceTimes: RaceTime[] = [
  {
    id: 'race-demo-1',
    distanceMeters: 5000,
    timeSeconds: 1080,
    note: '5 km',
  },
];

export const exampleTestSteps: TestStep[] = [
  {
    id: 'demo-1',
    step: 1,
    distanceKm: 1.6,
    speedKmh: 10.0,
    paceSecondsPerKm: 361,
    durationSeconds: 578,
    lactate: 2.0,
    heartRate: 157,
    rpe: 6,
  },
  {
    id: 'demo-2',
    step: 2,
    distanceKm: 1.6,
    speedKmh: 10.6,
    paceSecondsPerKm: 339,
    durationSeconds: 543,
    lactate: 1.9,
    heartRate: 165,
    rpe: 6,
  },
  {
    id: 'demo-3',
    step: 3,
    distanceKm: 1.6,
    speedKmh: 12.0,
    paceSecondsPerKm: 300,
    durationSeconds: 480,
    lactate: 1.8,
    heartRate: 174,
    rpe: 6,
  },
  {
    id: 'demo-4',
    step: 4,
    distanceKm: 1.6,
    speedKmh: 12.9,
    paceSecondsPerKm: 280,
    durationSeconds: 448,
    lactate: 1.7,
    heartRate: 179,
    rpe: 6,
  },
  {
    id: 'demo-5',
    step: 5,
    distanceKm: 1.6,
    speedKmh: 14.4,
    paceSecondsPerKm: 250,
    durationSeconds: 400,
    lactate: 2.0,
    heartRate: 189,
    rpe: 7,
  },
  {
    id: 'demo-6',
    step: 6,
    distanceKm: 1.6,
    speedKmh: 15.0,
    paceSecondsPerKm: 240,
    durationSeconds: 384,
    lactate: 2.5,
    heartRate: 191,
    rpe: 7,
  },
  {
    id: 'demo-7',
    step: 7,
    distanceKm: 1.6,
    speedKmh: 15.7,
    paceSecondsPerKm: 230,
    durationSeconds: 368,
    lactate: 3.6,
    heartRate: 194,
    rpe: 7,
  },
  {
    id: 'demo-8',
    step: 8,
    distanceKm: 1.6,
    speedKmh: 16.6,
    paceSecondsPerKm: 218,
    durationSeconds: 348,
    lactate: 6.0,
    heartRate: 198,
    rpe: 8,
  },
];
