export type CellState = 0 | 1 | 2; // 0: Empty, 1: Filled, 2: Crossed/Marked (X)

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type GameMode = 'CLASSIC' | 'ZEN'; // CLASSIC: 3 lives/mistakes; ZEN: relaxed, unlimited mistakes

export type ToolMode = 'FILL' | 'CROSS';

export type GameStatus = 'READY' | 'PLAYING' | 'WON' | 'LOST';

export interface Puzzle {
  id: string;
  title: string;
  icon: string;
  difficulty: Difficulty;
  width: number;
  height: number;
  solution: number[][]; // 1 for filled, 0 for empty
  accentColor: string; // Tailwind color or hex
  glowColor: string;
}

export interface Clues {
  rowClues: number[][];
  colClues: number[][];
}

export interface MoveAction {
  row: number;
  col: number;
  prevValue: CellState;
  newValue: CellState;
}

export interface GameStats {
  score: number;
  timeTaken: number;
  mistakes: number;
  hintsUsed: number;
  stars: number;
  isNewRecord: boolean;
}

export interface UseNonogramEngineReturn {
  currentPuzzle: Puzzle;
  clues: Clues;
  grid: CellState[][];
  toolMode: ToolMode;
  setToolMode: (mode: ToolMode | ((prev: ToolMode) => ToolMode)) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode | ((prev: GameMode) => GameMode)) => void;
  status: GameStatus;
  mistakes: number;
  hintsUsed: number;
  timer: number;
  score: number;
  stars: number;
  completedRows: Set<number>;
  completedCols: Set<number>;
  canUndo: boolean;
  canRedo: boolean;
  selectPuzzle: (puzzle: Puzzle) => void;
  handlePointerDown: (r: number, c: number, isSecondaryClick?: boolean) => void;
  handlePointerEnter: (r: number, c: number) => void;
  handlePointerUp: () => void;
  useHint: () => void;
  undo: () => void;
  redo: () => void;
  restart: () => void;
}

