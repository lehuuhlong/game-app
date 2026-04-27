"use client";

import { useMemo } from "react";
import { Cell } from "./Cell";
import type { CellValue, MoveHandler, Move } from "./types";

interface CaroBoardProps {
  board: CellValue[][];
  gridSize: number;
  winningCells: { row: number; col: number }[];
  lastMove: Move | null;
  onCellClick: MoveHandler;
  disabled: boolean;
}

export function CaroBoard({
  board,
  gridSize,
  winningCells,
  lastMove,
  onCellClick,
  disabled,
}: CaroBoardProps) {
  // Create a set for O(1) winning cell lookups
  const winSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of winningCells) {
      s.add(`${c.row}-${c.col}`);
    }
    return s;
  }, [winningCells]);

  return (
    <div className="relative overflow-auto">
      <div
        className="inline-grid bg-surface border border-border rounded-lg shadow-lg"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(28px, 36px))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(28px, 36px))`,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              value={cell}
              row={r}
              col={c}
              isWinning={winSet.has(`${r}-${c}`)}
              isLastMove={lastMove?.row === r && lastMove?.col === c}
              onClick={() => onCellClick(r, c)}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
}
