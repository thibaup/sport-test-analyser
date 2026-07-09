import { formatPace, formatRange } from "../lib/conversions";
import { localizeZone, t, type Language } from "../lib/i18n";
import type {
  AppAnalysis,
  PaceUnit,
  TrainingZone,
  ZoneCount,
} from "../types/lactate";

interface TrainingZonesProps {
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  language: Language;
  zoneCount: ZoneCount;
  onZoneCountChange: (zoneCount: ZoneCount) => void;
}

export function TrainingZones({
  analysis,
  paceUnit,
  language,
  zoneCount,
  onZoneCountChange,
}: TrainingZonesProps) {
  const zones = analysis.zones.map((zone) => localizeZone(zone, language));
  if (zones.length === 0) {
    return (
      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t(language, "trainingZonesEyebrow")}</p>
            <h2>{t(language, "trainingZonesTitle")}</h2>
          </div>
          <ZoneCountControl
            language={language}
            zoneCount={zoneCount}
            onChange={onZoneCountChange}
          />
        </div>
        <p className="empty-state">{t(language, "zonesNeedData")}</p>
      </section>
    );
  }

  const displaySegments = createDisplaySegments(zones);
  const minSpeed = Math.min(...zones.map((zone) => zone.speedFromKmh));
  const maxSpeed = Math.max(...displaySegments.map((segment) => segment.to));
  const span = maxSpeed - minSpeed;

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, "trainingZonesEyebrow")}</p>
          <h2>{t(language, "trainingZonesTitle")}</h2>
        </div>
        <ZoneCountControl
          language={language}
          zoneCount={zoneCount}
          onChange={onZoneCountChange}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-12 overflow-hidden rounded-lg">
          {zones.map((zone, index) => (
            <div
              key={zone.id}
              className="flex min-w-14 items-center justify-center px-2 text-[11px] font-bold text-white"
              style={{
                width: `${Math.max(7, ((displaySegments[index].to - zone.speedFromKmh) / span) * 100)}%`,
                background: zone.color,
              }}
              title={`${zone.name}: ${formatSpeedRange(zone)}`}
            >
              {zone.shortName ?? `Z${index + 1}`}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>{minSpeed.toFixed(1)} km/h</span>
          <span>{maxSpeed.toFixed(1)} km/h</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {zones.map((zone) => (
          <article key={zone.id} className="zone-card">
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                style={{ background: zone.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-950">
                    {zone.name}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {zone.intensity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{zone.purpose}</p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="zone-label">{t(language, "speed")}</dt>
                    <dd className="zone-value">{formatSpeedRange(zone)}</dd>
                  </div>
                  <div>
                    <dt className="zone-label">{t(language, "pace")}</dt>
                    <dd className="zone-value">
                      {formatPaceRange(zone, paceUnit, language)}
                    </dd>
                  </div>
                  <div>
                    <dt className="zone-label">
                      {t(language, "heartRateLabel")}
                    </dt>
                    <dd className="zone-value">
                      {formatHeartRateRange(zone, language)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ZoneCountControl({
  language,
  zoneCount,
  onChange,
}: {
  language: Language;
  zoneCount: ZoneCount;
  onChange: (zoneCount: ZoneCount) => void;
}) {
  return (
    <label className="control-label min-w-40">
      {t(language, "zoneSystem")}
      <select
        className="select-field"
        value={zoneCount}
        onChange={(event) => onChange(Number(event.target.value) as ZoneCount)}
      >
        <option value={5}>{t(language, "zoneSystem5")}</option>
        <option value={7}>{t(language, "zoneSystem7")}</option>
      </select>
    </label>
  );
}

function createDisplaySegments(zones: TrainingZone[]): Array<{ to: number }> {
  const finiteSpans = zones
    .filter((zone) => zone.speedToKmh !== undefined)
    .map((zone) =>
      Math.max(0.1, (zone.speedToKmh as number) - zone.speedFromKmh),
    );
  const fallbackSpan = finiteSpans.length
    ? finiteSpans.reduce((sum, value) => sum + value, 0) / finiteSpans.length
    : 1;
  return zones.map((zone) => ({
    to: zone.speedToKmh ?? zone.speedFromKmh + fallbackSpan,
  }));
}

function formatSpeedRange(zone: TrainingZone): string {
  if (zone.speedToKmh === undefined)
    return `> ${zone.speedFromKmh.toFixed(1)} km/h`;
  return formatRange(zone.speedFromKmh, zone.speedToKmh, " km/h", 1);
}

function formatPaceRange(
  zone: TrainingZone,
  paceUnit: PaceUnit,
  language: Language,
): string {
  if (zone.paceFromSecondsPerKm === undefined) {
    const label = language === "nl" ? "sneller dan" : "faster than";
    return `${label} ${formatPace(zone.paceToSecondsPerKm, paceUnit)}`;
  }
  return `${formatPace(zone.paceFromSecondsPerKm, paceUnit)} - ${formatPace(zone.paceToSecondsPerKm, paceUnit)}`;
}

function formatHeartRateRange(zone: TrainingZone, language: Language): string {
  if (
    zone.heartRateFrom !== undefined &&
    zone.heartRateFrom === zone.heartRateTo
  ) {
    return `${zone.heartRateFrom} bpm`;
  }
  if (zone.heartRateFrom !== undefined && zone.heartRateTo !== undefined)
    return `${zone.heartRateFrom}-${zone.heartRateTo} bpm`;
  if (zone.shortName === "NMR" && zone.heartRateFrom !== undefined)
    return `>= ${zone.heartRateFrom} bpm`;
  if (zone.heartRateFrom !== undefined) return `> ${zone.heartRateFrom} bpm`;
  if (zone.heartRateTo !== undefined) return `< ${zone.heartRateTo} bpm`;
  return t(language, "unavailable");
}
