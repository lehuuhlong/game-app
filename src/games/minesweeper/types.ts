/**
 * Minesweeper type definitions.
 */

/** Difficulty presets */
export type Difficulty = "beginner" | "intermediate" | "expert";

export interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
  label: string;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyConfig> = {
  beginner:     { rows: 9,  cols: 9,  mines: 10, label: "Beginner" },
  intermediate: { rows: 16, cols: 16, mines: 40, label: "Intermediate" },
  expert:       { rows: 16, cols: 30, mines: 99, label: "Expert" },
};

/** State of a single cell */
export interface Cell {
  /** Row index */
  row: number;
  /** Col index */
  col: number;
  /** Whether this cell contains a mine */
  isMine: boolean;
  /** Number of adjacent mines (0-8). Only meaningful if !isMine */
  adjacentMines: number;
  /** Whether the cell has been revealed by the player */
  isRevealed: boolean;
  /** Whether the player placed a flag here */
  isFlagged: boolean;
}

export type Board = Cell[][];

export type GameStatus = "idle" | "playing" | "won" | "lost";

export interface MinesweeperState {
  board: Board;
  gameStatus: GameStatus;
  difficulty: Difficulty;
  mineCount: number;
  flagCount: number;
  revealedCount: number;
  /** Elapsed seconds since first click */
  elapsedTime: number;
}
