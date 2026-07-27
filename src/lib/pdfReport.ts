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
import { sampleReferenceCurve } from "./referenceThresholds";

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
    zoneRangeSummary: "Volledige snelheids-, tempo- en hartslagbereiken",
    zoneSystem: "zonesysteem",
    speedRange: "Snelheidsbereik",
    paceRange: "Tempo",
    heartRateRange: "Hartslag",
    targetTimes: "Richttijden",
    targetWindow: "Richttijd",
    targetPace: "Doeltempo",
    recovery: "Pauze",
    volume: "Volume",
    raceTimes: "Wedstrijdtijden",
    raceEstimates: "Wedstrijdinschattingen",
    estimatedTime: "Geschatte tijd",
    estimatedPace: "Geschat tempo",
    method: "Methode",
    allOut: "All-out",
    generated: "Gegenereerd",
    analysisChart: "Lactaat- en hartslagcurve",
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
    zoneRangeSummary: "Complete speed, pace and heart-rate ranges",
    zoneSystem: "zone system",
    speedRange: "Speed range",
    paceRange: "Pace",
    heartRateRange: "Heart rate",
    targetTimes: "Target times",
    targetWindow: "Target time",
    targetPace: "Target pace",
    recovery: "Recovery",
    volume: "Volume",
    raceTimes: "Race times",
    raceEstimates: "Race estimates",
    estimatedTime: "Estimated time",
    estimatedPace: "Estimated pace",
    method: "Method",
    allOut: "All-out",
    generated: "Generated",
    analysisChart: "Lactate and heart-rate curve",
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
  y = drawAnalysisChart(doc, input, labels, y + 5);
  y = drawDiscussion(doc, input.athleteInfo.coachRemarks, labels, y + 5);
  y = drawThresholdValues(doc, input, labels, y + 5);
  y = drawZoneRangeChart(
    doc,
    input.analysis.zones.map((zone) => localizeZone(zone, input.language)),
    labels,
    input.paceUnit,
    input.zoneCount,
    y + 5,
  );
  y = drawTargets(
    doc,
    input.analysis.targets.map((target) =>
      localizeTarget(target, input.language),
    ),
    labels,
    input.language,
    input.paceUnit,
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

function drawAnalysisChart(
  doc: jsPDF,
  input: PdfReportInput,
  labels: Record<string, string>,
  y: number,
): number {
  const points = input.analysis.validPoints;
  if (points.length < 2) return y;

  doc.addPage();
  y = 18;
  y = sectionTitle(doc, labels.analysisChart, y);

  const curve = sampleReferenceCurve(points, 160);
  const zones = input.analysis.zones.map((zone) =>
    localizeZone(zone, input.language),
  );
  const heartRatePoints = points
    .filter((point) => Number.isFinite(point.heartRate))
    .map((point) => ({ x: point.speedKmh, y: point.heartRate as number }))
    .sort((first, second) => first.x - second.x);
  const speedValues = points.map((point) => point.speedKmh);
  const lactateValues = [
    ...points.map((point) => point.lactate),
    ...curve.map((point) => point.smoothedLactate ?? 0),
  ];
  const zoneDomain = zones.length > 0 ? zoneChartDomain(zones) : undefined;
  const speedMin =
    zoneDomain?.speedMin ?? Math.min(...speedValues) - 0.5;
  const speedMax =
    zoneDomain?.speedMax ?? Math.max(...speedValues) + 0.5;
  const fallbackSpan = zoneDomain?.fallbackSpan ?? 1;
  const lactateMax = Math.max(6, Math.ceil(Math.max(...lactateValues) + 1));
  const heartRateMin = heartRatePoints.length
    ? Math.floor((Math.min(...heartRatePoints.map((point) => point.y)) - 8) / 10) *
      10
    : 0;
  const heartRateMax = heartRatePoints.length
    ? Math.ceil((Math.max(...heartRatePoints.map((point) => point.y)) + 8) / 10) *
      10
    : 1;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...muted);
  doc.text(labels.zoneRangeSummary, margin, y);

  const plotX = margin + 25;
  const plotY = y + 13;
  const plotWidth = pageWidth - margin - plotX - 4;
  const plotHeight = 158;
  const x = (speed: number) =>
    plotX + scaleChartValue(speed, speedMin, speedMax) * plotWidth;
  const lactateY = (lactate: number) =>
    plotY + plotHeight - scaleChartValue(lactate, 0, lactateMax) * plotHeight;
  const heartRateY = (heartRate: number) =>
    plotY +
    plotHeight -
    scaleChartValue(heartRate, heartRateMin, heartRateMax) * plotHeight;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...black);
  drawLegendItem(doc, plotX, y + 6, [2, 132, 199], labels.lactate);
  if (heartRatePoints.length > 0) {
    drawLegendItem(doc, plotX + 43, y + 6, [190, 18, 60], labels.heartRate);
  }
  if (zones.length > 0) {
    drawZoneSystemBadge(
      doc,
      `${input.zoneCount}-${labels.zoneSystem}`.toUpperCase(),
      pageWidth - margin,
      y + 6,
    );
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...grid);
  doc.rect(plotX, plotY, plotWidth, plotHeight, "FD");

  zones.forEach((zone, index) => {
    const displayEnd = zone.speedToKmh ?? zone.speedFromKmh + fallbackSpan;
    const bandStart = Math.max(plotX, x(zone.speedFromKmh));
    const bandEnd = Math.min(plotX + plotWidth, x(displayEnd));
    const bandWidth = bandEnd - bandStart;
    if (bandWidth <= 0) return;

    doc.setFillColor(...tintColor(zoneFill(zone), 0.88));
    doc.rect(bandStart, plotY, bandWidth, plotHeight, "F");
    if (bandWidth >= 5) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(bandWidth < 8 ? 5.1 : bandWidth < 14 ? 5.8 : 6.6);
      doc.setTextColor(...muted);
      doc.text(
        bandWidth < 14
          ? `Z${index + 1}`
          : `Z${index + 1} ${zone.shortName ?? ""}`.trim(),
        bandStart + bandWidth / 2,
        plotY + 5.2,
        { align: "center", maxWidth: Math.max(5, bandWidth - 1.5) },
      );
    }
  });

  doc.setFontSize(7.1);
  for (let index = 0; index <= 5; index += 1) {
    const ratio = index / 5;
    const gridX = plotX + ratio * plotWidth;
    const gridY = plotY + ratio * plotHeight;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(gridX, plotY, gridX, plotY + plotHeight);
    doc.line(plotX, gridY, plotX + plotWidth, gridY);

    doc.setTextColor(...muted);
    doc.text(
      formatNumber(lactateMax * (1 - ratio), 1),
      plotX - 2,
      gridY + 1,
      { align: "right" },
    );
    if (heartRatePoints.length > 0) {
      doc.text(
        formatNumber(
          heartRateMax - ratio * (heartRateMax - heartRateMin),
          0,
        ),
        plotX + plotWidth + 2,
        gridY + 1,
      );
    }
  }

  drawHorizontalReference(doc, plotX, plotWidth, lactateY(2), "2 mmol/L", [14, 165, 233]);
  drawHorizontalReference(doc, plotX, plotWidth, lactateY(4), "4 mmol/L", [249, 115, 22]);

  doc.setLineDashPattern([], 0);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(2.2);
  drawChartLine(
    doc,
    curve.map((point) => ({
      x: x(point.speedKmh),
      y: lactateY(point.smoothedLactate ?? 0),
    })),
  );
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(1.15);
  drawChartLine(
    doc,
    curve.map((point) => ({
      x: x(point.speedKmh),
      y: lactateY(point.smoothedLactate ?? 0),
    })),
  );

  if (heartRatePoints.length > 0) {
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(2.1);
    drawChartLine(
      doc,
      heartRatePoints.map((point) => ({ x: x(point.x), y: heartRateY(point.y) })),
    );
    doc.setDrawColor(190, 18, 60);
    doc.setLineWidth(1.05);
    drawChartLine(
      doc,
      heartRatePoints.map((point) => ({ x: x(point.x), y: heartRateY(point.y) })),
    );
  }

  points.forEach((point) => {
    doc.setFillColor(255, 255, 255);
    doc.circle(x(point.speedKmh), lactateY(point.lactate), 2.25, "F");
    doc.setFillColor(2, 132, 199);
    doc.circle(x(point.speedKmh), lactateY(point.lactate), 1.55, "F");
    if (point.heartRate !== undefined) {
      doc.setFillColor(255, 255, 255);
      doc.circle(x(point.speedKmh), heartRateY(point.heartRate), 2.15, "F");
      doc.setFillColor(190, 18, 60);
      doc.circle(x(point.speedKmh), heartRateY(point.heartRate), 1.48, "F");
    }
  });

  const aerobic = input.analysis.selectedThresholds.aerobic;
  if (
    aerobic?.speedKmh !== undefined &&
    aerobic.speedKmh >= speedMin &&
    aerobic.speedKmh <= speedMax
  ) {
    drawThresholdGuide(
      doc,
      x(aerobic.speedKmh),
      lactateY(
        aerobic.lactate ??
          curveValueAtSpeed(curve, aerobic.speedKmh) ??
          0,
      ),
      plotY + plotHeight,
    );
  }
  const anaerobic = input.analysis.selectedThresholds.anaerobic;
  if (
    anaerobic?.speedKmh !== undefined &&
    anaerobic.speedKmh >= speedMin &&
    anaerobic.speedKmh <= speedMax
  ) {
    drawThresholdGuide(
      doc,
      x(anaerobic.speedKmh),
      lactateY(
        anaerobic.lactate ??
          curveValueAtSpeed(curve, anaerobic.speedKmh) ??
          0,
      ),
      plotY + plotHeight,
    );
  }

  doc.setDrawColor(...grid);
  doc.setLineWidth(0.3);
  doc.rect(plotX, plotY, plotWidth, plotHeight, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text("mmol/L", plotX, plotY - 2);
  if (heartRatePoints.length > 0) {
    doc.text("bpm", plotX + plotWidth, plotY - 2, { align: "right" });
  }

  if (zones.length > 0) {
    drawHeartRateZoneLadder(
      doc,
      zones,
      labels,
      margin,
      plotY,
      15.5,
      plotHeight,
    );
  }

  const ribbonY = plotY + plotHeight + 8;
  if (zones.length > 0) {
    drawZoneRibbon(
      doc,
      zones,
      plotX,
      ribbonY,
      plotWidth,
      speedMin,
      speedMax,
      fallbackSpan,
      10,
    );
  }

  const transitionLabelsBottom =
    zones.length > 1
      ? drawSpeedTransitionLabels(
          doc,
          zones,
          plotX,
          ribbonY,
          plotWidth,
          speedMin,
          speedMax,
          input.paceUnit,
        )
      : ribbonY + 18;
  const paceSuffix = input.paceUnit === "minPerMile" ? "/mi" : "/km";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text(
    `${labels.speed} (km/h) / ${labels.pace} (${paceSuffix})`,
    plotX + plotWidth / 2,
    transitionLabelsBottom + 5,
    { align: "center" },
  );

  return doc.internal.pageSize.getHeight() - 16;
}

function drawLegendItem(
  doc: jsPDF,
  x: number,
  y: number,
  color: Rgb,
  label: string,
): void {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.8);
  doc.line(x, y, x + 6, y);
  doc.setTextColor(...black);
  doc.text(label, x + 8, y + 1);
}

function drawZoneSystemBadge(
  doc: jsPDF,
  label: string,
  rightX: number,
  centerY: number,
): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  const width = Math.max(25, doc.getTextWidth(label) + 7);
  doc.setFillColor(...softBlue);
  doc.setDrawColor(179, 218, 235);
  doc.roundedRect(rightX - width, centerY - 3.3, width, 6.3, 3.1, 3.1, "FD");
  doc.setTextColor(...blue);
  doc.text(label, rightX - width / 2, centerY + 0.8, { align: "center" });
}

function drawHorizontalReference(
  doc: jsPDF,
  x: number,
  width: number,
  y: number,
  label: string,
  color: Rgb,
): void {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.2], 0);
  doc.line(x, y, x + width, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...color);
  doc.text(label, x + width - 1, y - 1, { align: "right" });
}

function drawThresholdGuide(
  doc: jsPDF,
  x: number,
  markerY: number,
  plotBottom: number,
): void {
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([0.9, 0.8], 0);
  doc.line(x, markerY, x, plotBottom);
  doc.setLineDashPattern([], 0);
}

function drawZoneRibbon(
  doc: jsPDF,
  zones: TrainingZone[],
  plotX: number,
  y: number,
  plotWidth: number,
  speedMin: number,
  speedMax: number,
  fallbackSpan: number,
  height = 7,
): void {
  const speedX = (speed: number) =>
    plotX + scaleChartValue(speed, speedMin, speedMax) * plotWidth;

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(plotX, y, plotWidth, height, 2.1, 2.1, "F");

  zones.forEach((zone, index) => {
    const displayEnd = zone.speedToKmh ?? zone.speedFromKmh + fallbackSpan;
    const start = Math.max(plotX, speedX(zone.speedFromKmh));
    const end = Math.min(plotX + plotWidth, speedX(displayEnd));
    const width = end - start;
    if (width <= 0) return;

    const segmentX = start + 0.25;
    const segmentWidth = Math.max(0.8, width - 0.5);
    const color = zoneFill(zone);
    doc.setFillColor(...color);
    doc.roundedRect(
      segmentX,
      y + 0.4,
      segmentWidth,
      height - 0.8,
      1.7,
      1.7,
      "F",
    );

    if (segmentWidth >= 4.5) {
      const label =
        segmentWidth >= 12
          ? `Z${index + 1} ${zone.shortName ?? ""}`.trim()
          : `Z${index + 1}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(segmentWidth < 10 ? 5.1 : 6);
      doc.setTextColor(...contrastTextColor(color));
      doc.text(label, segmentX + segmentWidth / 2, y + height / 2 + 2, {
        align: "center",
        maxWidth: Math.max(4, segmentWidth - 1.2),
      });
    }
  });
}

function drawHeartRateZoneLadder(
  doc: jsPDF,
  zones: TrainingZone[],
  labels: Record<string, string>,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(...muted);
  doc.text(
    `${labels.heartRate.toUpperCase()} / ${labels.zone.toUpperCase()}`,
    x + width / 2,
    y - 2.5,
    { align: "center", maxWidth: width + 5 },
  );

  const gap = 0.8;
  const availableHeight = height - gap * (zones.length - 1);
  const finiteSpans = zones
    .filter(
      (zone) =>
        zone.heartRateFrom !== undefined && zone.heartRateTo !== undefined,
    )
    .map((zone) =>
      Math.max(
        1,
        (zone.heartRateTo as number) - (zone.heartRateFrom as number) + 1,
      ),
    )
    .sort((first, second) => first - second);
  const fallbackSpan =
    finiteSpans.length > 0
      ? finiteSpans[Math.floor(finiteSpans.length / 2)]
      : 10;
  const zoneSpans = zones.map((zone) =>
    zone.heartRateFrom !== undefined && zone.heartRateTo !== undefined
      ? Math.max(1, zone.heartRateTo - zone.heartRateFrom + 1)
      : fallbackSpan,
  );
  const rowHeights = proportionalSegmentSizes(
    zoneSpans,
    availableHeight,
    8,
  );
  const layouts: Array<{
    zone: TrainingZone;
    zoneIndex: number;
    rowY: number;
    rowHeight: number;
  }> = [];
  let cursorY = y + height;

  zones.forEach((zone, zoneIndex) => {
    const rowHeight = rowHeights[zoneIndex];
    const rowY = cursorY - rowHeight;
    layouts.push({ zone, zoneIndex, rowY, rowHeight });
    cursorY = rowY - gap;
  });

  layouts.forEach(({ zone, zoneIndex, rowY, rowHeight }) => {
    const color = zoneFill(zone);
    doc.setFillColor(...color);
    doc.roundedRect(x, rowY, width, rowHeight, 1.5, 1.5, "F");
    doc.setTextColor(...contrastTextColor(color));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(rowHeight < 9 ? 4.7 : 5.3);
    doc.text(
      `Z${zoneIndex + 1} ${zone.shortName ?? ""}`.trim(),
      x + width / 2,
      rowY + rowHeight / 2 + 1.5,
      { align: "center", maxWidth: width - 1.2 },
    );
  });

  zones.slice(0, -1).forEach((zone, index) => {
    const nextZone = zones[index + 1];
    const transitionHeartRate = nextZone.heartRateFrom ?? zone.heartRateTo;
    if (transitionHeartRate === undefined) return;

    const boundaryY = layouts[index].rowY - gap / 2;
    const color = zoneFill(nextZone);
    const labelWidth = 10.5;
    const labelHeight = 5.4;
    const labelX = x - labelWidth - 1.7;
    const labelY = boundaryY - labelHeight / 2;

    doc.setDrawColor(...color);
    doc.setLineWidth(0.55);
    doc.line(x - 1.2, boundaryY, x + 2.2, boundaryY);
    doc.setFillColor(...color);
    doc.roundedRect(
      labelX,
      labelY,
      labelWidth,
      labelHeight,
      1.5,
      1.5,
      "F",
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(...contrastTextColor(color));
    doc.text(`${transitionHeartRate}`, labelX + labelWidth / 2, boundaryY + 1.8, {
      align: "center",
    });
  });
}

function drawSpeedTransitionLabels(
  doc: jsPDF,
  zones: TrainingZone[],
  plotX: number,
  ribbonY: number,
  plotWidth: number,
  speedMin: number,
  speedMax: number,
  paceUnit: PaceUnit,
): number {
  const labelWidth = 14.5;
  const labelHeight = 8;
  const laneGap = 1.4;
  const labelTop = ribbonY + 13;
  const laneRightEdges: number[] = [];
  const transitionLabels = zones.slice(1).map((zone) => {
    const boundaryX =
      plotX +
      scaleChartValue(zone.speedFromKmh, speedMin, speedMax) * plotWidth;
    let lane = laneRightEdges.findIndex(
      (rightEdge) => boundaryX - labelWidth / 2 >= rightEdge + 1,
    );
    if (lane === -1) lane = laneRightEdges.length;
    laneRightEdges[lane] = boundaryX + labelWidth / 2;
    return {
      boundaryX,
      color: zoneFill(zone),
      lane,
      pace: compactPace(
        speedToPaceSecondsPerKm(zone.speedFromKmh) ?? 0,
        paceUnit,
      ),
      speed: formatNumber(zone.speedFromKmh, 1),
    };
  });

  transitionLabels.forEach(({ boundaryX, lane }) => {
    const boxY = labelTop + lane * (labelHeight + laneGap);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.line(boundaryX, ribbonY + 10.2, boundaryX, boxY);
  });

  transitionLabels.forEach(({ boundaryX, color, lane, pace, speed }) => {
    const boxY = labelTop + lane * (labelHeight + laneGap);
    const boxX = boundaryX - labelWidth / 2;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...tintColor(color, 0.3));
    doc.roundedRect(
      boxX,
      boxY,
      labelWidth,
      labelHeight,
      1.6,
      1.6,
      "FD",
    );
    doc.setFillColor(...color);
    doc.circle(boundaryX, ribbonY + 10.4, 0.75, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...black);
    doc.text(speed, boundaryX, boxY + 3.1, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.1);
    doc.setTextColor(...muted);
    doc.text(pace, boundaryX, boxY + 6.4, { align: "center" });
  });

  return (
    labelTop +
    laneRightEdges.length * labelHeight +
    Math.max(0, laneRightEdges.length - 1) * laneGap
  );
}

function curveValueAtSpeed(
  curve: Array<{ speedKmh: number; smoothedLactate?: number }>,
  speed: number,
): number | undefined {
  const points = curve
    .filter((point) => Number.isFinite(point.smoothedLactate))
    .sort((first, second) => first.speedKmh - second.speedKmh);
  if (points.length === 0) return undefined;
  if (speed <= points[0].speedKmh) return points[0].smoothedLactate;
  if (speed >= points[points.length - 1].speedKmh)
    return points[points.length - 1].smoothedLactate;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (speed <= current.speedKmh) {
      const ratio =
        (speed - previous.speedKmh) /
        (current.speedKmh - previous.speedKmh);
      return (
        (previous.smoothedLactate as number) +
        ((current.smoothedLactate as number) -
          (previous.smoothedLactate as number)) *
          ratio
      );
    }
  }
  return undefined;
}

function drawChartLine(
  doc: jsPDF,
  points: Array<{ x: number; y: number }>,
): void {
  for (let index = 1; index < points.length; index += 1) {
    doc.line(
      points[index - 1].x,
      points[index - 1].y,
      points[index].x,
      points[index].y,
    );
  }
}

function scaleChartValue(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function proportionalSegmentSizes(
  weights: number[],
  totalSize: number,
  minimumSize: number,
): number[] {
  if (weights.length === 0) return [];
  if (totalSize <= minimumSize * weights.length) {
    return weights.map(() => totalSize / weights.length);
  }

  const sizes = weights.map(() => 0);
  let remainingSize = totalSize;
  let remainingIndexes = weights.map((_, index) => index);

  while (remainingIndexes.length > 0) {
    const remainingWeight = remainingIndexes.reduce(
      (sum, index) => sum + Math.max(0.01, weights[index]),
      0,
    );
    const undersized = remainingIndexes.filter(
      (index) =>
        (remainingSize * Math.max(0.01, weights[index])) / remainingWeight <
        minimumSize,
    );

    if (undersized.length === 0) {
      remainingIndexes.forEach((index) => {
        sizes[index] =
          (remainingSize * Math.max(0.01, weights[index])) / remainingWeight;
      });
      break;
    }

    undersized.forEach((index) => {
      sizes[index] = minimumSize;
    });
    remainingSize -= undersized.length * minimumSize;
    remainingIndexes = remainingIndexes.filter(
      (index) => !undersized.includes(index),
    );
  }

  return sizes;
}

function drawDiscussion(
  doc: AutoTableDoc,
  remarks: string,
  labels: Record<string, string>,
  y: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const remarkLines = remarks.trim()
    ? (doc.splitTextToSize(remarks.trim(), contentWidth - 6) as string[])
    : [];
  const remarksHeight = Math.max(22, remarkLines.length * 4.2 + 6);
  y = ensureSpace(doc, y, remarksHeight + 20);
  y = sectionTitle(doc, labels.discussion, y);
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

function drawZoneRangeChart(
  doc: jsPDF,
  zones: TrainingZone[],
  labels: Record<string, string>,
  paceUnit: PaceUnit,
  zoneCount: ZoneCount,
  y: number,
): number {
  if (zones.length === 0) return y;

  const rowHeight = 13;
  const chartHeight = 28 + zones.length * rowHeight;
  y = ensureSpace(doc, y, chartHeight + 18);
  y = sectionTitle(doc, labels.trainingZones, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(labels.zoneRangeSummary, margin, y);

  const systemLabel = `${zoneCount}-${labels.zoneSystem}`;
  doc.setFillColor(...softBlue);
  doc.setDrawColor(179, 218, 235);
  doc.roundedRect(pageWidth - margin - 29, y - 4.2, 29, 6.5, 3.2, 3.2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.1);
  doc.setTextColor(...blue);
  doc.text(systemLabel.toUpperCase(), pageWidth - margin - 14.5, y, {
    align: "center",
  });

  const zoneX = margin;
  const zoneWidth = 43;
  const plotX = zoneX + zoneWidth + 3;
  const plotWidth = 65;
  const paceX = plotX + plotWidth + 4;
  const paceWidth = 34;
  const heartRateX = paceX + paceWidth + 3;
  const headerY = y + 9;
  const rowStartY = headerY + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.7);
  doc.setTextColor(...muted);
  doc.text(labels.zone.toUpperCase(), zoneX + 2, headerY);
  doc.text(labels.speedRange.toUpperCase(), plotX, headerY);
  doc.text(labels.paceRange.toUpperCase(), paceX, headerY);
  doc.text(labels.heartRateRange.toUpperCase(), heartRateX, headerY);

  const { speedMin, speedMax, fallbackSpan } = zoneChartDomain(zones);
  const speedX = (speed: number) =>
    plotX + scaleChartValue(speed, speedMin, speedMax) * plotWidth;

  zones.forEach((zone, index) => {
    const rowY = rowStartY + index * rowHeight;
    const fill = tintColor(zoneFill(zone), 0.86);
    const accent = zoneFill(zone);
    const displayEnd = zone.speedToKmh ?? zone.speedFromKmh + fallbackSpan;
    const barFrom = speedX(zone.speedFromKmh);
    const barTo = speedX(displayEnd);

    doc.setFillColor(...fill);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(
      zoneX,
      rowY,
      contentWidth,
      rowHeight - 1,
      1.5,
      1.5,
      "FD",
    );
    doc.setFillColor(...accent);
    doc.roundedRect(zoneX, rowY, 2.8, rowHeight - 1, 1.2, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.setTextColor(...black);
    doc.text(
      `Z${index + 1}  ${zone.shortName ?? ""}`.trim(),
      zoneX + 5,
      rowY + 4.2,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(...muted);
    doc.text(zoneDisplayName(zone), zoneX + 5, rowY + 8.2, {
      maxWidth: zoneWidth - 7,
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...black);
    doc.text(`${formatZoneSpeed(zone)} km/h`, plotX, rowY + 4.2);

    const barY = rowY + 7.2;
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(plotX, barY, plotWidth, 3.2, 1.6, 1.6, "F");
    doc.setFillColor(...accent);
    doc.roundedRect(
      barFrom,
      barY,
      Math.max(1.3, barTo - barFrom),
      3.2,
      1.6,
      1.6,
      "F",
    );
    if (zone.speedToKmh === undefined) {
      doc.triangle(
        plotX + plotWidth - 0.1,
        barY - 0.5,
        plotX + plotWidth - 0.1,
        barY + 3.7,
        plotX + plotWidth + 2.2,
        barY + 1.6,
        "F",
      );
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...black);
    doc.text(formatZonePaceCompact(zone, paceUnit), paceX, rowY + 7.1, {
      maxWidth: paceWidth,
    });
    doc.text(
      `${formatZoneHeartRate(zone, labels.noValue)}${formatZoneHeartRate(zone, labels.noValue) === labels.noValue ? "" : " bpm"}`,
      heartRateX,
      rowY + 7.1,
      { maxWidth: pageWidth - margin - heartRateX },
    );
  });

  const rowsBottom = rowStartY + zones.length * rowHeight - 1;
  const axisY = rowsBottom + 3;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.25);
  doc.line(plotX, axisY, plotX + plotWidth, axisY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.9);
  doc.setTextColor(...muted);
  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const tickX = plotX + ratio * plotWidth;
    const speed = speedMin + ratio * (speedMax - speedMin);
    doc.line(tickX, axisY, tickX, axisY + 1.4);
    doc.text(formatNumber(speed, 1), tickX, axisY + 4.2, {
      align: "center",
    });
  }
  doc.setFont("helvetica", "bold");
  doc.text("km/h", plotX + plotWidth + 3, axisY + 1.2);

  return axisY + 6;
}

function drawTargets(
  doc: AutoTableDoc,
  targets: TargetPaceCategory[],
  labels: Record<string, string>,
  language: Language,
  paceUnit: PaceUnit,
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
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.1);
    doc.setTextColor(...black);

    y =
      table(doc, {
        startY: y,
        head: [
          [
            labels.distance,
            labels.targetWindow,
            labels.targetPace,
            labels.recovery,
            labels.volume,
          ],
        ],
        body: target.times.map((time) => [
          `${time.distanceMeters}m`,
          `${formatDuration(time.timeFromSeconds)} - ${formatDuration(time.timeToSeconds)}`,
          `${formatPace(time.paceFromSecondsPerKm, paceUnit)} - ${formatPace(time.paceToSecondsPerKm, paceUnit)}`,
          formatTargetRecovery(
            time.recoverySeconds,
            time.recoveryType,
            language,
          ),
          `${formatTargetRepetitions(time.repetitionsFrom, time.repetitionsTo, language)} / ${formatTargetVolume(time.totalVolumeMetersFrom, time.totalVolumeMetersTo)}`,
        ]),
        styles: { fontSize: 7.1, cellPadding: 1.35 },
        columnStyles: {
          0: { halign: "center", cellWidth: 24 },
          1: { halign: "center", cellWidth: 36 },
          2: { halign: "center", cellWidth: 43 },
          3: { halign: "center", cellWidth: 35 },
          4: { halign: "center", cellWidth: 40 },
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
      ],
    ],
    body: input.analysis.raceEstimates.map((estimate) => [
      estimate.distanceLabel,
      formatDuration(estimate.estimatedTimeSeconds),
      formatPace(estimate.estimatedPaceSecondsPerKm, input.paceUnit),
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { halign: "center", cellWidth: 54 },
      2: { halign: "center", cellWidth: 54 },
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

function formatZonePaceCompact(
  zone: TrainingZone,
  paceUnit: PaceUnit,
): string {
  const suffix = paceUnit === "minPerMile" ? "/mi" : "/km";
  const slowPace = compactPace(zone.paceToSecondsPerKm, paceUnit);
  if (zone.paceFromSecondsPerKm === undefined) {
    return `< ${slowPace} ${suffix}`;
  }
  const fastPace = compactPace(zone.paceFromSecondsPerKm, paceUnit);
  return `${slowPace}-${fastPace} ${suffix}`;
}

function compactPace(secondsPerKm: number, paceUnit: PaceUnit): string {
  return formatPace(secondsPerKm, paceUnit).split(" ")[0];
}

function formatZoneHeartRate(zone: TrainingZone, fallback: string): string {
  if (zone.heartRateFrom !== undefined && zone.heartRateTo !== undefined)
    return `${zone.heartRateFrom}-${zone.heartRateTo}`;
  if (zone.heartRateFrom !== undefined) return `> ${zone.heartRateFrom}`;
  if (zone.heartRateTo !== undefined) return `< ${zone.heartRateTo}`;
  return fallback;
}

function zoneDisplayName(zone: TrainingZone): string {
  return zone.name.replace(/^Zone \d+\s*-\s*/i, "");
}

function zoneChartDomain(zones: TrainingZone[]): {
  speedMin: number;
  speedMax: number;
  fallbackSpan: number;
} {
  const finiteSpans = zones
    .filter((zone) => zone.speedToKmh !== undefined)
    .map((zone) =>
      Math.max(0.1, (zone.speedToKmh as number) - zone.speedFromKmh),
    );
  const fallbackSpan = finiteSpans.length
    ? finiteSpans.reduce((sum, span) => sum + span, 0) / finiteSpans.length
    : 1;
  const speedMin = Math.min(...zones.map((zone) => zone.speedFromKmh));
  const speedMax = Math.max(
    ...zones.map(
      (zone) => zone.speedToKmh ?? zone.speedFromKmh + fallbackSpan,
    ),
  );
  return { speedMin, speedMax, fallbackSpan };
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

function tintColor(color: Rgb, amount: number): Rgb {
  return color.map((channel) =>
    Math.round(channel + (255 - channel) * amount),
  ) as Rgb;
}

function contrastTextColor(color: Rgb): Rgb {
  const luminance =
    color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
  return luminance < 145 ? [255, 255, 255] : black;
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
