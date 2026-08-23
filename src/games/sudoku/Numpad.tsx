interface NumpadProps {
  onInput: (value: number) => void;
  onErase: () => void;
  onToggleNote: () => void;
  noteMode: boolean;
  remainingCounts: number[]; // how many of each digit remain to be placed (index 0 unused)
}

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);

const EraseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/>
    <line x1="18" y1="9" x2="12" y2="15"/>
    <line x1="12" y1="9" x2="18" y2="15"/>
  </svg>
);

export function Numpad({ onInput, onErase, onToggleNote, noteMode, remainingCounts }: NumpadProps) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="w-full max-w-[460px] mx-auto mt-4 space-y-3">
      {/* Action buttons */}
      <div className="flex items-center gap-3 justify-center">
        {/* Erase */}
        <button
          type="button"
          onClick={onErase}
          className="flex flex-col items-center justify-center gap-1 min-w-[72px] min-h-[44px] px-4 py-2 rounded-xl bg-surface border border-border text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-accent touch-manipulation"
          aria-label="Erase current cell number"
        >
          <EraseIcon />
          <span className="text-xs font-semibold">Erase</span>
        </button>

        {/* Notes toggle */}
        <button
          type="button"
          onClick={onToggleNote}
          className={`flex flex-col items-center justify-center gap-1 min-w-[96px] min-h-[44px] px-4 py-2 rounded-xl border transition-all hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-accent touch-manipulation ${
            noteMode
              ? "bg-sky-500/20 border-sky-500/50 text-sky-400 font-bold"
              : "bg-surface border-border text-foreground-secondary hover:bg-surface-hover hover:text-foreground font-semibold"
          }`}
          aria-label={`Toggle pencil notes mode (currently ${noteMode ? "ON" : "OFF"})`}
          aria-pressed={noteMode}
        >
          <PencilIcon />
          <span className="text-xs">Notes {noteMode ? "ON" : "OFF"}</span>
        </button>
      </div>

      {/* Number buttons */}
      <div className="grid grid-cols-9 gap-1 sm:gap-1.5" role="group" aria-label="Sudoku numeric keypad">
        {numbers.map((num) => {
          const remaining = remainingCounts[num] ?? 9;
          const isCompleted = remaining <= 0;
          return (
            <button
              type="button"
              key={num}
              onClick={() => onInput(num)}
              disabled={isCompleted}
              aria-label={`Number ${num}${isCompleted ? ", completed" : `, ${remaining} remaining`}`}
              className={`relative flex flex-col items-center justify-center rounded-xl border min-h-[44px] py-1 px-0 transition-all font-mono touch-manipulation focus-visible:ring-2 focus-visible:ring-accent ${
                isCompleted
                  ? "opacity-30 border-border/20 bg-transparent cursor-not-allowed"
                  : "bg-surface border-border text-foreground font-bold hover:bg-surface-hover hover:border-accent hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              <span className="text-base sm:text-lg font-bold leading-none">{num}</span>
              {!isCompleted && (
                <span className="text-xs scale-75 text-foreground-muted leading-none mt-0.5">{remaining}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
