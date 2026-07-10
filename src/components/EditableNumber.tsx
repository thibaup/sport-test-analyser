import { Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { t, type Language } from "../lib/i18n";

interface EditableNumberProps {
  value: number;
  isCustom?: boolean;
  label: string;
  language: Language;
  testId: string;
  minValue?: number;
  maxValue?: number;
  onChange: (value: number | undefined) => void;
}

export function EditableNumber({
  value,
  isCustom = false,
  label,
  language,
  testId,
  minValue = 1,
  maxValue,
  onChange,
}: EditableNumberProps) {
  const [draft, setDraft] = useState(`${value}`);

  const parseValidDraft = (nextDraft: string): number | undefined => {
    const parsed = Number(nextDraft);
    const isValid =
      nextDraft.trim() !== "" &&
      Number.isInteger(parsed) &&
      parsed >= minValue &&
      (maxValue === undefined || parsed <= maxValue);
    return isValid ? parsed : undefined;
  };

  useEffect(() => {
    setDraft(`${value}`);
  }, [value]);

  const commit = () => {
    const parsed = parseValidDraft(draft);
    if (parsed !== undefined) {
      if (parsed !== value) onChange(parsed);
      setDraft(`${parsed}`);
      return;
    }
    setDraft(`${value}`);
  };

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        className={`editable-number-input ${isCustom ? "editable-number-input-custom" : ""}`}
        value={draft}
        min={minValue}
        max={maxValue}
        step={1}
        aria-label={label}
        data-testid={testId}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const parsed = parseValidDraft(nextDraft);
          if (parsed !== undefined && parsed !== value) onChange(parsed);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(`${value}`);
            event.currentTarget.blur();
          }
        }}
      />
      {isCustom && (
        <button
          type="button"
          className="editable-time-reset"
          aria-label={`${t(language, "resetCalculatedValue")}: ${label}`}
          title={t(language, "resetCalculatedValue")}
          onClick={() => onChange(undefined)}
        >
          <Undo2 size={13} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
