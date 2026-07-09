import { describe, expect, it } from 'vitest';
import { defaultThresholdControls } from '../src/data/exampleTest';
import { analyzeTest } from '../src/lib/analysisEngine';
import type { MaxLactateTest, TestStep, ThresholdControls, TrainingZone } from '../src/types/lactate';

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
    expectZone(analysis.zones[5], 'VO2', 16.3, 19.0, 200, 198);
    expectZone(analysis.zones[6], 'NMR', 19.0, undefined, 199, undefined);
  });

  it('defaults the app to baseline LT1 and modified D-max LT2', () => {
    expect(defaultThresholdControls.aerobicMethod).toBe('baseline');
    expect(defaultThresholdControls.anaerobicMethod).toBe('dmax_modified');
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
