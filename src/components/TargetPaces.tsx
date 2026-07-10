import { useMemo, useState } from "react";
import { formatPace, round } from "../lib/conversions";
import { localizeTarget, t, type Language } from "../lib/i18n";
import type {
  AppAnalysis,
  PaceUnit,
  TargetDistanceTime,
  TargetPaceCategory,
  TargetRecoveryType,
  TargetTimeOverride,
} from "../types/lactate";
import { EditableDuration } from "./EditableDuration";
import { EditableNumber } from "./EditableNumber";

type TargetEditHandler = (
  targetId: string,
  distanceMeters: number,
  property: keyof TargetTimeOverride,
  value: number | undefined,
) => void;

interface TargetPacesProps {
  analysis: AppAnalysis;
  paceUnit: PaceUnit;
  language: Language;
  onValueChange: TargetEditHandler;
}

export function TargetPaces({
  analysis,
  paceUnit,
  language,
  onValueChange,
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
              <div>
                <div>
                  <p className="text-base font-semibold text-slate-950">
                    {time.distanceMeters} m
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-slate-400">
                    <EditableDuration
                      seconds={time.timeFromSeconds}
                      isCustom={time.timeFromOverridden}
                      label={`${active.name} ${time.distanceMeters} m ${t(language, "fastEnd")}`}
                      language={language}
                      testId={`target-time-mobile-${active.id}-${time.distanceMeters}-from`}
                      onChange={(seconds) =>
                        onValueChange(
                          active.id,
                          time.distanceMeters,
                          "timeFromSeconds",
                          seconds,
                        )
                      }
                    />
                    <span aria-hidden="true">-</span>
                    <EditableDuration
                      seconds={time.timeToSeconds}
                      isCustom={time.timeToOverridden}
                      label={`${active.name} ${time.distanceMeters} m ${t(language, "controlledEnd")}`}
                      language={language}
                      testId={`target-time-mobile-${active.id}-${time.distanceMeters}-to`}
                      onChange={(seconds) =>
                        onValueChange(
                          active.id,
                          time.distanceMeters,
                          "timeToSeconds",
                          seconds,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <dt className="zone-label">{t(language, "targetPace")}</dt>
                  <dd className="zone-value">
                    {formatPace(time.paceFromSecondsPerKm, paceUnit)} -{" "}
                    {formatPace(time.paceToSecondsPerKm, paceUnit)}
                  </dd>
                </div>
                <div>
                  <dt className="zone-label">{t(language, "repetitions")}</dt>
                  <dd className="zone-value">
                    <EditableRepetitions
                      targetId={active.id}
                      targetName={active.name}
                      time={time}
                      language={language}
                      context="mobile"
                      onChange={onValueChange}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="zone-label">{t(language, "recovery")}</dt>
                  <dd className="zone-value">
                    <EditableRecovery
                      targetId={active.id}
                      targetName={active.name}
                      time={time}
                      language={language}
                      context="mobile"
                      onChange={onValueChange}
                    />
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
          <table className="data-table min-w-[940px] border-0">
            <thead>
              <tr>
                <th>{t(language, "distance")}</th>
                <th>{t(language, "targetWindow")}</th>
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
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <EditableDuration
                        seconds={time.timeFromSeconds}
                        isCustom={time.timeFromOverridden}
                        label={`${active.name} ${time.distanceMeters} m ${t(language, "fastEnd")}`}
                        language={language}
                        testId={`target-time-desktop-${active.id}-${time.distanceMeters}-from`}
                        onChange={(seconds) =>
                          onValueChange(
                            active.id,
                            time.distanceMeters,
                            "timeFromSeconds",
                            seconds,
                          )
                        }
                      />
                      <span aria-hidden="true">-</span>
                      <EditableDuration
                        seconds={time.timeToSeconds}
                        isCustom={time.timeToOverridden}
                        label={`${active.name} ${time.distanceMeters} m ${t(language, "controlledEnd")}`}
                        language={language}
                        testId={`target-time-desktop-${active.id}-${time.distanceMeters}-to`}
                        onChange={(seconds) =>
                          onValueChange(
                            active.id,
                            time.distanceMeters,
                            "timeToSeconds",
                            seconds,
                          )
                        }
                      />
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {formatPace(time.paceFromSecondsPerKm, paceUnit)} -{" "}
                    {formatPace(time.paceToSecondsPerKm, paceUnit)}
                  </td>
                  <td className="whitespace-nowrap">
                    <EditableRepetitions
                      targetId={active.id}
                      targetName={active.name}
                      time={time}
                      language={language}
                      context="desktop"
                      onChange={onValueChange}
                    />
                  </td>
                  <td className="whitespace-nowrap">
                    <EditableRecovery
                      targetId={active.id}
                      targetName={active.name}
                      time={time}
                      language={language}
                      context="desktop"
                      onChange={onValueChange}
                    />
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

interface EditableTargetValueProps {
  targetId: string;
  targetName: string;
  time: TargetDistanceTime;
  language: Language;
  context: "mobile" | "desktop";
  onChange: TargetEditHandler;
}

function EditableRepetitions({
  targetId,
  targetName,
  time,
  language,
  context,
  onChange,
}: EditableTargetValueProps) {
  const noun = language === "nl" ? "herh." : "reps";
  return (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <EditableNumber
        value={time.repetitionsFrom}
        isCustom={time.repetitionsFromOverridden}
        label={`${targetName} ${time.distanceMeters} m ${t(language, "repetitions")} min`}
        language={language}
        testId={`target-repetitions-${context}-${targetId}-${time.distanceMeters}-from`}
        maxValue={time.repetitionsTo}
        onChange={(value) =>
          onChange(
            targetId,
            time.distanceMeters,
            "repetitionsFrom",
            value,
          )
        }
      />
      <span aria-hidden="true">-</span>
      <EditableNumber
        value={time.repetitionsTo}
        isCustom={time.repetitionsToOverridden}
        label={`${targetName} ${time.distanceMeters} m ${t(language, "repetitions")} max`}
        language={language}
        testId={`target-repetitions-${context}-${targetId}-${time.distanceMeters}-to`}
        minValue={time.repetitionsFrom}
        onChange={(value) =>
          onChange(
            targetId,
            time.distanceMeters,
            "repetitionsTo",
            value,
          )
        }
      />
      <span className="font-semibold text-slate-700">{noun}</span>
    </span>
  );
}

function EditableRecovery({
  targetId,
  targetName,
  time,
  language,
  context,
  onChange,
}: EditableTargetValueProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <EditableDuration
        seconds={time.recoverySeconds}
        isCustom={time.recoverySecondsOverridden}
        label={`${targetName} ${time.distanceMeters} m ${t(language, "recovery")}`}
        language={language}
        testId={`target-recovery-${context}-${targetId}-${time.distanceMeters}`}
        allowZero
        onChange={(value) =>
          onChange(targetId, time.distanceMeters, "recoverySeconds", value)
        }
      />
      <span>{recoveryTypeLabel(time.recoveryType, language)}</span>
    </span>
  );
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
