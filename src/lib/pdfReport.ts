import type { jsPDF } from 'jspdf';
import type autoTable from 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import type {
  AppAnalysis,
  AthleteInfo,
  DistanceUnit,
  PaceUnit,
  TargetPaceCategory,
  TargetRecoveryType,
  TestStep,
  TrainingZone,
  ZoneProfile,
} from '../types/lactate';
import {
  convertDistanceToDisplay,
  formatDuration,
  formatPace,
  formatRange,
  formatSpeed,
  round,
} from './conversions';
import {
  localizeTarget,
  localizeWarning,
  localizeZone,
  localizeZoneWarning,
  profileLabel,
  type Language,
} from './i18n';

interface PdfReportInput {
  athleteInfo: AthleteInfo;
  steps: TestStep[];
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  distanceUnit: DistanceUnit;
  profile: ZoneProfile;
  language: Language;
}

type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };
type AutoTableRunner = typeof autoTable;

const margin = 14;
const accent: [number, number, number] = [2, 132, 199];
const dark: [number, number, number] = [15, 23, 42];
const soft: [number, number, number] = [241, 245, 249];

const copy = {
  nl: {
    reportTitle: 'Lactaattest rapport',
    generated: 'Gegenereerd',
    athlete: 'Atleet',
    testDate: 'Testdatum',
    coach: 'Coach',
    protocol: 'Protocol',
    profile: 'Targetprofiel',
    notes: 'Notities',
    noValue: '-',
    summary: 'Samenvatting',
    aerobic: 'Aerobe drempel',
    anaerobic: 'Anaerobe drempel',
    maxSpeed: 'Hoogste testsnelheid',
    maxHr: 'Hoogste hartslag',
    maxLactate: 'Hoogste lactaat',
    speed: 'Snelheid',
    pace: 'Tempo',
    heartRate: 'Hartslag',
    lactate: 'Lactaat',
    testResults: 'Testresultaten',
    step: '#',
    distance: 'Afstand',
    duration: 'Duur',
    rpe: 'RPE',
    note: 'Notitie',
    attention: 'Aandachtspunten',
    trainingZones: 'Trainingszones',
    zone: 'Zone',
    purpose: 'Doel',
    intensity: 'Intensiteit',
    targetPaces: 'Richttijden per trainingstype',
    category: 'Categorie',
    recovery: 'Herstel',
    repetitions: 'Herhalingen',
    volume: 'Volume',
    targetWindow: 'Richtvenster',
    targetSpeed: 'Doelsnelheid',
    targetPace: 'Doeltempo',
    usefulFor: 'Nuttig voor',
    raceEstimates: 'Wedstrijdinschattingen',
    estimatedTime: 'Geschatte tijd',
    estimatedPace: 'Geschat tempo',
  },
  en: {
    reportTitle: 'Lactate test report',
    generated: 'Generated',
    athlete: 'Athlete',
    testDate: 'Test date',
    coach: 'Coach',
    protocol: 'Protocol',
    profile: 'Target profile',
    notes: 'Notes',
    noValue: '-',
    summary: 'Summary',
    aerobic: 'Aerobic threshold',
    anaerobic: 'Anaerobic threshold',
    maxSpeed: 'Maximum tested speed',
    maxHr: 'Maximum heart rate',
    maxLactate: 'Maximum lactate',
    speed: 'Speed',
    pace: 'Pace',
    heartRate: 'Heart rate',
    lactate: 'Lactate',
    testResults: 'Test results',
    step: '#',
    distance: 'Distance',
    duration: 'Duration',
    rpe: 'RPE',
    note: 'Note',
    attention: 'Attention points',
    trainingZones: 'Training zones',
    zone: 'Zone',
    purpose: 'Purpose',
    intensity: 'Intensity',
    targetPaces: 'Target times by training type',
    category: 'Category',
    recovery: 'Recovery',
    repetitions: 'Repetitions',
    volume: 'Volume',
    targetWindow: 'Target window',
    targetSpeed: 'Target speed',
    targetPace: 'Target pace',
    usefulFor: 'Useful for',
    raceEstimates: 'Race estimates',
    estimatedTime: 'Estimated time',
    estimatedPace: 'Estimated pace',
  },
} satisfies Record<Language, Record<string, string>>;

let autoTableRunner: AutoTableRunner | undefined;

export async function exportPdfReport(input: PdfReportInput): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  autoTableRunner = autoTableModule.default;

  const labels = copy[input.language];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as AutoTableDoc;

  drawCoverHeader(doc, input, labels);
  let y = 49;

  y = drawMetadata(doc, input, labels, y);
  y = drawSummary(doc, input, labels, y + 4);
  y = drawTestResults(doc, input, labels, y + 4);
  y = drawAttentionPoints(doc, input, labels, y + 4);
  y = drawZones(
    doc,
    input.analysis.zones.map((zone) => localizeZone(zone, input.language)),
    labels,
    input.paceUnit,
    input.language,
    y + 4,
  );
  y = drawTargets(
    doc,
    input.analysis.targets.map((target) => localizeTarget(target, input.language)),
    labels,
    input.paceUnit,
    input.language,
    y + 4,
  );
  drawRaceEstimates(doc, input, labels, y + 4);

  addFooters(doc, labels.reportTitle);
  doc.save(reportFilename(input.athleteInfo.athleteName, input.athleteInfo.testDate, input.language));
}

function drawCoverHeader(doc: jsPDF, input: PdfReportInput, labels: Record<string, string>): void {
  const title = labels.reportTitle;
  const athlete = input.athleteInfo.athleteName || (input.language === 'nl' ? 'Naamloze loper' : 'Unnamed runner');
  doc.setFillColor(...dark);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text(title, margin, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${athlete} - ${labels.generated} ${new Date().toLocaleDateString()}`, margin, 24);
  doc.setDrawColor(...accent);
  doc.setLineWidth(1.4);
  doc.line(margin, 39, 196, 39);
  doc.setTextColor(...dark);
}

function drawMetadata(
  doc: AutoTableDoc,
  input: PdfReportInput,
  labels: Record<string, string>,
  y: number,
): number {
  const rows = [
    [labels.athlete, input.athleteInfo.athleteName || labels.noValue, labels.testDate, input.athleteInfo.testDate || labels.noValue],
    [labels.coach, input.athleteInfo.coachName || labels.noValue, labels.profile, profileLabel(input.profile, input.language)],
    [labels.protocol, input.athleteInfo.protocol || labels.noValue, labels.notes, input.athleteInfo.notes || labels.noValue],
  ];
  return table(doc, {
    startY: y,
    body: rows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.2, textColor: dark },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: accent, cellWidth: 25 },
      1: { cellWidth: 59 },
      2: { fontStyle: 'bold', textColor: accent, cellWidth: 34 },
      3: { cellWidth: 64 },
    },
  });
}

function drawSummary(doc: AutoTableDoc, input: PdfReportInput, labels: Record<string, string>, y: number): number {
  y = sectionTitle(doc, labels.summary, y);
  const { analysis, paceUnit } = input;
  const aerobic = analysis.selectedThresholds.aerobic;
  const anaerobic = analysis.selectedThresholds.anaerobic;
  const maxSpeed = analysis.validPoints.length ? Math.max(...analysis.validPoints.map((point) => point.speedKmh)) : undefined;
  const hrValues = analysis.validPoints.map((point) => point.heartRate).filter((value): value is number => Number.isFinite(value));
  const maxHr = hrValues.length ? Math.max(...hrValues) : undefined;
  const maxLactate = analysis.validPoints.length ? Math.max(...analysis.validPoints.map((point) => point.lactate)) : undefined;

  return table(doc, {
    startY: y,
    head: [[labels.summary, labels.speed, labels.pace, labels.heartRate, labels.lactate]],
    body: [
      [
        labels.aerobic,
        formatSpeed(aerobic?.speedKmh),
        formatPace(aerobic?.paceSecondsPerKm, paceUnit),
        aerobic?.heartRate ? `${aerobic.heartRate} bpm` : labels.noValue,
        aerobic?.lactate ? `${formatNumber(aerobic.lactate, 2)} mmol/L` : labels.noValue,
      ],
      [
        labels.anaerobic,
        formatSpeed(anaerobic?.speedKmh),
        formatPace(anaerobic?.paceSecondsPerKm, paceUnit),
        anaerobic?.heartRate ? `${anaerobic.heartRate} bpm` : labels.noValue,
        anaerobic?.lactate ? `${formatNumber(anaerobic.lactate, 2)} mmol/L` : labels.noValue,
      ],
      [labels.maxSpeed, formatSpeed(maxSpeed), maxSpeed ? formatPace(3600 / maxSpeed, paceUnit) : labels.noValue, labels.noValue, labels.noValue],
      [labels.maxHr, labels.noValue, labels.noValue, maxHr ? `${maxHr} bpm` : labels.noValue, labels.noValue],
      [labels.maxLactate, labels.noValue, labels.noValue, labels.noValue, maxLactate ? `${formatNumber(maxLactate, 1)} mmol/L` : labels.noValue],
    ],
  });
}

function drawTestResults(doc: AutoTableDoc, input: PdfReportInput, labels: Record<string, string>, y: number): number {
  y = sectionTitle(doc, labels.testResults, y);
  const distanceLabel = `${labels.distance} (${input.distanceUnit})`;
  return table(doc, {
    startY: y,
    head: [[labels.step, distanceLabel, `${labels.speed} (km/h)`, labels.pace, labels.duration, labels.lactate, labels.heartRate, labels.rpe, labels.note]],
    body: input.steps.map((step) => [
      step.step,
      formatDistance(step.distanceKm, input.distanceUnit),
      formatOptionalNumber(step.speedKmh, 1),
      formatPace(step.paceSecondsPerKm, input.paceUnit),
      formatDuration(step.durationSeconds),
      step.lactate !== undefined ? formatNumber(step.lactate, 2) : labels.noValue,
      step.heartRate !== undefined ? `${step.heartRate}` : labels.noValue,
      step.rpe !== undefined ? `${step.rpe}` : labels.noValue,
      step.note || labels.noValue,
    ]),
    styles: { fontSize: 8, cellPadding: 1.8 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 12 },
      8: { cellWidth: 45 },
    },
  });
}

function drawAttentionPoints(doc: AutoTableDoc, input: PdfReportInput, labels: Record<string, string>, y: number): number {
  const warnings = input.analysis.quality.warnings.slice(0, 8);
  if (warnings.length === 0) return y;
  y = sectionTitle(doc, labels.attention, y);
  return table(doc, {
    startY: y,
    body: warnings.map((warning) => [
      localizeWarning(warning, input.language, input.steps.find((step) => step.id === warning.stepId)?.step),
    ]),
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [120, 53, 15] },
    bodyStyles: { fillColor: [255, 251, 235] },
  });
}

function drawZones(
  doc: AutoTableDoc,
  zones: TrainingZone[],
  labels: Record<string, string>,
  paceUnit: PaceUnit,
  language: Language,
  y: number,
): number {
  if (zones.length === 0) return y;
  y = sectionTitle(doc, labels.trainingZones, y);
  return table(doc, {
    startY: y,
    head: [[labels.zone, labels.speed, labels.pace, labels.heartRate, labels.purpose, labels.intensity]],
    body: zones.map((zone) => [
      zone.name,
      formatRange(zone.speedFromKmh, zone.speedToKmh, ' km/h', 1),
      `${formatPace(zone.paceFromSecondsPerKm, paceUnit)} - ${formatPace(zone.paceToSecondsPerKm, paceUnit)}`,
      zone.heartRateFrom && zone.heartRateTo ? `${zone.heartRateFrom}-${zone.heartRateTo} bpm` : labels.noValue,
      zone.warning ? `${zone.purpose} ${localizeZoneWarning(zone.warning, language) ?? ''}` : zone.purpose,
      zone.intensity,
    ]),
    styles: { fontSize: 8, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 25 },
      2: { cellWidth: 36 },
      3: { cellWidth: 24 },
      4: { cellWidth: 58 },
      5: { cellWidth: 23 },
    },
  });
}

function drawTargets(
  doc: AutoTableDoc,
  targets: TargetPaceCategory[],
  labels: Record<string, string>,
  paceUnit: PaceUnit,
  language: Language,
  y: number,
): number {
  if (targets.length === 0) return y;
  y = sectionTitle(doc, labels.targetPaces, y);

  targets.forEach((target) => {
    y = ensureSpace(doc, y, 62);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(target.name, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    const purpose = doc.splitTextToSize(target.purpose, 180) as string[];
    doc.text(purpose, margin, y);
    y += purpose.length * 3.8 + 1;

    y = table(doc, {
      startY: y,
      head: [[
        labels.distance,
        labels.targetWindow,
        labels.targetSpeed,
        labels.targetPace,
        labels.repetitions,
        labels.recovery,
        labels.volume,
        labels.usefulFor,
      ]],
      body: target.times.map((time) => [
        `${time.distanceMeters} m`,
        `${formatDuration(time.timeFromSeconds)} - ${formatDuration(time.timeToSeconds)}`,
        formatRange(time.speedFromKmh, time.speedToKmh, ' km/h', 1),
        `${formatPace(time.paceFromSecondsPerKm, paceUnit)} - ${formatPace(time.paceToSecondsPerKm, paceUnit)}`,
        formatTargetRepetitions(time.repetitionsFrom, time.repetitionsTo, language),
        formatTargetRecovery(time.recoverySeconds, time.recoveryType, language),
        formatTargetVolume(time.totalVolumeMetersFrom, time.totalVolumeMetersTo),
        time.explanation,
      ]),
      styles: { fontSize: 6.7, cellPadding: 1.2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 17, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 17, halign: 'center' },
        5: { cellWidth: 25 },
        6: { cellWidth: 19, halign: 'center' },
        7: { cellWidth: 42 },
      },
    }) + 3;
  });

  return y;
}

function drawRaceEstimates(doc: AutoTableDoc, input: PdfReportInput, labels: Record<string, string>, y: number): number {
  if (input.analysis.raceEstimates.length === 0) return y;
  y = sectionTitle(doc, labels.raceEstimates, y);
  return table(doc, {
    startY: y,
    head: [[labels.distance, labels.estimatedTime, labels.estimatedPace]],
    body: input.analysis.raceEstimates.map((estimate) => [
      estimate.distanceLabel,
      formatDuration(estimate.estimatedTimeSeconds),
      formatPace(estimate.estimatedPaceSecondsPerKm, input.paceUnit),
    ]),
  });
}


function formatTargetRepetitions(from: number, to: number, language: Language): string {
  const noun = language === 'nl' ? 'herh.' : 'reps';
  return from === to ? `${from} ${noun}` : `${from}-${to} ${noun}`;
}

function formatTargetRecovery(seconds: number, type: TargetRecoveryType, language: Language): string {
  const labels: Record<TargetRecoveryType, Record<Language, string>> = {
    easyJog: { en: 'easy jog', nl: 'rustig dribbel' },
    jog: { en: 'jog', nl: 'dribbel' },
    walkJog: { en: 'walk/jog', nl: 'wandelen/dribbelen' },
    walk: { en: 'walk', nl: 'wandelen' },
    full: { en: 'full recovery', nl: 'volledig herstel' },
  };
  return `${formatDuration(seconds)} ${labels[type][language]}`;
}

function formatTargetVolume(fromMeters: number, toMeters: number): string {
  const fromKm = round(fromMeters / 1000, fromMeters < 1000 ? 2 : 1);
  const toKm = round(toMeters / 1000, toMeters < 1000 ? 2 : 1);
  return fromKm === toKm ? `${fromKm} km` : `${fromKm}-${toKm} km`;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  const nextY = ensureSpace(doc, y, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text(title, margin, nextY);
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.45);
  doc.line(margin, nextY + 2.5, 196, nextY + 2.5);
  return nextY + 7;
}

function table(doc: AutoTableDoc, options: UserOptions): number {
  if (!autoTableRunner) throw new Error('PDF table renderer was not loaded.');
  autoTableRunner(doc, {
    margin: { left: margin, right: margin, bottom: 16 },
    theme: 'grid',
    headStyles: { fillColor: dark, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.2 },
    bodyStyles: { textColor: dark },
    alternateRowStyles: { fillColor: soft },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.15 },
    ...options,
  });
  return (doc.lastAutoTable?.finalY ?? 40) + 2;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - 18) return y;
  doc.addPage();
  return 18;
}

function addFooters(doc: jsPDF, title: string): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(title, margin, pageHeight - 8);
    doc.text(`${page}/${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
}

function formatDistance(distanceKm: number | undefined, unit: DistanceUnit): string {
  const value = convertDistanceToDisplay(distanceKm, unit);
  return value !== undefined ? formatNumber(value, 2) : '-';
}

function formatOptionalNumber(value: number | undefined, decimals: number): string {
  return value !== undefined ? formatNumber(value, decimals) : '-';
}

function formatNumber(value: number, decimals: number): string {
  return `${round(value, decimals)}`;
}

function reportFilename(athleteName: string, testDate: string, language: Language): string {
  const fallback = language === 'nl' ? 'lactaattest' : 'lactate-test';
  const cleanName = (athleteName || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '');
  return `${cleanName || fallback}-${testDate || new Date().toISOString().slice(0, 10)}.pdf`;
}
