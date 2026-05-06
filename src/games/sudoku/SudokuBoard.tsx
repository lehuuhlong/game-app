import { Cell } from "./Cell";
import { SelectedCell, NotesBoard } from "./useSudoku";
import { EMPTY_CELL, BOARD_SIZE } from "./utils";

interface SudokuBoardProps {
  initialBoard: number[][];
  currentBoard: number[][];
  selectedCell: SelectedCell | null;
  conflicts: { row: number; col: number }[];
  notes: NotesBoard;
  onCellClick: (row: number, col: number) => void;
}

export function SudokuBoard({
  initialBoard,
  currentBoard,
  selectedCell,
  conflicts,
  notes,
  onCellClick,
}: SudokuBoardProps) {
  // If the board hasn't generated yet, render an empty placeholder
  if (!currentBoard || currentBoard.length === 0) {
    return (
      <div className="w-full max-w-[450px] aspect-square mx-auto border-2 border-foreground/40 bg-surface rounded-sm shadow-md animate-pulse" />
    );
  }

  const selRow = selectedCell?.row ?? -1;
  const selCol = selectedCell?.col ?? -1;
  const selVal = selectedCell ? currentBoard[selRow]?.[selCol] : EMPTY_CELL;
  const selBoxRow = selRow >= 0 ? Math.floor(selRow / 3) : -1;
  const selBoxCol = selCol >= 0 ? Math.floor(selCol / 3) : -1;

  return (
    <div className="w-full max-w-[460px] mx-auto select-none touch-none">
      <div className="grid grid-cols-9 border-[2px] border-foreground/50 rounded-sm overflow-hidden shadow-[0_0_0_2px_rgba(255,255,255,0.05)] bg-[hsl(var(--background))]">
        {currentBoard.map((row, rIndex) =>
          row.map((val, cIndex) => {
            const isInitial = initialBoard[rIndex][cIndex] !== EMPTY_CELL;
            const isSelected = selRow === rIndex && selCol === cIndex;
            const isConflict = conflicts.some(c => c.row === rIndex && c.col === cIndex);

            // Highlight same row, col, or box as selected
            const isHighlighted =
              !isSelected &&
              selRow >= 0 &&
              (rIndex === selRow ||
                cIndex === selCol ||
                (Math.floor(rIndex / 3) === selBoxRow && Math.floor(cIndex / 3) === selBoxCol));

            // Highlight cells with the same value
            const isSameValue =
              !isSelected &&
              selVal !== EMPTY_CELL &&
              val === selVal;

            return (
              <Cell
                key={`${rIndex}-${cIndex}`}
                row={rIndex}
                col={cIndex}
                value={val}
                isInitial={isInitial}
                isSelected={isSelected}
                isConflict={isConflict}
                isHighlighted={isHighlighted}
                isSameValue={isSameValue}
                notes={notes[rIndex][cIndex]}
                onClick={onCellClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
