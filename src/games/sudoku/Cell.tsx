import { SelectedCell, NotesBoard } from "./useSudoku";
import { EMPTY_CELL } from "./utils";

interface CellProps {
  value: number;
  row: number;
  col: number;
  isInitial: boolean;
  isSelected: boolean;
  isConflict: boolean;
  isHighlighted: boolean; // same row/col/box as selected
  isSameValue: boolean;   // same number as selected (if not 0)
  notes: Set<number>;
  onClick: (row: number, col: number) => void;
}

export function Cell({
  value,
  row,
  col,
  isInitial,
  isSelected,
  isConflict,
  isHighlighted,
  isSameValue,
  notes,
  onClick,
}: CellProps) {
  const displayValue = value === EMPTY_CELL ? "" : value;

  let borderClasses = "";
  if (col === 2 || col === 5) borderClasses += "border-r-[2px] border-r-foreground/50 ";
  else if (col < 8) borderClasses += "border-r border-border/40 ";
  
  if (row === 2 || row === 5) borderClasses += "border-b-[2px] border-b-foreground/50 ";
  else if (row < 8) borderClasses += "border-b border-border/40 ";

  let bgClass = "bg-transparent";
  let textClass = "text-foreground font-semibold";

  if (isConflict) {
    bgClass = "bg-red-500/20";
    textClass = "text-red-500 font-bold";
  } else if (isSelected) {
    bgClass = "bg-sky-500/30";
    textClass = isInitial ? "text-foreground font-bold" : "text-blue-600 font-bold";
  } else if (isSameValue && value !== EMPTY_CELL) {
    bgClass = "bg-sky-500/15";
    textClass = isInitial ? "text-foreground font-semibold" : "text-blue-600 font-semibold";
  } else if (isHighlighted) {
    bgClass = "bg-white/[0.04]";
    textClass = isInitial ? "text-foreground font-semibold" : "text-blue-600 font-semibold";
  } else if (!isInitial && value !== EMPTY_CELL) {
    textClass = "text-blue-600 font-semibold";
  }

  const hasNotes = notes && notes.size > 0;

  return (
    <button
      onClick={() => onClick(row, col)}
      className={`
        relative aspect-square flex items-center justify-center text-lg sm:text-xl transition-all duration-100
        ${borderClasses}
        ${bgClass} ${textClass}
        hover:brightness-125 focus:outline-none
      `}
    >
      {hasNotes && value === EMPTY_CELL ? (
        <div className="grid grid-cols-3 w-full h-full p-0.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className={`flex items-center justify-center text-[8px] sm:text-[9px] leading-none font-medium ${
                notes.has(n)
                  ? "text-sky-400/80"
                  : "text-transparent"
              }`}
            >
              {n}
            </span>
          ))}
        </div>
      ) : (
        displayValue
      )}
    </button>
  );
}
