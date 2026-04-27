/**
 * Caro (Gomoku) type definitions.
 */

export type CellValue = "X" | "O" | null;

export type Player = "X" | "O";

export interface Move {
  row: number;
  col: number;
  player: Player;
  moveNumber: number;
}

export interface WinResult {
  winner: Player;
  /** The 5 (or more) winning cells */
  cells: { row: number; col: number }[];
}

export interface CaroConfig {
  gridSize: number;
  winLength: number;
  /** 
   * If true, a row of exactly `winLength` that is blocked on both ends
   * does NOT count as a win ("chặn 2 đầu" rule).
   */
  blockedEndsRule: boolean;
}

export interface CaroGameState {
  board: CellValue[][];
  currentPlayer: Player;
  moves: Move[];
  winner: Player | "draw" | null;
  winningCells: { row: number; col: number }[];
  gameStatus: "playing" | "finished";
  config: CaroConfig;
}

/** 
 * The move handler signature — designed so it can be swapped
 * from local state update to Socket.io emit without changing
 * the component interface.
 */
export type MoveHandler = (row: number, col: number) => void;
