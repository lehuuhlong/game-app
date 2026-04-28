import { Cell } from "./Cell";
import { SelectedCell } from "./useSudoku";
import { EMPTY_CELL } from "./utils";

interface SudokuBoardProps {
  initialBoard: number[][];
  currentBoard: number[][];
  selectedCell: SelectedCell | null;
  conflicts: { row: number; col: number }[];
  onCellClick: (row: number, col: number) => void;
}

export function SudokuBoard({
  initialBoard,
  currentBoard,
  selectedCell,
  conflicts,
  onCellClick,
}: SudokuBoardProps) {
  // If the board hasn't generated yet, render an empty placeholder
  if (!currentBoard || currentBoard.length === 0) {
    return (
      <div className="w-full max-w-[450px] aspect-square mx-auto border-2 border-foreground/40 bg-surface rounded-sm shadow-md animate-pulse" />
    );
  }

  return (
    <div className="w-full max-w-[450px] mx-auto select-none touch-none">
      <div className="grid grid-cols-9 border-t-2 border-l-2 border-foreground/40 bg-background shadow-md">
        {currentBoard.map((row, rIndex) =>
          row.map((val, cIndex) => {
            const isInitial = initialBoard[rIndex][cIndex] !== EMPTY_CELL;
            const isSelected = selectedCell?.row === rIndex && selectedCell?.col === cIndex;
            const isConflict = conflicts.some(c => c.row === rIndex && c.col === cIndex);

            return (
              <Cell
                key={`${rIndex}-${cIndex}`}
                row={rIndex}
                col={cIndex}
                value={val}
                isInitial={isInitial}
                isSelected={isSelected}
                isConflict={isConflict}
                onClick={onCellClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
