/**
 * use2048Logic — custom hook encapsulating all 2048 game mechanics.
 *
 * Features:
 * - 4×4 grid with tile spawning (90% → 2, 10% → 4)
 * - Slide + merge in all four directions
 * - Score tracking with LocalStorage best score
 * - Win detection (reaching 2048) with "continue playing" option
 * - Game-over detection (no valid moves remaining)
 * - Undo not implemented (can be added later)
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Tile, Grid, Direction, GameState } from "./types";

const GRID_SIZE = 4;
const WIN_VALUE = 2048;
const STORAGE_KEY = "game-2048-best";

let tileIdCounter = 0;
function nextTileId(): string {
  return `tile-${++tileIdCounter}-${Date.now()}`;
}

// ── Helpers ───────────────────────────────────────────────────────

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function getEmptyCells(grid: Grid): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function spawnTile(grid: Grid): Tile | null {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return null;
  const { row, col } = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const tile: Tile = {
    id: nextTileId(),
    value,
    row,
    col,
    mergedFrom: false,
    isNew: true,
  };
  grid[row][col] = tile;
  return tile;
}

function collectTiles(grid: Grid): Tile[] {
  const tiles: Tile[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c]) tiles.push(grid[r][c]!);
    }
  }
  return tiles;
}

// ── Core slide logic ──────────────────────────────────────────────

/**
 * Slides a single row to the left (the canonical direction).
 * Returns [newRow, scoreGained, didChange].
 */
function slideRowLeft(
  row: (Tile | null)[]
): [(Tile | null)[], number, boolean] {
  // 1. Compact: remove nulls
  const compacted = row.filter(Boolean) as Tile[];
  const result: (Tile | null)[] = [];
  let scoreGained = 0;
  let didChange = false;
  let i = 0;

  while (i < compacted.length) {
    if (i + 1 < compacted.length && compacted[i].value === compacted[i + 1].value) {
      // Merge
      const merged: Tile = {
        id: nextTileId(),
        value: compacted[i].value * 2,
        row: 0, // will be set later
        col: 0,
        mergedFrom: true,
        isNew: false,
      };
      scoreGained += merged.value;
      result.push(merged);
      didChange = true;
      i += 2;
    } else {
      result.push({ ...compacted[i], mergedFrom: false, isNew: false });
      i += 1;
    }
  }

  // Pad with nulls
  while (result.length < GRID_SIZE) {
    result.push(null);
  }

  // Check if positions changed
  if (!didChange) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const oldVal = row[c]?.value ?? null;
      const newVal = result[c]?.value ?? null;
      if (oldVal !== newVal) {
        didChange = true;
        break;
      }
    }
  }

  return [result, scoreGained, didChange];
}

function slideGrid(
  grid: Grid,
  direction: Direction
): { newGrid: Grid; scoreGained: number; moved: boolean } {
  let rotated = cloneGrid(grid);
  const rotations = { left: 0, up: 3, right: 2, down: 1 }[direction];

  // Rotate so we always slide left
  for (let r = 0; r < rotations; r++) {
    rotated = rotateClockwise(rotated);
  }

  let totalScore = 0;
  let moved = false;

  for (let r = 0; r < GRID_SIZE; r++) {
    const [newRow, score, didChange] = slideRowLeft(rotated[r]);
    // Set correct positions
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newRow[c]) {
        newRow[c]!.row = r;
        newRow[c]!.col = c;
      }
    }
    rotated[r] = newRow;
    totalScore += score;
    if (didChange) moved = true;
  }

  // Rotate back
  for (let r = 0; r < (4 - rotations) % 4; r++) {
    rotated = rotateClockwise(rotated);
  }

  // Fix row/col after rotation back
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (rotated[r][c]) {
        rotated[r][c]!.row = r;
        rotated[r][c]!.col = c;
      }
    }
  }

  return { newGrid: rotated, scoreGained: totalScore, moved };
}

function rotateClockwise(grid: Grid): Grid {
  const n = GRID_SIZE;
  const result = createEmptyGrid();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[c][n - 1 - r] = grid[r][c] ? { ...grid[r][c]! } : null;
    }
  }
  return result;
}

// ── Game-over check ───────────────────────────────────────────────

function canMove(grid: Grid): boolean {
  if (getEmptyCells(grid).length > 0) return true;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = grid[r][c]?.value;
      if (c + 1 < GRID_SIZE && grid[r][c + 1]?.value === val) return true;
      if (r + 1 < GRID_SIZE && grid[r + 1][c]?.value === val) return true;
    }
  }
  return false;
}

function hasWon(grid: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] && grid[r][c]!.value >= WIN_VALUE) return true;
    }
  }
  return false;
}

function getMaxTile(grid: Grid): number {
  let max = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] && grid[r][c]!.value > max) max = grid[r][c]!.value;
    }
  }
  return max;
}

// ── Hook ──────────────────────────────────────────────────────────

function loadBestScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function saveBestScore(score: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Ignore storage errors
  }
}

function createEmptyState(): GameState {
  return {
    grid: createEmptyGrid(),
    tiles: [],
    score: 0,
    bestScore: 0,
    gameStatus: "playing",
    keepPlaying: false,
    moveCount: 0,
    winTile: 0,
    nextMilestone: WIN_VALUE,
  };
}

function initGame(): GameState {
  const grid = createEmptyGrid();
  spawnTile(grid);
  spawnTile(grid);
  return {
    grid,
    tiles: collectTiles(grid),
    score: 0,
    bestScore: loadBestScore(),
    gameStatus: "playing",
    keepPlaying: false,
    moveCount: 0,
    winTile: 0,
    nextMilestone: WIN_VALUE,
  };
}

export function use2048Logic() {
  // Start with empty state to avoid hydration mismatch (no randomness on server)
  const [state, setState] = useState<GameState>(createEmptyState);
  const isAnimating = useRef(false);
  const pendingMove = useRef<Direction | null>(null);
  const initialized = useRef(false);

  // Initialize the game on the client only
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setState(initGame());
    }
  }, []);

  // Process a single direction against state — pure, no side effects
  const applyMove = useCallback((direction: Direction) => {
    setState((prev) => {
      if (prev.gameStatus === "lost") return prev;
      if (prev.gameStatus === "won" && !prev.keepPlaying) return prev;

      const { newGrid, scoreGained, moved } = slideGrid(prev.grid, direction);
      if (!moved) return prev;

      spawnTile(newGrid);

      const newScore = prev.score + scoreGained;
      const newBest = Math.max(newScore, prev.bestScore);
      if (newBest > prev.bestScore) saveBestScore(newBest);

      const maxTile = getMaxTile(newGrid);
      let gameStatus: GameState["gameStatus"] = prev.gameStatus;
      let nextMilestone = prev.nextMilestone;

      if (!canMove(newGrid)) {
        // No moves left — game over regardless of score
        gameStatus = "lost";
      } else if (maxTile >= nextMilestone) {
        // Reached a new milestone → celebrate! (first time: 2048, then 4096, 8192…)
        gameStatus = "won";
        nextMilestone = nextMilestone * 2; // next milestone to watch for
      }

      return {
        grid: newGrid,
        tiles: collectTiles(newGrid),
        score: newScore,
        bestScore: newBest,
        gameStatus,
        keepPlaying: prev.keepPlaying,
        moveCount: prev.moveCount + 1,
        winTile: maxTile,
        nextMilestone,
      };
    });
  }, []);

  const move = useCallback((direction: Direction) => {
    if (isAnimating.current) {
      // Buffer the latest move — will be flushed when animation completes
      pendingMove.current = direction;
      return;
    }

    // Lock immediately (before setState to prevent any race in same tick)
    isAnimating.current = true;
    pendingMove.current = null;

    applyMove(direction);

    // Unlock after tile slide animation (matches 0.12s CSS transition in Tile.tsx)
    setTimeout(() => {
      const queued = pendingMove.current;
      pendingMove.current = null;
      isAnimating.current = false;

      // Flush buffered move immediately
      if (queued) {
        move(queued);
      }
    }, 120);
  }, [applyMove]);

  const restart = useCallback(() => {
    tileIdCounter = 0;
    setState(initGame());
  }, []);

  const continuePlaying = useCallback(() => {
    setState((prev) => ({
      ...prev,
      gameStatus: "playing",
      keepPlaying: true,
      // nextMilestone already advanced in applyMove
    }));
  }, []);

  return {
    ...state,
    move,
    restart,
    continuePlaying,
    gridSize: GRID_SIZE,
  };
}
