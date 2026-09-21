/**
 * Line 98 — Core Algorithms
 *
 * Implements:
 * 1. BFS pathfinding on a 9x9 grid (validates clear paths for ball movement)
 * 2. Multi-axis line detection (H, V, Diag-Right, Diag-Left) with intersection deduplication
 * 3. Advanced scoring: base points + length bonus + combo multiplier
 */

import {
  Cell,
  Coord,
  MatchResult,
  BOARD_SIZE,
  MIN_LINE_LENGTH,
  BASE_SCORE_PER_BALL,
  BallColor,
} from "./types";

// ─── Coordinate Helpers ──────────────────────────────────────────────

/** Serialise a coordinate for Set membership. */
export function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** Parse a serialised coordinate key back to a Coord. */
export function parseCoordKey(key: string): Coord {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

/** Check whether a coordinate is within the 9x9 board. */
function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// ─── BFS Pathfinding ─────────────────────────────────────────────────

/**
 * BFS to find a clear path between `from` and `to` on the board.
 *
 * A cell is passable if it is `null` (empty). The source cell is treated
 * as passable (the ball being moved).
 *
 * @returns The ordered path (including start and end) if one exists, or
 *          `null` if no clear path is available.
 */
export function findPath(
  board: Cell[][],
  from: Coord,
  to: Coord
): Coord[] | null {
  // Trivial case: clicking the same cell
  if (from.row === to.row && from.col === to.col) return [from];

  // Destination must be empty
  if (board[to.row][to.col] !== null) return null;

  // 4-directional movement (up, down, left, right)
  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  const visited = new Set<string>();
  const parent = new Map<string, string | null>();
  const queue: Coord[] = [];

  const startKey = coordKey(from.row, from.col);
  const endKey = coordKey(to.row, to.col);

  visited.add(startKey);
  parent.set(startKey, null);
  queue.push(from);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = coordKey(current.row, current.col);

    if (currentKey === endKey) {
      // Reconstruct path
      const path: Coord[] = [];
      let traceKey: string | null = endKey;
      while (traceKey !== null) {
        path.push(parseCoordKey(traceKey));
        traceKey = parent.get(traceKey) ?? null;
      }
      return path.reverse();
    }

    for (const [dr, dc] of directions) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (!inBounds(nr, nc)) continue;

      const nKey = coordKey(nr, nc);
      if (visited.has(nKey)) continue;

      // Cell must be empty (or the destination) to be passable
      if (board[nr][nc] !== null && nKey !== endKey) continue;

      visited.add(nKey);
      parent.set(nKey, currentKey);
      queue.push({ row: nr, col: nc });
    }
  }

  // No path found
  return null;
}

// ─── Multi-Axis Line Detection ───────────────────────────────────────

/**
 * The 4 scanning axes, each represented as a [dr, dc] direction vector.
 * For each axis we scan in both the positive and negative directions
 * from the target cell.
 *
 * Horizontal (→), Vertical (↓), Diagonal-Right (↘), Diagonal-Left (↙)
 */
const AXES: [number, number][] = [
  [0, 1], // Horizontal
  [1, 0], // Vertical
  [1, 1], // Diagonal-Right (↘)
  [1, -1], // Diagonal-Left (↙)
];

/**
 * Scan a single axis for a contiguous line of same-color balls passing
 * through `(row, col)`.
 *
 * Extends in both the positive and negative directions of the given
 * `[dr, dc]` vector, collecting all matching cells.
 *
 * @returns Array of coordinate keys forming the contiguous line.
 */
function scanAxis(
  board: Cell[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  color: BallColor
): string[] {
  const cells: string[] = [coordKey(row, col)];

  // Scan in the positive direction
  for (let step = 1; ; step++) {
    const nr = row + dr * step;
    const nc = col + dc * step;
    if (!inBounds(nr, nc) || board[nr][nc] !== color) break;
    cells.push(coordKey(nr, nc));
  }

  // Scan in the negative direction
  for (let step = 1; ; step++) {
    const nr = row - dr * step;
    const nc = col - dc * step;
    if (!inBounds(nr, nc) || board[nr][nc] !== color) break;
    cells.push(coordKey(nr, nc));
  }

  return cells;
}

/**
 * After a ball is placed at `(row, col)`, detect all lines of >= 5
 * same-color balls passing through that cell across all 4 axes.
 *
 * ## Scoring Algorithm
 *
 * 1. **Base score**: 10 points per matched ball.
 * 2. **Length bonus**: For each ball beyond 5, add incremental extra
 *    points: 6th ball → +20, 7th → +30, 8th → +40, etc.
 * 3. **Combo bonus**: If 2+ distinct axes produced valid lines
 *    (intersecting lines at the target cell), multiply the total
 *    score by 2.
 *
 * All matched balls across all axes are merged into a single `Set`
 * to avoid double-counting the intersection ball.
 *
 * @returns MatchResult with the matched set, score, and line count.
 *          Returns `{ matched: new Set(), score: 0, lineCount: 0 }`
 *          if no valid lines are found.
 */
export function detectMatches(
  board: Cell[][],
  row: number,
  col: number
): MatchResult {
  const color = board[row][col];

  // No ball at the target — no match possible
  if (color === null) {
    return { matched: new Set(), score: 0, lineCount: 0 };
  }

  const allMatched = new Set<string>();
  let lineCount = 0;

  for (const [dr, dc] of AXES) {
    const lineCells = scanAxis(board, row, col, dr, dc, color);

    if (lineCells.length >= MIN_LINE_LENGTH) {
      lineCount++;
      for (const key of lineCells) {
        allMatched.add(key);
      }
    }
  }

  if (allMatched.size < MIN_LINE_LENGTH) {
    return { matched: new Set(), score: 0, lineCount: 0 };
  }

  // ── Score calculation ──────────────────────────────────────────────
  const totalBalls = allMatched.size;

  // Base score: 10 pts per ball
  let score = totalBalls * BASE_SCORE_PER_BALL;

  // Length bonus: for each ball beyond 5 → +20, +30, +40, ...
  // i.e., for ball index i (0-based) where i >= 5:
  //   bonus for that ball = (i - 4) * 10 extra
  // But since balls are merged, we compute based on total unique balls:
  if (totalBalls > MIN_LINE_LENGTH) {
    for (let extra = 1; extra <= totalBalls - MIN_LINE_LENGTH; extra++) {
      score += (extra + 1) * 10; // 6th ball: +20, 7th: +30, 8th: +40, ...
    }
  }

  // Combo bonus: 2+ intersecting lines → 2× multiplier
  if (lineCount >= 2) {
    score *= 2;
  }

  return { matched: allMatched, score, lineCount };
}

// ─── Board Utilities ─────────────────────────────────────────────────

/**
 * Create an empty 9x9 board.
 */
export function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

/**
 * Deep-clone a board for immutable state updates.
 */
export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => [...row]);
}

/**
 * Get all empty cell coordinates on the board.
 */
export function getEmptyCells(board: Cell[][]): Coord[] {
  const cells: Coord[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

/**
 * Fisher-Yates shuffle (in-place).
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
