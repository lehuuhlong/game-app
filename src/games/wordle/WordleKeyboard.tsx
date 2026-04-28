"use client";

import { memo, useCallback } from "react";
import type { KeyboardStatus, LetterStatus } from "./types";

interface KeyboardProps {
  keyboardStatus: KeyboardStatus;
  onKeyPress: (key: string) => void;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

const KEY_STATUS_STYLES: Record<LetterStatus | "unused", string> = {
  correct:
    "bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-500 dark:border-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-700",
  present:
    "bg-amber-500 dark:bg-amber-500 text-white border-amber-500 dark:border-amber-500 hover:bg-amber-600 dark:hover:bg-amber-600",
  absent:
    "bg-slate-500 dark:bg-slate-600 text-white border-slate-500 dark:border-slate-600 hover:bg-slate-600 dark:hover:bg-slate-700",
  empty:
    "bg-slate-200 dark:bg-slate-700 text-foreground border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600",
  unused:
    "bg-slate-200 dark:bg-slate-700 text-foreground border-slate-300 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600",
};

export const WordleKeyboard = memo(function WordleKeyboard({
  keyboardStatus,
  onKeyPress,
}: KeyboardProps) {
  const handleClick = useCallback(
    (key: string) => {
      onKeyPress(key);
    },
    [onKeyPress]
  );

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-[500px] mx-auto">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1 sm:gap-1.5 justify-center w-full">
          {row.map((key) => {
            const status = keyboardStatus[key] || "unused";
            const isWide = key === "ENTER" || key === "BACKSPACE";

            return (
              <button
                key={key}
                onClick={() => handleClick(key)}
                className={`
                  ${isWide ? "px-2 sm:px-4 min-w-[52px] sm:min-w-[65px]" : "min-w-[28px] sm:min-w-[40px]"}
                  h-[50px] sm:h-[58px]
                  rounded-md sm:rounded-lg
                  border
                  text-xs sm:text-sm font-bold uppercase
                  select-none
                  transition-all duration-200
                  active:scale-95
                  ${KEY_STATUS_STYLES[status]}
                `}
              >
                {key === "BACKSPACE" ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto"
                  >
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <line x1="18" y1="9" x2="12" y2="15" />
                    <line x1="12" y1="9" x2="18" y2="15" />
                  </svg>
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});
