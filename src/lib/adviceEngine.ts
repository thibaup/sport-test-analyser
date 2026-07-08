import type { AdviceItem, DataQualityResult, ThresholdPair, TrainingZone, ValidTestPoint } from '../types/lactate';

export function generateAdvice(
  points: ValidTestPoint[],
  thresholds: ThresholdPair,
  quality: DataQualityResult,
  zones: TrainingZone[],
): AdviceItem[] {
  const advice: AdviceItem[] = [];
  if (points.length < 4 || !thresholds.aerobic?.speedKmh || !thresholds.anaerobic?.speedKmh) {
    return [
      {
        id: 'insufficient',
        title: 'More test data needed',
        body: 'Add at least four to five steps that span a clear lactate rise before interpreting thresholds, zones, or target paces.',
        tone: 'caution',
      },
    ];
  }

  const aerobic = thresholds.aerobic.speedKmh;
  const anaerobic = thresholds.anaerobic.speedKmh;
  const maxSpeed = Math.max(...points.map((point) => point.speedKmh));
  const minLactate = Math.min(...points.map((point) => point.lactate));
  const maxLactate = Math.max(...points.map((point) => point.lactate));
  const thresholdSeparation = (anaerobic - aerobic) / aerobic;
  const aerobicRatio = aerobic / anaerobic;
  const lateSlope = calculateLateLactateSlope(points, anaerobic);

  if (thresholdSeparation < 0.08) {
    advice.push({
      id: 'tight-thresholds',
      title: 'Thresholds are close together',
      body:
        'The aerobic and anaerobic estimates sit close together. Prioritize easy aerobic volume and controlled sub-threshold work before adding many hard intervals.',
      tone: 'focus',
    });
  } else if (aerobicRatio > 0.84) {
    advice.push({
      id: 'strong-aerobic',
      title: 'Aerobic threshold is relatively strong',
      body:
        'The first threshold is high relative to the second threshold. The runner likely tolerates steady aerobic work well, so progression can include tempo and threshold density.',
      tone: 'positive',
    });
  } else {
    advice.push({
      id: 'base-focus',
      title: 'Aerobic base can move up',
      body:
        'There is a meaningful gap between easy aerobic speed and threshold speed. More low-intensity volume and steady aerobic intervals should help flatten the early curve.',
      tone: 'focus',
    });
  }

  if (lateSlope > 2.2) {
    advice.push({
      id: 'steep-rise',
      title: 'Lactate rises sharply late in the test',
      body:
        'The curve steepens quickly above threshold. Keep VO2max and anaerobic sessions precise, with enough recovery, while building repeatable threshold capacity.',
      tone: 'caution',
    });
  } else if (maxLactate - minLactate < 2) {
    advice.push({
      id: 'flat-curve',
      title: 'Curve is too flat for a firm second threshold',
      body:
        'The lactate range is small. The test may have stopped before the second threshold was well exposed, so high-intensity zones should be treated cautiously.',
      tone: 'caution',
    });
  } else {
    advice.push({
      id: 'usable-curve',
      title: 'Curve shape supports threshold work',
      body:
        'The test contains a visible rise in lactate, making threshold-oriented pace ranges more useful than a flat or incomplete test would allow.',
      tone: 'positive',
    });
  }

  const maxHr = Math.max(...points.map((point) => point.heartRate ?? 0));
  const hrAtAnt = thresholds.anaerobic.heartRate;
  if (hrAtAnt && maxHr && hrAtAnt / maxHr > 0.96) {
    advice.push({
      id: 'hr-high',
      title: 'Heart rate is already near peak at threshold',
      body:
        'Estimated threshold HR is close to the highest recorded HR. HR zones may be compressed, so pair HR with pace and RPE until a max-HR context is known.',
      tone: 'caution',
    });
  }

  if (anaerobic / maxSpeed < 0.86) {
    advice.push({
      id: 'threshold-development',
      title: 'Threshold sits below tested peak',
      body:
        'The second threshold is well below maximum tested speed. Use threshold intervals and extensive aerobic intervals to improve sustainable speed before emphasizing pure speed.',
      tone: 'focus',
    });
  } else {
    advice.push({
      id: 'speed-development',
      title: 'Threshold is close to tested peak',
      body:
        'The selected threshold is close to maximum tested speed. If the athlete races shorter events, add VO2max and speed work once the input values have been reviewed.',
      tone: 'neutral',
    });
  }

  if (quality.score < 70) {
    advice.push({
      id: 'input-review',
      title: 'Review the input values',
      body:
        'Several warnings were detected. Review lactate jumps, heart-rate consistency, and speed progression before using precise zone boundaries.',
      tone: 'caution',
    });
  }

  if (zones.some((zone) => !zone.heartRateReliable)) {
    advice.push({
      id: 'hr-range-caution',
      title: 'Some HR zones need caution',
      body:
        'The speed range extends outside the tested HR data for some zones. Use those HR ranges as secondary guidance rather than strict targets.',
      tone: 'neutral',
    });
  }

  return advice;
}

function calculateLateLactateSlope(points: ValidTestPoint[], thresholdSpeed: number): number {
  const late = points.filter((point) => point.speedKmh >= thresholdSpeed).sort((a, b) => a.speedKmh - b.speedKmh);
  if (late.length < 2) return 0;
  const first = late[0];
  const last = late[late.length - 1];
  return (last.lactate - first.lactate) / Math.max(0.1, last.speedKmh - first.speedKmh);
}
