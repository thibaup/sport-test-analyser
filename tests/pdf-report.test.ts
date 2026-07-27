import { describe, expect, it } from "vitest";
import {
  exampleMaxLactateTest,
  exampleRaceTimes,
  exampleTestSteps,
} from "../src/data/exampleTest";
import { analyzeTest } from "../src/lib/analysisEngine";
import { buildPdfReport } from "../src/lib/pdfReport";
import type {
  PaceUnit,
  ThresholdControls,
  ZoneCount,
} from "../src/types/lactate";

const thresholdControls: ThresholdControls = {
  aerobicMethod: "baseline",
  anaerobicMethod: "fixed_4",
  manualTarget: "aerobic",
};

describe("PDF training-zone range chart", () => {
  it.each([
    {
      zoneCount: 5 as ZoneCount,
      language: "en" as const,
      paceUnit: "minPerMile" as PaceUnit,
      systemLabel: "5-ZONE SYSTEM",
      finalZoneLabel: "Z5  VO2",
    },
    {
      zoneCount: 7 as ZoneCount,
      language: "nl" as const,
      paceUnit: "minPerKm" as PaceUnit,
      systemLabel: "7-ZONESYSTEEM",
      finalZoneLabel: "Z7  NMR",
    },
  ])(
    "renders every range for the selected $zoneCount-zone system",
    async ({
      zoneCount,
      language,
      paceUnit,
      systemLabel,
      finalZoneLabel,
    }) => {
      const analysis = analyzeTest(
        exampleTestSteps,
        thresholdControls,
        "intermediate",
        exampleRaceTimes,
        exampleMaxLactateTest,
        zoneCount,
      );
      const doc = await buildPdfReport({
        athleteInfo: {
          athleteName: "PDF test",
          testDate: "2026-07-26",
          coachName: "",
          maxHeartRate: 198,
          protocol: "",
          coachRemarks: "",
        },
        steps: exampleTestSteps,
        maxLactateTest: exampleMaxLactateTest,
        raceTimes: exampleRaceTimes,
        analysis,
        paceUnit,
        distanceUnit: "km",
        profile: "intermediate",
        zoneCount,
        language,
      });
      const pdf = doc.output();

      expect(analysis.zones).toHaveLength(zoneCount);
      expect(pdf).toContain(systemLabel);
      expect(pdf).toContain(finalZoneLabel);
      expect(pdf).toContain("122-169 bpm");
      expect(pdf).toContain(paceUnit === "minPerMile" ? "/mi" : "/km");
    },
  );
});
