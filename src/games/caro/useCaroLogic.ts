/**
 * useCaroLogic — custom hook for Caro (Gomoku) game mechanics.
 *
 * Features:
 * - Configurable grid size (default 15×15)
 * - Turn-based X / O play
 * - Win detection: 5-in-a-row (horizontal, vertical, diagonal)
 * - "Chặn 2 đầu" (blocked-at-both-ends) rule support
 * - Draw detection (board full, no winner)
 * - Move history tracking
 * - Socket.io-ready: the handleMove function can be replaced
 *   with a socket emit in online mode
 */

"use client";

import { useState, useCallback } from "react";
import type {
  CellValue,
  Player,
  Move,
  WinResult,
  CaroConfig,
  CaroGameState,
  MoveHandler,
} from "./types";

const DEFAULT_CONFIG: CaroConfig = {
  gridSize: 15,
  winLength: 5,
  blockedEndsRule: true,
};

// ── Helpers ───────────────────────────────────────────────────────

function createEmptyBoard(size: number): CellValue[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

// ── Win Detection ─────────────────────────────────────────────────

/** Direction vectors: horizontal, vertical, diagonal-down-right, diagonal-down-left */
const DIRECTIONS: [number, number][] = [
  [0, 1],   // horizontal →
  [1, 0],   // vertical ↓
  [1, 1],   // diagonal ↘
  [1, -1],  // diagonal ↙
];

/**
 * Check if placing `player` at (row, col) creates a winning line.
 * 
 * With blockedEndsRule=true:
 *   A line of exactly `winLength` consecutive marks that has the
 *   opponent's mark (or board edge) on BOTH ends does NOT win.
 *   A line of >winLength always wins.
 */
function checkWin(
  board: CellValue[][],
  row: number,
  col: number,
  player: Player,
  config: CaroConfig
): WinResult | null {
  const { gridSize, winLength, blockedEndsRule } = config;

  for (const [dr, dc] of DIRECTIONS) {
    // Count consecutive marks in both directions from (row, col)
    const cells: { row: number; col: number }[] = [{ row, col }];

    // Forward
    let r = row + dr;
    let c = col + dc;
    while (
      r >= 0 && r < gridSize &&
      c >= 0 && c < gridSize &&
      board[r][c] === player
    ) {
      cells.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    // `r, c` is now the cell just past the forward end
    const forwardEnd = { row: r, col: c };

    // Backward
    r = row - dr;
    c = col - dc;
    while (
      r >= 0 && r < gridSize &&
      c >= 0 && c < gridSize &&
      board[r][c] === player
    ) {
      cells.unshift({ row: r, col: c });
      r -= dr;
      c -= dc;
    }
    // `r, c` is now the cell just past the backward end
    const backwardEnd = { row: r, col: c };

    const lineLength = cells.length;

    if (lineLength >= winLength) {
      // If blockedEndsRule is on and the line is exactly winLength,
      // check if both ends are blocked (opponent or edge)
      if (blockedEndsRule && lineLength === winLength) {
        const forwardBlocked = isBlocked(board, forwardEnd.row, forwardEnd.col, player, gridSize);
        const backwardBlocked = isBlocked(board, backwardEnd.row, backwardEnd.col, player, gridSize);

        if (forwardBlocked && backwardBlocked) {
          // Both ends blocked — not a win
          continue;
        }
      }

      return { winner: player, cells };
    }
  }

  return null;
}

/** A position is "blocked" if it's off the board or occupied by the opponent */
function isBlocked(
  board: CellValue[][],
  row: number,
  col: number,
  player: Player,
  gridSize: number
): boolean {
  if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) return true;
  return board[row][col] !== null && board[row][col] !== player;
}

function isBoardFull(board: CellValue[][]): boolean {
  return board.every((row) => row.every((cell) => cell !== null));
}

// ── Hook ──────────────────────────────────────────────────────────

export function useCaroLogic(configOverride?: Partial<CaroConfig>) {
  const config: CaroConfig = { ...DEFAULT_CONFIG, ...configOverride };

  const [state, setState] = useState<CaroGameState>(() => ({
    board: createEmptyBoard(config.gridSize),
    currentPlayer: "X",
    moves: [],
    winner: null,
    winningCells: [],
    gameStatus: "playing",
    config,
  }));

  /**
   * Handle a move at (row, col).
   *
   * In local mode, this directly updates state.
   * In online mode, this would emit a Socket.io event instead,
   * and the state update would come from the server broadcast.
   *
   * To switch to online mode:
   *   const handleMove = useCallback((row, col) => {
   *     socket.emit("make_move", { roomId, x: row, y: col, player: state.currentPlayer });
   *   }, [state.currentPlayer]);
   */
  const handleMove: MoveHandler = useCallback(
    (row: number, col: number) => {
      setState((prev) => {
        // Guard: game over or cell occupied
        if (prev.gameStatus !== "playing") return prev;
        if (prev.board[row][col] !== null) return prev;

        // Place the mark
        const newBoard = prev.board.map((r) => [...r]);
        newBoard[row][col] = prev.currentPlayer;

        const move: Move = {
          row,
          col,
          player: prev.currentPlayer,
          moveNumber: prev.moves.length + 1,
        };

        // Check for win
        const winResult = checkWin(
          newBoard,
          row,
          col,
          prev.currentPlayer,
          prev.config
        );

        if (winResult) {
          return {
            ...prev,
            board: newBoard,
            moves: [...prev.moves, move],
            winner: winResult.winner,
            winningCells: winResult.cells,
            gameStatus: "finished",
          };
        }

        // Check for draw
        if (isBoardFull(newBoard)) {
          return {
            ...prev,
            board: newBoard,
            moves: [...prev.moves, move],
            winner: "draw",
            winningCells: [],
            gameStatus: "finished",
          };
        }

        // Continue playing
        return {
          ...prev,
          board: newBoard,
          currentPlayer: prev.currentPlayer === "X" ? "O" : "X",
          moves: [...prev.moves, move],
        };
      });
    },
    []
  );

  const restart = useCallback(() => {
    setState({
      board: createEmptyBoard(config.gridSize),
      currentPlayer: "X",
      moves: [],
      winner: null,
      winningCells: [],
      gameStatus: "playing",
      config,
    });
  }, [config]);

  const undoLastMove = useCallback(() => {
    setState((prev) => {
      if (prev.moves.length === 0) return prev;

      const newMoves = prev.moves.slice(0, -1);
      const newBoard = createEmptyBoard(prev.config.gridSize);

      // Replay all moves except the last
      for (const m of newMoves) {
        newBoard[m.row][m.col] = m.player;
      }

      const lastMove = prev.moves[prev.moves.length - 1];

      return {
        ...prev,
        board: newBoard,
        currentPlayer: lastMove.player,
        moves: newMoves,
        winner: null,
        winningCells: [],
        gameStatus: "playing",
      };
    });
  }, []);

  return {
    ...state,
    handleMove,
    restart,
    undoLastMove,
  };
}
