import { Cell, Point, PathResult } from './types';

/**
 * Checks if a point (r, c) is passable.
 * Cells outside the board (-1 or rows/cols boundaries) are always passable (empty border).
 * Inside the board, a cell is passable if its tile is null, or if it matches targetPoint.
 */
export function isPassable(
  board: Cell[][],
  rows: number,
  cols: number,
  r: number,
  c: number,
  targetPoint?: Point
): boolean {
  // Outside border is always empty space
  if (r < 0 || r >= rows || c < 0 || c >= cols) {
    return true;
  }

  // If this point is the destination tile, it is allowed
  if (targetPoint && r === targetPoint.r && c === targetPoint.c) {
    return true;
  }

  return board[r][c].tile === null;
}

/**
 * Checks if there is a straight, unobstructed line between two points (same row or same col).
 * Does not check endpoints themselves, only intermediate cells.
 */
export function isStraightLineClear(
  board: Cell[][],
  rows: number,
  cols: number,
  p1: Point,
  p2: Point,
  targetPoint?: Point
): boolean {
  if (p1.r === p2.r) {
    // Horizontal line
    const minC = Math.min(p1.c, p2.c);
    const maxC = Math.max(p1.c, p2.c);
    for (let c = minC + 1; c < maxC; c++) {
      if (!isPassable(board, rows, cols, p1.r, c, targetPoint)) {
        return false;
      }
    }
    return true;
  }

  if (p1.c === p2.c) {
    // Vertical line
    const minR = Math.min(p1.r, p2.r);
    const maxR = Math.max(p1.r, p2.r);
    for (let r = minR + 1; r < maxR; r++) {
      if (!isPassable(board, rows, cols, r, p1.c, targetPoint)) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Main Onet Link Pathfinding Algorithm:
 * Returns whether p1 and p2 can be connected with at most 2 bends (3 line segments).
 * Returns the exact sequence of turning points for visual rendering.
 */
export function findOnetPath(
  board: Cell[][],
  p1: Point,
  p2: Point
): PathResult {
  if (p1.r === p2.r && p1.c === p2.c) {
    return { valid: false, path: [] };
  }

  const rows = board.length;
  const cols = board[0].length;

  // ── 1. Check 0 Bends (Straight line - 1 segment) ───────────────────
  if (
    (p1.r === p2.r || p1.c === p2.c) &&
    isStraightLineClear(board, rows, cols, p1, p2, p2)
  ) {
    return { valid: true, path: [p1, p2] };
  }

  // ── 2. Check 1 Bend (L-Shape - 2 segments) ─────────────────────────
  // Corner 1: (p1.r, p2.c)
  const c1: Point = { r: p1.r, c: p2.c };
  if (
    isPassable(board, rows, cols, c1.r, c1.c) &&
    isStraightLineClear(board, rows, cols, p1, c1) &&
    isStraightLineClear(board, rows, cols, c1, p2, p2)
  ) {
    return { valid: true, path: [p1, c1, p2] };
  }

  // Corner 2: (p2.r, p1.c)
  const c2: Point = { r: p2.r, c: p1.c };
  if (
    isPassable(board, rows, cols, c2.r, c2.c) &&
    isStraightLineClear(board, rows, cols, p1, c2) &&
    isStraightLineClear(board, rows, cols, c2, p2, p2)
  ) {
    return { valid: true, path: [p1, c2, p2] };
  }

  // ── 3. Check 2 Bends (Z-Shape or U-Shape - 3 segments) ─────────────
  // 3a. Horizontal ray expansion from p1.c:
  // Sweep column from -1 (outside left) to cols (outside right)
  for (let c = -1; c <= cols; c++) {
    if (c === p1.c) continue;

    const cornerA: Point = { r: p1.r, c };
    const cornerB: Point = { r: p2.r, c };

    // Intermediate corners must be passable
    if (!isPassable(board, rows, cols, cornerA.r, cornerA.c)) continue;
    if (!isPassable(board, rows, cols, cornerB.r, cornerB.c)) continue;

    // Check segment 1: p1 to cornerA
    if (!isStraightLineClear(board, rows, cols, p1, cornerA)) continue;

    // Check segment 2: cornerA to cornerB
    if (!isStraightLineClear(board, rows, cols, cornerA, cornerB)) continue;

    // Check segment 3: cornerB to p2
    if (!isStraightLineClear(board, rows, cols, cornerB, p2, p2)) continue;

    return { valid: true, path: [p1, cornerA, cornerB, p2] };
  }

  // 3b. Vertical ray expansion from p1.r:
  // Sweep row from -1 (outside top) to rows (outside bottom)
  for (let r = -1; r <= rows; r++) {
    if (r === p1.r) continue;

    const cornerA: Point = { r, c: p1.c };
    const cornerB: Point = { r, c: p2.c };

    // Intermediate corners must be passable
    if (!isPassable(board, rows, cols, cornerA.r, cornerA.c)) continue;
    if (!isPassable(board, rows, cols, cornerB.r, cornerB.c)) continue;

    // Check segment 1: p1 to cornerA
    if (!isStraightLineClear(board, rows, cols, p1, cornerA)) continue;

    // Check segment 2: cornerA to cornerB
    if (!isStraightLineClear(board, rows, cols, cornerA, cornerB)) continue;

    // Check segment 3: cornerB to p2
    if (!isStraightLineClear(board, rows, cols, cornerB, p2, p2)) continue;

    return { valid: true, path: [p1, cornerA, cornerB, p2] };
  }

  return { valid: false, path: [] };
}

/**
 * Scans the board for any currently available valid move.
 * Used for Hints and to determine if an auto-shuffle is required.
 */
export function findAvailableMove(
  board: Cell[][]
): { p1: Point; p2: Point; path: Point[] } | null {
  const rows = board.length;
  const cols = board[0].length;

  // Collect all non-empty tiles grouped by type
  const tilesByType = new Map<number, Point[]>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = board[r][c].tile;
      if (tile !== null) {
        const list = tilesByType.get(tile.type) || [];
        list.push({ r, c });
        tilesByType.set(tile.type, list);
      }
    }
  }

  // Check pairs within each tile type
  for (const [, points] of tilesByType.entries()) {
    if (points.length < 2) continue;

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const result = findOnetPath(board, p1, p2);
        if (result.valid) {
          return { p1, p2, path: result.path };
        }
      }
    }
  }

  return null;
}
