import { TileType } from "./types";

export const TILE_SIZE = 24;
export const MAZE_COLS = 19;
export const MAZE_ROWS = 21;

export const CANVAS_WIDTH = MAZE_COLS * TILE_SIZE; // 456px
export const CANVAS_HEIGHT = MAZE_ROWS * TILE_SIZE; // 504px

/**
 * 19 columns x 21 rows static arcade maze map.
 * 0 = Empty corridor / Chaser base
 * 1 = Wall
 * 2 = Normal Pellet (10 pts)
 * 3 = Power-Pellet (50 pts, activates Frightened mode)
 */
export const INITIAL_MAZE_MAP: TileType[][] = [
  // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Row 0
  [1, 3, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 3, 1], // Row 1
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1], // Row 2
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1], // Row 3
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 4
  [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1], // Row 5
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1], // Row 6
  [1, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 1], // Row 7
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0], // Row 8 - Side tunnel entrance
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 0, 1, 1, 0, 1, 2, 1, 1, 1, 1], // Row 9 - Chaser base door
  [0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0], // Row 10 - Wrap-around tunnel
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1], // Row 11 - Chaser base bottom
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0], // Row 12
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1], // Row 13
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1], // Row 14
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1], // Row 15
  [1, 3, 2, 1, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 1, 2, 3, 1], // Row 16 - Muncher start at (col 9, row 16)
  [1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1], // Row 17
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1], // Row 18
  [1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1], // Row 19
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Row 20
];

export const MUNCHER_START_POS = { col: 9, row: 16 };
export const CHASER_BASE_POS = { col: 9, row: 10 };

export const MUNCHER_SPEED = 2.4;
export const MUNCHER_RADIUS = 10;
export const TURN_THRESHOLD = 6;

export const CHASER_SPEED = 1.95;
export const CHASER_FRIGHTENED_SPEED = 1.15;
export const CHASER_RADIUS = 10;

export const INITIAL_CHASERS = [
  {
    id: 0,
    name: "Crimson",
    color: "#ef4444",
    baseCol: 9,
    baseRow: 8, // starts just outside the gate ready to roam!
    isInBase: false,
    spawnDelay: 0,
  },
  {
    id: 1,
    name: "Pinky",
    color: "#ec4899",
    baseCol: 8,
    baseRow: 10, // starts inside base, leaves shortly
    isInBase: true,
    spawnDelay: 2000,
  },
  {
    id: 2,
    name: "Azure",
    color: "#06b6d4",
    baseCol: 10,
    baseRow: 10, // starts inside base, leaves after 4s
    isInBase: true,
    spawnDelay: 4500,
  },
];

export const PALETTE = {
  bg: "#080b14",
  wallStroke: "#3b82f6",
  wallFill: "rgba(30, 58, 138, 0.28)",
  wallGlow: "rgba(59, 130, 246, 0.4)",
  door: "rgba(236, 72, 153, 0.7)",
  pellet: "#facc15",
  pelletGlow: "rgba(250, 204, 21, 0.6)",
  powerPellet: "#ffffff",
  powerPelletRing: "#f59e0b",
  powerPelletGlow: "rgba(245, 158, 11, 0.8)",
  muncher: "#facc15",
  chaserNormal: ["#ef4444", "#ec4899", "#06b6d4"],
  chaserFrightened: "#3b82f6",
  chaserFrightenedFlash: "#ffffff",
};
