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
    textClass = "text-red-600 dark:text-red-400 font-bold";
  } else if (isSelected) {
    bgClass = "bg-sky-500/30";
    textClass = isInitial ? "text-foreground font-bold" : "text-sky-600 dark:text-sky-400 font-bold";
  } else if (isSameValue && value !== EMPTY_CELL) {
    bgClass = "bg-sky-500/15";
    textClass = isInitial ? "text-foreground font-semibold" : "text-sky-600 dark:text-sky-400 font-semibold";
  } else if (isHighlighted) {
    bgClass = "bg-white/[0.04]";
    textClass = isInitial ? "text-foreground font-semibold" : "text-sky-600 dark:text-sky-400 font-semibold";
  } else if (!isInitial && value !== EMPTY_CELL) {
    textClass = "text-sky-600 dark:text-sky-400 font-semibold";
  }

  const hasNotes = notes && notes.size > 0;
  const cellAriaLabel = `Row ${row + 1}, Column ${col + 1}${
    value !== EMPTY_CELL
      ? `, number ${value}`
      : hasNotes
      ? `, notes ${Array.from(notes).sort().join(", ")}`
      : ", empty"
  }${isInitial ? ", starting number" : ""}${isConflict ? ", conflict" : ""}`;

  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      aria-label={cellAriaLabel}
      aria-selected={isSelected}
      role="gridcell"
      className={`
        relative aspect-square flex items-center justify-center text-lg sm:text-xl font-mono transition-all duration-100 touch-manipulation
        ${borderClasses}
        ${bgClass} ${textClass}
        hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:z-10
      `}
    >
      {hasNotes && value === EMPTY_CELL ? (
        <div className="grid grid-cols-3 w-full h-full p-0.5 pointer-events-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span
              key={n}
              className={`flex items-center justify-center text-xs scale-75 leading-none font-medium ${
                notes.has(n)
                  ? "text-sky-500 dark:text-sky-400"
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
