import { useMemo, useState } from "react";
import {
  formatDuration,
  formatPace,
  formatRange,
  round,
} from "../lib/conversions";
import { localizeTarget, t, type Language } from "../lib/i18n";
import type {
  AppAnalysis,
  PaceUnit,
  TargetPaceCategory,
  TargetRecoveryType,
} from "../types/lactate";

interface TargetPacesProps {
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  language: Language;
}

export function TargetPaces({
  analysis,
  paceUnit,
  language,
}: TargetPacesProps) {
  const [activeId, setActiveId] = useState<string>("");
  const categories = analysis.targets.map((target) =>
    localizeTarget(target, language),
  );
  const active = useMemo<TargetPaceCategory | undefined>(() => {
    return (
      categories.find((category) => category.id === activeId) ?? categories[0]
    );
  }, [activeId, categories]);

  if (categories.length === 0 || !active) {
    return (
      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t(language, "targetsEyebrow")}</p>
            <h2>{t(language, "targetsTitle")}</h2>
          </div>
        </div>
        <p className="empty-state">{t(language, "targetsNeedData")}</p>
      </section>
    );
  }

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, "targetsEyebrow")}</p>
          <h2>{t(language, "targetsTitle")}</h2>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveId(category.id)}
            className={
              category.id === active.id
                ? "tab-button-active whitespace-nowrap"
                : "tab-button whitespace-nowrap"
            }
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.8fr]">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-slate-950">
            {active.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {active.purpose}
          </p>
          <dl className="mt-5 grid gap-4">
            <div>
              <dt className="zone-label">{t(language, "speedRange")}</dt>
              <dd className="zone-value">
                {formatRange(
                  active.speedFromKmh,
                  active.speedToKmh,
                  " km/h",
                  1,
                )}
              </dd>
            </div>
            <div>
              <dt className="zone-label">{t(language, "paceRange")}</dt>
              <dd className="zone-value">
                {formatPace(active.paceFromSecondsPerKm, paceUnit)} -{" "}
                {formatPace(active.paceToSecondsPerKm, paceUnit)}
              </dd>
            </div>
          </dl>
        </article>

        <div className="space-y-3 md:hidden">
          {active.times.map((time) => (
            <article
              key={time.distanceMeters}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-950">
                    {time.distanceMeters} m
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {formatDuration(time.timeFromSeconds)} -{" "}
                    {formatDuration(time.timeToSeconds)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {formatRepetitions(
                    time.repetitionsFrom,
                    time.repetitionsTo,
                    language,
                  )}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <dt className="zone-label">{t(language, "targetSpeed")}</dt>
                  <dd className="zone-value">
                    {formatRange(
                      time.speedFromKmh,
                      time.speedToKmh,
                      " km/h",
                      1,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="zone-label">{t(language, "targetPace")}</dt>
                  <dd className="zone-value">
                    {formatPace(time.paceFromSecondsPerKm, paceUnit)} -{" "}
                    {formatPace(time.paceToSecondsPerKm, paceUnit)}
                  </dd>
                </div>
                <div>
                  <dt className="zone-label">{t(language, "recovery")}</dt>
                  <dd className="zone-value">
                    {formatRecovery(
                      time.recoverySeconds,
                      time.recoveryType,
                      language,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="zone-label">{t(language, "totalVolume")}</dt>
                  <dd className="zone-value">
                    {formatVolume(
                      time.totalVolumeMetersFrom,
                      time.totalVolumeMetersTo,
                      language,
                    )}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {time.explanation}
              </p>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
          <table className="data-table min-w-[1080px] border-0">
            <thead>
              <tr>
                <th>{t(language, "distance")}</th>
                <th>{t(language, "targetWindow")}</th>
                <th>{t(language, "targetSpeed")}</th>
                <th>{t(language, "targetPace")}</th>
                <th>{t(language, "repetitions")}</th>
                <th>{t(language, "recovery")}</th>
                <th>{t(language, "totalVolume")}</th>
                <th>{t(language, "usefulFor")}</th>
              </tr>
            </thead>
            <tbody>
              {active.times.map((time) => (
                <tr key={time.distanceMeters}>
                  <td className="font-semibold text-slate-950">
                    {time.distanceMeters} m
                  </td>
                  <td className="whitespace-nowrap">
                    {formatDuration(time.timeFromSeconds)} -{" "}
                    {formatDuration(time.timeToSeconds)}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatRange(
                      time.speedFromKmh,
                      time.speedToKmh,
                      " km/h",
                      1,
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatPace(time.paceFromSecondsPerKm, paceUnit)} -{" "}
                    {formatPace(time.paceToSecondsPerKm, paceUnit)}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatRepetitions(
                      time.repetitionsFrom,
                      time.repetitionsTo,
                      language,
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatRecovery(
                      time.recoverySeconds,
                      time.recoveryType,
                      language,
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatVolume(
                      time.totalVolumeMetersFrom,
                      time.totalVolumeMetersTo,
                      language,
                    )}
                  </td>
                  <td className="min-w-72 text-slate-600">
                    {time.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function formatRepetitions(
  from: number,
  to: number,
  language: Language,
): string {
  const noun = language === "nl" ? "herh." : "reps";
  return from === to ? `${from} ${noun}` : `${from}-${to} ${noun}`;
}

function formatRecovery(
  seconds: number,
  type: TargetRecoveryType,
  language: Language,
): string {
  const label = recoveryTypeLabel(type, language);
  return `${formatDuration(seconds)} ${label}`;
}

function formatVolume(
  fromMeters: number,
  toMeters: number,
  language: Language,
): string {
  const fromKm = round(fromMeters / 1000, fromMeters < 1000 ? 2 : 1);
  const toKm = round(toMeters / 1000, toMeters < 1000 ? 2 : 1);
  const separator = language === "nl" ? "-" : "-";
  return fromKm === toKm ? `${fromKm} km` : `${fromKm}${separator}${toKm} km`;
}

function recoveryTypeLabel(
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
  return labels[type][language];
}
