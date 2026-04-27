/**
 * 2048 type definitions.
 */

export interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  /** Set to true on the frame when two tiles merged into this one */
  mergedFrom: boolean;
  /** Set to true on the frame this tile was just spawned */
  isNew: boolean;
}

export type Grid = (Tile | null)[][];

export type Direction = "up" | "down" | "left" | "right";

export interface GameState {
  grid: Grid;
  tiles: Tile[];
  score: number;
  bestScore: number;
  gameStatus: "playing" | "won" | "lost";
  /** Whether the player chose to continue after hitting 2048 */
  keepPlaying: boolean;
  moveCount: number;
}
