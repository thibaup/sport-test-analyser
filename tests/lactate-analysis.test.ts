import { describe, expect, it } from 'vitest';
import { defaultThresholdControls } from '../src/data/exampleTest';
import { lt2MethodOptions } from '../src/lib/lactateThresholds';
import { analyzeTest } from '../src/lib/analysisEngine';
import {
  calculateRiegelBlendWeight,
  estimateRiegelPerformances,
  usableRaceTimes,
} from '../src/lib/raceCalculations';
import {
  applyTimeOverrides,
  updateRaceTimeOverride,
  updateTargetOverride,
  updateTargetTimeOverride,
} from '../src/lib/timeOverrides';
import type {
  AnalysisTimeOverrides,
  MaxLactateTest,
  RaceTime,
  TestStep,
  ThresholdControls,
  TrainingZone,
} from '../src/types/lactate';

const thresholdControls: ThresholdControls = {
  aerobicMethod: 'fixed_2',
  anaerobicMethod: 'dmax_modified',
  manualTarget: 'aerobic',
};

const pdfReferenceThresholdControls: ThresholdControls = {
  aerobicMethod: 'baseline',
  anaerobicMethod: 'fixed_4',
  manualTarget: 'aerobic',
};

const screenshotStagedSteps: TestStep[] = [
  stagedStep(1, 9.97, 578, 2.0, 157),
  stagedStep(2, 10.61, 543, 1.9, 165),
  stagedStep(3, 12.0, 480, 1.8, 174),
  stagedStep(4, 12.86, 448, 1.7, 179),
  stagedStep(5, 14.4, 400, 2.0, 189),
  stagedStep(6, 15.0, 384, 2.5, 191),
  stagedStep(7, 15.65, 368, 3.6, 194),
  stagedStep(8, 16.55, 348, 12.0, 198),
];

const screenshotAllOutMax: MaxLactateTest = {
  distanceMeters: 600,
  timeSeconds: 106,
  lactate: 12.0,
  heartRate: 184,
};

const pdfReferenceSteps: TestStep[] = [
  stagedStep(1, 9.97, 578, 2.0, 157),
  stagedStep(2, 10.61, 543, 1.9, 165),
  stagedStep(3, 12.0, 480, 1.8, 174),
  stagedStep(4, 12.86, 448, 1.7, 179),
  stagedStep(5, 14.4, 400, 2.0, 189),
  stagedStep(6, 15.0, 384, 2.5, 191),
  stagedStep(7, 15.65, 368, 3.6, 194),
  stagedStep(8, 16.55, 348, 6.0, 198),
];

describe('lactate analysis reference regressions', () => {
  it('uses the post-dip 2 mmol crossing for fixed LT1 on dipping lactate curves', () => {
    const analysis = analyzeTest(screenshotStagedSteps, thresholdControls, 'intermediate');

    expect(analysis.selectedThresholds.aerobic?.speedKmh).toBeCloseTo(14.83, 2);
    expect(analysis.selectedThresholds.aerobic?.lactate).toBeCloseTo(2.0, 2);
    expect(analysis.selectedThresholds.aerobic?.speedKmh).toBeGreaterThan(12.86);
    expect(analysis.selectedThresholds.anaerobic?.speedKmh).toBeCloseTo(15.82, 2);
    expect(analysis.selectedThresholds.anaerobic?.lactate).toBeCloseTo(5.97, 2);
  });

  it('keeps the all-out max lactate result out of LT1 and LT2 calculations', () => {
    const withoutAllOut = analyzeTest(screenshotStagedSteps, thresholdControls, 'intermediate');
    const withAllOut = analyzeTest(screenshotStagedSteps, thresholdControls, 'intermediate', [], screenshotAllOutMax);

    expect(withAllOut.validPoints).toHaveLength(screenshotStagedSteps.length);
    expect(withAllOut.curve).toHaveLength(screenshotStagedSteps.length);
    expect(withAllOut.validPoints.some((point) => point.id === 'all-out-max-lactate')).toBe(false);
    expect(withAllOut.curve.some((point) => point.speedKmh > 20)).toBe(false);

    expect(withAllOut.selectedThresholds.aerobic?.speedKmh).toBeCloseTo(withoutAllOut.selectedThresholds.aerobic?.speedKmh ?? 0, 3);
    expect(withAllOut.selectedThresholds.aerobic?.lactate).toBeCloseTo(withoutAllOut.selectedThresholds.aerobic?.lactate ?? 0, 3);
    expect(withAllOut.selectedThresholds.anaerobic?.speedKmh).toBeCloseTo(withoutAllOut.selectedThresholds.anaerobic?.speedKmh ?? 0, 3);
    expect(withAllOut.selectedThresholds.anaerobic?.lactate).toBeCloseTo(withoutAllOut.selectedThresholds.anaerobic?.lactate ?? 0, 3);

    expect(withAllOut.maxLactate.source).toBe('allOut');
    expect(withAllOut.maxLactate.value).toBe(12);
    expect(withAllOut.maxLactate.speedKmh).toBeCloseTo(20.38, 2);
  });

  it('accepts threshold points with speed and lactate when distance and duration are missing', () => {
    const complete = analyzeTest(screenshotStagedSteps, thresholdControls, 'intermediate');
    const missingLoadFields = screenshotStagedSteps.map((step) =>
      step.id === 'stage-3'
        ? {
            ...step,
            distanceKm: undefined,
            durationSeconds: undefined,
            paceSecondsPerKm: undefined,
          }
        : step,
    );

    const analysis = analyzeTest(missingLoadFields, thresholdControls, 'intermediate');

    expect(analysis.validPoints).toHaveLength(screenshotStagedSteps.length);
    expect(analysis.validPoints.some((point) => point.id === 'stage-3')).toBe(true);
    expect(analysis.selectedThresholds.aerobic?.speedKmh).toBeCloseTo(complete.selectedThresholds.aerobic?.speedKmh ?? 0, 3);
    expect(analysis.selectedThresholds.anaerobic?.speedKmh).toBeCloseTo(complete.selectedThresholds.anaerobic?.speedKmh ?? 0, 3);
  });

  it('matches the Coachbox PDF threshold and 7-zone reference output', () => {
    const analysis = analyzeTest(pdfReferenceSteps, pdfReferenceThresholdControls, 'intermediate', [], undefined, 7);

    expect(analysis.selectedThresholds.aerobic?.speedKmh).toBeCloseTo(14.26, 2);
    expect(analysis.selectedThresholds.aerobic?.lactate).toBeCloseTo(1.88, 2);
    expect(analysis.selectedThresholds.aerobic?.heartRate).toBe(188);
    expect(analysis.selectedThresholds.anaerobic?.speedKmh).toBeCloseTo(15.83, 2);
    expect(analysis.selectedThresholds.anaerobic?.lactate).toBeCloseTo(4.0, 2);
    expect(analysis.selectedThresholds.anaerobic?.heartRate).toBe(195);

    expectZone(analysis.zones[0], 'REC', 9.3, 11.4, 122, 169);
    expectZone(analysis.zones[1], 'AER', 11.4, 14.3, 170, 188);
    expectZone(analysis.zones[2], 'TMP', 14.3, 15.0, 189, 192);
    expectZone(analysis.zones[3], 'SST', 15.0, 15.8, 193, 195);
    expectZone(analysis.zones[4], 'THR', 15.8, 16.3, 196, 199);
    expectZone(analysis.zones[5], 'VO2', 16.3, 19.0, 198, 198);
    expectZone(analysis.zones[6], 'NMR', 19.0, undefined, 198, undefined);
  });

  it('uses a manually supplied maximum HR without changing valid zone boundaries', () => {
    const analysis = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
      [],
      undefined,
      7,
      205,
    );

    expectZone(analysis.zones[4], 'THR', 15.8, 16.3, 196, 199);
    expectZone(analysis.zones[5], 'VO2', 16.3, 19.0, 200, 203);
    expectZone(analysis.zones[6], 'NMR', 19.0, undefined, 204, undefined);
  });

  it('gives shorter estimates more Riegel weight while still valuing longer race evidence', () => {
    const shortInputs = usableRaceTimes([
      raceTime('race-400', 400, 64),
      raceTime('race-800', 800, 138),
    ]);
    const longerInputs = usableRaceTimes([
      raceTime('race-5k', 5000, 1200),
      raceTime('race-10k', 10000, 2520),
    ]);

    const shortRaceWeight = calculateRiegelBlendWeight(5000, shortInputs);
    const longerRaceWeight = calculateRiegelBlendWeight(5000, longerInputs);
    const shortDistanceWeight = calculateRiegelBlendWeight(1500, shortInputs);

    expect(shortRaceWeight).toBeCloseTo(0.33, 2);
    expect(shortDistanceWeight).toBeGreaterThan(shortRaceWeight);
    expect(longerRaceWeight).toBeGreaterThan(0.8);
    expect(longerRaceWeight).toBeLessThan(0.85);
    expect(longerRaceWeight).toBeGreaterThan(shortRaceWeight);
  });

  it('blends shared estimates while retaining Riegel-only 800 m predictions', () => {
    const raceTimes = [
      raceTime('race-400', 400, 64),
      raceTime('race-800', 800, 138),
    ];
    const lactateOnly = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
    );
    const blended = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
      raceTimes,
    );
    const riegel = estimateRiegelPerformances(raceTimes);
    const lactateFiveK = lactateOnly.raceEstimates.find(
      (estimate) => estimate.distanceMeters === 5000,
    );
    const riegelFiveK = riegel.find((estimate) => estimate.distanceMeters === 5000);
    const blendedFiveK = blended.raceEstimates.find(
      (estimate) => estimate.distanceMeters === 5000,
    );
    const blended800 = blended.raceEstimates.find(
      (estimate) => estimate.distanceMeters === 800,
    );

    expect(blended800?.source).toBe('raceTime');
    expect(blendedFiveK?.source).toBe('blended');
    expect(blendedFiveK?.method).toContain('Riegel 33%');
    expect(blendedFiveK?.estimatedTimeSeconds).toBeGreaterThan(
      Math.min(
        lactateFiveK?.estimatedTimeSeconds ?? Infinity,
        riegelFiveK?.estimatedTimeSeconds ?? Infinity,
      ),
    );
    expect(blendedFiveK?.estimatedTimeSeconds).toBeLessThan(
      Math.max(
        lactateFiveK?.estimatedTimeSeconds ?? -Infinity,
        riegelFiveK?.estimatedTimeSeconds ?? -Infinity,
      ),
    );
  });

  it('uses full Riegel through the longest entered race distance', () => {
    const raceTimes = [
      raceTime('race-800', 800, 138),
      raceTime('race-5k', 5000, 1200),
    ];
    const analysis = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
      raceTimes,
    );
    const riegel = estimateRiegelPerformances(raceTimes);
    const riegelFiveK = riegel.find((estimate) => estimate.distanceMeters === 5000);
    const fiveK = analysis.raceEstimates.find(
      (estimate) => estimate.distanceMeters === 5000,
    );
    const tenK = analysis.raceEstimates.find(
      (estimate) => estimate.distanceMeters === 10000,
    );

    expect(fiveK?.source).toBe('raceTime');
    expect(fiveK?.estimatedTimeSeconds).toBeCloseTo(
      riegelFiveK?.estimatedTimeSeconds ?? 0,
      6,
    );
    expect(tenK?.source).toBe('blended');
  });

  it('keeps sprint targets faster than race-specific resistance with and without race inputs', () => {
    const withoutRaceTimes = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
    );
    const withRaceTimes = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
      [raceTime('race-400', 400, 64), raceTime('race-800', 800, 138)],
    );

    for (const analysis of [withoutRaceTimes, withRaceTimes]) {
      const sprint200 = analysis.targets
        .find((target) => target.id === 'sprint')
        ?.times.find((time) => time.distanceMeters === 200);
      const resistance200 = analysis.targets
        .find((target) => target.id === 'race-resistance')
        ?.times.find((time) => time.distanceMeters === 200);

      expect(sprint200?.speedFromKmh).toBeGreaterThan(resistance200?.speedToKmh ?? Infinity);
    }
  });

  it('makes shorter repetitions faster while tapering them toward the zone anchor as they get longer', () => {
    const analysis = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
    );

    expect(targetSpeed(analysis, 'easy-intervals', 200)).toBeGreaterThan(
      targetSpeed(analysis, 'easy-intervals', 1600),
    );
    expect(targetSpeed(analysis, 'extensive', 200)).toBeGreaterThan(
      targetSpeed(analysis, 'extensive', 1600),
    );
    expect(targetSpeed(analysis, 'threshold', 400)).toBeGreaterThan(
      targetSpeed(analysis, 'threshold', 2000),
    );
    expect(targetSpeed(analysis, 'vo2max', 300)).toBeGreaterThan(
      targetSpeed(analysis, 'vo2max', 1200),
    );
    expect(
      targetSpeed(analysis, 'vo2max', 300) /
        targetSpeed(analysis, 'vo2max', 800),
    ).toBeGreaterThan(1.05);
    expect(targetSpeed(analysis, 'race-resistance', 200)).toBeGreaterThan(
      targetSpeed(analysis, 'race-resistance', 600),
    );
    expect(
      targetSpeed(analysis, 'race-resistance', 200) /
        targetSpeed(analysis, 'race-resistance', 500),
    ).toBeGreaterThan(1.09);
  });

  it('defaults the app to baseline plus 0.4 LT1 and modified D-max LT2', () => {
    expect(defaultThresholdControls.aerobicMethod).toBe('baseline_plus_04');
    expect(defaultThresholdControls.anaerobicMethod).toBe('dmax_modified');
    expect(lt2MethodOptions).toEqual(['dmax_modified', 'manual_lt2']);
  });

  it('accepts valid manual thresholds inside the tested range', () => {
    const analysis = analyzeTest(
      pdfReferenceSteps,
      manualThresholdControls(14.4, 15.65),
      'intermediate',
      [],
      undefined,
      7,
      205,
    );

    expect(analysis.selectedThresholds.aerobic?.speedKmh).toBe(14.4);
    expect(analysis.selectedThresholds.anaerobic?.speedKmh).toBe(15.65);
    expect(analysis.zones).toHaveLength(7);
    expect(analysis.targets.length).toBeGreaterThan(0);
  });

  it('rejects manual thresholds outside the tested speed range', () => {
    const belowRange = analyzeTest(
      pdfReferenceSteps,
      manualThresholdControls(9, 15.65),
      'intermediate',
    );
    const aboveRange = analyzeTest(
      pdfReferenceSteps,
      manualThresholdControls(14.4, 19),
      'intermediate',
    );

    expect(belowRange.selectedThresholds.aerobic?.speedKmh).toBeUndefined();
    expect(belowRange.selectedThresholds.aerobic?.insufficientReason).toContain('tested speed range');
    expect(belowRange.zones).toEqual([]);
    expect(belowRange.targets).toEqual([]);

    expect(aboveRange.selectedThresholds.anaerobic?.speedKmh).toBeUndefined();
    expect(aboveRange.selectedThresholds.anaerobic?.insufficientReason).toContain('tested speed range');
    expect(aboveRange.zones).toEqual([]);
    expect(aboveRange.targets).toEqual([]);
  });

  it('rejects manual LT2 when it is not faster than LT1', () => {
    const analysis = analyzeTest(
      pdfReferenceSteps,
      manualThresholdControls(15.65, 14.4),
      'intermediate',
    );

    expect(analysis.selectedThresholds.aerobic?.speedKmh).toBe(15.65);
    expect(analysis.selectedThresholds.anaerobic?.speedKmh).toBeUndefined();
    expect(analysis.selectedThresholds.anaerobic?.insufficientReason).toBe('Manual LT2 must be faster than LT1.');
    expect(analysis.zones).toEqual([]);
    expect(analysis.targets).toEqual([]);
  });

  it('does not generate zones when either threshold is unavailable', () => {
    const flatSteps: TestStep[] = [
      stagedStep(1, 9, 400, 1.4, 120),
      stagedStep(2, 10, 400, 1.5, 132),
      stagedStep(3, 11, 400, 1.4, 143),
      stagedStep(4, 12, 400, 1.6, 153),
      stagedStep(5, 13, 400, 1.5, 163),
      stagedStep(6, 14, 400, 1.7, 174),
    ];
    const analysis = analyzeTest(
      flatSteps,
      defaultThresholdControls,
      'intermediate',
      [],
      undefined,
      7,
    );

    expect(analysis.selectedThresholds.aerobic?.speedKmh).toBeUndefined();
    expect(analysis.selectedThresholds.anaerobic?.speedKmh).toBeDefined();
    expect(analysis.zones).toEqual([]);
    expect(analysis.targets).toEqual([]);
  });

  it('applies editable race and training times and recalculates their paces', () => {
    const calculated = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
    );
    const target = calculated.targets.find((item) => item.id === 'threshold');
    const targetTime = target?.times.find((item) => item.distanceMeters === 1000);
    const race = calculated.raceEstimates.find(
      (item) => item.distanceMeters === 5000,
    );
    expect(targetTime).toBeDefined();
    expect(race).toBeDefined();

    let overrides: AnalysisTimeOverrides = {
      targetTimes: {},
      raceEstimates: {},
    };
    overrides = updateTargetTimeOverride(
      overrides,
      'threshold',
      1000,
      'from',
      225,
    );
    overrides = updateTargetTimeOverride(
      overrides,
      'threshold',
      1000,
      'to',
      240,
    );
    overrides = updateTargetOverride(
      overrides,
      'threshold',
      1000,
      'repetitionsFrom',
      5,
    );
    overrides = updateTargetOverride(
      overrides,
      'threshold',
      1000,
      'repetitionsTo',
      6,
    );
    overrides = updateTargetOverride(
      overrides,
      'threshold',
      1000,
      'recoverySeconds',
      75,
    );
    overrides = updateRaceTimeOverride(overrides, 5000, 1200);

    const customized = applyTimeOverrides(calculated, overrides);
    const customizedTarget = customized.targets
      .find((item) => item.id === 'threshold')
      ?.times.find((item) => item.distanceMeters === 1000);
    const customizedRace = customized.raceEstimates.find(
      (item) => item.distanceMeters === 5000,
    );

    expect(customizedTarget?.timeFromSeconds).toBe(225);
    expect(customizedTarget?.timeToSeconds).toBe(240);
    expect(customizedTarget?.paceFromSecondsPerKm).toBe(225);
    expect(customizedTarget?.paceToSecondsPerKm).toBe(240);
    expect(customizedTarget?.timeFromOverridden).toBe(true);
    expect(customizedTarget?.timeToOverridden).toBe(true);
    expect(customizedTarget?.repetitionsFrom).toBe(5);
    expect(customizedTarget?.repetitionsTo).toBe(6);
    expect(customizedTarget?.recoverySeconds).toBe(75);
    expect(customizedTarget?.totalVolumeMetersFrom).toBe(5000);
    expect(customizedTarget?.totalVolumeMetersTo).toBe(6000);
    expect(customizedTarget?.repetitionsFromOverridden).toBe(true);
    expect(customizedTarget?.repetitionsToOverridden).toBe(true);
    expect(customizedTarget?.recoverySecondsOverridden).toBe(true);
    expect(customizedRace?.estimatedTimeSeconds).toBe(1200);
    expect(customizedRace?.estimatedPaceSecondsPerKm).toBe(240);
    expect(customizedRace?.timeOverridden).toBe(true);
  });

  it('removes overrides when an edited value matches its calculated display value', () => {
    const calculated = analyzeTest(
      pdfReferenceSteps,
      pdfReferenceThresholdControls,
      'intermediate',
    );
    const targetTime = calculated.targets
      .find((item) => item.id === 'threshold')
      ?.times.find((item) => item.distanceMeters === 1000);
    const race = calculated.raceEstimates.find(
      (item) => item.distanceMeters === 5000,
    );
    expect(targetTime).toBeDefined();
    expect(race).toBeDefined();

    let overrides: AnalysisTimeOverrides = {
      targetTimes: {},
      raceEstimates: {},
    };
    overrides = updateTargetTimeOverride(
      overrides,
      'threshold',
      1000,
      'from',
      Math.round(targetTime?.timeFromSeconds ?? 0),
      targetTime?.timeFromSeconds,
    );
    overrides = updateTargetOverride(
      overrides,
      'threshold',
      1000,
      'repetitionsFrom',
      targetTime?.repetitionsFrom,
      targetTime?.repetitionsFrom,
    );
    overrides = updateTargetOverride(
      overrides,
      'threshold',
      1000,
      'recoverySeconds',
      targetTime?.recoverySeconds,
      targetTime?.recoverySeconds,
    );
    overrides = updateRaceTimeOverride(
      overrides,
      5000,
      Math.round(race?.estimatedTimeSeconds ?? 0),
      race?.estimatedTimeSeconds,
    );

    expect(overrides.targetTimes).toEqual({});
    expect(overrides.raceEstimates).toEqual({});

    const staleEqualOverrides: AnalysisTimeOverrides = {
      targetTimes: {
        'threshold:1000': {
          repetitionsFrom: targetTime?.repetitionsFrom,
        },
      },
      raceEstimates: {
        '5000': Math.round(race?.estimatedTimeSeconds ?? 0),
      },
    };
    const resolved = applyTimeOverrides(calculated, staleEqualOverrides);
    const resolvedTarget = resolved.targets
      .find((item) => item.id === 'threshold')
      ?.times.find((item) => item.distanceMeters === 1000);
    const resolvedRace = resolved.raceEstimates.find(
      (item) => item.distanceMeters === 5000,
    );
    expect(resolvedTarget?.repetitionsFromOverridden).toBeUndefined();
    expect(resolvedRace?.timeOverridden).toBeUndefined();
  });
});

function stagedStep(step: number, speedKmh: number, durationSeconds: number, lactate: number, heartRate: number): TestStep {
  return {
    id: `stage-${step}`,
    step,
    distanceKm: 1.6,
    speedKmh,
    durationSeconds,
    lactate,
    heartRate,
  };
}

function raceTime(id: string, distanceMeters: number, timeSeconds: number): RaceTime {
  return { id, distanceMeters, timeSeconds };
}

function manualThresholdControls(lt1: number, lt2: number): ThresholdControls {
  return {
    aerobicMethod: 'manual_lt1',
    anaerobicMethod: 'manual_lt2',
    manualAerobicSpeedKmh: lt1,
    manualAnaerobicSpeedKmh: lt2,
    manualTarget: 'aerobic',
  };
}

function targetSpeed(
  analysis: ReturnType<typeof analyzeTest>,
  targetId: string,
  distanceMeters: number,
): number {
  const target = analysis.targets.find((item) => item.id === targetId);
  const time = target?.times.find((item) => item.distanceMeters === distanceMeters);
  return time?.speedFromKmh ?? 0;
}

function expectZone(
  zone: TrainingZone,
  shortName: string,
  speedFromKmh: number,
  speedToKmh: number | undefined,
  heartRateFrom: number | undefined,
  heartRateTo: number | undefined,
): void {
  expect(zone.shortName).toBe(shortName);
  expect(zone.speedFromKmh).toBeCloseTo(speedFromKmh, 1);
  if (speedToKmh === undefined) expect(zone.speedToKmh).toBeUndefined();
  else expect(zone.speedToKmh).toBeCloseTo(speedToKmh, 1);
  expect(zone.heartRateFrom).toBe(heartRateFrom);
  expect(zone.heartRateTo).toBe(heartRateTo);
}
