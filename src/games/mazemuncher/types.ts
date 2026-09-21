export type TileType = 0 | 1 | 2 | 3;
// 0: Empty / path corridor
// 1: Wall
// 2: Normal Pellet
// 3: Power-Pellet

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE";

export interface Position {
  x: number;
  y: number;
}

export interface GridCoord {
  col: number;
  row: number;
}

export interface EngineConfig {
  cols: number;
  rows: number;
  tileSize: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface MuncherEntity {
  x: number;
  y: number;
  dir: Direction;
  bufferedDir: Direction;
  speed: number;
  isMoving: boolean;
  radius: number;
}

export type ChaserState = "CHASE" | "FRIGHTENED" | "RESPAWNING";

export interface ChaserEntity {
  id: number;
  name: string;
  x: number;
  y: number;
  dir: Direction;
  state: ChaserState;
  color: string;
  speed: number;
  radius: number;
  baseCol: number;
  baseRow: number;
  isInBase: boolean;
  spawnDelay: number;
}

export interface FloatingParticle {
  x: number;
  y: number;
  vy: number;
  text?: string;
  color: string;
  alpha: number;
  scale: number;
  lifetime: number;
  age: number;
}

export interface GameState {
  score: number;
  highScore: number;
  lives: number;
  pelletsRemaining: number;
  totalPellets: number;
  isGameOver: boolean;
  isGameWon: boolean;
  isFrightened: boolean;
  frightenedTimeRemaining: number;
  isPaused: boolean;
  gameStarted: boolean;
}
