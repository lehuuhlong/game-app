/**
 * hexGrid.ts — Core hex-offset grid math for Dino Egg Pop
 *
 * Layout:
 *   Even rows (0, 2, 4 …) → COLS eggs, first egg centred at x = RADIUS
 *   Odd  rows (1, 3, 5 …) → COLS-1 eggs, shifted right by RADIUS (half-diameter)
 *
 * All conversions use the egg DIAMETER (2 × RADIUS) as the grid unit.
 * Vertical spacing is √3/2 × DIAMETER for a true hexagonal pack, but we use
 * a slightly compressed ROW_HEIGHT for a tighter, more game-friendly feel.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pixel radius of each egg (sphere) */
export const EGG_RADIUS = 18;

/** Full diameter — horizontal distance between adjacent egg centres on even rows */
export const EGG_DIAMETER = EGG_RADIUS * 2;

/** Number of columns on EVEN rows (0, 2, 4 …) */
export const GRID_COLS = 12;

/** Total rows visible in the play area */
export const GRID_ROWS = 15;

/**
 * Vertical spacing between row centres.
 * True hex packing would use √3/2 × DIAMETER ≈ 31.18 px.
 * We round to 32 for crisp alignment.
 */
export const ROW_HEIGHT = Math.round(EGG_DIAMETER * (Math.sqrt(3) / 2));

/** Canvas width — fits GRID_COLS eggs with half-egg padding on each side */
export const CANVAS_WIDTH = GRID_COLS * EGG_DIAMETER + EGG_DIAMETER;

/** Canvas height — grid area + shooter tray at bottom */
export const SHOOTER_AREA_HEIGHT = 80;
export const GRID_TOP_OFFSET = EGG_RADIUS + 10; // vertical padding above row 0
export const CANVAS_HEIGHT =
  GRID_TOP_OFFSET + GRID_ROWS * ROW_HEIGHT + SHOOTER_AREA_HEIGHT;

/** Y position of the shooter nozzle centre */
export const SHOOTER_Y = CANVAS_HEIGHT - SHOOTER_AREA_HEIGHT / 2;
/** X position of the shooter nozzle centre */
export const SHOOTER_X = CANVAS_WIDTH / 2;

/** Speed of the fired egg (px per frame at ~60 fps) — blazing fast, crisp arcade velocity */
export const EGG_SPEED = 24;

/** Minimum shooting angle from the horizontal (radians) — clamp so player
 *  can't shoot almost sideways. ~10 degrees from horizontal. */
export const MIN_ANGLE = Math.PI * 0.06;

// ---------------------------------------------------------------------------
// Egg colours
// ---------------------------------------------------------------------------

export type EggColor = (typeof EGG_COLORS)[number];

export const EGG_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#FACC15', // Yellow
  '#A855F7', // Purple
  '#F97316', // Orange
] as const;

/**
 * Return a random egg colour from the palette.
 * Optionally restrict to a subset of colours that are still on the board.
 */
export function randomEggColor(subset?: EggColor[]): EggColor {
  const pool = subset && subset.length > 0 ? subset : EGG_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------------------------
// Grid cell type
// ---------------------------------------------------------------------------

export interface GridCell {
  color: EggColor;
  /** Row index (0 = top) */
  row: number;
  /** Column index */
  col: number;
}

/** 2-D sparse grid: grid[row][col] = GridCell | null */
export type Grid = (GridCell | null)[][];

// ---------------------------------------------------------------------------
// Coordinate conversion helpers
// ---------------------------------------------------------------------------

/**
 * Return the pixel centre (x, y) for a given (row, col).
 *
 * Even rows: x = RADIUS + col × DIAMETER  (starting from the left edge + RADIUS)
 * Odd  rows: x = DIAMETER + col × DIAMETER (shifted right by RADIUS)
 *
 * y = GRID_TOP_OFFSET + row × ROW_HEIGHT
 */
export function getXYFromRowCol(
  row: number,
  col: number,
  topRowParity: number = 0,
): { x: number; y: number } {
  const isOddRow = (row + topRowParity) % 2 === 1;
  const x = isOddRow
    ? EGG_DIAMETER + col * EGG_DIAMETER
    : EGG_RADIUS + col * EGG_DIAMETER;
  const y = GRID_TOP_OFFSET + row * ROW_HEIGHT;
  return { x, y };
}

/**
 * Return the nearest (row, col) grid slot for a pixel position (px, py).
 *
 * Strategy:
 *   1. Compute the approximate row from y.
 *   2. Try both the floor and ceil row, and for each determine the best column.
 *   3. Pick whichever (row, col) candidate has its centre closest to (px, py).
 *
 * This avoids edge-case bugs from naïve single-row rounding.
 */
export function getRowColFromXY(
  px: number,
  py: number,
  topRowParity: number = 0,
): { row: number; col: number } {
  // Approximate continuous row
  const rawRow = (py - GRID_TOP_OFFSET) / ROW_HEIGHT;

  // Two candidate rows
  const rowA = Math.floor(rawRow);
  const rowB = rowA + 1;

  let bestRow = 0;
  let bestCol = 0;
  let bestDist = Infinity;

  for (const candidateRow of [rowA, rowB]) {
    if (candidateRow < 0) continue;

    const isOdd = (candidateRow + topRowParity) % 2 === 1;
    const maxCols = isOdd ? GRID_COLS - 1 : GRID_COLS;

    // Invert the x formula to get a continuous column
    const rawCol = isOdd
      ? (px - EGG_DIAMETER) / EGG_DIAMETER
      : (px - EGG_RADIUS) / EGG_DIAMETER;

    const candidateCol = Math.round(rawCol);

    // Clamp to valid range
    const clampedCol = Math.max(0, Math.min(candidateCol, maxCols - 1));

    const centre = getXYFromRowCol(candidateRow, clampedCol, topRowParity);
    const dx = px - centre.x;
    const dy = py - centre.y;
    const dist = dx * dx + dy * dy; // no sqrt needed for comparison

    if (dist < bestDist) {
      bestDist = dist;
      bestRow = candidateRow;
      bestCol = clampedCol;
    }
  }

  return { row: bestRow, col: bestCol };
}

// ---------------------------------------------------------------------------
// Neighbor lookup (hex adjacency)
// ---------------------------------------------------------------------------

/**
 * Get the up-to-6 neighbours of a hex cell in an offset grid.
 *
 * For EVEN rows (row % 2 === 0), the six neighbours relative to (row, col):
 *   Same row:      (row, col-1), (row, col+1)
 *   Row above:     (row-1, col-1), (row-1, col)
 *   Row below:     (row+1, col-1), (row+1, col)
 *
 * For ODD rows (row % 2 === 1), shifted:
 *   Same row:      (row, col-1), (row, col+1)
 *   Row above:     (row-1, col), (row-1, col+1)
 *   Row below:     (row+1, col), (row+1, col+1)
 *
 * Only in-bounds cells are returned.
 */
export function getNeighbors(
  row: number,
  col: number,
  topRowParity: number = 0,
): { row: number; col: number }[] {
  const isOddRow = (row + topRowParity) % 2 === 1;

  // Offsets: [dRow, dCol]
  const offsets: [number, number][] = isOddRow
    ? [
        [0, -1],  // left
        [0, 1],   // right
        [-1, 0],  // upper-left
        [-1, 1],  // upper-right
        [1, 0],   // lower-left
        [1, 1],   // lower-right
      ]
    : [
        [0, -1],  // left
        [0, 1],   // right
        [-1, -1], // upper-left
        [-1, 0],  // upper-right
        [1, -1],  // lower-left
        [1, 0],   // lower-right
      ];

  const results: { row: number; col: number }[] = [];

  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;

    if (nr < 0 || nr >= GRID_ROWS) continue;

    const nIsOdd = (nr + topRowParity) % 2 === 1;
    const maxCols = nIsOdd ? GRID_COLS - 1 : GRID_COLS;
    if (nc < 0 || nc >= maxCols) continue;

    results.push({ row: nr, col: nc });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Grid factory
// ---------------------------------------------------------------------------

/**
 * Create an empty GRID_ROWS × GRID_COLS grid (null = empty slot).
 */
export function createEmptyGrid(topRowParity: number = 0): Grid {
  const grid: Grid = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const isOdd = (r + topRowParity) % 2 === 1;
    const maxCols = isOdd ? GRID_COLS - 1 : GRID_COLS;
    grid.push(new Array(maxCols).fill(null));
  }
  return grid;
}

/**
 * Populate the top `rowCount` rows with random eggs.
 * Used to initialise a new game.
 */
export function populateGrid(
  rowCount: number,
  topRowParity: number = 0,
  allowedColors?: EggColor[],
): Grid {
  const grid = createEmptyGrid(topRowParity);
  for (let r = 0; r < Math.min(rowCount, GRID_ROWS); r++) {
    const isOdd = (r + topRowParity) % 2 === 1;
    const maxCols = isOdd ? GRID_COLS - 1 : GRID_COLS;
    for (let c = 0; c < maxCols; c++) {
      grid[r][c] = { color: randomEggColor(allowedColors), row: r, col: c };
    }
  }
  return grid;
}

/**
 * Gather the set of distinct colours currently present in the grid.
 * Useful for restricting the shooter to only colours still in play.
 */
export function getActiveColors(grid: Grid): EggColor[] {
  const set = new Set<EggColor>();
  for (const row of grid) {
    for (const cell of row) {
      if (cell) set.add(cell.color);
    }
  }
  return Array.from(set);
}

// ---------------------------------------------------------------------------
// Graph Algorithms: Match-3 & Orphan Drops (CRITICAL)
// ---------------------------------------------------------------------------

/**
 * BFS to find all hex-connected eggs of the SAME color as (startRow, startCol).
 * Returns array of coordinates for matching eggs.
 */
export function findConnectedMatches(
  grid: Grid,
  startRow: number,
  startCol: number,
  topRowParity: number = 0,
): { row: number; col: number }[] {
  const startCell = grid[startRow]?.[startCol];
  if (!startCell) return [];

  const targetColor = startCell.color;
  const matched: { row: number; col: number }[] = [];
  const visited = new Set<string>();

  const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    matched.push(curr);

    for (const nb of getNeighbors(curr.row, curr.col, topRowParity)) {
      const key = `${nb.row},${nb.col}`;
      if (visited.has(key)) continue;

      const neighborCell = grid[nb.row]?.[nb.col];
      if (neighborCell && neighborCell.color === targetColor) {
        visited.add(key);
        queue.push(nb);
      }
    }
  }

  return matched;
}

/**
 * BFS starting from Row 0 (ceiling) to find all eggs attached to the ceiling.
 * Any non-null egg NOT attached to the ceiling is an orphan cluster that must drop.
 */
export function findFloatingOrphans(
  grid: Grid,
  topRowParity: number = 0,
): { row: number; col: number }[] {
  const anchored = new Set<string>();
  const queue: { row: number; col: number }[] = [];

  // 1. Seed BFS from all non-null eggs in row 0 (the ceiling)
  if (grid[0]) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[0][c] !== null) {
        anchored.add(`0,${c}`);
        queue.push({ row: 0, col: c });
      }
    }
  }

  // 2. Expand BFS to all connected neighbors
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const nb of getNeighbors(curr.row, curr.col, topRowParity)) {
      const key = `${nb.row},${nb.col}`;
      if (!anchored.has(key) && grid[nb.row]?.[nb.col] !== null) {
        anchored.add(key);
        queue.push(nb);
      }
    }
  }

  // 3. Any egg not reachable from row 0 is an orphan
  const orphans: { row: number; col: number }[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] !== null && !anchored.has(`${r},${c}`)) {
        orphans.push({ row: r, col: c });
      }
    }
  }

  return orphans;
}

/**
 * Find the nearest empty slot in the grid that is a VALID attachment point:
 * - Must be row 0 (ceiling), OR
 * - Must have at least one occupied neighbor (attached to existing cluster).
 * Never places an egg floating isolated in mid-air.
 */
export function snapToNearestSlot(
  grid: Grid,
  px: number,
  py: number,
  topRowParity: number = 0,
): { row: number; col: number } | null {
  let bestSlot: { row: number; col: number } | null = null;
  let minDistanceSq = Infinity;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      // Slot must be empty
      if (grid[r][c] !== null) continue;

      // Must be attached to ceiling (row 0) or to an occupied neighbor
      let isValidAttachment = r === 0;
      if (!isValidAttachment) {
        for (const nb of getNeighbors(r, c, topRowParity)) {
          if (grid[nb.row]?.[nb.col] !== null) {
            isValidAttachment = true;
            break;
          }
        }
      }

      if (!isValidAttachment) continue;

      const { x, y } = getXYFromRowCol(r, c, topRowParity);
      const distSq = (px - x) ** 2 + (py - y) ** 2;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        bestSlot = { row: r, col: c };
      }
    }
  }

  return bestSlot;
}


