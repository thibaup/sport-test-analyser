import { ClipboardList, FileDown, Flag, Gauge, LineChart, Target, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AthleteInfoForm } from './components/AthleteInfoForm';
import { CombinedChart } from './components/CombinedChart';
import { ExportPanel } from './components/ExportPanel';
import { Header } from './components/Header';
import { HeartRateChart } from './components/HeartRateChart';
import { LactateChart } from './components/LactateChart';
import { RaceEstimates } from './components/RaceEstimates';
import { SummaryCards } from './components/SummaryCards';
import { TargetPaces } from './components/TargetPaces';
import { TestInputTable } from './components/TestInputTable';
import { TrainingZones } from './components/TrainingZones';
import { defaultAthleteInfo } from './data/exampleTest';
import { analyzeTest } from './lib/analysisEngine';
import { t, type Language } from './lib/i18n';
import type { AthleteInfo, DistanceUnit, PaceUnit, TestStep, ZoneProfile } from './types/lactate';

type TabId = 'input' | 'overview' | 'charts' | 'zones' | 'targets' | 'race' | 'export';

const tabs: Array<{ id: TabId; labelKey: Parameters<typeof t>[1]; icon: typeof Gauge }> = [
  { id: 'input', labelKey: 'input', icon: ClipboardList },
  { id: 'overview', labelKey: 'overview', icon: Gauge },
  { id: 'charts', labelKey: 'charts', icon: LineChart },
  { id: 'zones', labelKey: 'zones', icon: Waves },
  { id: 'targets', labelKey: 'targets', icon: Target },
  { id: 'race', labelKey: 'race', icon: Flag },
  { id: 'export', labelKey: 'export', icon: FileDown },
];

function App() {
  const [athleteInfo, setAthleteInfo] = useState<AthleteInfo>(defaultAthleteInfo);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [profile, setProfile] = useState<ZoneProfile>('intermediate');
  const [paceUnit, setPaceUnit] = useState<PaceUnit>('minPerKm');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [activeTab, setActiveTab] = useState<TabId>('input');
  const [language, setLanguage] = useState<Language>('nl');

  const analysis = useMemo(() => analyzeTest(steps, 'modifiedDmax', profile), [steps, profile]);

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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm print:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'nav-tab-active' : 'nav-tab'}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} aria-hidden="true" />
                {t(language, tab.labelKey)}
              </button>
            );
          })}
        </nav>

        {activeTab === 'input' && (
          <TestInputTable
            steps={steps}
            onChange={setSteps}
            quality={analysis.quality}
            paceUnit={paceUnit}
            distanceUnit={distanceUnit}
            language={language}
          />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-5">
            <AthleteInfoForm athleteInfo={athleteInfo} onChange={setAthleteInfo} language={language} />
            <SummaryCards analysis={analysis} paceUnit={paceUnit} language={language} />
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <LactateChart analysis={analysis} language={language} />
            </div>
            <HeartRateChart analysis={analysis} language={language} />
            <CombinedChart analysis={analysis} language={language} />
          </div>
        )}

        {activeTab === 'zones' && <TrainingZones analysis={analysis} paceUnit={paceUnit} language={language} />}
        {activeTab === 'targets' && (
          <TargetPaces
            analysis={analysis}
            paceUnit={paceUnit}
            language={language}
            profile={profile}
            onProfileChange={setProfile}
          />
        )}
        {activeTab === 'race' && <RaceEstimates analysis={analysis} paceUnit={paceUnit} language={language} />}
        {activeTab === 'export' && (
          <ExportPanel
            athleteInfo={athleteInfo}
            steps={steps}
            analysis={analysis}
            paceUnit={paceUnit}
            distanceUnit={distanceUnit}
            profile={profile}
            language={language}
          />
        )}
      </main>
    </div>
  );
}

export default App;
