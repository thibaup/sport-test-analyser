import type { jsPDF } from "jspdf";
import type autoTable from "jspdf-autotable";
import type { UserOptions } from "jspdf-autotable";
import type {
  AppAnalysis,
  AthleteInfo,
  DistanceUnit,
  MaxLactateTest,
  PaceUnit,
  RaceTime,
  TargetPaceCategory,
  TargetRecoveryType,
  TestStep,
  TrainingZone,
  ZoneCount,
  ZoneProfile,
} from "../types/lactate";
import {
  convertDistanceToDisplay,
  formatDuration,
  formatPace,
  formatRange,
  round,
  speedToPaceSecondsPerKm,
} from "./conversions";
import { localizeTarget, localizeZone, type Language } from "./i18n";

interface PdfReportInput {
  athleteInfo: AthleteInfo;
  steps: TestStep[];
  maxLactateTest: MaxLactateTest;
  raceTimes: RaceTime[];
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  distanceUnit: DistanceUnit;
  profile: ZoneProfile;
  zoneCount: ZoneCount;
  language: Language;
}

type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };
type AutoTableRunner = typeof autoTable;
type Rgb = [number, number, number];

const margin = 16;
const pageWidth = 210;
const contentWidth = pageWidth - 2 * margin;

const blue: Rgb = [15, 71, 97];
const yellow: Rgb = [255, 255, 0];
const black: Rgb = [39, 39, 39];
const muted: Rgb = [89, 89, 89];
const grid: Rgb = [189, 189, 189];
const softBlue: Rgb = [232, 244, 250];

const copy = {
  nl: {
    reportTitle: "Lactaattest",
    athlete: "Atleet",
    testDate: "Testdatum",
    coach: "Coach",
    protocol: "Protocol",
    noValue: "-",
    testResults: "Testresultaten",
    distance: "Totale afstand",
    duration: "Totale duur",
    speed: "Snelheid",
    pace: "Tempo",
    lactate: "Lactaat",
    heartRate: "Hartslag",
    rpe: "RPE",
    discussion: "Bespreking van de resultaten",
    trainerRemarks: "Opmerkingen van trainer",
    thresholdValues: "Drempelwaarden (op basis van de curve)",
    thresholdType: "Type",
    thresholdSpeed: "Snelheid (Tempo)",
    aerobic: "Aerobe drempel",
    anaerobic: "Anaerobe drempel",
    max: "Maximum",
    thresholdTempo: "Drempel tempo's",
    trainingZones: "Trainingszones",
    zone: "Zone",
    zoneSpeed: "Snelheid (km/u)",
    zonePace: "Tempo (min/km)",
    zoneHr: "Hartslag indicatie",
    zoneGoal: "Doel van de training",
    targetTimes: "Richttijden",
    targetWindow: "Richttijd",
    recovery: "Pauze",
    volume: "Volume",
    raceTimes: "Wedstrijdtijden",
    raceEstimates: "Wedstrijdinschattingen",
    estimatedTime: "Geschatte tijd",
    estimatedPace: "Geschat tempo",
    method: "Methode",
    allOut: "All-out",
    generated: "Gegenereerd",
  },
  en: {
    reportTitle: "Lactate test",
    athlete: "Athlete",
    testDate: "Test date",
    coach: "Coach",
    protocol: "Protocol",
    noValue: "-",
    testResults: "Test results",
    distance: "Total distance",
    duration: "Total duration",
    speed: "Speed",
    pace: "Pace",
    lactate: "Lactate",
    heartRate: "Heart rate",
    rpe: "RPE",
    discussion: "Discussion of results",
    trainerRemarks: "Coach's remarks",
    thresholdValues: "Threshold values (based on the curve)",
    thresholdType: "Type",
    thresholdSpeed: "Speed (Pace)",
    aerobic: "Aerobic threshold",
    anaerobic: "Anaerobic threshold",
    max: "Maximum",
    thresholdTempo: "Threshold pace",
    trainingZones: "Training zones",
    zone: "Zone",
    zoneSpeed: "Speed (km/h)",
    zonePace: "Pace (min/km)",
    zoneHr: "Heart-rate indication",
    zoneGoal: "Training goal",
    targetTimes: "Target times",
    targetWindow: "Target time",
    recovery: "Recovery",
    volume: "Volume",
    raceTimes: "Race times",
    raceEstimates: "Race estimates",
    estimatedTime: "Estimated time",
    estimatedPace: "Estimated pace",
    method: "Method",
    allOut: "All-out",
    generated: "Generated",
  },
} satisfies Record<Language, Record<string, string>>;

let autoTableRunner: AutoTableRunner | undefined;

export async function exportPdfReport(input: PdfReportInput): Promise<void> {
  const doc = await buildPdfReport(input);
  doc.save(
    reportFilename(
      input.athleteInfo.athleteName,
      input.athleteInfo.testDate,
      input.language,
    ),
  );
}

export async function buildPdfReport(input: PdfReportInput): Promise<jsPDF> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  autoTableRunner = autoTableModule.default;

  const labels = copy[input.language];
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as AutoTableDoc;

  let y = drawHeader(doc, input, labels);
  y = drawProtocol(doc, input, labels, y + 2);
  y = drawTestResults(doc, input, labels, y + 5);
  y = drawDiscussion(doc, input.athleteInfo.coachRemarks, labels, y + 5);
  y = drawThresholdValues(doc, input, labels, y + 5);
  y = drawZones(
    doc,
    input.analysis.zones.map((zone) => localizeZone(zone, input.language)),
    labels,
    input.paceUnit,
    y + 5,
  );
  y = drawTargets(
    doc,
    input.analysis.targets.map((target) =>
      localizeTarget(target, input.language),
    ),
    labels,
    input.language,
    y + 5,
  );
  y = drawRaceTimes(doc, input, labels, y + 5);
  drawRaceEstimates(doc, input, labels, y + 5);

  addFooters(doc, labels.reportTitle);
  return doc;
}

function drawHeader(
  doc: jsPDF,
  input: PdfReportInput,
  labels: Record<string, string>,
): number {
  const date =
    input.athleteInfo.testDate || new Date().toISOString().slice(0, 10);
  const title = `${labels.reportTitle} - ${date}`;
  const athlete =
    input.athleteInfo.athleteName ||
    (input.language === "nl" ? "Naamloze loper" : "Unnamed runner");

  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, margin, 20);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(`${labels.athlete}: ${athlete}`, margin, 28);
  doc.text(
    `${labels.generated}: ${new Date().toLocaleDateString()}`,
    pageWidth - margin,
    28,
    { align: "right" },
  );

  doc.setDrawColor(...blue);
  doc.setLineWidth(0.8);
  doc.line(margin, 33, pageWidth - margin, 33);

  return 39;
}

function drawProtocol(
  doc: AutoTableDoc,
  input: PdfReportInput,
  labels: Record<string, string>,
  y: number,
): number {
  y = sectionTitle(doc, labels.protocol, y);
  const protocol = input.athleteInfo.protocol || defaultProtocol(input);
  const metaRows = [
    [
      labels.athlete,
      input.athleteInfo.athleteName || labels.noValue,
      labels.coach,
      input.athleteInfo.coachName || labels.noValue,
    ],
    [
      labels.testDate,
      input.athleteInfo.testDate || labels.noValue,
      "Zones",
      `${input.zoneCount} zones`,
    ],
  ];

  y = table(doc, {
    startY: y,
    body: metaRows,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 1.8, lineWidth: 0, textColor: black },
    columnStyles: {
      0: { fontStyle: "bold", textColor: blue, cellWidth: 26 },
      1: { cellWidth: 62 },
      2: { fontStyle: "bold", textColor: blue, cellWidth: 26 },
      3: { cellWidth: 64 },
    },
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...black);
  const lines = doc.splitTextToSize(protocol, contentWidth) as string[];
  y = ensureSpace(doc, y + 1, lines.length * 4.4 + 5);
  doc.text(lines, margin, y);
  return y + lines.length * 4.4 + 1;
}

function drawTestResults(
  doc: AutoTableDoc,
  input: PdfReportInput,
  labels: Record<string, string>,
  y: number,
): number {
  y = sectionTitle(doc, labels.testResults, y);
  const rows = input.steps.map((step) => [
    formatDistance(step.distanceKm, input.distanceUnit, true),
    formatDuration(step.durationSeconds),
    formatOptionalNumber(step.speedKmh, 1),
    step.lactate !== undefined ? formatNumber(step.lactate, 2) : labels.noValue,
    step.heartRate !== undefined ? `${step.heartRate}` : labels.noValue,
  ]);

  if (
    input.maxLactateTest.lactate !== undefined ||
    input.maxLactateTest.timeSeconds !== undefined
  ) {
    rows.push([
      input.maxLactateTest.distanceMeters
        ? `${input.maxLactateTest.distanceMeters}m`
        : labels.allOut,
      formatDuration(input.maxLactateTest.timeSeconds),
      input.maxLactateTest.distanceMeters && input.maxLactateTest.timeSeconds
        ? formatNumber(
            (input.maxLactateTest.distanceMeters /
              1000 /
              input.maxLactateTest.timeSeconds) *
              3600,
            1,
          )
        : labels.noValue,
      input.maxLactateTest.lactate !== undefined
        ? formatNumber(input.maxLactateTest.lactate, 2)
        : labels.noValue,
      input.maxLactateTest.heartRate !== undefined
        ? `${input.maxLactateTest.heartRate}`
        : labels.noValue,
    ]);
  }

  return table(doc, {
    startY: y,
    head: [
      [
        labels.distance,
        labels.duration,
        `${labels.speed} (km/h)`,
        labels.lactate,
        labels.heartRate,
      ],
    ],
    body: rows,
    styles: { fontSize: 8.5, cellPadding: 1.8 },
    columnStyles: {
      0: { halign: "center", cellWidth: 34 },
      1: { halign: "center", cellWidth: 34 },
      2: { halign: "center", cellWidth: 38 },
      3: { halign: "center", cellWidth: 36 },
      4: { halign: "center", cellWidth: 36 },
    },
  });
}

function drawDiscussion(
  doc: AutoTableDoc,
  remarks: string,
  labels: Record<string, string>,
  y: number,
): number {
  y = sectionTitle(doc, labels.discussion, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const remarkLines = remarks.trim()
    ? (doc.splitTextToSize(remarks.trim(), contentWidth - 6) as string[])
    : [];
  const remarksHeight = Math.max(22, remarkLines.length * 4.2 + 6);
  y = ensureSpace(doc, y, remarksHeight + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...blue);
  doc.text(labels.trainerRemarks, margin, y);
  y += 3;
  doc.setDrawColor(...grid);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, remarksHeight, 1.5, 1.5, "S");
  if (remarkLines.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text(remarkLines, margin + 3, y + 4);
  }
  return y + remarksHeight + 3;
}

function drawThresholdValues(
  doc: AutoTableDoc,
  input: PdfReportInput,
  labels: Record<string, string>,
  y: number,
): number {
  y = sectionTitle(doc, labels.thresholdValues, y);
  const { aerobic, anaerobic } = input.analysis.selectedThresholds;
  const max = input.analysis.maxLactate;
  const body = [
    [
      labels.aerobic,
      aerobic?.lactate !== undefined
        ? `${formatNumber(aerobic.lactate, 2)} mmol`
        : labels.noValue,
      thresholdSpeedText(
        aerobic?.speedKmh,
        aerobic?.paceSecondsPerKm,
        input.paceUnit,
        labels.noValue,
      ),
      aerobic?.heartRate !== undefined
        ? `${aerobic.heartRate}`
        : labels.noValue,
    ],
    [
      labels.anaerobic,
      anaerobic?.lactate !== undefined
        ? `${formatNumber(anaerobic.lactate, 2)} mmol`
        : labels.noValue,
      thresholdSpeedText(
        anaerobic?.speedKmh,
        anaerobic?.paceSecondsPerKm,
        input.paceUnit,
        labels.noValue,
      ),
      anaerobic?.heartRate !== undefined
        ? `${anaerobic.heartRate}`
        : labels.noValue,
    ],
  ];

  if (max.value !== undefined || max.speedKmh !== undefined) {
    body.push([
      labels.max,
      max.value !== undefined
        ? `${formatNumber(max.value, 1)} mmol`
        : labels.noValue,
      thresholdSpeedText(
        max.speedKmh,
        max.speedKmh ? speedToPaceSecondsPerKm(max.speedKmh) : undefined,
        input.paceUnit,
        labels.noValue,
      ),
      max.heartRate !== undefined ? `${max.heartRate}` : labels.noValue,
    ]);
  }

  y = table(doc, {
    startY: y,
    head: [
      [
        labels.thresholdType,
        labels.lactate,
        labels.thresholdSpeed,
        labels.heartRate,
      ],
    ],
    body,
    styles: { fontSize: 8.7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { halign: "center", cellWidth: 36 },
      2: { halign: "center", cellWidth: 58 },
      3: { halign: "center", cellWidth: 36 },
    },
  });

  if (anaerobic?.speedKmh !== undefined) {
    y = ensureSpace(doc, y + 1, 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...black);
    doc.text(
      `${labels.thresholdTempo}: ${formatThresholdTempo(anaerobic.speedKmh, input.paceUnit)}`,
      margin,
      y + 4,
    );
    y += 7;
  }
  return y;
}

function drawZones(
  doc: AutoTableDoc,
  zones: TrainingZone[],
  labels: Record<string, string>,
  paceUnit: PaceUnit,
  y: number,
): number {
  if (zones.length === 0) return y;
  y = sectionTitle(doc, labels.trainingZones, y);
  return table(doc, {
    startY: y,
    head: [
      [
        labels.zone,
        labels.zoneSpeed,
        labels.zonePace,
        labels.zoneHr,
        labels.zoneGoal,
      ],
    ],
    body: zones.map((zone) => [
      zone.shortName || zone.name,
      formatZoneSpeed(zone),
      formatZonePace(zone, paceUnit),
      formatZoneHeartRate(zone, labels.noValue),
      zone.purpose,
    ]),
    styles: { fontSize: 7.8, cellPadding: 1.7 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 29 },
      2: { halign: "center", cellWidth: 34 },
      3: { halign: "center", cellWidth: 31 },
      4: { cellWidth: 52 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 0) {
        const zone = zones[data.row.index];
        data.cell.styles.fillColor = zoneFill(zone);
        data.cell.styles.textColor = [0, 0, 0];
      }
    },
  });
}

function drawTargets(
  doc: AutoTableDoc,
  targets: TargetPaceCategory[],
  labels: Record<string, string>,
  language: Language,
  y: number,
): number {
  if (targets.length === 0) return y;
  y = sectionTitle(doc, labels.targetTimes, y);

  targets.forEach((target) => {
    y = ensureSpace(doc, y, estimateTargetBlockHeight(target));
    y = subTitle(doc, target.name, y);
    const purpose = doc.splitTextToSize(
      target.purpose,
      contentWidth,
    ) as string[];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(...muted);
    doc.text(purpose, margin, y);
    y += purpose.length * 3.4 + 1;

    y =
      table(doc, {
        startY: y,
        head: [
          [
            labels.distance,
            labels.targetWindow,
            labels.recovery,
            labels.volume,
          ],
        ],
        body: target.times.map((time) => [
          `${time.distanceMeters}m`,
          `${formatDuration(time.timeFromSeconds)} - ${formatDuration(time.timeToSeconds)}`,
          formatTargetRecovery(
            time.recoverySeconds,
            time.recoveryType,
            language,
          ),
          `${formatTargetRepetitions(time.repetitionsFrom, time.repetitionsTo, language)} / ${formatTargetVolume(time.totalVolumeMetersFrom, time.totalVolumeMetersTo)}`,
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.4 },
        columnStyles: {
          0: { halign: "center", cellWidth: 34 },
          1: { halign: "center", cellWidth: 48 },
          2: { halign: "center", cellWidth: 43 },
          3: { halign: "center", cellWidth: 53 },
        },
      }) + 3;
  });

  return y;
}

function estimateTargetBlockHeight(target: TargetPaceCategory): number {
  return 17 + target.times.length * 6;
}

function drawRaceTimes(
  doc: AutoTableDoc,
  input: PdfReportInput,
  labels: Record<string, string>,
  y: number,
): number {
  const rows = input.raceTimes
    .filter(
      (raceTime) =>
        raceTime.distanceMeters !== undefined ||
        raceTime.timeSeconds !== undefined,
    )
    .map((raceTime) => [
      raceTime.distanceMeters !== undefined
        ? `${raceTime.distanceMeters}m`
        : labels.noValue,
      formatDuration(raceTime.timeSeconds),
      raceTime.note || labels.noValue,
    ]);
  if (rows.length === 0) return y;
  y = sectionTitle(doc, labels.raceTimes, y);
  return table(doc, {
    startY: y,
    head: [[labels.distance, labels.duration, "Notitie"]],
    body: rows,
  });
}

function drawRaceEstimates(
  doc: AutoTableDoc,
  input: PdfReportInput,
  labels: Record<string, string>,
  y: number,
): number {
  if (input.analysis.raceEstimates.length === 0) return y;
  y = sectionTitle(doc, labels.raceEstimates, y);
  return table(doc, {
    startY: y,
    head: [
      [
        labels.distance,
        labels.estimatedTime,
        labels.estimatedPace,
        labels.method,
      ],
    ],
    body: input.analysis.raceEstimates.map((estimate) => [
      estimate.distanceLabel,
      formatDuration(estimate.estimatedTimeSeconds),
      formatPace(estimate.estimatedPaceSecondsPerKm, input.paceUnit),
      estimate.method,
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { halign: "center", cellWidth: 32 },
      2: { halign: "center", cellWidth: 34 },
      3: { cellWidth: 82 },
    },
  });
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  const nextY = ensureSpace(doc, y, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...blue);
  doc.text(title, margin, nextY);
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.45);
  doc.line(margin, nextY + 2.5, pageWidth - margin, nextY + 2.5);
  return nextY + 7;
}

function subTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...blue);
  doc.text(title, margin, y);
  return y + 4;
}

function table(doc: AutoTableDoc, options: UserOptions): number {
  if (!autoTableRunner) throw new Error("PDF table renderer was not loaded.");
  autoTableRunner(doc, {
    margin: { left: margin, right: margin, bottom: 16 },
    theme: "grid",
    headStyles: {
      fillColor: yellow,
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8.2,
      lineColor: grid,
      lineWidth: 0.2,
    },
    bodyStyles: { textColor: black },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    styles: {
      font: "helvetica",
      fontSize: 8.4,
      cellPadding: 1.8,
      lineColor: grid,
      lineWidth: 0.2,
      valign: "middle",
    },
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
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(title, margin, pageHeight - 8);
    doc.text(`${page}/${pageCount}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }
}

function defaultProtocol(input: PdfReportInput): string {
  if (input.language === "nl") {
    const stageDistance = input.steps.find(
      (step) => step.distanceKm,
    )?.distanceKm;
    const stageText = stageDistance
      ? `${formatNumber(stageDistance * 1000, 0)}m`
      : "Stappen";
    const maxText = input.maxLactateTest.distanceMeters
      ? `${input.maxLactateTest.distanceMeters}m`
      : "400m/600m";
    return `${stageText} met telkens een tempoverhoging. Op het einde een maximale ${maxText} voor het bepalen van de maximale lactaatwaarde.`;
  }
  const maxText = input.maxLactateTest.distanceMeters
    ? `${input.maxLactateTest.distanceMeters}m`
    : "400m/600m";
  return `Progressive staged test with increasing speed. Optional all-out ${maxText} at the end to determine maximum lactate.`;
}

function thresholdSpeedText(
  speedKmh: number | undefined,
  paceSeconds: number | undefined,
  paceUnit: PaceUnit,
  fallback: string,
): string {
  if (speedKmh === undefined) return fallback;
  return `${formatNumber(speedKmh, 1)} km/h (${formatPace(paceSeconds, paceUnit)})`;
}

function formatThresholdTempo(speedKmh: number, paceUnit: PaceUnit): string {
  const low = speedKmh * 0.98;
  return `${formatNumber(low, 1)} a ${formatNumber(speedKmh, 1)} km/h (${formatPace(speedToPaceSecondsPerKm(speedKmh), paceUnit)})`;
}

function formatZoneSpeed(zone: TrainingZone): string {
  if (zone.speedToKmh === undefined)
    return `> ${formatNumber(zone.speedFromKmh, 1)}`;
  return formatRange(zone.speedFromKmh, zone.speedToKmh, "", 1);
}

function formatZonePace(zone: TrainingZone, paceUnit: PaceUnit): string {
  if (zone.paceFromSecondsPerKm === undefined)
    return `< ${formatPace(zone.paceToSecondsPerKm, paceUnit)}`;
  return `${formatPace(zone.paceFromSecondsPerKm, paceUnit)} - ${formatPace(zone.paceToSecondsPerKm, paceUnit)}`;
}

function formatZoneHeartRate(zone: TrainingZone, fallback: string): string {
  if (zone.heartRateFrom !== undefined && zone.heartRateTo !== undefined)
    return `${zone.heartRateFrom}-${zone.heartRateTo}`;
  if (zone.heartRateFrom !== undefined) return `> ${zone.heartRateFrom}`;
  if (zone.heartRateTo !== undefined) return `< ${zone.heartRateTo}`;
  return fallback;
}

function zoneFill(zone: TrainingZone): Rgb {
  const key = zone.shortName || "";
  if (key === "REC") return [178, 178, 178];
  if (key === "AER") return [132, 226, 144];
  if (key === "TMP") return [131, 202, 235];
  if (key === "SST") return [245, 178, 89];
  if (key === "THR") return [247, 105, 105];
  if (key === "VO2") return [229, 158, 220];
  if (key === "NMR") return [80, 80, 80];
  return hexToRgb(zone.color) ?? softBlue;
}

function hexToRgb(value: string | undefined): Rgb | undefined {
  if (!value) return undefined;
  const hex = value.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return undefined;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function formatTargetRepetitions(
  from: number,
  to: number,
  language: Language,
): string {
  const noun = language === "nl" ? "herh." : "reps";
  return from === to ? `${from} ${noun}` : `${from}-${to} ${noun}`;
}

function formatTargetRecovery(
  seconds: number,
  type: TargetRecoveryType,
  language: Language,
): string {
  const labels: Record<TargetRecoveryType, Record<Language, string>> = {
    easyJog: { en: "easy jog", nl: "rustig dribbel" },
    jog: { en: "jog", nl: "dribbel" },
    walkJog: { en: "walk/jog", nl: "wandelen/dribbelen" },
    walk: { en: "walk", nl: "wandelen" },
    full: { en: "full recovery", nl: "volledig herstel" },
  };
  return `${formatDuration(seconds)} ${labels[type][language]}`;
}

function formatTargetVolume(fromMeters: number, toMeters: number): string {
  const fromKm = round(fromMeters / 1000, fromMeters < 1000 ? 2 : 1);
  const toKm = round(toMeters / 1000, toMeters < 1000 ? 2 : 1);
  return fromKm === toKm ? `${fromKm} km` : `${fromKm}-${toKm} km`;
}

function formatDistance(
  distanceKm: number | undefined,
  unit: DistanceUnit,
  includeUnit = false,
): string {
  const value = convertDistanceToDisplay(distanceKm, unit);
  if (value === undefined) return "-";
  const decimals = value >= 1 ? 2 : 3;
  const suffix = includeUnit ? ` ${unit}` : "";
  return `${formatNumber(value, decimals)}${suffix}`;
}

function formatOptionalNumber(
  value: number | undefined,
  decimals: number,
): string {
  return value !== undefined ? formatNumber(value, decimals) : "-";
}

function formatNumber(value: number, decimals: number): string {
  return `${round(value, decimals)}`;
}

function reportFilename(
  athleteName: string,
  testDate: string,
  language: Language,
): string {
  const fallback = language === "nl" ? "lactaattest" : "lactate-test";
  const cleanName = (athleteName || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `${cleanName || fallback}-${testDate || new Date().toISOString().slice(0, 10)}.pdf`;
}
