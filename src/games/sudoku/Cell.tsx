import { SelectedCell } from "./useSudoku";
import { EMPTY_CELL } from "./utils";

interface CellProps {
  value: number;
  row: number;
  col: number;
  isInitial: boolean;
  isSelected: boolean;
  isConflict: boolean;
  onClick: (row: number, col: number) => void;
}

export function Cell({
  value,
  row,
  col,
  isInitial,
  isSelected,
  isConflict,
  onClick,
}: CellProps) {
  const displayValue = value === EMPTY_CELL ? "" : value;

  // Compute 3x3 thick borders
  const isRightBorderThick = col === 2 || col === 5;
  const isBottomBorderThick = row === 2 || row === 5;

  let bgClass = "bg-background";
  let textClass = "text-foreground font-semibold";

  if (isConflict) {
    bgClass = "bg-red-500/20 dark:bg-red-500/30";
    textClass = "text-red-600 dark:text-red-400 font-bold";
  } else if (isSelected) {
    bgClass = "bg-sky-500/20 dark:bg-sky-500/30";
    if (!isInitial) {
      textClass = "text-sky-600 dark:text-sky-400 font-bold";
    }
  } else if (!isInitial && value !== EMPTY_CELL) {
    textClass = "text-sky-600 dark:text-sky-400 font-bold";
  }

  return (
    <button
      onClick={() => onClick(row, col)}
      className={`
        relative aspect-square flex items-center justify-center text-lg sm:text-2xl transition-colors
        border-r border-b border-border/50
        ${isRightBorderThick ? "border-r-2 border-r-foreground/40" : ""}
        ${isBottomBorderThick ? "border-b-2 border-b-foreground/40" : ""}
        ${bgClass} ${textClass}
        hover:bg-accent/10 focus:outline-none
      `}
    >
      {displayValue}
    </button>
  );
}
