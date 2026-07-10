import {
  ClipboardList,
  FileDown,
  Flag,
  Gauge,
  LineChart,
  Target,
  Waves,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AthleteInfoForm } from "./components/AthleteInfoForm";
import { CombinedChart } from "./components/CombinedChart";
import { ExportPanel } from "./components/ExportPanel";
import { Header } from "./components/Header";
import { RaceEstimates } from "./components/RaceEstimates";
import { RaceTimeInputTable } from "./components/RaceTimeInputTable";
import { SummaryCards } from "./components/SummaryCards";
import { TargetPaces } from "./components/TargetPaces";
import { TestInputTable } from "./components/TestInputTable";
import { TrainingZones } from "./components/TrainingZones";
import {
  defaultAthleteInfo,
  defaultMaxLactateTest,
  defaultThresholdControls,
} from "./data/exampleTest";
import { analyzeTest } from "./lib/analysisEngine";
import { t, type Language } from "./lib/i18n";
import {
  applyTimeOverrides,
  createEmptyTimeOverrides,
  updateRaceTimeOverride,
  updateTargetOverride,
} from "./lib/timeOverrides";
import type {
  AnalysisTimeOverrides,
  AthleteInfo,
  DistanceUnit,
  MaxLactateTest,
  PaceUnit,
  RaceTime,
  TestStep,
  ThresholdControls,
  ZoneCount,
} from "./types/lactate";

type TabId =
  "input" | "overview" | "charts" | "zones" | "targets" | "race" | "export";

const tabs: Array<{
  id: TabId;
  labelKey: Parameters<typeof t>[1];
  icon: typeof Gauge;
}> = [
  { id: "input", labelKey: "input", icon: ClipboardList },
  { id: "charts", labelKey: "charts", icon: LineChart },
  { id: "overview", labelKey: "overview", icon: Gauge },
  { id: "zones", labelKey: "zones", icon: Waves },
  { id: "targets", labelKey: "targets", icon: Target },
  { id: "race", labelKey: "race", icon: Flag },
  { id: "export", labelKey: "export", icon: FileDown },
];

function App() {
  const [athleteInfo, setAthleteInfo] =
    useState<AthleteInfo>(defaultAthleteInfo);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [maxLactateTest, setMaxLactateTest] = useState<MaxLactateTest>(
    defaultMaxLactateTest,
  );
  const [raceTimes, setRaceTimes] = useState<RaceTime[]>([]);
  const [thresholdControls, setThresholdControls] = useState<ThresholdControls>(
    defaultThresholdControls,
  );
  const profile = "advanced" as const;
  const [zoneCount, setZoneCount] = useState<ZoneCount>(7);
  const [paceUnit, setPaceUnit] = useState<PaceUnit>("minPerKm");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("km");
  const [activeTab, setActiveTab] = useState<TabId>("input");
  const [language, setLanguage] = useState<Language>("nl");
  const [timeOverrides, setTimeOverrides] = useState<AnalysisTimeOverrides>(
    createEmptyTimeOverrides,
  );

  const calculatedAnalysis = useMemo(
    () =>
      analyzeTest(
        steps,
        thresholdControls,
        profile,
        raceTimes,
        maxLactateTest,
        zoneCount,
        athleteInfo.maxHeartRate,
      ),
    [
      steps,
      thresholdControls,
      profile,
      raceTimes,
      maxLactateTest,
      zoneCount,
      athleteInfo.maxHeartRate,
    ],
  );

  const analysis = useMemo(
    () => applyTimeOverrides(calculatedAnalysis, timeOverrides),
    [calculatedAnalysis, timeOverrides],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        language={language}
        onLanguageChange={setLanguage}
        paceUnit={paceUnit}
        onPaceUnitChange={setPaceUnit}
        distanceUnit={distanceUnit}
        onDistanceUnitChange={setDistanceUnit}
      />

      <main
        className={`mx-auto px-4 py-6 sm:px-6 lg:px-8 ${
          activeTab === "charts" ? "max-w-[96rem]" : "max-w-7xl"
        }`}
      >
        <nav className="mx-auto mb-5 grid max-w-7xl grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm print:hidden sm:flex sm:overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`${activeTab === tab.id ? "nav-tab-active" : "nav-tab"} min-w-0 flex-col gap-1 px-2 text-[11px] leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:text-sm`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} aria-hidden="true" />
                {t(language, tab.labelKey)}
              </button>
            );
          })}
        </nav>

        {activeTab === "input" && (
          <div className="space-y-5">
            <AthleteInfoForm
              athleteInfo={athleteInfo}
              onChange={setAthleteInfo}
              language={language}
            />
            <TestInputTable
              steps={steps}
              onChange={setSteps}
              paceUnit={paceUnit}
              distanceUnit={distanceUnit}
              language={language}
              maxLactateTest={maxLactateTest}
              onMaxLactateChange={setMaxLactateTest}
            />
            <RaceTimeInputTable
              raceTimes={raceTimes}
              onChange={setRaceTimes}
              language={language}
            />
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-5">
            <SummaryCards
              analysis={analysis}
              paceUnit={paceUnit}
              language={language}
            />
          </div>
        )}

        {activeTab === "charts" && (
          <CombinedChart
            analysis={analysis}
            language={language}
            thresholdControls={thresholdControls}
            onThresholdControlsChange={setThresholdControls}
          />
        )}

        {activeTab === "zones" && (
          <TrainingZones
            analysis={analysis}
            paceUnit={paceUnit}
            language={language}
            zoneCount={zoneCount}
            onZoneCountChange={setZoneCount}
          />
        )}
        {activeTab === "targets" && (
          <TargetPaces
            analysis={analysis}
            paceUnit={paceUnit}
            language={language}
            onValueChange={(targetId, distanceMeters, property, value) => {
              const calculatedValue = calculatedAnalysis.targets
                .find((target) => target.id === targetId)
                ?.times.find(
                  (time) => time.distanceMeters === distanceMeters,
                )?.[property];
              setTimeOverrides((current) =>
                updateTargetOverride(
                  current,
                  targetId,
                  distanceMeters,
                  property,
                  value,
                  calculatedValue,
                ),
              );
            }}
          />
        )}
        {activeTab === "race" && (
          <RaceEstimates
            analysis={analysis}
            paceUnit={paceUnit}
            language={language}
            onTimeChange={(distanceMeters, seconds) => {
              const calculatedSeconds = calculatedAnalysis.raceEstimates.find(
                (estimate) => estimate.distanceMeters === distanceMeters,
              )?.estimatedTimeSeconds;
              setTimeOverrides((current) =>
                updateRaceTimeOverride(
                  current,
                  distanceMeters,
                  seconds,
                  calculatedSeconds,
                ),
              );
            }}
          />
        )}
        {activeTab === "export" && (
          <ExportPanel
            athleteInfo={athleteInfo}
            onAthleteInfoChange={setAthleteInfo}
            steps={steps}
            maxLactateTest={maxLactateTest}
            raceTimes={raceTimes}
            analysis={analysis}
            paceUnit={paceUnit}
            distanceUnit={distanceUnit}
            profile={profile}
            zoneCount={zoneCount}
            language={language}
          />
        )}
      </main>
    </div>
  );
}

export default App;
