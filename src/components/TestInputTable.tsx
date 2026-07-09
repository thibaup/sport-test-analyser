import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { exampleMaxLactateTest, exampleTestSteps } from "../data/exampleTest";
import {
  calculateDurationSeconds,
  calculateSpeedFromDuration,
  convertDistanceFromDisplay,
  convertDistanceToDisplay,
  formatDuration,
  parsePaceToSecondsPerKm,
  parseTimeToSeconds,
  paceSecondsPerKmToSpeed,
  round,
  speedToPaceSecondsPerKm,
} from "../lib/conversions";
import { t, type Language } from "../lib/i18n";
import type {
  DistanceUnit,
  MaxLactateTest,
  PaceUnit,
  TestStep,
} from "../types/lactate";

interface TestInputTableProps {
  steps: TestStep[];
  onChange: (steps: TestStep[]) => void;
  paceUnit: PaceUnit;
  distanceUnit: DistanceUnit;
  language: Language;
  maxLactateTest: MaxLactateTest;
  onMaxLactateChange: (test: MaxLactateTest) => void;
}

type TimeDraft = Record<string, { pace: string; duration: string }>;

function calculateLinkedFields(
  step: TestStep,
  source?: "speed" | "pace" | "distance" | "duration",
): TestStep {
  const next = { ...step };
  if (source === "speed") {
    next.paceSecondsPerKm = speedToPaceSecondsPerKm(next.speedKmh);
    next.durationSeconds = calculateDurationSeconds(
      next.distanceKm,
      next.speedKmh,
    );
  }
  if (source === "pace") {
    next.speedKmh = paceSecondsPerKmToSpeed(next.paceSecondsPerKm);
    next.durationSeconds = calculateDurationSeconds(
      next.distanceKm,
      next.speedKmh,
    );
  }
  if (source === "distance") {
    next.durationSeconds = calculateDurationSeconds(
      next.distanceKm,
      next.speedKmh,
    );
  }
  if (source === "duration") {
    next.speedKmh = calculateSpeedFromDuration(
      next.distanceKm,
      next.durationSeconds,
    );
    next.paceSecondsPerKm = speedToPaceSecondsPerKm(next.speedKmh);
  }
  return next;
}

function formatPaceDraft(
  paceSecondsPerKm: number | undefined,
  paceUnit: PaceUnit,
): string {
  if (paceSecondsPerKm === undefined) return "";
  return formatDuration(
    paceUnit === "minPerMile" ? paceSecondsPerKm * 1.609344 : paceSecondsPerKm,
  );
}

function formatDurationDraft(durationSeconds: number | undefined): string {
  return durationSeconds === undefined ? "" : formatDuration(durationSeconds);
}

function isCompleteTimeDraft(value: string): boolean {
  return /^\d+:\d{2}(:\d{2})?$/.test(value.trim());
}

export function TestInputTable({
  steps,
  onChange,
  paceUnit,
  distanceUnit,
  language,
  maxLactateTest,
  onMaxLactateChange,
}: TestInputTableProps) {
  const [drafts, setDrafts] = useState<TimeDraft>({});
  const [maxLactateTimeDraft, setMaxLactateTimeDraft] = useState("");

  useEffect(() => {
    const nextDrafts: TimeDraft = {};
    steps.forEach((step) => {
      nextDrafts[step.id] = {
        pace: step.paceSecondsPerKm
          ? formatDuration(
              paceUnit === "minPerMile"
                ? step.paceSecondsPerKm * 1.609344
                : step.paceSecondsPerKm,
            )
          : "",
        duration: step.durationSeconds
          ? formatDuration(step.durationSeconds)
          : "",
      };
    });
    setDrafts(nextDrafts);
  }, [steps, paceUnit]);

  useEffect(() => {
    setMaxLactateTimeDraft(
      maxLactateTest.timeSeconds
        ? formatDuration(maxLactateTest.timeSeconds)
        : "",
    );
  }, [maxLactateTest.timeSeconds]);

  const setRows = (rows: TestStep[]) => {
    onChange(rows.map((row, index) => ({ ...row, step: index + 1 })));
  };

  const updateStep = (
    id: string,
    patch: Partial<TestStep>,
    source?: "speed" | "pace" | "distance" | "duration",
  ) => {
    let changedStep: TestStep | undefined;
    const updated = steps.map((step) => {
      if (step.id !== id) return step;
      const next = calculateLinkedFields({ ...step, ...patch }, source);
      changedStep = next;
      return next;
    });
    setRows(updated);

    if (changedStep && source) {
      syncDraftFromStep(id, changedStep, source);
    }
  };

  const syncDraftFromStep = (
    id: string,
    step: TestStep,
    source: "speed" | "pace" | "distance" | "duration",
  ) => {
    setDrafts((current) => {
      const previous = current[id] ?? { pace: "", duration: "" };
      return {
        ...current,
        [id]: {
          pace:
            source === "pace"
              ? previous.pace
              : formatPaceDraft(step.paceSecondsPerKm, paceUnit),
          duration:
            source === "duration"
              ? previous.duration
              : formatDurationDraft(step.durationSeconds),
        },
      };
    });
  };

  const handlePaceDraftChange = (step: TestStep, value: string) => {
    setDrafts((current) => ({
      ...current,
      [step.id]: { ...(current[step.id] ?? { duration: "" }), pace: value },
    }));

    if (value.trim() === "") {
      updateStep(step.id, { paceSecondsPerKm: undefined }, "pace");
      return;
    }

    if (isCompleteTimeDraft(value)) {
      const paceSecondsPerKm = parsePaceToSecondsPerKm(value, paceUnit);
      if (paceSecondsPerKm !== undefined) {
        updateStep(step.id, { paceSecondsPerKm }, "pace");
      }
    }
  };

  const handlePaceDraftBlur = (step: TestStep, value: string) => {
    updateStep(
      step.id,
      { paceSecondsPerKm: parsePaceToSecondsPerKm(value, paceUnit) },
      "pace",
    );
  };

  const handleDurationDraftChange = (step: TestStep, value: string) => {
    setDrafts((current) => ({
      ...current,
      [step.id]: { ...(current[step.id] ?? { pace: "" }), duration: value },
    }));

    if (value.trim() === "") {
      updateStep(step.id, { durationSeconds: undefined }, "duration");
      return;
    }

    if (isCompleteTimeDraft(value)) {
      const durationSeconds = parseTimeToSeconds(value);
      if (durationSeconds !== undefined) {
        updateStep(step.id, { durationSeconds }, "duration");
      }
    }
  };

  const handleDurationDraftBlur = (step: TestStep, value: string) => {
    updateStep(
      step.id,
      { durationSeconds: parseTimeToSeconds(value) },
      "duration",
    );
  };

  const addStep = () => {
    const previous = steps[steps.length - 1];
    const speed = previous?.speedKmh
      ? round(previous.speedKmh + 0.8, 1)
      : undefined;
    const distance = previous?.distanceKm ?? 1.6;
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      step: steps.length + 1,
      distanceKm: distance,
      speedKmh: speed,
      paceSecondsPerKm: speedToPaceSecondsPerKm(speed),
      durationSeconds: calculateDurationSeconds(distance, speed),
    };
    setRows([...steps, newStep]);
  };

  const clear = () => {
    setRows([]);
  };

  const loadExample = () => {
    setRows(
      exampleTestSteps.map((step) => ({
        ...step,
        id: `demo-${step.step}-${Date.now()}`,
      })),
    );
    onMaxLactateChange(exampleMaxLactateTest);
  };

  const deleteStep = (id: string) => {
    setRows(steps.filter((step) => step.id !== id));
  };

  const updateMaxLactateTest = (patch: Partial<MaxLactateTest>) => {
    onMaxLactateChange({ ...maxLactateTest, ...patch });
  };

  return (
    <section className="section-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, "inputEyebrow")}</p>
          <h2>{t(language, "inputTitle")}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="secondary-button"
            onClick={loadExample}
            type="button"
          >
            <RotateCcw size={16} aria-hidden="true" />
            {t(language, "loadExample")}
          </button>
          <button className="secondary-button" onClick={clear} type="button">
            <X size={16} aria-hidden="true" />
            {t(language, "clear")}
          </button>
          <button className="primary-button" onClick={addStep} type="button">
            <Plus size={16} aria-hidden="true" />
            {t(language, "addStep")}
          </button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {steps.length === 0 ? (
          <p className="empty-state">{t(language, "emptySteps")}</p>
        ) : (
          steps.map((step) => {
            return (
              <article
                key={step.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-slate-700 shadow-sm">
                      {step.step}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-button text-rose-600 hover:bg-rose-50"
                    onClick={() => deleteStep(step.id)}
                    aria-label={`${t(language, "clear")} ${step.step}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="field-label">
                    {t(language, "distanceCol")} ({distanceUnit})
                    <input
                      className="table-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={
                        convertDistanceToDisplay(
                          step.distanceKm,
                          distanceUnit,
                        ) ?? ""
                      }
                      onChange={(event) =>
                        updateStep(
                          step.id,
                          {
                            distanceKm: convertDistanceFromDisplay(
                              event.target.value === ""
                                ? undefined
                                : Number(event.target.value),
                              distanceUnit,
                            ),
                          },
                          "distance",
                        )
                      }
                    />
                  </label>
                  <label className="field-label">
                    {t(language, "speedCol")} (km/h)
                    <input
                      className="table-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={step.speedKmh ?? ""}
                      onChange={(event) =>
                        updateStep(
                          step.id,
                          {
                            speedKmh:
                              event.target.value === ""
                                ? undefined
                                : Number(event.target.value),
                          },
                          "speed",
                        )
                      }
                    />
                  </label>
                  <label className="field-label">
                    {t(language, "paceCol")} (
                    {paceUnit === "minPerMile" ? "min/mi" : "min/km"})
                    <input
                      className="table-input"
                      value={drafts[step.id]?.pace ?? ""}
                      placeholder="MM:SS"
                      onChange={(event) =>
                        handlePaceDraftChange(step, event.target.value)
                      }
                      onBlur={(event) =>
                        handlePaceDraftBlur(step, event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label">
                    {t(language, "durationCol")}
                    <input
                      className="table-input"
                      value={drafts[step.id]?.duration ?? ""}
                      placeholder="MM:SS"
                      onChange={(event) =>
                        handleDurationDraftChange(step, event.target.value)
                      }
                      onBlur={(event) =>
                        handleDurationDraftBlur(step, event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label">
                    {t(language, "lactateCol")}
                    <input
                      className="table-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={step.lactate ?? ""}
                      onChange={(event) =>
                        updateStep(step.id, {
                          lactate:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field-label">
                    {t(language, "hrCol")}
                    <input
                      className="table-input"
                      type="number"
                      step="1"
                      min="0"
                      value={step.heartRate ?? ""}
                      onChange={(event) =>
                        updateStep(step.id, {
                          heartRate:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field-label">
                    {t(language, "rpeCol")}
                    <input
                      className="table-input"
                      type="number"
                      step="1"
                      min="0"
                      max="20"
                      value={step.rpe ?? ""}
                      onChange={(event) =>
                        updateStep(step.id, {
                          rpe:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="field-label">
                    {t(language, "noteCol")}
                    <input
                      className="table-input"
                      value={step.note ?? ""}
                      onChange={(event) =>
                        updateStep(step.id, { note: event.target.value })
                      }
                      placeholder={t(language, "optional")}
                    />
                  </label>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th>{t(language, "step")}</th>
              <th>
                {t(language, "distanceCol")} ({distanceUnit})
              </th>
              <th>{t(language, "speedCol")} (km/h)</th>
              <th>
                {t(language, "paceCol")} (
                {paceUnit === "minPerMile" ? "min/mi" : "min/km"})
              </th>
              <th>{t(language, "durationCol")}</th>
              <th>{t(language, "lactateCol")}</th>
              <th>{t(language, "hrCol")}</th>
              <th>
                {t(language, "rpeCol")} ({t(language, "optional")})
              </th>
              <th>{t(language, "noteCol")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {steps.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-10 text-center text-sm text-slate-500"
                >
                  {t(language, "emptySteps")}
                </td>
              </tr>
            ) : (
              steps.map((step) => {
                return (
                  <tr key={step.id}>
                    <td className="font-semibold text-slate-600">
                      <div className="flex items-center gap-2">{step.step}</div>
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          convertDistanceToDisplay(
                            step.distanceKm,
                            distanceUnit,
                          ) ?? ""
                        }
                        onChange={(event) =>
                          updateStep(
                            step.id,
                            {
                              distanceKm: convertDistanceFromDisplay(
                                event.target.value === ""
                                  ? undefined
                                  : Number(event.target.value),
                                distanceUnit,
                              ),
                            },
                            "distance",
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.1"
                        min="0"
                        value={step.speedKmh ?? ""}
                        onChange={(event) =>
                          updateStep(
                            step.id,
                            {
                              speedKmh:
                                event.target.value === ""
                                  ? undefined
                                  : Number(event.target.value),
                            },
                            "speed",
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={drafts[step.id]?.pace ?? ""}
                        placeholder="MM:SS"
                        onChange={(event) =>
                          handlePaceDraftChange(step, event.target.value)
                        }
                        onBlur={(event) =>
                          handlePaceDraftBlur(step, event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        value={drafts[step.id]?.duration ?? ""}
                        placeholder="MM:SS"
                        onChange={(event) =>
                          handleDurationDraftChange(step, event.target.value)
                        }
                        onBlur={(event) =>
                          handleDurationDraftBlur(step, event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="0.1"
                        min="0"
                        value={step.lactate ?? ""}
                        onChange={(event) =>
                          updateStep(step.id, {
                            lactate:
                              event.target.value === ""
                                ? undefined
                                : Number(event.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="1"
                        min="0"
                        value={step.heartRate ?? ""}
                        onChange={(event) =>
                          updateStep(step.id, {
                            heartRate:
                              event.target.value === ""
                                ? undefined
                                : Number(event.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input"
                        type="number"
                        step="1"
                        min="0"
                        max="20"
                        value={step.rpe ?? ""}
                        onChange={(event) =>
                          updateStep(step.id, {
                            rpe:
                              event.target.value === ""
                                ? undefined
                                : Number(event.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input min-w-44"
                        value={step.note ?? ""}
                        onChange={(event) =>
                          updateStep(step.id, { note: event.target.value })
                        }
                        placeholder={t(language, "optional")}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="icon-button text-rose-600 hover:bg-rose-50"
                        onClick={() => deleteStep(step.id)}
                        aria-label={`${t(language, "clear")} ${step.step}`}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3">
          <p className="eyebrow">{t(language, "maxLactateAllOutEyebrow")}</p>
          <h3 className="text-base font-semibold text-slate-950">
            {t(language, "maxLactateAllOutTitle")}
          </h3>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="field-label">
            {t(language, "distance")}
            <select
              className="select-field"
              value={maxLactateTest.distanceMeters ?? 400}
              onChange={(event) =>
                updateMaxLactateTest({
                  distanceMeters: Number(event.target.value),
                })
              }
            >
              <option value={400}>400 m</option>
              <option value={600}>600 m</option>
            </select>
          </label>
          <label className="field-label">
            {t(language, "raceTime")}
            <input
              className="text-field"
              value={maxLactateTimeDraft}
              placeholder="MM:SS"
              onChange={(event) => setMaxLactateTimeDraft(event.target.value)}
              onBlur={(event) =>
                updateMaxLactateTest({
                  timeSeconds: parseTimeToSeconds(event.target.value),
                })
              }
            />
          </label>
          <label className="field-label">
            {t(language, "lactateCol")} (mmol/L)
            <input
              className="text-field"
              type="number"
              min="0"
              step="0.1"
              value={maxLactateTest.lactate ?? ""}
              onChange={(event) =>
                updateMaxLactateTest({
                  lactate:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
          <label className="field-label">
            {t(language, "hrCol")} ({t(language, "optional")})
            <input
              className="text-field"
              type="number"
              min="0"
              step="1"
              value={maxLactateTest.heartRate ?? ""}
              onChange={(event) =>
                updateMaxLactateTest({
                  heartRate:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
            />
          </label>
        </div>
      </div>
    </section>
  );
}
