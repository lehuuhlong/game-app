"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BLOCKS,
  BLOCK_KEYS,
  LINE_POINTS,
  DROP_POINTS,
  getDropInterval,
  createEmptyBoard,
  type Board,
  type BlockType,
} from './constants';
import { useInterval } from './useInterval';

export interface ActivePiece {
  type: BlockType;
  matrix: number[][];
  x: number;
  y: number;
}

/**
 * Generates a freshly shuffled 7-bag of block pieces
 * ensuring balanced distribution without piece starvation.
 */
export function generateBag(): BlockType[] {
  const bag = [...BLOCK_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/**
 * Creates an active piece centered horizontally at the top of the board.
 */
export function createPiece(type: BlockType): ActivePiece {
  const definition = BLOCKS[type];
  const size = definition.matrix.length;
  // Center horizontally:
  const x = Math.floor((BOARD_WIDTH - size) / 2);
  // Spawn at the top (y = 0)
  const y = 0;

  return {
    type,
    matrix: definition.matrix.map((row) => [...row]),
    x,
    y,
  };
}

/**
 * Rotates an N x N matrix 90 degrees clockwise:
 * (row, col) -> (col, N - 1 - row)
 */
export function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length;
  const rotated = Array.from({ length: N }, () => Array(N).fill(0));
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      rotated[c][N - 1 - r] = matrix[r][c];
    }
  }
  return rotated;
}

/**
 * Checks whether placing a piece matrix at (posX, posY) on the given board
 * is valid without colliding with walls, floor, or already locked blocks.
 */
export function isValidMove(
  board: Board,
  pieceMatrix: number[][],
  posX: number,
  posY: number
): boolean {
  const size = pieceMatrix.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (pieceMatrix[r][c] !== 0) {
        const boardRow = posY + r;
        const boardCol = posX + c;

        // Check horizontal boundaries (left & right walls)
        if (boardCol < 0 || boardCol >= BOARD_WIDTH) {
          return false;
        }

        // Check bottom floor boundary
        if (boardRow >= BOARD_HEIGHT) {
          return false;
        }

        // Check collision with locked blocks (only when inside the board vertically)
        if (boardRow >= 0 && board[boardRow][boardCol] !== 0) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Computes the maximum distance the active piece can drop before colliding (ghost piece y-coordinate).
 */
export function getGhostY(board: Board, piece: ActivePiece): number {
  let targetY = piece.y;
  while (isValidMove(board, piece.matrix, piece.x, targetY + 1)) {
    targetY++;
  }
  return targetY;
}

export function useBlockEngine() {
  const bagRef = useRef<BlockType[]>([]);

  // Pull next piece from the 7-bag
  const getNextPieceFromBag = useCallback((): BlockType => {
    if (bagRef.current.length === 0) {
      bagRef.current = generateBag();
    }
    return bagRef.current.pop()!;
  }, []);

  // Initialize first pieces
  const [currentPiece, setCurrentPiece] = useState<ActivePiece | null>(() => {
    const firstType = getNextPieceFromBag();
    return createPiece(firstType);
  });

  const [nextPiece, setNextPiece] = useState<BlockType>(() => {
    return getNextPieceFromBag();
  });

  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lastClearEffect, setLastClearEffect] = useState<{ lines: number; timestamp: number } | null>(null);

  // Automatically reset line clear visual effect after brief duration
  useEffect(() => {
    if (!lastClearEffect) return;
    const timer = setTimeout(() => {
      setLastClearEffect(null);
    }, 500);
    return () => clearTimeout(timer);
  }, [lastClearEffect]);

  /**
   * Locks the specified piece directly onto the board,
   * detects cleared lines, calculates scores/levels, and spawns the next piece.
   */
  const lockPieceDirectly = useCallback(
    (pieceToLock: ActivePiece) => {
      const newBoard: Board = board.map((row) => [...row]);
      let isOutAtTop = false;

      // 1. Stamp piece onto board
      const size = pieceToLock.matrix.length;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (pieceToLock.matrix[r][c] !== 0) {
            const boardRow = pieceToLock.y + r;
            const boardCol = pieceToLock.x + c;

            if (boardRow < 0) {
              isOutAtTop = true;
            } else if (boardRow < BOARD_HEIGHT && boardCol >= 0 && boardCol < BOARD_WIDTH) {
              newBoard[boardRow][boardCol] = pieceToLock.type;
            }
          }
        }
      }

      if (isOutAtTop) {
        setIsGameOver(true);
        setCurrentPiece(null);
        return;
      }

      // 2. Line clearing detection
      let clearedCount = 0;
      const filteredBoard: Board = [];

      for (let r = 0; r < BOARD_HEIGHT; r++) {
        const isRowFull = newBoard[r].every((cell) => cell !== 0);
        if (isRowFull) {
          clearedCount++;
        } else {
          filteredBoard.push(newBoard[r]);
        }
      }

      // Prepend empty rows at top for cleared lines
      while (filteredBoard.length < BOARD_HEIGHT) {
        filteredBoard.unshift(Array(BOARD_WIDTH).fill(0));
      }

      // 3. Update score, lines, and level
      if (clearedCount > 0) {
        const basePts = LINE_POINTS[clearedCount] || clearedCount * 200;
        const addedScore = basePts * level;
        setScore((prev) => prev + addedScore);

        setLines((prevLines) => {
          const newLines = prevLines + clearedCount;
          const calculatedLevel = Math.floor(newLines / 10) + 1;
          setLevel(calculatedLevel);
          return newLines;
        });

        setLastClearEffect({ lines: clearedCount, timestamp: Date.now() });
      }

      setBoard(filteredBoard);

      // 4. Spawn next piece
      const newPiece = createPiece(nextPiece);
      // Check if new piece can safely spawn
      if (!isValidMove(filteredBoard, newPiece.matrix, newPiece.x, newPiece.y)) {
        setIsGameOver(true);
        setCurrentPiece(null);
      } else {
        setCurrentPiece(newPiece);
        setNextPiece(getNextPieceFromBag());
      }
    },
    [board, getNextPieceFromBag, level, nextPiece]
  );

  /**
   * Moves the active piece left by 1 cell if valid.
   */
  const moveLeft = useCallback(() => {
    if (isGameOver || isPaused || !currentPiece) return false;

    if (isValidMove(board, currentPiece.matrix, currentPiece.x - 1, currentPiece.y)) {
      setCurrentPiece((prev) => (prev ? { ...prev, x: prev.x - 1 } : null));
      return true;
    }
    return false;
  }, [board, currentPiece, isGameOver, isPaused]);

  /**
   * Moves the active piece right by 1 cell if valid.
   */
  const moveRight = useCallback(() => {
    if (isGameOver || isPaused || !currentPiece) return false;

    if (isValidMove(board, currentPiece.matrix, currentPiece.x + 1, currentPiece.y)) {
      setCurrentPiece((prev) => (prev ? { ...prev, x: prev.x + 1 } : null));
      return true;
    }
    return false;
  }, [board, currentPiece, isGameOver, isPaused]);

  /**
   * Moves the active piece down by 1 cell if valid.
   * If blocked by floor or locked blocks, locks the piece into place.
   */
  const moveDown = useCallback(() => {
    if (isGameOver || isPaused || !currentPiece) return false;

    if (isValidMove(board, currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
      setCurrentPiece((prev) => (prev ? { ...prev, y: prev.y + 1 } : null));
      return true;
    } else {
      lockPieceDirectly(currentPiece);
      return false;
    }
  }, [board, currentPiece, isGameOver, isPaused, lockPieceDirectly]);

  /**
   * Soft drops the piece: accelerates drop by 1 cell and awards 1 point.
   */
  const softDrop = useCallback(() => {
    if (isGameOver || isPaused || !currentPiece) return false;

    if (isValidMove(board, currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
      setCurrentPiece((prev) => (prev ? { ...prev, y: prev.y + 1 } : null));
      setScore((prev) => prev + DROP_POINTS.SOFT_DROP_PER_CELL);
      return true;
    } else {
      lockPieceDirectly(currentPiece);
      return false;
    }
  }, [board, currentPiece, isGameOver, isPaused, lockPieceDirectly]);

  /**
   * Hard drops the piece: instantly teleports to the ghost position,
   * awards hard drop points, and immediately locks the piece.
   */
  const hardDrop = useCallback(() => {
    if (isGameOver || isPaused || !currentPiece) return 0;

    const targetY = getGhostY(board, currentPiece);
    const droppedCells = targetY - currentPiece.y;

    if (droppedCells > 0) {
      setScore((prev) => prev + droppedCells * DROP_POINTS.HARD_DROP_PER_CELL);
    }

    const lockedPiece: ActivePiece = {
      ...currentPiece,
      y: targetY,
    };

    lockPieceDirectly(lockedPiece);
    return droppedCells;
  }, [board, currentPiece, isGameOver, isPaused, lockPieceDirectly]);

  /**
   * Rotates the piece 90 degrees clockwise with wall-kick offsets.
   */
  const rotatePiece = useCallback(() => {
    if (isGameOver || isPaused || !currentPiece) return false;
    if (currentPiece.type === 'O') return true; // Cube doesn't need rotation

    const rotated = rotateMatrix(currentPiece.matrix);

    // Wall kicks: [dx, dy] offsets to test
    const kickOffsets = [
      [0, 0],   // Basic rotation
      [-1, 0],  // Kick left 1
      [1, 0],   // Kick right 1
      [-2, 0],  // Kick left 2 (for I-piece near wall)
      [2, 0],   // Kick right 2 (for I-piece near wall)
      [0, -1],  // Kick up 1 (floor kick)
    ];

    for (const [offsetX, offsetY] of kickOffsets) {
      const testX = currentPiece.x + offsetX;
      const testY = currentPiece.y + offsetY;
      if (isValidMove(board, rotated, testX, testY)) {
        setCurrentPiece((prev) =>
          prev
            ? {
                ...prev,
                matrix: rotated,
                x: testX,
                y: testY,
              }
            : null
        );
        return true;
      }
    }

    return false;
  }, [board, currentPiece, isGameOver, isPaused]);

  /**
   * Core Game Loop Tick (Gravity)
   */
  const tick = useCallback(() => {
    if (isGameOver || isPaused || !currentPiece) return;

    if (isValidMove(board, currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
      setCurrentPiece((prev) => (prev ? { ...prev, y: prev.y + 1 } : null));
    } else {
      lockPieceDirectly(currentPiece);
    }
  }, [board, currentPiece, isGameOver, isPaused, lockPieceDirectly]);

  useInterval(
    tick,
    !isGameOver && !isPaused && currentPiece ? getDropInterval(level) : null
  );

  /**
   * Resets the game to initial state.
   */
  const resetGame = useCallback(() => {
    bagRef.current = generateBag();
    const firstType = bagRef.current.pop()!;
    const secondType = bagRef.current.pop()!;

    setBoard(createEmptyBoard());
    setCurrentPiece(createPiece(firstType));
    setNextPiece(secondType);
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsGameOver(false);
    setIsPaused(false);
    setLastClearEffect(null);
  }, []);

  /**
   * Toggle pause state.
   */
  const togglePause = useCallback(() => {
    if (isGameOver) return;
    setIsPaused((prev) => !prev);
  }, [isGameOver]);

  return {
    board,
    setBoard,
    currentPiece,
    setCurrentPiece,
    nextPiece,
    setNextPiece,
    score,
    setScore,
    lines,
    setLines,
    level,
    setLevel,
    isGameOver,
    setIsGameOver,
    isPaused,
    setIsPaused,
    lastClearEffect,
    moveLeft,
    moveRight,
    moveDown,
    softDrop,
    hardDrop,
    rotatePiece,
    resetGame,
    togglePause,
    getNextPieceFromBag,
  };
}
