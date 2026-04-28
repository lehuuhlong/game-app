interface NumpadProps {
  onInput: (value: number) => void;
  onErase: () => void;
}

export function Numpad({ onInput, onErase }: NumpadProps) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="w-full max-w-[450px] mx-auto mt-6">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => onInput(num)}
            className="h-12 sm:h-14 flex items-center justify-center rounded-xl bg-surface border border-border text-foreground font-extrabold text-xl shadow-sm hover:bg-surface-hover hover:-translate-y-0.5 active:translate-y-0 transition-all focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {num}
          </button>
        ))}
        <button
          onClick={onErase}
          className="h-12 sm:h-14 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
          aria-label="Erase"
          title="Erase"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
