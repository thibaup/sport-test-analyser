import { t, type Language } from '../lib/i18n';
import type { AthleteInfo } from '../types/lactate';

interface AthleteInfoFormProps {
  athleteInfo: AthleteInfo;
  onChange: (athleteInfo: AthleteInfo) => void;
  language: Language;
}

export function AthleteInfoForm({ athleteInfo, onChange, language }: AthleteInfoFormProps) {
  const update = (key: keyof AthleteInfo, value: string) => {
    onChange({ ...athleteInfo, [key]: value });
  };

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'testProfile')}</p>
          <h2>{t(language, 'athleteProtocol')}</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="field-label">
          {t(language, 'athlete')}
          <input
            className="text-field"
            value={athleteInfo.athleteName}
            onChange={(event) => update('athleteName', event.target.value)}
            placeholder={t(language, 'runnerName')}
          />
        </label>
        <label className="field-label">
          {t(language, 'testDate')}
          <input
            className="text-field"
            type="date"
            value={athleteInfo.testDate}
            onChange={(event) => update('testDate', event.target.value)}
          />
        </label>
        <label className="field-label">
          {t(language, 'coach')}
          <input
            className="text-field"
            value={athleteInfo.coachName}
            onChange={(event) => update('coachName', event.target.value)}
            placeholder={t(language, 'coachOrLab')}
          />
        </label>
        <label className="field-label">
          {t(language, 'protocol')}
          <input
            className="text-field"
            value={athleteInfo.protocol}
            onChange={(event) => update('protocol', event.target.value)}
            placeholder={t(language, 'protocolPlaceholder')}
          />
        </label>
      </div>
      <label className="field-label mt-4">
        {t(language, 'notes')}
        <textarea
          className="text-field min-h-20"
          value={athleteInfo.notes}
          onChange={(event) => update('notes', event.target.value)}
          placeholder={t(language, 'notesPlaceholder')}
        />
      </label>
    </section>
  );
}
