import { Cell, LevelConfig, TileItem, GravityType } from './types';
import { TILE_DEFINITIONS } from './constants';
import { findAvailableMove } from './pathfinding';

/**
 * Generates an initial board for the given level configuration.
 * Guarantees that the total number of cells is even and paired,
 * and ensures there is at least one valid starting move.
 */
export function generateBoard(config: LevelConfig): Cell[][] {
  const { rows, cols, uniqueTilesCount } = config;
  const totalCells = rows * cols;
  if (totalCells % 2 !== 0) {
    throw new Error('Total board cells must be an even number');
  }

  const totalPairs = totalCells / 2;
  const availableTiles = TILE_DEFINITIONS.slice(0, uniqueTilesCount);

  let attempts = 0;
  while (attempts < 20) {
    attempts++;

    // Select tiles and create pairs
    const tileList: TileItem[] = [];
    for (let i = 0; i < totalPairs; i++) {
      const def = availableTiles[i % availableTiles.length];
      const t1: TileItem = {
        id: `tile_${i * 2}_${def.type}`,
        type: def.type,
        name: def.name,
        emoji: def.emoji,
        glowColor: def.glowColor,
        badgeBg: def.badgeBg,
      };
      const t2: TileItem = {
        id: `tile_${i * 2 + 1}_${def.type}`,
        type: def.type,
        name: def.name,
        emoji: def.emoji,
        glowColor: def.glowColor,
        badgeBg: def.badgeBg,
      };
      tileList.push(t1, t2);
    }

    // Shuffle array using Fisher-Yates
    for (let i = tileList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tileList[i], tileList[j]] = [tileList[j], tileList[i]];
    }

    // Assemble grid
    const board: Cell[][] = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          r,
          c,
          tile: tileList[idx++],
          isSelected: false,
          isHinted: false,
          isRemoving: false,
        });
      }
      board.push(row);
    }

    // Verify there is at least one valid starting move
    if (findAvailableMove(board) !== null) {
      return board;
    }
  }

  // Fallback: If 20 random layouts didn't yield a move, force adjacent pairs on the outer edge
  return createGuaranteedBoard(config);
}

/**
 * Fallback to construct a board with guaranteed starting moves.
 */
function createGuaranteedBoard(config: LevelConfig): Cell[][] {
  const { rows, cols, uniqueTilesCount } = config;
  const totalCells = rows * cols;
  const totalPairs = totalCells / 2;
  const availableTiles = TILE_DEFINITIONS.slice(0, uniqueTilesCount);

  const tileList: TileItem[] = [];
  for (let i = 0; i < totalPairs; i++) {
    const def = availableTiles[i % availableTiles.length];
    tileList.push(
      {
        id: `tile_${i * 2}_${def.type}`,
        type: def.type,
        name: def.name,
        emoji: def.emoji,
        glowColor: def.glowColor,
        badgeBg: def.badgeBg,
      },
      {
        id: `tile_${i * 2 + 1}_${def.type}`,
        type: def.type,
        name: def.name,
        emoji: def.emoji,
        glowColor: def.glowColor,
        badgeBg: def.badgeBg,
      }
    );
  }

  const board: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        r,
        c,
        tile: tileList[idx++],
        isSelected: false,
        isHinted: false,
        isRemoving: false,
      });
    }
    board.push(row);
  }

  return board;
}

/**
 * Shuffles remaining non-empty tiles on the board.
 * Ensures the resulting board has at least one valid move if pairs remain.
 */
export function shuffleBoard(board: Cell[][]): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;

  const remainingTiles: TileItem[] = [];
  const activePositions: { r: number; c: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = board[r][c].tile;
      if (tile !== null) {
        remainingTiles.push(tile);
        activePositions.push({ r, c });
      }
    }
  }

  if (remainingTiles.length === 0) return board;

  let attempts = 0;
  let newBoard = copyBoard(board);

  while (attempts < 30) {
    attempts++;

    // Shuffle tiles
    for (let i = remainingTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingTiles[i], remainingTiles[j]] = [remainingTiles[j], remainingTiles[i]];
    }

    newBoard = copyBoard(board);
    for (let i = 0; i < activePositions.length; i++) {
      const { r, c } = activePositions[i];
      newBoard[r][c].tile = remainingTiles[i];
      newBoard[r][c].isSelected = false;
      newBoard[r][c].isHinted = false;
    }

    if (findAvailableMove(newBoard) !== null) {
      return newBoard;
    }
  }

  return newBoard;
}

/**
 * Applies gravity to shift tiles according to level configuration.
 */
export function applyGravity(board: Cell[][], gravity: GravityType): Cell[][] {
  if (gravity === 'none') return board;

  const rows = board.length;
  const cols = board[0].length;
  const newBoard = copyBoard(board);

  if (gravity === 'down') {
    // Tiles fall down
    for (let c = 0; c < cols; c++) {
      const nonNullTiles: TileItem[] = [];
      for (let r = 0; r < rows; r++) {
        if (newBoard[r][c].tile !== null) {
          nonNullTiles.push(newBoard[r][c].tile!);
        }
      }
      const emptyCount = rows - nonNullTiles.length;
      for (let r = 0; r < emptyCount; r++) {
        newBoard[r][c].tile = null;
      }
      for (let r = 0; r < nonNullTiles.length; r++) {
        newBoard[emptyCount + r][c].tile = nonNullTiles[r];
      }
    }
  } else if (gravity === 'up') {
    // Tiles float up
    for (let c = 0; c < cols; c++) {
      const nonNullTiles: TileItem[] = [];
      for (let r = 0; r < rows; r++) {
        if (newBoard[r][c].tile !== null) {
          nonNullTiles.push(newBoard[r][c].tile!);
        }
      }
      for (let r = 0; r < nonNullTiles.length; r++) {
        newBoard[r][c].tile = nonNullTiles[r];
      }
      for (let r = nonNullTiles.length; r < rows; r++) {
        newBoard[r][c].tile = null;
      }
    }
  } else if (gravity === 'left') {
    // Tiles slide left
    for (let r = 0; r < rows; r++) {
      const nonNullTiles: TileItem[] = [];
      for (let c = 0; c < cols; c++) {
        if (newBoard[r][c].tile !== null) {
          nonNullTiles.push(newBoard[r][c].tile!);
        }
      }
      for (let c = 0; c < nonNullTiles.length; c++) {
        newBoard[r][c].tile = nonNullTiles[c];
      }
      for (let c = nonNullTiles.length; c < cols; c++) {
        newBoard[r][c].tile = null;
      }
    }
  } else if (gravity === 'right') {
    // Tiles slide right
    for (let r = 0; r < rows; r++) {
      const nonNullTiles: TileItem[] = [];
      for (let c = 0; c < cols; c++) {
        if (newBoard[r][c].tile !== null) {
          nonNullTiles.push(newBoard[r][c].tile!);
        }
      }
      const emptyCount = cols - nonNullTiles.length;
      for (let c = 0; c < emptyCount; c++) {
        newBoard[r][c].tile = null;
      }
      for (let c = 0; c < nonNullTiles.length; c++) {
        newBoard[r][emptyCount + c].tile = nonNullTiles[c];
      }
    }
  } else if (gravity === 'center-vertical') {
    // Top half falls down towards center, bottom half rises up towards center
    const mid = Math.floor(rows / 2);
    for (let c = 0; c < cols; c++) {
      // Top half (0 to mid - 1): shift down toward mid - 1
      const topTiles: TileItem[] = [];
      for (let r = 0; r < mid; r++) {
        if (newBoard[r][c].tile !== null) topTiles.push(newBoard[r][c].tile!);
      }
      const topEmpty = mid - topTiles.length;
      for (let r = 0; r < topEmpty; r++) newBoard[r][c].tile = null;
      for (let r = 0; r < topTiles.length; r++) newBoard[topEmpty + r][c].tile = topTiles[r];

      // Bottom half (mid to rows - 1): shift up toward mid
      const bottomTiles: TileItem[] = [];
      for (let r = mid; r < rows; r++) {
        if (newBoard[r][c].tile !== null) bottomTiles.push(newBoard[r][c].tile!);
      }
      for (let r = 0; r < bottomTiles.length; r++) newBoard[mid + r][c].tile = bottomTiles[r];
      for (let r = mid + bottomTiles.length; r < rows; r++) newBoard[r][c].tile = null;
    }
  } else if (gravity === 'center-horizontal') {
    // Left half shifts right toward center, right half shifts left toward center
    const mid = Math.floor(cols / 2);
    for (let r = 0; r < rows; r++) {
      // Left half (0 to mid - 1): shift right toward mid - 1
      const leftTiles: TileItem[] = [];
      for (let c = 0; c < mid; c++) {
        if (newBoard[r][c].tile !== null) leftTiles.push(newBoard[r][c].tile!);
      }
      const leftEmpty = mid - leftTiles.length;
      for (let c = 0; c < leftEmpty; c++) newBoard[r][c].tile = null;
      for (let c = 0; c < leftTiles.length; c++) newBoard[r][leftEmpty + c].tile = leftTiles[c];

      // Right half (mid to cols - 1): shift left toward mid
      const rightTiles: TileItem[] = [];
      for (let c = mid; c < cols; c++) {
        if (newBoard[r][c].tile !== null) rightTiles.push(newBoard[r][c].tile!);
      }
      for (let c = 0; c < rightTiles.length; c++) newBoard[r][mid + c].tile = rightTiles[c];
      for (let c = mid + rightTiles.length; c < cols; c++) newBoard[r][c].tile = null;
    }
  }

  return newBoard;
}

export function copyBoard(board: Cell[][]): Cell[][] {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      tile: cell.tile ? { ...cell.tile } : null,
    }))
  );
}
