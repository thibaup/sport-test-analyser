import { profileLabel, t, type Language } from '../lib/i18n';
import type { ZoneProfile } from '../types/lactate';

interface TrainingProfileControlProps {
  language: Language;
  profile: ZoneProfile;
  onProfileChange: (profile: ZoneProfile) => void;
}

export function TrainingProfileControl({ language, profile, onProfileChange }: TrainingProfileControlProps) {
  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 lg:grid-cols-[240px_1fr] lg:items-start">
        <label className="field-label">
          {t(language, 'trainingProfile')}
          <select
            className="select-field"
            value={profile}
            onChange={(event) => onProfileChange(event.target.value as ZoneProfile)}
          >
            <option value="beginner">{profileLabel('beginner', language)}</option>
            <option value="intermediate">{profileLabel('intermediate', language)}</option>
            <option value="advanced">{profileLabel('advanced', language)}</option>
          </select>
        </label>
        <div className="text-sm leading-6 text-slate-600">
          <p>{t(language, 'trainingProfileIntro')}</p>
          <p className="mt-2 font-medium text-slate-800">{profileHelp(profile, language)}</p>
        </div>
      </div>
    </div>
  );
}

function profileHelp(profile: ZoneProfile, language: Language): string {
  if (profile === 'beginner') return t(language, 'trainingProfileBeginner');
  if (profile === 'advanced') return t(language, 'trainingProfileAdvanced');
  return t(language, 'trainingProfileIntermediate');
}
