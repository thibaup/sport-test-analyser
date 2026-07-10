import { Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatDuration,
  parseTimeToSeconds,
} from "../lib/conversions";
import { t, type Language } from "../lib/i18n";

interface EditableDurationProps {
  seconds: number;
  isCustom?: boolean;
  label: string;
  language: Language;
  testId: string;
  allowZero?: boolean;
  onChange: (seconds: number | undefined) => void;
}

export function EditableDuration({
  seconds,
  isCustom = false,
  label,
  language,
  testId,
  allowZero = false,
  onChange,
}: EditableDurationProps) {
  const [draft, setDraft] = useState(() => formatDuration(seconds));

  useEffect(() => {
    setDraft(formatDuration(seconds));
  }, [seconds]);

  const commit = () => {
    const parsed = parseTimeToSeconds(draft);
    if (parsed !== undefined && (allowZero ? parsed >= 0 : parsed > 0)) {
      onChange(parsed);
      setDraft(formatDuration(parsed));
      return;
    }
    setDraft(formatDuration(seconds));
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="text"
        className={`editable-time-input ${isCustom ? "editable-time-input-custom" : ""}`}
        value={draft}
        aria-label={label}
        data-testid={testId}
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(formatDuration(seconds));
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
