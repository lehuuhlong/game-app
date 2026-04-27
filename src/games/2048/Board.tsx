"use client";

import { useMemo } from "react";
import { TileComponent } from "./Tile";
import type { Tile } from "./types";

interface BoardProps {
  tiles: Tile[];
  gridSize: number;
}

// Use a single base size — CSS will scale the board on small screens
const CELL_SIZE = 80;
const GAP = 10;

export function Board({ tiles, gridSize }: BoardProps) {
  const { totalSize, cellSize, gap } = useMemo(() => {
    const cs = CELL_SIZE;
    const g = GAP;
    const total = gridSize * cs + (gridSize + 1) * g;
    return { totalSize: total, cellSize: cs, gap: g };
  }, [gridSize]);

  // Build empty cell backgrounds
  const emptyCells = useMemo(() => {
    const cells = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  }, [gridSize]);

  return (
    <div className="flex items-center justify-center">
      {/* Single board — CSS scales it down on small screens */}
      <div
        className="relative rounded-xl bg-[#bbada0] dark:bg-[#4a4458] origin-top scale-[0.75] sm:scale-100"
        style={{ width: totalSize, height: totalSize }}
      >
        {/* Empty cell placeholders */}
        {emptyCells.map(({ row, col }) => (
          <div
            key={`empty-${row}-${col}`}
            className="absolute rounded-lg bg-[#cdc1b4]/60 dark:bg-[#635b6f]/50"
            style={{
              width: cellSize,
              height: cellSize,
              left: col * (cellSize + gap) + gap,
              top: row * (cellSize + gap) + gap,
            }}
          />
        ))}
        {/* Tiles — single render, no duplicates */}
        {tiles.map((tile) => (
          <TileComponent
            key={tile.id}
            tile={tile}
            cellSize={cellSize}
            gap={gap}
          />
        ))}
      </div>
    </div>
  );
}
