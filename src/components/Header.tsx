import { Activity, Gauge } from 'lucide-react';
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
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur print:static">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
            <Activity size={23} aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">LactateLab</p>
            <h1 className="text-xl font-semibold tracking-normal text-slate-950 sm:text-2xl">
              {t(language, 'appTitle')}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
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
      <div className="border-t border-slate-100 bg-slate-50/80">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-xs text-slate-600 sm:px-6 lg:px-8">
          <Gauge size={15} className="text-sky-700" aria-hidden="true" />
          <span>{t(language, 'tagline')}</span>
        </div>
      </div>
    </header>
  );
}
