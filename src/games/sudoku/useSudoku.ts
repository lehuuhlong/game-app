"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Difficulty, 
  generateSolvedBoard, 
  generatePuzzle, 
  getConflicts, 
  cloneBoard, 
  BOARD_SIZE, 
  EMPTY_CELL,
  MAX_ERRORS,
} from "./utils";

export interface SelectedCell {
  row: number;
  col: number;
}

// Notes: a 9x9 grid of Set<number>
export type NotesBoard = Set<number>[][];

function createEmptyNotes(): NotesBoard {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => new Set<number>())
  );
}

function cloneNotes(notes: NotesBoard): NotesBoard {
  return notes.map((row) => row.map((cell) => new Set(cell)));
}

export function useSudoku() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "won" | "gameover">("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [solvedBoard, setSolvedBoard] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<number[][]>([]);
  const [currentBoard, setCurrentBoard] = useState<number[][]>([]);
  const [notes, setNotes] = useState<NotesBoard>(createEmptyNotes());
  const [noteMode, setNoteMode] = useState(false);

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [conflicts, setConflicts] = useState<{ row: number; col: number }[]>([]);
  const [errorCount, setErrorCount] = useState(0);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, [stopTimer, elapsedSeconds]);

  // Clean up timer on unmount
  useEffect(() => () => stopTimer(), [stopTimer]);

  const startNewGame = useCallback((newDifficulty?: Difficulty) => {
    const diff = newDifficulty || difficulty;
    setDifficulty(diff);

    // Generate new boards
    const solved = generateSolvedBoard();
    const puzzle = generatePuzzle(solved, diff);

    setSolvedBoard(solved);
    setInitialBoard(cloneBoard(puzzle));
    setCurrentBoard(cloneBoard(puzzle));
    setNotes(createEmptyNotes());
    setNoteMode(false);

    setSelectedCell(null);
    setConflicts([]);
    setErrorCount(0);
    setElapsedSeconds(0);
    setGameState("playing");

    // Start fresh timer
    stopTimer();
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, [difficulty, stopTimer]);

  // Check if the board is completely filled
  const isBoardFull = useCallback((board: number[][]) => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === EMPTY_CELL) return false;
      }
    }
    return true;
  }, []);

  const setCellValue = useCallback((row: number, col: number, value: number) => {
    if (gameState !== "playing") return;

    // Cannot edit the given puzzle cells
    if (initialBoard[row][col] !== EMPTY_CELL) return;

    if (noteMode) {
      // Toggle note
      setNotes(prev => {
        const next = cloneNotes(prev);
        if (next[row][col].has(value)) {
          next[row][col].delete(value);
        } else {
          next[row][col].add(value);
        }
        return next;
      });
      return;
    }

    // Check against solution
    const isCorrect = solvedBoard[row][col] === value;

    setCurrentBoard(prev => {
      const newBoard = cloneBoard(prev);
      newBoard[row][col] = value;

      if (!isCorrect) {
        // Wrong answer
        setErrorCount(prevErrors => {
          const newErrors = prevErrors + 1;
          if (newErrors >= MAX_ERRORS) {
            stopTimer();
            setGameState("gameover");
          }
          return newErrors;
        });
        // Still place it (highlighted as conflict)
      }

      // Clear notes for this cell and related cells that have this value
      setNotes(prevNotes => {
        const next = cloneNotes(prevNotes);
        next[row][col] = new Set();
        // Remove this number from notes in same row, col, box
        for (let c = 0; c < BOARD_SIZE; c++) next[row][c].delete(value);
        for (let r = 0; r < BOARD_SIZE; r++) next[r][col].delete(value);
        const sr = Math.floor(row / 3) * 3;
        const sc = Math.floor(col / 3) * 3;
        for (let r = sr; r < sr + 3; r++)
          for (let c = sc; c < sc + 3; c++)
            next[r][c].delete(value);
        return next;
      });

      // Update conflicts array
      const newConflicts = getConflicts(newBoard);
      setConflicts(newConflicts);

      // If no conflicts and board is full, the user wins!
      if (newConflicts.length === 0 && isBoardFull(newBoard)) {
        stopTimer();
        setGameState("won");
      }

      return newBoard;
    });
  }, [initialBoard, gameState, noteMode, solvedBoard, isBoardFull, stopTimer]);

  const eraseCell = useCallback((row: number, col: number) => {
    if (gameState !== "playing") return;
    if (initialBoard[row][col] !== EMPTY_CELL) return;

    setCurrentBoard(prev => {
      const newBoard = cloneBoard(prev);
      newBoard[row][col] = EMPTY_CELL;
      setConflicts(getConflicts(newBoard));
      return newBoard;
    });
    setNotes(prev => {
      const next = cloneNotes(prev);
      next[row][col] = new Set();
      return next;
    });
  }, [initialBoard, gameState]);

  const handleNumpadInput = useCallback((value: number) => {
    if (selectedCell) {
      setCellValue(selectedCell.row, selectedCell.col, value);
    }
  }, [selectedCell, setCellValue]);

  const handleErase = useCallback(() => {
    if (selectedCell) {
      eraseCell(selectedCell.row, selectedCell.col);
    }
  }, [selectedCell, eraseCell]);

  const toggleNoteMode = useCallback(() => {
    setNoteMode(prev => !prev);
  }, []);

  const goToMenu = useCallback(() => {
    stopTimer();
    setGameState("menu");
  }, [stopTimer]);

  return {
    gameState,
    difficulty,
    initialBoard,
    currentBoard,
    solvedBoard,
    notes,
    noteMode,
    selectedCell,
    conflicts,
    errorCount,
    elapsedSeconds,
    startNewGame,
    setSelectedCell,
    setCellValue,
    eraseCell,
    handleNumpadInput,
    handleErase,
    toggleNoteMode,
    goToMenu,
  };
}
