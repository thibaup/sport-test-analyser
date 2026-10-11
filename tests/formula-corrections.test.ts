import { describe, expect, it } from 'vitest';
import { defaultThresholdControls, exampleMaxLactateTest, exampleRaceTimes, exampleTestSteps } from '../src/data/exampleTest';
import { analyzeTest } from '../src/lib/analysisEngine';
import { parseTimeToSeconds } from '../src/lib/conversions';
import { toValidPoints } from '../src/lib/curveFitting';
import { calculateBaselineLactate, calculateReferenceLt1, calculateReferenceLt2, toReferenceDataPoints } from '../src/lib/referenceThresholds';
import { estimateRiegelPerformances, estimateRiegelTimeForDistance } from '../src/lib/raceCalculations';
import { solveDanielsRaceSpeed } from '../src/lib/targetPaces';
import { applyTimeOverrides, createEmptyTimeOverrides } from '../src/lib/timeOverrides';
import { estimateVvo2Speed, generateTrainingZones } from '../src/lib/trainingZones';
import type { TestStep } from '../src/types/lactate';

const demo = (races = false, maxHR?: number) => analyzeTest(exampleTestSteps, defaultThresholdControls,
  'advanced', races ? exampleRaceTimes : [], exampleMaxLactateTest, 7, maxHR);
function steps(lactates: number[]): TestStep[] {
  return lactates.map((lactate, index) => ({ id: `fake-${index}`, step: index + 1,
    speedKmh: 10 + index, lactate, heartRate: 130 + index * 10 }));
}
function row(analysis: ReturnType<typeof demo>, category: string, distance: number) {
  return analysis.targets.find((target) => target.id === category)!.times.find((time) => time.distanceMeters === distance)!;
}

describe('bundled example calibration', () => {
  it.each([false, true])('preserves thresholds, seven zones and ordinary targets with race input=%s', (races) => {
    const a = demo(races);
    expect(a.selectedThresholds.aerobic?.speedKmh).toBe(14.76);
    expect(a.selectedThresholds.anaerobic?.speedKmh).toBe(15.74);
    expect(a.selectedThresholds.aerobic?.heartRate).toBe(190);
    expect(a.selectedThresholds.anaerobic?.heartRate).toBe(194);
    expect(a.maxLactate.value).toBe(12);
    expect(a.zones.map((zone) => [zone.speedFromKmh, zone.speedToKmh])).toEqual([
      [9.6, 11.8], [11.8, 14], [14, 15.3], [15.3, 15.7], [15.7, 16.2], [16.2, 18.9], [18.9, undefined],
    ]);
    const easy = row(a, 'easy-intervals', 1000);
    expect(easy.timeFromSeconds).toBeCloseTo(241.48756339048535, 8);
    expect(easy.timeToSeconds).toBeCloseTo(256.73940949935815, 8);
    expect([easy.repetitionsFrom, easy.repetitionsTo, easy.recoverySeconds]).toEqual([4, 7, 80]);
    expect(row(a, 'threshold', 1000).timeFromSeconds).toBeCloseTo(220.98226617313958, 8);
    expect(row(a, 'vo2max', 400).timeFromSeconds).toBeCloseTo(75.33816548651667, 8);
    expect(row(a, 'sprint', 200).timeFromSeconds).toBeCloseTo(races ? 32.05161044826716 : 32.84828448484449, 8);
    const raceSeconds = a.raceEstimates.filter((race) => [5000, 10000, 42195].includes(race.distanceMeters))
      .map((race) => race.estimatedTimeSeconds);
    const expected = races ? [1080, 2275.5467100530936, 10860.919785306842]
      : [1083.965144498576, 2298.6597536602962, 11092.757306226174];
    raceSeconds.forEach((seconds, index) => expect(seconds).toBeCloseTo(expected[index], 8));
  });
});

describe('threshold validity and repeated measurements', () => {
  it('does not manufacture a fixed-2 threshold when every value exceeds 2', () => {
    expect(calculateReferenceLt1(toValidPoints(steps([2.5, 2.6, 2.8, 3.2, 3.8, 5])), 'fixed_2')).toBeUndefined();
  });
  it('does not select an arbitrary fixed-2 point on a flat 2 mmol curve', () => {
    expect(calculateReferenceLt1(toValidPoints(steps([2, 2, 2, 2, 2, 2])), 'fixed_2')).toBeUndefined();
  });
  it('accepts a genuine fixed-4 crossing at the last tested stage', () => {
    expect(calculateReferenceLt2(toValidPoints(steps([1, 1.6, 2.2, 2.8, 3.4, 4])), 'fixed_4')?.intensity).toBe(15);
  });
  it.each([{ values: [1, 1, 1, 1, 1, 1] }, { values: [1, 1.5, 2, 2.5, 3, 3.5] }])('rejects Dmax without identifiable curvature: %j', ({ values }) => {
    const points = toValidPoints(steps(values));
    expect(calculateReferenceLt2(points, 'dmax')).toBeUndefined();
    expect(calculateReferenceLt2(points, 'dmax_modified')).toBeUndefined();
  });
  it('handles several rows at one speed without crashing the analysis', () => {
    const duplicates = steps([1, 3, 5, 7]).map((step) => ({ ...step, speedKmh: 10 }));
    expect(() => analyzeTest(duplicates, defaultThresholdControls, 'advanced')).not.toThrow();
    expect(analyzeTest(duplicates, defaultThresholdControls, 'advanced').zones).toEqual([]);
  });
  it('averages all repeated lactate and HR observations independently of row order', () => {
    const duplicates = toValidPoints(steps([1, 3, 5]).map((step) => ({ ...step, speedKmh: 10 })));
    const grouped = toReferenceDataPoints(duplicates);
    expect(grouped).toEqual([{ intensity: 10, lactate: 3, heartRate: 140 }]);
    expect(toReferenceDataPoints([...duplicates].reverse())).toEqual(grouped);
  });
  it('leaves threshold HR unavailable outside measured HR coverage', () => {
    const points = toValidPoints(steps([1, 1.1, 1.3, 1.8, 3, 5]).map((step, index) =>
      ({ ...step, heartRate: index < 2 ? undefined : step.heartRate })));
    expect(calculateReferenceLt1(points, 'manual_lt1', 10)?.heartRate).toBeUndefined();
  });
  it('rejects a nonexistent tangent and a nonexistent cubic inflection', () => {
    const points = toValidPoints(steps([1, 1.5, 2, 2.5, 3, 3.5]));
    expect(calculateReferenceLt2(points, 'tangent51')).toBeUndefined();
    expect(calculateReferenceLt2(points, 'stegmann')).toBeUndefined();
  });
  it('does not average an entirely rising test as its initial baseline', () => {
    expect(calculateBaselineLactate(toReferenceDataPoints(toValidPoints(steps([1, 1.2, 1.4, 1.6, 1.8, 2]))))).toBeNull();
  });
  it('rejects negative lactate and nonpositive pace as usable measurements', () => {
    expect(toValidPoints([{ id: 'negative', step: 1, speedKmh: 10, lactate: -1 },
      { id: 'zero-pace', step: 2, speedKmh: 11, paceSecondsPerKm: 0, lactate: 1 }])).toEqual([]);
  });
});

describe('edits and observed performance anchors', () => {
  it('reaggregates the category pace after changing the example 400 m fast end', () => {
    const a = demo();
    const overrides = createEmptyTimeOverrides();
    overrides.targetTimes['easy-intervals:400'] = { timeFromSeconds: 80 };
    const edited = applyTimeOverrides(a, overrides);
    expect(row(edited, 'easy-intervals', 400).timeFromSeconds).toBe(80);
    expect(edited.targets.find((target) => target.id === 'easy-intervals')?.paceFromSecondsPerKm).toBe(200);
    expect(edited.selectedThresholds).toBe(a.selectedThresholds);
  });
  it.each([{ timeFromSeconds: 140, timeToSeconds: 100 }, { repetitionsFrom: 9, repetitionsTo: 3 }])(
    'rejects incompatible effective override bounds: %j', (override) => {
      const a = demo();
      const overrides = createEmptyTimeOverrides();
      overrides.targetTimes['easy-intervals:400'] = override;
      expect(row(applyTimeOverrides(a, overrides), 'easy-intervals', 400)).toBe(row(a, 'easy-intervals', 400));
    });
  it('keeps pace and speed summaries unchanged when editing only recovery', () => {
    const a = demo();
    const overrides = createEmptyTimeOverrides();
    overrides.targetTimes['easy-intervals:1600'] = { recoverySeconds: 120 };
    const edited = applyTimeOverrides(a, overrides);
    const before = a.targets.find((target) => target.id === 'easy-intervals')!;
    const after = edited.targets.find((target) => target.id === 'easy-intervals')!;
    expect([after.speedFromKmh, after.speedToKmh, after.paceFromSecondsPerKm, after.paceToSecondsPerKm])
      .toEqual([before.speedFromKmh, before.speedToKmh, before.paceFromSecondsPerKm, before.paceToSecondsPerKm]);
  });
  it('preserves an exact 5 km observation when an 800 m race is added', () => {
    const races = [{ id: '5k', distanceMeters: 5000, timeSeconds: 1200 }, { id: '800', distanceMeters: 800, timeSeconds: 138 }];
    expect(estimateRiegelPerformances(races).find((race) => race.distanceMeters === 5000)?.estimatedTimeSeconds).toBe(1200);
    expect(estimateRiegelTimeForDistance(races, 5000)).toBe(1200);
  });
  it('converts 90–95% of an observed 200 m best speed to reciprocal times', () => {
    const a = analyzeTest(exampleTestSteps, defaultThresholdControls, 'advanced',
      [{ id: 'best-200', distanceMeters: 200, timeSeconds: 30 }], exampleMaxLactateTest, 7);
    expect(row(a, 'sprint', 200).timeFromSeconds).toBeCloseTo(30 / 0.95, 8);
    expect(row(a, 'sprint', 200).timeToSeconds).toBeCloseTo(30 / 0.9, 8);
  });
  it('does not prescribe resistance repeats faster than an observed same-distance best', () => {
    const a = analyzeTest(exampleTestSteps, defaultThresholdControls, 'advanced',
      [{ id: 'best-400', distanceMeters: 400, timeSeconds: 64 }], exampleMaxLactateTest, 7);
    expect(row(a, 'race-resistance', 400).timeFromSeconds).toBeGreaterThanOrEqual(64);
  });
  it('selects the same observed best when multiple same-distance inputs are reordered', () => {
    const races = [{ id: 'slower', distanceMeters: 5000, timeSeconds: 1100 },
      { id: 'best', distanceMeters: 5000, timeSeconds: 1080 }];
    expect(estimateRiegelTimeForDistance(races, 5000)).toBe(1080);
    expect(estimateRiegelTimeForDistance([...races].reverse(), 5000)).toBe(1080);
  });
});

describe('solver, HR and maximum-test consistency', () => {
  it.each([{ vdot: 79.75, distance: 1500, speed: 25.175 }, { vdot: 34.5, distance: 42195, speed: 9.771 }])(
    'recovers a supported root previously rejected: %j', ({ vdot, distance, speed }) => {
      expect(solveDanielsRaceSpeed(vdot, distance)).toBeCloseTo(speed, 3);
    });
  it.each([0, 200, Number.NaN])('rejects unsupported race roots at VDOT %s', (vdot) => {
    expect(solveDanielsRaceSpeed(vdot, 5000)).toBeUndefined();
  });
  it('accepts a genuine duration-boundary root without rounding it outside the domain', () => {
    const speed = 42195 * 0.06 / 260;
    const velocity = speed * 1000 / 60;
    const vdot = (-4.6 + 0.182258 * velocity + 0.000104 * velocity ** 2)
      / (0.8 + 0.1894393 * Math.exp(-0.012778 * 260) + 0.2989558 * Math.exp(-0.1932605 * 260));
    const solved = solveDanielsRaceSpeed(vdot, 42195);
    expect(solved).toBeCloseTo(speed, 8);
    expect(42195 * 0.06 / solved!).toBeLessThanOrEqual(260);
  });
  it('rejects a maximum HR below the recorded HR, retaining the input evidence', () => {
    const a = demo(false, 170);
    expect(a.maxLactate.heartRate).toBe(198);
    expect(a.maxLactate.heartRateSource).toBe('observed');
    expect(a.quality.warnings.some((warning) => warning.id === 'max-heart-rate-conflict')).toBe(true);
    expect(a.zones.every((zone) => zone.heartRateFrom === undefined || zone.heartRateTo === undefined
      || zone.heartRateFrom <= zone.heartRateTo)).toBe(true);
  });
  it('reports partial and estimated HR support without altering example speeds', () => {
    const a = demo();
    expect(a.zones[0].heartRateSupport).toBe('partial');
    expect(a.zones[0].heartRateReliable).toBe(false);
    expect(a.zones[1].heartRateSupport).toBe('interpolated');
    expect(a.zones[5].heartRateSupport).toBe('estimated');
  });
  it('does not invert a five-zone range when the all-out speed is below LT2', () => {
    const a = demo();
    const zones = generateTrainingZones(a.selectedThresholds, a.validPoints, 5, { ...a.maxLactate, speedKmh: 13 });
    expect(zones.every((zone) => zone.speedToKmh === undefined || zone.speedToKmh >= zone.speedFromKmh)).toBe(true);
    expect(zones[4].formula).toContain('120% LT2');
  });
  it('retains both lactate readings and uses the highest eligible value', () => {
    const a = analyzeTest(exampleTestSteps, defaultThresholdControls, 'advanced', [],
      { ...exampleMaxLactateTest, lactate: 5 }, 7);
    expect(a.maxLactate.value).toBe(6);
    expect(a.maxLactate.stagePeakLactate).toBe(6);
    expect(a.maxLactate.allOutLactate).toBe(5);
    expect(a.maxLactate.source).toBe('test');
    expect(a.selectedThresholds.aerobic?.speedKmh).toBe(14.76);
  });
  it('removes the abrupt peak-speed change at 6 mmol while preserving the example', () => {
    expect(Math.abs(estimateVvo2Speed(15, 18.5, 5.99) - estimateVvo2Speed(15, 18.5, 6))).toBeLessThanOrEqual(0.01);
    expect(estimateVvo2Speed(15.74, 16.6, 12)).toBe(17.63);
  });
  it('keeps a smooth terminal lactate rise as a warning rather than an automatic outlier', () => {
    const smooth = Array.from({ length: 8 }, (_, index) => ({ id: `smooth-${index}`, step: index + 1,
      speedKmh: 10 + index, lactate: 1 + 0.025 * index ** 3, heartRate: 130 + index * 5 }));
    const a = analyzeTest(smooth, defaultThresholdControls, 'advanced');
    expect(a.quality.warnings.some((warning) => warning.id === 'lactate-jump-smooth-7')).toBe(true);
    expect(a.quality.suspectedOutlierIds).not.toContain('smooth-7');
    expect(a.validPoints).toHaveLength(8);
  });
});

describe('complete clock notation', () => {
  it.each(['1::02', '1:', ':30', '1:60', '1:2:60', 'Infinity', '1e3:00'])('rejects malformed time %s', (value) => {
    expect(parseTimeToSeconds(value)).toBeUndefined();
  });
  it.each([['1:02', 62], ['1:02:03', 3723], ['30.5', 30.5], ['0:00', 0], ['12:34.5', 754.5]])(
    'retains supported time %s', (value, seconds) => expect(parseTimeToSeconds(value)).toBe(seconds));
});
