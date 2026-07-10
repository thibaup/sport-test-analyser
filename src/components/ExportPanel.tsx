import { ClipboardCopy, Download, FileJson, FileText } from "lucide-react";
import { useState } from "react";
import { formatPace, formatSpeed } from "../lib/conversions";
import { t, type Language } from "../lib/i18n";
import { exportPdfReport } from "../lib/pdfReport";
import type {
  AppAnalysis,
  AthleteInfo,
  DistanceUnit,
  MaxLactateTest,
  PaceUnit,
  RaceTime,
  TestStep,
  ZoneCount,
  ZoneProfile,
} from "../types/lactate";

interface ExportPanelProps {
  athleteInfo: AthleteInfo;
  onAthleteInfoChange: (athleteInfo: AthleteInfo) => void;
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

export function ExportPanel({
  athleteInfo,
  onAthleteInfoChange,
  steps,
  maxLactateTest,
  raceTimes,
  analysis,
  paceUnit,
  distanceUnit,
  profile,
  zoneCount,
  language,
}: ExportPanelProps) {
  const [status, setStatus] = useState("");

  const exportJson = () => {
    downloadFile(
      "lactate-analysis.json",
      JSON.stringify(
        {
          athleteInfo,
          steps,
          maxLactateTest,
          raceTimes,
          zoneCount,
          results: publicResults(analysis),
        },
        null,
        2,
      ),
      "application/json",
    );
    setStatus(t(language, "jsonExported"));
  };

  const exportCsv = () => {
    downloadFile(
      "lactate-analysis.csv",
      toCsv(steps, maxLactateTest, raceTimes, zoneCount, analysis),
      "text/csv",
    );
    setStatus(t(language, "csvExported"));
  };

  const copySummary = async () => {
    const summary = buildSummary(athleteInfo, analysis, paceUnit, language);
    await navigator.clipboard.writeText(summary);
    setStatus(t(language, "summaryCopied"));
  };

  const exportPdf = async () => {
    await exportPdfReport({
      athleteInfo,
      steps,
      maxLactateTest,
      raceTimes,
      analysis,
      paceUnit,
      distanceUnit,
      profile,
      zoneCount,
      language,
    });
    setStatus(t(language, "pdfExported"));
  };

  return (
    <section id="export" className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, "exportEyebrow")}</p>
          <h2>{t(language, "exportTitle")}</h2>
        </div>
      </div>
      <label className="field-label mb-5">
        {t(language, "coachRemarks")}
        <textarea
          className="text-field min-h-24"
          value={athleteInfo.coachRemarks}
          onChange={(event) =>
            onAthleteInfoChange({
              ...athleteInfo,
              coachRemarks: event.target.value,
            })
          }
          placeholder={t(language, "coachRemarksPlaceholder")}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button className="export-button" type="button" onClick={exportPdf}>
          <FileText size={20} aria-hidden="true" />
          {t(language, "exportPdf")}
        </button>
        <button className="export-button" type="button" onClick={exportJson}>
          <FileJson size={20} aria-hidden="true" />
          {t(language, "exportJson")}
        </button>
        <button className="export-button" type="button" onClick={exportCsv}>
          <Download size={20} aria-hidden="true" />
          {t(language, "exportCsv")}
        </button>
        <button className="export-button" type="button" onClick={copySummary}>
          <ClipboardCopy size={20} aria-hidden="true" />
          {t(language, "copySummary")}
        </button>
      </div>
      {status && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          {status}
        </p>
      )}
    </section>
  );
}

function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(
  steps: TestStep[],
  maxLactateTest: MaxLactateTest,
  raceTimes: RaceTime[],
  zoneCount: ZoneCount,
  analysis: AppAnalysis,
): string {
  const rows = [
    [
      "section",
      "step",
      "distance_km",
      "speed_kmh",
      "pace_sec_per_km",
      "duration_sec",
      "lactate",
      "heart_rate",
      "rpe",
      "note",
    ],
    ...steps.map((step) => [
      "input",
      step.step,
      step.distanceKm ?? "",
      step.speedKmh ?? "",
      step.paceSecondsPerKm ?? "",
      step.durationSeconds ?? "",
      step.lactate ?? "",
      step.heartRate ?? "",
      step.rpe ?? "",
      step.note ?? "",
    ]),
    [
      "all_out_max_lactate",
      "",
      maxLactateTest.distanceMeters ? maxLactateTest.distanceMeters / 1000 : "",
      "",
      "",
      maxLactateTest.timeSeconds ?? "",
      maxLactateTest.lactate ?? "",
      maxLactateTest.heartRate ?? "",
      "",
      "",
    ],
    ...raceTimes.map((raceTime) => [
      "race_time",
      "",
      raceTime.distanceMeters ? raceTime.distanceMeters / 1000 : "",
      "",
      "",
      raceTime.timeSeconds ?? "",
      "",
      "",
      "",
      raceTime.note ?? "",
    ]),
    ["zone_system", "", "", "", "", "", "", "", "", `${zoneCount} zones`],
    [
      "aerobic_threshold",
      "",
      "",
      analysis.selectedThresholds.aerobic?.speedKmh ?? "",
      analysis.selectedThresholds.aerobic?.paceSecondsPerKm ?? "",
      "",
      analysis.selectedThresholds.aerobic?.lactate ?? "",
      analysis.selectedThresholds.aerobic?.heartRate ?? "",
      "",
      "",
    ],
    [
      "anaerobic_threshold",
      "",
      "",
      analysis.selectedThresholds.anaerobic?.speedKmh ?? "",
      analysis.selectedThresholds.anaerobic?.paceSecondsPerKm ?? "",
      "",
      analysis.selectedThresholds.anaerobic?.lactate ?? "",
      analysis.selectedThresholds.anaerobic?.heartRate ?? "",
      "",
      "",
    ],
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildSummary(
  athleteInfo: AthleteInfo,
  analysis: AppAnalysis,
  paceUnit: PaceUnit,
  language: Language,
): string {
  const aerobic = analysis.selectedThresholds.aerobic;
  const anaerobic = analysis.selectedThresholds.anaerobic;
  return [
    `${t(language, "lactateAnalysis")}: ${athleteInfo.athleteName || t(language, "unnamedRunner")}`,
    `${t(language, "aerobicThreshold")}: ${formatSpeed(aerobic?.speedKmh)} (${formatPace(aerobic?.paceSecondsPerKm, paceUnit)}), ${aerobic?.heartRate ?? "-"} bpm, ${aerobic?.lactate ?? "-"} mmol/L`,
    `${t(language, "anaerobicThreshold")}: ${formatSpeed(anaerobic?.speedKmh)} (${formatPace(anaerobic?.paceSecondsPerKm, paceUnit)}), ${anaerobic?.heartRate ?? "-"} bpm, ${anaerobic?.lactate ?? "-"} mmol/L`,
    `${t(language, "generatedZones")}: ${analysis.zones.length}`,
  ].join("\n");
}

function publicResults(analysis: AppAnalysis) {
  return {
    aerobicThreshold: stripThreshold(analysis.selectedThresholds.aerobic),
    anaerobicThreshold: stripThreshold(analysis.selectedThresholds.anaerobic),
    zones: analysis.zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      purpose: zone.purpose,
      speedFromKmh: zone.speedFromKmh,
      speedToKmh: zone.speedToKmh,
      paceFromSecondsPerKm: zone.paceFromSecondsPerKm,
      paceToSecondsPerKm: zone.paceToSecondsPerKm,
      heartRateFrom: zone.heartRateFrom,
      heartRateTo: zone.heartRateTo,
      intensity: zone.intensity,
    })),
    targets: analysis.targets.map((target) => ({
      id: target.id,
      name: target.name,
      purpose: target.purpose,
      paceFromSecondsPerKm: target.paceFromSecondsPerKm,
      paceToSecondsPerKm: target.paceToSecondsPerKm,
      recovery: target.recovery,
      repetitions: target.repetitions,
      totalVolume: target.totalVolume,
      times: target.times.map((time) => ({
        distanceMeters: time.distanceMeters,
        timeFromSeconds: time.timeFromSeconds,
        timeToSeconds: time.timeToSeconds,
        paceFromSecondsPerKm: time.paceFromSecondsPerKm,
        paceToSecondsPerKm: time.paceToSecondsPerKm,
        repetitionsFrom: time.repetitionsFrom,
        repetitionsTo: time.repetitionsTo,
        recoverySeconds: time.recoverySeconds,
        recoveryType: time.recoveryType,
        totalVolumeMetersFrom: time.totalVolumeMetersFrom,
        totalVolumeMetersTo: time.totalVolumeMetersTo,
        explanation: time.explanation,
        formula: time.formula,
      })),
    })),
    raceEstimates: analysis.raceEstimates.map((estimate) => ({
      distanceLabel: estimate.distanceLabel,
      distanceMeters: estimate.distanceMeters,
      estimatedTimeSeconds: estimate.estimatedTimeSeconds,
      estimatedPaceSecondsPerKm: estimate.estimatedPaceSecondsPerKm,
      source: estimate.source,
      method: estimate.method,
    })),
    maxLactate: analysis.maxLactate,
  };
}

function stripThreshold(
  threshold: AppAnalysis["selectedThresholds"]["aerobic"],
) {
  if (!threshold) return undefined;
  return {
    type: threshold.type,
    speedKmh: threshold.speedKmh,
    paceSecondsPerKm: threshold.paceSecondsPerKm,
    lactate: threshold.lactate,
    heartRate: threshold.heartRate,
    insufficientReason: threshold.insufficientReason,
  };
}
