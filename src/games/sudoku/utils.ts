export type Difficulty = "easy" | "medium" | "hard";

export const BOARD_SIZE = 9;
export const EMPTY_CELL = 0;

export function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY_CELL));
}

export function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

// Standard check for valid placement
export function isValid(board: number[][], row: number, col: number, num: number): boolean {
  // Check row
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board[row][c] === num) return false;
  }
  // Check column
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r][col] === num) return false;
  }
  // Check 3x3 block
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r++) {
    for (let c = startCol; c < startCol + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

// Backtracking solver
export function solveSudoku(board: number[][]): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === EMPTY_CELL) {
        // Shuffle numbers 1-9 to randomize the generated board
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) return true;
            board[row][col] = EMPTY_CELL; // Backtrack
          }
        }
        return false; // Triggers backtracking
      }
    }
  }
  return true; // Board is full and solved
}

export function generateSolvedBoard(): number[][] {
  const board = createEmptyBoard();
  solveSudoku(board);
  return board;
}

export function generatePuzzle(solvedBoard: number[][], difficulty: Difficulty): number[][] {
  const puzzle = cloneBoard(solvedBoard);
  
  // Define cells to remove based on difficulty
  let cellsToRemove = 0;
  switch (difficulty) {
    case "easy":
      cellsToRemove = 35; // ~30-35
      break;
    case "medium":
      cellsToRemove = 45; // ~40-45
      break;
    case "hard":
      cellsToRemove = 55; // ~50-55
      break;
  }

  let count = 0;
  while (count < cellsToRemove) {
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    if (puzzle[row][col] !== EMPTY_CELL) {
      puzzle[row][col] = EMPTY_CELL;
      count++;
    }
  }
  
  return puzzle;
}

// Detect all conflicting cells on the current board
export function getConflicts(board: number[][]): { row: number; col: number }[] {
  const conflicts: { row: number; col: number }[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const num = board[row][col];
      if (num === EMPTY_CELL) continue;

      let isConflict = false;

      // Check row
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (c !== col && board[row][c] === num) isConflict = true;
      }
      // Check column
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (r !== row && board[r][col] === num) isConflict = true;
      }
      // Check 3x3 block
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
          if ((r !== row || c !== col) && board[r][c] === num) isConflict = true;
        }
      }

      if (isConflict) {
        conflicts.push({ row, col });
      }
    }
  }

  return conflicts;
}
