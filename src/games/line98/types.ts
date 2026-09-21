/**
 * Core type definitions for the Line 98 (Color Lines) game.
 */

/** The 7 distinct ball colors available in the game. */
export type BallColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "cyan"
  | "orange";

/** All possible ball colors as an array for random selection. */
export const BALL_COLORS: BallColor[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "cyan",
  "orange",
];

/** A cell on the 9x9 board: null means empty, otherwise contains a ball color. */
export type Cell = BallColor | null;

/** Row/column coordinate on the grid (0-indexed, 0..8). */
export interface Coord {
  row: number;
  col: number;
}

/** Result of the multi-axis line matching algorithm. */
export interface MatchResult {
  /** Set of serialised coordinates ("row,col") of all matched balls. */
  matched: Set<string>;
  /** Total calculated score for this match (base + length bonus + combo). */
  score: number;
  /** Number of distinct lines formed (used for combo detection). */
  lineCount: number;
}

/** Result of a complete move (move ball + check matches + optional spawn). */
export interface MoveResult {
  /** Whether a valid path existed and the move was executed. */
  moved: boolean;
  /** Match result if lines were formed, null otherwise. */
  match: MatchResult | null;
  /** Whether new balls were spawned (only when no match). */
  spawned: boolean;
  /** Whether the game ended (board full after spawn). */
  gameOver: boolean;
}

/** Board dimensions. */
export const BOARD_SIZE = 9;

/** Minimum number of balls in a line for a valid match. */
export const MIN_LINE_LENGTH = 5;

/** Number of balls to spawn per turn. */
export const SPAWN_COUNT = 3;

/** Base score per matched ball. */
export const BASE_SCORE_PER_BALL = 10;
