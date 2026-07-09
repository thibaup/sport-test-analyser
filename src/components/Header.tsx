import { Activity, Gauge, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import { t, type Language } from '../lib/i18n';
import type { DistanceUnit, PaceUnit } from '../types/lactate';

interface HeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  paceUnit: PaceUnit;
  onPaceUnitChange: (unit: PaceUnit) => void;
  distanceUnit: DistanceUnit;
  onDistanceUnitChange: (unit: DistanceUnit) => void;
}

export function Header({
  language,
  onLanguageChange,
  paceUnit,
  onPaceUnitChange,
  distanceUnit,
  onDistanceUnitChange,
}: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsLabel = language === 'nl' ? 'Instellingen' : 'Settings';

  return (
    <header className="z-30 border-b border-slate-200 bg-white/92 backdrop-blur lg:sticky lg:top-0 print:static">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-8 lg:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm lg:h-11 lg:w-11">
              <Activity size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 sm:block">LactateLab</p>
              <h1 className="truncate text-base font-semibold tracking-normal text-slate-950 sm:text-xl lg:text-2xl">
                <span className="sm:hidden">LactateLab</span>
                <span className="hidden sm:inline">{t(language, 'appTitle')}</span>
              </h1>
            </div>
          </div>
          <button
            type="button"
            className="icon-button border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 lg:hidden"
            aria-label={settingsLabel}
            title={settingsLabel}
            aria-expanded={isSettingsOpen}
            onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
          >
            {isSettingsOpen ? <X size={18} aria-hidden="true" /> : <Settings2 size={18} aria-hidden="true" />}
          </button>
        </div>

        <div
          className={`${isSettingsOpen ? 'grid' : 'hidden'} grid-cols-2 gap-2 border-t border-slate-100 pt-3 lg:flex lg:items-center lg:border-0 lg:pt-0`}
        >
          <label className="control-label">
            {t(language, 'language')}
            <select
              className="select-field"
              value={language}
              onChange={(event) => onLanguageChange(event.target.value as Language)}
            >
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="control-label">
            {t(language, 'pace')}
            <select
              className="select-field"
              value={paceUnit}
              onChange={(event) => onPaceUnitChange(event.target.value as PaceUnit)}
            >
              <option value="minPerKm">min/km</option>
              <option value="minPerMile">min/mi</option>
            </select>
          </label>
          <label className="control-label">
            {t(language, 'distance')}
            <select
              className="select-field"
              value={distanceUnit}
              onChange={(event) => onDistanceUnitChange(event.target.value as DistanceUnit)}
            >
              <option value="km">km</option>
              <option value="mi">mi</option>
            </select>
          </label>
        </div>
      </div>
      <div className="hidden border-t border-slate-100 bg-slate-50/80 lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-xs text-slate-600 sm:px-6 lg:px-8">
          <Gauge size={15} className="text-sky-700" aria-hidden="true" />
          <span>{t(language, 'tagline')}</span>
        </div>
      </div>
    </header>
  );
}
