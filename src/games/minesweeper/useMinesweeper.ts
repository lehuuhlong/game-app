"use client";

/**
 * useMinesweeper — custom hook encapsulating all Minesweeper game mechanics.
 *
 * Features:
 * - Configurable difficulty (Beginner 9×9/10, Intermediate 16×16/40, Expert 16×30/99)
 * - First-click safety: mines are placed AFTER the first reveal, guaranteeing a safe start
 * - Flood-fill algorithm: revealing a 0-cell recursively reveals all connected 0-cells and borders
 * - Right-click / long-press flagging
 * - Win detection: all non-mine cells revealed
 * - Loss detection: a mine is revealed
 * - Timer: counts seconds from first click
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Board,
  Cell,
  Difficulty,
  GameStatus,
  MinesweeperState,
} from "./types";
import { DIFFICULTY_PRESETS } from "./types";

// ── Board Helpers ─────────────────────────────────────────────────

/** Create an empty board (no mines placed yet) */
function createEmptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c): Cell => ({
      row: r,
      col: c,
      isMine: false,
      adjacentMines: 0,
      isRevealed: false,
      isFlagged: false,
    }))
  );
}

/** Deep-clone a board so React detects state changes */
function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

/** Get all 8 neighbours of a cell (within bounds) */
function getNeighbours(board: Board, row: number, col: number): Cell[] {
  const neighbours: Cell[] = [];
  const rows = board.length;
  const cols = board[0].length;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbours.push(board[nr][nc]);
      }
    }
  }
  return neighbours;
}

/**
 * Place mines randomly on the board, excluding `safeRow`/`safeCol`
 * and its immediate neighbours (guaranteeing a safe 3×3 opening zone).
 */
function placeMines(
  board: Board,
  mineCount: number,
  safeRow: number,
  safeCol: number
): void {
  const rows = board.length;
  const cols = board[0].length;

  // Build exclusion set (safe zone = 3×3 around first click)
  const excluded = new Set<string>();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = safeRow + dr;
      const nc = safeCol + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        excluded.add(`${nr},${nc}`);
      }
    }
  }

  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (excluded.has(`${r},${c}`) || board[r][c].isMine) continue;
    board[r][c].isMine = true;
    placed++;
  }
}

/** Compute adjacentMines count for every cell */
function computeAdjacency(board: Board): void {
  const rows = board.length;
  const cols = board[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue;
      board[r][c].adjacentMines = getNeighbours(board, r, c).filter(
        (n) => n.isMine
      ).length;
    }
  }
}

/**
 * Flood-fill reveal starting from (row, col).
 * Reveals the cell and, if adjacentMines === 0, recursively reveals neighbours.
 * Returns the number of newly revealed cells.
 */
function floodFill(board: Board, row: number, col: number): number {
  const cell = board[row][col];
  if (cell.isRevealed || cell.isFlagged || cell.isMine) return 0;

  cell.isRevealed = true;
  let count = 1;

  if (cell.adjacentMines === 0) {
    for (const neighbour of getNeighbours(board, row, col)) {
      count += floodFill(board, neighbour.row, neighbour.col);
    }
  }

  return count;
}

/** Count total non-mine cells in the board */
function countSafeCells(rows: number, cols: number, mines: number): number {
  return rows * cols - mines;
}

/** Create a fresh initial state for a given difficulty */
function createInitialState(diff: Difficulty): MinesweeperState {
  const config = DIFFICULTY_PRESETS[diff];
  return {
    board: createEmptyBoard(config.rows, config.cols),
    gameStatus: "idle",
    difficulty: diff,
    mineCount: config.mines,
    flagCount: 0,
    revealedCount: 0,
    elapsedTime: 0,
  };
}

// ── Hook ──────────────────────────────────────────────────────────

export function useMinesweeper(initialDifficulty: Difficulty = "beginner") {
  const [state, setState] = useState<MinesweeperState>(() =>
    createInitialState(initialDifficulty)
  );

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsedTime: prev.elapsedTime + 1 }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  /**
   * Whether mines have been placed is tracked in STATE (not a ref) so
   * the setState updater is pure and safe under React Strict Mode.
   *
   * We store it as a derived boolean: if gameStatus is "idle", mines
   * have not been placed yet. Once we transition to "playing", they have.
   * This eliminates the ref entirely and avoids the Strict Mode double-invoke bug.
   */

  // ── Reveal Cell ─────────────────────────────────────────────────

  const revealCell = useCallback(
    (row: number, col: number) => {
      setState((prev) => {
        if (prev.gameStatus === "won" || prev.gameStatus === "lost") return prev;

        // Bounds check — safety for difficulty switch edge case
        if (row >= prev.board.length || col >= prev.board[0].length) return prev;

        // IMPORTANT: Clone the board fresh inside the updater so that
        // React Strict Mode double-invocations each get their own copy.
        const newBoard = cloneBoard(prev.board);
        const cell = newBoard[row][col];

        if (cell.isFlagged || cell.isRevealed) return prev;

        // First click (idle → playing): place mines, ensuring this cell is safe
        let newStatus: GameStatus = prev.gameStatus;
        if (prev.gameStatus === "idle") {
          placeMines(newBoard, prev.mineCount, row, col);
          computeAdjacency(newBoard);
          newStatus = "playing";
        }

        // Hit a mine → game over
        if (newBoard[row][col].isMine) {
          for (const boardRow of newBoard) {
            for (const c of boardRow) {
              if (c.isMine) c.isRevealed = true;
            }
          }
          return {
            ...prev,
            board: newBoard,
            gameStatus: "lost" as GameStatus,
          };
        }

        // Safe cell → flood fill
        const newReveals = floodFill(newBoard, row, col);
        const newRevealedCount = prev.revealedCount + newReveals;

        // Check win: all safe cells revealed
        const config = DIFFICULTY_PRESETS[prev.difficulty];
        const totalSafe = countSafeCells(config.rows, config.cols, config.mines);
        if (newRevealedCount >= totalSafe) {
          for (const boardRow of newBoard) {
            for (const c of boardRow) {
              if (c.isMine && !c.isFlagged) c.isFlagged = true;
            }
          }
          newStatus = "won";
        }

        return {
          ...prev,
          board: newBoard,
          gameStatus: newStatus,
          revealedCount: newRevealedCount,
          flagCount: newStatus === "won" ? prev.mineCount : prev.flagCount,
        };
      });
    },
    []
  );

  // Start/stop timer based on game status
  useEffect(() => {
    if (state.gameStatus === "playing") {
      startTimer();
    } else if (state.gameStatus === "won" || state.gameStatus === "lost") {
      stopTimer();
    }
  }, [state.gameStatus, startTimer, stopTimer]);

  // ── Toggle Flag ─────────────────────────────────────────────────

  const toggleFlag = useCallback((row: number, col: number) => {
    setState((prev) => {
      if (prev.gameStatus !== "playing" && prev.gameStatus !== "idle") return prev;

      const newBoard = cloneBoard(prev.board);
      const cell = newBoard[row][col];

      if (cell.isRevealed) return prev;

      cell.isFlagged = !cell.isFlagged;
      const flagDelta = cell.isFlagged ? 1 : -1;

      return {
        ...prev,
        board: newBoard,
        flagCount: prev.flagCount + flagDelta,
      };
    });
  }, []);

  // ── Chord (reveal neighbours around a number cell) ──────────────

  const chordReveal = useCallback((row: number, col: number) => {
    setState((prev) => {
      if (prev.gameStatus !== "playing") return prev;

      const cell = prev.board[row][col];
      if (!cell.isRevealed || cell.isMine || cell.adjacentMines === 0) return prev;

      const neighbours = getNeighbours(prev.board, row, col);
      const flaggedCount = neighbours.filter((n) => n.isFlagged).length;

      if (flaggedCount !== cell.adjacentMines) return prev;

      const newBoard = cloneBoard(prev.board);
      let newReveals = 0;
      let hitMine = false;

      for (const n of neighbours) {
        if (n.isFlagged || n.isRevealed) continue;
        if (newBoard[n.row][n.col].isMine) {
          hitMine = true;
          for (const boardRow of newBoard) {
            for (const c of boardRow) {
              if (c.isMine) c.isRevealed = true;
            }
          }
          break;
        }
        newReveals += floodFill(newBoard, n.row, n.col);
      }

      if (hitMine) {
        return {
          ...prev,
          board: newBoard,
          gameStatus: "lost" as GameStatus,
        };
      }

      const newRevealedCount = prev.revealedCount + newReveals;
      const config = DIFFICULTY_PRESETS[prev.difficulty];
      const totalSafe = countSafeCells(config.rows, config.cols, config.mines);
      let newStatus: GameStatus = prev.gameStatus;

      if (newRevealedCount >= totalSafe) {
        for (const boardRow of newBoard) {
          for (const c of boardRow) {
            if (c.isMine && !c.isFlagged) c.isFlagged = true;
          }
        }
        newStatus = "won";
      }

      return {
        ...prev,
        board: newBoard,
        gameStatus: newStatus,
        revealedCount: newRevealedCount,
        flagCount: newStatus === "won" ? prev.mineCount : prev.flagCount,
      };
    });
  }, []);

  // ── Restart ─────────────────────────────────────────────────────

  const restart = useCallback(
    (difficulty?: Difficulty) => {
      stopTimer();
      const diff = difficulty || state.difficulty;
      setState(createInitialState(diff));
    },
    [state.difficulty, stopTimer]
  );

  // ── Change Difficulty ───────────────────────────────────────────

  const changeDifficulty = useCallback(
    (difficulty: Difficulty) => {
      restart(difficulty);
    },
    [restart]
  );

  // ── Is the game in-progress? (for confirmation dialog) ─────────

  const isGameInProgress = state.gameStatus === "playing";

  return {
    ...state,
    revealCell,
    toggleFlag,
    chordReveal,
    restart,
    changeDifficulty,
    remainingMines: state.mineCount - state.flagCount,
    isGameInProgress,
  };
}
