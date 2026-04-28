"use client";

import { useCallback, useRef, memo } from "react";
import type { Cell } from "./types";

interface CellProps {
  cell: Cell;
  gameOver: boolean;
  onReveal: (row: number, col: number) => void;
  onFlag: (row: number, col: number) => void;
  onChord: (row: number, col: number) => void;
  cellSize: number;
}

/** Tailwind text colors for each adjacentMines value (classic Minesweeper palette) */
const NUMBER_COLORS: Record<number, string> = {
  1: "text-blue-600 dark:text-blue-400",
  2: "text-emerald-600 dark:text-emerald-400",
  3: "text-red-600 dark:text-red-400",
  4: "text-purple-700 dark:text-purple-400",
  5: "text-amber-700 dark:text-amber-400",
  6: "text-teal-600 dark:text-teal-400",
  7: "text-slate-800 dark:text-slate-300",
  8: "text-gray-500 dark:text-gray-400",
};

export const MinesweeperCell = memo(function MinesweeperCell({
  cell,
  gameOver,
  onReveal,
  onFlag,
  onChord,
  cellSize,
}: CellProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // ── Click handlers ──────────────────────────────────────────────

  const handleClick = useCallback(() => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (cell.isRevealed) {
      onChord(cell.row, cell.col);
    } else {
      onReveal(cell.row, cell.col);
    }
  }, [cell.row, cell.col, cell.isRevealed, onReveal, onChord]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onFlag(cell.row, cell.col);
    },
    [cell.row, cell.col, onFlag]
  );

  // ── Long-press for mobile flagging ──────────────────────────────

  const handleTouchStart = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onFlag(cell.row, cell.col);
    }, 400);
  }, [cell.row, cell.col, onFlag]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Render logic ────────────────────────────────────────────────

  let content: React.ReactNode = null;
  let cellClasses: string;

  if (cell.isRevealed) {
    if (cell.isMine) {
      // Revealed mine (game over)
      content = <span className="text-base">💣</span>;
      cellClasses =
        "bg-red-200 dark:bg-red-900/60 border-red-300 dark:border-red-700";
    } else if (cell.adjacentMines > 0) {
      // Numbered cell
      content = (
        <span className={`font-bold select-none ${NUMBER_COLORS[cell.adjacentMines] || "text-foreground"}`}>
          {cell.adjacentMines}
        </span>
      );
      cellClasses =
        "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700";
    } else {
      // Empty cell (0 neighbours)
      cellClasses =
        "bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/50";
    }
  } else if (cell.isFlagged) {
    content = <span className="text-base select-none">🚩</span>;
    cellClasses =
      "bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 cursor-pointer hover:brightness-95";
  } else {
    // Unrevealed
    cellClasses =
      "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 border-emerald-300 dark:border-emerald-700/60 cursor-pointer hover:from-emerald-200 hover:to-teal-200 dark:hover:from-emerald-800/50 dark:hover:to-teal-800/50 active:scale-95";
  }

  // When game is lost and this unrevealed mine wasn't flagged, highlight it
  if (gameOver && cell.isMine && !cell.isRevealed && !cell.isFlagged) {
    content = <span className="text-base opacity-60">💣</span>;
    cellClasses =
      "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800";
  }

  // Wrongly placed flag (game over, flagged but not a mine)
  if (gameOver && cell.isFlagged && !cell.isMine) {
    content = <span className="text-base line-through opacity-60">🚩</span>;
    cellClasses =
      "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      disabled={gameOver}
      style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.45 }}
      className={`
        inline-flex items-center justify-center
        border rounded-[3px]
        transition-all duration-100
        ${cellClasses}
        ${gameOver ? "cursor-default" : ""}
      `}
      aria-label={`Cell ${cell.row},${cell.col}`}
    >
      {content}
    </button>
  );
});
