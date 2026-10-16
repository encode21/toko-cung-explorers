import { Delete } from "lucide-react";
import type { MouseEvent } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

/** Keep focus on the numeric field so the keypad stays open while tapping keys. */
const keepFieldFocus = (event: MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
};

export function EntryKeypad({
  disabled = false,
  onDigit,
  onBackspace,
  onClear,
  label = "Keypad angka",
}: {
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  label?: string;
}) {
  return (
    <div className="entry-keypad" role="group" aria-label={label}>
      {KEYS.map((key) => {
        if (key === "back") {
          return (
            <button
              key={key}
              type="button"
              className="entry-keypad-key entry-keypad-action"
              disabled={disabled}
              aria-label="Hapus"
              tabIndex={-1}
              onMouseDown={keepFieldFocus}
              onClick={onBackspace}
            >
              <Delete aria-hidden />
            </button>
          );
        }
        if (key === "clear") {
          return (
            <button
              key={key}
              type="button"
              className="entry-keypad-key entry-keypad-action"
              disabled={disabled}
              aria-label="Kosongkan"
              tabIndex={-1}
              onMouseDown={keepFieldFocus}
              onClick={onClear}
            >
              C
            </button>
          );
        }
        return (
          <button
            key={key}
            type="button"
            className="entry-keypad-key"
            disabled={disabled}
            tabIndex={-1}
            onMouseDown={keepFieldFocus}
            onClick={() => onDigit(key)}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
