/**
 * Retro Block Drop - Core Constants & Piece Definitions
 * 
 * NOTE: Strictly follows copyright guidelines - pieces are termed "Blocks" or "Pieces".
 */

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type BlockType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type CellValue = BlockType | 0;
export type Board = CellValue[][];

export interface BlockDefinition {
  type: BlockType;
  name: string;
  matrix: number[][];
  color: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
  lightHighlight: string;
}

/**
 * 2D Matrices for the 7 standard Block pieces.
 * Defined in square NxN matrices (2x2, 3x3, 4x4) to enable clean,
 * mathematically consistent 90-degree clockwise matrix rotations:
 * (row, col) -> (col, N - 1 - row)
 */
export const BLOCKS: Record<BlockType, BlockDefinition> = {
  I: {
    type: 'I',
    name: 'Skyline Beam',
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#06b6d4', // Cyan
    gradient: 'radial-gradient(circle at 30% 30%, #a5f3fc 0%, #06b6d4 55%, #0891b2 100%)',
    borderColor: '#22d3ee',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    lightHighlight: '#cffafe',
  },
  J: {
    type: 'J',
    name: 'Cobalt Hook',
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#3b82f6', // Sapphire Blue
    gradient: 'radial-gradient(circle at 30% 30%, #93c5fd 0%, #3b82f6 55%, #1d4ed8 100%)',
    borderColor: '#60a5fa',
    glowColor: 'rgba(59, 130, 246, 0.6)',
    lightHighlight: '#dbeafe',
  },
  L: {
    type: 'L',
    name: 'Amber Angle',
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#f97316', // Vibrant Orange
    gradient: 'radial-gradient(circle at 30% 30%, #fdba74 0%, #f97316 55%, #c2410c 100%)',
    borderColor: '#fb923c',
    glowColor: 'rgba(249, 115, 22, 0.6)',
    lightHighlight: '#ffedd5',
  },
  O: {
    type: 'O',
    name: 'Solar Cube',
    matrix: [
      [1, 1],
      [1, 1],
    ],
    color: '#eab308', // Gold / Yellow
    gradient: 'radial-gradient(circle at 30% 30%, #fef08a 0%, #eab308 55%, #a16207 100%)',
    borderColor: '#fde047',
    glowColor: 'rgba(234, 179, 8, 0.6)',
    lightHighlight: '#fef9c3',
  },
  S: {
    type: 'S',
    name: 'Emerald Serpent',
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#10b981', // Emerald Green
    gradient: 'radial-gradient(circle at 30% 30%, #6ee7b7 0%, #10b981 55%, #047857 100%)',
    borderColor: '#34d399',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    lightHighlight: '#d1fae5',
  },
  T: {
    type: 'T',
    name: 'Amethyst Crest',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#a855f7', // Purple
    gradient: 'radial-gradient(circle at 30% 30%, #d8b4fe 0%, #a855f7 55%, #7e22ce 100%)',
    borderColor: '#c084fc',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    lightHighlight: '#f3e8ff',
  },
  Z: {
    type: 'Z',
    name: 'Ruby Zag',
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#ef4444', // Crimson Red
    gradient: 'radial-gradient(circle at 30% 30%, #fca5a5 0%, #ef4444 55%, #b91c1c 100%)',
    borderColor: '#f87171',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    lightHighlight: '#fee2e2',
  },
};

export const BLOCK_KEYS: BlockType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

/**
 * Creates a fresh 10x20 empty board represented as a 2D array of 0s.
 */
export const createEmptyBoard = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

/**
 * Point rewards based on the number of lines cleared simultaneously.
 * Scaled by (level + 1).
 */
export const LINE_POINTS: Record<number, number> = {
  1: 100,  // Single line
  2: 300,  // Double lines
  3: 500,  // Triple lines
  4: 800,  // Quadruple lines
};

/**
 * Soft drop and hard drop bonus points per row dropped.
 */
export const DROP_POINTS = {
  SOFT_DROP_PER_CELL: 1,
  HARD_DROP_PER_CELL: 2,
};

/**
 * Tick speed in milliseconds based on level (1 to 15+).
 */
export const getDropInterval = (level: number): number => {
  // Starts at 800ms, decreases by 65ms per level down to 90ms min
  return Math.max(90, 800 - Math.min(level, 15) * 55);
};
