/**
 * Types and interfaces for Neon Snake engine.
 */

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export interface Point {
  x: number;
  y: number;
}

export type GameStatus = "IDLE" | "PLAYING" | "PAUSED" | "GAME_OVER";

export type GameOverReason = "WALL_COLLISION" | "SELF_COLLISION" | "VICTORY";

export interface SnakeGameState {
  score: number;
  highScore: number;
  status: GameStatus;
  speed: number;
  gameOverReason?: GameOverReason | null;
}

export interface SnakeEngineConfig {
  gridSize: number;
  tileSize: number;
  initialTickRate: number;
  minTickRate: number;
  speedStep: number;
}
