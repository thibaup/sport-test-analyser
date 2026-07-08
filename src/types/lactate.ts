export type ThresholdMethodId =
  | 'fixed'
  | 'dmax'
  | 'modifiedDmax'
  | 'baselinePlus'
  | 'logPolynomial';

export type ThresholdType = 'aerobic' | 'anaerobic';
export type ConfidenceLabel = 'high' | 'moderate' | 'low' | 'insufficient';
export type ZoneProfile = 'beginner' | 'intermediate' | 'advanced';
export type PaceUnit = 'minPerKm' | 'minPerMile';
export type DistanceUnit = 'km' | 'mi';

export interface AthleteInfo {
  athleteName: string;
  testDate: string;
  coachName: string;
  protocol: string;
  notes: string;
}

export interface TestStep {
  id: string;
  step: number;
  distanceKm?: number;
  speedKmh?: number;
  paceSecondsPerKm?: number;
  durationSeconds?: number;
  lactate?: number;
  heartRate?: number;
  rpe?: number;
  note?: string;
  invalid?: boolean;
  suspectedOutlier?: boolean;
}

export interface ValidTestPoint {
  id: string;
  step: number;
  distanceKm: number;
  speedKmh: number;
  paceSecondsPerKm: number;
  durationSeconds: number;
  lactate: number;
  heartRate?: number;
  rpe?: number;
}

export interface WarningItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  metric: 'data' | 'lactate' | 'heartRate' | 'speed' | 'threshold' | 'zones';
  message: string;
  stepId?: string;
}

export interface DataQualityResult {
  score: number;
  validStepCount: number;
  totalStepCount: number;
  suspectedOutlierIds: string[];
  warnings: WarningItem[];
}

export interface CurvePoint {
  speedKmh: number;
  lactate?: number;
  smoothedLactate?: number;
  heartRate?: number;
  invalid?: boolean;
  step?: number;
}

export interface ThresholdEstimate {
  id: string;
  methodId: ThresholdMethodId;
  methodName: string;
  type: ThresholdType;
  speedKmh?: number;
  paceSecondsPerKm?: number;
  lactate?: number;
  heartRate?: number;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  explanation: string;
  formula: string;
  insufficientReason?: string;
}

export interface ThresholdPair {
  methodId: ThresholdMethodId;
  methodName: string;
  aerobic?: ThresholdEstimate;
  anaerobic?: ThresholdEstimate;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  explanation: string;
  warnings: string[];
}

export interface SummaryMetric {
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'good' | 'warning';
}

export interface TrainingZone {
  id: string;
  name: string;
  purpose: string;
  speedFromKmh: number;
  speedToKmh: number;
  paceFromSecondsPerKm: number;
  paceToSecondsPerKm: number;
  heartRateFrom?: number;
  heartRateTo?: number;
  heartRateReliable: boolean;
  intensity: string;
  formula: string;
  color: string;
  warning?: string;
}

export type TargetRecoveryType = 'easyJog' | 'jog' | 'walkJog' | 'walk' | 'full';

export interface TargetDistanceTime {
  distanceMeters: number;
  timeFromSeconds: number;
  timeToSeconds: number;
  speedFromKmh: number;
  speedToKmh: number;
  paceFromSecondsPerKm: number;
  paceToSecondsPerKm: number;
  repetitionsFrom: number;
  repetitionsTo: number;
  recoverySeconds: number;
  recoveryType: TargetRecoveryType;
  totalVolumeMetersFrom: number;
  totalVolumeMetersTo: number;
  explanation: string;
  formula: string;
}

export interface TargetPaceCategory {
  id: string;
  name: string;
  purpose: string;
  speedFromKmh: number;
  speedToKmh: number;
  paceFromSecondsPerKm: number;
  paceToSecondsPerKm: number;
  recovery: string;
  repetitions: string;
  totalVolume: string;
  formula: string;
  times: TargetDistanceTime[];
  warning?: string;
}

export interface RaceEstimate {
  distanceLabel: string;
  distanceMeters: number;
  estimatedTimeSeconds: number;
  estimatedPaceSecondsPerKm: number;
  method: string;
  confidenceLabel: ConfidenceLabel;
}

export interface AdviceItem {
  id: string;
  title: string;
  body: string;
  tone: 'positive' | 'caution' | 'focus' | 'neutral';
}

export interface AppAnalysis {
  validPoints: ValidTestPoint[];
  curve: CurvePoint[];
  quality: DataQualityResult;
  thresholdPairs: ThresholdPair[];
  selectedThresholds: ThresholdPair;
  zones: TrainingZone[];
  targets: TargetPaceCategory[];
  raceEstimates: RaceEstimate[];
  advice: AdviceItem[];
}
